cube(`DimPerusahaan`, {
  sql_table: `public.dim_perusahaan`,

  dimensions: {
    id_perusahaan: {
      sql: `id_perusahaan`,
      type: `number`,
      primary_key: true,
    },
    nama_perusahaan: {
      sql: `nama_perusahaan`,
      type: `string`,
    },
    jenis_perusahaan: {
      sql: `jenis_perusahaan`,
      type: `string`,
    },
    tingkat_instansi: {
      sql: `tingkat_instansi`,
      type: `string`,
    },
    kota: {
      sql: `kota`,
      type: `string`,
    },
    provinsi: {
      sql: `provinsi`,
      type: `string`,
    },
    jabatan: {
      sql: `jabatan`,
      type: `string`,
    },
  },
});