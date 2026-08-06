require("dotenv").config();
const { db } = require("./db");

async function main() {
  try {
    const result = await db.query("SELECT current_database() AS db, current_user AS user");
    console.log("Conexión OK:", result.rows[0]);

    const tableResult = await db.query(`
      SELECT to_regclass('public.users') AS users_table
    `);
    console.log("Tabla users:", tableResult.rows[0]);

    const columnsResult = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log("Columnas:", columnsResult.rows.map((row) => row.column_name));
  } catch (err) {
    console.error("Error de comprobación de base de datos:", err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
