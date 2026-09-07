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
    jawaban_lainnya: {
      sql: `jawaban_lainnya`,
      type: `string`,
      // Teks bebas per-alumni untuk anggota grup "Lainnya" (mis. f1613 ->
      // f1614) -- NULL untuk baris yang bukan opsi "Lainnya", atau yang
      // companion-nya tidak diisi. Sengaja TIDAK dipakai
      // dim_indikator_evaluasi.label_pertanyaan sebagai sink karena dim itu
      // Type1/global (satu label dipakai bareng semua alumni yang pernah
      // pilih opsi sama) -- lihat migration
      // 2026_09_05_000001_add_jawaban_lainnya_to_fact_multi_select.
    },
  },

  pre_aggregations: {
    per_indikator: {
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