cube(`DimWirausaha`, {
  sql: `SELECT * FROM public.dim_wirausaha WHERE flag_wirausaha = true`,

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
      type: `number`,
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