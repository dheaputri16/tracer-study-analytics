cube(`DimKesesuaianLevel`, {
  sql_table: `public.dim_kesesuaian_level`,

  dimensions: {
    // ── Surrogate Key ─────────────────────────────────────────
    kesesuaian_level_sk: {
      sql: `kesesuaian_level_sk`,
      type: `number`,
      primary_key: true,    
    },
    // ── Natural Key ───────────────────────────────────────────
    id_kesesuaian_level: {
      sql: `id_kesesuaian_level`,
      type: `string`,
    },
    label: {
      sql: `label`,
      type: `string`,
    },
  },
});