cube(`DimStatusAlumni`, {
  sql_table: `public.dim_status_alumni`,

  dimensions: {
    id_status_alumni: {
      sql: `id_status_alumni`,
      type: `number`,
      primary_key: true,
    },
    kode_status: {
      sql: `kode_status`,
      type: `string`,
    },
    label: {
      sql: `label`,
      type: `string`,
    },
    kategori_terserap: {
      sql: `kategori_terserap`,
      type: `string`,
    },
  },
});