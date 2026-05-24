cube(`DimPerusahaan`, {
  sql_table: `public.dim_perusahaan`,

  dimensions: {
    id_perusahaan: {
      sql: `id_perusahaan`,
      type: `number`,
      primary_key: true,
    },
    jenis_perusahaan: {
      sql: `jenis_perusahaan`,
      type: `number`,
      // kode f1101: 1=Pemerintah, 2=Non-profit/LSM, 3=Swasta,
      // 4=Wiraswasta/sendiri, 6=BUMN/BUMD, 7=Multilateral
    },
    label_jenis_perusahaan: {
      sql: `label_jenis_perusahaan`,
      type: `string`,
    },
    tingkat_instansi: {
      sql: `tingkat_instansi`,
      type: `number`,
      // 1=Lokal, 2=Nasional, 3=Multinasional/Internasional
    },
    label_tingkat_instansi: {
      sql: `label_tingkat_instansi`,
      type: `string`,
    },
    kota: {
      sql: `kota`,
      type: `number`,
      // kode kota/kabupaten BPS
    },
    provinsi: {
      sql: `provinsi`,
      type: `number`,
      // kode provinsi BPS: 31=DKI Jakarta, 32=Jawa Barat
    },
    valid_from: {
      sql: `valid_from`,
      type: `time`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
    },
    flag_perusahaan: {
      sql: `flag_perusahaan`,
      type: `boolean`,
    },
  },
});