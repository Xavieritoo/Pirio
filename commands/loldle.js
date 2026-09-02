const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

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
  getUserStreak,
  applyStreakMultiplier
} = require("../database/streaks");

const MAX_ATTEMPTS = 3;

const CHAMPIONS = [
  { value: "ahri", label: "Ahri", emojis: ["🦊", "✨", "🌙"] },
  { value: "akali", label: "Akali", emojis: ["🗡️", "🌙", "💨"] },
  { value: "alistar", label: "Alistar", emojis: ["🐂", "💪", "👊"] },
  { value: "amumu", label: "Amumu", emojis: ["🧟", "😢", "🕯️"] },
  { value: "anivia", label: "Anivia", emojis: ["❄️", "🕊️", "🧊"] },
  { value: "annie", label: "Annie", emojis: ["🧸", "🔥", "🎀"] },
  { value: "aphelios", label: "Aphelios", emojis: ["🌙", "🔫", "🌑"] },
  { value: "ashe", label: "Ashe", emojis: ["🏹", "❄️", "👑"] },
  { value: "aurelionsol", label: "Aurelion Sol", emojis: ["🌟", "🐉", "🌌"] },
  { value: "azir", label: "Azir", emojis: ["👑", "🦅", "🏺"] },
  { value: "bard", label: "Bard", emojis: ["🔔", "🌌", "🎶"] },
  { value: "blitzcrank", label: "Blitzcrank", emojis: ["🤖", "🧲", "⚡"] },
  { value: "brand", label: "Brand", emojis: ["🔥", "💀", "🌋"] },
  { value: "braum", label: "Braum", emojis: ["🛡️", "💪", "🍺"] },
  { value: "caitlyn", label: "Caitlyn", emojis: ["🔫", "🎩", "🎯"] },
  { value: "camille", label: "Camille", emojis: ["🦾", "🗡️", "👠"] },
  { value: "cassiopeia", label: "Cassiopeia", emojis: ["🐍", "🌙", "🔮"] },
  { value: "chogath", label: "Cho'Gath", emojis: ["🦖", "🍽️", "👑"] },
  { value: "corki", label: "Corki", emojis: ["✈️", "💣", "🧨"] },
  { value: "darius", label: "Darius", emojis: ["🪓", "🩸", "👑"] },
  { value: "diana", label: "Diana", emojis: ["🌙", "🪓", "✨"] },
  { value: "drmundo", label: "Dr. Mundo", emojis: ["🧟", "🔪", "💀"] },
  { value: "ekko", label: "Ekko", emojis: ["⏳", "⚔️", "💥"] },
  { value: "elise", label: "Elise", emojis: ["🕷️", "🕸️", "💀"] },
  { value: "evelynn", label: "Evelynn", emojis: ["😈", "🖤", "💋"] },
  { value: "ezreal", label: "Ezreal", emojis: ["🔫", "✨", "💥"] },
  { value: "fiddlesticks", label: "Fiddlesticks", emojis: ["🌾", "🪓", "👻"] },
  { value: "fiora", label: "Fiora", emojis: ["🗡️", "💃", "🎯"] },
  { value: "fizz", label: "Fizz", emojis: ["🐟", "🔱", "🌊"] },
  { value: "galio", label: "Galio", emojis: ["🗿", "🛡️", "⚖️"] },
  { value: "gangplank", label: "Gangplank", emojis: ["🏴‍☠️", "💣", "⚓"] },
  { value: "garen", label: "Garen", emojis: ["🛡️", "⚔️", "👑"] },
  { value: "gnar", label: "Gnar", emojis: ["🦖", "🪓", "👊"] },
  { value: "gragas", label: "Gragas", emojis: ["🍺", "⚔️", "🐻"] },
  { value: "graves", label: "Graves", emojis: ["🔫", "💨", "🚬"] },
  { value: "hecarim", label: "Hecarim", emojis: ["🐎", "⚔️", "💀"] },
  { value: "heimerdinger", label: "Heimerdinger", emojis: ["🧠", "🔧", "🧪"] },
  { value: "illaoi", label: "Illaoi", emojis: ["🪢", "💪", "🐙"] },
  { value: "irelia", label: "Irelia", emojis: ["🗡️", "🌀", "🎐"] },
  { value: "ivern", label: "Ivern", emojis: ["🌳", "🧚", "🌿"] },
  { value: "janna", label: "Janna", emojis: ["🌬️", "☔", "🌪️"] },
  { value: "jarvaniv", label: "Jarvan IV", emojis: ["⚔️", "🛡️", "👑"] },
  { value: "jax", label: "Jax", emojis: ["🪓", "🏋️", "💥"] },
  { value: "jhin", label: "Jhin", emojis: ["🎭", "🔫", "🎯"] },
  { value: "jinx", label: "Jinx", emojis: ["💣", "🔫", "🎆"] },
  { value: "kaisa", label: "Kai'Sa", emojis: ["🔫", "🌌", "✨"] },
  { value: "kalista", label: "Kalista", emojis: ["🗡️", "👻", "⚰️"] },
  { value: "karma", label: "Karma", emojis: ["🪷", "✨", "🌀"] },
  { value: "karthus", label: "Karthus", emojis: ["💀", "🎼", "⛓️"] },
  { value: "kassadin", label: "Kassadin", emojis: ["🌀", "⚡", "🔮"] },
  { value: "katarina", label: "Katarina", emojis: ["🔪", "🩸", "💃"] },
  { value: "kayle", label: "Kayle", emojis: ["🦅", "⚔️", "✨"] },
  { value: "kayn", label: "Kayn", emojis: ["🪓", "🌪️", "🖤"] },
  { value: "kennen", label: "Kennen", emojis: ["⚡", "🌀", "🐉"] },
  { value: "khazix", label: "Kha'Zix", emojis: ["🦗", "🔪", "🦴"] },
  { value: "kindred", label: "Kindred", emojis: ["🐺", "🐑", "🌙"] },
  { value: "kled", label: "Kled", emojis: ["🐴", "🛡️", "⚔️"] },
  { value: "kogmaw", label: "Kog'Maw", emojis: ["🐛", "🦴", "💧"] },
  { value: "leblanc", label: "LeBlanc", emojis: ["🪞", "🔮", "🎭"] },
  { value: "leesin", label: "Lee Sin", emojis: ["👊", "🌀", "🧘"] },
  { value: "leona", label: "Leona", emojis: ["☀️", "🛡️", "⚔️"] },
  { value: "lissandra", label: "Lissandra", emojis: ["❄️", "🔮", "🧊"] },
  { value: "lucian", label: "Lucian", emojis: ["🔫", "💥", "🌕"] },
  { value: "lulu", label: "Lulu", emojis: ["🧚", "🎩", "✨"] },
  { value: "lux", label: "Lux", emojis: ["✨", "📘", "🌟"] },
  { value: "malphite", label: "Malphite", emojis: ["🪨", "🛡️", "🌋"] },
  { value: "malzahar", label: "Malzahar", emojis: ["🔮", "🟣", "👁️"] },
  { value: "maokai", label: "Maokai", emojis: ["🌳", "🍃", "🐻"] },
  { value: "masteryi", label: "Master Yi", emojis: ["🗡️", "👁️", "⚡"] },
  { value: "missfortune", label: "Miss Fortune", emojis: ["🔫", "💋", "💰"] },
  { value: "mordekaiser", label: "Mordekaiser", emojis: ["🪨", "🛡️", "💀"] },
  { value: "morgana", label: "Morgana", emojis: ["🕊️", "⛓️", "🌑"] },
  { value: "nami", label: "Nami", emojis: ["🧜‍♀️", "🌊", "🐟"] },
  { value: "nasus", label: "Nasus", emojis: ["🐺", "🪓", "⚱️"] },
  { value: "nautilus", label: "Nautilus", emojis: ["⚓", "🛡️", "🌊"] },
  { value: "neeko", label: "Neeko", emojis: ["🦎", "🌺", "✨"] },
  { value: "nocturne", label: "Nocturne", emojis: ["🌑", "🗡️", "🖤"] },
  { value: "nunu", label: "Nunu", emojis: ["❄️", "🐻", "🍪"] },
  { value: "olaf", label: "Olaf", emojis: ["🪓", "🍺", "🛡️"] },
  { value: "orianna", label: "Orianna", emojis: ["🤖", "⚙️", "⚽"] },
  { value: "ornn", label: "Ornn", emojis: ["🐻", "🔨", "🔥"] },
  { value: "pantheon", label: "Pantheon", emojis: ["🛡️", "🏹", "🏛️"] },
  { value: "poppy", label: "Poppy", emojis: ["🔨", "🛡️", "🌟"] },
  { value: "pyke", label: "Pyke", emojis: ["🔪", "🌊", "💀"] },
  { value: "qiyana", label: "Qiyana", emojis: ["🌿", "🌀", "🪨"] },
  { value: "quinn", label: "Quinn", emojis: ["🦅", "🏹", "🌲"] },
  { value: "rakan", label: "Rakan", emojis: ["🕊️", "✨", "🦅"] },
  { value: "rammus", label: "Rammus", emojis: ["🛡️", "🌀", "🦔"] },
  { value: "reksai", label: "Rek'Sai", emojis: ["🦗", "🌋", "🦴"] },
  { value: "rengar", label: "Rengar", emojis: ["🐆", "⚔️", "🩸"] },
  { value: "riven", label: "Riven", emojis: ["🗡️", "💔", "🌪️"] },
  { value: "rumble", label: "Rumble", emojis: ["🔥", "🛠️", "🤖"] },
  { value: "ryze", label: "Ryze", emojis: ["📜", "🔮", "⚡"] },
  { value: "samira", label: "Samira", emojis: ["🔫", "💥", "❤️"] },
  { value: "senna", label: "Senna", emojis: ["🌑", "🔫", "💀"] },
  { value: "seraphine", label: "Seraphine", emojis: ["🎤", "🎶", "✨"] },
  { value: "sett", label: "Sett", emojis: ["👊", "🥊", "🐻"] },
  { value: "shaco", label: "Shaco", emojis: ["🃏", "🎭", "🔪"] },
  { value: "shen", label: "Shen", emojis: ["🛡️", "💨", "🥷"] },
  { value: "sejuani", label: "Sejuani", emojis: ["❄️", "🐴", "🛡️"] },
  { value: "shyvana", label: "Shyvana", emojis: ["🐲", "🔥", "🛡️"] },
  { value: "singed", label: "Singed", emojis: ["🧪", "💨", "☠️"] },
  { value: "sion", label: "Sion", emojis: ["⚔️", "🛡️", "💀"] },
  { value: "sivir", label: "Sivir", emojis: ["🛡️", "🏹", "🌪️"] },
  { value: "skarner", label: "Skarner", emojis: ["🦂", "🛡️", "🏜️"] },
  { value: "sona", label: "Sona", emojis: ["🎼", "🎻", "✨"] },
  { value: "swain", label: "Swain", emojis: ["🐦", "🌀", "🧠"] },
  { value: "sylas", label: "Sylas", emojis: ["⛓️", "🔥", "⚔️"] },
  { value: "tahmkench", label: "Tahm Kench", emojis: ["🐸", "🍽️", "🌊"] },
  { value: "taliyah", label: "Taliyah", emojis: ["🪨", "💨", "🌪️"] },
  { value: "talon", label: "Talon", emojis: ["🗡️", "🖤", "💨"] },
  { value: "taric", label: "Taric", emojis: ["💎", "✨", "🛡️"] },
  { value: "tristana", label: "Tristana", emojis: ["💣", "🎯", "🚀"] },
  { value: "trundle", label: "Trundle", emojis: ["🪓", "❄️", "🧱"] },
  { value: "tryndamere", label: "Tryndamere", emojis: ["🗡️", "🔥", "💪"] },
  { value: "twistedfate", label: "Twisted Fate", emojis: ["🎴", "🃏", "✨"] },
  { value: "twitch", label: "Twitch", emojis: ["🧪", "🧟", "🏹"] },
  { value: "udyr", label: "Udyr", emojis: ["🐻", "🐍", "🐅"] },
  { value: "urgot", label: "Urgot", emojis: ["🔫", "🦾", "☠️"] },
  { value: "varus", label: "Varus", emojis: ["🏹", "💀", "💨"] },
  { value: "veigar", label: "Veigar", emojis: ["🧙", "🔮", "⚫"] },
  { value: "velkoz", label: "Vel'Koz", emojis: ["👁️", "🧬", "🌌"] },
  { value: "vi", label: "Vi", emojis: ["🥊", "👊", "⚡"] },
  { value: "viktor", label: "Viktor", emojis: ["🤖", "⚙️", "🔩"] },
  { value: "vladimir", label: "Vladimir", emojis: ["🩸", "🧛", "🌑"] },
  { value: "volibear", label: "Volibear", emojis: ["🐻", "⚡", "🌩️"] },
  { value: "warwick", label: "Warwick", emojis: ["🐺", "🔪", "🩸"] },
  { value: "wukong", label: "Wukong", emojis: ["🪓", "🐒", "💨"] },
  { value: "xayah", label: "Xayah", emojis: ["🪶", "🏹", "🌺"] },
  { value: "xerath", label: "Xerath", emojis: ["🔮", "⚡", "✨"] },
  { value: "xinzhao", label: "Xin Zhao", emojis: ["⚔️", "🐴", "🏹"] },
  { value: "yone", label: "Yone", emojis: ["🗡️", "🌪️", "👻"] },
  { value: "yorick", label: "Yorick", emojis: ["⚰️", "💀", "🪦"] },
  { value: "yuumi", label: "Yuumi", emojis: ["😺", "📖", "✨"] },
  { value: "zac", label: "Zac", emojis: ["🟢", "💪", "🌀"] },
  { value: "ziggs", label: "Ziggs", emojis: ["💣", "🎇", "🧨"] },
  { value: "zilean", label: "Zilean", emojis: ["⏳", "🕰️", "✨"] }
];


