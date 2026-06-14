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
      sql: `id_range_evaluasi`,
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

  pre_aggregations: {
    per_indikator: {
      type: `rollup`,
      measures: [
        FactRangeEvaluasi.avg_skor,
        FactRangeEvaluasi.min_skor,
        FactRangeEvaluasi.max_skor,
        FactRangeEvaluasi.count,
      ],
      dimensions: [
        DimIndikatorEvaluasi.kode_field,
        DimIndikatorEvaluasi.label_pertanyaan,
        DimIndikatorEvaluasi.kategori_pertanyaan,
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
  },
});