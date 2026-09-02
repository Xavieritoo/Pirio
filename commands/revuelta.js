const { SlashCommandBuilder } = require("discord.js");

const {
  ensureUser,
  updateUserFields
} = require("../database/users");

const {
  getLocalDateString,
  getDailyCommandName
} = require("../database/daily-game");

const {
  registerDailyGame,
  applyStreakMultiplier
} = require("../database/streaks");


const MAX_ATTEMPTS = 2;


const WORDS = [
  // 5-6 letras
  "mundo", "nuevo", "punto", "sonar", "brisa", "llama", "playa", "camino",
  "futbol", "jardin", "amigo", "viaje", "esfera", "dinero", "fuego", "lluvia",
  "sabado", "siesta", "puerta", "cohete", "piscina",

  // 7-8 letras
  "estrella", "mariposa", "cascada", "tormenta", "colegio", "pasarela",
  "familia", "pantera", "labrador", "castillo", "calabaza", "cocodrilo",
  "columpio", "desierto", "escenario", "explorador", "herramienta",
  "meteorito", "serpiente", "telescopio", "universidad",

  // 9-10 letras
  "aventurero", "biblioteca", "caballero", "celebracion", "compañero",
  "construccion", "crecimiento", "desarrollo", "electricidad", "emergencia",
  "enfermedad", "entrenamiento", "escalofrio", "especialista", "experiencia",
  "fotografia", "generacion", "helicoptero", "iluminacion", "imaginacion",
  "laboratorio", "maravilloso", "naturaleza", "navegacion", "observatorio",
  "oportunidad", "paracaidas", "personaje", "prehistoria", "revolucion",
  "sacapuntas", "saltamontes", "temperatura", "vacaciones",

  // 11+ letras
  "conocimiento", "deslumbrante", "descubrimiento", "encantamiento",
  "encrucijada", "espectaculo", "extraordinario", "hipopotamo",
  "impresionante", "increible", "indestructible", "investigacion",
  "murcielago", "probablemente", "protagonista", "refrigerador",
  "resplandor", "sobreviviente", "supermercado", "transportador",
  "responsabilidad", "personalidad", "probabilidad", "transformacion",
  "complicacion", "desorientacion", "experimentacion", "descomposicion",
  "extraoficialmente"
];


/*
 * ============================================================
 * PALABRA DIARIA
 * ============================================================
 */

function getDailyWord(dateString) {

  const seed =
    dateString
      .split("")
      .reduce(
        (acc, char) =>
          acc + char.charCodeAt(0),
        0
      );

  return WORDS[
    seed % WORDS.length
  ];
}


/*
 * ============================================================
 * HASH
 * ============================================================
 */

function hashStringToUint32(str) {

  let h =
    2166136261 >>> 0;

  for (
    let i = 0;
    i < str.length;
    i += 1
  ) {

    h =
      Math.imul(
        h ^ str.charCodeAt(i),
        16777619
      ) >>> 0;

  }

  return h >>> 0;
}


/*
 * ============================================================
 * SHUFFLE DETERMINISTA
 * ============================================================
 */

function seededShuffle(array, seedStr) {

  const seed =
    String(seedStr || "");

  return [...array]
    .map((v, i) => ({
      v,
      k:
        hashStringToUint32(
          `${seed}|${i}|${String(v)}`
        )
    }))
    .sort((a, b) =>
      a.k === b.k
        ? 0
        : a.k < b.k
          ? -1
          : 1
    )
    .map(
      x => x.v
    );
}


/*
 * ============================================================
 * DESORDENAR PALABRA
 * ============================================================
 */

function scrambleWord(word, seed) {

  const letters =
    word.split("");

  const shuffled =
    seededShuffle(
      letters,
      `${word}-${seed}`
    );

  /*
   * Evitar que casualmente salga la palabra original.
   */

  if (
    shuffled.join("") === word
  ) {

    return [
      ...letters.slice(1),
      letters[0]
    ].join("");

  }

  return shuffled.join("");

}


/*
 * ============================================================
 * COMANDO
 * ============================================================
 */

