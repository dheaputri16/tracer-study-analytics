// ─────────────────────────────────────────────────────────────
//  UKURAN & RENTANG ANGKA OTOMATIS (halaman Insight)
//
//  Halaman Insight membiarkan pengguna merakit ukuran sendiri:
//  "[Rata-rata] dari [Gaji]". Supaya tidak perlu menulis measure satu
//  per satu, setiap kolom angka di bawah dibangkitkan otomatis untuk
//  lima fungsi, dan kolom yang masuk akal dikelompokkan juga dibangkitkan
//  jadi dimensi rentang ("Gaji per Rp 2 jt").
//
//  `meta` dibaca backend lewat /cubejs-api/v1/meta untuk menyusun katalog
//  Insight -- menambah kolom di sini otomatis muncul di halaman Insight,
//  tanpa menyentuh backend maupun frontend.
//
//  `sql` sengaja berbentuk fungsi (CUBE) => ...: transpiler Cube hanya
//  menulis ulang template ${CUBE} yang ditulis langsung di dalam cube(),
//  bukan yang dibangkitkan di fungsi pembantu. Cube me-resolve argumen
//  fungsi berdasarkan NAMA parameternya, jadi parameter wajib bernama CUBE.
// ─────────────────────────────────────────────────────────────

const FUNGSI_ANGKA = [
  { fn: `avg`, label: `Rata-rata`, type: `avg` },
  { fn: `median`, label: `Nilai tengah`, type: null },
  { fn: `sum`, label: `Total`, type: `sum` },
  { fn: `min`, label: `Terkecil`, type: `min` },
  { fn: `max`, label: `Terbesar`, type: `max` },
];

function ukuranAngka(kolom) {
  const hasil = {};
  kolom.forEach((k) => {
    FUNGSI_ANGKA.forEach((f) => {
      hasil[`agg_${f.fn}_${k.nama}`] = {
        sql: f.type
          ? (CUBE) => k.sql(`${CUBE}`)
          : (CUBE) => `percentile_cont(0.5) within group (order by ${k.sql(`${CUBE}`)})`,
        type: f.type || `number`,
        title: `${f.label} ${k.label.toLowerCase()}`,
        meta: {
          kind: `agg`,
          fn: f.fn,
          fn_label: f.label,
          column: k.nama,
          column_label: k.label,
          format: k.format,
        },
      };
    });
  });
  return hasil;
}


const KOLOM_ANGKA_EVALUASI = [
  { nama: `skor`, label: `Skor (1–5)`, format: `decimal`, sql: (c) => `${c}.skor` },
];

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

    // ── Dibangkitkan otomatis untuk Insight (lihat ukuranAngka) ──
    ...ukuranAngka(KOLOM_ANGKA_EVALUASI),
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
        DimIndikatorEvaluasi.grup_gap,
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT COUNT(*) || '-' || COALESCE(MAX(id_range_evaluasi), 0) FROM public.fact_range_evaluasi`,
        every: `5 minute`,
      },
    },
  },
});