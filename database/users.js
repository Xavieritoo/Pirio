const {
  get,
  all,
  run
} = require("./db");

const {
  syncLevelRole
} = require("./rango");

const {
  notifyLevelUp
} = require("./nivel");


/*
============================================================
CONFIGURACIÓN DE XP
============================================================
*/

const BASE_LEVEL_XP = 700;

const LEVEL_XP_INCREMENT = 100;


/*
============================================================
CALCULAR XP NECESARIA PARA EL SIGUIENTE NIVEL
============================================================
*/

function getXpForNextLevel(level) {

  return (
    BASE_LEVEL_XP +
    ((level - 1) * LEVEL_XP_INCREMENT)
  );

}


/*
============================================================
CALCULAR XP ACUMULADA NECESARIA PARA ALCANZAR UN NIVEL
============================================================
*/

function getTotalXpForLevel(level) {

  if (
    level <= 1
  ) {

    return 0;

  }


  let totalXp = 0;


  for (
    let currentLevel = 1;
    currentLevel < level;
    currentLevel++
  ) {

    totalXp +=
      getXpForNextLevel(
        currentLevel
      );

  }


  return totalXp;

}


/*
============================================================
CALCULAR NIVEL A PARTIR DE XP ACUMULADA
============================================================
*/

function getLevelFromXp(xp) {

  const totalXp =
    Math.max(
      0,
      Number(xp || 0)
    );


  let level = 1;


  while (
    totalXp >=
    getTotalXpForLevel(
      level + 1
    )
  ) {

    level++;

  }


  return level;

}


/*
============================================================
FORMATEAR FECHA
============================================================

IMPORTANTE:

Las columnas DATE de PostgreSQL pueden llegar como:

    "2026-08-29"

o como:

    Date("2026-08-29T00:00:00.000Z")

Para los diarios necesitamos SIEMPRE:

    "2026-08-29"

Nunca:

    "2026-08-29T00:00:00.000Z"

============================================================
*/

function formatDate(value) {

  if (!value) {

    return null;

  }


  /*
   * PostgreSQL puede devolver directamente
   * una cadena.
   */

  if (
    typeof value === "string"
  ) {

    /*
     * Si ya es YYYY-MM-DD,
     * la devolvemos directamente.
     */

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

      return value;

    }


    /*
     * Si contiene una fecha ISO,
     * nos quedamos únicamente con YYYY-MM-DD.
     */

    const match =
      value.match(
        /^(\d{4}-\d{2}-\d{2})/
      );


    if (
      match
    ) {

      return match[1];

    }


    return value;

  }


  /*
   * PostgreSQL también puede devolver DATE
   * como objeto Date dependiendo del driver.
   *
   * IMPORTANTE:
   * usamos los componentes locales para evitar
   * problemas de zona horaria.
   */

  if (
    value instanceof Date
  ) {

    return [

      value.getFullYear(),

      String(
        value.getMonth() + 1
      ).padStart(2, "0"),

      String(
        value.getDate()
      ).padStart(2, "0")

    ].join("-");

  }


  return String(value);

}


/*
============================================================
NORMALIZAR USUARIO
============================================================
*/

function normalizeUser(user) {

  if (!user) {

    return null;

  }


  const xp =
    Number(
      user.xp || 0
    );


  /*
   * El nivel siempre se calcula a partir
   * de la XP acumulada.
   */

  const level =
    getLevelFromXp(
      xp
    );


  return {

    ...user,


    /*
     * ======================================================
     * EXPERIENCIA
     * ======================================================
     */

    xp:
      xp,


    /*
     * ======================================================
     * NIVEL
     * ======================================================
     */

    level:
      level,


    /*
     * ======================================================
     * VICTORIAS
     * ======================================================
     */

    wins:
      Number(
        user.wins || 0
      ),


    /*
     * ======================================================
     * INTENTOS DIARIOS
     * ======================================================
     */

    daily_attempts:
      Number(
        user.daily_attempts || 0
      ),


    /*
     * ======================================================
     * DIARIOS RESUELTOS
     * ======================================================
     */

    daily_solved:
      Number(
        user.daily_solved || 0
      ),


    /*
     * ======================================================
     * RACHA
     * ======================================================
     */

    daily_streak:
      Number(
        user.daily_streak || 0
      ),


    /*
     * ======================================================
     * ÚLTIMA FECHA DE RACHA
     * ======================================================
     */

    streak_last_date:
      formatDate(
        user.streak_last_date
      ),


    /*
     * ======================================================
     * ÚLTIMO DIARIO
     * ======================================================
     */

    last_daily_date:
      formatDate(
        user.last_daily_date
      ),


    /*
     * ======================================================
     * ÚLTIMA MINERÍA
     * ======================================================
     */

    last_mining_date:
      formatDate(
        user.last_mining_date
      ),


    /*
     * ======================================================
     * MINERAL MÁS VALIOSO
     * ======================================================
     */

    most_valuable_mineral:
      user.most_valuable_mineral ||
      null,


    /*
     * ======================================================
     * VOZ
     * ======================================================
     */

    voice_joined_at:
      formatDate(
        user.voice_joined_at
      ),


    last_voice_xp_at:
      formatDate(
        user.last_voice_xp_at
      )

  };

}


