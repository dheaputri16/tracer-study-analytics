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
    // Baris id 0 = alumni yang tidak studi lanjut ("Tidak Ada Data").
    // Dimensi ini membuat pembedanya bisa disaring tanpa SQL.
    status_studi: {
      sql: `CASE WHEN ${CUBE}.id_studi_lanjut = 0 THEN 'Tidak studi lanjut' ELSE 'Studi lanjut' END`,
      type: `string`,
    },
  },
});