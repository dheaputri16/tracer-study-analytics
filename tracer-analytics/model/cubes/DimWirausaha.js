cube(`DimWirausaha`, {
  sql_table: `public.dim_wirausaha`,

  dimensions: {
    id_wirausaha: {
      sql: `id_wirausaha`,
      type: `number`,
      primary_key: true,
    },
    provinsi: {
      sql: `provinsi`,
      type: `number`,
      // kode provinsi BPS
    },
    kota_kabupaten: {
      sql: `kota_kabupaten`,
      type: `number`,
      // kode kota/kabupaten BPS
    },
    kode_jabatan: {
      sql: `kode_jabatan`,
      type: `number`,
    },
    jabatan: {
      sql: `jabatan`,
      type: `string`,
      // VARCHAR(50): Owner, Founder, Freelancer, dst
    },
    tingkat_instansi: {
      sql: `tingkat_instansi`,
      type: `number`,
    },
    label_tingkat_instansi: {
      sql: `label_tingkat_instansi`,
      type: `string`,
      // VARCHAR(50): Lokal/wilayah/..., Nasional/..., dst
    },
    valid_from: {
      sql: `valid_from`,
      type: `time`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
    },
    flag_wirausaha: {
      sql: `flag_wirausaha`,
      type: `boolean`,
    },
  },
});