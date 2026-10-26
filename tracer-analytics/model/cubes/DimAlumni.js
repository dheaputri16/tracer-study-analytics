cube(`DimAlumni`, {
  sql_table: `public.dim_alumni`,

  dimensions: {
    id_alumni: {
      sql: `id_alumni`,
      type: `number`,
      primary_key: true,
      // Cube v1 default-nya primary_key -> public:false, sehingga tidak bisa
      // diminta/di-`order`. ExplorerRepository memakainya sebagai tiebreaker
      // sort (DimAlumni.nama, lalu id_alumni), jadi perlu dibuka.
      public: true,
    },
    nama: {
      sql: `nama`,
      type: `string`,
    },
    nim: {
      sql: `nim`,
      type: `string`,
    },
    // ─────────────────────────────────────────────────────────
    tahun_lulus: {
      sql: `tahun_lulus`,
      type: `string`,
    },
    label_sumber_biaya_dipolban: {
      sql: `label_sumber_biaya_dipolban`,
      type: `string`,
    },
    // Isian "Lainnya, tuliskan" (f1202); labelnya sendiri tetap "Lainnya".
    // Hanya untuk drill-through, bukan untuk dikelompokkan.
    sumber_biaya_lainnya: {
      sql: `sumber_biaya_lainnya`,
      type: `string`,
    },
  },
});