cube(`DimStatusAlumni`, {
  sql_table: `public.dim_status_alumni`,

  dimensions: {
    id_status_alumni: {
      sql: `id_status_alumni`,
      type: `number`,
      primary_key: true,
    },
    label: {
      sql: `label`,
      type: `string`,
    },
    valid_from: {
      sql: `valid_from`,
      type: `time`,
    },
    valid_to: {
      sql: `valid_to`,
      type: `time`,
    },
    flag_status: {
      sql: `flag_status`,
      type: `boolean`,
    },
  },
});