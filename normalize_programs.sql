-- Jalankan ROLLBACK dulu kalau belum:
-- ROLLBACK;

BEGIN;

-- ── Teknik Sipil ─────────────────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Konstruksi Gedung'              WHERE code = 'TKG';
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Konstruksi Sipil'               WHERE code = 'TKS';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Perancangan Jalan & Jembatan'   WHERE code = 'TPJJ';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Perawatan & Perbaikan Gedung'   WHERE code = 'TPPG';

-- ── Teknik Mesin & Manufaktur ────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Mesin'                          WHERE code = 'TM';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Perancangan & Konstruksi Mesin' WHERE code = 'TPKM';
UPDATE tracer_oltp.programs SET name = 'D-4 Proses Manufaktur'                     WHERE code = 'PM';
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Aeronautika', jurusan = 'Teknik Mesin' WHERE code = 'TA';

-- ── Teknik Pendingin & Energi ────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Pendingin & Tata Udara'         WHERE code = 'TPTU3';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Pendingin & Tata Udara'         WHERE code = 'TPTU4';
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Konversi Energi'                WHERE code = 'TKE3';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Konservasi Energi'              WHERE code = 'TKE4';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknologi Pembangkit Tenaga Listrik', jurusan = 'Teknik Konversi Energi' WHERE code = 'TPTL';

-- ── Teknik Elektronika & Listrik ─────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Elektronika'                    WHERE code = 'TEL3';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Elektronika'                    WHERE code = 'TEL4';
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Listrik'                        WHERE code = 'TL';
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Telekomunikasi'                 WHERE code = 'TELKOM3';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Telekomunikasi'                 WHERE code = 'TELKOM4';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Otomasi Industri'               WHERE code = 'TOI';

-- ── Teknik Kimia ─────────────────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Kimia'                          WHERE code = 'TK3';
UPDATE tracer_oltp.programs SET name = 'D-3 Analis Kimia'                          WHERE code = 'AK3';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Kimia Produksi Bersih'          WHERE code = 'TKPB';

-- ── Teknik Informatika ───────────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Teknik Informatika'                    WHERE code = 'TI3';
UPDATE tracer_oltp.programs SET name = 'D-4 Teknik Informatika'                    WHERE code = 'TI';

-- ── Akuntansi & Keuangan ─────────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-3 Akuntansi'                             WHERE code = 'AKT3';
UPDATE tracer_oltp.programs SET name = 'D-3 Keuangan & Perbankan'                  WHERE code = 'KP';
UPDATE tracer_oltp.programs SET name = 'D-4 Akuntansi'                             WHERE code = 'AKT4';
UPDATE tracer_oltp.programs SET name = 'D-4 Akuntansi Manajemen Pemerintahan'      WHERE code = 'AMP';
UPDATE tracer_oltp.programs SET name = 'D-4 Keuangan Syariah'                      WHERE code = 'KS';
UPDATE tracer_oltp.programs SET name = 'S-2 Keuangan & Perbankan Syariah', jurusan = 'Akuntansi',  dikti_code = '60104' WHERE code = 'KPS2';
UPDATE tracer_oltp.programs SET name = 'S-2 Rekayasa Infrastruktur',       jurusan = 'Teknik Sipil', dikti_code = '31104' WHERE code = 'RIS2';

-- ── Administrasi & Manajemen ─────────────────────────────────────
UPDATE tracer_oltp.programs SET name = 'D-4 Manajemen Aset', jurusan = 'Administrasi Niaga' WHERE code = 'MA';
UPDATE tracer_oltp.programs SET name = 'D-3 Administrasi Bisnis'                   WHERE code = 'AB3';
UPDATE tracer_oltp.programs SET name = 'D-3 Manajemen Pemasaran'                   WHERE code = 'MP3';
UPDATE tracer_oltp.programs SET name = 'D-3 Usaha Perjalanan Wisata'               WHERE code = 'UPW';
UPDATE tracer_oltp.programs SET name = 'D-4 Administrasi Bisnis'                   WHERE code = 'AB4';
UPDATE tracer_oltp.programs SET name = 'D-4 Manajemen Pemasaran'                   WHERE code = 'MP4';
UPDATE tracer_oltp.programs SET name = 'D-3 Bahasa Inggris'                        WHERE code = 'BIG';

-- ── Verifikasi ───────────────────────────────────────────────────
SELECT id, name, code, degree, jurusan, dikti_code
FROM tracer_oltp.programs
ORDER BY id ASC;

COMMIT;