const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "bot.sqlite3");
let db;
try {
  db = new Database(dbPath);
} catch (error) {
  console.error("Error al abrir SQLite:", error.message);
  process.exit(1);
}

function get(sql, ...params) {
  try {
    const stmt = db.prepare(sql);
    const row = stmt.get(...params);
    return Promise.resolve(row);
  } catch (err) {
    return Promise.reject(err);
  }
}

function all(sql, ...params) {
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return Promise.resolve(rows);
  } catch (err) {
    return Promise.reject(err);
  }
}

function run(sql, ...params) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      resolve(info);
    } catch (err) {
      reject(err);
    }
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    try {
      db.exec(sql);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  db,
  get,
  all,
  run,
  exec
};
