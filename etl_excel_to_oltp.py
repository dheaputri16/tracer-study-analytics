"""
============================================================
SmartTracer ETL v3: Excel Bersih (2019-2024) → PostgreSQL OLTP
============================================================
PERUBAHAN dari v2:
  1. employment_status → label PDDIKTI asli
     ('Bekerja (full time / part time)', 'Wiraswasta', dll)
  2. programs lookup: WHERE code = 'TKG' (bukan WHERE name = 'TKG')
     karena programs.code = kode singkat, programs.name = nama panjang
  3. S2 sheets (Keuangan Syariah, Rekayasa Infrastruktur) = DIPROSES
  4. Unique constraints: pakai nama yang sudah ada di schema
     (responses_questionnaire_id_alumni_id_unique, dll)
  5. ADD CONSTRAINT syntax: pakai DO block, bukan IF NOT EXISTS

JALANKAN persiapan_etl_v3.sql di pgAdmin SEBELUM script ini!
"""

import os, sys, re, traceback
import psycopg2
import openpyxl
from datetime import datetime, date

# ══════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════
DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "tracer_oltp",
    "user":     "postgres",
    "password": "Rin_2722",
}

EXCEL_FILES = [
    ("data/Data_2019.xlsx", 2019),
    ("data/Data_2020.xlsx", 2020),
    ("data/Data_2021.xlsx", 2021),
    ("data/Data_2022.xlsx", 2022),
    ("data/Data_2023.xlsx", 2023),
    ("data/Data_2024.xlsx", 2024),
]

RUN_ALL = True  # True untuk proses semua file, False untuk testing satu file saja
# TEST_FILE = "data/Data_2024.xlsx"
# TEST_GRAD_YEAR = 2024
# TEST_MAX_ROWS = 50

# ══════════════════════════════════════════════════════════════════
# SHEET → PROGRAM CODE
# programs.code = kode singkat (TKG, TKS, dll)
# programs.name = nama panjang (Teknik Konstruksi Gedung, dll)
# ══════════════════════════════════════════════════════════════════
SHEET_TO_PROGRAM_CODE = {
    # Teknik Sipil & Konstruksi
    "D3 - Teknik Konstruksi Gedung":         "TKG",
    "D3 - Teknik Konstruksi Sipil":          "TKS",
    "D4 - Teknik Perancangan Jalan Dan":     "TPJJ",
    "D4 - Teknik Perancangan Jalan d":       "TPJJ",
    "D4 - Teknik Perawatan Dan Perba":       "TPPG",
    # Teknik Mesin & Manufaktur
    "D3 - Teknik Mesin":                     "TM",
    "D4 - Teknik Perancangan dan Kon":       "TPKM",
    "D4 - Proses Manufaktur":                "PM",
    # Teknik Pendingin & Energi
    "D3 - Teknik Pendingin Dan Tata ":       "TPTU3",
    "D4 - Teknik Pendingin dan Tata ":       "TPTU4",
    "D4 - Teknik Pendingin dan Tata":        "TPTU4",
    "D3 - Teknik Konversi Energi":           "TKE3",
    "D4 - Teknik Konservasi Energi":         "TKE4",
    "D4 - Teknologi Pembangkit Tenag":       "TPTL",
    # Teknik Elektronika & Listrik
    "D3 - Teknik Elektronika":               "TEL3",
    "D4 - Teknik Elektronika":               "TEL4",
    "D3 - Teknik Listrik":                   "TL",
    "D4 - Teknik Otomasi Industri":          "TOI",
    # Teknik Telekomunikasi
    "D3 - Teknik Telekomunikasi":            "TELKOM3",
    "D4 - Teknik Telekomunikasi":            "TELKOM4",
    # Teknik Kimia
    "D3 - Teknik Kimia":                     "TK3",
    "D3 - Analis Kimia":                     "AK3",
    "D4 - Teknik Kimia Produksi Bers":       "TKPB",
    # Teknik Informatika
    "D3 - Teknik Informatika":               "TI3",
    "D4 - Teknik Informatika":               "TI",
    # Teknik Aeronautika
    "D3 - Teknik Aeronautika":               "TA",
    # Akuntansi & Keuangan
    "D3 - Akuntansi":                        "AKT3",
    "D4 - Akuntansi":                        "AKT4",
    "D3 - Keuangan Dan Perbankan":           "KP",
    "D4 - Keuangan Syariah":                 "KS",
    "D4 - Akuntansi Manajemen Pemeri":       "AMP",
    "D4 - Akuntansi Manajemen Pemerintahan": "AMP",
    "D4 - Manajemen Aset":                   "MA",
    # Administrasi & Manajemen
    "D3 - Administrasi Bisnis":              "AB3",
    "D4 - Administrasi Bisnis":              "AB4",
    "D3 - Manajemen Pemasaran":              "MP3",
    "D4 - Manajemen Pemasaran":              "MP4",
    "D3 - Usaha Perjalanan Wisata":          "UPW",
    "D3 - Bahasa Inggris":                   "BIG",
    # S2 — ditambahkan via persiapan_etl_v3.sql
    "S2 - Keuangan dan Perbankan Sya":       "KPS2",
    "S2 - Rekayasa Infrastruktur (Te":       "RIS2",
    "S2 - Keuangan dan Perbankan Syariah":   "KPS2",
    "S2 - Rekayasa Infrastruktur":           "RIS2",
    # Sheet kosong
    "Sheet1": None,
}

