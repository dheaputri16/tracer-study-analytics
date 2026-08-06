// ARSITEKTUR (direvisi mengikuti Kimball standard):
//
// Referensi: Kimball "The Data Warehouse Toolkit" Ch.5
// "The surrogate key is the only mechanism needed to identify
//  which version of a dimension row applies to a fact row."
//
// DENORMALISASI:
// Label tidak disimpan di fact karena:
// - Data SmartTracer (<1 juta baris) belum butuh optimasi ini
// - Join statis (surrogate key) sudah bisa di-pre-aggregate
// - Kalau data tumbuh besar, baru pertimbangkan denormalisasi
//
// CATATAN CUBE.JS:
// Dimension dari joined cube TIDAK boleh didefinisikan di sini.
// Cube.js membutuhkan setiap dimension didefinisikan di cube
// pemiliknya masing-masing agar pre-aggregation bisa di-cache
// dengan benar. Query dari backend menggunakan nama cube asli,
// contoh: DimProdi.jenjang, DimStatusAlumni.label, dst.

cube(`FactTracerStudy`, {
  sql_table: `public.fact_tracer_study`,

  // ─────────────────────────────────────────────────────────────
  //  JOINS
  //
  //  Semua join menggunakan surrogate key saja.
  //
  //  Dimensi yang punya SCD Type 2 (dim_perusahaan, dim_prodi,
  //  dim_wirausaha) tetap di-join dengan surrogate key —
  //  surrogate key sudah menunjukkan versi yang benar.
  //
  //  Dimensi yang tidak punya SCD Type 2 (dim_alumni, dim_waktu,
  //  dim_status_alumni, dim_kesesuaian_bidang, dll) di-join
  //  dengan cara yang sama — konsisten dan sederhana.
  // ─────────────────────────────────────────────────────────────

  joins: {

    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_alumni = ${DimAlumni}.id_alumni`,
    },

    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_waktu = ${DimWaktu}.id_waktu`,
    },

    // SCD Type 2 — join surrogate key saja.
    // fact.prodi_sk sudah menunjukkan versi prodi yang benar
    // pada saat alumni mengisi kuesioner.
    DimProdi: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.prodi_sk = ${DimProdi}.prodi_sk`,
    },

    // Tidak perlu SCD Type 2 — penambahan status baru
    // tidak mengubah versi status lama.
    // Status baru = row baru dengan sk baru di dim_status_alumni.
    DimStatusAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.status_alumni_sk = ${DimStatusAlumni}.status_alumni_sk`,
    },

    // Tidak perlu SCD Type 2
    // Kategori baru = row baru dengan sk baru.
    DimKesesuaianBidang: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.kesesuaian_bidang_sk = ${DimKesesuaianBidang}.kesesuaian_bidang_sk`,
    },

    // Tidak perlu SCD Type 2
    // Kesesuaian baru = row baru dengan sk baru.
    DimKesesuaianLevel: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.kesesuaian_level_sk = ${DimKesesuaianLevel}.kesesuaian_level_sk`,
    },

    // SCD Type 2 — perusahaan bisa ganti jenis/skala/lokasi.
    // fact.perusahaan_sk sudah menunjukkan versi perusahaan
    // yang berlaku saat alumni mengisi kuesioner.
    DimPerusahaan: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.perusahaan_sk = ${DimPerusahaan}.perusahaan_sk`,
    },
    // dim_studi_lanjut tidak punya surrogate key terpisah —
    // id_studi_lanjut IS the PK sekaligus natural key (Type 1,
    // etl business key = kombinasi perguruan_tinggi + program_studi, jika berbeda maka akan ada row baru).
    DimStudiLanjut: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_studi_lanjut = ${DimStudiLanjut}.id_studi_lanjut`,
    },

    // SCD Type 2 — data wirausaha alumni bisa berubah.
    // fact.wirausaha_sk sudah menunjukkan versi yang benar.
    DimWirausaha: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.wirausaha_sk = ${DimWirausaha}.wirausaha_sk`,
    },

    // Dipakai oleh dimension salary_ump_multiplier di bawah -- sebelumnya
    // TIDAK di-join sama sekali, karena perbandingan gaji vs UMP cukup lewat
    // flag_above_ump yang sudah dihitung sekali di ETL (ambang 1.2x hardcode).
    // Join ini ditambah supaya perbandingan bisa dihitung ULANG di query time
    // dengan ambang berapa pun (lihat catatan di salary_ump_multiplier).
    DimUmp: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.ump_sk = ${DimUmp}.ump_sk`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  MEASURES
  //
  //  1. DINAMIS — tidak hardcode status/kategori apapun.
  //     Backend group by dimension label dari join.
  //     Status baru/prodi baru/kategori baru → otomatis muncul
  //     karena data ada di dimensi, bukan hardcode di sini.
  //
  //  2. HARDCODE — logika bisnis institusi.
  //     Angka dan batas (mis. rentang bulan masa tunggu) tidak ada
  //     di database — itu keputusan institusi (standar DIKTI), jadi
  //     tetap literal di sini.
  //     Klasifikasi option_code → kategori KPI (mis. status mana yang
  //     terhitung "terserap") TIDAK lagi di-hardcode di file ini.
  //     Sumbernya sekarang tabel `public.kpi_category_mapping` — kalau
  //     ada status baru yang perlu masuk ke suatu kategori, cukup
  //     INSERT/aktifkan row baru lewat admin UI Pemetaan KPI, tidak
  //     perlu ubah kode cube ini sama sekali. Lihat subquery di tiap
  //     measure di bawah untuk `digunakan_oleh` yang relevan.
  // ─────────────────────────────────────────────────────────────

  measures: {

    // ── DINAMIS ────────────────────────────────────────────────

    // Measure utama — dipakai untuk semua grafik count.
    // Backend group by DimStatusAlumni.label / DimProdi.nama_prodi
    // / DimWaktu.tahun_snapshot untuk dapat breakdown apapun
    // tanpa ubah kode ini.
    count_alumni: {
      type: `count`,
      description: `Total alumni yang mengisi tracer study`,
    },

    // Rata-rata masa tunggu — tanpa filter status.
    // Backend filter by DimStatusAlumni.label jika perlu
    // hanya alumni bekerja saja.
    avg_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `avg`,
      description: `Rata-rata masa tunggu kerja pertama (bulan)`,
    },
    // FR-025: median masa tunggu per prodi -- Cube.js tidak punya measure type
    // 'median'/'percentile' built-in, jadi pakai raw SQL aggregate expression
    // (type: 'number'). TIDAK dimasukkan ke pre-aggregation distribusi_masa_tunggu
    // di bawah -- percentile_cont bukan aggregate yang bisa di-rollup/merge
    // antar partisi, jadi query measure ini selalu live (bukan dari rollup cache).
    median_masa_tunggu_bekerja: {
      sql: `percentile_cont(0.5) within group (order by ${CUBE}.masa_tunggu_bekerja)`,
      type: `number`,
      description: `Median masa tunggu kerja pertama (bulan)`,
    },
    min_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `min`,
    },
    max_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `max`,
    },

    avg_masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `avg`,
      description: `Rata-rata masa tunggu mulai wirausaha (bulan)`,
    },
    min_masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `min`,
    },
    max_masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `max`,
    },

    avg_bulan_sebelum_lulus: {
      sql: `bulan_sebelum_lulus`,
      type: `avg`,
      description: `Rata-rata bulan sebelum lulus mulai cari kerja`,
    },
    avg_bulan_sesudah_lulus: {
      sql: `bulan_sesudah_lulus`,
      type: `avg`,
      description: `Rata-rata bulan sesudah lulus dapat kerja`,
    },

    avg_take_home_pay: {
      sql: `take_home_pay`,
      type: `avg`,
      description: `Rata-rata gaji per bulan`,
    },
    min_take_home_pay: {
      sql: `take_home_pay`,
      type: `min`,
    },
    max_take_home_pay: {
      sql: `take_home_pay`,
      type: `max`,
    },
    count_above_ump: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.flag_above_ump = 1` },
        { sql: `${CUBE}.flag_above_ump IS NOT NULL` }
      ],
      description: `Alumni dengan gaji ≥ 1.2× UMP tahun lulus`,
    },
    count_below_ump: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.flag_above_ump = 0` },
        { sql: `${CUBE}.flag_above_ump IS NOT NULL` }
      ],
      description: `Alumni dengan gaji < 1.2× UMP tahun lulus`,
    },
    // Alumni yang BISA dibandingkan dengan UMP (ada data gaji + ada UMP ref)
    count_dengan_data_ump: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.flag_above_ump IS NOT NULL` },
      ],
      description: `Alumni yang memiliki data gaji dan referensi UMP valid`,
    },

    // ── HARDCODE — keputusan bisnis institusi ──────────────────

    // ── DINAMIS, POINT-IN-TIME (option_code → kategori dari kpi_category_mapping) ──
    // IKU 2 Kemendikbud: Terserap = bekerja + wirausaha + studi lanjut.
    // Klasifikasi option_code mana yang terhitung "terserap" vs "tidak"
    // TIDAK lagi hardcode di sini — bersumber dari public.kpi_category_mapping
    // (digunakan_oleh = 'iku2_keterserapan'), yang diisi lewat admin UI
    // Pemetaan KPI. Tambah status baru ke kategori ini = INSERT row baru
    // di tabel itu, tidak perlu ubah/redeploy cube.
    //
    // PENTING — kenapa lookup-nya "point-in-time", bukan sekadar
    // "WHERE is_active = true":
    // kpi_category_mapping TIDAK bergrain per id_waktu/snapshot — kalau
    // subquery cuma mengecek is_active, maka mengubah definisi "terserap"
    // hari ini akan diam-diam menghitung ULANG seluruh snapshot historis
    // pakai definisi BARU, bukan definisi yang berlaku saat snapshot itu
    // diambil. Untuk kebutuhan akreditasi (BAN-PT/LAM butuh "definisi apa
    // yang dipakai laporan periode X"), itu salah. Sebagai gantinya, tiap
    // baris fact di-cocokkan ke kpi_category_mapping yang EFEKTIF pada
    // tanggal snapshot-nya sendiri (dim_waktu.tanggal_refresh milik
    // ${CUBE}.id_waktu baris itu) — pakai effective_date/deactivated_at
    // yang sudah ada di skema, tidak perlu kolom baru:
    //   effective_date <= tanggal_refresh
    //   AND (deactivated_at IS NULL OR deactivated_at::date > tanggal_refresh)
    //   ORDER BY effective_date DESC LIMIT 1  -- baris paling baru yang
    //                                            berlaku pada tanggal itu
    // Snapshot BARU (dan snapshot mendatang) otomatis ikut definisi
    // TERBARU karena tanggal_refresh-nya juga baru; snapshot LAMA tetap
    // terkunci ke definisi yang berlaku saat itu.
    //
    // Subquery tetap resolve lewat dim_status_alumni.id_status_alumni
    // (bukan hardcode SK) karena status_alumni_sk adalah auto-increment
    // yang bisa berubah antar-rebuild ETL. option_code sebaliknya stabil
    // — bersumber dari questionnaire_options di OLTP yang tidak berubah
    // kecuali admin mengubah definisi pertanyaan secara eksplisit.
    //
    // Format business key id_status_alumni = "{questionnaire_id}:{question_code}:{option_code}"
    // → extract option_code via SPLIT_PART, lalu match ke kpi_category_mapping.
    count_terserap: {
      type: `count`,
      filters: [{
        sql: `(
          SELECT kcm.kpi_category
          FROM kpi_category_mapping kcm
          JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
          WHERE kcm.semantic_role = 'status_pekerjaan'
            AND kcm.digunakan_oleh = 'iku2_keterserapan'
            AND kcm.option_code = SPLIT_PART(
              (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
              ':', 3
            )
            AND kcm.effective_date <= dw.tanggal_refresh
            AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
          ORDER BY kcm.effective_date DESC
          LIMIT 1
        ) = 'terserap'`,
      }],
      description: `Alumni terserap IKU 2 (bekerja + wirausaha + studi lanjut), pakai definisi kpi_category_mapping yang berlaku pada tanggal snapshot masing-masing baris`,
    },

    // Kebalikannya — untuk chart breakdown "tidak terserap". Sama-sama
    // point-in-time, lihat catatan lengkap di count_terserap.
    count_tidak_terserap: {
      type: `count`,
      filters: [{
        sql: `(
          SELECT kcm.kpi_category
          FROM kpi_category_mapping kcm
          JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
          WHERE kcm.semantic_role = 'status_pekerjaan'
            AND kcm.digunakan_oleh = 'iku2_keterserapan'
            AND kcm.option_code = SPLIT_PART(
              (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
              ':', 3
            )
            AND kcm.effective_date <= dw.tanggal_refresh
            AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
          ORDER BY kcm.effective_date DESC
          LIMIT 1
        ) = 'tidak'`,
      }],
      description: `Alumni tidak terserap (belum kerja + sedang mencari), pakai definisi kpi_category_mapping yang berlaku pada tanggal snapshot masing-masing baris`,
    },

    // "Cepat" = masa tunggu > 0 dan ≤ 6 bulan (standar DIKTI — HARDCODE,
    // ini batas kebijakan institusi, bukan fakta code→kategori, jadi
    // angka 0/3/6 bulan tetap literal di sini).
    // Status yang eligible untuk dihitung masa tunggunya (bekerja +
    // wirausaha; studi lanjut dikecualikan karena masa_tunggu_bekerja
    // tidak relevan untuk mereka) DINAMIS + point-in-time dari
    // kpi_category_mapping (digunakan_oleh = 'masa_tunggu_valid_status').
    count_masa_tunggu_cepat: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja > 0` },
        { sql: `${CUBE}.masa_tunggu_bekerja <= 6` },
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'status_pekerjaan'
              AND kcm.digunakan_oleh = 'masa_tunggu_valid_status'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'valid'`,
        },
      ],
      description: `Alumni dapat kerja atau wirausaha dalam 6 bulan (standar DIKTI)`,
    },

    // Distribusi masa tunggu — rentang bulan (HARDCODE, kebijakan
    // institusi). Kalau rentang berubah, edit ketiga measure ini
    // sekaligus. Status eligible tetap DINAMIS + point-in-time dari
    // kpi_category_mapping, sama seperti count_masa_tunggu_cepat di atas.
    count_tunggu_0_3_bulan: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja >= 0` },
        { sql: `${CUBE}.masa_tunggu_bekerja < 3` },
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'status_pekerjaan'
              AND kcm.digunakan_oleh = 'masa_tunggu_valid_status'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'valid'`,
        },
      ],
      description: `Alumni dapat kerja dalam 0-3 bulan`,
    },

    count_tunggu_3_6_bulan: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja >= 3` },
        { sql: `${CUBE}.masa_tunggu_bekerja <= 6` },
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'status_pekerjaan'
              AND kcm.digunakan_oleh = 'masa_tunggu_valid_status'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'valid'`,
        },
      ],
      description: `Alumni dapat kerja dalam 3-6 bulan`,
    },

    count_tunggu_lebih_6_bulan: {
      type: `count`,
      filters: [
        { sql: `${CUBE}.masa_tunggu_bekerja > 6` },
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'status_pekerjaan'
              AND kcm.digunakan_oleh = 'masa_tunggu_valid_status'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'valid'`,
        },
      ],
      description: `Alumni dapat kerja lebih dari 6 bulan`,
    },

    // "Sesuai bidang" / "tidak sesuai" — klasifikasi option_code dari
    // kpi_category_mapping (digunakan_oleh = 'kesesuaian_bidang_relevance',
    // semantic_role = 'relevansi_bidang'), point-in-time seperti measure
    // lain di atas. Filter status kerja yang eligible untuk dihitung
    // kesesuaian bidangnya (hanya alumni yang benar-benar bekerja — bukan
    // wirausaha, bukan studi lanjut) juga dari kpi_category_mapping
    // (digunakan_oleh = 'kesesuaian_bidang_employed_status'), point-in-time.
    count_sesuai_bidang: {
      type: `count`,
      filters: [
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'relevansi_bidang'
              AND kcm.digunakan_oleh = 'kesesuaian_bidang_relevance'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dkb.id_kesesuaian_bidang FROM dim_kesesuaian_bidang dkb WHERE dkb.kesesuaian_bidang_sk = ${CUBE}.kesesuaian_bidang_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'sesuai'`,
        },
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'status_pekerjaan'
              AND kcm.digunakan_oleh = 'kesesuaian_bidang_employed_status'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'valid'`,
        },
      ],
      description: `Alumni bekerja sesuai bidang, pakai definisi kpi_category_mapping yang berlaku pada tanggal snapshot masing-masing baris`,
    },

    count_tidak_sesuai_bidang: {
      type: `count`,
      filters: [
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'relevansi_bidang'
              AND kcm.digunakan_oleh = 'kesesuaian_bidang_relevance'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dkb.id_kesesuaian_bidang FROM dim_kesesuaian_bidang dkb WHERE dkb.kesesuaian_bidang_sk = ${CUBE}.kesesuaian_bidang_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'tidak_sesuai'`,
        },
        {
          sql: `(
            SELECT kcm.kpi_category
            FROM kpi_category_mapping kcm
            JOIN dim_waktu dw ON dw.id_waktu = ${CUBE}.id_waktu
            WHERE kcm.semantic_role = 'status_pekerjaan'
              AND kcm.digunakan_oleh = 'kesesuaian_bidang_employed_status'
              AND kcm.option_code = SPLIT_PART(
                (SELECT dsa.id_status_alumni FROM dim_status_alumni dsa WHERE dsa.status_alumni_sk = ${CUBE}.status_alumni_sk),
                ':', 3
              )
              AND kcm.effective_date <= dw.tanggal_refresh
              AND (kcm.deactivated_at IS NULL OR kcm.deactivated_at::date > dw.tanggal_refresh)
            ORDER BY kcm.effective_date DESC
            LIMIT 1
          ) = 'valid'`,
        },
      ],
      description: `Alumni bekerja tidak sesuai bidang, pakai definisi kpi_category_mapping yang berlaku pada tanggal snapshot masing-masing baris`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  DIMENSIONS
  //
  //  Hanya kolom NATIVE dari tabel fact_tracer_study.
  //
  //  ATURAN CUBE.JS:
  //  Dimension dari joined cube (DimProdi, DimStatusAlumni, dll)
  //  TIDAK boleh didefinisikan di sini — harus di cube masing-
  //  masing. Lihat file DimProdi.js, DimStatusAlumni.js, dst.
  //
  //  Untuk query backend, gunakan nama cube aslinya langsung:
  //    DimProdi.jenjang        (bukan FactTracerStudy.jenjang)
  //    DimStatusAlumni.label   (bukan FactTracerStudy.status_label)
  //    DimWaktu.tahun_snapshot (bukan FactTracerStudy.tahun_snapshot)
  //
  //  HIERARKI PRODI (drill-down) — didefinisikan di DimProdi.js:
  //  DimProdi.jenjang → DimProdi.jurusan → DimProdi.nama_prodi
  //  User bisa drill dari "D3 berapa % terserap?" ke
  //  "jurusan mana?" ke "prodi spesifik mana?"
  // ─────────────────────────────────────────────────────────────

  dimensions: {

    // ── Primary key ────────────────────────────────────────────
    id_fact: {
      sql: `id_fact`,
      type: `number`,
      primary_key: true,
    },

    // ── Surrogate keys dari fact ───────────────────────────────
    // Dipakai untuk filter numerik dan referensi join.
    // Untuk display label, pakai dimension dari cube dimensinya
    // langsung: DimStatusAlumni.label, DimProdi.nama_prodi, dst.
    id_alumni:            { sql: `id_alumni`,            type: `number` },
    id_waktu:             { sql: `id_waktu`,             type: `number` },
    prodi_sk:             { sql: `prodi_sk`,             type: `number` },
    status_alumni_sk:     { sql: `status_alumni_sk`,     type: `number` },
    kesesuaian_bidang_sk: { sql: `kesesuaian_bidang_sk`, type: `number` },
    kesesuaian_level_sk:  { sql: `kesesuaian_level_sk`,  type: `number` },
    perusahaan_sk:        { sql: `perusahaan_sk`,        type: `number` },
    id_studi_lanjut:      { sql: `id_studi_lanjut`,      type: `number` },
    wirausaha_sk:         { sql: `wirausaha_sk`,         type: `number` },
    ump_sk:               { sql: `ump_sk`,               type: `number` },

    // ── Kolom numerik dari fact ─────────────────────────────────
    masa_tunggu_bekerja:   { sql: `masa_tunggu_bekerja`,   type: `number` },
    bulan_sebelum_lulus:   { sql: `bulan_sebelum_lulus`,   type: `number` },
    bulan_sesudah_lulus:   { sql: `bulan_sesudah_lulus`,   type: `number` },
    masa_tunggu_wirausaha: { sql: `masa_tunggu_wirausaha`, type: `number` },
    take_home_pay:         { sql: `take_home_pay`,         type: `number` },
    // flag_above_ump TETAP ADA (jangan dihapus) -- masih dipakai measure
    // count_above_ump/count_below_ump lama (ambang 1.2x tetap ini, hardcode
    // di AlumniFactBuilderService saat ETL). Dimension di bawah adalah jalur
    // BARU, terpisah, untuk ambang dinamis per LAM.
    flag_above_ump:        { sql: `flag_above_ump`,        type: `number` },

    // Rasio gaji terhadap UMP, dihitung ULANG di query time (bukan flag
    // hasil ETL) -- supaya bisa dibandingkan terhadap ambang APAPUN (mis.
    // param_value dari threshold_configs per LAM version: 1.2x, 1.4x, dst),
    // bukan cuma 1.2x yang dibakukan di ETL. Laravel (PendapatanRepository)
    // memfilter dimension ini dengan operator gte/lt + nilai ambang dinamis,
    // pola yang sama dengan masa_tunggu_bekerja vs ambang cepat dinamis.
    // NULL kalau salah satu dari take_home_pay/nilai_ump kosong/nol --
    // konsisten dengan flag_above_ump yang juga NULL pada kondisi itu.
    //
    // Subquery mentah ke dim_ump (BUKAN ${DimUmp}.nilai_ump) -- Cube.js
    // menolak dimension FactTracerStudy yang mereferensikan cube lain
    // langsung ("references foreign cubes... split and move this
    // definition"), sama seperti kenapa lookup point-in-time
    // kpi_category_mapping di measures atas juga pakai subquery mentah,
    // bukan template ${OtherCube}. join DimUmp di atas tetap dipertahankan
    // untuk dokumentasi relasi & dipakai query lain yang butuh dimension
    // asli DimUmp (mis. DimUmp.tahun), tapi dimension computed lintas-cube
    // seperti ini harus lewat subquery.
    salary_ump_multiplier: {
      sql: `CASE WHEN (SELECT du.nilai_ump FROM dim_ump du WHERE du.ump_sk = ${CUBE}.ump_sk) > 0
                  AND ${CUBE}.take_home_pay IS NOT NULL
                  THEN ${CUBE}.take_home_pay::numeric / (SELECT du.nilai_ump FROM dim_ump du WHERE du.ump_sk = ${CUBE}.ump_sk)
                  ELSE NULL END`,
      type: `number`,
    },
  },

  // ─────────────────────────────────────────────────────────────
  //  PRE-AGGREGATIONS
  //
  //  Kenapa sekarang bisa di-pre-aggregate penuh?
  //  Karena semua join menggunakan surrogate key statis.
  //  Tidak ada kondisi join dinamis (tanggal_refresh) yang
  //  mencegah Cube.js meng-cache hasil query.
  //
  //  Cube.js bisa match query ke pre-aggregation yang tersimpan
  //  ketika measures dan dimensions yang diminta adalah subset
  //  dari yang didefinisikan di pre-aggregation ini.
  //
  //  PENTING — cara reference dimension di pre-aggregation:
  //  Harus pakai nama cube aslinya (DimProdi.jenjang),
  //  bukan alias lama (FactTracerStudy.jenjang) yang sudah
  //  dihapus karena melanggar aturan Cube.js.
  //
  //  Refresh strategy:
  //  - Cek setiap jam: SELECT MAX(tanggal_refresh) FROM dim_waktu
  //  - Kalau berubah = ETL mingguan sudah jalan
  //  - Rebuild pre-aggregation yang terpengaruh
  //  - Efektif hanya rebuild seminggu sekali
  //
  //  Requirement:
  //  - Redis untuk menyimpan pre-aggregation
  //  - Set CUBEJS_REDIS_URL di environment Cube.js
  // ─────────────────────────────────────────────────────────────

  pre_aggregations: {
 
    // ── 1. Pre-agg UTAMA ────────────────────────────────────
    // Melayani: KPI keterserapan, distribusi status,
    //           grafik tren per tahun lulus, filter global.
    // Include tahun_lulus (DimAlumni) DAN tahun_snapshot +
    // minggu_snapshot (DimWaktu) agar satu pre-agg bisa
    // melayani semua kombinasi filter global dashboard.
    utama: {
      type: `rollup`,
      measures: [
        FactTracerStudy.count_alumni,
        FactTracerStudy.count_terserap,
        FactTracerStudy.count_masa_tunggu_cepat,
        FactTracerStudy.avg_masa_tunggu_bekerja,
        FactTracerStudy.avg_take_home_pay,
        FactTracerStudy.count_sesuai_bidang,
        FactTracerStudy.count_tidak_sesuai_bidang,
      ],
      dimensions: [
        // Hierarki prodi — drill-down jenjang → jurusan → prodi
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        // Status alumni untuk distribusi
        DimStatusAlumni.label,
        // Filter waktu — keduanya disertakan:
        DimAlumni.tahun_lulus,      // untuk grafik tren per tahun lulus
        DimWaktu.tahun_snapshot,    // untuk konteks snapshot
        DimWaktu.minggu_snapshot,   // untuk filter global minggu snapshot
      ],
      refresh_key: {
        // Hanya rebuild kalau ETL sudah jalan (tanggal_refresh berubah).
        // Dicek sekali sehari — cukup untuk ETL mingguan.
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 2. Distribusi masa tunggu kerja ─────────────────────
    distribusi_masa_tunggu: {
      measures: [
        FactTracerStudy.count_tunggu_0_3_bulan,
        FactTracerStudy.count_tunggu_3_6_bulan,
        FactTracerStudy.count_tunggu_lebih_6_bulan,
        FactTracerStudy.avg_masa_tunggu_bekerja,
        FactTracerStudy.min_masa_tunggu_bekerja,
        FactTracerStudy.max_masa_tunggu_bekerja,
      ],
      dimensions: [
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
 
    // ── 3. Distribusi gaji ──────────────────────────────────
    distribusi_gaji: {
      measures: [
        FactTracerStudy.avg_take_home_pay,
        FactTracerStudy.min_take_home_pay,
        FactTracerStudy.max_take_home_pay,
        FactTracerStudy.count_above_ump,
        FactTracerStudy.count_below_ump,
        FactTracerStudy.count_dengan_data_ump, // (denominator)
        FactTracerStudy.count_alumni,          // (untuk coverage %)
      ],
      dimensions: [
        DimProdi.jenjang,
        DimProdi.jurusan,
        DimProdi.nama_prodi,
        DimStatusAlumni.label,
        DimAlumni.tahun_lulus,
        DimWaktu.minggu_snapshot,
      ],
      refresh_key: {
        sql: `SELECT MAX(tanggal_refresh) FROM public.dim_waktu`,
        every: `1 day`,
      },
    },
 
    // ── 4. Kesesuaian bidang & level ────────────────────────
    distribusi_kesesuaian: {
      measures: [
        FactTracerStudy.count_alumni,
        FactTracerStudy.count_sesuai_bidang,
        FactTracerStudy.count_tidak_sesuai_bidang,
      ],
      dimensions: [
        DimKesesuaianBidang.label,
        DimKesesuaianLevel.label,
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
 
    // ── 5. Sebaran instansi & lokasi kerja ──────────────────
    // Menggunakan label langsung (sudah didenormalisasi di
    // dim_perusahaan) — tidak ada join ke tabel referensi lagi.
    sebaran_instansi_lokasi: {
      measures: [
        FactTracerStudy.count_alumni,
      ],
      dimensions: [
        DimPerusahaan.label_jenis_perusahaan,
        DimPerusahaan.label_tingkat_instansi,
        DimPerusahaan.nama_kota,
        DimPerusahaan.nama_provinsi,
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
 
    // ── 6. Wirausaha ─────────────────────────────────────────
    // Menggunakan label langsung dari dim_wirausaha
    // (setelah migration: nama_provinsi & nama_kota terisi).
    distribusi_wirausaha: {
      measures: [
        FactTracerStudy.count_alumni,
        FactTracerStudy.avg_masa_tunggu_wirausaha,
        FactTracerStudy.min_masa_tunggu_wirausaha,
        FactTracerStudy.max_masa_tunggu_wirausaha,
      ],
      dimensions: [
        DimWirausaha.label_tingkat_instansi,
        DimWirausaha.jabatan,
        DimWirausaha.nama_provinsi,
        DimWirausaha.nama_kota,
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

    // ── 7. Studi Lanjut ────────────────────────────────────
    distribusi_studi_lanjut: {
      type: `rollup`,
      measures: [
        FactTracerStudy.count_alumni,
      ],
      dimensions: [
        DimStudiLanjut.perguruan_tinggi,
        DimStudiLanjut.program_studi,
        DimStudiLanjut.sumber_biaya,
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