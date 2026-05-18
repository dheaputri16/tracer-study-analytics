cube(`DimOpsi`, {
  sql_table: `public.dim_opsi`,

  dimensions: {
    id_opsi: {
      sql: `id_opsi`,
      type: `number`,
      primary_key: true,
    },
    label_opsi: {
      sql: `label_opsi`,
      type: `string`,
    },
    kode_field: {
      sql: `kode_field`,
      type: `string`,
    },
    kategori_pertanyaan: {
      sql: `kategori_pertanyaan`,
      type: `string`,
    },
  },
});