# ══════════════════════════════════════════════════════════════════
# STATUS KERJA → label PDDIKTI ASLI
# (setelah constraint di DB diubah via persiapan_etl_v3.sql)
# ══════════════════════════════════════════════════════════════════
STATUS_TO_LABEL = {
    1: "Bekerja (full time / part time)",
    2: "Belum memungkinkan bekerja",
    3: "Wiraswasta",
    4: "Melanjutkan Pendidikan",
    5: "Tidak kerja tetapi sedang mencari kerja",
    6: "Melanjutkan pendidikan sambil bekerja",   # 2022+
    7: "Melanjutkan pendidikan sambil wiraswasta", # 2022+
}

# Status yang berarti bekerja (untuk employment_records)
STATUS_BEKERJA    = {1, 6}  # employed + melanjutkan sambil bekerja
STATUS_WIRAUSAHA  = {3, 7}  # wiraswasta + melanjutkan sambil wiraswasta
STATUS_ADA_KERJA  = STATUS_BEKERJA | STATUS_WIRAUSAHA

# ══════════════════════════════════════════════════════════════════
# MAPPING PROVINSI
# ══════════════════════════════════════════════════════════════════
PROVINCE_NAME_TO_CODE = {
    "DKI Jakarta":"10000","Jawa Barat":"20000","Jawa Tengah":"30000",
    "DI Yogyakarta":"40000","Jawa Timur":"50000","Banten":"280000",
    "Aceh":"60000","Sumatera Utara":"70000","Sumatera Barat":"80000",
    "Riau":"90000","Jambi":"100000","Sumatera Selatan":"110000",
    "Lampung":"120000","Kepulauan Bangka Belitung":"290000",
    "Bengkulu":"260000","Kepulauan Riau":"310000",
    "Kalimantan Barat":"130000","Kalimantan Tengah":"140000",
    "Kalimantan Selatan":"150000","Kalimantan Timur":"160000",
    "Kalimantan Utara":"340000","Sulawesi Utara":"170000",
    "Sulawesi Tengah":"180000","Sulawesi Selatan":"190000",
    "Sulawesi Tenggara":"200000","Gorontalo":"300000",
    "Sulawesi Barat":"330000","Bali":"220000",
    "Nusa Tenggara Barat":"230000","Nusa Tenggara Timur":"240000",
    "Maluku":"210000","Maluku Utara":"270000",
    "Papua":"250000","Papua Barat":"320000",
    "Luar Negeri":"350000","Lainnya":None,
}
PROVINCE_INDEX_TO_CODE = {
    1:"60000",2:"70000",3:"80000",4:"90000",5:"310000",
    6:"100000",7:"110000",8:"290000",9:"260000",10:"120000",
    11:"10000",12:"280000",13:"20000",14:"30000",15:"40000",
    16:"50000",17:"220000",18:"230000",19:"240000",20:"130000",
    21:"140000",22:"150000",23:"160000",24:"340000",25:"170000",
    26:"300000",27:"180000",28:"330000",29:"190000",30:"200000",
    31:"210000",32:"270000",33:"320000",34:"250000",35:"350000",
}

