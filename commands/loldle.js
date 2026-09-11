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

/*
 * ============================================================
 * NÚMERO DE INTENTOS
 * ============================================================
 *
 * El número de intentos depende de la dificultad del campeón,
 * que a su vez define cuántos emojis (pistas) tiene:
 *
 * - Fácil  → 3 emojis → 3 intentos.
 * - Medio  → 4 emojis → 4 intentos.
 * - Difícil → 5 emojis → 5 intentos.
 *
 * Se calcula con getMaxAttempts(champion).
 * ============================================================
 */

const CHAMPIONS = [
  { value: "ahri", label: "Ahri", difficulty: "easy", emojis: ["🦊", "✨", "🌙"] },
  { value: "akali", label: "Akali", difficulty: "easy", emojis: ["🗡️", "🌙", "💨"] },
  { value: "alistar", label: "Alistar", difficulty: "easy", emojis: ["🐂", "💪", "👊"] },
  { value: "amumu", label: "Amumu", difficulty: "medium", emojis: ["🧟", "😢", "🕯️", "⚰️"] },
  { value: "anivia", label: "Anivia", difficulty: "hard", emojis: ["❄️", "🕊️", "🧊", "🥚", "🌨️"] },
  { value: "annie", label: "Annie", difficulty: "easy", emojis: ["🧸", "🔥", "🎀"] },
  { value: "aphelios", label: "Aphelios", difficulty: "hard", emojis: ["🌙", "🔫", "🌑", "🗡️", "⏳"] },
  { value: "ashe", label: "Ashe", difficulty: "easy", emojis: ["🏹", "❄️", "👑"] },
  { value: "aurelionsol", label: "Aurelion Sol", difficulty: "medium", emojis: ["🌟", "🐉", "🌌", "☄️"] },
  { value: "azir", label: "Azir", difficulty: "hard", emojis: ["👑", "🦅", "🏺", "☀️", "🏜️"] },
  { value: "bard", label: "Bard", difficulty: "medium", emojis: ["🔔", "🌌", "🧔🏼‍♀️", "🌀"] },
  { value: "blitzcrank", label: "Blitzcrank", difficulty: "easy", emojis: ["🤖", "🧲", "⚡"] },
  { value: "brand", label: "Brand", difficulty: "easy", emojis: ["🔥", "💀", "🌋"] },
  { value: "braum", label: "Braum", difficulty: "medium", emojis: ["🛡️", "💪", "🍺", "❄️"] },
  { value: "caitlyn", label: "Caitlyn", difficulty: "easy", emojis: ["🔫", "🎩", "🎯"] },
  { value: "camille", label: "Camille", difficulty: "medium", emojis: ["🦾", "🗡️", "👠", "⚙️"] },
  { value: "cassiopeia", label: "Cassiopeia", difficulty: "hard", emojis: ["🐍", "🌙", "🔮", "☠️", "🪨"] },
  { value: "chogath", label: "Cho'Gath", difficulty: "hard", emojis: ["🦖", "🍽️", "👑", "🦴", "🧬"] },
  { value: "corki", label: "Corki", difficulty: "hard", emojis: ["✈️", "💣", "🧨", "🔫", "🚀"] },
  { value: "darius", label: "Darius", difficulty: "easy", emojis: ["🪓", "🩸", "👑"] },
  { value: "diana", label: "Diana", difficulty: "medium", emojis: ["🌙", "🗡️", "✨", "🌑"] },
  { value: "drmundo", label: "Dr. Mundo", difficulty: "easy", emojis: ["🧟", "🔪", "💀"] }, //Seguir revisando
  { value: "ekko", label: "Ekko", difficulty: "easy", emojis: ["⏳", "⚔️", "💥"] },
  { value: "elise", label: "Elise", difficulty: "medium", emojis: ["🕷️", "🕸️", "💀", "👑"] },
  { value: "evelynn", label: "Evelynn", difficulty: "easy", emojis: ["😈", "🖤", "💋"] },
  { value: "ezreal", label: "Ezreal", difficulty: "easy", emojis: ["🔫", "✨", "💥"] },
  { value: "fiddlesticks", label: "Fiddlesticks", difficulty: "medium", emojis: ["🌾", "🪓", "👻", "🐦"] },
  { value: "fiora", label: "Fiora", difficulty: "medium", emojis: ["🗡️", "💃", "🎯", "🌹"] },
  { value: "fizz", label: "Fizz", difficulty: "easy", emojis: ["🐟", "🔱", "🌊"] },
  { value: "galio", label: "Galio", difficulty: "medium", emojis: ["🗿", "🛡️", "⚖️", "🕊️"] },
  { value: "gangplank", label: "Gangplank", difficulty: "medium", emojis: ["🏴‍☠️", "💣", "⚓", "🍊"] },
  { value: "garen", label: "Garen", difficulty: "easy", emojis: ["🛡️", "⚔️", "👑"] },
  { value: "gnar", label: "Gnar", difficulty: "medium", emojis: ["🦖", "🪓", "👊", "🪃"] },
  { value: "gragas", label: "Gragas", difficulty: "medium", emojis: ["🍺", "⚔️", "🐻", "🛢️"] },
  { value: "graves", label: "Graves", difficulty: "easy", emojis: ["🔫", "💨", "🚬"] },
  { value: "hecarim", label: "Hecarim", difficulty: "medium", emojis: ["🐎", "⚔️", "💀", "👻"] },
  { value: "heimerdinger", label: "Heimerdinger", difficulty: "hard", emojis: ["🧠", "🔧", "🧪", "🤖", "🛠️"] },
  { value: "illaoi", label: "Illaoi", difficulty: "hard", emojis: ["🪢", "💪", "🐙", "🛐", "🌊"] },
  { value: "irelia", label: "Irelia", difficulty: "easy", emojis: ["🗡️", "🌀", "🎐"] },
  { value: "ivern", label: "Ivern", difficulty: "hard", emojis: ["🌳", "🧚", "🌿", "🦌", "🍃"] },
  { value: "janna", label: "Janna", difficulty: "medium", emojis: ["🌬️", "☔", "🌪️", "🕊️"] },
  { value: "jarvaniv", label: "Jarvan IV", difficulty: "medium", emojis: ["⚔️", "🛡️", "👑", "🚩"] },
  { value: "jax", label: "Jax", difficulty: "medium", emojis: ["🪓", "🏋️", "💥", "🥋"] },
  { value: "jhin", label: "Jhin", difficulty: "medium", emojis: ["🎭", "🔫", "🎯", "🌹"] },
  { value: "jinx", label: "Jinx", difficulty: "easy", emojis: ["💣", "🔫", "🎆"] },
  { value: "kaisa", label: "Kai'Sa", difficulty: "easy", emojis: ["🔫", "🌌", "✨"] },
  { value: "kalista", label: "Kalista", difficulty: "hard", emojis: ["🗡️", "👻", "⚰️", "🖤", "🩸"] },
  { value: "karma", label: "Karma", difficulty: "medium", emojis: ["🪷", "✨", "🌀", "🧘"] },
  { value: "karthus", label: "Karthus", difficulty: "hard", emojis: ["💀", "🎼", "⛓️", "🕯️", "🎤"] },
  { value: "kassadin", label: "Kassadin", difficulty: "hard", emojis: ["🌀", "⚡", "🔮", "🗡️", "🌌"] },
  { value: "katarina", label: "Katarina", difficulty: "easy", emojis: ["🔪", "🩸", "💃"] },
  { value: "kayle", label: "Kayle", difficulty: "medium", emojis: ["🦅", "⚔️", "✨", "👼"] },
  { value: "kayn", label: "Kayn", difficulty: "medium", emojis: ["🪓", "🌪️", "🖤", "🔴"] },
  { value: "kennen", label: "Kennen", difficulty: "medium", emojis: ["⚡", "🌀", "🎯", "🥷"] },
  { value: "khazix", label: "Kha'Zix", difficulty: "medium", emojis: ["🦗", "🔪", "🦴", "🧬"] },
  { value: "kindred", label: "Kindred", difficulty: "medium", emojis: ["🐺", "🐑", "🌙", "🏹"] },
  { value: "kled", label: "Kled", difficulty: "hard", emojis: ["🐴", "🛡️", "⚔️", "🦎", "😤"] },
  { value: "kogmaw", label: "Kog'Maw", difficulty: "hard", emojis: ["🐛", "🦴", "💧", "🦠", "☠️"] },
  { value: "leblanc", label: "LeBlanc", difficulty: "medium", emojis: ["🪞", "🔮", "🎭", "🟣"] },
  { value: "leesin", label: "Lee Sin", difficulty: "easy", emojis: ["👊", "🌀", "🧘"] },
  { value: "leona", label: "Leona", difficulty: "easy", emojis: ["☀️", "🛡️", "⚔️"] },
  { value: "lissandra", label: "Lissandra", difficulty: "hard", emojis: ["❄️", "🔮", "🧊", "👑", "💀"] },
  { value: "lucian", label: "Lucian", difficulty: "easy", emojis: ["🔫", "💥", "🌕"] },
  { value: "lulu", label: "Lulu", difficulty: "medium", emojis: ["🧚", "🎩", "✨", "🟣"] },
  { value: "lux", label: "Lux", difficulty: "easy", emojis: ["✨", "🪄", "🌟"] },
  { value: "malphite", label: "Malphite", difficulty: "easy", emojis: ["🪨", "🛡️", "🌋"] },
  { value: "malzahar", label: "Malzahar", difficulty: "hard", emojis: ["🔮", "🟣", "👁️", "🐛", "🌀"] },
  { value: "maokai", label: "Maokai", difficulty: "medium", emojis: ["🌳", "🍃", "🐻", "🪵"] },
  { value: "masteryi", label: "Master Yi", difficulty: "easy", emojis: ["🗡️", "👁️", "⚡"] },
  { value: "missfortune", label: "Miss Fortune", difficulty: "easy", emojis: ["🔫", "💋", "💰"] },
  { value: "mordekaiser", label: "Mordekaiser", difficulty: "medium", emojis: ["⛓️", "🛡️", "💀", "⚔️"] },
  { value: "morgana", label: "Morgana", difficulty: "easy", emojis: ["🕊️", "⛓️", "🌑"] },
  { value: "nami", label: "Nami", difficulty: "easy", emojis: ["🧜‍♀️", "🌊", "🐟"] },
  { value: "nasus", label: "Nasus", difficulty: "medium", emojis: ["🐺", "🪓", "⚱️", "🏜️"] },
  { value: "nautilus", label: "Nautilus", difficulty: "medium", emojis: ["⚓", "🛡️", "🌊", "🐙"] },
  { value: "neeko", label: "Neeko", difficulty: "hard", emojis: ["🦎", "🌺", "✨", "🎭", "🌈"] },
  { value: "nocturne", label: "Nocturne", difficulty: "medium", emojis: ["🌑", "🗡️", "🖤", "👁️"] },
  { value: "nunu", label: "Nunu", difficulty: "medium", emojis: ["❄️", "🐻", "🍪", "🎵"] },
  { value: "olaf", label: "Olaf", difficulty: "medium", emojis: ["🪓", "🍺", "🛡️", "❄️"] },
  { value: "orianna", label: "Orianna", difficulty: "medium", emojis: ["🤖", "⚙️", "⚽", "🎶"] },
  { value: "ornn", label: "Ornn", difficulty: "hard", emojis: ["🐏", "🔨", "🔥", "⚒️", "❄️"] },
  { value: "pantheon", label: "Pantheon", difficulty: "medium", emojis: ["🛡️", "🏹", "🏛️", "🗡️"] },
  { value: "poppy", label: "Poppy", difficulty: "medium", emojis: ["🔨", "🛡️", "🌟", "⛏️"] },
  { value: "pyke", label: "Pyke", difficulty: "easy", emojis: ["🔪", "🌊", "💀"] },
  { value: "qiyana", label: "Qiyana", difficulty: "hard", emojis: ["🌿", "🌀", "🪨", "🌊", "👑"] },
  { value: "quinn", label: "Quinn", difficulty: "hard", emojis: ["🦅", "🏹", "🌲", "🗡️", "🕵️"] },
  { value: "rakan", label: "Rakan", difficulty: "medium", emojis: ["🕊️", "✨", "🦅", "💃"] },
  { value: "rammus", label: "Rammus", difficulty: "medium", emojis: ["🛡️", "🌀", "🦔", "🏜️"] },
  { value: "reksai", label: "Rek'Sai", difficulty: "hard", emojis: ["🦗", "🌋", "🦴", "🕳️", "👁️"] },
  { value: "rengar", label: "Rengar", difficulty: "medium", emojis: ["🐆", "⚔️", "🩸", "🌿"] },
  { value: "riven", label: "Riven", difficulty: "easy", emojis: ["🗡️", "🟢", "👩🏻‍🦳​"] },
  { value: "rumble", label: "Rumble", difficulty: "hard", emojis: ["🔥", "🛠️", "🤖", "⚙️", "🚀"] },
  { value: "ryze", label: "Ryze", difficulty: "hard", emojis: ["📜", "🔮", "⚡", "🌍", "🌀"] },
  { value: "samira", label: "Samira", difficulty: "easy", emojis: ["🔫", "💥", "❤️"] },
  { value: "senna", label: "Senna", difficulty: "easy", emojis: ["🌑", "🔫", "💀"] },
  { value: "seraphine", label: "Seraphine", difficulty: "easy", emojis: ["🎤", "🎶", "✨"] },
  { value: "sett", label: "Sett", difficulty: "easy", emojis: ["👊", "🥊", "🐻"] },
  { value: "shaco", label: "Shaco", difficulty: "medium", emojis: ["🃏", "🎭", "🔪", "💨"] },
  { value: "shen", label: "Shen", difficulty: "medium", emojis: ["🛡️", "💨", "🥷", "⚖️"] },
  { value: "sejuani", label: "Sejuani", difficulty: "hard", emojis: ["❄️", "🐴", "🛡️", "🐗", "🔨"] },
  { value: "shyvana", label: "Shyvana", difficulty: "medium", emojis: ["🐲", "🔥", "🛡️", "🦎"] },
  { value: "singed", label: "Singed", difficulty: "medium", emojis: ["🧪", "💨", "☠️", "🛢️"] },
  { value: "sion", label: "Sion", difficulty: "medium", emojis: ["⚔️", "🛡️", "💀", "🪓"] },
  { value: "sivir", label: "Sivir", difficulty: "easy", emojis: ["🛡️", "🏹", "🌪️"] },
  { value: "skarner", label: "Skarner", difficulty: "hard", emojis: ["🦂", "🛡️", "🏜️", "💎", "🪨"] },
  { value: "sona", label: "Sona", difficulty: "easy", emojis: ["🎼", "🎻", "✨"] },
  { value: "swain", label: "Swain", difficulty: "medium", emojis: ["🐦", "🌀", "🧠", "🦅"] },
  { value: "sylas", label: "Sylas", difficulty: "medium", emojis: ["⛓️", "🔥", "⚔️", "👑"] },
  { value: "tahmkench", label: "Tahm Kench", difficulty: "hard", emojis: ["🐸", "🍽️", "🌊", "💋", "💰"] },
  { value: "taliyah", label: "Taliyah", difficulty: "hard", emojis: ["🪨", "💨", "🌪️", "🏔️", "🧵"] },
  { value: "talon", label: "Talon", difficulty: "easy", emojis: ["🗡️", "🖤", "💨"] },
  { value: "taric", label: "Taric", difficulty: "medium", emojis: ["💎", "✨", "🛡️", "🔨"] },
  { value: "tristana", label: "Tristana", difficulty: "easy", emojis: ["💣", "🎯", "🚀"] },
  { value: "trundle", label: "Trundle", difficulty: "hard", emojis: ["🪓", "❄️", "🧊", "👑", "🐗"] },
  { value: "tryndamere", label: "Tryndamere", difficulty: "easy", emojis: ["🗡️", "🔥", "💪"] },
  { value: "twistedfate", label: "Twisted Fate", difficulty: "medium", emojis: ["🎴", "🃏", "✨", "🎩"] },
  { value: "twitch", label: "Twitch", difficulty: "easy", emojis: ["🧪", "🧟", "🏹"] },
  { value: "udyr", label: "Udyr", difficulty: "hard", emojis: ["🐻", "🐍", "🐅", "🐢", "🥋"] },
  { value: "urgot", label: "Urgot", difficulty: "hard", emojis: ["🔫", "🦾", "☠️", "⛓️", "🕷️"] },
  { value: "varus", label: "Varus", difficulty: "medium", emojis: ["🏹", "💀", "💨", "🟣"] },
  { value: "veigar", label: "Veigar", difficulty: "easy", emojis: ["🧙", "🔮", "⚫"] },
  { value: "velkoz", label: "Vel'Koz", difficulty: "hard", emojis: ["👁️", "🧬", "🌌", "🦑", "⚡"] },
  { value: "vi", label: "Vi", difficulty: "easy", emojis: ["🥊", "👊", "⚡"] },
  { value: "viktor", label: "Viktor", difficulty: "hard", emojis: ["🤖", "⚙️", "🦾", "🔮", "⚡"] },
  { value: "vladimir", label: "Vladimir", difficulty: "medium", emojis: ["🩸", "🧛", "🌑", "🦇"] },
  { value: "volibear", label: "Volibear", difficulty: "medium", emojis: ["🐻", "⚡", "🌩️", "🌲"] },
  { value: "warwick", label: "Warwick", difficulty: "easy", emojis: ["🐺", "🔪", "🩸"] },
  { value: "wukong", label: "Wukong", difficulty: "medium", emojis: ["🪓", "🐒", "💨", "☁️"] },
  { value: "xayah", label: "Xayah", difficulty: "medium", emojis: ["🪶", "🏹", "🌺", "💜"] },
  { value: "xerath", label: "Xerath", difficulty: "hard", emojis: ["🔮", "⚡", "✨", "☀️", "👑"] },
  { value: "xinzhao", label: "Xin Zhao", difficulty: "medium", emojis: ["⚔️", "🐴", "🏹", "👑"] },
  { value: "yone", label: "Yone", difficulty: "easy", emojis: ["🗡️", "🌪️", "👻"] },
  { value: "yorick", label: "Yorick", difficulty: "hard", emojis: ["⚰️", "💀", "🪦", "⛏️", "👰"] },
  { value: "yuumi", label: "Yuumi", difficulty: "easy", emojis: ["😺", "📖", "✨"] },
  { value: "zac", label: "Zac", difficulty: "medium", emojis: ["🟢", "💪", "🌀", "🧪"] },
  { value: "ziggs", label: "Ziggs", difficulty: "medium", emojis: ["💣", "🎇", "🧨", "💥"] },
  { value: "zilean", label: "Zilean", difficulty: "hard", emojis: ["⏳", "🕰️", "✨", "⏱️", "🌌"] },
  { value: "aatrox", label: "Aatrox", difficulty: "medium", emojis: ["🗡️", "🔥", "💀", "🩸"] },
  { value: "akshan", label: "Akshan", difficulty: "medium", emojis: ["🪝", "🔫", "😎", "💥"] },
  { value: "ambessa", label: "Ambessa", difficulty: "hard", emojis: ["⚔️", "🛡️", "🔥", "👑", "🦾"] },
  { value: "aurora", label: "Aurora", difficulty: "easy", emojis: ["☀️", "✨", "🪶"] },
  { value: "belveth", label: "Bel'Veth", difficulty: "hard", emojis: ["👑", "🟣", "🕳️", "🧠", "🐜"] },
  { value: "briar", label: "Briar", difficulty: "hard", emojis: ["⛓️", "🎭", "🩸", "🌙", "😢"] },
  { value: "draven", label: "Draven", difficulty: "easy", emojis: ["🪓", "⭐", "👏"] },
  { value: "hwei", label: "Hwei", difficulty: "hard", emojis: ["🖌️", "🎨", "✨", "🖤", "🌗"] },
  { value: "jayce", label: "Jayce", difficulty: "hard", emojis: ["🔨", "⚙️", "🧠", "💥", "🧪"] },
  { value: "lillia", label: "Lillia", difficulty: "easy", emojis: ["🦌", "🌼", "✨"] },
  { value: "milio", label: "Milio", difficulty: "easy", emojis: ["🔥", "🎇", "✨"] },
  { value: "nidalee", label: "Nidalee", difficulty: "medium", emojis: ["🐆", "🩸", "🌿", "🐾"] },
  { value: "nilah", label: "Nilah", difficulty: "easy", emojis: ["💧", "🌊", "💃"] },
  { value: "rell", label: "Rell", difficulty: "hard", emojis: ["🐴", "🛡️", "⚙️", "🗡️", "💜"] },
  { value: "smolder", label: "Smolder", difficulty: "hard", emojis: ["🐉", "🔥", "🌋", "💥", "😤"] },
  { value: "soraka", label: "Soraka", difficulty: "easy", emojis: ["🌧️", "🪶", "☀️"] },
  { value: "teemo", label: "Teemo", difficulty: "easy", emojis: ["🍄", "🎯", "☠️"] },
  { value: "thresh", label: "Thresh", difficulty: "medium", emojis: ["⛓️", "🪝", "🕯️", "👻"] },
  { value: "vayne", label: "Vayne", difficulty: "medium", emojis: ["🏹", "🌙", "🎯", "😈"] },
  { value: "viego", label: "Viego", difficulty: "hard", emojis: ["👑", "🗡️", "💍", "🌫️", "💀"] },
  { value: "zeri", label: "Zeri", difficulty: "easy", emojis: ["⚡", "🔫", "​👈"] },
  { value: "gwen", label: "Gwen", difficulty: "medium", emojis: ["🧵", "✂️", "✨", "🌫️"] },
  { value: "ksante", label: "K'Sante", difficulty: "medium", emojis: ["🗡️", "💪", "🏜️", "✨"] },
  { value: "locke", label: "Locke", difficulty: "medium", emojis: ["🔨", "😈", "🕯️", "💀"] },
  { value: "mel", label: "Mel", difficulty: "medium", emojis: ["🪞", "👁️", "💎", "🖤"] },
  { value: "naafiri", label: "Naafiri", difficulty: "medium", emojis: ["🐕", "🦴", "🏜️", "🩸"] },
  { value: "renata", label: "Renata", difficulty: "medium", emojis: ["🧪", "💼", "🎧", "💰"] },
  { value: "renekton", label: "Renekton", difficulty: "hard", emojis: ["⚔️", "💀", "🔥", "🏜️", "🩸"] },
  { value: "syndra", label: "Syndra", difficulty: "hard", emojis: ["🔮", "🌙", "💀", "🟣", "👁️"] },
  { value: "vex", label: "Vex", difficulty: "medium", emojis: ["🌫️", "😒", "🖤", "🌙"] },
  { value: "yasuo", label: "Yasuo", difficulty: "easy", emojis: ["⚔️", "🌪️", "🌬️"] },
  { value: "yunara", label: "Yunara", difficulty: "medium", emojis: ["🗡️", "🌌", "✨", "🧘"] },
  { value: "zaahen", label: "Zaahen", difficulty: "hard", emojis: ["🗡️", "⚡", "🔥", "😇", "😈"] },
  { value: "zed", label: "Zed", difficulty: "medium", emojis: ["🥷", "🔪", "🌑", "💨"] },
  { value: "zoe", label: "Zoe", difficulty: "medium", emojis: ["🌌", "🎭", "✨", "🌀"] },
  { value: "zyra", label: "Zyra", difficulty: "hard", emojis: ["🌹", "🌿", "🩸", "😈", "🌵"] }
];


