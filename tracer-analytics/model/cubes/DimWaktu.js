cube(`DimWaktu`, {
  sql_table: `public.dim_waktu`,

  dimensions: {
    id_waktu: {
      sql: `id_waktu`,
      type: `number`,
      primary_key: true,
    },
    minggu_snapshot: {
      sql: `minggu_snapshot`,
      type: `string`,
    },
    bulan_snapshot: {
      sql: `bulan_snapshot`,
      type: `string`,
    },
    tahun_snapshot: {
      sql: `tahun_snapshot`,
      type: `string`,
    },
    tanggal_refresh: {
      sql: `tanggal_refresh`,
      type: `time`,
    },
  },
});