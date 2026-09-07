cube(`DimWaktu`, {
  sql_table: `public.dim_waktu`,

  dimensions: {
    id_waktu: {
      sql: `id_waktu`,
      type: `number`,
      primary_key: true,
      // WAJIB public: true -- primaryKey disembunyikan dari API oleh Cube.js
      // secara default. FilterMetaRepository::getSnapshot() (backend) query
      // DimWaktu.id_waktu langsung untuk populate dropdown filter snapshot
      // global; tanpa ini, query itu 500 "You requested hidden member" dan
      // SELURUH dashboard kehilangan filter snapshot.
      public: true,
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