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