/*
 * ============================================================
 * FUNCIONES DEL JUEGO
 * ============================================================
 */

function getDailyChampion(dateString) {
  const seed = dateString
    .split("")
    .reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );

  return CHAMPIONS[
    seed % CHAMPIONS.length
  ];
}


function seededShuffle(array, seedStr) {
  const seed = String(
    seedStr || ""
  );

  function hashStringToUint32(s) {
    let h = 2166136261 >>> 0;

    for (
      let i = 0;
      i < s.length;
      i += 1
    ) {
      h = Math.imul(
        h ^ s.charCodeAt(i),
        16777619
      ) >>> 0;
    }

    return h >>> 0;
  }

  return [...array]
    .map((v, i) => ({
      v,
      k: hashStringToUint32(
        `${seed}|${i}|${String(v)}`
      )
    }))
    .sort((a, b) => (
      a.k === b.k
        ? 0
        : a.k < b.k
          ? -1
          : 1
    ))
    .map((x) => x.v);
}


function normalizeText(text) {
  return String(
    text
  )
    .trim()
    .toLowerCase();
}


function findChampionMatches(query) {
  const normalized =
    normalizeText(query);

  if (!normalized) {
    return [];
  }

  return CHAMPIONS.filter(
    (champion) => {
      const label =
        normalizeText(
          champion.label
        );

      const value =
        normalizeText(
          champion.value
        );

      return (
        label === normalized ||
        value === normalized ||
        label.includes(normalized) ||
        value.includes(normalized)
      );
    }
  );
}


