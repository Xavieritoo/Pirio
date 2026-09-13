const GAMES = [
  { name: "wordle", label: "Wordle", description: "🧩 Adivina la palabra de 5 letras. Tienes 6 intentos.", howToPlay: "▶️ Escribe el comando con tu intento: /wordle palabra:[letras] (5 letras, sin acentos)." },
  { name: "loldle", label: "Loldle", description: "🦸🏽 Identifica al campeón de LoL con la ayuda de pistas.", howToPlay: "▶️ Usa /loldle para empezar a jugar." },
  { name: "revuelta", label: "Revuelta", description: "🔤 Ordena las letras desordenadas y encuentra la palabra del día.", howToPlay: "▶️ Usa /revuelta para ver las letras y responde con /revuelta palabra:[letras]." },
  { name: "cancion", label: "Canción", description: "🎵 Adivina la canción del día.", howToPlay: "▶️ Usa /cancion para escuchar la canción y responde con /cancion respuesta:[canción]." },
  { name: "imagen", label: "Imagen", description: "🖼️ Descubre la imagen pixelada del día.", howToPlay: "▶️ Usa /imagen para ver la imagen y responde con /imagen respuesta:[juego] cuando la identifiques." },
  { name: "bomba", label: "Bomba", description: "💣 Escribe palabras por las sílabas que te indica hasta que explote la bomba.", howToPlay: "▶️ Usa /bomba para empezar la partida." },
  { name: "frase", label: "Frase", description: "📖 Escribe la frase lo más rápido posible.", howToPlay: "▶️ Usa /frase para empezar a jugar." },
  { name: "blackjack", label: "Blackjack", description: "🃏 Consigue 21 sin pasarte. ¡Buena suerte en la mesa!", howToPlay: "▶️ Usa /blackjack para empezar la partida." },
  { name: "buscaminas", label: "Buscaminas", description: "💥 Despeja el tablero 5x5 sin pisar ninguna mina.", howToPlay: "▶️ Usa /buscaminas para empezar a jugar." },
  { name: "simon", label: "Simon", description: "🔴🔵🟢 Repite la secuencia de colores, que cada vez será más larga.", howToPlay: "▶️ Usa /simon para empezar a jugar." }

];

function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/*
 * Hash FNV-1a de la fecha.
 *
 * El sistema anterior sumaba los códigos de carácter de la fecha y hacía
 * `% GAMES.length`. Como esa suma sube de +1 en +1 cada día, el resultado
 * recorría la lista en un ciclo fijo y predecible: los minijuegos se repetían
 * en el mismo orden y algunos (como Blackjack) solo salían cada 10 días.
 *
 * FNV-1a reparte bien los valores sobre la fecha, de modo que cada día el
 * minijuego se elige de forma variada y "aleatoria".
 */
function hashString(str) {
  let hash = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDailyGame() {
  const dateString = getLocalDateString();

  // Hash de la fecha para una selección variada.
  let index = hashString(dateString) % GAMES.length;

  // Evita que el minijuego se repita dos días seguidos.
  if (GAMES.length > 1) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const prevIndex =
      hashString(getLocalDateString(yesterday)) % GAMES.length;
    if (index === prevIndex) {
      index = (index + 1) % GAMES.length;
    }
  }

  return GAMES[index];
}

function getDailyCommandName() {
  return getDailyGame().name;
}

function getDailyCommandLabel() {
  return getDailyGame().label;
}

function getDailyCommandDescription() {
  return getDailyGame().description;
}

function getDailyHowToPlay() {
  return getDailyGame().howToPlay;
}

module.exports = {
  getLocalDateString,
  getDailyGame,
  getDailyCommandName,
  getDailyCommandLabel,
  getDailyCommandDescription,
  getDailyHowToPlay
};
