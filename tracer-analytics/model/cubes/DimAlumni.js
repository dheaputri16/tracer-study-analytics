cube(`DimAlumni`, {
  sql_table: `public.dim_alumni`,

  dimensions: {
    id_alumni: {
      sql: `id_alumni`,
      type: `number`,
      primary_key: true,
    },
    nama: {
      sql: `nama`,
      type: `string`,
    },
    nim: {
      sql: `nim`,
      type: `string`,
    },
    // ─────────────────────────────────────────────────────────
    tahun_lulus: {
      sql: `tahun_lulus`,
      type: `string`,
    },
    label_sumber_biaya_dipolban: {
      sql: `label_sumber_biaya_dipolban`,
      type: `string`,
    },
  },
});