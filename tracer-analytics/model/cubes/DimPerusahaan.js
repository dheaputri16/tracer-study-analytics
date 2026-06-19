cube(`DimPerusahaan`, {
  sql: `SELECT * FROM public.dim_perusahaan WHERE flag_perusahaan = true`,

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