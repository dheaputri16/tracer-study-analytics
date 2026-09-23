// FactTracerStudyTerkini
//
// Pandangan "keadaan terkini" atas fact_tracer_study: SATU baris per alumni,
// yaitu baris dari snapshot ETL paling akhir yang memuat alumni itu.
//
// KENAPA ADA:
// fact_tracer_study menyimpan baris BARU setiap kali ETL berjalan
// (AlumniFactBuilderService: "selalu baris baru per snapshot"), dan ETL-nya
// inkremental -- tiap run hanya memuat alumni yang responsnya baru masuk sejak
// run sebelumnya. Akibatnya tidak ada satu pun id_waktu yang memuat seluruh
// alumni, sementara menggabung seluruh snapshot menghitung sebagian alumni
// berkali-kali: snapshot-snapshot itu saling tumpang tindih sebagian.
//
// Dua jalan pintas yang TIDAK dipakai, dan alasannya:
//   - Tanpa penyaring sama sekali -> count_alumni menggelembung, karena alumni
//     yang ikut beberapa run terhitung sekali per run.
//   - Disaring ke snapshot terakhir saja -> alumni yang tidak ikut run
//     terakhir hilang dari hasil.
// Keduanya menghasilkan angka yang salah tanpa galat apa pun, jadi dedup
// dilakukan di SQL: DISTINCT ON (id_alumni) dengan urutan id_waktu menurun.
//
// FactTracerStudy yang asli SENGAJA TIDAK DIUBAH. Seluruh dashboard existing
// (17 repository analitik) masih memakainya beserta pre_aggregations-nya;
// cube ini tambahan, dipakai OLAP Explorer.
//
// `extends` dipakai supaya 24 measure dan seluruh dimensi tidak perlu disalin
// -- salinan akan menyimpang diam-diam begitu measure di induknya berubah.
// Yang di-override cuma tiga: sumber SQL, joins, dan pre_aggregations.

