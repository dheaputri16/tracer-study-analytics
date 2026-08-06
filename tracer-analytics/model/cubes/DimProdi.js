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
  //  Jenjang (D3, D4, S1, S2)
  //    └── Jurusan (Teknik Sipil, Teknik Elektro, dll)
  //          └── Program Studi (Teknik Konstruksi Gedung, dll)
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