function buildChampionOptions(
  champions
) {
  return champions.map(
    (item) => ({
      label: item.label,
      value: item.value
    })
  );
}


function getPageOptions(page) {
  const start =
    page * 25;

  const pageChampions =
    CHAMPIONS.slice(
      start,
      start + 25
    );

  return buildChampionOptions(
    pageChampions
  );
}


function buildSelectRow(
  champion,
  champions = null,
  page = 0
) {
  const options =
    champions
      ? buildChampionOptions(
        champions.slice(0, 25)
      )
      : getPageOptions(page);

  return new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          "loldle-guess"
        )
        .setPlaceholder(
          "Selecciona un campeón..."
        )
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    );
}


function buildPageButtonRow(page) {
  const totalPages =
    Math.ceil(
      CHAMPIONS.length / 25
    );

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId(
          `loldle-page-${Math.max(
            0,
            page - 1
          )}`
        )
        .setLabel(
          "Anterior"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
        .setDisabled(
          page <= 0
        ),

      new ButtonBuilder()
        .setCustomId(
          `loldle-page-${Math.min(
            totalPages - 1,
            page + 1
          )}`
        )
        .setLabel(
          "Siguiente"
        )
        .setStyle(
          ButtonStyle.Secondary
        )
        .setDisabled(
          page >= totalPages - 1
        ),

      new ButtonBuilder()
        .setCustomId(
          "loldle-search"
        )
        .setLabel(
          "Buscar campeón"
        )
        .setStyle(
          ButtonStyle.Primary
        )
    );
}


