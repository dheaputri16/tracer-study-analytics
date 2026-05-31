cube(`DimPerusahaan`, {
  sql_table: `public.dim_perusahaan`,

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
      type: `number`,
    },
    company_name: {
      sql: `company_name`,
      type: `string`,
    },

    // Integer codes — untuk filter numerik jika dibutuhkan
    jenis_perusahaan: {
      sql: `jenis_perusahaan`,
      type: `number`,
    },
    tingkat_instansi: {
      sql: `tingkat_instansi`,
      type: `number`,
    },
    kota: {
      sql: `kota`,
      type: `number`,
    },
    provinsi: {
      sql: `provinsi`,
      type: `number`,
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