# Prefix kota Excel → province_code
CITY_PREFIX_TO_PROV = {
    "jabar":"20000","jawa barat":"20000",
    "dki jakarta":"10000","dki":"10000",
    "jateng":"30000","jawa tengah":"30000",
    "diy":"40000","di yogyakarta":"40000","yogyakarta":"40000",
    "jatim":"50000","jawa timur":"50000",
    "banten":"280000","aceh":"60000",
    "sumatera utara":"70000","sumut":"70000",
    "sumatera barat":"80000","sumbar":"80000",
    "riau":"90000","jambi":"100000",
    "sumatera selatan":"110000","sumsel":"110000",
    "lampung":"120000",
    "bangka belitung":"290000","babel":"290000",
    "bengkulu":"260000",
    "kepulauan riau":"310000","kepri":"310000","kep. riau":"310000",
    "kalimantan barat":"130000","kalbar":"130000",
    "kalimantan tengah":"140000","kalteng":"140000",
    "kalimantan selatan":"150000","kalsel":"150000",
    "kalimantan timur":"160000","kaltim":"160000",
    "kalimantan utara":"340000","kaltara":"340000",
    "sulawesi utara":"170000","sulut":"170000",
    "sulawesi tengah":"180000","sulteng":"180000",
    "sulawesi selatan":"190000","sulsel":"190000",
    "sulawesi tenggara":"200000","sultra":"200000",
    "gorontalo":"300000",
    "sulawesi barat":"330000","sulbar":"330000",
    "bali":"220000",
    "nusa tenggara barat":"230000","ntb":"230000",
    "nusa tenggara timur":"240000","ntt":"240000",
    "maluku":"210000","maluku utara":"270000",
    "papua":"250000","papua barat":"320000",
    "luar negeri":"350000",
}

