const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    getMiningTop
} = require("../database/users");

const {
    MINERALS: GAME_MINERALS
} = require("./minar");

/*

============================================================
MINERALES
============================================================


El valor utilizado para ordenar el ranking es el mismo
valor de XP que tiene cada objeto en minar.js.


============================================================
*/

const MINERAL_EMOJIS = {
    stone: "\u{1FAA8}",
    coal: "\u26AB",
    iron: "\u26D3",
    gold: "\u{1FA99}",
    quartz: "\u{1F52E}",
    emerald: "\u{1F49A}",
    ruby: "\u2764",
    diamond: "\u{1F48E}",
    obsidian: "\u{1F5A4}",
    blackopal: "\u{1F311}",
    criptonita: "\u2622",
    nukacola: "\u{1F964}",
    luckyblock: "\u{1F340}",
    paraiba: "\u{1FA7C}",
    leavemealone: "\u{1F441}",
    portalgun: "\u{1F300}",
    ancient: "\u{1F3FA}",
    raygun: "\u{1F52B}",
    keyblade: "\u{1F5DD}",
    taaffeita: "\u{1F49C}",
    omnitrix: "\u231A",
    masterball: "\u{1F7E3}",
    gomugomu: "\u{1F348}",
    indunnapple: "\u{1F34E}",
    behelit: "\u{1F441}",
    sarten: "\u{1F373}",
    painita: "\u{1F525}",
    puppet: "\u{1FA86}",
    holygrenade: "\u{1F4A3}",
    jeremejevita: "\u{1F90D}",
    deathnote: "\u{1F4D3}",
    dedosukuna: "\u{1F590}",
    musgravita: "\u{1F5A4}",
    triforce: "\u{1F53A}",
    dovahkiin: "\u{1F409}",
    elpoder: "\u26A1",
    enchiridion: "\u{1F4D5}"
};

/*
============================================================
MAPA DE MINERALES PARA EL RANKING
============================================================

El nombre y la XP provienen directamente de minar.js,
de modo que el ranking siempre coincide con los valores
reales del minijuego.
============================================================
*/

const MINERALS = {};

for (const mineral of GAME_MINERALS) {
    MINERALS[mineral.id] = {
        name: mineral.name,
        xp: mineral.xp,
        emoji: MINERAL_EMOJIS[mineral.id] || ""
    };
}

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

    return `**${position}.**`;

}

/*

============================================================
COMANDO /TOPMINAR
============================================================
*/

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                "topminar"
            )

            .setDescription(
                "Muestra el ranking de los objetos más valiosos encontrados en minería."
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

            const users =
                await getMiningTop(
                    TOP_LIMIT
                );


            /*
             * ==================================================
             * CONVERTIR Y ORDENAR
             * ==================================================
             */

            const ranking =
                users

                    .map(
                        user => {

                            const mineral =
                                MINERALS[
                                user.most_valuable_mineral
                                ];


                            /*
                             * Si por alguna razón existe un
                             * mineral antiguo que ya no está
                             * definido, lo ignoramos.
                             */

                            if (
                                !mineral
                            ) {

                                return null;

                            }


                            return {

                                username:
                                    user.username,

                                mineralId:
                                    user.most_valuable_mineral,

                                mineral,

                            };

                        }
                    )

                    .filter(
                        user =>
                            user !== null
                    )

                    .sort(
                        (
                            a,
                            b
                        ) =>
                            b.mineral.xp -
                            a.mineral.xp
                    );


            /*
             * ==================================================
             * NO HAY JUGADORES
             * ==================================================
             */

            if (
                !ranking.length
            ) {

                return interaction.reply({

                    content:
                        "⛏️ Todavía nadie ha encontrado ningún objeto en la minería.",

                    ephemeral: true

                });

            }


            /*
             * ==================================================
             * CREAR DESCRIPCIÓN
             * ==================================================
             */

            const description =
                ranking
                    .map(
                        (
                            entry,
                            index
                        ) => {

                            const position =
                                index + 1;


                            return (

                                `${getPositionEmoji(position)} ` +

                                `**${entry.username}**\n` +

                                `${entry.mineral.emoji} ` +

                                `**${entry.mineral.name}** ` +

                                `• ${entry.mineral.xp.toLocaleString("es-ES")} XP`

                            );

                        }
                    )
                    .join(
                        "\n\n"
                    );


            /*
             * ==================================================
             * EMBED
             * ==================================================
             */

            const embed =
                new EmbedBuilder()

                    .setTitle(
                        "⛏️ TOP MINERÍA"
                    )

                    .setDescription(
                        description
                    )

                    .setFooter({

                        text:
                            "Ranking según el objeto más valioso conseguido por cada jugador."

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
                "Error obteniendo el top de minería:",
                error
            );


            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al obtener el ranking de minería.",

                ephemeral: true

            });

        }

    }

};