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
 * Sobrescritura manual del minijuego diario.
 *
 * Fuerza un minijuego concreto para una fecha concreta, ignorando
 * la selección calculada por hash. Formato:
 *
 *     "YYYY-MM-DD": "nombre-del-minijuego"
 *
 * Útil para adelantar o cambiar el minijuego de un día puntual
 * (por ejemplo, para que Blackjack salga hoy). Elimina la línea de
 * la fecha cuando quieras volver a la rotación automática.
 */
const MANUAL_OVERRIDES = {
  "2026-09-18": "cancion"
};

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

/*
 * Número de días recientes en los que un minijuego queda "reservado",
 * es decir, no puede volver a salir.
 *
 * El sistema anterior solo evitaba que un minijuego se repitiera DOS DÍAS
 * SEGUIDOS (comparaba nada más con ayer). Eso permitía que el mismo
 * minijuego volviera al poco tiempo con un hueco de un solo día entre
 * medias (por ejemplo, salir "anteayer y hoy"), que resultaba repetitivo.
 *
 * Con RECENT_DAYS controlamos cuántos días atrás se "bloquea" un
 * minijuego. Mantenlo siempre menor que GAMES.length para que siempre
 * haya alternativas disponibles.
 */
const RECENT_DAYS = 3;

/*
 * Fecha a partir de la cual se construye la programación determinista.
 * No hace falta tocarla mientras todas las fechas consultadas sean
 * posteriores a la de arranque del bot (lo normal).
 */
const SCHEDULE_START = new Date(2026, 0, 1);

/*
 * Programación diaria ya calculada: "YYYY-MM-DD" -> nombre del minijuego.
 *
 * Se rellena hacia delante y se mantiene en memoria. Guardar aquí el
 * resultado de cada día (y no solo el hash) es clave: el periodo de
 * "reserva" debe basarse en el minijuego que REALMENTE apareció cada día,
 * que ya incluye sus propios ajustes para no repetirse.
 */
const schedule = new Map();

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/*
 * Asegura que la programación está calculada al menos hasta `target`.
 * Se construye día a día desde la fecha de arranque, guardando el resultado
 * real en `schedule` para que los días siguientes bloqueen correctamente.
 */
function buildScheduleThrough(target) {
  const startStr = getLocalDateString(SCHEDULE_START);
  const targetStr = getLocalDateString(target);

  // Fecha anterior a la de arranque: no hay programación, se usa el hash.
  if (targetStr < startStr) {
    return;
  }

  if (!schedule.has(startStr)) {
    schedule.set(startStr, GAMES[hashString(startStr) % GAMES.length].name);
  }

  let cursor = addDays(SCHEDULE_START, 1);
  const limit = Math.min(RECENT_DAYS, GAMES.length - 1);

  while (!schedule.has(targetStr)) {
    const cursorStr = getLocalDateString(cursor);

    // Sobrescritura manual para este día.
    const forcedName = MANUAL_OVERRIDES[cursorStr];
    if (forcedName) {
      schedule.set(cursorStr, forcedName);
      cursor = addDays(cursor, 1);
      continue;
    }

    // Minijuegos que REALMENTE salieron en los últimos RECENT_DAYS días.
    const recentNames = new Set();
    for (let i = 1; i <= limit; i++) {
      const prevStr = getLocalDateString(addDays(cursor, -i));
      if (schedule.has(prevStr)) {
        recentNames.add(schedule.get(prevStr));
      }
    }

    // Hash de la fecha para una selección variada.
    let index = hashString(cursorStr) % GAMES.length;
    const start = index;

    // Avanza hasta dar con un minijuego que no esté entre los recientes,
    // para que ninguno se repita demasiado pronto (p. ej. anteayer y hoy).
    while (recentNames.has(GAMES[index].name)) {
      index = (index + 1) % GAMES.length;
      if (index === start) {
        break; // Todos los minijuegos son recientes: usamos el del hash.
      }
    }

    schedule.set(cursorStr, GAMES[index].name);
    cursor = addDays(cursor, 1);
  }
}

function getDailyGame(date = new Date()) {
  const dateString = getLocalDateString(date);

  buildScheduleThrough(date);

  const name = schedule.get(dateString);

  // Fecha anterior a la de arranque sin programación calculada.
  if (!name) {
    return GAMES[hashString(dateString) % GAMES.length];
  }

  const forcedName = MANUAL_OVERRIDES[dateString];
  if (forcedName) {
    const forced = GAMES.find((game) => game.name === forcedName);
    if (forced) {
      return forced;
    }
  }

  return GAMES.find((game) => game.name === name);
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
