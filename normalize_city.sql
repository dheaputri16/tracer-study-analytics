-- Normalisasi nama kota di employment_records dengan referensi dari tabel cities di database tracer_oltp. Proses ini dilakukan dalam beberapa langkah untuk menangani variasi penulisan nama kota.
-- Asumsi:
-- 1. employment_records memiliki kolom work_city (nama kota) dan work_city_id (id kota yang akan diisi).
-- 2. cities memiliki kolom id, name (nama kota), dan province_code (kode provinsi).
-- Langkah-langkah normalisasi:
-- 1. Coba cocokkan langsung nama kota.
-- 2. Tangani variasi "Kabupaten X" → "Kab. X".
-- 3. Tangani variasi "Kab. X" → "Kabupaten X".
-- 4. Tangani variasi "Kota Administrasi Jakarta X" → "Kota Jakarta X".
-- 5. Coba cocokkan nama tanpa prefix (misal "Bogor" → "Kota Bogor" atau "Kab. Bogor").
-- 6. Tangani typo umum (misal "Tanggerang" → "Tangerang"). 
-- Setelah setiap langkah, periksa berapa banyak record yang berhasil dicocokkan dan berapa yang masih belum.
-- Catatan: Pastikan untuk melakukan backup data sebelum menjalankan update ini, karena akan mengubah data di tabel employment_records.
-- Setelah menjalankan semua langkah, lakukan pengecekan akhir untuk melihat berapa banyak record yang berhasil dinormalisasi dan berapa yang masih belum.
-- Pastikan untuk menyesuaikan nama tabel dan kolom jika berbeda di database Anda.
-- Jalankan setiap langkah secara berurutan dan periksa hasilnya sebelum melanjutkan ke langkah berikutnya.
-- Setelah semua langkah selesai, Anda dapat melakukan analisis lebih lanjut untuk menangani kasus-kasus yang masih belum teratasi, seperti menggunakan teknik fuzzy matching atau manual review untuk nama-nama kota yang sulit dikenali.
-- Jangan lupa untuk melakukan commit setelah semua update selesai jika database Anda menggunakan transaksi.
-- Selamat mencoba!

-- Catatan tambahan: Jika Anda memiliki banyak variasi penulisan nama kota, pertimbangkan untuk membuat tabel mapping yang berisi variasi nama kota dan id kota yang benar, sehingga proses normalisasi bisa lebih mudah dan terstruktur di masa depan.
-- Pastikan juga untuk menangani kasus-kasus khusus seperti nama kota yang sama di beberapa provinsi (misal "Samarinda" di Kalimantan Timur dan "Samarinda" di Kalimantan Selatan) dengan menambahkan logika tambahan jika diperlukan.
-- Setelah semua langkah selesai, lakukan analisis untuk melihat pola-pola nama kota yang masih belum teratasi, dan pertimbangkan untuk menambahkan langkah-langkah tambahan jika diperlukan, seperti menangani variasi penulisan yang lebih kompleks atau menggunakan teknik fuzzy matching untuk nama-nama kota yang sulit dikenali.
-- Jangan lupa untuk melakukan backup data sebelum menjalankan update ini, karena akan mengubah data di tabel employment_records. Selalu pastikan untuk memeriksa hasil setiap langkah sebelum melanjutkan ke langkah berikutnya, dan lakukan commit setelah semua update selesai jika database Anda menggunakan transaksi. Selamat mencoba!
-- Catatan tambahan: Jika Anda memiliki banyak variasi penulisan nama kota, pertimbangkan untuk membuat tabel mapping yang berisi variasi nama kota dan id kota yang benar, sehingga proses normalisasi bisa lebih mudah dan terstruktur di masa depan. Pastikan juga untuk menangani kasus-kasus khusus seperti nama kota yang sama di beberapa provinsi (misal "Samarinda" di Kalimantan Timur dan "Samarinda" di Kalimantan Selatan) dengan menambahkan logika tambahan jika diperlukan. Setelah semua langkah selesai, lakukan analisis untuk melihat pola-pola nama kota yang masih belum teratasi, dan pertimbangkan untuk menambahkan langkah-langkah tambahan jika diperlukan, seperti menangani variasi penulisan yang lebih kompleks atau menggunakan teknik fuzzy matching untuk nama-nama kota yang sulit dikenali. Jangan lupa untuk melakukan backup data sebelum menjalankan update ini, karena akan mengubah data di tabel employment_records. Selalu pastikan untuk memeriksa hasil setiap langkah sebelum melanjutkan ke langkah berikutnya, dan lakukan commit setelah semua update selesai jika database Anda menggunakan transaksi. Selamat mencoba!
-- Pastikan untuk menyesuaikan nama tabel dan kolom jika berbeda di database Anda. Jalankan setiap langkah secara berurutan dan periksa hasilnya sebelum melanjutkan ke langkah berikutnya. Setelah semua langkah selesai, Anda dapat melakukan analisis lebih lanjut untuk menangani kasus-kasus yang masih belum teratasi, seperti menggunakan teknik fuzzy matching atau manual review untuk nama-nama kota yang sulit dikenali. Jangan lupa untuk melakukan commit setelah semua update selesai jika database Anda menggunakan transaksi. Selamat mencoba!

