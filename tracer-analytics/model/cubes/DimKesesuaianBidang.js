cube(`DimKesesuaianBidang`, {
  sql_table: `public.dim_kesesuaian_bidang`,

  dimensions: {
    kesesuaian_bidang_sk: {
      sql: `kesesuaian_bidang_sk`,
      type: `number`,
      primary_key: true,
    },
    id_kesesuaian_level: {
      sql: `id_kesesuaian_level`,
      type: `number`,
    },
    label: {
      sql: `label`,
      type: `string`,
      // Sangat Erat / Erat / Cukup Erat / Kurang Erat / Tidak Sama Sekali
    },
  },
});