/*
============================================================
OBTENER USUARIO
============================================================
*/

async function getUserByDiscordId(
  discordId
) {

  const user =
    await get(

      "SELECT * FROM users WHERE discord_id = ?",

      discordId

    );


  return normalizeUser(
    user
  );

}


/*
============================================================
CREAR USUARIO
============================================================
*/

async function createUser(
  discordId,
  username
) {

  await run(

    `
    INSERT INTO users
  (
    discord_id,
    username
  )

VALUES
  (
      ?,
      ?
)
  `,

    discordId,

    username

  );


  return getUserByDiscordId(
    discordId
  );

}


/*
============================================================
ASEGURAR USUARIO
============================================================

El tercer parámetro "member" es opcional.

Si se proporciona el miembro de Discord,
también se sincronizan sus rangos.

IMPORTANTE:

Aquí NO se notifican subidas de nivel.

ensureUser() puede ejecutarse muchas veces y su función
es simplemente asegurarse de que el usuario y su rango
están correctamente sincronizados.

============================================================
*/

async function ensureUser(
  discordId,
  username,
  member = null
) {

  let user =
    await getUserByDiscordId(
      discordId
    );


  /*
   * ========================================================
   * USUARIO NUEVO
   * ========================================================
   */

  if (!user) {

    user =
      await createUser(

        discordId,

        username

      );

  }


  /*
   * ========================================================
   * ACTUALIZAR NOMBRE
   * ========================================================
   */

  else if (
    user.username !== username
  ) {

    await run(

      `
      UPDATE users

SET
username = ?,
  updated_at = CURRENT_TIMESTAMP

      WHERE discord_id = ?
  `,

      username,

      discordId

    );


    user =
      await getUserByDiscordId(
        discordId
      );

  }


  /*
   * ========================================================
   * SINCRONIZAR RANGO
   * ========================================================
   */

  if (
    member
  ) {

    try {

      await syncLevelRole(

        member,

        user.level

      );

    } catch (error) {

      console.error(
        "Error sincronizando rango al asegurar usuario:",
        error
      );

    }

  }


  return user;

}


/*
============================================================
AÑADIR XP
============================================================
*/

async function addXp(
  discordId,
  amount,
  member = null
) {

  const xpAmount =
    Number(
      amount || 0
    );


  /*
   * No permitimos añadir XP negativa.
   */

  if (
    xpAmount <= 0
  ) {

    return getUserByDiscordId(
      discordId
    );

  }


  /*
   * ========================================================
   * OBTENER USUARIO
   * ========================================================
   */

  const user =
    await getUserByDiscordId(
      discordId
    );


  if (!user) {

    throw new Error(
      `No existe el usuario ${ discordId } al intentar añadir XP.`
    );

  }


  /*
   * ========================================================
   * XP ANTERIOR
   * ========================================================
   */

  const oldXp =
    Number(
      user.xp || 0
    );


  /*
   * ========================================================
   * NIVEL ANTERIOR
   * ========================================================
   */

  const oldLevel =
    getLevelFromXp(
      oldXp
    );


  /*
   * ========================================================
   * NUEVA XP
   * ========================================================
   */

  const newXp =
    oldXp +
    xpAmount;


  /*
   * ========================================================
   * NUEVO NIVEL
   * ========================================================
   */

  const newLevel =
    getLevelFromXp(
      newXp
    );


  /*
   * ========================================================
   * GUARDAR XP Y NIVEL
   * ========================================================
   */

  await run(

    `
    UPDATE users

SET
xp = ?,
  level = ?,
  updated_at = CURRENT_TIMESTAMP

    WHERE discord_id = ?
  `,

    newXp,

    newLevel,

    discordId

  );


  /*
   * ========================================================
   * SINCRONIZAR RANGO
   * ========================================================
   */

  if (
    member
  ) {

    try {

      await syncLevelRole(

        member,

        newLevel

      );

    } catch (error) {

      console.error(
        "Error sincronizando rango después de modificar XP:",
        error
      );

    }

  }


  /*
   * ========================================================
   * NOTIFICAR SUBIDA DE NIVEL
   * ========================================================
   *
   * Solo se ejecuta si realmente ha subido de nivel.
   *
   * nivel.js se encarga de comprobar además si ha
   * conseguido un nuevo rango.
   *
   * ========================================================
   */

  if (
    member &&
    newLevel > oldLevel
  ) {

    try {

      await notifyLevelUp(

        member,

        oldLevel,

        newLevel

      );

    } catch (error) {

      console.error(
        "Error enviando notificación de subida de nivel:",
        error
      );

    }

  }


  /*
   * ========================================================
   * DEVOLVER USUARIO ACTUALIZADO
   * ========================================================
   */

  const updatedUser =
    await getUserByDiscordId(
      discordId
    );


  return {

    user:
      updatedUser,

    oldXp:
      oldXp,

    newXp:
      newXp,

    oldLevel:
      oldLevel,

    newLevel:
      newLevel,

    leveledUp:
      newLevel > oldLevel,

    leveledDown:
      newLevel < oldLevel

  };

}