function buildLoldleComponents(
  champion,
  page = 0,
  champions = null
) {
  return [
    buildSelectRow(
      champion,
      champions,
      page
    ),

    buildPageButtonRow(
      page
    )
  ];
}


/*
 * ============================================================
 * XP
 * ============================================================
 *
 * El XP base depende del intento.
 *
 * Intento 1 → 700 XP
 * Intento 2 → 650 XP
 * Intento 3 → 600 XP
 *
 * Después se aplica internamente el multiplicador de racha.
 *
 * La racha NO se muestra al usuario.
 * ============================================================
 */

function getLoldleBaseXp(
  attempts
) {
  return Math.max(
    250,
    700 - attempts * 50
  );
}


function getLoldleXp(
  attempts,
  streak
) {
  const baseXp =
    getLoldleBaseXp(
      attempts
    );

  return applyStreakMultiplier(
    baseXp,
    streak
  );
}


/*
 * ============================================================
 * EMBED
 * ============================================================
 */

function buildLoldleEmbed(
  champion,
  attempts,
  state,
  page = 0,
  seed = "",
  streak = 0
) {
  /*
   * El XP mostrado ya incluye el multiplicador.
   *
   * No mostramos:
   * - racha
   * - multiplicador
   * - XP base
   */

  const xpGain =
    getLoldleXp(
      attempts,
      streak
    );

  const revealed =
    Math.min(
      attempts + 1,
      MAX_ATTEMPTS
    );

  const clues =
    seededShuffle(
      champion.emojis,
      `${champion.value}-${getLocalDateString()}-${seed}`
    )
      .slice(
        0,
        revealed
      )
      .join(" ");

  const remaining =
    MAX_ATTEMPTS - attempts;

  const totalPages =
    Math.ceil(
      CHAMPIONS.length / 25
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        "#FFB300"
      )
      .setTitle(
        "Loldle — Adivina el campeón"
      )
      .setDescription(
        state === "won"
          ? `🎉 ¡Correcto! Has adivinado a **${champion.label}**.`
          : state === "lost"
            ? `💀 Has perdido. El campeón de hoy era **${champion.label}**.`
            : "Adivina el campeón usando los emojis. Usa los botones 'Anterior' y 'Siguiente' para ver todos los campeones, o pulsa Buscar campeón para ir directo."
      )
      .addFields(
        {
          name: "Pistas",
          value:
            clues ||
            "Sin pistas todavía",
          inline: false
        },

        {
          name:
            "Intentos restantes",
          value:
            `**${state === "lost"
              ? 0
              : remaining
            }**`,
          inline: true
        },

        {
          name:
            state === "won"
              ? "XP ganado"
              : "XP por acierto ahora",
          value:
            `**${xpGain} XP**`,
          inline: true
        }
      );

  if (
    state === "playing"
  ) {
    embed.addFields({
      name:
        "Página del listado",

      value:
        `**${page + 1}/${totalPages}** (usa los botones para navegar)`,

      inline: false
    });
  }

  if (
    state === "lost"
  ) {
    embed.addFields({
      name:
        "Campeón",

      value:
        `**${champion.label}**`,

      inline: false
    });
  }

  return embed;
}


