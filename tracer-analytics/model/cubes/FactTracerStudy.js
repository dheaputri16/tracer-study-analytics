cube(`FactTracerStudy`, {
  sql_table: `public.fact_tracer_study`,

  // ======================
  // JOINS ke semua dimensi
  // ======================
  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_alumni = ${DimAlumni}.id_alumni`,
    },
    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_waktu = ${DimWaktu}.id_waktu`,
    },
    DimProdi: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_prodi = ${DimProdi}.id_prodi`,
    },
    DimStatusAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_status_alumni = ${DimStatusAlumni}.id_status_alumni`,
    },
    DimKesesuaian: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_kesesuaian = ${DimKesesuaian}.id_kesesuaian`,
    },
    DimPerusahaan: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_perusahaan = ${DimPerusahaan}.id_perusahaan`,
    },
    DimStudiLanjut: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_studi_lanjut = ${DimStudiLanjut}.id_studi_lanjut`,
    },
  },

  // =====================
  // MEASURES (angka/agregasi)
  // =====================
  // measures: {
  //   // Jumlah total alumni yang mengisi tracer study
  //   count_alumni: {
  //     type: `count`,
  //     description: `Total alumni yang mengisi tracer study`,
  //   },

  //   // Rata-rata masa tunggu kerja (bulan)
  //   avg_masa_tunggu: {
  //     sql: `masa_tunggu_bulan`,
  //     type: `avg`,
  //     description: `Rata-rata masa tunggu mendapat pekerjaan (bulan)`,
  //   },

  //   // Masa tunggu minimum
  //   min_masa_tunggu: {
  //     sql: `masa_tunggu_bulan`,
  //     type: `min`,
  //   },

  //   // Masa tunggu maksimum
  //   max_masa_tunggu: {
  //     sql: `masa_tunggu_bulan`,
  //     type: `max`,
  //   },

  //   // Jumlah alumni yang sudah bekerja
  //   count_bekerja: {
  //     type: `count`,
  //     filters: [
  //       {
  //         sql: `${DimStatusAlumni}.kategori_terserap = 'Bekerja'`,
  //       },
  //     ],
  //   },

  //   // Jumlah alumni yang lanjut studi
  //   count_studi_lanjut: {
  //     type: `count`,
  //     filters: [
  //       {
  //         sql: `${DimStatusAlumni}.kategori_terserap = 'Studi Lanjut'`,
  //       },
  //     ],
  //   },

  //   // Persentase alumni terserap (bekerja + studi lanjut)
  //   pct_terserap: {
  //     sql: `
  //       ROUND(
  //         100.0 * COUNT(CASE WHEN ${DimStatusAlumni}.kategori_terserap 
  //           IN ('Bekerja', 'Studi Lanjut') THEN 1 END) 
  //         / NULLIF(COUNT(*), 0), 2
  //       )
  //     `,
  //     type: `number`,
  //     format: `percent`,
  //     description: `Persentase alumni terserap kerja/studi`,
  //   },

  //   // Rata-rata bulan sebelum lulus (kapan mulai cari kerja)
  //   avg_bulan_sebelum_lulus: {
  //     sql: `bulan_sebelum_lulus`,
  //     type: `avg`,
  //   },

  //   // Rata-rata bulan sesudah lulus mendapat kerja
  //   avg_bulan_sesudah_lulus: {
  //     sql: `bulan_sesudah_lulus`,
  //     type: `avg`,
  //   },
  // },

  // FactTracerStudy.js — bagian measures yang DIPERBAIKI
  measures: {
    count_alumni: {
      type: `count`,
      description: `Total alumni yang mengisi tracer study`,
    },

    avg_masa_tunggu: {
      sql: `masa_tunggu_bulan`,
      type: `avg`,
    },

    min_masa_tunggu: {
      sql: `masa_tunggu_bulan`,
      type: `min`,
    },

    max_masa_tunggu: {
      sql: `masa_tunggu_bulan`,
      type: `max`,
    },

    avg_bulan_sebelum_lulus: {
      sql: `bulan_sebelum_lulus`,
      type: `avg`,
    },

    avg_bulan_sesudah_lulus: {
      sql: `bulan_sesudah_lulus`,
      type: `avg`,
    },
  },

  // =====================
  // DIMENSIONS (atribut dari fact sendiri)
  // =====================
  dimensions: {
    id_fact: {
      sql: `id_fact`,
      type: `number`,
      primary_key: true,
    },
    masa_tunggu_bulan: {
      sql: `masa_tunggu_bulan`,
      type: `number`,
    },
    bulan_sebelum_lulus: {
      sql: `bulan_sebelum_lulus`,
      type: `number`,
    },
    bulan_sesudah_lulus: {
      sql: `bulan_sesudah_lulus`,
      type: `number`,
    },
  },
});