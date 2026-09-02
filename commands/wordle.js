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


/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const MAX_ATTEMPTS = 6;


/*
 * ============================================================
 * PALABRAS
 * ============================================================
 */

const WORDS = [
  "abrir", "acero", "actor", "agudo", "aguila", "alado", "almas",
  "amigo", "animo", "antes", "apoyo", "arbol", "arena", "arroz",
  "aviso", "avion", "ayuda", "azote",
  "bajar", "banco", "barco", "barro", "besar", "bicho", "blusa",
  "boca", "broma", "bueno", "burro",
  "cable", "calle", "calor", "campo", "canto", "carga", "carne",
  "casco", "causa", "cazar", "cebra", "cerca", "cerdo", "cielo",
  "cinco", "cinta", "claro", "clase", "clave", "cobre", "coche",
  "comer", "coral", "corre", "corto", "cosas", "costa", "crema",
  "crudo", "cruce", "cuero", "cueva", "culpa", "curva",
  "danza", "datos", "deber", "dejar", "desde", "dieta", "donde",
  "dosis", "dulce",
  "enero", "error", "estar", "etapa", "extra",
  "falta", "favor", "fecha", "feria", "fiera", "final", "firme",
  "fuego", "fumar",
  "ganar", "gasto", "gente", "girar", "golpe", "grano", "grasa",
  "grave", "grito", "grupo", "guapo", "gusto",
  "habla", "hacer", "harto", "hasta", "hecho", "herir", "huevo",
  "hogar", "hotel", "humor",
  "igual", "ideas",
  "jugar", "junta", "justo",
  "largo", "lavar", "leche", "lento", "libro", "limon", "linda",
  "lista", "llave", "llama", "lloro", "lucha", "lugar", "luzco",
  "madre", "magia", "mango", "marca", "marco", "matar", "medio",
  "mejor", "menos", "mente", "meses", "metal", "metro", "mirar",
  "mismo", "monto", "monte", "motor", "mundo",
  "nacer", "nadar", "nieve", "nivel", "noche", "negro", "noble",
  "novio", "nuevo", "nubes", "nunca",
  "ojala", "orden",
  "padre", "papel", "pared", "parte", "pasar", "paseo", "pasta",
  "patio", "peaje", "pelea", "perro", "pesca", "pieza", "piano",
  "pista", "plata", "plomo", "pluma", "poder", "pollo", "poner",
  "punto",
  "quedar", "quedo", "queso", "quien",
  "radio", "rapto", "raton", "razon", "regla", "reloj", "resto",
  "rango", "rival", "robar", "rueda", "ruido", "ruteo",
  "saber", "sacar", "salir", "salto", "salud", "salsa", "sello",
  "secar", "silla", "sobre", "sonar", "suave", "suelo", "sueca",
  "sueño",
  "tarde", "techo", "temer", "temor", "tener", "tiempo", "tirar",
  "tocar", "torre", "total", "trato", "truco",
  "unico", "usted",
  "valor", "vapor", "verde", "viaje", "viejo", "vista", "votar",
  "vuelo", "yerno", "zorro"
];


const VALID_WORDS =
  WORDS.filter(
    word =>
      /^[a-zñ]{5}$/.test(word)
  );


if (
  VALID_WORDS.length === 0
) {

  throw new Error(
    "No hay palabras válidas para Wordle."
  );

}


/*
 * ============================================================
 * EMOJIS DE LETRAS
 * ============================================================
 *
 * Se utilizan emojis Unicode para representar las letras.
 *
 * Discord no dispone de una versión cuadrada Unicode para
 * todas las letras del alfabeto, por lo que se utilizan las
 * variantes disponibles más parecidas visualmente.
 *
 * ============================================================
 */

const LETTER_EMOJIS = {

  a: "🅰️",
  b: "🅱️",
  c: "©️",
  d: "🔤",
  e: "📧",
  f: "🅵",
  g: "🅶",
  h: "🅷",
  i: "ℹ️",
  j: "🅹",
  k: "🅺",
  l: "🅻",
  m: "Ⓜ️",
  n: "🅽",
  o: "🅾️",
  p: "🅿️",
  q: "🇶",
  r: "®️",
  s: "🆂",
  t: "🆃",
  u: "🆄",
  v: "🆅",
  w: "🆆",
  x: "❎",
  y: "🆈",
  z: "🆉",

  ñ: "🇪🇸"

};


