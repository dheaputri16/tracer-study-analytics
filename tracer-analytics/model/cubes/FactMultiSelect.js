cube(`FactMultiSelect`, {
  sql_table: `public.fact_multi_select`,

  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.id_alumni = ${DimAlumni}.id_alumni`,
    },
    DimPertanyaan: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.id_pertanyaan = ${DimPertanyaan}.id_pertanyaan`,
    },
    DimOpsi: {
      relationship: `many_to_one`,
      sql: `${FactMultiSelect}.id_opsi = ${DimOpsi}.id_opsi`,
    },
  },

  measures: {
    // Berapa kali opsi ini dipilih alumni
    count_pilihan: {
      type: `count`,
      description: `Jumlah alumni memilih opsi ini`,
    },

    // Persentase pemilih opsi tertentu dari total responden
    pct_pilihan: {
      sql: `
        ROUND(
          100.0 * COUNT(*) / NULLIF(
            (SELECT COUNT(DISTINCT id_alumni) FROM public.fact_multi_select),
            0
          ), 2
        )
      `,
      type: `number`,
      format: `percent`,
    },
  },

  dimensions: {
    id_multi_select: {
      sql: `id_multi_select`,
      type: `number`,
      primary_key: true,
    },
  },
});