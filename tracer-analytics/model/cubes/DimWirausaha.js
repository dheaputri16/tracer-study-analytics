cube(`DimWirausaha`, {
  sql_table: `public.dim_wirausaha`,

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
    provinsi: {
      sql: `provinsi`,
      type: `number`,
    },
    kota_kabupaten: {
      sql: `kota_kabupaten`,
      type: `number`,
    },
    kode_jabatan: {
      sql: `kode_jabatan`,
      type: `number`,
    },
    jabatan: {
      sql: `jabatan`,
      type: `string`,
    },
    tingkat_instansi: {
      sql: `tingkat_instansi`,
      type: `number`,
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