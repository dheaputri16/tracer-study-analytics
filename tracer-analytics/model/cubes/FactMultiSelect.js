cube(`FactMultiSelect`, {
  sql_table: `public.fact_multi_select`,

  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.id_alumni = ${DimAlumni}.id_alumni`,
    },
    DimProdi: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.prodi_sk = ${DimProdi}.prodi_sk`,
    },
    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.id_waktu = ${DimWaktu}.id_waktu`,
    },
    DimIndikatorEvaluasi: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.id_indikator_evaluasi = ${DimIndikatorEvaluasi}.id_indikator_evaluasi`,
    },
  },

  measures: {
    count_pilihan: {
      type: `count`,
      description: `Jumlah pemilihan opsi oleh alumni`,
    },
    count_alumni_unik: {
      sql: `id_alumni`,
      type: `count_distinct`,
      description: `Jumlah alumni unik yang memilih opsi ini`,
    },
  },

  dimensions: {
    id_multi_select: {
      sql: `id_multi_select`,
      type: `number`,
      primary_key: true,
    },
    id_alumni: {
      sql: `id_alumni`,
      type: `number`,
    },
    prodi_sk: {
      sql: `prodi_sk`,
      type: `number`,
    },
    id_waktu: {
      sql: `id_waktu`,
      type: `number`,
    },
    id_indikator_evaluasi: {
      sql: `id_indikator_evaluasi`,
      type: `number`,
      // id 22–34 = opsi AlasanKerjaTdkSesuai (f1601–f1613)
    },
  },

  pre_aggregations: {
    multi_select_per_indikator: {
      type: `rollup`,
      measures: [
        FactMultiSelect.count_pilihan,
        FactMultiSelect.count_alumni_unik,
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