/*
 * ============================================================
 * ESTADOS
 * ============================================================
 */

const EMOJIS = {

  correct: "🟩",

  present: "🟨",

  absent: "⬛"

};


/*
 * ============================================================
 * CONVERTIR PALABRA A EMOJIS
 * ============================================================
 */

function wordToEmojis(word) {

  return word
    .split("")
    .map(
      letter =>
        LETTER_EMOJIS[letter] || letter.toUpperCase()
    )
    .join(" ");

}


/*
 * ============================================================
 * OBTENER PALABRA DEL DÍA
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


  return VALID_WORDS[
    seed % VALID_WORDS.length
  ];

}


/*
 * ============================================================
 * OBTENER PISTAS
 * ============================================================
 */

function getFeedback(
  guess,
  target
) {

  const feedback =
    Array(5).fill("absent");


  const targetChars =
    target.split("");


  /*
   * ========================================================
   * LETRAS CORRECTAS
   * ========================================================
   */

  for (
    let i = 0;
    i < 5;
    i += 1
  ) {

    if (
      guess[i] ===
      target[i]
    ) {

      feedback[i] =
        "correct";

      targetChars[i] =
        null;

    }

  }


  /*
   * ========================================================
   * LETRAS PRESENTES
   * ========================================================
   */

  for (
    let i = 0;
    i < 5;
    i += 1
  ) {

    if (
      feedback[i] !==
      "correct"
    ) {

      const index =
        targetChars.indexOf(
          guess[i]
        );


      if (
        index !== -1
      ) {

        feedback[i] =
          "present";

        targetChars[index] =
          null;

      }

    }

  }


  return feedback
    .map(
      status =>
        EMOJIS[status]
    )
    .join(" ");

}


/*
 * ============================================================
 * CREAR FILA DEL WORDLE
 * ============================================================
 *
 * Ejemplo:
 *
 * 🅿️ 🅴 🆁 🆁 🅾️
 * 🟩 ⬛ 🟨 ⬛ 🟩
 *
 * ============================================================
 */

function createWordleRow(
  guess,
  feedback
) {

  const letters =
    wordToEmojis(
      guess
    );


  return (
    `${letters}\n` +
    `${feedback}`
  );

}


/*
 * ============================================================
 * COMANDO
 * ============================================================
 */

