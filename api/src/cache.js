const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  lazyConnect: true,
});

redis.on('error', (err) => {
  // No crashear la app si Redis no está disponible
  console.error('[REDIS] Error de conexión:', err.message);
});

const TTL_SECONDS = parseInt(process.env.CACHE_TTL || '300');

const KEYS = {
  VACUNACION_PENDIENTE: 'vacunacion_pendiente',
};

async function get(key) {
  try {
    const val = await redis.get(key);
    if (val !== null) {
      console.log(`[CACHE HIT]  ${key} — ${new Date().toISOString()}`);
      return JSON.parse(val);
    }
    console.log(`[CACHE MISS] ${key} — ${new Date().toISOString()}`);
    return null;
  } catch (err) {
    console.error(`[CACHE] Error al leer ${key}:`, err.message);
    return null; // Fail open: si Redis falla, consulta BD
  }
}

async function set(key, value) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', TTL_SECONDS);
    console.log(`[CACHE SET]  ${key} TTL=${TTL_SECONDS}s — ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[CACHE] Error al escribir ${key}:`, err.message);
  }
}

async function invalidate(key) {
  try {
    await redis.del(key);
    console.log(`[CACHE INVALIDADO] ${key} — ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[CACHE] Error al invalidar ${key}:`, err.message);
  }
}

module.exports = { get, set, invalidate, KEYS };