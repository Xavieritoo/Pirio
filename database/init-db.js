const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const schemaPath = path.join(__dirname, "schema.sql");
const dbPath = path.join(__dirname, "bot.sqlite3");

if (!fs.existsSync(schemaPath)) {
  console.error(`No se encontró el archivo de esquema: ${schemaPath}`);
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, "utf8");
let db;
try {
  db = new Database(dbPath);
  db.exec(schema);

  const rows = db.prepare("PRAGMA table_info(users)").all();
  const existingColumns = rows.map((row) => row.name);
  const migrations = [
    {
      name: "daily_attempts",
      definition: "INTEGER NOT NULL DEFAULT 0"
    },
    {
      name: "daily_solved",
      definition: "INTEGER NOT NULL DEFAULT 0"
    }
  ];

  const added = [];
  migrations.forEach((column) => {
    if (!existingColumns.includes(column.name)) {
      db.prepare(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`).run();
      added.push(column.name);
    }
  });

  const message = `Base de datos creada o actualizada en: ${dbPath}`;
  console.log(message + (added.length ? ` (columnas agregadas: ${added.join(", ")})` : ""));
} catch (err) {
  console.error("Error al inicializar la base de datos:", err.message);
  process.exit(1);
} finally {
  if (db) db.close();
}
