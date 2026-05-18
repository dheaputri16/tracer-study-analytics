cube(`DimAlumni`, {
  sql_table: `public.dim_alumni`,

  dimensions: {
    id_alumni: {
      sql: `id_alumni`,
      type: `number`,
      primary_key: true,
    },
    nim: {
      sql: `nim`,
      type: `string`,
    },
    nama: {
      sql: `nama`,
      type: `string`,
    },
    email: {
      sql: `email`,
      type: `string`,
    },
    no_hp: {
      sql: `no_hp`,
      type: `string`,
    },
    npwp: {
      sql: `npwp`,
      type: `string`,
    },
    tahun_lulus: {
      sql: `tahun_lulus`,
      type: `number`,
    },
    sumber_biaya_dipolban: {
      sql: `sumber_biaya_dipolban`,
      type: `string`,
    },
  },
});