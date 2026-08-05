const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const schemaPath = path.join(__dirname, "schema.sql");
const dbPath = path.join(__dirname, "bot.sqlite3");

if (!fs.existsSync(schemaPath)) {
  console.error(`No se encontró el archivo de esquema: ${schemaPath}`);
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, "utf8");
const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("Error al abrir la base de datos:", error.message);
    process.exit(1);
  }

  db.serialize(() => {
    db.exec(schema, (execError) => {
      if (execError) {
        console.error("Error al ejecutar el esquema SQL:", execError.message);
        process.exit(1);
      }

      db.all("PRAGMA table_info(users)", (infoError, rows) => {
        if (infoError) {
          console.error("Error al leer la estructura de la tabla users:", infoError.message);
          process.exit(1);
        }

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
            db.run(
              `ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`,
              (alterError) => {
                if (alterError) {
                  console.error(
                    `Error al agregar la columna ${column.name}:`,
                    alterError.message
                  );
                  process.exit(1);
                }
              }
            );
            added.push(column.name);
          }
        });

        const message = `Base de datos creada o actualizada en: ${dbPath}`;
        console.log(message + (added.length ? ` (columnas agregadas: ${added.join(", ")})` : ""));
        db.close((closeError) => {
          if (closeError) {
            console.error("Error al cerrar la base de datos:", closeError.message);
            process.exit(1);
          }
        });
      });
    });
  });
});
