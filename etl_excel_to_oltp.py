import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# ── Koneksi database ──────────────────────────────────────────────
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)
cur = conn.cursor()
print("✓ Koneksi database berhasil!")

# ── Mapping nama sheet → program code ────────────────────────────
# Catatan: key di sini di-normalize (strip + collapse spasi) saat matching,
# jadi "D3  - Teknik Kimia" (spasi dobel) dan "D3 - Teknik Kimia" sama-sama cocok.
# Huruf kapital/kecil di akhir (misal "Jalan D" vs "Jalan d") juga sudah di-handle
# karena matching pakai .lower() di fungsi normalize_sheet_name().
SHEET_TO_PRODI_CODE = {
    "D3 - Teknik Informatika":                  "TI3",
    "D4 - Teknik Informatika":                  "TI",
    "D3 - Akuntansi":                           "AKT3",
    "D4 - Akuntansi":                           "AKT4",
    "D3 - Teknik Kimia":                        "TK3",
    "D3 - Analis Kimia":                        "AK3",
    "D3 - Teknik Mesin":                        "TM",
    "D3 - Teknik Elektronika":                  "TEL3",
    "D4 - Teknik Elektronika":                  "TEL4",
    "D3 - Teknik Listrik":                      "TL",
    "D3 - Teknik Telekomunikasi":               "TELKOM3",
    "D4 - Teknik Telekomunikasi":               "TELKOM4",
    "D3 - Teknik Konstruksi Gedung":            "TKG",
    "D3 - Teknik Konstruksi Sipil":             "TKS",
    "D4 - Teknik Perancangan Jalan d":          "TPJJ",   # cocok juga "Jalan D"
    "D4 - Teknik Perawatan Dan Perba":          "TPPG",
    "D4 - Teknik Perancangan dan Kon":          "TPKM",
    "D4 - Proses Manufaktur":                   "PM",
    "D3 - Teknik Pendingin Dan Tata ":          "TPTU3",
    "D4 - Teknik Pendingin dan Tata":           "TPTU4",
    "D3 - Teknik Konversi Energi":              "TKE3",
    "D4 - Teknik Konservasi Energi":            "TKE4",
    "D4 - Teknik Kimia Produksi Bers":          "TKPB",
    "D4 - Teknologi Pembangkit Tenag":          "TPTL",
    "D4 - Teknik Otomasi Industri":             "TOI",
    "D3 - Administrasi Bisnis":                 "AB3",
    "D4 - Administrasi Bisnis":                 "AB4",
    "D3 - Manajemen Pemasaran":                 "MP3",
    "D4 - Manajemen Pemasaran":                 "MP4",
    "D3 - Keuangan Dan Perbankan":              "KP",
    "D4 - Keuangan Syariah":                    "KS",
    "D4 - Akuntansi Manajemen Pemeri":          "AMP",
    "D4 - Manajemen Aset":                      "MA",
    "D3 - Usaha Perjalanan Wisata":             "UPW",
    "D3 - Bahasa Inggris":                      "BIG",
    "D3 - Teknik Aeronautika":                  "TA",
}

# ── Mapping status kerja ──────────────────────────────────────────
STATUS_MAP = {
    1: "employed",
    2: "not_working",
    3: "entrepreneur",
    4: "studying",
    5: "seeking",
}

