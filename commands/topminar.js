const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    getMiningTop
} = require("../database/users");

/*

============================================================
MINERALES
============================================================


El valor utilizado para ordenar el ranking es el mismo
valor de XP que tiene cada objeto en minar.js.


============================================================
*/

const MINERALS = {

    stone: {
        name: "Piedra",
        xp: 1,
        emoji: "🪨"
    },

    coal: {
        name: "Carbón",
        xp: 2,
        emoji: "⚫"
    },

    iron: {
        name: "Hierro",
        xp: 5,
        emoji: "⛓️"
    },

    gold: {
        name: "Oro",
        xp: 15,
        emoji: "🪙"
    },

    quartz: {
        name: "Cuarzo",
        xp: 25,
        emoji: "🔮"
    },

    emerald: {
        name: "Esmeralda",
        xp: 50,
        emoji: "💚"
    },

    ruby: {
        name: "Rubí",
        xp: 100,
        emoji: "❤️"
    },

    diamond: {
        name: "Diamante",
        xp: 300,
        emoji: "💎"
    },

    obsidian: {
        name: "Obsidiana",
        xp: 500,
        emoji: "🖤"
    },

    blackopal: {
        name: "Ópalo Negro",
        xp: 750,
        emoji: "🌑"
    },

    criptonita: {
        name: "Criptonita",
        xp: 900,
        emoji: "☢️"
    },

    nukacola: {
        name: "Nuka-Cola",
        xp: 1100,
        emoji: "🥤"
    },

    luckyblock: {
        name: "Lucky Block",
        xp: 1300,
        emoji: "🍀"
    },

    paraiba: {
        name: "Turmalina Paraíba",
        xp: 1500,
        emoji: "🩵"
    },

    leavemealone: {
        name: "Leave Me Alone",
        xp: 1700,
        emoji: "👁️"
    },

    portalgun: {
        name: "Portal Gun",
        xp: 2000,
        emoji: "🌀"
    },

    ancient: {
        name: "Artefacto Antiguo",
        xp: 2400,
        emoji: "🏺"
    },

    raygun: {
        name: "Pistola de Rayos",
        xp: 2700,
        emoji: "🔫"
    },

    keyblade: {
        name: "Llave Espada",
        xp: 3500,
        emoji: "🗝️"
    },

    taaffeita: {
        name: "Taaffeíta",
        xp: 4000,
        emoji: "💜"
    },

    omnitrix: {
        name: "Omnitrix",
        xp: 4800,
        emoji: "⌚"
    },

    masterball: {
        name: "Master Ball",
        xp: 6000,
        emoji: "🟣"
    },

    gomugomu: {
        name: "Gomu Gomu no Mi",
        xp: 6500,
        emoji: "🍈"
    },

    indunnapple: {
        name: "Manzana de Idunn",
        xp: 7000,
        emoji: "🍎"
    },

    behelit: {
        name: "Behelit",
        xp: 8000,
        emoji: "👁️"
    },

    sarten: {
        name: "Sartén",
        xp: 9000,
        emoji: "🍳"
    },

    painita: {
        name: "Painita",
        xp: 11000,
        emoji: "🔥"
    },

    puppet: {
        name: "Marioneta",
        xp: 11000,
        emoji: "🪆"
    },

    holygrenade: {
        name: "Granada Sagrada",
        xp: 14000,
        emoji: "💣"
    },

    jeremejevita: {
        name: "Jeremejevita",
        xp: 18000,
        emoji: "🤍"
    },

    deathnote: {
        name: "Death Note",
        xp: 22000,
        emoji: "📓"
    },

    dedosukuna: {
        name: "Dedo de Sukuna",
        xp: 30000,
        emoji: "🖐️"
    },

    musgravita: {
        name: "Musgravita",
        xp: 35000,
        emoji: "🖤"
    },

    triforce: {
        name: "Trifuerza",
        xp: 42000,
        emoji: "🔺"
    },

    dovahkiin: {
        name: "Dovahkiin",
        xp: 50000,
        emoji: "🐉"
    },

    elpoder: {
        name: "El Poder",
        xp: 55000,
        emoji: "⚡"
    },

    galdrabok: {
        name: "Galdrabók",
        xp: 70000,
        emoji: "📕"
    }

};

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