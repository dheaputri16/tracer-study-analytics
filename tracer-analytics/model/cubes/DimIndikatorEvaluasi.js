cube(`DimIndikatorEvaluasi`, {
  sql_table: `public.dim_indikator_evaluasi`,

  dimensions: {
    id_indikator_evaluasi: {
      sql: `id_indikator_evaluasi`,
      type: `number`,
      primary_key: true,
    },
    kode_field: {
      sql: `kode_field`,
      type: `string`,
    },
    label_pertanyaan: {
      sql: `label_pertanyaan`,
      type: `string`,
    },
    kategori_pertanyaan: {
      sql: `kategori_pertanyaan`,
      type: `string`,
      // 'Kompetensi_A', 'Kompetensi_B', 'MetodePembelajaran', 'AlasanKerjaTdkSesuai'
    },
    jenis_skala: {
      sql: `jenis_skala`,
      type: `string`,
      // 'range' atau 'multi_select'
    },
  },
});