cube(`DimProdi`, {
  sql_table: `public.dim_prodi`,

  dimensions: {
    id_prodi: {
      sql: `id_prodi`,
      type: `number`,
      primary_key: true,
    },
    kode_prodi: {
      sql: `kode_prodi`,
      type: `string`,
    },
    nama_prodi: {
      sql: `nama_prodi`,
      type: `string`,
    },
    jurusan: {
      sql: `jurusan`,
      type: `string`,
    },
    valid_from: {
      sql: `valid_from`,
      type: `time`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
    },
    flag_prodi: {
      sql: `flag_prodi`,
      type: `boolean`,
    },
  },
});