# ══════════════════════════════════════════════════════════════════
# KOLOM EXCEL → f-code
# ══════════════════════════════════════════════════════════════════
COL_KEYWORD_TO_FCODE = {
    "status Anda saat ini":                                           "f8",
    "STATUS ANDA SAAT INI":                                           "f8",
    "Kapan anda mulai mencari pekerjaan":                             "f301",
    "SEBELUM LULUS, Anda mulai mencari":                              "f302",
    "SETELAH lulus, Anda mulai mencari":                              "f303",
    "SETELAH LULUS, Anda mulai mencari":                              "f303",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[1]":    "f401",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[2]":    "f402",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[3]":    "f403",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[4]":    "f404",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[5]":    "f405",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[6]":    "f406",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[7]":    "f407",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[8]":    "f408",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[9]":    "f409",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[10]":   "f410",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[11]":   "f411",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[12]":   "f412",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[13]":   "f413",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[14]":   "f414",
    "mencari pekerjaan tersebut? Jawaban bisa lebih dari satu[other]":"f415",
    "sudah Anda lamar (lewat surat":                                  "f6",
    "yang merespons lamaran":                                         "f7",
    "yang mengundang Anda untuk wawancara":                           "f7a",
    "sumberdana dalam pembiayaan kuliah":                             "f1201",
    "saat LULUS.*?Etika":                                             "f1761",
    "saat LULUS.*?Keahlian berdasarkan":                              "f1763",
    "saat LULUS.*?Bahasa Inggris":                                    "f1765",
    "saat LULUS.*?Penggunaan Teknologi":                              "f1767",
    "saat LULUS.*?Komunikasi":                                        "f1769",
    "saat LULUS.*?Kerja sama tim":                                    "f1771",
    "saat LULUS.*?Pengembangan Diri":                                 "f1773",
    "saat ini.*?Etika":                                               "f1762",
    "saat ini.*?Keahlian berdasarkan":                                "f1764",
    "saat ini.*?Bahasa Inggris":                                      "f1766",
    "saat ini.*?Penggunaan Teknologi":                                "f1768",
    "saat ini.*?Komunikasi":                                          "f1770",
    "saat ini.*?Kerja sama tim":                                      "f1772",
    "saat ini.*?Pengembangan Diri":                                   "f1774",
    "penekanan.*?Perkuliahan":                                        "f21",
    "penekanan.*?Demonstrasi":                                        "f22",
    "penekanan.*?Proyek":                                             "f23",
    "penekanan.*?Magang":                                             "f24",
    "penekanan.*?Praktikum":                                          "f25",
    "penekanan.*?Kerja Lapangan":                                     "f26",
    "penekanan.*?Diskusi":                                            "f27",
    "mendapatkan pekerjaan <= 6 bulan":                               "f5c",
    "berapa bulan anda mendapatkan pekerjaan ?":                      "f502",
    "berapa bulan Anda mendapatkan pekerjaan ?":                      "f502",
    "berapa bulan anda mendapatkan pekerjaan pertama":                "f502",
    "berapa bulan Anda mendapatkan pekerjaan pertama":                "f502",
    "pendapatan anda saat ini":                                       "f504",
    "rata-rata pendapatan anda per bulan":                            "f505",
    "rata-rata pendapatan (take home pay)":                           "f505",
    "lokasi tempat Anda bekerja? (Propinsi)":                         "f5a1",
    "jenis perusahaan/instansi/institusi tempat":                     "f1101",
    "nama perusahaan/kantor":                                         "f5b",
    "kelompok/tingkat manakah":                                       "f5d",
    "tingkat manakah tempat kerja":                                   "f5d",
    "keterkaitan antara bidang studi":                                "f14",
    "erat hubungan antara bidang studi":                              "f14",
    "erat hubungan antara program studi":                             "f14",
    "paling tepat/sesuai untuk pekerjaan":                            "f15",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[1]":     "f1601",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[2]":     "f1602",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[3]":     "f1603",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[4]":     "f1604",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[5]":     "f1605",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[6]":     "f1606",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[7]":     "f1607",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[8]":     "f1608",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[9]":     "f1609",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[10]":    "f1610",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[11]":    "f1611",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[12]":    "f1612",
    "mengapa anda mengambilnya? Jawaban bisa lebih dari satu[other]": "f1613",
    "aktif mencari pekerjaan dalam 4 minggu":                         "f1001",
    "sumber beasiswa studi lanjutan":                                 "f18a_source",
    "Nama Pergururan Tinggi tempat anda melanjutkan":                 "f18b",
    "Jenis Program Studi":                                            "f18c",
    "Tanggal Masuk Studi":                                            "f18d",
    "jumlah sertifikasi kompetensi":                                  "f_sertif",
}

# ══════════════════════════════════════════════════════════════════
# CITY LOOKUP (diisi saat startup dari DB)
# ══════════════════════════════════════════════════════════════════
# DB_CITIES: province_code → {city_name_lower: (city_id, city_name_original)}
DB_CITIES = {}

def load_cities(cur):
    # Ambil id sekalian supaya bisa langsung insert sebagai FK
    cur.execute("SELECT id, province_code, name FROM tracer_oltp.cities")
    for cid, pcode, cname in cur.fetchall():
        DB_CITIES.setdefault(pcode, {})[cname.lower()] = (cid, cname)
    total = sum(len(v) for v in DB_CITIES.values())
    print(f"  Loaded {total} kota dari DB")

def parse_city(raw):
    """
    Input  : 'Jabar - Kota Bandung'
    Output : (province_code, city_name, city_id)
             ('20000', 'Kota Bandung', 42)

    Kalau nama kota tidak match ke DB cities:
             ('20000', 'Kota Bandung', None)
             → work_city terisi string, work_city_id = NULL

    Kalau prefix provinsi tidak dikenal:
             (None, 'Kota Bandung', None)
    """
    if not raw or str(raw).strip() in ('', 'nan', 'None', '-'):
        return None, None, None
    s = str(raw).strip()
    parts = re.split(r'\s*[-–]\s*', s, maxsplit=1)
    if len(parts) != 2:
        return None, s, None

    prefix = parts[0].strip().lower()
    city_part = parts[1].strip()
    pcode = CITY_PREFIX_TO_PROV.get(prefix)
    if not pcode:
        return None, city_part, None

    # Normalisasi nama Excel → format di tabel cities
    city_norm = re.sub(r'^kota\s+administrasi\s+', 'Kota ', city_part, flags=re.I)
    city_norm = re.sub(r'^kabupaten\s+', 'Kab. ', city_norm, flags=re.I)

    prov_cities = DB_CITIES.get(pcode, {})

    # 1. Direct match (case-insensitive)
    entry = prov_cities.get(city_norm.lower())
    if entry:
        return pcode, entry[1], entry[0]

    # 2. Fuzzy: strip prefix Kota/Kab. dari kedua sisi
    clean = re.sub(r'^(kab\.\s*|kota\s*)', '', city_norm.lower()).strip()
    for dbl, (dbi, dbn) in prov_cities.items():
        clean_db = re.sub(r'^(kab\.\s*|kota\s*)', '', dbl).strip()
        if clean == clean_db:
            return pcode, dbn, dbi

    # 3. Tidak match ke DB → simpan string apa adanya, city_id = None
    return pcode, city_part, None

# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════

def is_null(v):
    if v is None: return True
    return str(v).strip() in ('', 'nan', 'None', 'NULL', '-', '.', '0')

def clean_nim(v):
    if v is None: return None
    s = str(v).strip()
    if s in ('', 'nan', 'None'): return None
    return s.split('.')[0] if '.' in s else s

def clean_salary(v):
    if v is None: return None
    s = re.sub(r'[Rr][Pp]\.?\s*', '', str(v).strip())
    if s in ('', 'nan', 'None', '0', '-'): return None
    if s.count('.') > 1: s = s.replace('.', '')
    elif s.count('.') == 1 and len(s.split('.')[1]) == 3: s = s.replace('.', '')
    s = s.replace(',', '.')
    try:
        n = float(s)
        if n <= 0: return None
        return n * 1_000_000 if 0 < n <= 100 else n
    except: return None

def parse_province(v):
    if v is None: return None
    try:
        n = int(float(str(v).strip()))
        return None if n > 40 else PROVINCE_INDEX_TO_CODE.get(n)
    except: pass
    return PROVINCE_NAME_TO_CODE.get(str(v).strip())

def get_program_id(sheet_name, cur):
    """
    Lookup programs.id berdasarkan code (kode singkat).
    programs.code = 'TKG', programs.name = 'Teknik Konstruksi Gedung'
    """
    code = SHEET_TO_PROGRAM_CODE.get(sheet_name)
    if code is None:
        for key, val in SHEET_TO_PROGRAM_CODE.items():
            if key and (sheet_name.startswith(key) or key.startswith(sheet_name[:20])):
                code = val
                break
    if not code:
        return None
    cur.execute("SELECT id FROM tracer_oltp.programs WHERE code = %s LIMIT 1", (code,))
    row = cur.fetchone()
    return row[0] if row else None

def get_questionnaire_id(program_id, grad_year, cur):
    """
    Questionnaire slots di DB:
      program_id=1 → lulusan 2019-2022
      program_id=2 → lulusan 2023-2025
      program_id=3 → lulusan 2026+
    """
    slot = 1 if grad_year <= 2022 else (2 if grad_year <= 2025 else 3)
    cur.execute(
        "SELECT id FROM tracer_oltp.questionnaires WHERE program_id = %s AND code LIKE %s LIMIT 1",
        (slot, f'DIKTI_%_v{slot}')
    )
    row = cur.fetchone()
    if row: return row[0]
    cur.execute("SELECT id FROM tracer_oltp.questionnaires WHERE program_id = %s LIMIT 1", (slot,))
    row = cur.fetchone()
    return row[0] if row else 1

def build_col_map(headers):
    col_map = {}
    for ci, h in enumerate(headers):
        if not h: continue
        hs = str(h)
        for kw, fc in COL_KEYWORD_TO_FCODE.items():
            try: matched = bool(re.search(kw, hs, re.I | re.DOTALL))
            except: matched = kw.lower() in hs.lower()
            if matched:
                col_map.setdefault(fc, []).append(ci)
    return col_map

def find_city_cols(headers):
    return [i for i, h in enumerate(headers)
            if h and "Kabupaten/Kota" in str(h) and "bekerja" in str(h).lower()]

def get_cell(row, indices):
    for ci in (indices or []):
        if ci < len(row) and not is_null(row[ci]):
            return row[ci]
    return None

