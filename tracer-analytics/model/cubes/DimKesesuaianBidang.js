cube(`DimKesesuaianBidang`, {
  sql_table: `public.dim_kesesuaian_bidang`,

  dimensions: {
    id_kesesuaian_bidang: {
      sql: `id_kesesuaian_bidang`,
      type: `number`,
      primary_key: true,
    },
    label: {
      sql: `label`,
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
    flag_kesesuaian_bidang: {
      sql: `flag_kesesuaian_bidang`,
      type: `boolean`,
    },
  },
});