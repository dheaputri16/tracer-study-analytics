# Tracer Study Analytics (Cube.js)

Repository ini berisi **Analytic Layer** untuk Sistem Informasi Tracer Study menggunakan **Cube.js**.  
Cube.js dipakai untuk kebutuhan **OLAP / dashboard analytics** (KPI/measures, dimensions, filter, drill-down) di atas data warehouse **PostgreSQL**, dengan dukungan caching / pre-aggregation.

**Arsitektur (ringkas):**  
PostgreSQL (Data Warehouse) → **Cube.js (Analytics Layer)** → Laravel Backend (API Gateway) → React Frontend (Dashboard)

> Cube.js **tidak memindahkan data**. Data tetap di PostgreSQL; Cube.js hanya mendefinisikan schema (JS/YAML) dan menjalankan query analitik.

---

## Tech Stack

- **Cube.js Server** (`cubejs/cube:v1.6.47`)
- **PostgreSQL driver**: `@cubejs-backend/postgres-driver`
- **Docker Compose**
- JavaScript (Cube schema)

---

## Struktur Folder

```text
tracer-analytics/
  cube.js
  docker-compose.yml
  package.json
  package-lock.json
  model/
    cubes/        # definisi cube schema (facts & dimensions)
    views/        # definisi view (YAML)
```

---

## Cube Schema yang Tersedia

### 1) Cubes (`tracer-analytics/model/cubes/`)
Di folder ini terdapat definisi schema berbasis JavaScript untuk **dimension** dan **fact**.

**Dimension cubes:**
- `DimAlumni.js`
- `DimProdi.js`
- `DimPerusahaan.js`
- `DimWaktu.js`
- `DimStatusAlumni.js`
- `DimStudiLanjut.js`
- `DimWirausaha.js`
- `DimKesesuaianBidang.js`
- `DimKesesuaianLevel.js`
- `DimIndikatorEvaluasi.js`

**Fact cubes:**
- `FactTracerStudy.js`
- `FactMultiSelect.js`
- `FactRangeEvaluasi.js`

**Utility:**
- `orders.yml` → pengaturan urutan/organisasi (berguna untuk keteraturan schema/metadata)

> Catatan: Nama table/field persisnya mengikuti definisi pada masing-masing file cube (sql/joins/measures/dimensions).

### 2) Views (`tracer-analytics/model/views/`)
Berisi definisi view berbasis YAML:
- `example_view.yml` (contoh view)

---

## Menjalankan Service (Recommended: Docker)

Jalankan dari folder `tracer-analytics/`:

```bash
cd tracer-analytics
docker compose up --build
```

Service yang terbuka:
- **http://localhost:4000** → Cube.js API + Developer Playground
- **http://localhost:3000** → Dashboard app (jika dibuat/digunakan)

> `docker-compose.yml` memakai `env_file: .env`, jadi kamu perlu menyiapkan file `.env` di folder `tracer-analytics/`.

---

## Menjalankan Service (Alternatif: Local Node)

```bash
cd tracer-analytics
npm install
npm run dev
```

Script yang tersedia (dari `package.json`):
- `dev` → menjalankan `cubejs-server`

---

## Environment Variables (.env)

Buat file: `tracer-analytics/.env`

Minimal yang biasanya dibutuhkan untuk Cube.js + Postgres:

```env
# Server
CUBEJS_DEV_MODE=true
CUBEJS_API_SECRET=replace-with-strong-secret

# Database (PostgreSQL)
CUBEJS_DB_TYPE=postgres
CUBEJS_DB_HOST=localhost
CUBEJS_DB_PORT=5432
CUBEJS_DB_NAME=tracer_dw
CUBEJS_DB_USER=postgres
CUBEJS_DB_PASS=postgres

# (Opsional) Schema
# CUBEJS_DB_SCHEMA=public
```

> Nama variabel bisa kamu sesuaikan dengan setup DB kamu. Yang penting: `CUBEJS_DB_TYPE=postgres` dan kredensial DB benar.

---

## Cara Test API Cube.js

Endpoint utama untuk query:
- `POST /cubejs-api/v1/load`

Contoh body query:
```json
{
  "query": {
    "measures": ["Tracer.keterserapan"],
    "dimensions": ["Tracer.prodi"],
    "filters": [
      {
        "dimension": "Tracer.tahun",
        "operator": "equals",
        "values": ["2026"]
      }
    ]
  }
}
```

Header yang umum dipakai:
- `Authorization: <token>` (jika kamu mengaktifkan auth via `CUBEJS_API_SECRET` dan generate JWT di backend)

---

## Integrasi dengan Backend (Laravel)

Best practice untuk project kamu:
- **Frontend tidak memanggil Cube.js langsung**
- Backend Laravel bertindak sebagai **API Gateway**:
  - Auth & role-based access control
  - Validasi filter (mis. Kaprodi hanya prodi tertentu)
  - Format response via DTO

Backend akan melakukan HTTP POST ke:
- `http://cube:4000/cubejs-api/v1/load` (jika satu network docker)
- `http://localhost:4000/cubejs-api/v1/load` (jika local)

---

## Menambah / Mengubah KPI

1) Tambahkan/ubah schema di `tracer-analytics/model/cubes/*.js`
   - `measures` → KPI (count, avg, ratio, dll.)
   - `dimensions` → field filter / group by
   - `joins` → relasi antar table
2) Restart Cube.js server (atau container) agar schema ter-load ulang.

---

## Troubleshooting

- **Port 4000/3000 bentrok**  
  Ubah binding port di `docker-compose.yml`.
- **Tidak bisa connect ke PostgreSQL**  
  Pastikan `.env` benar (host/port/user/pass) dan DB bisa diakses dari container.
- **Schema tidak kebaca**  
  Pastikan file schema ada di `model/cubes` dan volume mount berjalan (compose memakai `.:/cube/conf`).

---

## Lisensi
Internal / untuk kebutuhan Tugas Akhir.
