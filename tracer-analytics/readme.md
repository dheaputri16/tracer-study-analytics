# Tracer Study Analytic Layer — Cube.js

Analytic layer untuk sistem dashboard tracer study Politeknik Negeri Bandung. Service ini berdiri sebagai repository terpisah dan bertanggung jawab penuh atas query analitik terhadap data warehouse OLAP, pre-aggregation, dan penyediaan REST API yang dikonsumsi oleh backend Laravel.

---

## Arsitektur

```
React (FE)
    │
    │ HTTP
    ▼
Laravel (BE) ──── POST /cubejs-api/v1/load ────► Cube.js (repo ini)
                                                        │
                                                        │ SQL query
                                                        ▼
                                               PostgreSQL 15 (Data Warehouse)
                                               ┌─────────────────────────────┐
                                               │  fact_tracer_study          │
                                               │  fact_range_evaluasi        │
                                               │  fact_multi_select          │
                                               │  dim_alumni, dim_prodi, ... │
                                               │  pre-aggregation tables     │
                                               └─────────────────────────────┘
```

Cube.js tidak diakses langsung oleh frontend. Seluruh request dari FE melewati Laravel terlebih dahulu, yang kemudian meneruskan query ke Cube.js. Laravel berperan sebagai security & orchestration layer (autentikasi, otorisasi role, audit trail).

---

## Tech Stack

| Komponen | Versi | Keterangan |
|---|---|---|
| Cube.js | latest | Analytic layer & pre-aggregation engine |
| Node.js | ≥ 18 | Runtime Cube.js |
| PostgreSQL | 15 | Data warehouse (OLAP) |
| npm | ≥ 9 | Package manager |

---

## Struktur Repo

```
tracer-study-cube/
├── cube.js                      # Konfigurasi utama (koneksi DB, query rewrite)
├── .env                         # Environment variables (tidak di-commit)
├── .env.example                 # Template environment variables
├── package.json
└── model/
    └── cubes/
        ├── FactTracerStudy.js       # Fact utama: 1 baris = 1 alumni × 1 periode
        ├── FactRangeEvaluasi.js     # Fact evaluasi: 1 baris = 1 alumni × 1 indikator
        ├── FactMultiSelect.js       # Fact multi select: 1 baris = 1 alumni × 1 opsi
        ├── DimAlumni.js
        ├── DimWaktu.js
        ├── DimProdi.js
        ├── DimStatusAlumni.js
        ├── DimKesesuaianBidang.js
        ├── DimKesesuaianLevel.js
        ├── DimPerusahaan.js
        ├── DimStudiLanjut.js
        ├── DimWirausaha.js
        └── DimIndikatorEvaluasi.js
```

---

## Prerequisites

Pastikan sudah tersedia:

- Node.js ≥ 18 (`node -v`)
- Akses ke PostgreSQL 15 yang sudah berisi schema data warehouse
- Database sudah diisi data (lihat repo `tracer-study-dw` untuk SQL dump)

---

## Instalasi & Menjalankan

### 1. Clone repo

```bash
git clone <repo-url>
cd tracer-study-cube
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
cp .env.example .env
```

Edit `.env` sesuai konfigurasi lokal:

```env
# Koneksi ke PostgreSQL Data Warehouse
CUBEJS_DB_TYPE=postgres
CUBEJS_DB_HOST=localhost
CUBEJS_DB_PORT=5432
CUBEJS_DB_NAME=tracer_study_dw
CUBEJS_DB_USER=postgres
CUBEJS_DB_PASS=yourpassword

# Secret untuk JWT token (min. 32 karakter, ganti dengan random string)
CUBEJS_API_SECRET=ganti_dengan_random_string_panjang_minimal_32_karakter

# Mode development (set false di production)
CUBEJS_DEV_MODE=true
```

### 4. Jalankan development server

```bash
npm run dev
```

Server berjalan di:
- **http://localhost:4000** — Cube Playground (UI untuk eksplorasi query)
- **http://localhost:4000/cubejs-api/v1** — REST API endpoint

---

## Cube Playground

Buka `http://localhost:4000` di browser. Playground memungkinkan eksplorasi query secara visual sebelum diintegrasikan ke backend.

Contoh query yang bisa dicoba di Playground:

**Jumlah alumni per prodi per tahun:**
```json
{
  "measures": ["FactTracerStudy.count_alumni"],
  "dimensions": ["DimProdi.nama_prodi", "DimWaktu.tahun_snapshot"],
  "order": { "FactTracerStudy.count_alumni": "desc" }
}
```

**Rata-rata masa tunggu bekerja per prodi:**
```json
{
  "measures": ["FactTracerStudy.avg_masa_tunggu_bekerja"],
  "dimensions": ["DimProdi.nama_prodi"],
  "filters": [
    {
      "member": "DimStatusAlumni.label",
      "operator": "contains",
      "values": ["Bekerja"]
    }
  ]
}
```

**Rata-rata skor kompetensi per indikator:**
```json
{
  "measures": ["FactRangeEvaluasi.avg_skor"],
  "dimensions": [
    "DimIndikatorEvaluasi.label_pertanyaan",
    "DimIndikatorEvaluasi.kategori_pertanyaan"
  ],
  "filters": [
    {
      "member": "DimIndikatorEvaluasi.jenis_skala",
      "operator": "equals",
      "values": ["range"]
    }
  ],
  "order": { "DimIndikatorEvaluasi.kategori_pertanyaan": "asc" }
}
```

---

## REST API

Endpoint utama yang dikonsumsi Laravel:

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/cubejs-api/v1/load` | Eksekusi query analitik |
| `GET` | `/cubejs-api/v1/meta` | Daftar semua cube, measures, dimensions |
| `POST` | `/cubejs-api/v1/sql` | Lihat SQL yang di-generate (debug) |

---


---

## Mendapatkan API Token

Saat `CUBEJS_DEV_MODE=true`, token bisa diambil dari Playground:

1. Buka `http://localhost:4000`
2. Klik ikon kunci / "API" di pojok kanan atas
3. Copy token yang muncul

Token ini yang dimasukkan ke `.env` Laravel sebagai `CUBEJS_TOKEN`.

---

## Catatan

- Cube.js **tidak boleh** diakses langsung dari frontend. Semua request harus melalui Laravel.
- Jangan commit file `.env` ke repository.
- Schema cube (`model/cubes/`) harus selalu sinkron dengan struktur tabel di PostgreSQL. Jika ada perubahan DDL di data warehouse, update cube yang bersangkutan.