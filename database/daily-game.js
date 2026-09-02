const GAMES = [
  { name: "wordle", label: "Wordle", description: "🧩 Adivina la palabra de 5 letras. Tienes 6 intentos.", howToPlay: "▶️ Escribe el comando con tu intento: /wordle palabra:[letras] (5 letras, sin acentos)." },
  { name: "loldle", label: "Loldle", description: "🦸🏽 Identifica al campeón de LoL con la ayuda de pistas.", howToPlay: "▶️ Usa /loldle para empezar a jugar." },
  { name: "revuelta", label: "Revuelta", description: "🔤 Ordena las letras desordenadas y encuentra la palabra del día.", howToPlay: "▶️ Usa /revuelta para ver las letras y responde con /revuelta palabra:[letras]." },
  { name: "blackjack", label: "Blackjack", description: "🃏 Consigue 21 sin pasarte. ¡Buena suerte en la mesa!", howToPlay: "▶️ Usa /blackjack para empezar la partida." },
  { name: "cancion", label: "Canción", description: "🎵 Adivina la canción del día a partir de su letra.", howToPlay: "▶️ Usa /cancion para escuchar la canción y responde con /cancion respuesta:[canción]." },
  { name: "imagen", label: "Imagen", description: "🖼️ Descubre la imagen pixelada del día poco a poco.", howToPlay: "▶️ Usa /imagen para ver la imagen y responde con /imagen respuesta:[juego] cuando la identifiques." },
  { name: "bomba", label: "Bomba", description: "💣 Abre casillas sin pisar la bomba. ¡Cada vez hay menos sitio!", howToPlay: "▶️ Usa /bomba para empezar la partida." },
  { name: "frase", label: "Frase", description: "📖 Escribe la frase lo más rápido posible.", howToPlay: "▶️ Usa /frase para empezar a jugar." },
  { name: "buscaminas", label: "Buscaminas", description: "💥 Despeja el tablero 5x5 sin pisar ninguna mina.", howToPlay: "▶️ Usa /buscaminas para empezar a jugar." },
  { name: "simon", label: "Simon", description: "🔴🔵🟢 Repite la secuencia de colores, que cada vez será más larga.", howToPlay: "▶️ Usa /simon para empezar a jugar." }

];

function getLocalDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDailyGame() {
  const dateString = getLocalDateString();
  const seed = dateString
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return GAMES[seed % GAMES.length];
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