cube(`FactTracerStudyTerkini`, {
  extends: FactTracerStudy,

  // DISTINCT ON butuh ORDER BY yang diawali kolom yang sama. id_waktu adalah
  // primary key serial dim_waktu, jadi nilai terbesar selalu run terakhir yang
  // memuat alumni itu.
  sql: `
    SELECT DISTINCT ON (id_alumni) *
    FROM public.fact_tracer_study
    ORDER BY id_alumni, id_waktu DESC
  `,

  // Joins di induk menyebut ${FactTracerStudy} secara eksplisit; kalau
  // diwariskan apa adanya, join-nya menunjuk balik ke tabel induk dan dedup
  // di atas jadi sia-sia. Ditulis ulang dengan ${CUBE} supaya selalu menunjuk
  // cube ini sendiri.
  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${CUBE}.id_alumni = ${DimAlumni}.id_alumni`,
    },

    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${CUBE}.id_waktu = ${DimWaktu}.id_waktu`,
    },

    DimProdi: {
      relationship: `many_to_one`,
      sql: `${CUBE}.prodi_sk = ${DimProdi}.prodi_sk`,
    },

    DimStatusAlumni: {
      relationship: `many_to_one`,
      sql: `${CUBE}.status_alumni_sk = ${DimStatusAlumni}.status_alumni_sk`,
    },

    DimKesesuaianBidang: {
      relationship: `many_to_one`,
      sql: `${CUBE}.kesesuaian_bidang_sk = ${DimKesesuaianBidang}.kesesuaian_bidang_sk`,
    },

    DimKesesuaianLevel: {
      relationship: `many_to_one`,
      sql: `${CUBE}.kesesuaian_level_sk = ${DimKesesuaianLevel}.kesesuaian_level_sk`,
    },

    DimPerusahaan: {
      relationship: `many_to_one`,
      sql: `${CUBE}.perusahaan_sk = ${DimPerusahaan}.perusahaan_sk`,
    },

    DimStudiLanjut: {
      relationship: `many_to_one`,
      sql: `${CUBE}.id_studi_lanjut = ${DimStudiLanjut}.id_studi_lanjut`,
    },

    DimWirausaha: {
      relationship: `many_to_one`,
      sql: `${CUBE}.wirausaha_sk = ${DimWirausaha}.wirausaha_sk`,
    },

    DimUmp: {
      relationship: `many_to_one`,
      sql: `${CUBE}.ump_sk = ${DimUmp}.ump_sk`,
    },
  },

  // Rollup milik induk dirancang untuk kombinasi dimensi dashboard yang sudah
  // ada dan dibangun di atas tabel induk yang belum ter-dedup. Mewarisinya di
  // sini akan menjawab query explorer dari data yang justru ingin dihindari.
  // Explorer menyusun kombinasi bebas yang memang jarang kena rollup, jadi
  // dikosongkan.
  // Dimensi tambahan yang tidak ada di induk: ukuran numerik yang dikelompokkan
  // jadi rentang, supaya bisa dipakai MEMECAH angka lain — misalnya rata-rata
  // pendapatan per rentang masa tunggu kerja. Sebagai measure, masa tunggu cuma
  // bisa dirata-ratakan; sebagai dimensi, ia jadi sumbu.
  //
  // BATAS RENTANG BERSIFAT SETENGAH TERBUKA: [0,3), [3,6), [6,9), dan
  // seterusnya. Ini SENGAJA BEDA dari measure count_tunggu_* di cube induk,
  // yang memakai `>= 3 AND <= 6` sehingga alumni tepat di bulan ke-6 terhitung
  // di dua ember sekaligus. Di sini tiap alumni jatuh ke tepat satu rentang,
  // jadi jumlah seluruh rentang sama dengan jumlah alumni.
  //
  // LABELNYA DIBERI NOL DI DEPAN ("03–06", bukan "3–6") supaya urut menaik
  // saat diurutkan sebagai teks. Tanpa itu "12–15" muncul sebelum "03–06" di
  // sumbu chart, dan grafiknya terbaca terbalik tanpa ada yang salah tampak.
  dimensions: {
    rentang_masa_tunggu_bekerja: {
      sql: `CASE
              WHEN ${CUBE}.masa_tunggu_bekerja IS NULL OR ${CUBE}.masa_tunggu_bekerja < 0 THEN 'Tanpa data'
              WHEN ${CUBE}.masa_tunggu_bekerja <  3 THEN '00–03 bulan'
              WHEN ${CUBE}.masa_tunggu_bekerja <  6 THEN '03–06 bulan'
              WHEN ${CUBE}.masa_tunggu_bekerja <  9 THEN '06–09 bulan'
              WHEN ${CUBE}.masa_tunggu_bekerja < 12 THEN '09–12 bulan'
              WHEN ${CUBE}.masa_tunggu_bekerja < 15 THEN '12–15 bulan'
              ELSE '15+ bulan'
            END`,
      type: `string`,
    },

    rentang_masa_tunggu_wirausaha: {
      sql: `CASE
              WHEN ${CUBE}.masa_tunggu_wirausaha IS NULL OR ${CUBE}.masa_tunggu_wirausaha < 0 THEN 'Tanpa data'
              WHEN ${CUBE}.masa_tunggu_wirausaha <  3 THEN '00–03 bulan'
              WHEN ${CUBE}.masa_tunggu_wirausaha <  6 THEN '03–06 bulan'
              WHEN ${CUBE}.masa_tunggu_wirausaha <  9 THEN '06–09 bulan'
              WHEN ${CUBE}.masa_tunggu_wirausaha < 12 THEN '09–12 bulan'
              WHEN ${CUBE}.masa_tunggu_wirausaha < 15 THEN '12–15 bulan'
              ELSE '15+ bulan'
            END`,
      type: `string`,
    },

    // Rentang pendapatan — kebalikan dari yang di atas: memecah jumlah alumni
    // (atau masa tunggu) menurut besaran gaji. Batasnya juta rupiah, setengah
    // terbuka seperti di atas.
    rentang_pendapatan: {
      sql: `CASE
              WHEN ${CUBE}.take_home_pay IS NULL OR ${CUBE}.take_home_pay <= 0 THEN 'Tanpa data'
              WHEN ${CUBE}.take_home_pay <  2000000 THEN '00–02 juta'
              WHEN ${CUBE}.take_home_pay <  4000000 THEN '02–04 juta'
              WHEN ${CUBE}.take_home_pay <  6000000 THEN '04–06 juta'
              WHEN ${CUBE}.take_home_pay <  8000000 THEN '06–08 juta'
              WHEN ${CUBE}.take_home_pay < 10000000 THEN '08–10 juta'
              ELSE '10+ juta'
            END`,
      type: `string`,
    },
  },

  pre_aggregations: {},
});
