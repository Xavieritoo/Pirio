require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Error: debe configurar DATABASE_URL en el entorno.");
  process.exit(1);
}

const db = new Pool({
  connectionString,
});

db.on("error", (err) => {
  console.error("PostgreSQL idle client error:", err);
  process.exit(1);
});

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function get(sql, ...params) {
  const result = await db.query(convertPlaceholders(sql), params);
  return result.rows[0] || null;
}

async function all(sql, ...params) {
  const result = await db.query(convertPlaceholders(sql), params);
  return result.rows;
}

async function run(sql, ...params) {
  const result = await db.query(convertPlaceholders(sql), params);
  return result;
}

async function exec(sql) {
  return db.query(sql);
}

module.exports = {
  db,
  get,
  all,
  run,
  exec,
};
