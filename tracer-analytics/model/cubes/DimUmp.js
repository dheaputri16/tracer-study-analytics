cube(`DimUmp`, {
  sql_table: `public.dim_ump`,

  dimensions: {
    ump_sk: {
      sql: `ump_sk`,
      type: `number`,
      primary_key: true,
    },
    tahun: {
      sql: `tahun`,
      type: `string`,
    },
    nama_provinsi: {
      sql: `nama_provinsi`,
      type: `string`,
    },
    nilai_ump: {
      sql: `nilai_ump`,
      type: `number`,
    },
  },
});