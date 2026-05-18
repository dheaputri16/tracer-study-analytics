cube(`DimKesesuaian`, {
  sql_table: `public.dim_kesesuaian`,

  dimensions: {
    id_kesesuaian: {
      sql: `id_kesesuaian`,
      type: `number`,
      primary_key: true,
    },
    tingkat_kesesuaian: {
      sql: `tingkat_kesesuaian`,
      type: `string`,
    },
    kesesuaian_bidang: {
      sql: `kesesuaian_bidang`,
      type: `string`,
    },
    tingkat_pendidikan: {
      sql: `tingkat_pendidikan`,
      type: `string`,
    },
  },
});