cube(`FactRangeEvaluasi`, {
  sql_table: `public.fact_range_evaluasi`,

  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.id_alumni = ${DimAlumni}.id_alumni`,
    },
    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.id_waktu = ${DimWaktu}.id_waktu`,
    },
    DimPertanyaan: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.id_penilaian = ${DimPertanyaan}.id_pertanyaan`,
    },
  },

  measures: {
    count: {
      type: `count`,
    },

    // Rata-rata skor untuk semua indikator
    avg_skor: {
      sql: `skor`,
      type: `avg`,
      description: `Rata-rata skor evaluasi`,
    },

    // Skor total
    sum_skor: {
      sql: `skor`,
      type: `sum`,
    },

    // Skor tertinggi
    max_skor: {
      sql: `skor`,
      type: `max`,
    },
  },

  dimensions: {
    id_multi_select: {
      // Note: sesuaikan nama PK dengan ERD-mu
      sql: `id_penilaian`,
      type: `number`,
      primary_key: true,
    },
    skor: {
      sql: `skor`,
      type: `number`,
    },
  },
});