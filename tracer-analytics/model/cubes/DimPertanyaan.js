cube(`DimPertanyaan`, {
  sql_table: `public.dim_pertanyaan`,

  dimensions: {
    id_pertanyaan: {
      sql: `id_pertanyaan`,
      type: `number`,
      primary_key: true,
    },
    label_pertanyaan: {
      sql: `label_pertanyaan`,
      type: `string`,
    },
    kategori_pertanyaan: {
      sql: `kategori_pertanyaan`,
      type: `string`,
    },
    jenis_skala: {
      sql: `jenis_skala`,
      type: `string`,
    },
    kode_field: {
      sql: `kode_field`,
      type: `string`,
    },
  },
});