# ══════════════════════════════════════════════════════════════════
# ETL UTAMA
# ══════════════════════════════════════════════════════════════════

def process_file(filepath, grad_year, conn, max_rows=None):
    cur = conn.cursor()
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ok = err = 0

    for sname in wb.sheetnames:
        if sname == "Sheet1": continue

        pid = get_program_id(sname, cur)
        if pid is None:
            print(f"  [SKIP] {sname}")
            continue

        qid = get_questionnaire_id(pid, grad_year, cur)
        ws = wb[sname]
        it = ws.iter_rows(values_only=True)
        headers = list(next(it))
        col_map  = build_col_map(headers)
        city_cols = find_city_cols(headers)
        s_ok = s_err = 0

        for rnum, row in enumerate(it, 2):
            if max_rows and rnum > max_rows + 1: break
            if is_null(row[0] if row else None) or is_null(row[1] if len(row) > 1 else None):
                continue

            nama = str(row[0]).strip()
            nim  = clean_nim(row[1])
            if not nim: continue

            try:
                # 1. alumni_profiles
                cur.execute("""
                    INSERT INTO tracer_oltp.alumni_profiles
                        (nim, name, program_id, graduation_year, is_active, created_at, updated_at)
                    VALUES (%s,%s,%s,%s,true,NOW(),NOW())
                    ON CONFLICT (nim) DO UPDATE SET
                        name=EXCLUDED.name, graduation_year=EXCLUDED.graduation_year, updated_at=NOW()
                    RETURNING id
                """, (nim, nama, pid, grad_year))
                aid = cur.fetchone()[0]

                # 2. responses
                cur.execute("""
                    INSERT INTO tracer_oltp.responses
                        (questionnaire_id, alumni_id, submitted_at, created_at, updated_at)
                    VALUES (%s,%s,NOW(),NOW(),NOW())
                    ON CONFLICT (questionnaire_id, alumni_id) DO UPDATE SET updated_at=NOW()
                    RETURNING id
                """, (qid, aid))
                rid = cur.fetchone()[0]

                # 3. response_answers (EAV)
                seen = set()
                for fc, cols in col_map.items():
                    for ci in cols:
                        if ci >= len(row) or is_null(row[ci]): continue
                        idx = 0
                        while (fc, idx) in seen: idx += 1
                        seen.add((fc, idx))
                        cur.execute("""
                            INSERT INTO tracer_oltp.response_answers
                                (response_id, question_code, answer_index, answer_text, created_at, updated_at)
                            VALUES (%s,%s,%s,%s,NOW(),NOW())
                            ON CONFLICT (response_id, question_code, answer_index) DO UPDATE SET
                                answer_text=EXCLUDED.answer_text, updated_at=NOW()
                        """, (rid, fc, idx, str(row[ci]).strip()))

                # 4. employment_records
                status_raw = get_cell(row, col_map.get("f8", []))
                if not is_null(status_raw):
                    try: si = int(float(str(status_raw).strip()))
                    except: si = None
                    label = STATUS_TO_LABEL.get(si) if si else None

                    if label:
                        salary=waiting=company=city_name=city_id=prov_code=is_rel=None

                        if si in STATUS_ADA_KERJA:
                            salary = clean_salary(get_cell(row, col_map.get("f505",[])))
                            br = get_cell(row, col_map.get("f502",[]))
                            if not is_null(br):
                                try:
                                    w = float(str(br).strip())
                                    waiting = w if 0 <= w <= 60 else None
                                except: pass
                            cr = get_cell(row, col_map.get("f5b",[]))
                            company = str(cr).strip() if not is_null(cr) else None

                            # Kota: parse format 'Prefix - Kota'
                            # parse_city() → (province_code, city_name, city_id)
                            for ci in city_cols:
                                if ci < len(row) and not is_null(row[ci]):
                                    prov_code, city_name, city_id = parse_city(row[ci])
                                    break
                            # Fallback provinsi dari kolom f5a1 (kalau city col kosong)
                            if not prov_code:
                                prov_code = parse_province(get_cell(row, col_map.get("f5a1",[])))

                            f14 = get_cell(row, col_map.get("f14",[]))
                            if not is_null(f14):
                                try: is_rel = int(float(str(f14).strip())) in (1,2)
                                except: pass

                        cur.execute("""
                            INSERT INTO tracer_oltp.employment_records
                                (alumni_id, questionnaire_id, employment_status,
                                 waiting_months, salary_current, company_name,
                                 work_city, work_city_id, work_province_code,
                                 is_job_relevant, created_at, updated_at)
                            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                            ON CONFLICT (alumni_id, questionnaire_id) DO UPDATE SET
                                employment_status=EXCLUDED.employment_status,
                                waiting_months=EXCLUDED.waiting_months,
                                salary_current=EXCLUDED.salary_current,
                                company_name=EXCLUDED.company_name,
                                work_city=EXCLUDED.work_city,
                                work_city_id=EXCLUDED.work_city_id,
                                work_province_code=EXCLUDED.work_province_code,
                                is_job_relevant=EXCLUDED.is_job_relevant,
                                updated_at=NOW()
                        """, (aid,qid,label,waiting,salary,company,city_name,city_id,prov_code,is_rel))

                # 5. education_records
                univ = get_cell(row, col_map.get("f18b",[]))
                if not is_null(univ):
                    prodi = get_cell(row, col_map.get("f18c",[]))
                    tgl   = get_cell(row, col_map.get("f18d",[]))
                    major = str(prodi).strip() if not is_null(prodi) else None
                    deg = "Other"
                    if major:
                        ml = major.lower()
                        if 'd3' in ml or 'diploma' in ml:     deg='D3'
                        elif 'd4' in ml or 'terapan' in ml:   deg='D4'
                        elif 's1' in ml or 'sarjana' in ml:   deg='S1'
                        elif 's2' in ml or 'magister' in ml:  deg='S2'
                        elif 's3' in ml or 'doktor' in ml:    deg='S3'
                        elif 'profesi' in ml:                  deg='Profesi'
                    sy = None
                    if not is_null(tgl):
                        try:
                            sy = tgl.year if isinstance(tgl,(datetime,date)) else int(re.search(r'20\d{2}',str(tgl)).group(0))
                        except: pass
                    cur.execute("""
                        INSERT INTO tracer_oltp.education_records
                            (alumni_id, questionnaire_id, is_further_study,
                             institution_name, degree, major, start_year,
                             created_at, updated_at)
                        VALUES (%s,%s,true,%s,%s,%s,%s,NOW(),NOW())
                        ON CONFLICT DO NOTHING
                    """, (aid,qid,str(univ).strip(),deg,major,sy))

                conn.commit()
                s_ok += 1; ok += 1

            except Exception as e:
                conn.rollback()
                s_err += 1; err += 1
                print(f"    [ERROR] {sname} baris {rnum} ({nama}): {e}")
                if s_err <= 3: traceback.print_exc()

        print(f"  ✓ {sname}: {s_ok} OK, {s_err} error")

    cur.close()
    print(f"\n  FILE TOTAL: {ok} berhasil, {err} error")

