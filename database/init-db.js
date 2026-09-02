require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { db, exec } = require("./db");

const schemaPath = path.join(__dirname, "schema.sql");

if (!fs.existsSync(schemaPath)) {
  console.error(`No se encontró el archivo de esquema: ${schemaPath}`);
  process.exit(1);
}

async function initDatabase() {
  const schema = fs.readFileSync(schemaPath, "utf8");

  try {
    await exec(schema);

    const result = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = current_schema()`
    );
    const existingColumns = result.rows.map((row) => row.column_name);
    const migrations = [
      {
        name: "daily_attempts",
        definition: "INTEGER NOT NULL DEFAULT 0",
      },
      {
        name: "daily_solved",
        definition: "INTEGER NOT NULL DEFAULT 0",
      },
      {
        name: "daily_streak",
        definition: "INTEGER NOT NULL DEFAULT 0",
      },
    ];

    const added = [];
    for (const column of migrations) {
      if (!existingColumns.includes(column.name)) {
        await exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`);
        added.push(column.name);
      }
    }

    const message = `Base de datos creada o actualizada en PostgreSQL: ${process.env.DATABASE_URL}`;
    console.log(message + (added.length ? ` (columnas agregadas: ${added.join(", ")})` : ""));
  } catch (err) {
    console.error("Error al inicializar la base de datos:", err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

initDatabase();
