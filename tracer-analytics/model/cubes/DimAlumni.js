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
    // Isian "Lainnya, tuliskan" (f1202); labelnya sendiri tetap "Lainnya".
    // Hanya untuk drill-through, bukan untuk dikelompokkan.
    sumber_biaya_lainnya: {
      sql: `sumber_biaya_lainnya`,
      type: `string`,
    },
  },
});