module.exports = {

  data:

    new SlashCommandBuilder()

      .setName(
        "wordle"
      )

      .setDescription(
        "Juega el Wordle diario en español"
      )

      .addStringOption(
        option =>
          option
            .setName(
              "palabra"
            )
            .setDescription(
              "Intenta una palabra de 5 letras sin acentos"
            )
            .setRequired(
              true
            )
      ),


  async execute(
    interaction
  ) {

    /*
     * ====================================================
     * COMPROBAR MINIJUEGO DIARIO
     * ====================================================
     */

    const dailyCommand =
      getDailyCommandName();


    if (
      dailyCommand !==
      "wordle"
    ) {

      return interaction.reply({

        content:
          "❌ Hoy el minijuego de diario no es Wordle. Usa `/diario` para saber cuál es el comando disponible.",

        ephemeral: true

      });

    }


    /*
     * ====================================================
     * OBTENER Y VALIDAR PALABRA
     * ====================================================
     */

    const guess =
      interaction.options
        .getString("palabra")
        .trim()
        .toLowerCase();


    if (
      !/^[a-zñ]{5}$/.test(
        guess
      )
    ) {

      return interaction.reply({

        content:
          "❌ La palabra debe tener 5 letras y solo puede incluir letras sin acentos.",

        ephemeral: true

      });

    }


    /*
     * ====================================================
     * DATOS DEL DÍA
     * ====================================================
     */

    const today =
      getLocalDateString();


    const target =
      getDailyWord(
        today
      );


    /*
     * ====================================================
     * ASEGURAR USUARIO
     * ====================================================
     */

    const user =
      await ensureUser(

        interaction.user.id,

        interaction.user.tag

      );


    /*
     * ====================================================
     * DATOS DIARIOS ACTUALES
     * ====================================================
 */

    let currentAttempts =
      Number(
        user.daily_attempts || 0
      );


    let dailySolved =
      Number(
        user.daily_solved || 0
      );


    /*
     * ====================================================
     * REGISTRAR RACHA
     * ====================================================
     */

    let streakResult;

    try {

      streakResult =
        await registerDailyGame(
          interaction.user.id
        );

    } catch (error) {

      console.error(
        "Error registrando racha de Wordle:",
        error
      );


      return interaction.reply({

        content:
          "❌ Ha ocurrido un error al registrar tu partida. Inténtalo de nuevo.",

        ephemeral: true

      });

    }


    /*
     * ====================================================
     * NUEVO DÍA
     * ====================================================
 */

    if (
      !streakResult.alreadyPlayed
    ) {

      currentAttempts = 0;

      dailySolved = 0;


      await updateUserFields(

        interaction.user.id,

        {

          daily_attempts:
            0,

          daily_solved:
            0

        }

      );

    }


    /*
     * ====================================================
     * COMPROBAR SI YA COMPLETÓ WORDLE
     * ====================================================
 */

    if (
      dailySolved === 1
    ) {

      return interaction.reply({

        content:
          "✅ Ya has completado el Wordle diario de hoy. Vuelve mañana con uno nuevo.",

        ephemeral: true

      });

    }


    /*
     * ====================================================
     * COMPROBAR INTENTOS
     * ====================================================
 */

    if (
      currentAttempts >=
      MAX_ATTEMPTS
    ) {

      return interaction.reply({

        content:
          `❌ ${interaction.user.username} ha perdido el Wordle de hoy.`,

        ephemeral: true

      });

    }


    /*
     * ====================================================
     * SIGUIENTE INTENTO
     * ====================================================
 */

    const nextAttempt =
      currentAttempts + 1;


    const feedback =
      getFeedback(
        guess,
        target
      );


    const wordleRow =
      createWordleRow(
        guess,
        feedback
      );


    /*
     * ====================================================
     * PALABRA CORRECTA
     * ====================================================
 */

    if (
      guess ===
      target
    ) {

      /*
       * =================================================
       * XP BASE
       * =================================================
       *
       * 1º intento -> 900 XP
       * 2º intento -> 850 XP
       * 3º intento -> 800 XP
       * 4º intento -> 750 XP
       * 5º intento -> 700 XP
       * 6º intento -> 650 XP
       *
       * =================================================
       */

      const baseXpGain =
        900 -
        (
          nextAttempt - 1
        ) * 50;


      /*
       * =================================================
       * MULTIPLICADOR DE RACHA
       * =================================================
       */

      const xpGain =
        applyStreakMultiplier(

          baseXpGain,

          streakResult.streak

        );


      /*
       * =================================================
       * SUMAR XP
       * =================================================
       */

      const totalXp =
        Number(
          user.xp || 0
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

          xp:
            totalXp,

          level:
            nextLevel,

          wins:
            Number(
              user.wins || 0
            ) + 1,

          daily_solved:
            1

        },

        interaction.member

      );


      /*
       * =================================================
       * MENSAJE DE VICTORIA
       * =================================================
 */

      return interaction.reply({

        content:

          `🎉 ¡${interaction.user.username} ha acertado el Wordle de hoy y gana **${xpGain} XP**! 🎉`,

        ephemeral: false

      });

    }


    /*
     * ====================================================
     * RESPUESTA INCORRECTA
     * ====================================================
 */

    await updateUserFields(

      interaction.user.id,

      {

        daily_attempts:
          nextAttempt

      }

    );


    /*
     * ====================================================
     * AGOTÓ LOS INTENTOS
     * ====================================================
 */

    if (
      nextAttempt >=
      MAX_ATTEMPTS
    ) {

      return interaction.reply({

        content:

          `💀 ${interaction.user.username} ha perdido el Wordle de hoy.`,

        ephemeral: false

      });

    }


    /*
     * ====================================================
     * SIGUIENTE INTENTO
     * ====================================================
 */

    return interaction.reply({

      content:

        `Intento ${nextAttempt}/${MAX_ATTEMPTS}:\n\n` +

        `${wordleRow}\n\n` +

        `Sigue intentando.`,

      ephemeral: true

    });

  }

};