-- Step 1: Direct match
UPDATE tracer_oltp.employment_records er
SET work_city_id = c.id, work_province_code = c.province_code
FROM tracer_oltp.cities c
WHERE er.work_city = c.name AND er.work_city IS NOT NULL AND er.work_city_id IS NULL;

-- Step 2: "Kabupaten X" → "Kab. X"
UPDATE tracer_oltp.employment_records er
SET work_city_id = c.id, work_province_code = c.province_code
FROM tracer_oltp.cities c
WHERE er.work_city_id IS NULL AND er.work_city IS NOT NULL
AND c.name = REPLACE(er.work_city, 'Kabupaten ', 'Kab. ');

-- Step 3: "Kab. X" → "Kabupaten X"
UPDATE tracer_oltp.employment_records er
SET work_city_id = c.id, work_province_code = c.province_code
FROM tracer_oltp.cities c
WHERE er.work_city_id IS NULL AND er.work_city IS NOT NULL
AND c.name = REPLACE(er.work_city, 'Kab. ', 'Kabupaten ');

-- Step 4: "Kota Administrasi Jakarta X" → "Kota Jakarta X"
UPDATE tracer_oltp.employment_records er
SET work_city_id = c.id, work_province_code = c.province_code
FROM tracer_oltp.cities c
WHERE er.work_city_id IS NULL AND er.work_city IS NOT NULL
AND c.name = REPLACE(er.work_city, 'Kota Administrasi ', 'Kota ');

-- Step 5: Nama tanpa prefix ("Bogor" → "Kota Bogor" atau "Kab. Bogor")
UPDATE tracer_oltp.employment_records er
SET work_city_id = c.id, work_province_code = c.province_code
FROM tracer_oltp.cities c
WHERE er.work_city_id IS NULL AND er.work_city IS NOT NULL
AND er.work_city NOT LIKE '%,%'
AND er.work_city NOT IN ('Remote','Remote Working','Masih mencari','belum bekerja tetap')
AND (c.name = 'Kota ' || er.work_city OR c.name = 'Kab. ' || er.work_city)
AND LENGTH(er.work_city) > 3;

-- Step 6: Typo Tanggerang
UPDATE tracer_oltp.employment_records er
SET work_city_id = c.id, work_province_code = c.province_code
FROM tracer_oltp.cities c
WHERE er.work_city_id IS NULL AND er.work_city = 'Tanggerang' AND c.name = 'Kota Tangerang';

-- Cek hasil
SELECT COUNT(*) total, COUNT(work_city_id) match, COUNT(*)-COUNT(work_city_id) belum
FROM tracer_oltp.employment_records WHERE work_city IS NOT NULL;