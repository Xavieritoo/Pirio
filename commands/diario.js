const { SlashCommandBuilder } = require("discord.js");
const {
  getDailyCommandName,
  getDailyCommandLabel,
  getDailyCommandDescription,
  getDailyHowToPlay
} = require("../database/daily-game");

const WORDS = [
  "amigo", "tiempo", "salud", "mundo", "feliz", "grato", "novio", "plomo",
  "libro", "sueño", "noche", "tarde", "verde", "azul", "rojo", "drama",
  "perro", "gato", "coche", "playa", "flor", "llave", "pinto", "cobra",
  "luzco", "brisa", "risa", "quedo", "sabor", "sueca", "dulce", "vapor",
  "rapto", "piano", "noble", "hecho", "buena", "amena", "huevo", "truco",
  "grito", "pista", "llama", "rango", "salsa", "sello", "dieta", "clima",
  "lloro", "lucha", "firme", "peaje", "culto", "sonar", "arena", "punto",
  "crudo", "salir", "matar", "ojala", "carta", "cima", "bravo", "ruteo"
];

const EMOJIS = {
  correct: "🟩",
  present: "🟧",
  absent: "⬛"
};

function getLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDailyWord(dateString) {
  const seed = dateString
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return WORDS[seed % WORDS.length];
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
    .setName("diario")
    .setDescription("Te dice qué minijuego está disponible hoy"),

  async execute(interaction) {
    const dailyCommand = getDailyCommandName();
    const dailyLabel = getDailyCommandLabel();
    const dailyDescription = getDailyCommandDescription();
    const dailyHowToPlay = getDailyHowToPlay();

    return interaction.reply({
      content: `🎯 El minijuego de hoy es **${dailyLabel}**.
${dailyDescription}

${dailyHowToPlay}`,
      ephemeral: true
    });
  }
};
