require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    Collection,
    Events
} = require("discord.js");


/*
 * ============================================================
 * SISTEMA DE XP POR VOZ
 * ============================================================
 */

const {
    startVoiceXpSystem
} = require("./database/voice-xp");


/*
 * ============================================================
 * CLIENTE DE DISCORD
 * ============================================================
 */

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.DirectMessages,

        GatewayIntentBits.MessageContent,

        /*
         * NECESARIO PARA DETECTAR
         * ENTRADAS Y SALIDAS DE VOZ.
         */

        GatewayIntentBits.GuildVoiceStates

    ]

});


/*
 * ============================================================
 * COLECCIÓN DE COMANDOS
 * ============================================================
 */

client.commands =
    new Collection();


/*
 * ============================================================
 * CARGAR COMANDOS
 * ============================================================
 */

const commandsPath =
    path.join(
        __dirname,
        "commands"
    );


const commandFiles =
    fs
        .readdirSync(
            commandsPath
        )
        .filter(
            file =>
                file.endsWith(".js")
        );


for (
    const file of commandFiles
) {

    const filePath =
        path.join(
            commandsPath,
            file
        );


    const command =
        require(filePath);


    if (
        !command.data ||
        !command.execute
    ) {

        console.warn(

            `El comando ${file} no exporta "data" o "execute".`

        );

        continue;

    }


    client.commands.set(

        command.data.name,

        command

    );

}


/*
 * ============================================================
 * BOT CONECTADO
 * ============================================================
 */

client.once(

    Events.ClientReady,

    () => {

        console.log(
            `Conectado como ${client.user.tag}`
        );


        /*
         * ======================================================
         * INICIAR XP POR VOZ
         * ======================================================
         */

        startVoiceXpSystem(
            client
        );

    }

);


/*
 * ============================================================
 * INTERACCIONES
 * ============================================================
 */

client.on(

    Events.InteractionCreate,

    async interaction => {

        try {

            /*
             * ==================================================
             * SLASH COMMANDS
             * ==================================================
             */

            if (
                interaction.isChatInputCommand()
            ) {

                const command =
                    client.commands.get(
                        interaction.commandName
                    );


                if (!command) {

                    return;

                }


                await command.execute(
                    interaction
                );


                return;

            }


            /*
             * ==================================================
             * BOTONES
             * ==================================================
             */

            if (
                interaction.isButton()
            ) {

                /*
                 * ------------------------------------------------
                 * BLACKJACK
                 * ------------------------------------------------
                 *
                 * Los botones de Blackjack tienen IDs como:
                 *
                 * blackjack_hit_...
                 * blackjack_stand_...
                 *
                 * Se detectan directamente por el prefijo.
                 */

                if (
                    interaction.customId.startsWith(
                        "blackjack_"
                    )
                ) {

                    const command =
                        client.commands.get(
                            "blackjack"
                        );


                    if (
                        !command ||
                        typeof command.handleButton !==
                        "function"
                    ) {

                        return;

                    }


                    await command.handleButton(
                        interaction
                    );


                    return;

                }


                /*
                 * ------------------------------------------------
                 * SISTEMA ANTIGUO DE BOTONES
                 * ------------------------------------------------
                 */

                const [
                    commandName
                ] =
                    interaction.customId.split(
                        "-"
                    );


                const command =
                    client.commands.get(
                        commandName
                    );


                if (
                    !command ||
                    typeof command.handleButton !==
                    "function"
                ) {

                    return;

                }


                await command.handleButton(
                    interaction
                );


                return;

            }


            /*
             * ==================================================
             * MODALES
             * ==================================================
             */

            if (
                interaction.isModalSubmit()
            ) {

                /*
                 * ------------------------------------------------
                 * BLACKJACK
                 * ------------------------------------------------
                 *
                 * El modal de Blackjack utiliza:
                 *
                 * blackjack_bet_modal
                 *
                 * Como usa "_" y no "-", el sistema antiguo
                 * de split("-") no lo detectaría correctamente.
                 *
                 * Por eso lo tratamos igual que los botones.
                 */

                if (
                    interaction.customId.startsWith(
                        "blackjack_"
                    )
                ) {

                    const command =
                        client.commands.get(
                            "blackjack"
                        );


                    if (
                        !command ||
                        typeof command.handleModalSubmit !==
                        "function"
                    ) {

                        return;

                    }


                    await command.handleModalSubmit(
                        interaction
                    );


                    return;

                }


                /*
                 * ------------------------------------------------
                 * SISTEMA ANTIGUO DE MODALES
                 * ------------------------------------------------
                 *
                 * Estos siguen utilizando:
                 *
                 * comando-algo
                 *
                 * ------------------------------------------------
                 */

                const [
                    commandName
                ] =
                    interaction.customId.split(
                        "-"
                    );


                const command =
                    client.commands.get(
                        commandName
                    );


                if (
                    !command ||
                    typeof command.handleModalSubmit !==
                    "function"
                ) {

                    return;

                }


                await command.handleModalSubmit(
                    interaction
                );


                return;

            }


            /*
             * ==================================================
             * SELECT MENUS
             * ==================================================
             */

            if (
                interaction.isStringSelectMenu()
            ) {

                const [
                    commandName
                ] =
                    interaction.customId.split(
                        "-"
                    );


                const command =
                    client.commands.get(
                        commandName
                    );


                if (
                    !command ||
                    typeof command.handleSelectMenu !==
                    "function"
                ) {

                    return;

                }


                await command.handleSelectMenu(
                    interaction
                );


                return;

            }

        } catch (error) {

            console.error(
                "Error ejecutando la interacción:",
                error
            );


            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({

                        content:
                            "❌ Ocurrió un error al procesar esta interacción.",

                        ephemeral:
                            true

                    });

                } else {

                    await interaction.reply({

                        content:
                            "❌ Ocurrió un error al procesar esta interacción.",

                        ephemeral:
                            true

                    });

                }

            } catch (replyError) {

                console.error(

                    "No se pudo enviar el mensaje de error:",

                    replyError

                );

            }

        }

    }

);


/*
 * ============================================================
 * LOGIN
 * ============================================================
 */

client.login(
    process.env.TOKEN
);