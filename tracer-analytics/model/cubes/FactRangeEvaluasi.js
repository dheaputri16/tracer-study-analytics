cube(`FactRangeEvaluasi`, {
  sql_table: `public.fact_range_evaluasi`,

  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.id_alumni = ${DimAlumni}.id_alumni`,
    },
    DimProdi: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.prodi_sk = ${DimProdi}.prodi_sk`,
    },
    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.id_waktu = ${DimWaktu}.id_waktu`,
    },
    DimIndikatorEvaluasi: {
      relationship: `many_to_one`,
      sql: `${FactRangeEvaluasi}.id_indikator_evaluasi = ${DimIndikatorEvaluasi}.id_indikator_evaluasi`,
    },
  },

  measures: {
    count: {
      type: `count`,
      description: `Jumlah baris penilaian`,
    },
    avg_skor: {
      sql: `skor`,
      type: `avg`,
      description: `Rata-rata skor indikator evaluasi (1–5)`,
    },
    min_skor: {
      sql: `skor`,
      type: `min`,
    },
    max_skor: {
      sql: `skor`,
      type: `max`,
    },
    sum_skor: {
      sql: `skor`,
      type: `sum`,
    },
  },

  dimensions: {
    id_fact: {
      sql: `id_fact`,
      type: `number`,
      primary_key: true,
    },
    prodi_sk: {
      sql: `prodi_sk`,
      type: `number`,
    },
    id_alumni: {
      sql: `id_alumni`,
      type: `number`,
    },
    id_waktu: {
      sql: `id_waktu`,
      type: `number`,
    },
    id_indikator_evaluasi: {
      sql: `id_indikator_evaluasi`,
      type: `number`,
    },
    skor: {
      sql: `skor`,
      type: `number`,
    },
  },
});