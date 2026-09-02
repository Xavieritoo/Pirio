const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");

const path = require("path");
const fs = require("fs");

const {
  ensureUser,
  getTotalXpForLevel,
  getXpForNextLevel
} = require("../database/users");

const {
  getCurrentLevelRole
} = require("../database/rango");


/*
============================================================
FECHA LOCAL
============================================================
*/

function getLocalDateString() {

  const now =
    new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

}


/*
============================================================
FECHA DE AYER
============================================================
*/

function getYesterdayDateString() {

  const yesterday =
    new Date();

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  return `${yesterday.getFullYear()}-${String(
    yesterday.getMonth() + 1
  ).padStart(2, "0")}-${String(
    yesterday.getDate()
  ).padStart(2, "0")}`;

}


/*
============================================================
BARRA DE XP
============================================================
*/

function createXpBar(
  current,
  max
) {

  const totalBlocks =
    10;


  const filledBlocks =
    Math.min(

      totalBlocks,

      Math.max(

        0,

        Math.round(
          (current / max) *
          totalBlocks
        )

      )

    );


  const emptyBlocks =
    totalBlocks -
    filledBlocks;


  const filled =
    "🟥​".repeat(
      filledBlocks
    );


  const empty =
    "⬜".repeat(
      emptyBlocks
    );


  return `${filled}${empty}`;

}


/*
============================================================
COLOR DEL PERFIL SEGÚN EL RANGO
============================================================
*/

function getProfileColor(
  level
) {

  const userLevel =
    Number(level || 1);


  if (userLevel >= 100) {

    return "#00ff84";

  }


  if (userLevel >= 60) {

    return "#d5c888";

  }


  if (userLevel >= 30) {

    return "#56956e";

  }


  if (userLevel >= 10) {

    return "#546e7a";

  }


  return "#ffffff";

}


/*
============================================================
INFORMACIÓN DE MINERALES
============================================================
*/

const MINERAL_NAMES = {

  stone:
    "Piedra",

  coal:
    "Carbón",

  iron:
    "Hierro",

  gold:
    "Oro",

  quartz:
    "Cuarzo",

  emerald:
    "Esmeralda",

  ruby:
    "Rubí",

  diamond:
    "Diamante",

  obsidian:
    "Obsidiana",

  blackopal:
    "Ópalo Negro",

  paraiba:
    "Turmalina Paraíba",

  ancient:
    "Artefacto Antiguo",

  taaffeita:
    "Taaffeíta",

  masterball:
    "Master Ball",

  behelit:
    "Behelit",

  painita:
    "Painita",

  jeremejevita:
    "Jeremejevita",

  musgravita:
    "Musgravita",

  galdrabok:
    "Galdrabók"

  ,criptonita: "Criptonita"
  ,nukacola: "Nuka-Cola"
  ,luckyblock: "Lucky Block"
  ,portalgun: "Portal Gun"
  ,raygun: "Pistola de Rayos"
  ,keyblade: "Llave Espada"
  ,omnitrix: "Omnitrix"
  ,gomugomu: "Gomu Gomu no Mi"
  ,indunnapple: "Manzana de Idunn"
  ,sarten: "Sartén"
  ,puppet: "Marioneta"
  ,holygrenade: "Granada Sagrada"
  ,deathnote: "Death Note"
  ,dedosukuna: "Dedo de Sukuna"
  ,triforce: "Trifuerza"
  ,dovahkiin: "Dovahkiin"
  ,elpoder: "El Poder"
  ,leavemealone: "Leave Me Alone"

};


/*
============================================================
COMANDO /PERFIL
============================================================
*/

