cube(`DimProdi`, {
  // Tidak difilter ke flag_prodi = true — lihat DimWirausaha/DimPerusahaan
  // untuk alasan lengkap: fact_tracer_study menunjuk ke prodi_sk versi yang
  // valid pada tanggal snapshot masing-masing baris (SCD Type 2), jadi
  // memfilter ke versi "current" saja di sini berisiko mematahkan join
  // untuk fact historis begitu ada perubahan atribut prodi.
  sql: `SELECT * FROM public.dim_prodi`,

  // ─────────────────────────────────────────────────────────────
  //  HIERARKI DIMENSI PRODI
  //
  //  Struktur drill-down dari kasar ke detail:
  //
  //  Perguruan Tinggi
  //    └── Jenjang (D3, D4, S1, S2)
  //          └── Jurusan (Teknik Sipil, Teknik Elektro, dll)
  //                └── Program Studi (Teknik Konstruksi Gedung, dll)
  //
  //  Level Perguruan Tinggi bernilai tunggal pada pemasangan single-tenant,
  //  sehingga di dashboard ia berfungsi sebagai puncak roll-up: titik "seluruh
  //  institusi" yang dituju ketika pengguna naik dari jenjang.
  //
  //  Dipakai untuk:
  //  - Drill down di dashboard: user klik "D3" → lihat per jurusan
  //    → klik jurusan → lihat per prodi
  //  - Filter bertingkat: filter jenjang dulu, baru jurusan, baru prodi
  //  - Perbandingan antar jenjang (D3 vs D4 keterserapannya)
  // ─────────────────────────────────────────────────────────────

  dimensions: {
    // ── Surrogate Key — dipakai sebagai FK di fact ────────────
    prodi_sk: {
      sql: `prodi_sk`,
      type: `number`,
      primary_key: true,
    },
    // ── Natural / Business Key ────────────────────────────────
    id_prodi: {
      sql: `id_prodi`,
      type: `number`,
      description: `Business key dari OLTP — untuk ETL lookup`,
    },

    // ── Hierarki Level 0: Perguruan Tinggi ─────────────────
    // Puncak hierarki. Dari config/institution.php di backend, diisi ETL
    // (ProdiDimService). Selaras Gambar 5.3 proposal.
    nama_pt: {
      sql: `nama_pt`,
      type: `string`,
      description: `Level 0 hierarki: nama perguruan tinggi`,
    },

    // ── Hierarki Level 1: Jenjang ──────────────────────────────
    // Level paling kasar — untuk perbandingan D3 vs D4 vs S1.
    // Nilai: 'D3', 'D4', 'S1', 'S2'
    // Dari OLTP: programs.degree
    jenjang: {
      sql: `jenjang`,
      type: `string`,
      description: `Level 1 hierarki: D3, D4, S1, S2`,
    },

    // ── Hierarki Level 2: Jurusan ──────────────────────────────
    // Level menengah — untuk perbandingan antar jurusan.
    // Contoh: Teknik Sipil, Teknik Elektro, Akuntansi, dll.
    // Dari OLTP: programs.jurusan
    jurusan: {
      sql: `jurusan`,
      type: `string`,
      description: `Level 2 hierarki: nama jurusan`,
    },

    // ── Hierarki Level 3: Program Studi ───────────────────────
    // Level paling detail — untuk analisis per prodi spesifik.
    // Contoh: Teknik Konstruksi Gedung, Teknik Informatika, dll.
    // Dari OLTP: programs.name
    nama_prodi: {
      sql: `nama_prodi`,
      type: `string`,
      description: `Level 3 hierarki: nama program studi spesifik`,
    },

    kode_prodi: {
      sql: `kode_prodi`,
      type: `string`,
      description: `Kode singkat prodi: TKG, TI, AKT, dll`,
    },

    // ── Atribut akreditasi ─────────────────────────────
    // Peringkat yang berlaku pada masa versi SCD ini, bukan peringkat hari
    // ini. Baris versi lama bernilai NULL dengan sengaja — riwayat
    // akreditasi sebelum kolom ini ada memang tidak pernah tercatat.
    // Dari OLTP: programs.accreditation
    akreditasi_prodi: {
      sql: `akreditasi_prodi`,
      type: `string`,
      description: `Peringkat akreditasi prodi pada masa versi ini`,
    },

    // ── Hierarki dinamis (DFR-17/DFR-18, Fase 3) ────────────────
    // Kolom bertingkat tetap (BUKAN JSONB) hasil resolve pohon org_units
    // saat ETL jalan -- level_index org_unit_types dipetakan langsung ke
    // level_N_name (level 1 -> level_1_name, dst). Level yang tidak
    // dipakai template institusi aktif (mis. level 2-5 pada Politeknik
    // yang cuma 1 level) bernilai NULL. Untuk mode Politeknik (POLBAN,
    // default), level_1_name setara nilainya dengan `jurusan` di atas --
    // dimension lama TIDAK dihapus/diubah supaya 7 pre-aggregation
    // existing di FactTracerStudy.js tidak perlu disentuh sama sekali di
    // fase ini. Lihat OrgUnitHierarchyResolverService (backend).
    level_1_name: {
      sql: `level_1_name`,
      type: `string`,
      description: `Hierarki dinamis level 1 (mis. Jurusan/Fakultas), hasil resolve pohon org_units`,
    },
    level_2_name: {
      sql: `level_2_name`,
      type: `string`,
      description: `Hierarki dinamis level 2, NULL jika template institusi tidak punya level ini`,
    },
    level_3_name: {
      sql: `level_3_name`,
      type: `string`,
      description: `Hierarki dinamis level 3, NULL jika template institusi tidak punya level ini`,
    },
    level_4_name: {
      sql: `level_4_name`,
      type: `string`,
      description: `Hierarki dinamis level 4, NULL jika template institusi tidak punya level ini`,
    },
    level_5_name: {
      sql: `level_5_name`,
      type: `string`,
      description: `Hierarki dinamis level 5, NULL jika template institusi tidak punya level ini`,
    },

    // ── SCD Type 2 fields ──────────────────────────────────────
    valid_from: {
      sql: `valid_from`,
      type: `time`,
      description: `Tanggal versi ini mulai berlaku`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
      description: `Tanggal versi ini berakhir — NULL berarti masih aktif`,
    },
    flag_prodi: {
      sql: `flag_prodi`,
      type: `boolean`,
      description: `true = versi aktif saat ini`,
    },
  },
});