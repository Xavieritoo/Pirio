const { SlashCommandBuilder } = require("discord.js");
const { ensureUser, updateUserFields } = require("../database/users");
const { getLocalDateString, getDailyCommandName } = require("../database/daily-game");

const WORDS = [
  "amigo", "salud", "mundo", "feliz", "grato", "novio", "plomo",
  "libro", "sueño", "noche", "tarde", "verde", "drama",
  "perro", "coche", "playa", "llave", "pinto", "cobra",
  "luzco", "brisa", "quedo", "sabor", "sueca", "dulce", "vapor",
  "rapto", "piano", "noble", "hecho", "buena", "amena", "huevo", "truco",
  "grito", "pista", "llama", "rango", "salsa", "sello", "dieta", "clima",
  "lloro", "lucha", "firme", "peaje", "culto", "sonar", "arena", "punto",
  "crudo", "salir", "matar", "ojala", "carta", "bravo", "ruteo"
];

const VALID_WORDS = WORDS.filter((word) => /^[a-zñ]{5}$/.test(word));
if (VALID_WORDS.length === 0) {
  throw new Error("No hay palabras válidas para Wordle.");
}

const EMOJIS = {
  correct: "🟩",
  present: "🟧",
  absent: "⬛"
};

function getDailyWord(dateString) {
  const seed = dateString
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return VALID_WORDS[seed % VALID_WORDS.length];
}

function getFeedback(guess, target) {
  const feedback = Array(5).fill("absent");
  const targetChars = target.split("");

  for (let i = 0; i < 5; i += 1) {
    if (guess[i] === target[i]) {
      feedback[i] = "correct";
      targetChars[i] = null;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    if (feedback[i] !== "correct") {
      const index = targetChars.indexOf(guess[i]);
      if (index !== -1) {
        feedback[i] = "present";
        targetChars[index] = null;
      }
    }
  }

  return feedback.map((status) => EMOJIS[status]).join("");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordle")
    .setDescription("Juega el Wordle diario en español")
    .addStringOption((option) =>
      option
        .setName("palabra")
        .setDescription("Intenta una palabra de 5 letras sin acentos")
        .setRequired(true)
    ),

  async execute(interaction) {
    const dailyCommand = getDailyCommandName();
    if (dailyCommand !== "wordle") {
      return interaction.reply({
        content:
          "❌ Hoy el minijuego de diario no es Wordle. Usa /diario para saber cuál es el comando disponible.",
        ephemeral: true
      });
    }

    const guess = interaction.options
      .getString("palabra")
      .trim()
      .toLowerCase();

    if (!/^[a-zñ]{5}$/.test(guess)) {
      return interaction.reply({
        content:
          "❌ La palabra debe tener 5 letras y solo puede incluir letras sin acentos.",
        ephemeral: true
      });
    }

    const today = getLocalDateString();
    const target = getDailyWord(today);
    const user = await ensureUser(interaction.user.id, interaction.user.tag);

    if (user.last_daily_date !== today) {
      await updateUserFields(interaction.user.id, {
        last_daily_date: today,
        daily_attempts: 0,
        daily_solved: 0
      });
      user.daily_attempts = 0;
      user.daily_solved = 0;
      user.last_daily_date = today;
    }

    if (user.daily_solved === 1) {
      return interaction.reply({
        content:
          "✅ Ya has completado el Wordle diario de hoy. Vuelve mañana con uno nuevo.",
        ephemeral: true
      });
    }

    if (user.daily_attempts >= 6) {
      return interaction.reply({
        content: `❌ Ya has usado los 6 intentos de hoy. La palabra era **${target.toUpperCase()}**. Intenta de nuevo mañana.`,
        ephemeral: true
      });
    }

    const nextAttempt = user.daily_attempts + 1;
    const feedback = getFeedback(guess, target);

    await updateUserFields(interaction.user.id, {
      daily_attempts: nextAttempt
    });

    if (guess === target) {
      const points = 500 + (6 - nextAttempt) * 50; // 500 puntos base + 50 puntos por cada intento restante
      await updateUserFields(interaction.user.id, {
        points: user.points + points,
        wins: user.wins + 1,
        daily_solved: 1
      });

      return interaction.reply({
        content: `🎉 ¡${interaction.user.username} ha acertado el Wordle de hoy y gana **${points} puntos**! 🎉\n\n${feedback}`,
        ephemeral: false
      });
    }

    if (nextAttempt >= 6) {
      return interaction.reply({
        content: `❌ Has agotado los 6 intentos.\n\n${feedback}\n\nLa palabra de hoy era **${target.toUpperCase()}**. Vuelve mañana para un nuevo Wordle.`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: `Intento ${nextAttempt}/6:\n\n${feedback}\n\nSigue intentando.`,
      ephemeral: true
    });
  }
};