# ── Mapping kolom Excel → question_code ──────────────────────────
COL_TO_CODE = {
    # Status kerja
    "Jelaskan status Anda saat ini?":                              "f8",
    "JELASKAN STATUS ANDA SAAT INI?":                             "f8",
    "JELASKAN STATUS ANDA SAAT INI!":                             "f8",
    # Bulan mendapat pekerjaan
    "Dalam berapa bulan anda mendapatkan pekerjaan ?":            "f502",
    "Dalam berapa bulan Anda mendapatkan pekerjaan ?":            "f502",
    "Dalam berapa bulan Anda mendapatkan pekerjaan pertama (bekerja)": "f502",
    # Pendapatan
    "Berapa rata-rata pendapatan anda per bulan ? (take home pay)? (dalam Rupiah)": "f505",
    "Berapa rata-rata pendapatan (take home pay) Anda per bulan?": "f505",
    "Berapa juta rata-rata pendapatan (take home pay) Anda per bulan ? (Hanya Angka)": "f505",
    # Lokasi kerja
    "Dimana lokasi tempat Anda bekerja? (Propinsi)":              "f5a1",
    "Dimana lokasi tempat Anda bekerja? (Kabupaten/Kota)":        "f5a2",
    # Jenis & nama perusahaan
    "Apa jenis perusahaan/instansi/institusi tempat anda bekerja sekarang?": "f1101",
    "Apa nama perusahaan/kantor tempat Anda bekerja?":            "f5b",
    # Sumber dana kuliah
    "Sebutkan sumberdana dalam pembiayaan kuliah?":               "f1201",
    "Sebutkan sumberdana dalam pembiayaan kuliah saat Anda menempuh pendidikan di Politeknik Negeri Bandung": "f1201",
    # Relevansi bidang studi
    "Seberapa erat hubungan antara program studi dengan pekerjaan anda sekarang?": "f14",
    "Seberapa erat hubungan antara bidang studi dengan pekerjaan anda?": "f14",
    "Seberapa erat keterkaitan antara bidang studi dengan pekerjaan anda?": "f14",
    # Tingkat pendidikan yang sesuai
    "Tingkat pendidikan apa yang paling tepat/sesuai untuk pekerjaan anda saat ini?": "f15",
    # Pencarian kerja aktif
    "Apakah Anda aktif mencari pekerjaan dalam 4 minggu terakhir?": "f1001",
    # Tingkat perusahaan
    "Termasuk ke dalam kelompok/tingkat manakah tempat kerja Anda?": "f5d",
    "Termasuk kedalam kelompok/tingkat manakah perusahaan tempat kerja Anda?": "f5d",
    # ── Kompetensi saat LULUS ─────────────────────────────────────
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Etika]": "f1761",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Etika]": "f1761",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Keahlian berdasarkan bidang ilmu]": "f1763",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Keahlian berdasarkan bidang ilmu]": "f1763",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Bahasa Inggris]": "f1765",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Bahasa Inggris]": "f1765",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Penggunaan Teknologi Informasi]": "f1767",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Penggunaan Teknologi Informasi]": "f1767",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Komunikasi]": "f1769",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Komunikasi]": "f1769",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Kerja sama tim]": "f1771",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Kerja sama tim]": "f1771",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai?[Pengembangan Diri]": "f1773",
    "Pada saat LULUS, pada tingkat mana kompetensi di bawah ini anda kuasai? 1=Sangat Rendah, 5=Sangat Tinggi[Pengembangan Diri]": "f1773",
    # ── Kompetensi saat INI (untuk pekerjaan) ────────────────────
    "\tUntuk mengerjakan pekerjaan Anda saat ini dibutuhkan penguasaan kompetensi setingkat apa?[Etika]": "f1762",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Etika]": "f1762",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Etika]": "f1762",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Etika]": "f1762",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Keahlian berdasarkan bidang ilmu]": "f1764",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Keahlian berdasarkan bidang ilmu]": "f1764",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Keahlian berdasarkan bidang ilmu]": "f1764",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Bahasa Inggris]": "f1766",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Bahasa Inggris]": "f1766",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Bahasa Inggris]": "f1766",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Penggunaan Teknologi Informasi]": "f1768",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Penggunaan Teknologi Informasi]": "f1768",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Penggunaan Teknologi Informasi]": "f1768",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Komunikasi]": "f1770",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Komunikasi]": "f1770",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Komunikasi]": "f1770",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Kerja sama tim]": "f1772",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Kerja sama tim]": "f1772",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Kerja sama tim]": "f1772",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? [Pengembangan Diri]": "f1774",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan?[Pengembangan Diri]": "f1774",
    "Pada saat ini, pada tingkat mana kompetensi di bawah ini diperlukan dalam pekerjaan? 1=Sangat Rendah, 5=Sangat Tinggi[Pengembangan Diri]": "f1774",
}

# ── Helper functions ──────────────────────────────────────────────
def clean_nim(val):
    if val is None:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None"):
        return None
    # Hapus desimal kalau ada (misal 123456.0 → 123456)
    try:
        return str(int(float(s)))
    except (ValueError, TypeError):
        return s

def clean_number(val):
    if val is None:
        return None
    s = str(val).strip().lower()
    if s in ("", "nan", "none"):
        return None
    try:
        # Kalau ada kata "juta", kali 1.000.000
        if "juta" in s:
            num = float(s.replace("juta", "").replace(",", ".").strip())
            return num * 1_000_000
        # Hapus titik ribuan dan ganti koma desimal
        s = s.replace(".", "").replace(",", ".")
        return float(s)
    except (ValueError, TypeError):
        return None

# ── Ambil data referensi dari DB ──────────────────────────────────
cur.execute("SELECT id, code FROM tracer_oltp.programs")
PROGRAM_ID_MAP = {row[1]: row[0] for row in cur.fetchall()}
print(f"✓ Loaded {len(PROGRAM_ID_MAP)} programs dari DB")

cur.execute("SELECT id, program_id, target_graduation_years FROM tracer_oltp.questionnaires")
questionnaires = cur.fetchall()
print(f"✓ Loaded {len(questionnaires)} questionnaires dari DB")

