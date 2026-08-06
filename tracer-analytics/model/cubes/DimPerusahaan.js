cube(`DimPerusahaan`, {
  // Tidak difilter ke flag_perusahaan = true di sini: fact_tracer_study
  // sudah menunjuk ke wirausaha_sk versi yang valid pada tanggal snapshot
  // masing-masing baris (SCD Type 2). Memfilter ke versi "current" saja
  // di level cube akan mematahkan join untuk fact historis yang menunjuk
  // ke versi yang sudah ditutup — persis kasus yang membuat pie/tabel
  // Sebaran Level Perusahaan tampil kosong meski datanya ada. Filter ke
  // versi aktif saja tetap bisa dilakukan lewat dimensi flag_perusahaan
  // bila memang dibutuhkan oleh query tertentu.
  sql: `SELECT * FROM public.dim_perusahaan`,

  dimensions: {
    // ── Surrogate Key ─────────────────────────────────────────
    perusahaan_sk: {
      sql: `perusahaan_sk`,
      type: `number`,
      primary_key: true,
    },
    // ── Natural Key ───────────────────────────────────────────
    id_perusahaan: {
      sql: `id_perusahaan`,
      type: `string`,
    },
    company_name: {
      sql: `company_name`,
      type: `string`,
    },

    // Label — ini yang dipakai untuk tampilan di dashboard
    label_jenis_perusahaan: {
      sql: `label_jenis_perusahaan`,
      type: `string`,
      description: `Jenis perusahaan: Swasta, BUMN, Pemerintah, dll`,
    },
    label_tingkat_instansi: {
      sql: `label_tingkat_instansi`,
      type: `string`,
      description: `Skala: Lokal, Nasional, Internasional`,
    },
    nama_kota: {
      sql: `nama_kota`,
      type: `string`,
    },
    nama_provinsi: {
      sql: `nama_provinsi`,
      type: `string`,
    },

    // SCD fields
    valid_from: {
      sql: `valid_from`,
      type: `time`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
    },
    flag_perusahaan: {
      sql: `flag_perusahaan`,
      type: `boolean`,
    },
  },
});