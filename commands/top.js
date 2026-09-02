const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const {
  getTopUsers
} = require("../database/users");


/*
============================================================
CONFIGURACIÓN
============================================================
*/

const TOP_LIMIT = 10;


/*
============================================================
MEDALLAS
============================================================
*/

function getPositionEmoji(
  position
) {

  if (
    position === 1
  ) {

    return "🥇";

  }

  if (
    position === 2
  ) {

    return "🥈";

  }

  if (
    position === 3
  ) {

    return "🥉";

  }

  return `** ${position}.** `;

}


/*
============================================================
COMANDO /TOP
============================================================
*/

module.exports = {

  data:

    new SlashCommandBuilder()

      .setName(
        "top"
      )

      .setDescription(
        "Muestra el ranking top 10 de jugadores por XP"
      ),


  async execute(
    interaction
  ) {

    try {

      /*
       * ==================================================
       * OBTENER JUGADORES
       * ==================================================
       */

      const topUsers =
        await getTopUsers(
          TOP_LIMIT
        );


      /*
       * ==================================================
       * COMPROBAR SI HAY JUGADORES
       * ==================================================
       */

      if (
        !topUsers.length
      ) {

        return interaction.reply({

          content:
            "🏆 Todavía no hay jugadores registrados.",

          ephemeral: true

        });

      }


      /*
       * ==================================================
       * CREAR DESCRIPCIÓN
       * ==================================================
       */

      const description =
        topUsers
          .map(
            (
              user,
              index
            ) => {

              const position =
                index + 1;


              const xp =
                Number(
                  user.xp || 0
                );


              return (

                `${getPositionEmoji(position)} ` +

                `** ${user.username}**\n` +

                `⭐ ** ${xp.toLocaleString("es-ES")} XP ** `

              );

            }
          )
          .join(
            "\n\n"
          );


      /*
       * ==================================================
       * CREAR EMBED
       * ==================================================
       */

      const embed =
        new EmbedBuilder()

          .setTitle(
            "🏆 TOP JUGADORES XP"
          )

          .setDescription(
            description
          )

          .setFooter({

            text:
              "Ranking de jugadores según su experiencia total."

          });


      /*
       * ==================================================
       * RESPUESTA
       * ==================================================
       */

      return interaction.reply({

        embeds: [
          embed
        ]

      });

    } catch (error) {

      console.error(
        "Error obteniendo el top de XP:",
        error
      );


      return interaction.reply({

        content:
          "❌ Ha ocurrido un error al obtener el ranking.",

        ephemeral: true

      });

    }

  }

};
