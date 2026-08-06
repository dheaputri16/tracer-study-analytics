cube(`DimWirausaha`, {
  // Tidak difilter ke flag_wirausaha = true di sini: fact_tracer_study
  // sudah menunjuk ke wirausaha_sk versi yang valid pada tanggal snapshot
  // masing-masing baris (SCD Type 2). Memfilter ke versi "current" saja
  // di level cube akan mematahkan join untuk fact historis yang menunjuk
  // ke versi yang sudah ditutup — persis kasus yang membuat pie Distribusi
  // Posisi Wirausaha tampil kosong meski datanya ada. Filter ke versi
  // aktif saja tetap bisa dilakukan lewat dimensi flag_wirausaha bila
  // memang dibutuhkan oleh query tertentu.
  sql: `SELECT * FROM public.dim_wirausaha`,

  dimensions: {
    // ── Surrogate Key ─────────────────────────────────────────
    wirausaha_sk: {
      sql: `wirausaha_sk`,
      type: `number`,
      primary_key: true,
    },
    // ── Natural Key ───────────────────────────────────────────
    id_wirausaha: {
      sql: `id_wirausaha`,
      type: `string`,
    },
    nama_provinsi: {
      sql: `nama_provinsi`,
      type: `string`,
    },
    nama_kota: {
      sql: `nama_kota`,
      type: `string`,
    },
    jabatan: {
      sql: `jabatan`,
      type: `string`,
    },
    label_tingkat_instansi: {
      sql: `label_tingkat_instansi`,
      type: `string`,
    },
    valid_from: {
      sql: `valid_from`,
      type: `time`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
    },
    flag_wirausaha: {
      sql: `flag_wirausaha`,
      type: `boolean`,
    },
  },
});