def get_questionnaire_id(program_id, graduation_year):
    """Cari questionnaire yang cocok, fallback ke ID=1."""
    gy = str(graduation_year)
    for q_id, q_prog, q_years in questionnaires:
        if q_prog == program_id and q_years and gy in str(q_years):
            return q_id
    for q_id, q_prog, q_years in questionnaires:
        if q_prog is None and q_years and gy in str(q_years):
            return q_id
    # Fallback: questionnaire pertama
    if questionnaires:
        return questionnaires[0][0]
    return 1

# ── Fungsi utama proses satu file Excel ───────────────────────────
def process_excel_file(filepath, graduation_year):
    print(f"\n{'='*55}")
    print(f"  File   : {filepath}")
    print(f"  Lulus  : {graduation_year}")
    print(f"{'='*55}")

    wb = pd.ExcelFile(filepath, engine='openpyxl')
    total_ok = 0
    total_skip = 0
    total_err = 0

    for sheet_name in wb.sheet_names:
        # Skip S2
        if sheet_name.strip().upper().startswith("S2"):
            print(f"  [SKIP-S2]  {sheet_name}")
            continue

        # Normalize: strip, collapse spasi dobel, lowercase untuk matching
        import re
        def norm(s):
            return re.sub(r'\s+', ' ', s.strip()).lower()

        prodi_code = None
        sheet_norm = norm(sheet_name)
        for key, code in SHEET_TO_PRODI_CODE.items():
            key_norm = norm(key)
            if sheet_norm == key_norm or sheet_norm.startswith(key_norm) or key_norm.startswith(sheet_norm):
                prodi_code = code
                break

        if not prodi_code:
            print(f"  [SKIP-UNKNOWN] {sheet_name}")
            continue

        program_id = PROGRAM_ID_MAP.get(prodi_code)
        if not program_id:
            print(f"  [SKIP-NO-PROG] {sheet_name} → code '{prodi_code}' tidak ada di DB")
            continue

        df = wb.parse(sheet_name, engine='openpyxl')
        if df.empty:
            print(f"  [SKIP-EMPTY]   {sheet_name}")
            continue

        q_id = get_questionnaire_id(program_id, graduation_year)
        sheet_ok = sheet_skip = sheet_err = 0

        for idx, row in df.iterrows():
            # Ambil nama — coba beberapa variasi header
            nama = None
            for col in df.columns:
                c = str(col).strip()
                if c in ("1. Nama", "1. Nama ") or c.lower().startswith("1. nama"):
                    v = str(row.get(col, "")).strip()
                    if v and v.lower() not in ("nan", "none", ""):
                        nama = v
                        break

            nim = clean_nim(row.get("2. NIM") or row.get("2. NIM "))

            if not nama or not nim:
                sheet_skip += 1
                continue

            try:
                # 1. alumni_profiles ───────────────────────────────
                cur.execute("""
                    INSERT INTO tracer_oltp.alumni_profiles
                        (name, nim, program_id, graduation_year, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                    ON CONFLICT (nim) DO UPDATE
                        SET name            = EXCLUDED.name,
                            program_id      = EXCLUDED.program_id,
                            graduation_year = EXCLUDED.graduation_year,
                            updated_at      = NOW()
                    RETURNING id
                """, (nama, nim, program_id, graduation_year))
                alumni_id = cur.fetchone()[0]

                # 2. responses ─────────────────────────────────────
                cur.execute("""
                    INSERT INTO tracer_oltp.responses
                        (questionnaire_id, alumni_id, submitted_at, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW(), NOW())
                    ON CONFLICT (questionnaire_id, alumni_id) DO NOTHING
                    RETURNING id
                """, (q_id, alumni_id))
                result = cur.fetchone()
                if not result:
                    cur.execute("""
                        SELECT id FROM tracer_oltp.responses
                        WHERE questionnaire_id = %s AND alumni_id = %s
                    """, (q_id, alumni_id))
                    result = cur.fetchone()
                response_id = result[0]

                # 3. response_answers ──────────────────────────────
                for col_name, q_code in COL_TO_CODE.items():
                    col_val = None
                    for actual_col in df.columns:
                        if actual_col.strip() == col_name.strip():
                            col_val = row.get(actual_col)
                            break
                    if col_val is None or str(col_val).strip() in ("nan", "", "None"):
                        continue
                    cur.execute("""
                        INSERT INTO tracer_oltp.response_answers
                            (response_id, question_code, answer_index, answer_text, created_at, updated_at)
                        VALUES (%s, %s, 0, %s, NOW(), NOW())
                        ON CONFLICT (response_id, question_code, answer_index) DO UPDATE
                            SET answer_text = EXCLUDED.answer_text,
                                updated_at  = NOW()
                    """, (response_id, q_code, str(col_val).strip()))

                # 4. employment_records ────────────────────────────
                status_val = None
                for col in df.columns:
                    if "status" in col.lower() and "saat ini" in col.lower():
                        status_val = row.get(col)
                        break

                if status_val and str(status_val).strip() not in ("nan", "", "None"):
                    try:
                        emp_status = STATUS_MAP.get(int(float(str(status_val))))
                    except (ValueError, TypeError):
                        emp_status = None

                    if emp_status in ("employed", "entrepreneur"):
                        salary = None
                        for col in df.columns:
                            if "pendapatan" in col.lower() and "per bulan" in col.lower():
                                salary = clean_number(row.get(col))
                                if salary:
                                    break

                        waiting = None
                        for col in df.columns:
                            if "berapa bulan" in col.lower() and "mendapatkan pekerjaan" in col.lower():
                                waiting = clean_number(row.get(col))
                                if waiting:
                                    break

                        company = None
                        for col in df.columns:
                            if "nama perusahaan" in col.lower() or "nama kantor" in col.lower():
                                v = str(row.get(col, "")).strip()
                                if v and v.lower() not in ("nan", "none", ""):
                                    company = v
                                    break

                        city = None
                        for col in df.columns:
                            if "kabupaten/kota" in col.lower() and "bekerja" in col.lower():
                                v = str(row.get(col, "")).strip()
                                if v and v.lower() not in ("nan", "none", ""):
                                    city = v
                                    break

                        cur.execute("""
                            INSERT INTO tracer_oltp.employment_records
                                (alumni_id, questionnaire_id, employment_status,
                                 waiting_months, salary_current, company_name,
                                 work_city, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            ON CONFLICT (alumni_id, questionnaire_id) DO UPDATE
                                SET employment_status = EXCLUDED.employment_status,
                                    waiting_months    = EXCLUDED.waiting_months,
                                    salary_current    = EXCLUDED.salary_current,
                                    company_name      = EXCLUDED.company_name,
                                    work_city         = EXCLUDED.work_city,
                                    updated_at        = NOW()
                        """, (alumni_id, q_id, emp_status,
                              waiting, salary, company, city))

                conn.commit()
                sheet_ok += 1

            except Exception as e:
                conn.rollback()
                print(f"    [ERROR] baris {idx} ({nama} / {nim}): {e}")
                sheet_err += 1
                continue

        total_ok   += sheet_ok
        total_skip += sheet_skip
        total_err  += sheet_err
        print(f"  ✓ {sheet_name:<45} | OK:{sheet_ok:>4}  SKIP:{sheet_skip:>3}  ERR:{sheet_err:>3}")

    print(f"\n{'─'*55}")
    print(f"  TOTAL → OK: {total_ok}  |  SKIP: {total_skip}  |  ERROR: {total_err}")
    print(f"{'─'*55}")


