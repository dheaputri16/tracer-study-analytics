// ARSITEKTUR (direvisi mengikuti Kimball standard):
//
// Referensi: Kimball "The Data Warehouse Toolkit" Ch.5
// "The surrogate key is the only mechanism needed to identify
//  which version of a dimension row applies to a fact row."
//
// DENORMALISASI:
// Label tidak disimpan di fact karena:
// - Data SmartTracer (<1 juta baris) belum butuh optimasi ini
// - Join statis (surrogate key) sudah bisa di-pre-aggregate
// - Kalau data tumbuh besar, baru pertimbangkan denormalisasi
//
// CATATAN CUBE.JS:
// Dimension dari joined cube TIDAK boleh didefinisikan di sini.
// Cube.js membutuhkan setiap dimension didefinisikan di cube
// pemiliknya masing-masing agar pre-aggregation bisa di-cache
// dengan benar. Query dari backend menggunakan nama cube asli,
// contoh: DimProdi.jenjang, DimStatusAlumni.label, dst.

cube(`FactTracerStudy`, {
  sql_table: `public.fact_tracer_study`,

  // ─────────────────────────────────────────────────────────────
  //  JOINS
  //
  //  Semua join menggunakan surrogate key saja.
  //
  //  Dimensi yang punya SCD Type 2 (dim_perusahaan, dim_prodi,
  //  dim_wirausaha) tetap di-join dengan surrogate key —
  //  surrogate key sudah menunjukkan versi yang benar.
  //
  //  Dimensi yang tidak punya SCD Type 2 (dim_alumni, dim_waktu,
  //  dim_status_alumni, dim_kesesuaian_bidang, dll) di-join
  //  dengan cara yang sama — konsisten dan sederhana.
  // ─────────────────────────────────────────────────────────────

  joins: {

    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_alumni = ${DimAlumni}.id_alumni`,
    },

    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_waktu = ${DimWaktu}.id_waktu`,
    },

    // SCD Type 2 — join surrogate key saja.
    // fact.prodi_sk sudah menunjukkan versi prodi yang benar
    // pada saat alumni mengisi kuesioner.
    DimProdi: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.prodi_sk = ${DimProdi}.prodi_sk`,
    },

    // Tidak perlu SCD Type 2 — penambahan status baru
    // tidak mengubah versi status lama.
    // Status baru = row baru dengan sk baru di dim_status_alumni.
    DimStatusAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.status_alumni_sk = ${DimStatusAlumni}.status_alumni_sk`,
    },

    // Tidak perlu SCD Type 2
    // Kategori baru = row baru dengan sk baru.
    DimKesesuaianBidang: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.kesesuaian_bidang_sk = ${DimKesesuaianBidang}.kesesuaian_bidang_sk`,
    },

    // Tidak perlu SCD Type 2
    // Kesesuaian baru = row baru dengan sk baru.
    DimKesesuaianLevel: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.kesesuaian_level_sk = ${DimKesesuaianLevel}.kesesuaian_level_sk`,
    },

    // SCD Type 2 — perusahaan bisa ganti jenis/skala/lokasi.
    // fact.perusahaan_sk sudah menunjukkan versi perusahaan
    // yang berlaku saat alumni mengisi kuesioner.
    DimPerusahaan: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.perusahaan_sk = ${DimPerusahaan}.perusahaan_sk`,
    },

    DimStudiLanjut: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_studi_lanjut = ${DimStudiLanjut}.id_studi_lanjut`,
    },

    // SCD Type 2 — data wirausaha alumni bisa berubah.
    // fact.wirausaha_sk sudah menunjukkan versi yang benar.
    DimWirausaha: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.wirausaha_sk = ${DimWirausaha}.wirausaha_sk`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  MEASURES
  //
  //  1. DINAMIS — tidak hardcode status/kategori apapun.
  //     Backend group by dimension label dari join.
  //     Status baru/prodi baru/kategori baru → otomatis muncul
  //     karena data ada di dimensi, bukan hardcode di sini.
  //
  //  2. HARDCODE — logika bisnis institusi.
  //     Angka dan batas tidak ada di database — keputusan manusia.
  //     Kalau standar berubah, edit di sini saja.
  //     Kalau ada status baru masuk "terserap", tambahkan sk-nya
  //     di count_terserap DAN di OptionRegistry.php.
  // ─────────────────────────────────────────────────────────────

  measures: {

    // ── DINAMIS ────────────────────────────────────────────────

    // Measure utama — dipakai untuk semua grafik count.
    // Backend group by DimStatusAlumni.label / DimProdi.nama_prodi
    // / DimWaktu.tahun_snapshot untuk dapat breakdown apapun
    // tanpa ubah kode ini.
    count_alumni: {
      type: `count`,
      description: `Total alumni yang mengisi tracer study`,
    },

    // Rata-rata masa tunggu — tanpa filter status.
    // Backend filter by DimStatusAlumni.label jika perlu
    // hanya alumni bekerja saja.
    avg_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `avg`,
      description: `Rata-rata masa tunggu kerja pertama (bulan)`,
    },
    min_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `min`,
    },
    max_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `max`,
    },

    avg_masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `avg`,
      description: `Rata-rata masa tunggu mulai wirausaha (bulan)`,
    },
    min_masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `min`,
    },
    max_masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `max`,
    },

    avg_bulan_sebelum_lulus: {
      sql: `bulan_sebelum_lulus`,
      type: `avg`,
      description: `Rata-rata bulan sebelum lulus mulai cari kerja`,
    },
    avg_bulan_sesudah_lulus: {
      sql: `bulan_sesudah_lulus`,
      type: `avg`,
      description: `Rata-rata bulan sesudah lulus dapat kerja`,
    },

    avg_take_home_pay: {
      sql: `take_home_pay`,
      type: `avg`,
      description: `Rata-rata gaji per bulan`,
    },
    min_take_home_pay: {
      sql: `take_home_pay`,
      type: `min`,
    },
    max_take_home_pay: {
      sql: `take_home_pay`,
      type: `max`,
    },
    count_above_ump: {
      type: `count`,
      filters: [{ sql: `${CUBE}.flag_above_ump = 1` }],
      description: `Alumni dengan gaji ≥ 1.2× UMP tahun lulus`,
    },
    count_below_ump: {
      type: `count`,
      filters: [{ sql: `${CUBE}.flag_above_ump = 0` }],
      description: `Alumni dengan gaji < 1.2× UMP tahun lulus`,
    },

    // ── HARDCODE — keputusan bisnis institusi ──────────────────

    // "Terserap" = bekerja (sk=1) + wirausaha (sk=3).
    // PENTING: Kalau ada status baru yang juga dianggap terserap
    // (misal sk=6 "Bekerja + Kuliah"), tambahkan sk-nya di sini
    // DAN update OptionRegistry.php (statusHasPerusahaan).
    count_terserap: {
      type: `count`,
      filters: [{
        sql: `${CUBE}.status_alumni_sk IN (1, 3)`,
      }],
      description: `Alumni terserap: bekerja (sk=1) + wirausaha (sk=3)`,
    },

    // "Cepat" = masa tunggu > 0 dan ≤ 6 bulan (standar DIKTI).
    count_masa_tunggu_cepat: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja > 0` },
        { sql: `${CUBE}.masa_tunggu_bekerja <= 6` },
        { sql: `${CUBE}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja atau wirausaha dalam 6 bulan (standar DIKTI)`,
    },

    // Distribusi masa tunggu — rentang ditentukan institusi.
    // Kalau rentang berubah, edit ketiga measure ini sekaligus.
    count_tunggu_0_3_bulan: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja >= 0` },
        { sql: `${CUBE}.masa_tunggu_bekerja < 3` },
        { sql: `${CUBE}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja dalam 0-3 bulan`,
    },
    count_tunggu_3_6_bulan: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja >= 3` },
        { sql: `${CUBE}.masa_tunggu_bekerja <= 6` },
        { sql: `${CUBE}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja dalam 3-6 bulan`,
    },
    count_tunggu_lebih_6_bulan: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja > 6` },
        { sql: `${CUBE}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja lebih dari 6 bulan`,
    },

    // "Sesuai bidang" = sk 1,2,3 (Sangat Erat, Erat, Cukup Erat).
    // "Tidak sesuai"  = sk 4,5   (Kurang Erat, Tidak Sama Sekali).
    // PENTING: Kalau ada kategori baru (misal sk=6 "Erat Sekali"),
    // putuskan masuk "sesuai" atau "tidak sesuai" lalu tambahkan
    // sk-nya di filter yang tepat.
    count_sesuai_bidang: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.kesesuaian_bidang_sk IN (1, 2, 3)` },
        { sql: `${CUBE}.status_alumni_sk = 1` },
      ],
      description: `Alumni bekerja sesuai bidang (sk 1-3: Sangat Erat, Erat, Cukup Erat)`,
    },
    count_tidak_sesuai_bidang: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.kesesuaian_bidang_sk IN (4, 5)` },
        { sql: `${CUBE}.status_alumni_sk = 1` },
      ],
      description: `Alumni bekerja tidak sesuai bidang (sk 4-5: Kurang Erat, Tidak Sama Sekali)`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  DIMENSIONS
  //
  //  Hanya kolom NATIVE dari tabel fact_tracer_study.
  //
  //  ATURAN CUBE.JS:
  //  Dimension dari joined cube (DimProdi, DimStatusAlumni, dll)
  //  TIDAK boleh didefinisikan di sini — harus di cube masing-
  //  masing. Lihat file DimProdi.js, DimStatusAlumni.js, dst.
  //
  //  Untuk query backend, gunakan nama cube aslinya langsung:
  //    DimProdi.jenjang        (bukan FactTracerStudy.jenjang)
  //    DimStatusAlumni.label   (bukan FactTracerStudy.status_label)
  //    DimWaktu.tahun_snapshot (bukan FactTracerStudy.tahun_snapshot)
  //
  //  HIERARKI PRODI (drill-down) — didefinisikan di DimProdi.js:
  //  DimProdi.jenjang → DimProdi.jurusan → DimProdi.nama_prodi
  //  User bisa drill dari "D3 berapa % terserap?" ke
  //  "jurusan mana?" ke "prodi spesifik mana?"
  // ─────────────────────────────────────────────────────────────

  dimensions: {

    // ── Primary key ────────────────────────────────────────────
    id_fact: {
      sql: `id_fact`,
      type: `number`,
      primary_key: true,
    },

    // ── Surrogate keys dari fact ───────────────────────────────
    // Dipakai untuk filter numerik dan referensi join.
    // Untuk display label, pakai dimension dari cube dimensinya
    // langsung: DimStatusAlumni.label, DimProdi.nama_prodi, dst.
    id_alumni:            { sql: `id_alumni`,            type: `number` },
    id_waktu:             { sql: `id_waktu`,             type: `number` },
    prodi_sk:             { sql: `prodi_sk`,             type: `number` },
    status_alumni_sk:     { sql: `status_alumni_sk`,     type: `number` },
    kesesuaian_bidang_sk: { sql: `kesesuaian_bidang_sk`, type: `number` },
    kesesuaian_level_sk:  { sql: `kesesuaian_level_sk`,  type: `number` },
    perusahaan_sk:        { sql: `perusahaan_sk`,        type: `number` },
    id_studi_lanjut:      { sql: `id_studi_lanjut`,      type: `number` },
    wirausaha_sk:         { sql: `wirausaha_sk`,         type: `number` },
    ump_sk:               { sql: `ump_sk`,               type: `number` },

    // ── Kolom numerik dari fact ─────────────────────────────────
    masa_tunggu_bekerja:   { sql: `masa_tunggu_bekerja`,   type: `number` },
    bulan_sebelum_lulus:   { sql: `bulan_sebelum_lulus`,   type: `number` },
    bulan_sesudah_lulus:   { sql: `bulan_sesudah_lulus`,   type: `number` },
    masa_tunggu_wirausaha: { sql: `masa_tunggu_wirausaha`, type: `number` },
    take_home_pay:         { sql: `take_home_pay`,         type: `number` },
    flag_above_ump:        { sql: `flag_above_ump`,        type: `number` },
  },

  // ─────────────────────────────────────────────────────────────
  //  PRE-AGGREGATIONS
  //
  //  Kenapa sekarang bisa di-pre-aggregate penuh?
  //  Karena semua join menggunakan surrogate key statis.
  //  Tidak ada kondisi join dinamis (tanggal_refresh) yang
  //  mencegah Cube.js meng-cache hasil query.
  //
  //  Cube.js bisa match query ke pre-aggregation yang tersimpan
  //  ketika measures dan dimensions yang diminta adalah subset
  //  dari yang didefinisikan di pre-aggregation ini.
  //
  //  PENTING — cara reference dimension di pre-aggregation:
  //  Harus pakai nama cube aslinya (DimProdi.jenjang),
  //  bukan alias lama (FactTracerStudy.jenjang) yang sudah
  //  dihapus karena melanggar aturan Cube.js.
  //
  //  Refresh strategy:
  //  - Cek setiap jam: SELECT MAX(tanggal_refresh) FROM dim_waktu
  //  - Kalau berubah = ETL mingguan sudah jalan
  //  - Rebuild pre-aggregation yang terpengaruh
  //  - Efektif hanya rebuild seminggu sekali
  //
  //  Requirement:
  //  - Redis untuk menyimpan pre-aggregation
  //  - Set CUBEJS_REDIS_URL di environment Cube.js
  // ─────────────────────────────────────────────────────────────

  pre_aggregations: {
 
    // ── 1. Pre-agg UTAMA ────────────────────────────────────
    // Melayani: KPI keterserapan, distribusi status,
    //           grafik tren per tahun lulus, filter global.
    // Include tahun_lulus (DimAlumni) DAN tahun_snapshot +
    // minggu_snapshot (DimWaktu) agar satu pre-agg bisa
    // melayani semua kombinasi filter global dashboard.
    utama: {
      type: `rollup`,
      measures: [
        FactTracerStudy.count_alumni,
        FactTracerStudy.count_terserap,
        FactTracerStudy.count_masa_tunggu_cepat,
        FactTracerStudy.avg_masa_tunggu_bekerja,
        FactTracerStudy.avg_take_home_pay,
        FactTracerStudy.count_sesuai_bidang,
        FactTracerStudy.count_tidak_sesuai_bidang,
      ],
      dimensions: [
        // Hierarki prodi — drill-down jenjang → jurusan → prodi
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        // Status alumni untuk distribusi
        DimStatusAlumni.label,
        // Filter waktu — keduanya disertakan:
        DimAlumni.tahun_lulus,      // untuk grafik tren per angkatan
        DimWaktu.tahun_snapshot,    // untuk konteks snapshot
        DimWaktu.minggu_snapshot,   // untuk filter global minggu snapshot
      ],
      refresh_key: {
        // Hanya rebuild kalau ETL sudah jalan (tanggal_refresh berubah).
        // Dicek sekali sehari — cukup untuk ETL mingguan.
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 2. Distribusi masa tunggu kerja ─────────────────────
    distribusi_masa_tunggu: {
      measures: [
        FactTracerStudy.count_tunggu_0_3_bulan,
        FactTracerStudy.count_tunggu_3_6_bulan,
        FactTracerStudy.count_tunggu_lebih_6_bulan,
        FactTracerStudy.avg_masa_tunggu_bekerja,
        FactTracerStudy.min_masa_tunggu_bekerja,
        FactTracerStudy.max_masa_tunggu_bekerja,
      ],
      dimensions: [
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 3. Distribusi gaji ──────────────────────────────────
    distribusi_gaji: {
      measures: [
        FactTracerStudy.avg_take_home_pay,
        FactTracerStudy.min_take_home_pay,
        FactTracerStudy.max_take_home_pay,
        FactTracerStudy.count_above_ump,
        FactTracerStudy.count_below_ump,
      ],
      dimensions: [
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimStatusAlumni.label,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 4. Kesesuaian bidang & level ────────────────────────
    distribusi_kesesuaian: {
      measures: [
        FactTracerStudy.count_alumni,
        FactTracerStudy.count_sesuai_bidang,
        FactTracerStudy.count_tidak_sesuai_bidang,
      ],
      dimensions: [
        DimKesesuaianBidang.label,
        DimKesesuaianLevel.label,
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 5. Sebaran instansi & lokasi kerja ──────────────────
    // Menggunakan label langsung (sudah didenormalisasi di
    // dim_perusahaan) — tidak ada join ke tabel referensi lagi.
    sebaran_instansi_lokasi: {
      measures: [
        FactTracerStudy.count_alumni,
      ],
      dimensions: [
        DimPerusahaan.label_jenis_perusahaan,
        DimPerusahaan.label_tingkat_instansi,
        DimPerusahaan.nama_kota,
        DimPerusahaan.nama_provinsi,
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 6. Wirausaha ─────────────────────────────────────────
    // Menggunakan label langsung dari dim_wirausaha
    // (setelah migration: nama_provinsi & nama_kota terisi).
    distribusi_wirausaha: {
      measures: [
        FactTracerStudy.count_alumni,
        FactTracerStudy.avg_masa_tunggu_wirausaha,
        FactTracerStudy.min_masa_tunggu_wirausaha,
        FactTracerStudy.max_masa_tunggu_wirausaha,
      ],
      dimensions: [
        DimWirausaha.label_tingkat_instansi,
        DimWirausaha.nama_provinsi,
        DimWirausaha.nama_kota,
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },

    // ── 7. Studi Lanjut ────────────────────────────────────
    distribusi_studi_lanjut: {
      type: `rollup`,
      measures: [
        FactTracerStudy.count_alumni,
      ],
      dimensions: [
        DimStudiLanjut.perguruan_tinggi,
        DimStudiLanjut.program_studi,
        DimStudiLanjut.sumber_biaya,
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
  },
});