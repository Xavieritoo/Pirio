# Pirio
Bot de Pirio

## Configuración de PostgreSQL

1. Crea o actualiza el archivo `.env` con la variable de conexión:
   `DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_bd`
2. Instala dependencias:
   `npm install`
3. Inicializa la base de datos:
   `npm run init-db`
4. Inicia el bot con tu comando habitual.

> Nota: el proyecto ahora usa PostgreSQL en lugar de SQLite.
