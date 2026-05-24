cube(`FactTracerStudy`, {
  sql_table: `public.fact_tracer_study`,

  joins: {
    DimAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_alumni = ${DimAlumni}.id_alumni`,
    },
    DimWaktu: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_waktu = ${DimWaktu}.id_waktu`,
    },
    DimProdi: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_prodi = ${DimProdi}.id_prodi`,
    },
    DimStatusAlumni: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_status_alumni = ${DimStatusAlumni}.id_status_alumni`,
    },
    DimKesesuaianBidang: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_kesesuaian_bidang = ${DimKesesuaianBidang}.id_kesesuaian_bidang`,
    },
    DimKesesuaianLevel: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_kesesuaian_level = ${DimKesesuaianLevel}.id_kesesuaian_level`,
    },
    DimPerusahaan: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_perusahaan = ${DimPerusahaan}.id_perusahaan`,
    },
    DimStudiLanjut: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_studi_lanjut = ${DimStudiLanjut}.id_studi_lanjut`,
    },
    DimWirausaha: {
      relationship: `many_to_one`,
      sql: `${FactTracerStudy}.id_wirausaha = ${DimWirausaha}.id_wirausaha`,
    },
  },

  measures: {
    count_alumni: {
      type: `count`,
      description: `Total alumni yang mengisi tracer study`,
    },
    avg_masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `avg`,
      description: `Rata-rata masa tunggu mendapat pekerjaan pertama (bulan)`,
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
      description: `Rata-rata masa tunggu memulai wirausaha setelah lulus (bulan)`,
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
      description: `Rata-rata bulan sebelum lulus mulai mencari kerja`,
    },
    avg_bulan_sesudah_lulus: {
      sql: `bulan_sesudah_lulus`,
      type: `avg`,
      description: `Rata-rata bulan sesudah lulus mendapat pekerjaan`,
    },
    avg_take_home_pay: {
      sql: `take_home_pay`,
      type: `avg`,
      description: `Rata-rata gaji/pendapatan per bulan (take home pay)`,
    },
    min_take_home_pay: {
      sql: `take_home_pay`,
      type: `min`,
    },
    max_take_home_pay: {
      sql: `take_home_pay`,
      type: `max`,
    },
  },

  dimensions: {
    id_fact: {
      sql: `id_fact`,
      type: `number`,
      primary_key: true,
    },
    id_alumni: {
      sql: `id_alumni`,
      type: `number`,
    },
    id_waktu: {
      sql: `id_waktu`,
      type: `number`,
    },
    id_prodi: {
      sql: `id_prodi`,
      type: `number`,
    },
    id_status_alumni: {
      sql: `id_status_alumni`,
      type: `number`,
    },
    id_kesesuaian_bidang: {
      sql: `id_kesesuaian_bidang`,
      type: `number`,
    },
    id_kesesuaian_level: {
      sql: `id_kesesuaian_level`,
      type: `number`,
    },
    id_perusahaan: {
      sql: `id_perusahaan`,
      type: `number`,
    },
    id_studi_lanjut: {
      sql: `id_studi_lanjut`,
      type: `number`,
    },
    id_wirausaha: {
      sql: `id_wirausaha`,
      type: `number`,
    },
    masa_tunggu_bekerja: {
      sql: `masa_tunggu_bekerja`,
      type: `number`,
    },
    bulan_sebelum_lulus: {
      sql: `bulan_sebelum_lulus`,
      type: `number`,
    },
    bulan_sesudah_lulus: {
      sql: `bulan_sesudah_lulus`,
      type: `number`,
    },
    masa_tunggu_wirausaha: {
      sql: `masa_tunggu_wirausaha`,
      type: `number`,
    },
    take_home_pay: {
      sql: `take_home_pay`,
      type: `number`,
    },
  },
});