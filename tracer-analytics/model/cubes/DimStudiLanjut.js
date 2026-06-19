cube(`DimStudiLanjut`, {
  sql_table: `public.dim_studi_lanjut`,

  dimensions: {
    id_studi_lanjut: {
      sql: `id_studi_lanjut`,
      type: `number`,
      primary_key: true,
    },
    perguruan_tinggi: {
      sql: `perguruan_tinggi`,
      type: `string`,
    },
    program_studi: {
      sql: `program_studi`,
      type: `string`,
    },
    sumber_biaya: {
      sql: `sumber_biaya`,
      type: `string`,
    },
  },
});