module.exports = {

  data:

    new SlashCommandBuilder()

      .setName(
        "perfil"
      )

      .setDescription(
        "Muestra tus puntos y partidas ganadas"
      ),


  async execute(
    interaction
  ) {

    /*
     * ========================================================
     * OBTENER USUARIO
     * ========================================================
     */

    const user =
      await ensureUser(

        interaction.user.id,

        interaction.user.tag

      );


    /*
     * ========================================================
     * AVATAR
     * ========================================================
     */

    const avatarUrl =
      interaction.user.displayAvatarURL({

        extension:
          "png",

        size:
          1024,

        forceStatic:
          false

      });


    /*
     * ========================================================
     * OBTENER MIEMBRO DE DISCORD
     * ========================================================
     */

    const member =
      interaction.guild
        ? await interaction.guild.members.fetch(
          interaction.user.id
        ).catch(
          () => null
        )
        : null;


    /*
     * ========================================================
     * RANGO ACTUAL
     * ========================================================
     */

    const currentRole =
      getCurrentLevelRole(
        member
      );


    /*
     * Discord no interpreta menciones dentro de títulos de embeds.
     * Mostramos el rango con el formato visual @Nombre sin dejar
     * el identificador del rol como texto literal.
     */

    const roleLabel =
      currentRole
        ? `${currentRole.name}`
        : "Sin rango";


    /*
     * ========================================================
     * EXPERIENCIA TOTAL ACUMULADA
     * ========================================================
     */

    const currentXp =
      Number(
        user.xp || 0
      );


    /*
     * ========================================================
     * NIVEL ACTUAL
     * ========================================================
     */

    const userLevel =
      Number(
        user.level || 1
      );


    /*
     * ========================================================
     * XP TOTAL CON LA QUE COMIENZA EL NIVEL ACTUAL
     * ========================================================
     */

    const currentLevelTotalXp =
      getTotalXpForLevel(
        userLevel
      );


    /*
     * ========================================================
     * XP NECESARIA DENTRO DEL NIVEL
     * ========================================================
     */

    const xpNeededForNextLevel =
      getXpForNextLevel(
        userLevel
      );


    /*
     * ========================================================
     * XP CONSEGUIDA DENTRO DEL NIVEL
     * ========================================================
     */

    const currentLevelXp =
      Math.max(

        0,

        currentXp -
        currentLevelTotalXp

      );


    /*
     * ========================================================
     * EVITAR SUPERAR LA BARRA
     * ========================================================
     */

    const displayedLevelXp =
      Math.min(

        currentLevelXp,

        xpNeededForNextLevel

      );


    /*
     * ========================================================
     * XP RESTANTE PARA SUBIR
     * ========================================================
     */

    const xpRemaining =
      Math.max(

        0,

        xpNeededForNextLevel -
        displayedLevelXp

      );


    /*
     * ========================================================
     * BARRA DE XP
     * ========================================================
     */

    const xpBar =
      createXpBar(

        displayedLevelXp,

        xpNeededForNextLevel

      );


    /*
     * ========================================================
     * ÚLTIMO DIARIO
     * ========================================================
     */

    const lastDailyDate =
      user.last_daily_date
        ? String(
          user.last_daily_date
        )
        : null;


    const lastDailyLabel =

      lastDailyDate === null

        ? "Nunca"

        : lastDailyDate ===
          getLocalDateString()

          ? "Hoy"

          : lastDailyDate ===
            getYesterdayDateString()

            ? "Ayer"

            : lastDailyDate;


    /*
     * ========================================================
     * RACHA
     * ========================================================
     */

    const dailyStreak =
      Number(
        user.daily_streak ?? 0
      );


    /*
     * ========================================================
     * OBJETO MÁS VALIOSO
     * ========================================================
     */

    let valuableMineralName =
      null;


    let valuableMineralAttachment =
      null;


    if (
      user.most_valuable_mineral
    ) {

      const mineralId =
        String(
          user.most_valuable_mineral
        );


      valuableMineralName =
        MINERAL_NAMES[mineralId] ||
        mineralId;


      const imagePath =
        path.join(

          __dirname,

          "../minerals",

          `${mineralId}.png`

        );


      if (
        fs.existsSync(
          imagePath
        )
      ) {

        valuableMineralAttachment =
          new AttachmentBuilder(

            imagePath,

            {

              name:
                `${mineralId}.png`

            }

          );

      }

    }


    /*
     * ========================================================
     * EMBED PRINCIPAL
     * ========================================================
     */

    const embed =
      new EmbedBuilder()

        .setColor(
          getProfileColor(
            userLevel
          )
        )

        .setTitle(
          `✨ NIVEL ${userLevel} • ${roleLabel}`
        )

        .setAuthor({

          name:
            interaction.user.tag,

          iconURL:
            avatarUrl

        })

        .setThumbnail(
          avatarUrl
        )

        .addFields(

          /*
           * ==================================================
           * PROGRESO
           * ==================================================
           */

          {

            name:
              "`♦️ Progreso`",

            value:

              `${xpBar} **${currentXp.toLocaleString("es-ES")} XP**\n` +

              `${xpRemaining.toLocaleString("es-ES")} XP  **Nivel ${userLevel} → Nivel ${userLevel + 1}**`,

            inline:
              false

          },


          /*
           * ==================================================
           * PARTIDAS GANADAS
           * ==================================================
           */

          {

            name:
              "`🏆 Partidas ganadas`",

            value:
              `**${user.wins || 0}**`,

            inline:
              true

          },


          /*
           * ==================================================
           * RACHA
           * ==================================================
           */

          {

            name:
              "`🔥 Racha`",

            value:
              `**${dailyStreak} días**`,

            inline:
              true

          },


          /*
           * ==================================================
           * ÚLTIMO DIARIO
           * ==================================================
           */

          {

            name:
              "`🕒 Último diario`",

            value:
              lastDailyLabel,

            inline:
              true

          }

        )

        .setFooter({

          text:
            `Usuario: ${interaction.user.tag} • Sigue subiendo de nivel`

        });


    /*
     * ========================================================
     * EMBED DEL OBJETO MÁS VALIOSO
     * ========================================================
     */

    let mineralEmbed =
      null;


    if (
      valuableMineralName
    ) {

      mineralEmbed =
        new EmbedBuilder()

          .setColor(
            getProfileColor(
              userLevel
            )
          )

          .setTitle(
            "💎 Objeto más valioso"
          )

          .setDescription(
            `**${valuableMineralName}**`
          );

    }


    /*
     * ========================================================
     * AÑADIR IMAGEN DEL MINERAL
     * ========================================================
     */

    if (
      mineralEmbed &&
      valuableMineralAttachment
    ) {

      mineralEmbed.setThumbnail(

        `attachment://${user.most_valuable_mineral}.png`

      );

    }


    /*
     * ========================================================
     * PREPARAR EMBEDS
     * ========================================================
     */

    const embeds = [

      embed

    ];


    if (
      mineralEmbed
    ) {

      embeds.push(
        mineralEmbed
      );

    }


    /*
     * ========================================================
     * PREPARAR RESPUESTA
     * ========================================================
 */

    const response = {

      embeds:

        embeds,

      ephemeral:
        false

    };


    /*
     * ========================================================
     * ADJUNTAR IMAGEN
     * ========================================================
     */

    if (
      valuableMineralAttachment
    ) {

      response.files = [

        valuableMineralAttachment

      ];

    }


    /*
     * ========================================================
     * RESPONDER
     * ========================================================
 */

    return interaction.reply(
      response
    );

  }

};