/*
 * ============================================================
 * NÚMERO DE INTENTOS
 * ============================================================
 *
 * El número de intentos coincide con el número de emojis
 * (pistas) definidos para cada campeón:
 *
 * - Fácil  → 3 emojis → 3 intentos.
 * - Medio  → 4 emojis → 4 intentos.
 * - Difícil → 5 emojis → 5 intentos.
 *
 * A medida que el jugador falla se van revelando los emojis
 * restantes (uno por cada intento fallido).
 * ============================================================
 */

function getMaxAttempts(champion) {
  return champion.emojis.length;
}


/*
 * ============================================================
 * VALIDACIÓN DE LA DIFICULTAD
 * ============================================================
 *
 * Comprueba que la dificultad declarada de cada campeón
 * coincide con el número de emojis definidos.
 * ============================================================
 */

const EMOJIS_POR_DIFICULTAD = {
  easy: 3,
  medium: 4,
  hard: 5
};

for (const champion of CHAMPIONS) {

  const esperado =
    EMOJIS_POR_DIFICULTAD[champion.difficulty];

  if (
    esperado === undefined ||
    champion.emojis.length !== esperado
  ) {

    throw new Error(
      `Loldle: el campeón "${champion.value}" tiene dificultad "${champion.difficulty}" pero ${champion.emojis.length} emojis (se esperaban ${esperado}).`
    );

  }

}


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
 * Intento 1 → 650 XP
 * Intento 2 → 600 XP
 * Intento 3 → 550 XP
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
    650 - attempts * 50
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
      getMaxAttempts(champion)
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
    getMaxAttempts(champion) - attempts;

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
      getMaxAttempts(champion)
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
        getMaxAttempts(champion)
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

        return interaction.channel.send({
          content:
            `❌ ${interaction.user.username} ha perdido el Loldle de hoy.`
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
      getMaxAttempts(champion)
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


        return interaction.channel.send({
          content:
            `🎉 ${interaction.user.username} ha adivinado el campeón y ganado **${xpGain} XP**.`
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
        getMaxAttempts(champion)
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


        return interaction.channel.send({
          content:
            `❌ ${interaction.user.username} ha perdido el Loldle de hoy.`
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
      getMaxAttempts(champion)
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


      return interaction.channel.send({
        content:
          `🎉 ${interaction.user.username} ha adivinado el campeón y ganado **${xpGain} XP**.`
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
      getMaxAttempts(champion)
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


      return interaction.channel.send({
        content:
          `💀 ${interaction.user.username} ha perdido el Loldle de hoy.`
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