module.exports = {

  data:
    new SlashCommandBuilder()

      .setName("revuelta")

      .setDescription(
        "Juega Revuelta: adivina la palabra con las letras desordenadas"
      )

      .addStringOption(
        option =>
          option
            .setName("palabra")
            .setDescription(
              "Tu intento para resolver la palabra del día"
            )
            .setRequired(false)
      ),


  /*
   * ==========================================================
   * EJECUTAR REVUELTA
   * ==========================================================
   */

  async execute(interaction) {

    /*
     * ----------------------------------------------------------
     * COMPROBAR SI HOY TOCA REVUELTA
     * ----------------------------------------------------------
     */

    const dailyCommand =
      getDailyCommandName();

    if (
      dailyCommand !== "revuelta"
    ) {

      return interaction.reply({

        content:
          "❌ Hoy el minijuego de diario no es Revuelta. Usa /diario para saber cuál es el comando disponible.",

        ephemeral: true

      });

    }


    /*
     * ----------------------------------------------------------
     * DATOS DEL DÍA
     * ----------------------------------------------------------
     */

    const today =
      getLocalDateString();

    const target =
      getDailyWord(today);

    const scramble =
      scrambleWord(
        target,
        today
      );


    const guessOption =
      interaction.options.getString(
        "palabra"
      );


    /*
     * ----------------------------------------------------------
     * USUARIO
     * ----------------------------------------------------------
     */

    let user;

    try {

      user =
        await ensureUser(
          interaction.user.id,
          interaction.user.tag
        );

    } catch (error) {

      console.error(
        "Error obteniendo usuario:",
        error
      );

      return interaction.reply({

        content:
          "❌ Ha ocurrido un error al cargar tu perfil.",

        ephemeral: true

      });

    }


    /*
     * ----------------------------------------------------------
     * COMPROBAR SI YA JUGÓ HOY
     * ----------------------------------------------------------
     */

    const lastDailyDate =
      user.last_daily_date
        ? String(user.last_daily_date)
        : null;

    const alreadyPlayedToday =
      lastDailyDate === today;


    /*
     * ----------------------------------------------------------
     * SI ES UN NUEVO DÍA
     * ----------------------------------------------------------
     *
     * Reiniciamos los datos propios del minijuego.
     *
     * La racha se registra solamente cuando realmente
     * comienza la partida.
     * ----------------------------------------------------------
     */

    if (
      !alreadyPlayedToday
    ) {

      await updateUserFields(

        interaction.user.id,

        {

          daily_attempts: 0,

          daily_solved: 0,

          last_daily_date: today

        }

      );

      user.daily_attempts = 0;
      user.daily_solved = 0;
      user.last_daily_date = today;

    }


    /*
     * ----------------------------------------------------------
     * ESTADO ACTUAL
     * ----------------------------------------------------------
     */

    const currentAttempts =
      Number(
        user.daily_attempts || 0
      );

    const dailySolved =
      Number(
        user.daily_solved || 0
      );


    /*
     * ==========================================================
     * SI YA GANÓ
     * ==========================================================
     */

    if (
      dailySolved === 1
    ) {

      return interaction.reply({

        content:
          "✅ Ya has completado Revuelta de hoy. Vuelve mañana.",

        ephemeral: true

      });

    }


    /*
     * ==========================================================
     * SI YA PERDIÓ
     * ==========================================================
     *
     * Si ya ha usado todos los intentos, NO permitimos
     * realizar otro intento.
     * ==========================================================
     */

    if (
      currentAttempts >= MAX_ATTEMPTS
    ) {

      return interaction.reply({

        content:
          `💀 ${interaction.user.username} ha perdido la Revuelta de hoy.`,

        ephemeral: false

      });

    }


    /*
     * ==========================================================
     * REGISTRAR PARTIDA EN LA RACHA
     * ==========================================================
     *
     * Solo se registra una vez, cuando comienza realmente
     * el juego.
     *
     * Guardamos el resultado para conocer la racha que se
     * utilizará internamente al calcular la XP.
     *
     * El usuario nunca verá este dato.
     * ==========================================================
     */

    let streakResult = null;

    if (
      !alreadyPlayedToday
    ) {

      try {

        streakResult =
          await registerDailyGame(
            interaction.user.id
          );

      } catch (error) {

        console.error(
          "Error registrando partida diaria:",
          error
        );

        return interaction.reply({

          content:
            "❌ No se ha podido registrar tu partida diaria. Inténtalo de nuevo.",

          ephemeral: true

        });

      }

    }


    /*
     * ==========================================================
     * SIN PALABRA
     * ==========================================================
     */

    if (
      !guessOption
    ) {

      return interaction.reply({

        content:
          `🧩 La palabra de hoy es: **${scramble.toUpperCase()}**\n` +
          `🎯 Intentos: **${currentAttempts}/${MAX_ATTEMPTS}**\n\n` +
          `Usa /revuelta palabra:<tu palabra> para intentar adivinarla.`,

        ephemeral: true

      });

    }


    /*
     * ==========================================================
     * VALIDAR PALABRA
     * ==========================================================
     */

    const guess =
      guessOption
        .trim()
        .toLowerCase();


    if (
      !/^[a-zñ]+$/.test(guess) ||
      guess.length !== target.length
    ) {

      return interaction.reply({

        content:
          `❌ La palabra debe tener ${target.length} letras y solo puede contener letras sin acentos.`,

        ephemeral: true

      });

    }


    /*
     * ==========================================================
     * COMPROBAR INTENTOS ANTES DE CONSUMIR UNO
     * ==========================================================
     */

    const freshUser =
      await ensureUser(
        interaction.user.id,
        interaction.user.tag
      );

    const freshAttempts =
      Number(
        freshUser.daily_attempts || 0
      );

    const freshSolved =
      Number(
        freshUser.daily_solved || 0
      );


    if (
      freshSolved === 1
    ) {

      return interaction.reply({

        content:
          "✅ Ya has completado Revuelta de hoy. Vuelve mañana.",

        ephemeral: true

      });

    }


    if (
      freshAttempts >= MAX_ATTEMPTS
    ) {

      return interaction.reply({

        content:
          `💀 ${interaction.user.username} ha perdido la Revuelta de hoy.`,

        ephemeral: false

      });

    }


    /*
     * ==========================================================
     * NUEVO INTENTO
     * ==========================================================
     */

    const nextAttempt =
      freshAttempts + 1;


    /*
     * ==========================================================
     * ACIERTO
     * ==========================================================
     */

    if (
      guess === target
    ) {

      /*
       * --------------------------------------------------------
       * XP BASE
       * --------------------------------------------------------
       *
       * Intento 1 → 550 XP
       * Intento 2 → 500 XP
       * --------------------------------------------------------
       */

      const baseXp =
        Math.max(
          100,
          550 -
          (nextAttempt - 1) * 50
        );


      /*
       * --------------------------------------------------------
       * RACHA PARA EL MULTIPLICADOR
       * --------------------------------------------------------
       *
       * Si la partida se ha registrado en este mismo comando,
       * utilizamos la racha devuelta por registerDailyGame().
       *
       * Si la partida ya había comenzado anteriormente hoy,
       * utilizamos la racha almacenada en el usuario.
       *
       * Todo esto es interno y no se muestra al usuario.
       * --------------------------------------------------------
       */

      const streakForXp =
        streakResult &&
          Number.isFinite(
            Number(streakResult.streak)
          )
          ? Number(streakResult.streak)
          : Number(
            freshUser.daily_streak || 0
          );


      /*
       * --------------------------------------------------------
       * APLICAR MULTIPLICADOR DE RACHA
       * --------------------------------------------------------
       *
       * Ejemplo:
       *
       * 350 XP con racha 20:
       *
       * 350 × 1.10 = 385 XP
       *
       * El usuario solamente verá los 385 XP.
       * --------------------------------------------------------
       */

      const xpGain =
        applyStreakMultiplier(
          baseXp,
          streakForXp
        );


      const totalXp =
        Number(
          freshUser.xp || 0
        ) +
        xpGain;


      const nextLevel =
        Math.floor(
          totalXp / 1000
        ) + 1;


      await updateUserFields(

        interaction.user.id,

        {

          daily_attempts:
            nextAttempt,

          daily_solved:
            1,

          xp:
            totalXp,

          level:
            nextLevel,

          wins:
            Number(
              freshUser.wins || 0
            ) + 1

        },

        interaction.member

      );


      /*
       * Solo se informa de la XP final.
       *
       * NO se revela:
       *
       * - La racha.
       * - El multiplicador.
       * - La XP base.
       * - El cálculo realizado.
       */

      return interaction.reply({

        content:
          `🎉 **${interaction.user.username}** ha ganado la Revuelta de hoy y ha conseguido **${xpGain} XP**.`,

        ephemeral: false

      });

    }


    /*
     * ==========================================================
     * FALLO
     * ==========================================================
     */

    await updateUserFields(

      interaction.user.id,

      {

        daily_attempts:
          nextAttempt

      }

    );


    /*
     * ==========================================================
     * ÚLTIMO INTENTO FALLADO
     * ==========================================================
     *
     * No se muestra la palabra.
     * Solo se anuncia que ha perdido.
     * ==========================================================
     */

    if (
      nextAttempt >= MAX_ATTEMPTS
    ) {

      return interaction.reply({

        content:
          `💀 **${interaction.user.username}** ha perdido la Revuelta de hoy.`,

        ephemeral: false

      });

    }


    /*
     * ==========================================================
     * TODAVÍA QUEDA UN INTENTO
     * ==========================================================
     */

    return interaction.reply({

      content:
        `❌ **${guessOption}** no es correcta.\n\n` +
        `🎯 Intentos: **${nextAttempt}/${MAX_ATTEMPTS}**\n` +
        `🔄 Todavía tienes **${MAX_ATTEMPTS - nextAttempt}** intento(s).`,

      ephemeral: true

    });

  }

};
