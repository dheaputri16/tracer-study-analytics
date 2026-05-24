cube(`DimKesesuaianLevel`, {
  sql_table: `public.dim_kesesuaian_level`,

  dimensions: {
    id_kesesuaian_level: {
      sql: `id_kesesuaian_level`,
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
    flag_kesesuaian_level: {
      sql: `flag_kesesuaian_level`,
      type: `boolean`,
    },
  },
});