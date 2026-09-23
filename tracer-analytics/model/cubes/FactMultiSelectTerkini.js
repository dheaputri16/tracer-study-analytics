// FactMultiSelectTerkini
//
// Pandangan "keadaan terkini" atas fact_multi_select: satu baris per
// (alumni, indikator), dari snapshot ETL terakhir yang memuat pasangan itu.
//
// Alasannya sama dengan FactTracerStudyTerkini -- lihat catatan lengkap di
// sana. Di tabel ini satu baris berarti "alumni memilih opsi ini", dan
// identitas opsinya adalah id_indikator_evaluasi, jadi pasangan itulah kunci
// dedupnya.
//
// FactMultiSelect yang asli tidak diubah; dashboard existing tetap
// memakainya. Cube ini dipakai OLAP Explorer.

cube(`FactMultiSelectTerkini`, {
  extends: FactMultiSelect,

  sql: `
    SELECT DISTINCT ON (id_alumni, id_indikator_evaluasi) *
    FROM public.fact_multi_select
    ORDER BY id_alumni, id_indikator_evaluasi, id_waktu DESC
  `,

  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${CUBE}.id_alumni = ${DimAlumni}.id_alumni`,
    },

    DimProdi: {
      relationship: `many_to_one`,
      sql: `${CUBE}.prodi_sk = ${DimProdi}.prodi_sk`,
    },

    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${CUBE}.id_waktu = ${DimWaktu}.id_waktu`,
    },

    DimIndikatorEvaluasi: {
      relationship: `many_to_one`,
      sql: `${CUBE}.id_indikator_evaluasi = ${DimIndikatorEvaluasi}.id_indikator_evaluasi`,
    },
  },

  pre_aggregations: {},
});