def main():
    print("=" * 60)
    print("SmartTracer ETL v3")
    print("=" * 60)
    print("\nPastikan sudah jalankan persiapan_etl_v3.sql di pgAdmin!\n")

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        print(f"✓ Konek ke: {DB_CONFIG['dbname']}")
    except Exception as e:
        print(f"✗ Gagal konek: {e}"); sys.exit(1)

    cur = conn.cursor()
    load_cities(cur)
    cur.close()

    if not RUN_ALL:
        print(f"\n[TEST] {TEST_FILE} | grad_year={TEST_GRAD_YEAR} | max_rows={TEST_MAX_ROWS or 'semua'}")
        process_file(TEST_FILE, TEST_GRAD_YEAR, conn, TEST_MAX_ROWS)
    else:
        for f, y in EXCEL_FILES:
            if not os.path.exists(f):
                print(f"\n[SKIP] File tidak ada: {f}"); continue
            print(f"\n{'='*50}\n{f} | tahun lulus: {y}\n{'='*50}")
            process_file(f, y, conn)

    conn.close()
    print("\n✓ Selesai!")
    print("""
Verifikasi di pgAdmin:
  SELECT employment_status, COUNT(*)
  FROM tracer_oltp.employment_records
  GROUP BY employment_status ORDER BY COUNT(*) DESC;
""")

if __name__ == "__main__":
    main()