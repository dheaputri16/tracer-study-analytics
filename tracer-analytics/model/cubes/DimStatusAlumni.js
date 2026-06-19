cube(`DimStatusAlumni`, {
  sql_table: `public.dim_status_alumni`,

  // SCD Pattern:
  // status_alumni_sk = surrogate key SERIAL (FK di fact_tracer_study)
  // id_status_alumni = natural/business key INT

  dimensions: {
    // ── Surrogate Key ─────────────────────────────────────────
    status_alumni_sk: {
      sql: `status_alumni_sk`,
      type: `number`,
      primary_key: true,    // FK di fact: status_alumni_sk → dim_status_alumni.status_alumni_sk
    },
    // ── Natural Key ───────────────────────────────────────────
    id_status_alumni: {
      sql: `id_status_alumni`,
      type: `string`,
      // 1=Bekerja, 2=Belum memungkinkan, 3=Wiraswasta,
      // 4=Melanjutkan Pendidikan, 5=Tidak kerja tapi mencari
    },
    label: {
      sql: `label`,
      type: `string`,
    },
  },
});