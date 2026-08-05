const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { promisify } = require("util");

const dbPath = path.join(__dirname, "bot.sqlite3");
const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("Error al abrir SQLite:", error.message);
    process.exit(1);
  }
});

const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

function run(sql, ...params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  get,
  all,
  run,
  exec
};