/*
============================================================
ACTUALIZAR CAMPOS
============================================================

El tercer parámetro "member" permite sincronizar
los rangos y notificar una subida cuando se modifica
directamente la XP.

============================================================
*/

async function updateUserFields(
  discordId,
  fields,
  member = null
) {

  /*
   * ========================================================
   * COPIAR CAMPOS
   * ========================================================
   */

  const updatedFields = {
    ...fields
  };


  let keys =
    Object.keys(
      updatedFields
    );


  if (
    !keys.length
  ) {

    return;

  }


  /*
   * ========================================================
   * OBTENER NIVEL ACTUAL
   * ========================================================
   */

  const currentUser =
    await getUserByDiscordId(
      discordId
    );


  const oldLevel =
    currentUser
      ? Number(currentUser.level || 1)
      : 1;


  /*
   * ========================================================
   * SI SE MODIFICA XP
   * ========================================================
   */

  if (
    Object.prototype.hasOwnProperty.call(
      updatedFields,
      "xp"
    )
  ) {

    const newXp =
      Math.max(
        0,
        Number(
          updatedFields.xp || 0
        )
      );


    updatedFields.xp =
      newXp;


    updatedFields.level =
      getLevelFromXp(
        newXp
      );

  }


  /*
   * Volvemos a obtener las claves.
   */

  keys =
    Object.keys(
      updatedFields
    );


  /*
   * ========================================================
   * PREPARAR UPDATE
   * ========================================================
   */

  const assignments =
    keys

      .map(

        key =>

          `${ key } = ?`

      )

      .join(
        ", "
      );


  const params =
    keys.map(

      key =>

        updatedFields[key]

    );


  params.push(
    discordId
  );


  /*
   * ========================================================
   * ACTUALIZAR BASE DE DATOS
   * ========================================================
   */

  await run(

    `
    UPDATE users

SET
      ${ assignments },
updated_at = CURRENT_TIMESTAMP

    WHERE discord_id = ?
  `,

    ...params

  );


  /*
   * ========================================================
   * OBTENER USUARIO ACTUALIZADO
   * ========================================================
   */

  const updatedUser =
    await getUserByDiscordId(
      discordId
    );


  /*
   * ========================================================
   * SINCRONIZAR RANGO
   * ========================================================
   */

  if (
    member &&
    updatedUser
  ) {

    try {

      await syncLevelRole(

        member,

        updatedUser.level

      );

    } catch (error) {

      console.error(
        "Error sincronizando rango después de actualizar usuario:",
        error
      );

    }


    /*
     * ======================================================
     * NOTIFICAR SUBIDA DE NIVEL
     * ======================================================
     */

    if (
      updatedUser.level > oldLevel
    ) {

      try {

        await notifyLevelUp(

          member,

          oldLevel,

          updatedUser.level

        );

      } catch (error) {

        console.error(
          "Error enviando notificación de subida de nivel:",
          error
        );

      }

    }

  }


  /*
   * ========================================================
   * DEVOLVER USUARIO ACTUALIZADO
   * ========================================================
   */

  return updatedUser;

}


/*
============================================================
TOP DE EXPERIENCIA
============================================================
*/

async function getTopUsers(
  limit = 10
) {

  return all(

    `
    SELECT
username,
  xp,
  wins

    FROM users

    ORDER BY
      xp DESC,
  wins DESC

LIMIT ?
  `,

    limit

  );

}


/*
============================================================
TOP DE OBJETOS DE MINERÍA
============================================================
*/

async function getMiningTop() {

  return all(

    `
    SELECT
discord_id,
  username,
  most_valuable_mineral

    FROM users

WHERE
      most_valuable_mineral IS NOT NULL
  `

  );

}


/*
============================================================
EXPORTS
============================================================
*/

module.exports = {

  getUserByDiscordId,

  ensureUser,

  updateUserFields,

  addXp,

  getTopUsers,

  getMiningTop,

  getXpForNextLevel,

  getTotalXpForLevel,

  getLevelFromXp

};
