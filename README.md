# Tracer Study Analytics (Cube.js)

Repository ini berisi **Analytic Layer** untuk Sistem Informasi Tracer Study menggunakan **Cube.js**.  
Fungsinya untuk menyediakan query analitik (KPI/measures, dimensions, pre-aggregation/caching) di atas data warehouse **PostgreSQL** sehingga kebutuhan dashboard/OLAP lebih cepat dan terstruktur.

> Posisi di arsitektur: PostgreSQL (DW) → **Cube.js (Analytics)** → Backend Laravel (API Gateway) → Frontend React (Dashboard)

---

## Tech Stack

- **Cube.js** (Node.js / JavaScript)
- **Docker Compose** (untuk menjalankan service analytics)
- **PostgreSQL** sebagai data source (diasumsikan berasal dari data warehouse Tracer Study)

---

## Struktur Folder

```text
.
├─ tracer-analytics/
│  ├─ cube.js
│  ├─ docker-compose.yml
│  ├─ package.json
│  ├─ package-lock.json
│  └─ model/
│     ├─ cubes/
│     │  ├─ DimAlumni.js
│     │  ├─ DimIndikatorEvaluasi.js
│     │  ├─ DimKesesuaianBidang.js
│     │  ├─ DimKesesuaianLevel.js
│     │  ├─ DimPerusahaan.js
│     │  ├─ DimProdi.js
│     │  ├─ DimStatusAlumni.js
│     │  ├─ DimStudiLanjut.js
│     │  ├─ DimWaktu.js
│     │  ├─ DimWirausaha.js
│     │  ├─ FactMultiSelect.js
│     │  ├─ FactRangeEvaluasi.js
│     │  ├─ FactTracerStudy.js
│     │  └─ orders.yml
│     └─ views/
│        └─ example_view.yml
└─ .gitignore
```

### Penjelasan
- `tracer-analytics/model/cubes/`  
  Berisi definisi **Cube schemas**:
  - `Dim*.js` → dimensi (dimension tables)
  - `Fact*.js` → fact tables (measures/KPI utama)
- `tracer-analytics/model/views/`  
  Berisi definisi **views** (contoh: `example_view.yml`)
- `tracer-analytics/docker-compose.yml`  
  Konfigurasi service Cube.js via Docker
- `tracer-analytics/cube.js`  
  Entry/config file Cube.js (project setup)

---

## Cara Menjalankan (Disarankan: Docker Compose)

> Jalankan dari folder `tracer-analytics/` karena file compose berada di sana.

```bash
cd tracer-analytics
docker compose up --build
```

Jika sudah jalan, Cube.js biasanya menyediakan API di port **4000** (bergantung konfigurasi `docker-compose.yml`).

Cek health/service:
- Cube.js API endpoint umumnya: `/cubejs-api/v1/load`

---

## Cara Menjalankan (Alternatif: Local Node)

```bash
cd tracer-analytics
npm install
npm run dev
```

> Script yang tersedia tergantung isi `package.json`.

---

## Cara Pakai dari Backend (Laravel)

Analytic layer ini sebaiknya diakses lewat backend (Laravel) sebagai **API Gateway**, bukan langsung dari frontend.

Contoh request ke Cube.js:
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

Backend akan:
- Menyisipkan auth/role validation
- Membatasi akses data (mis. Kaprodi hanya prodi tertentu)
- Transform response menjadi format yang “clean” untuk frontend

---

## Catatan Pengembangan

- Tambahkan domain analitik baru dengan membuat file schema baru di:
  - `model/cubes/` untuk cube/dimension/fact baru
  - `model/views/` bila membutuhkan view definition
- Urutan/penyajian bisa diatur via `orders.yml`

---

## Lisensi

Internal / untuk kebutuhan Tugas Akhir (sesuaikan jika ingin open-source).
