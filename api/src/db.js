const { Pool } = require('pg');
require('dotenv').config();

const baseConfig = {
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB       || 'clinica_vet',
};

const pools = {
  vet: new Pool({
    ...baseConfig,
    user:     process.env.PG_VET_USER     || 'vet_user',
    password: process.env.PG_VET_PASS     || 'vet_dev_2026',
  }),
  recepcion: new Pool({
    ...baseConfig,
    user:     process.env.PG_RECEP_USER   || 'recepcion_user',
    password: process.env.PG_RECEP_PASS   || 'recepcion_dev_2026',
  }),
  admin: new Pool({
    ...baseConfig,
    user:     process.env.PG_ADMIN_USER   || 'admin_user',
    password: process.env.PG_ADMIN_PASS   || 'admin_dev_2026',
  }),
};

/**
 * Ejecuta una query de forma segura en el pool del rol indicado.
 * Si el rol es 'vet', setea app.current_vet_id en la misma
 * transacción para que las políticas RLS filtren correctamente.
 *
 * @param {string} role        - 'vet' | 'recepcion' | 'admin'
 * @param {number|null} vetId  - id del veterinario (solo para vet)
 * @param {string} sql         - Query parametrizada
 * @param {Array}  params      - Parámetros posicionales ($1, $2, ...)
 */
async function query(role, vetId, sql, params = []) {
  const pool = pools[role];
  if (!pool) throw new Error(`Rol desconocido: ${role}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (role === 'vet' && vetId != null) {
      await client.query(
        `SELECT set_config('app.current_vet_id', $1, true)`,
        [String(vetId)]   
      );
    }

    const result = await client.query(sql, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query };