// FactRangeEvaluasiTerkini
//
// Pandangan "keadaan terkini" atas fact_range_evaluasi: satu baris per
// (alumni, indikator), dari snapshot ETL terakhir yang memuat pasangan itu.
//
// Alasannya sama dengan FactTracerStudyTerkini -- lihat catatan lengkap di
// sana. Dampaknya di sini lebih besar karena grainnya per indikator: setiap
// snapshot yang berulang menggandakan seluruh baris indikator milik alumni
// itu. Dibiarkan apa adanya, avg_skor tertimbang ke alumni yang kebetulan
// ikut lebih banyak snapshot.
//
// FactRangeEvaluasi yang asli tidak diubah; dashboard existing tetap
// memakainya. Cube ini dipakai OLAP Explorer.

cube(`FactRangeEvaluasiTerkini`, {
  extends: FactRangeEvaluasi,

  sql: `
    SELECT DISTINCT ON (id_alumni, id_indikator_evaluasi) *
    FROM public.fact_range_evaluasi
    ORDER BY id_alumni, id_indikator_evaluasi, id_waktu DESC
  `,

  // Ditulis ulang dengan ${CUBE}: join induk menyebut ${FactRangeEvaluasi}
  // secara eksplisit dan kalau diwariskan akan menunjuk balik ke tabel yang
  // belum ter-dedup.
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
