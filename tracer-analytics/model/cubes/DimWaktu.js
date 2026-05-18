cube(`DimWaktu`, {
  sql_table: `public.dim_waktu`,

  dimensions: {
    id_waktu: {
      sql: `id_waktu`,
      type: `number`,
      primary_key: true,
    },
    periode_survei: {
      sql: `periode_survei`,
      type: `string`,
    },
    tahun_lulus: {
      sql: `tahun_lulus`,
      type: `number`,
    },
  },
});