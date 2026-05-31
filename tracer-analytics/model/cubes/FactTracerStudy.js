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
    // Backend group by status_label / nama_prodi / tahun_snapshot
    // untuk dapat breakdown apapun tanpa ubah kode ini.
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

    // ── HARDCODE — keputusan bisnis institusi ──────────────────

    // "Terserap" = bekerja (sk=1) + wirausaha (sk=3).
    // PENTING: Kalau ada status baru yang juga dianggap terserap
    // (misal sk=6 "Bekerja + Kuliah"), tambahkan sk-nya di sini
    // DAN update OptionRegistry.php (statusHasPerusahaan).
    count_terserap: {
      type: `count`,
      filters: [{
        sql: `${DimStatusAlumni}.status_alumni_sk IN (1, 3)`,
      }],
      description: `Alumni terserap: bekerja (sk=1) + wirausaha (sk=3)`,
    },

    // "Cepat" = masa tunggu > 0 dan ≤ 6 bulan (standar DIKTI).
    count_masa_tunggu_cepat: {
      type: `count`,
      filters: [
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja > 0` },
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja <= 6` },
        { sql: `${DimStatusAlumni}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja atau wirausaha dalam 6 bulan (standar DIKTI)`,
    },

    // Distribusi masa tunggu — rentang ditentukan institusi.
    // Kalau rentang berubah, edit ketiga measure ini sekaligus.
    count_tunggu_0_3_bulan: {
      type: `count`,
      filters: [
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja >= 0` },
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja < 3` },
        { sql: `${DimStatusAlumni}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja dalam 0-3 bulan`,
    },
    count_tunggu_3_6_bulan: {
      type: `count`,
      filters: [
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja >= 3` },
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja <= 6` },
        { sql: `${DimStatusAlumni}.status_alumni_sk IN (1, 3)` },
      ],
      description: `Alumni dapat kerja dalam 3-6 bulan`,
    },
    count_tunggu_lebih_6_bulan: {
      type: `count`,
      filters: [
        { sql: `${FactTracerStudy}.masa_tunggu_bekerja > 6` },
        { sql: `${DimStatusAlumni}.status_alumni_sk IN (1, 3)` },
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
        { sql: `${FactTracerStudy}.kesesuaian_bidang_sk IN (1, 2, 3)` },
        { sql: `${DimStatusAlumni}.status_alumni_sk = 1` },
      ],
      description: `Alumni bekerja sesuai bidang (sk 1-3: Sangat Erat, Erat, Cukup Erat)`,
    },
    count_tidak_sesuai_bidang: {
      type: `count`,
      filters: [
        { sql: `${FactTracerStudy}.kesesuaian_bidang_sk IN (4, 5)` },
        { sql: `${DimStatusAlumni}.status_alumni_sk = 1` },
      ],
      description: `Alumni bekerja tidak sesuai bidang (sk 4-5: Kurang Erat, Tidak Sama Sekali)`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  DIMENSIONS
  //
  //  1. KOLOM DARI FACT — surrogate keys dan numerik.
  //     Untuk filter, reference, dan pre-aggregation dasar.
  //
  //  2. DARI JOIN DIMENSI — label dan atribut deskriptif.
  //     Tidak perlu denormalisasi ke fact karena join surrogate
  //     key sudah statis — pre-aggregation tetap bisa jalan.
  //     Kalau data tumbuh ke skala puluhan juta baris,
  //     baru pertimbangkan denormalisasi label ke fact.
  //

  dimensions: {

    // ── Primary key ────────────────────────────────────────────
    id_fact: {
      sql: `id_fact`,
      type: `number`,
      primary_key: true,
    },

    // ── Surrogate keys dari fact ───────────────────────────────
    // Dipakai untuk filter numerik dan referensi join.
    // Untuk display, pakai label dari dimensi via join di bawah.
    id_alumni:            { sql: `id_alumni`,            type: `number` },
    id_waktu:             { sql: `id_waktu`,             type: `number` },
    prodi_sk:             { sql: `prodi_sk`,             type: `number` },
    status_alumni_sk:     { sql: `status_alumni_sk`,     type: `number` },
    kesesuaian_bidang_sk: { sql: `kesesuaian_bidang_sk`, type: `number` },
    kesesuaian_level_sk:  { sql: `kesesuaian_level_sk`,  type: `number` },
    perusahaan_sk:        { sql: `perusahaan_sk`,        type: `number` },
    id_studi_lanjut:      { sql: `id_studi_lanjut`,      type: `number` },
    wirausaha_sk:         { sql: `wirausaha_sk`,         type: `number` },

    // ── Kolom numerik dari fact ─────────────────────────────────
    masa_tunggu_bekerja:   { sql: `masa_tunggu_bekerja`,   type: `number` },
    bulan_sebelum_lulus:   { sql: `bulan_sebelum_lulus`,   type: `number` },
    bulan_sesudah_lulus:   { sql: `bulan_sesudah_lulus`,   type: `number` },
    masa_tunggu_wirausaha: { sql: `masa_tunggu_wirausaha`, type: `number` },
    take_home_pay:         { sql: `take_home_pay`,         type: `number` },

    // ── Dari DimStatusAlumni ───────────────────────────────────
    // group by ini → breakdown per status otomatis dinamis.
    // Status baru di dim_status_alumni langsung muncul
    // tanpa ubah kode Cube.js — cukup tambah row di DW
    // dan update OptionRegistry.php di ETL.
    status_label: {
      sql: `${DimStatusAlumni}.label`,
      type: `string`,
      description: `Bekerja, Wiraswasta, Melanjutkan Pendidikan, dll`,
    },

    // ── Dari DimWaktu ──────────────────────────────────────────
    // Untuk filter periode dan grafik tren antar waktu.
    // DimWaktu tidak ada SCD — aman dipakai langsung.
    tahun_snapshot: {
      sql: `${DimWaktu}.tahun_snapshot`,
      type: `string`,
      description: `Tahun ETL jalan — untuk filter dan tren antar tahun`,
    },
    bulan_snapshot: {
      sql: `${DimWaktu}.bulan_snapshot`,
      type: `string`,
      description: `Bulan ETL jalan — untuk tren bulanan`,
    },
    minggu_snapshot: {
      sql: `${DimWaktu}.minggu_snapshot`,
      type: `string`,
      description: `Minggu ke-N dalam bulan saat ETL jalan`,
    },
    tanggal_refresh: {
      sql: `${DimWaktu}.tanggal_refresh`,
      type: `time`,
      description: `Tanggal tepat ETL jalan`,
    },

    // ── Dari DimAlumni ─────────────────────────────────────────
    // Untuk modal detail alumni dan filter per angkatan.
    nim: {
      sql: `${DimAlumni}.nim`,
      type: `string`,
      description: `Nomor Induk Mahasiswa — business key alumni`,
    },
    nama_alumni: {
      sql: `${DimAlumni}.nama`,
      type: `string`,
    },
    angkatan: {
      sql: `${DimAlumni}.angkatan`,
      type: `string`,
      description: `Tahun masuk kuliah`,
    },
    tahun_lulus: {
      sql: `${DimAlumni}.tahun_lulus`,
      type: `string`,
    },

    // ── Dari DimKesesuaianBidang ───────────────────────────────
    // group by ini → distribusi kesesuaian otomatis dinamis.
    // Kategori baru = row baru di dim_kesesuaian_bidang dengan
    // sk baru. Fact baru pakai sk baru. Langsung muncul di grafik.
    kesesuaian_bidang_label: {
      sql: `${DimKesesuaianBidang}.label`,
      type: `string`,
      description: `Sangat Erat / Erat / Cukup Erat / Kurang Erat / Tidak Sama Sekali`,
    },

    // ── Dari DimKesesuaianLevel ────────────────────────────────
    kesesuaian_level_label: {
      sql: `${DimKesesuaianLevel}.label`,
      type: `string`,
      description: `Setingkat Lebih Tinggi / Sama / Lebih Rendah / Tidak Perlu`,
    },

    // ── Dari DimPerusahaan ─────────────────────────────────────
    // Label jenis, tingkat, kota, provinsi sudah disimpan
    // sebagai kolom teks di dim_perusahaan saat ETL.
    // group by label_jenis_perusahaan → distribusi jenis instansi
    // group by label_tingkat_instansi → Lokal/Nasional/Internasional
    // group by nama_kota_kerja → sebaran kota kerja alumni
    // Semua dinamis — kategori baru langsung muncul.
    nama_perusahaan: {
      sql: `${DimPerusahaan}.company_name`,
      type: `string`,
    },

    // ── Dari DimStudiLanjut ────────────────────────────────────
    perguruan_tinggi_lanjut: {
      sql: `${DimStudiLanjut}.perguruan_tinggi`,
      type: `string`,
    },
    program_studi_lanjut: {
      sql: `${DimStudiLanjut}.program_studi`,
      type: `string`,
    },
  },
});