module.exports = {

  data:
    new SlashCommandBuilder()
      .setName(
        "loldle"
      )
      .setDescription(
        "Juega al Loldle diario y adivina el campeón por emojis"
      ),


  /*
   * ==========================================================
   * /LOLDLE
   * ==========================================================
   */

  async execute(
    interaction
  ) {
    const dailyCommand =
      getDailyCommandName();

    if (
      dailyCommand !==
      "loldle"
    ) {
      return interaction.reply({
        content:
          "❌ Hoy el minijuego de diario no es Loldle. Usa /diario para saber cuál es el comando disponible.",
        ephemeral: true
      });
    }

    const today =
      getLocalDateString();

    const champion =
      getDailyChampion(
        today
      );

    const user =
      await ensureUser(
        interaction.user.id,
        interaction.user.tag
      );


    /*
     * ========================================================
     * RACHA
     * ========================================================
     */

    const previousDailyDate =
      user.last_daily_date
        ? String(
          user.last_daily_date
        )
        : null;

    const streakResult =
      await registerDailyGame(
        interaction.user.id
      );


    /*
     * ========================================================
     * NUEVO DÍA
     * ========================================================
     */

    if (
      previousDailyDate !==
      today &&
      !streakResult.alreadyPlayed
    ) {
      await updateUserFields(
        interaction.user.id,
        {
          daily_attempts: 0,
          daily_solved: 0
        }
      );

      user.daily_attempts = 0;
      user.daily_solved = 0;
    }


    const currentAttempts =
      Number(
        user.daily_attempts || 0
      );

    const dailySolved =
      Number(
        user.daily_solved || 0
      );


    /*
     * ========================================================
     * YA COMPLETÓ EL JUEGO
     * ========================================================
     */

    if (
      dailySolved === 1
    ) {
      return interaction.reply({
        content:
          "✅ Ya has completado el Loldle diario de hoy. Vuelve mañana con un nuevo minijuego.",
        ephemeral: true
      });
    }


    /*
     * ========================================================
     * AGOTÓ LOS INTENTOS
     * ========================================================
     */

    if (
      currentAttempts >=
      MAX_ATTEMPTS
    ) {
      return interaction.reply({
        content:
          `❌ Ya has agotado tus intentos en Loldle. El campeón de hoy era **${champion.label}**. Vuelve mañana.`,
        ephemeral: true
      });
    }


    /*
     * ========================================================
     * RACHA ACTUAL
     * ========================================================
     *
     * Se obtiene únicamente para el cálculo interno del XP.
     *
     * Nunca se muestra al usuario.
     * ========================================================
     */

    const streak =
      await getUserStreak(
        interaction.user.id
      );


    const embed =
      buildLoldleEmbed(
        champion,
        currentAttempts,
        "playing",
        0,
        user.id,
        streak
      );

    const components =
      buildLoldleComponents(
        champion,
        0
      );

    return interaction.reply({
      embeds: [embed],
      components,
      ephemeral: true
    });
  },


  /*
   * ==========================================================
   * BOTONES
   * ==========================================================
   */

  async handleButton(
    interaction
  ) {
    const dailyCommand =
      getDailyCommandName();

    if (
      dailyCommand !==
      "loldle"
    ) {
      return interaction.reply({
        content:
          "❌ Hoy el minijuego de diario no es Loldle. Usa /diario para saber cuál es el comando disponible.",
        ephemeral: true
      });
    }

    const [
      ,
      action,
      pageParam
    ] =
      interaction.customId.split(
        "-"
      );


    /*
     * ========================================================
     * CAMBIO DE PÁGINA
     * ========================================================
     */

    if (
      action === "page"
    ) {
      const page =
        Number(
          pageParam
        ) || 0;

      const today =
        getLocalDateString();

      const champion =
        getDailyChampion(
          today
        );

      const user =
        await ensureUser(
          interaction.user.id,
          interaction.user.tag
        );

      const currentAttempts =
        Number(
          user.daily_attempts || 0
        );

      const dailySolved =
        Number(
          user.daily_solved || 0
        );


      if (
        dailySolved === 1
      ) {
        return interaction.update({
          content:
            "✅ Ya completaste el Loldle de hoy.",
          embeds: [],
          components: []
        });
      }


      if (
        currentAttempts >=
        MAX_ATTEMPTS
      ) {
        const streak =
          await getUserStreak(
            interaction.user.id
          );

        const embed =
          buildLoldleEmbed(
            champion,
            currentAttempts,
            "lost",
            page,
            user.id,
            streak
          );

        await interaction.update({
          embeds: [embed],
          components: [],
          ephemeral: true
        });

        return interaction.followUp({
          content:
            `❌ ${interaction.user.username} ha perdido el Loldle de hoy.`,
          ephemeral: false
        });
      }


      const streak =
        await getUserStreak(
          interaction.user.id
        );

      const embed =
        buildLoldleEmbed(
          champion,
          currentAttempts,
          "playing",
          page,
          user.id,
          streak
        );

      return interaction.update({
        embeds: [embed],

        components:
          buildLoldleComponents(
            champion,
            page
          ),

        ephemeral: true
      });
    }


    /*
     * ========================================================
     * BUSCAR CAMPEÓN
     * ========================================================
     */

    const modal =
      new ModalBuilder()
        .setCustomId(
          "loldle-search-modal"
        )
        .setTitle(
          "Buscar campeón"
        );

    const championInput =
      new TextInputBuilder()
        .setCustomId(
          "loldle-search-query"
        )
        .setLabel(
          "Nombre del campeón"
        )
        .setStyle(
          TextInputStyle.Short
        )
        .setPlaceholder(
          "Ej. Ahri, Lucian, Twisted Fate"
        )
        .setRequired(
          true
        );

    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(
          championInput
        )
    );

    return interaction.showModal(
      modal
    );
  },


  /*
   * ==========================================================
   * MODAL DE BÚSQUEDA
   * ==========================================================
   */

  async handleModalSubmit(
    interaction
  ) {
    const query =
      interaction.fields
        .getTextInputValue(
          "loldle-search-query"
        )
        .trim();

    const today =
      getLocalDateString();

    const champion =
      getDailyChampion(
        today
      );

    const user =
      await ensureUser(
        interaction.user.id,
        interaction.user.tag
      );

    const currentAttempts =
      Number(
        user.daily_attempts || 0
      );

    const dailySolved =
      Number(
        user.daily_solved || 0
      );


    if (
      dailySolved === 1
    ) {
      return interaction.reply({
        content:
          "✅ Ya completaste el Loldle de hoy.",
        ephemeral: true
      });
    }


    if (
      currentAttempts >=
      MAX_ATTEMPTS
    ) {
      return interaction.reply({
        content:
          `❌ Ya has perdido el Loldle de hoy. El campeón era **${champion.label}**.`,
        ephemeral: true
      });
    }


    const matches =
      findChampionMatches(
        query
      );


    if (
      matches.length === 0
    ) {
      return interaction.reply({
        content:
          `❌ No encontré ningún campeón que coincida con "${query}". Prueba otro nombre.`,
        ephemeral: true
      });
    }


    const exactMatch =
      matches.find(
        (item) =>
          normalizeText(
            item.label
          ) ===
          normalizeText(
            query
          ) ||
          normalizeText(
            item.value
          ) ===
          normalizeText(
            query
          )
      );


    /*
     * ========================================================
     * RESPUESTA EXACTA
     * ========================================================
     */

    if (
      exactMatch
    ) {

      /*
       * ======================================================
       * ACIERTO
       * ======================================================
       */

      if (
        exactMatch.value ===
        champion.value
      ) {

        const streak =
          await getUserStreak(
            interaction.user.id
          );

        const xpGain =
          getLoldleXp(
            currentAttempts,
            streak
          );

        const totalXp =
          user.xp +
          xpGain;

        const nextLevel =
          Math.floor(
            totalXp / 1000
          ) + 1;


        await updateUserFields(
          interaction.user.id,
          {
            daily_attempts:
              currentAttempts + 1,

            xp:
              totalXp,

            level:
              nextLevel,

            wins:
              user.wins + 1,

            daily_solved:
              1
          },
          interaction.member
        );


        const embed =
          buildLoldleEmbed(
            champion,
            currentAttempts,
            "won",
            0,
            user.id,
            streak
          );


        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });


        return interaction.followUp({
          content:
            `🎉 ${interaction.user.username} ha adivinado el campeón y ganado **${xpGain} XP**.`,
          ephemeral: false
        });
      }


      /*
       * ======================================================
       * FALLA
       * ======================================================
       */

      const nextAttempt =
        currentAttempts + 1;


      await updateUserFields(
        interaction.user.id,
        {
          daily_attempts:
            nextAttempt
        }
      );


      if (
        nextAttempt >=
        MAX_ATTEMPTS
      ) {

        const streak =
          await getUserStreak(
            interaction.user.id
          );

        const embed =
          buildLoldleEmbed(
            champion,
            nextAttempt,
            "lost",
            0,
            user.id,
            streak
          );


        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });


        return interaction.followUp({
          content:
            `❌ ${interaction.user.username} ha perdido el Loldle de hoy.`,
          ephemeral: false
        });
      }


      const streak =
        await getUserStreak(
          interaction.user.id
        );

      const embed =
        buildLoldleEmbed(
          champion,
          nextAttempt,
          "playing",
          0,
          user.id,
          streak
        );


      return interaction.reply({
        embeds: [embed],

        components:
          buildLoldleComponents(
            champion,
            0
          ),

        ephemeral: true
      });
    }


    /*
     * ========================================================
     * VARIAS COINCIDENCIAS
     * ========================================================
     */

    const results =
      matches.slice(
        0,
        25
      );

    const streak =
      await getUserStreak(
        interaction.user.id
      );

    const embed =
      buildLoldleEmbed(
        champion,
        currentAttempts,
        "playing",
        0,
        user.id,
        streak
      );

    const row =
      buildSelectRow(
        champion,
        results
      );

    const content =
      `📋 He encontrado ${matches.length} coincidencias. Selecciona el campeón correcto:`;

    return interaction.reply({
      content,

      embeds: [embed],

      components: [row],

      ephemeral: true
    });
  },


  /*
   * ==========================================================
   * SELECT MENU
   * ==========================================================
   */

  async handleSelectMenu(
    interaction
  ) {
    const guess =
      interaction.values[0];

    const today =
      getLocalDateString();

    const champion =
      getDailyChampion(
        today
      );

    const user =
      await ensureUser(
        interaction.user.id,
        interaction.user.tag
      );

    const currentAttempts =
      Number(
        user.daily_attempts || 0
      );

    const dailySolved =
      Number(
        user.daily_solved || 0
      );


    if (
      dailySolved === 1
    ) {
      return interaction.update({
        content:
          "✅ Ya completaste el Loldle de hoy.",
        embeds: [],
        components: []
      });
    }


    if (
      currentAttempts >=
      MAX_ATTEMPTS
    ) {
      return interaction.update({
        content:
          `❌ Ya has perdido el Loldle de hoy. El campeón era **${champion.label}**.`,
        embeds: [],
        components: []
      });
    }


    /*
     * ========================================================
     * ACIERTO
     * ========================================================
     */

    if (
      guess === champion.value
    ) {

      const streak =
        await getUserStreak(
          interaction.user.id
        );

      const xpGain =
        getLoldleXp(
          currentAttempts,
          streak
        );

      const totalXp =
        user.xp +
        xpGain;

      const nextLevel =
        Math.floor(
          totalXp / 1000
        ) + 1;


      await updateUserFields(
        interaction.user.id,
        {
          daily_attempts:
            currentAttempts + 1,

          xp:
            totalXp,

          level:
            nextLevel,

          wins:
            user.wins + 1,

          daily_solved:
            1
        },
        interaction.member
      );


      const embed =
        buildLoldleEmbed(
          champion,
          currentAttempts,
          "won",
          0,
          user.id,
          streak
        );


      await interaction.update({
        embeds: [embed],
        components: [],
        ephemeral: true
      });


      return interaction.followUp({
        content:
          `🎉 ${interaction.user.username} ha adivinado el campeón y ganado **${xpGain} XP**.`,
        ephemeral: false
      });
    }


    /*
     * ========================================================
     * FALLA
     * ========================================================
     */

    const nextAttempt =
      currentAttempts + 1;


    await updateUserFields(
      interaction.user.id,
      {
        daily_attempts:
          nextAttempt
      }
    );


    if (
      nextAttempt >=
      MAX_ATTEMPTS
    ) {

      const streak =
        await getUserStreak(
          interaction.user.id
        );

      const embed =
        buildLoldleEmbed(
          champion,
          nextAttempt,
          "lost",
          0,
          user.id,
          streak
        );


      await interaction.update({
        embeds: [embed],
        components: [],
        ephemeral: true
      });


      return interaction.followUp({
        content:
          `💀 ${interaction.user.username} ha perdido el Loldle de hoy.`,
        ephemeral: false
      });
    }


    const streak =
      await getUserStreak(
        interaction.user.id
      );

    const embed =
      buildLoldleEmbed(
        champion,
        nextAttempt,
        "playing",
        0,
        user.id,
        streak
      );


    return interaction.update({
      embeds: [embed],

      components:
        buildLoldleComponents(
          champion,
          0
        )
    });
  }
};