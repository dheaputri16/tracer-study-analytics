cube(`DimKesesuaianLevel`, {
  sql_table: `public.dim_kesesuaian_level`,

  dimensions: {
    // ── Surrogate Key ─────────────────────────────────────────
    keseuaian_level_sk: {
      sql: `keseuaian_level_sk`,
      type: `number`,
      primary_key: true,    
    },
    // ── Natural Key ───────────────────────────────────────────
    id_kesesuaian_level: {
      sql: `id_kesesuaian_level`,
      type: `number`,
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