# ── Jalankan semua tahun 2019–2024 ───────────────────────────────
# Penjelasan graduation_year per file:
#   Data_2019.xlsx → alumni mengisi kuesioner tahun 2019
#   dst.
#
# CARA EDIT MANUAL kalau mau jalankan SATU tahun saja:
#   Comment (#) baris tahun lain, sisakan yang mau dijalankan.
#   Contoh mau jalankan 2023 saja:
#     # ("data/Data 2019.xlsx", 2019),
#     # ("data/Data 2020.xlsx", 2020),
#     # ("data/Data 2021.xlsx", 2021),
#     # ("data/Data 2022.xlsx", 2022),
#       ("data/Data 2023.xlsx", 2023),   ← ini yang jalan
#     # ("data/Data 2024.xlsx", 2024),
#
# PERBEDAAN ANTAR TAHUN yang perlu diperhatikan:
#   2019–2021 : kolom lebih sedikit, beberapa kolom kompetensi belum ada
#   2022–2024 : kolom gaji ada yang pakai format "berapa juta" (x1.000.000)
#               sudah di-handle oleh fungsi clean_number()
#   Nama sheet : kadang ada spasi dobel atau huruf kapital beda
#               sudah di-handle oleh fungsi norm() di matching sheet

FILES = [
    ("data/Data_2019.xlsx", 2019),
    ("data/Data_2020.xlsx", 2020),
    ("data/Data_2021.xlsx", 2021),
    ("data/Data_2022.xlsx", 2022),
    ("data/Data_2023.xlsx", 2023),
    ("data/Data_2024.xlsx", 2024),
]

for filepath, grad_year in FILES:
    process_excel_file(filepath, graduation_year=grad_year)

cur.close()
conn.close()
print("\n✅ Selesai semua tahun! Cek hasilnya di pgAdmin:")
print("""
  SELECT COUNT(*) AS alumni     FROM tracer_oltp.alumni_profiles;
  SELECT COUNT(*) AS responses  FROM tracer_oltp.responses;
  SELECT COUNT(*) AS answers    FROM tracer_oltp.response_answers;
  SELECT COUNT(*) AS employment FROM tracer_oltp.employment_records;
""")