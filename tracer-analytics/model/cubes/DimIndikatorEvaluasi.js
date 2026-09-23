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
    // Nama kategori yang bisa dibaca pengguna non-IT di halaman Insight.
    kategori_label: {
      sql: `CASE ${CUBE}.kategori_pertanyaan
              WHEN 'Kompetensi_A' THEN 'Kompetensi dikuasai saat lulus'
              WHEN 'Kompetensi_B' THEN 'Kompetensi dibutuhkan di pekerjaan'
              WHEN 'MetodePembelajaran' THEN 'Metode pembelajaran'
              WHEN 'AlasanKerjaTdkSesuai' THEN 'Alasan kerja tidak sesuai bidang'
              ELSE ${CUBE}.kategori_pertanyaan
            END`,
      type: `string`,
    },
    jenis_skala: {
      sql: `jenis_skala`,
      type: `string`,
      // 'range' atau 'multi_select'
    },
    grup_gap: {
      sql: `grup_gap`,
      type: `string`,
    },
  },
});