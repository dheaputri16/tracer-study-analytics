"""
============================================================
SmartTracer ETL v4: Excel Bersih (2019-2024) → PostgreSQL OLTP
============================================================
PERUBAHAN dari v3:
  1. PRIORITAS UTAMA: response_answers memuat SEMUA jawaban Excel
     — termasuk kode identitas kementrian (nimhsmsmh, nmmhsmsmh, dll)
     — termasuk f5a1 dan f5a2 (province id & city id integer, bukan string nama)
     — semua f-code lainnya ikut masuk
  2. alumni_profiles juga diupdate kolom email, phone, nik, npwp, kode_pt
  3. employment_records & education_records → DIKOMENTARI (tidak diisi)
     Uncomment blok "# DISABLED: employment_records" dan
     "# DISABLED: education_records" kalau nanti mau diaktifkan lagi
  4. Mapping header Excel → question_code menggunakan teks deskriptif
     sesuai form kementrian PDDIKTI
  5. f5a2 (Kota/Kabupaten) ditambahkan ke mapping
  6. salary (f505) dipastikan masuk ke response_answers sekaligus
     ke salary_current di employment_records (kalau DISABLED dibuka)
============================================================
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

RUN_ALL = True   # False = testing satu file saja
# TEST_FILE       = "data/Data_2024.xlsx"
# TEST_GRAD_YEAR  = 2024
# TEST_MAX_ROWS   = 50

# ══════════════════════════════════════════════════════════════════
# SHEET → PROGRAM CODE
# programs.code = kode singkat (TKG, TKS, dll)
# ══════════════════════════════════════════════════════════════════
SHEET_TO_PROGRAM_CODE = {
    "D3 - Teknik Konstruksi Gedung":         "TKG",
    "D3 - Teknik Konstruksi Sipil":          "TKS",
    "D4 - Teknik Perancangan Jalan Dan":     "TPJJ",
    "D4 - Teknik Perancangan Jalan d":       "TPJJ",
    "D4 - Teknik Perawatan Dan Perba":       "TPPG",
    "D3 - Teknik Mesin":                     "TM",
    "D4 - Teknik Perancangan dan Kon":       "TPKM",
    "D4 - Proses Manufaktur":                "PM",
    "D3 - Teknik Pendingin Dan Tata ":       "TPTU3",
    "D4 - Teknik Pendingin dan Tata ":       "TPTU4",
    "D4 - Teknik Pendingin dan Tata":        "TPTU4",
    "D3 - Teknik Konversi Energi":           "TKE3",
    "D4 - Teknik Konservasi Energi":         "TKE4",
    "D4 - Teknologi Pembangkit Tenag":       "TPTL",
    "D3 - Teknik Elektronika":               "TEL3",
    "D4 - Teknik Elektronika":               "TEL4",
    "D3 - Teknik Listrik":                   "TL",
    "D4 - Teknik Otomasi Industri":          "TOI",
    "D3 - Teknik Telekomunikasi":            "TELKOM3",
    "D4 - Teknik Telekomunikasi":            "TELKOM4",
    "D3 - Teknik Kimia":                     "TK3",
    "D3 - Analis Kimia":                     "AK3",
    "D4 - Teknik Kimia Produksi Bers":       "TKPB",
    "D3 - Teknik Informatika":               "TI3",
    "D4 - Teknik Informatika":               "TI",
    "D3 - Teknik Aeronautika":               "TA",
    "D3 - Akuntansi":                        "AKT3",
    "D4 - Akuntansi":                        "AKT4",
    "D3 - Keuangan Dan Perbankan":           "KP",
    "D4 - Keuangan Syariah":                 "KS",
    "D4 - Akuntansi Manajemen Pemeri":       "AMP",
    "D4 - Akuntansi Manajemen Pemerintahan": "AMP",
    "D4 - Manajemen Aset":                   "MA",
    "D3 - Administrasi Bisnis":              "AB3",
    "D4 - Administrasi Bisnis":              "AB4",
    "D3 - Manajemen Pemasaran":              "MP3",
    "D4 - Manajemen Pemasaran":              "MP4",
    "D3 - Usaha Perjalanan Wisata":          "UPW",
    "D3 - Bahasa Inggris":                   "BIG",
    "S2 - Keuangan dan Perbankan Sya":       "KPS2",
    "S2 - Rekayasa Infrastruktur (Te":       "RIS2",
    "S2 - Keuangan dan Perbankan Syariah":   "KPS2",
    "S2 - Rekayasa Infrastruktur":           "RIS2",
    "Sheet1": None,
}

# ══════════════════════════════════════════════════════════════════
# STATUS KERJA → label PDDIKTI
# ══════════════════════════════════════════════════════════════════
STATUS_TO_LABEL = {
    1: "Bekerja (full time / part time)",
    2: "Belum memungkinkan bekerja",
    3: "Wiraswasta",
    4: "Melanjutkan Pendidikan",
    5: "Tidak kerja tetapi sedang mencari kerja",
    6: "Melanjutkan pendidikan sambil bekerja",
    7: "Melanjutkan pendidikan sambil wiraswasta",
}

STATUS_BEKERJA   = {1, 6}
STATUS_WIRAUSAHA = {3, 7}
STATUS_ADA_KERJA = STATUS_BEKERJA | STATUS_WIRAUSAHA

# ══════════════════════════════════════════════════════════════════
# MAPPING PROVINSI (untuk fallback parse_province jika perlu)
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
    "Luar Negeri":"350000",
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
# LOOKUP TABEL (diisi dari DB saat startup)
# DB_PROVINCES : code → id   (misal "20000" → 13)
# DB_CITIES    : province_code → {city_name_lower → (city_id, city_name_asli)}
# ══════════════════════════════════════════════════════════════════
DB_PROVINCES = {}   # province_code → province_id (integer, untuk answer_text)
DB_CITIES    = {}   # province_code → {name_lower → (city_id, city_name_asli)}

def load_geo(cur):
    cur.execute("SELECT id, code FROM tracer_oltp.provinces")
    for pid, pcode in cur.fetchall():
        DB_PROVINCES[pcode] = pid
    cur.execute("SELECT id, province_code, name FROM tracer_oltp.cities")
    for cid, pcode, cname in cur.fetchall():
        DB_CITIES.setdefault(pcode, {})[cname.lower()] = (cid, cname)
    print(f"  Loaded {len(DB_PROVINCES)} provinsi, "
          f"{sum(len(v) for v in DB_CITIES.values())} kota dari DB")

# ══════════════════════════════════════════════════════════════════
# MAPPING KOLOM EXCEL → question_code
# Key = substring / regex yang dicari di header Excel (case-insensitive)
# Value = question_code yang akan masuk ke response_answers.question_code
#
# IDENTITAS KEMENTRIAN (bagian atas form)
# Header Excel = teks deskriptif form kementrian
# ══════════════════════════════════════════════════════════════════
COL_KEYWORD_TO_FCODE = {
    # ── Identitas kementrian ─────────────────────────────────────
    r"Kode PT":                                   "kdptimsmh",
    r"Tahun Lulus":                               "tahun_lulus",
    r"Kode Prodi":                                "kdpstmsmh",
    r"Nomor Telepon":                             "telpomsmh",
    r"Alamat Email":                              "emailmsmh",
    r"\bNIK\b":                                   "nik",
    r"\bNPWP\b":                                  "npwp",

    # ── Status & pekerjaan ───────────────────────────────────────
    r"status Anda saat ini":                      "f8",
    r"STATUS ANDA SAAT INI":                      "f8",

    r"berapa bulan.*mendapatkan pekerjaan pertama": "f502",
    r"berapa bulan.*mendapatkan pekerjaan \?":     "f502",
    r"berapa bulan.*memulai wiraswasta":           "f502",
    r"mendapatkan pekerjaan <= 6 bulan":           "f502",

    r"rata-rata pendapatan.*per bulan":            "f505",
    r"rata-rata pendapatan.*take home":            "f505",
    r"pendapatan anda saat ini":                   "f505",

    # Lokasi kerja — PROVINSI → answer_text = id provinsi (integer)
    r"lokasi.*bekerja.*Provinsi":                  "f5a1",
    r"lokasi.*bekerja.*Propinsi":                  "f5a1",
    r"Propinsi.*bekerja":                          "f5a1",

    # Lokasi kerja — KOTA/KABUPATEN → answer_text = id kota (integer)
    r"lokasi.*bekerja.*Kota":                      "f5a2",
    r"lokasi.*bekerja.*Kabupaten":                 "f5a2",
    r"Kabupaten.*Kota.*bekerja":                   "f5a2",
    r"Kota.*Kabupaten.*bekerja":                   "f5a2",

    r"jenis perusahaan.*instansi.*institusi.*tempat": "f1101",
    r"jenis perusahaan.*instansi lainnya":          "f1102",
    r"nama perusahaan.*kantor":                     "f5b",
    r"posisi.*jabatan.*wiraswasta":                 "f5c",
    r"tingkat.*tempat kerja":                       "f5d",
    r"kelompok.*tingkat.*tempat kerja":             "f5d",

    # ── Studi lanjut ─────────────────────────────────────────────
    r"sumber.*biaya.*studi lanjut":                 "f18a",
    r"sumber beasiswa studi lanjut":                "f18a",
    r"Perguruan Tinggi.*studi lanjut":              "f18b",
    r"Nama Perguruan Tinggi.*melanjutkan":          "f18b",
    r"Program Studi.*studi lanjut":                 "f18c",
    r"Jenis Program Studi":                         "f18c",
    r"Tanggal Masuk.*studi":                        "f18d",

    # ── Sumber dana kuliah ───────────────────────────────────────
    r"sumberdana.*pembiayaan kuliah":               "f1201",
    r"sumber dana.*pembiayaan kuliah":              "f1201",
    r"sumber dana pembiayaan.*lainnya":             "f1202",

    # ── Relevansi & kecocokan pendidikan ─────────────────────────
    r"erat.*hubungan.*bidang studi":                "f14",
    r"keterkaitan.*bidang studi":                   "f14",
    r"paling tepat.*sesuai.*pekerjaan":             "f15",

    # ── Kompetensi saat lulus (A) ─────────────────────────────────
    r"saat LULUS.*Etika":                           "f1761",
    r"saat LULUS.*Keahlian berdasarkan":            "f1763",
    r"saat LULUS.*Bahasa Inggris":                  "f1765",
    r"saat LULUS.*Penggunaan Teknologi":            "f1767",
    r"saat LULUS.*Komunikasi":                      "f1769",
    r"saat LULUS.*Kerja sama tim":                  "f1771",
    r"saat LULUS.*Pengembangan":                    "f1773",

    # ── Kompetensi saat ini / di pekerjaan (B) ───────────────────
    r"saat ini.*Etika":                             "f1762",
    r"saat ini.*Keahlian berdasarkan":              "f1764",
    r"saat ini.*Bahasa Inggris":                    "f1766",
    r"saat ini.*Penggunaan Teknologi":              "f1768",
    r"saat ini.*Komunikasi":                        "f1770",
    r"saat ini.*Kerja sama tim":                    "f1772",
    r"saat ini.*Pengembangan":                      "f1774",

    # ── Metode pembelajaran ──────────────────────────────────────
    # Metode pembelajaran — fcode mengacu ke questionnaire_questions (kementrian)
    # Keyword disesuaikan ke header Excel POLBAN yang asli
    # Excel pakai format: "...penekanan...[Nama Metode]"
    #
    # Yang ADA di Excel → di-map ke fcode kementrian terdekat:
    r"penekanan.*\[Perkuliahan dalam Prodi\]":   "f21",  # Perkuliahan
    r"penekanan.*\[Magang\]":                    "f24",  # Magang
    r"penekanan.*\[Praktikum":                   "f25",  # Praktikum
    # Fallback format lama (file 2019-2021 mungkin pakai format tanpa bracket)
    # Pakai negative lookahead supaya [Perkuliahan di luar Prodi] tidak ikut match
    r"penekanan.*Perkuliahan(?!.*luar)":     "f21",
    r"penekanan.*Magang":                    "f24",
    r"penekanan.*Praktikum":                 "f25",
    r"penekanan.*Kerja Lapangan":            "f26",
    r"penekanan.*Diskusi":                   "f27",
    r"penekanan.*Demonstrasi":               "f22",
    r"penekanan.*Partisipasi":               "f23",
    r"penekanan.*[Pp]royek [Rr]iset":            "f23",
    # f22 (Demonstrasi), f23 (Partisipasi proyek riset), f26 (Kerja Lapangan),
    # f27 (Diskusi) → tidak ada padanan di Excel POLBAN, jadi memang tidak terisi.
    # Ini wajar — fcode tetap sesuai kementrian, datanya NULL untuk kolom tsb.

    # ── Kapan mulai mencari kerja ────────────────────────────────
    r"Kapan.*mulai mencari pekerjaan":              "f301",
    r"berapa bulan.*sebelum lulus.*mencari":        "f302",
    r"berapa bulan.*sesudah lulus.*mencari":        "f303",
    r"SEBELUM LULUS.*mencari":                      "f302",
    r"SETELAH [Ll]ulus.*mencari":                   "f303",

    # ── Cara mencari kerja (f401-f415, boolean 0/1) ──────────────
    r"mencari pekerjaan.*\[1\]":                    "f401",
    r"mencari pekerjaan.*\[2\]":                    "f402",
    r"mencari pekerjaan.*\[3\]":                    "f403",
    r"mencari pekerjaan.*\[4\]":                    "f404",
    r"mencari pekerjaan.*\[5\]":                    "f405",
    r"mencari pekerjaan.*\[6\]":                    "f406",
    r"mencari pekerjaan.*\[7\]":                    "f407",
    r"mencari pekerjaan.*\[8\]":                    "f408",
    r"mencari pekerjaan.*\[9\]":                    "f409",
    r"mencari pekerjaan.*\[10\]":                   "f410",
    r"mencari pekerjaan.*\[11\]":                   "f411",
    r"mencari pekerjaan.*\[12\]":                   "f412",
    r"mencari pekerjaan.*\[13\]":                   "f413",
    r"mencari pekerjaan.*\[14\]":                   "f414",
    r"mencari pekerjaan.*\[other\]":                "f415",
    r"cara lainnya.*mencari pekerjaan":             "f416",

    # ── Jumlah lamaran ───────────────────────────────────────────
    r"sudah Anda lamar.*surat.*e-mail":             "f6",
    r"sudah anda lamar.*surat":                     "f6",
    r"yang merespons lamaran":                      "f7",
    r"yang mengundang.*wawancara":                  "f7a",

    # ── Aktif mencari kerja 4 minggu ─────────────────────────────
    r"aktif mencari pekerjaan.*4 minggu":           "f1001",
    r"aktivitas lainnya.*mencari pekerjaan":        "f1002",

    # ── Alasan ketidaksesuaian (f1601-f1613, boolean) ────────────
    r"mengapa.*mengambilnya.*\[1\]":                "f1601",
    r"mengapa.*mengambilnya.*\[2\]":                "f1602",
    r"mengapa.*mengambilnya.*\[3\]":                "f1603",
    r"mengapa.*mengambilnya.*\[4\]":                "f1604",
    r"mengapa.*mengambilnya.*\[5\]":                "f1605",
    r"mengapa.*mengambilnya.*\[6\]":                "f1606",
    r"mengapa.*mengambilnya.*\[7\]":                "f1607",
    r"mengapa.*mengambilnya.*\[8\]":                "f1608",
    r"mengapa.*mengambilnya.*\[9\]":                "f1609",
    r"mengapa.*mengambilnya.*\[10\]":               "f1610",
    r"mengapa.*mengambilnya.*\[11\]":               "f1611",
    r"mengapa.*mengambilnya.*\[12\]":               "f1612",
    r"mengapa.*mengambilnya.*\[other\]":            "f1613",
    r"alasan lainnya.*tidak sesuai":                "f1614",

    # ── Misc ─────────────────────────────────────────────────────
    r"jumlah sertifikasi":                          "f_sertif",
}

# question_code yang berisi nilai provinsi (perlu di-resolve ke province_id)
FCODE_PROVINCE = {"f5a1"}
# question_code yang berisi nilai kota (perlu di-resolve ke city_id)
FCODE_CITY     = {"f5a2"}

# question_code yang merupakan identitas alumni (disimpan juga ke alumni_profiles)
FCODE_IDENTITY = {
    "nimhsmsmh", "kdptimsmh", "tahun_lulus", "kdpstmsmh",
    "nmmhsmsmh", "telpomsmh", "emailmsmh", "nik", "npwp",
}

# ══════════════════════════════════════════════════════════════════
# GEO HELPERS
# ══════════════════════════════════════════════════════════════════

def resolve_province_id(raw):
    """
    Input raw dari Excel (bisa: angka index, kode string "20000", nama "Jawa Barat",
    atau format "Prefix - Kota" yang digunakan untuk kolom f5a1 di beberapa tahun).
    Return: province_id (integer) sebagai string, atau None kalau tidak ketemu.
    """
    if raw is None: return None
    s = str(raw).strip()
    if s in ('', 'nan', 'None', '-'): return None

    # Coba angka langsung → index
    try:
        n = int(float(s))
        if 1 <= n <= 40:
            pcode = PROVINCE_INDEX_TO_CODE.get(n)
            return str(DB_PROVINCES[pcode]) if pcode and pcode in DB_PROVINCES else None
        # Bisa jadi sudah berupa code langsung (misal 20000)
        s_code = str(n)
        if s_code in DB_PROVINCES:
            return str(DB_PROVINCES[s_code])
    except ValueError:
        pass

    # Coba nama provinsi
    pcode = PROVINCE_NAME_TO_CODE.get(s)
    if pcode and pcode in DB_PROVINCES:
        return str(DB_PROVINCES[pcode])

    # Coba format "Prefix - ..." (kolom provinsi kadang format ini)
    parts = re.split(r'\s*[-–]\s*', s, maxsplit=1)
    if len(parts) == 2:
        prefix_pcode = CITY_PREFIX_TO_PROV.get(parts[0].strip().lower())
        if prefix_pcode and prefix_pcode in DB_PROVINCES:
            return str(DB_PROVINCES[prefix_pcode])

    return None


def resolve_city_id(raw, province_id_str):
    """
    Input raw dari Excel — format "Prefix - Nama Kota" atau nama kota saja.
    province_id_str = hasil resolve_province_id (sudah integer sebagai string).
    Return: city_id (integer) sebagai string, atau None.
    """
    if raw is None: return None
    s = str(raw).strip()
    if s in ('', 'nan', 'None', '-'): return None

    # Cari province_code dari province_id
    pcode = None
    if province_id_str:
        try:
            pid_int = int(province_id_str)
            for pc, pid in DB_PROVINCES.items():
                if pid == pid_int:
                    pcode = pc
                    break
        except: pass

    # Ekstrak nama kota dari format "Prefix - Nama Kota"
    parts = re.split(r'\s*[-–]\s*', s, maxsplit=1)
    city_part = parts[1].strip() if len(parts) == 2 else s.strip()

    # Kalau belum ada pcode, coba dari prefix
    if not pcode and len(parts) == 2:
        prefix_pcode = CITY_PREFIX_TO_PROV.get(parts[0].strip().lower())
        if prefix_pcode:
            pcode = prefix_pcode

    if not pcode:
        return None

    prov_cities = DB_CITIES.get(pcode, {})

    # Normalisasi
    city_norm = re.sub(r'^kota\s+administrasi\s+', 'Kota ', city_part, flags=re.I)
    city_norm = re.sub(r'^kabupaten\s+', 'Kab. ', city_norm, flags=re.I)

    # Direct match
    entry = prov_cities.get(city_norm.lower())
    if entry:
        return str(entry[0])

    # Fuzzy: strip Kota/Kab prefix
    clean = re.sub(r'^(kab\.\s*|kota\s*)', '', city_norm.lower()).strip()
    for dbl, (dbi, _) in prov_cities.items():
        clean_db = re.sub(r'^(kab\.\s*|kota\s*)', '', dbl).strip()
        if clean == clean_db:
            return str(dbi)

    return None


def parse_province_fallback(v):
    """Fallback sederhana untuk detect province_code dari raw value."""
    if v is None: return None
    try:
        n = int(float(str(v).strip()))
        return PROVINCE_INDEX_TO_CODE.get(n) if n <= 40 else None
    except: pass
    return PROVINCE_NAME_TO_CODE.get(str(v).strip())

# ══════════════════════════════════════════════════════════════════
# HELPERS UMUM
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
    """Parse salary dari berbagai format Excel → float atau None."""
    if v is None: return None
    s = re.sub(r'[Rr][Pp]\.?\s*', '', str(v).strip())
    if s in ('', 'nan', 'None', '0', '-'): return None
    # Titik ribuan: "1.500.000" → "1500000"
    if s.count('.') > 1:
        s = s.replace('.', '')
    elif s.count('.') == 1 and len(s.split('.')[1]) == 3:
        s = s.replace('.', '')
    s = s.replace(',', '.')
    try:
        n = float(s)
        if n <= 0: return None
        # Angka kecil (<= 100) kemungkinan dalam juta
        return n * 1_000_000 if 0 < n <= 100 else n
    except:
        return None

def get_program_id(sheet_name, cur):
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

def get_questionnaire_id(grad_year, cur):
    """
    Lookup questionnaire DIKTI berdasarkan grad_year.
    Struktur DB: questionnaires.target_graduation_years = jsonb array, misal [2022]
    Fallback: cari berdasarkan code DIKTI_%_v{version} dimana version sesuai tahun.

    Mapping dari SQL:
      id=1  DIKTI_2026_v1  target=[2022]
      id=2  DIKTI_2026_v2  target=[2023]
      id=3  DIKTI_2026_v3  target=[2024]
    Tahun lain (2019-2021) → fallback ke id=1 (slot terlama)
    """
    # Cari questionnaire DIKTI yang target_graduation_years mengandung grad_year ini
    cur.execute("""
        SELECT id FROM tracer_oltp.questionnaires
        WHERE code LIKE 'DIKTI_%'
          AND target_graduation_years @> %s::jsonb
        LIMIT 1
    """, (f'[{grad_year}]',))
    row = cur.fetchone()
    if row:
        return row[0]

    # Fallback: kalau tidak ada yang exact match (misal 2019-2021),
    # ambil questionnaire DIKTI dengan id terkecil (versi paling lama)
    cur.execute("""
        SELECT id FROM tracer_oltp.questionnaires
        WHERE code LIKE 'DIKTI_%'
        ORDER BY id ASC
        LIMIT 1
    """)
    row = cur.fetchone()
    return row[0] if row else 1

def build_col_map(headers):
    """
    Scan headers Excel, cocokkan ke COL_KEYWORD_TO_FCODE.
    Return dict: fcode → [col_index, ...]
    Satu fcode bisa punya banyak kolom (misal f401-f415 tiap satu kolom).
    """
    col_map = {}
    for ci, h in enumerate(headers):
        if not h: continue
        hs = str(h)
        for kw, fc in COL_KEYWORD_TO_FCODE.items():
            try:
                matched = bool(re.search(kw, hs, re.I | re.DOTALL))
            except:
                matched = kw.lower() in hs.lower()
            if matched:
                col_map.setdefault(fc, []).append(ci)
                break   # satu kolom → satu fcode, stop di match pertama
    return col_map

def get_cell(row, indices):
    for ci in (indices or []):
        if ci < len(row) and not is_null(row[ci]):
            return row[ci]
    return None

# ══════════════════════════════════════════════════════════════════
# INSERT response_answers — satu baris per (response_id, question_code, answer_index)
# ══════════════════════════════════════════════════════════════════

def upsert_answer(cur, rid, question_code, answer_text, answer_index=0):
    """Insert atau update satu jawaban ke response_answers."""
    if answer_text is None:
        return
    val = str(answer_text).strip()
    if val in ('', 'nan', 'None'):
        return
    cur.execute("""
        INSERT INTO tracer_oltp.response_answers
            (response_id, question_code, answer_index, answer_text, created_at, updated_at)
        VALUES (%s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (response_id, question_code, answer_index) DO UPDATE SET
            answer_text = EXCLUDED.answer_text,
            updated_at  = NOW()
    """, (rid, question_code, answer_index, val))

# ══════════════════════════════════════════════════════════════════
# ETL UTAMA
# ══════════════════════════════════════════════════════════════════

def process_file(filepath, grad_year, conn, max_rows=None):
    cur = conn.cursor()
    wb  = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ok  = err = 0

    for sname in wb.sheetnames:
        if sname == "Sheet1":
            continue

        pid = get_program_id(sname, cur)
        if pid is None:
            print(f"  [SKIP] {sname}")
            continue

        qid = get_questionnaire_id(grad_year, cur)
        ws  = wb[sname]
        it  = ws.iter_rows(values_only=True)
        headers  = list(next(it))
        col_map  = build_col_map(headers)
        s_ok = s_err = 0
        n_detected = len(col_map)
        print(f"  Processing: {sname} ({n_detected} kolom terdeteksi) ...")

        for rnum, row in enumerate(it, 2):
            if max_rows and rnum > max_rows + 1:
                break

            # Kolom 0 = Nama, kolom 1 = NIM
            if not row or is_null(row[0] if row else None) or is_null(row[1] if len(row) > 1 else None):
                continue

            nama = str(row[0]).strip()
            nim  = clean_nim(row[1])
            if not nim:
                continue

            try:
                # ── 1. alumni_profiles ────────────────────────────────────
                # Ambil field tambahan kalau ada di col_map
                email_raw = get_cell(row, col_map.get("emailmsmh", []))
                phone_raw = get_cell(row, col_map.get("telpomsmh", []))
                nik_raw   = get_cell(row, col_map.get("nik", []))
                npwp_raw  = get_cell(row, col_map.get("npwp", []))
                kdpt_raw  = get_cell(row, col_map.get("kdptimsmh", []))

                email = str(email_raw).strip() if not is_null(email_raw) else None
                phone = str(phone_raw).strip() if not is_null(phone_raw) else None
                nik   = str(nik_raw).strip()   if not is_null(nik_raw)   else None
                npwp  = str(npwp_raw).strip()  if not is_null(npwp_raw)  else None
                kode_pt = str(kdpt_raw).strip() if not is_null(kdpt_raw) else None

                cur.execute("""
                    INSERT INTO tracer_oltp.alumni_profiles
                        (nim, name, email, phone, program_id, graduation_year,
                         nik, npwp, kode_pt, is_active, created_at, updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,true,NOW(),NOW())
                    ON CONFLICT (nim) DO UPDATE SET
                        name            = EXCLUDED.name,
                        email           = COALESCE(EXCLUDED.email, tracer_oltp.alumni_profiles.email),
                        phone           = COALESCE(EXCLUDED.phone, tracer_oltp.alumni_profiles.phone),
                        nik             = COALESCE(EXCLUDED.nik,   tracer_oltp.alumni_profiles.nik),
                        npwp            = COALESCE(EXCLUDED.npwp,  tracer_oltp.alumni_profiles.npwp),
                        kode_pt         = COALESCE(EXCLUDED.kode_pt, tracer_oltp.alumni_profiles.kode_pt),
                        graduation_year = EXCLUDED.graduation_year,
                        updated_at      = NOW()
                    RETURNING id
                """, (nim, nama, email, phone, pid, grad_year, nik, npwp, kode_pt))
                aid = cur.fetchone()[0]

                # ── 2. responses ──────────────────────────────────────────
                cur.execute("""
                    INSERT INTO tracer_oltp.responses
                        (questionnaire_id, alumni_id, status, submitted_at, source, created_at, updated_at)
                    VALUES (%s,%s,'submitted',NOW(),'etl',NOW(),NOW())
                    ON CONFLICT (questionnaire_id, alumni_id) DO UPDATE SET
                        updated_at = NOW()
                    RETURNING id
                """, (qid, aid))
                rid = cur.fetchone()[0]

                # ── 3. response_answers — SEMUA kolom Excel ───────────────
                #
                # Iterasi SEMUA fcode yang terdeteksi di col_map.
                # Khusus f5a1 → resolve ke province_id
                # Khusus f5a2 → resolve ke city_id
                # Boolean (f401-f415, f1601-f1613) → tiap kolom = answer_index unik
                # Fcode yang muncul > 1 kolom (rare) → answer_index berbeda

                # Identitas wajib dari kolom 0 & 1 (Nama, NIM) selalu di-insert
                # langsung — tidak lewat col_map supaya tidak pernah terlewat.
                upsert_answer(cur, rid, "nmmhsmsmh", nama, 0)
                upsert_answer(cur, rid, "nimhsmsmh", nim,  0)

                # Simpan province_id_str dulu (dibutuhkan saat resolve city)
                province_id_str = None

                for fc, col_indices in col_map.items():
                    # nimhsmsmh & nmmhsmsmh sudah di-insert hardcode dari row[0]/row[1]
                    # Skip supaya tidak false-match atau double-insert
                    if fc in ("nimhsmsmh", "nmmhsmsmh"):
                        continue
                    for idx, ci in enumerate(col_indices):
                        if ci >= len(row):
                            continue
                        raw = row[ci]
                        if is_null(raw):
                            continue

                        # Resolve provinsi → ID integer
                        if fc in FCODE_PROVINCE:
                            resolved = resolve_province_id(raw)
                            if resolved:
                                province_id_str = resolved
                            answer_val = resolved or str(raw).strip()
                            upsert_answer(cur, rid, fc, answer_val, idx)

                        # Resolve kota → ID integer
                        elif fc in FCODE_CITY:
                            resolved = resolve_city_id(raw, province_id_str)
                            answer_val = resolved or str(raw).strip()
                            upsert_answer(cur, rid, fc, answer_val, idx)

                        # Salary: simpan angka yang sudah dibersihkan
                        elif fc == "f505":
                            salary_clean = clean_salary(raw)
                            answer_val = str(int(salary_clean)) if salary_clean else str(raw).strip()
                            upsert_answer(cur, rid, fc, answer_val, idx)

                        # Semua fcode lainnya → simpan apa adanya sebagai string
                        else:
                            upsert_answer(cur, rid, fc, str(raw).strip(), idx)

                # ── DISABLED: employment_records ──────────────────────────
                # Uncomment blok di bawah ini kalau mau mengaktifkan kembali.
                # Semua data employment sudah masuk via response_answers di atas.
                #
                # status_raw = get_cell(row, col_map.get("f8", []))
                # if not is_null(status_raw):
                #     try: si = int(float(str(status_raw).strip()))
                #     except: si = None
                #     label = STATUS_TO_LABEL.get(si) if si else None
                #     if label:
                #         salary = clean_salary(get_cell(row, col_map.get("f505",[])))
                #         br = get_cell(row, col_map.get("f502",[]))
                #         waiting = None
                #         if not is_null(br):
                #             try:
                #                 w = float(str(br).strip())
                #                 waiting = w if 0 <= w <= 60 else None
                #             except: pass
                #         cr = get_cell(row, col_map.get("f5b",[]))
                #         company = str(cr).strip() if not is_null(cr) else None
                #         # Ambil province & city id dari col_map
                #         prov_id_str = None
                #         for ci in col_map.get("f5a1", []):
                #             if ci < len(row) and not is_null(row[ci]):
                #                 prov_id_str = resolve_province_id(row[ci])
                #                 break
                #         city_id_str = None
                #         for ci in col_map.get("f5a2", []):
                #             if ci < len(row) and not is_null(row[ci]):
                #                 city_id_str = resolve_city_id(row[ci], prov_id_str)
                #                 break
                #         prov_code = None
                #         if prov_id_str:
                #             pid_int = int(prov_id_str)
                #             for pc, pid2 in DB_PROVINCES.items():
                #                 if pid2 == pid_int: prov_code = pc; break
                #         f14 = get_cell(row, col_map.get("f14",[]))
                #         is_rel = None
                #         if not is_null(f14):
                #             try: is_rel = int(float(str(f14).strip())) in (1,2)
                #             except: pass
                #         cur.execute("""
                #             INSERT INTO tracer_oltp.employment_records
                #                 (alumni_id, questionnaire_id, employment_status,
                #                  waiting_months, salary_current, company_name,
                #                  work_city_id, work_province_code,
                #                  is_job_relevant, created_at, updated_at)
                #             VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
                #             ON CONFLICT (alumni_id, questionnaire_id) DO UPDATE SET
                #                 employment_status  = EXCLUDED.employment_status,
                #                 waiting_months     = EXCLUDED.waiting_months,
                #                 salary_current     = EXCLUDED.salary_current,
                #                 company_name       = EXCLUDED.company_name,
                #                 work_city_id       = EXCLUDED.work_city_id,
                #                 work_province_code = EXCLUDED.work_province_code,
                #                 is_job_relevant    = EXCLUDED.is_job_relevant,
                #                 updated_at         = NOW()
                #         """, (aid, qid, label, waiting, salary, company,
                #               int(city_id_str) if city_id_str else None,
                #               prov_code, is_rel))

                # ── DISABLED: education_records ───────────────────────────
                # Uncomment blok di bawah ini kalau mau mengaktifkan kembali.
                #
                # univ = get_cell(row, col_map.get("f18b",[]))
                # if not is_null(univ):
                #     prodi = get_cell(row, col_map.get("f18c",[]))
                #     tgl   = get_cell(row, col_map.get("f18d",[]))
                #     major = str(prodi).strip() if not is_null(prodi) else None
                #     deg = "Other"
                #     if major:
                #         ml = major.lower()
                #         if 'd3' in ml or 'diploma' in ml:    deg='D3'
                #         elif 'd4' in ml or 'terapan' in ml:  deg='D4'
                #         elif 's1' in ml or 'sarjana' in ml:  deg='S1'
                #         elif 's2' in ml or 'magister' in ml: deg='S2'
                #         elif 's3' in ml or 'doktor' in ml:   deg='S3'
                #         elif 'profesi' in ml:                 deg='Profesi'
                #     sy = None
                #     if not is_null(tgl):
                #         try:
                #             sy = tgl.year if isinstance(tgl,(datetime,date)) else int(re.search(r'20\d{2}',str(tgl)).group(0))
                #         except: pass
                #     cur.execute("""
                #         INSERT INTO tracer_oltp.education_records
                #             (alumni_id, questionnaire_id, is_further_study,
                #              institution_name, degree, major, start_year,
                #              created_at, updated_at)
                #         VALUES (%s,%s,true,%s,%s,%s,%s,NOW(),NOW())
                #         ON CONFLICT DO NOTHING
                #     """, (aid, qid, str(univ).strip(), deg, major, sy))

                conn.commit()
                s_ok += 1
                ok   += 1

            except Exception as e:
                conn.rollback()
                s_err += 1
                err   += 1
                print(f"    [ERROR] {sname} baris {rnum} ({nama}): {e}")
                if s_err <= 3:
                    traceback.print_exc()

        print(f"  ✓ {sname}: {s_ok} OK, {s_err} error")

    cur.close()
    print(f"\n  FILE TOTAL: {ok} berhasil, {err} error")


def main():
    print("=" * 60)
    print("SmartTracer ETL v4")
    print("=" * 60)

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        print(f"✓ Konek ke: {DB_CONFIG['dbname']}")
    except Exception as e:
        print(f"✗ Gagal konek: {e}")
        sys.exit(1)

    cur = conn.cursor()
    load_geo(cur)
    cur.close()

    if not RUN_ALL:
        print(f"\n[TEST] {TEST_FILE} | grad_year={TEST_GRAD_YEAR} | "
              f"max_rows={TEST_MAX_ROWS if 'TEST_MAX_ROWS' in dir() else 'semua'}")
        process_file(TEST_FILE, TEST_GRAD_YEAR, conn,
                     TEST_MAX_ROWS if 'TEST_MAX_ROWS' in dir() else None)
    else:
        for f, y in EXCEL_FILES:
            if not os.path.exists(f):
                print(f"\n[SKIP] File tidak ada: {f}")
                continue
            print(f"\n{'='*50}\n{f} | tahun lulus: {y}\n{'='*50}")
            process_file(f, y, conn)

    conn.close()
    print("\n✓ Selesai!")
    print("""
Verifikasi di pgAdmin:

-- 1. Cek nama & NIM masuk response_answers
SELECT ra.question_code, ra.answer_text, ap.name, ap.nim
FROM tracer_oltp.response_answers ra
JOIN tracer_oltp.responses r ON r.id = ra.response_id
JOIN tracer_oltp.alumni_profiles ap ON ap.id = r.alumni_id
WHERE ra.question_code IN ('nimhsmsmh','nmmhsmsmh')
LIMIT 10;

-- 2. Cek f5a1 (province id) dan f5a2 (city id) sudah berupa angka integer
SELECT ra.question_code, ra.answer_text,
       p.name AS province_name,
       c.name AS city_name
FROM tracer_oltp.response_answers ra
JOIN tracer_oltp.responses r ON r.id = ra.response_id
LEFT JOIN tracer_oltp.provinces p ON p.id::text = ra.answer_text AND ra.question_code = 'f5a1'
LEFT JOIN tracer_oltp.cities    c ON c.id::text = ra.answer_text AND ra.question_code = 'f5a2'
WHERE ra.question_code IN ('f5a1','f5a2')
LIMIT 20;

-- 3. Jumlah jawaban per question_code (kelengkapan data)
SELECT question_code, COUNT(*) AS jumlah
FROM tracer_oltp.response_answers
GROUP BY question_code
ORDER BY question_code;
""")


if __name__ == "__main__":
    main()