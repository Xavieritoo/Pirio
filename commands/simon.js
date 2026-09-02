const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    getDailyCommandName,
    getLocalDateString
} = require("../database/daily-game");

const {
    ensureUser,
    updateUserFields,
    getUserByDiscordId
} = require("../database/users");

const {
    registerDailyGame,
    applyStreakMultiplier
} = require("../database/streaks");


/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const MAX_COLORS = 6;

const STARTING_COLORS = 4;

const POINTS_PER_ROUND = 100;

const FLASH_TIME = 800;

const PAUSE_TIME = 350;


/*
 * ============================================================
 * COLORES
 * ============================================================
 */

const COLORS = [

    {
        id: "red",
        name: "Rojo",
        emoji: "🔴",
        normalStyle: ButtonStyle.Danger
    },

    {
        id: "blue",
        name: "Azul",
        emoji: "🔵",
        normalStyle: ButtonStyle.Primary
    },

    {
        id: "green",
        name: "Verde",
        emoji: "🟢",
        normalStyle: ButtonStyle.Success
    },

    {
        id: "yellow",
        name: "Amarillo",
        emoji: "🟡",
        normalStyle: ButtonStyle.Secondary
    },

    {
        id: "purple",
        name: "Morado",
        emoji: "🟣",
        normalStyle: ButtonStyle.Secondary
    },

    {
        id: "orange",
        name: "Naranja",
        emoji: "🟠",
        normalStyle: ButtonStyle.Secondary
    }

];


/*
 * ============================================================
 * OBTENER COLORES DISPONIBLES
 * ============================================================
 */

function getAvailableColors(round) {

    if (
        round >= 9
    ) {

        return COLORS.slice(
            0,
            MAX_COLORS
        );

    }


    if (
        round >= 5
    ) {

        return COLORS.slice(
            0,
            5
        );

    }


    return COLORS.slice(
        0,
        STARTING_COLORS
    );

}


/*
 * ============================================================
 * OBTENER COLOR ALEATORIO
 * ============================================================
 */

function getRandomColor(round) {

    const availableColors =
        getAvailableColors(
            round
        );


    return availableColors[
        Math.floor(
            Math.random() *
            availableColors.length
        )
    ];

}


/*
 * ============================================================
 * AÑADIR COLOR A LA SECUENCIA
 * ============================================================
 */

function addColorToSequence(
    sequence,
    round
) {

    sequence.push(
        getRandomColor(round)
    );

}


/*
 * ============================================================
 * CREAR BOTÓN DE EMPEZAR
 * ============================================================
 */

function createStartButton() {

    const row =
        new ActionRowBuilder();


    const button =
        new ButtonBuilder()

            .setCustomId(
                "simon_start"
            )

            .setLabel(
                "▶️ Empezar"
            )

            .setStyle(
                ButtonStyle.Success
            );


    row.addComponents(
        button
    );


    return [
        row
    ];

}


/*
 * ============================================================
 * CREAR BOTONES DE COLORES
 * ============================================================
 */

function createColorButtons(
    availableColors,
    disabled = false
) {

    const rows = [];


    let currentRow =
        new ActionRowBuilder();


    for (
        const color of availableColors
    ) {

        const button =
            new ButtonBuilder()

                .setCustomId(
                    `simon_color_${color.id}`
                )

                .setLabel(
                    color.emoji
                )

                .setStyle(
                    color.normalStyle
                )

                .setDisabled(
                    disabled
                );


        if (
            currentRow.components.length >= 5
        ) {

            rows.push(
                currentRow
            );


            currentRow =
                new ActionRowBuilder();

        }


        currentRow.addComponents(
            button
        );

    }


    if (
        currentRow.components.length > 0
    ) {

        rows.push(
            currentRow
        );

    }


    return rows;

}


/*
 * ============================================================
 * CONTENIDO DEL JUEGO
 * ============================================================
 */

function createGameContent(
    round,
    points,
    message = null
) {

    const availableColors =
        getAvailableColors(
            round
        );


    let content =

        `🧠 **SIMÓN DICE**\n\n` +

        `🔢 Ronda: **${round}**\n` +

        `⭐ Puntos: **${points} XP**\n` +

        `🎨 Colores disponibles: **${availableColors.length}**\n\n`;


    if (
        message
    ) {

        content +=
            `${message}\n\n`;

    }


    return content;

}


/*
 * ============================================================
 * ESPERAR
 * ============================================================
 */

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/*
 * ============================================================
 * MOSTRAR SECUENCIA
 * ============================================================
 */

async function showSequence(
    interaction,
    sequence,
    round,
    points,
    gameFinished
) {

    const availableColors =
        getAvailableColors(
            round
        );


    try {

        await interaction.editReply({

            content:
                createGameContent(

                    round,

                    points,

                    "👀 **Prepárate... observa atentamente.**"

                ),

            components:
                createColorButtons(

                    availableColors,

                    true

                )

        });

    } catch (error) {

        console.error(
            "Error mostrando inicio de secuencia:",
            error
        );

        return false;

    }


    await wait(
        700
    );


    /*
     * =========================================================
     * REPRODUCIR SECUENCIA
     * =========================================================
     */

    for (
        const color of sequence
    ) {

        if (
            gameFinished()
        ) {

            return false;

        }


        try {

            await interaction.editReply({

                content:
                    createGameContent(

                        round,

                        points,

                        `${color.emoji} **${color.name}**`

                    ),

                components:
                    createColorButtons(

                        availableColors,

                        true

                    )

            });

        } catch (error) {

            console.error(
                "Error resaltando color:",
                error
            );

            return false;

        }


        await wait(
            FLASH_TIME
        );


        if (
            gameFinished()
        ) {

            return false;

        }


        try {

            await interaction.editReply({

                content:
                    createGameContent(

                        round,

                        points,

                        "👀 **Memoriza la secuencia...**"

                    ),

                components:
                    createColorButtons(

                        availableColors,

                        true

                    )

            });

        } catch (error) {

            console.error(
                "Error ocultando color:",
                error
            );

            return false;

        }


        await wait(
            PAUSE_TIME
        );

    }


    /*
     * =========================================================
     * TURNO DEL JUGADOR
     * =========================================================
     */

    try {

        await interaction.editReply({

            content:
                createGameContent(

                    round,

                    points,

                    `🎮 **¡Tu turno!**\n` +
                    `Repite la secuencia de **${sequence.length} colores**.\n\n` +
                    `♾️ **No hay límite de tiempo.**`

                ),

            components:
                createColorButtons(

                    availableColors,

                    false

                )

        });

    } catch (error) {

        console.error(
            "Error mostrando turno del jugador:",
            error
        );

        return false;

    }


    return true;

}


/*
 * ============================================================
 * COMANDO
 * ============================================================
 */

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                "simon"
            )

            .setDescription(
                "Juega al Simón Dice diario"
            ),


    async execute(
        interaction
    ) {

        /*
         * ====================================================
         * CONFIRMAR INTERACCIÓN INMEDIATAMENTE
         * ====================================================
         *
         * Las interacciones de comando deben reconocerse antes
         * de 3 segundos. Como las llamadas a la base de datos
         * pueden superar ese límite, se hace deferReply() al
         * inicio y se usa editReply() en el resto del flujo.
         * ====================================================
         */

        await interaction.deferReply({
            ephemeral: true
        });


        /*
         * ====================================================
         * COMPROBAR MINIJUEGO DIARIO
         * ====================================================
         */

        if (
            getDailyCommandName() !==
            "simon"
        ) {

            return interaction.editReply({

                content:
                    "❌ Hoy el minijuego diario no es Simón Dice. Usa `/diario` para saber cuál toca hoy.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * ASEGURAR USUARIO
         * ====================================================
         */

        let user;


        try {

            user =
                await ensureUser(

                    interaction.user.id,

                    interaction.user.tag

                );

        } catch (error) {

            console.error(
                "Error obteniendo usuario:",
                error
            );

            return interaction.editReply({

                content:
                    "❌ Ha ocurrido un error al cargar tu perfil.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * COMPROBAR SI YA JUGÓ HOY
         * ====================================================
         */

        const today =
            getLocalDateString();


        const lastDailyDate =
            user.last_daily_date
                ? String(
                    user.last_daily_date
                )
                : null;


        if (
            lastDailyDate === today
        ) {

            return interaction.editReply({

                content:

                    "❌ **Ya has jugado tu minijuego diario hoy.**\n\n" +

                    "⏳ Vuelve mañana para jugar otra partida.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * VARIABLES DE PARTIDA
         * ====================================================
         */

        let round = 1;

        let points = 0;

        let gameFinished = false;

        let sequence = [];

        let playerPosition = 0;

        let collector = null;


        /*
         * ====================================================
         * RACHA
         * ====================================================
         *
         * La racha solamente se utiliza internamente para
         * calcular los XP finales.
         *
         * El usuario nunca verá:
         *
         * - Su racha
         * - El multiplicador
         * - Los puntos base antes del multiplicador
         *
         * ====================================================
         */

        let currentStreak = 0;


        const isGameFinished =
            () => gameFinished;


        /*
         * ====================================================
         * FINALIZAR PARTIDA
         * ====================================================
         */

        const finishGame =
            async (
                reason = "error"
            ) => {

                if (
                    gameFinished
                ) {

                    return;

                }


                gameFinished = true;


                if (
                    collector
                ) {

                    try {

                        collector.stop();

                    } catch { }

                }


                /*
                 * =================================================
                 * CALCULAR XP FINAL
                 * =================================================
                 *
                 * points contiene únicamente los puntos base.
                 *
                 * El multiplicador de racha se aplica aquí.
                 *
                 * El usuario solamente recibe el resultado final.
                 * =================================================
                 */

                const xpGain =
                    applyStreakMultiplier(

                        points,

                        currentStreak

                    );


                /*
                 * =================================================
                 * SUMAR XP
                 * =================================================
                 */

                try {

                    if (
                        xpGain > 0
                    ) {

                        const currentUser =
                            await getUserByDiscordId(

                                interaction.user.id

                            );


                        const currentXp =
                            Number(
                                currentUser?.xp ||
                                0
                            );


                        const totalXp =
                            currentXp +
                            xpGain;


                        const nextLevel =
                            Math.floor(
                                totalXp / 1000
                            ) + 1;


                        await updateUserFields(

                            interaction.user.id,

                            {

                                xp:
                                    totalXp,

                                level:
                                    nextLevel

                            },

                            interaction.member

                        );

                    }

                } catch (error) {

                    console.error(
                        "Error sumando XP de Simón:",
                        error
                    );

                }


                /*
                 * =================================================
                 * REGISTRAR DIARIO COMPLETADO
                 * =================================================
                 */

                try {

                    const currentUser =
                        await getUserByDiscordId(

                            interaction.user.id

                        );


                    await updateUserFields(

                        interaction.user.id,

                        {

                            daily_solved:
                                (
                                    Number(
                                        currentUser?.daily_solved ||
                                        0
                                    )
                                ) + 1

                        }

                    );

                } catch (error) {

                    console.error(
                        "Error registrando diario completado:",
                        error
                    );

                }


                /*
                 * =================================================
                 * MENSAJE FINAL
                 * =================================================
                 *
                 * SOLO se muestra el XP final.
                 * =================================================
                 */

                const finalMessage =

                    `💥 **¡HAS FALLADO!**\n\n` +

                    `🧠 Has completado **${round - 1} rondas**.\n\n` +

                    `⭐ Puntos conseguidos: **${xpGain} XP**\n\n` +

                    `💀 ¡Mejor suerte mañana!`;


                /*
                 * =================================================
                 * MOSTRAR RESULTADO
                 * =================================================
                 */

                try {

                    await interaction.editReply({

                        content:
                            finalMessage,

                        components:
                            createColorButtons(

                                getAvailableColors(
                                    round
                                ),

                                true

                            )

                    });

                } catch (error) {

                    console.error(
                        "Error mostrando resultado de Simón:",
                        error
                    );

                }


                /*
                 * =================================================
                 * MENSAJE PÚBLICO
                 * =================================================
                 */

                try {

                    await interaction.channel.send({

                        content:

                            `💥 **¡${interaction.user.username} ha fallado Simón Dice!**\n` +

                            `🧠 Ha completado **${round - 1} rondas** y ha conseguido **${xpGain} XP**.`

                    });

                } catch (error) {

                    console.error(
                        "Error enviando resultado público:",
                        error
                    );

                }

            };


        /*
         * ====================================================
         * MENSAJE DE PREPARACIÓN
         * ====================================================
         */

        await interaction.editReply({

            content:

                `🧠 **SIMÓN DICE**\n\n` +

                `🎯 Memoriza la secuencia de colores y repítela.\n\n` +

                `📈 Cada ronda añade un nuevo color.\n` +

                `🎨 En las rondas 5 y 9 aparecerán nuevos colores.\n\n` +

                `⭐ Cada ronda completada: **+${POINTS_PER_ROUND} XP**\n\n` +

                `♾️ **No hay límite de tiempo para responder.**\n\n` +

                `⚠️ **La partida termina cuando falles.**\n\n` +

                `👇 Pulsa cuando estés preparado.`,

            components:
                createStartButton(),

            ephemeral: true

        });


        /*
         * ====================================================
         * ESPERAR BOTÓN DE EMPEZAR
         * ====================================================
         */

        const startMessage =
            await interaction.fetchReply();


        const startCollector =
            startMessage.createMessageComponentCollector({

                filter:
                    componentInteraction => {

                        return (

                            componentInteraction.user.id ===
                            interaction.user.id &&

                            componentInteraction.customId ===
                            "simon_start"

                        );

                    },

                time:
                    60000,

                max: 1

            });


        const started =
            await new Promise(
                resolve => {

                    startCollector.on(
                        "collect",
                        async componentInteraction => {

                            /*
                             * =================================================
                             * REGISTRAR PARTIDA EN LA RACHA
                             * =================================================
                             *
                             * registerDailyGame() controla exclusivamente
                             * la racha.
                             *
                             * Si alreadyPlayed === true significa que
                             * la racha ya fue registrada hoy por otro
                             * minijuego, NO que Simón ya haya sido jugado.
                             *
                             * En ese caso reutilizamos la racha actual.
                             * =================================================
                             */

                            try {

                                const streakResult =
                                    await registerDailyGame(

                                        interaction.user.id

                                    );


                                /*
                                 * Guardamos la racha únicamente
                                 * para el cálculo interno de XP.
                                 */

                                currentStreak =
                                    Number(
                                        streakResult.streak || 0
                                    );

                            } catch (error) {

                                console.error(
                                    "Error registrando racha de Simón:",
                                    error
                                );


                                try {

                                    await componentInteraction.reply({

                                        content:
                                            "❌ No se ha podido registrar tu racha. Inténtalo de nuevo.",

                                        ephemeral: true

                                    });

                                } catch { }


                                resolve(false);

                                return;

                            }


                            /*
                             * =================================================
                             * REGISTRAR MINIJUEGO DIARIO
                             * =================================================
                             *
                             * Aquí sí registramos que el usuario ha empezado
                             * el minijuego de hoy.
                             *
                             * last_daily_date NO pertenece al sistema de
                             * rachas, por lo que lo actualizamos aquí.
                             * =================================================
                             */

                            try {

                                await updateUserFields(

                                    interaction.user.id,

                                    {

                                        daily_attempts:
                                            (
                                                Number(
                                                    user.daily_attempts ||
                                                    0
                                                )
                                            ) + 1,

                                        last_daily_date:
                                            today

                                    }

                                );

                            } catch (error) {

                                console.error(
                                    "Error registrando intento diario:",
                                    error
                                );


                                try {

                                    await componentInteraction.reply({

                                        content:
                                            "❌ No se ha podido iniciar la partida. Inténtalo de nuevo.",

                                        ephemeral: true

                                    });

                                } catch { }


                                resolve(false);

                                return;

                            }


                            /*
                             * =================================================
                             * CONFIRMAR BOTÓN
                             * =================================================
                             */

                            try {

                                await componentInteraction.deferUpdate();

                            } catch (error) {

                                console.error(
                                    "Error iniciando Simón:",
                                    error
                                );

                            }


                            resolve(true);

                        }

                    );


                    startCollector.on(
                        "end",
                        (
                            collected,
                            reason
                        ) => {

                            if (
                                collected.size === 0
                            ) {

                                resolve(false);

                            }

                        }
                    );

                }
            );


        /*
         * ====================================================
         * SI NO PULSÓ EMPEZAR
         * ====================================================
         */

        if (
            !started
        ) {

            try {

                await interaction.editReply({

                    content:

                        `⏰ **Se ha cancelado la partida.**\n\n` +

                        `No has pulsado el botón de empezar a tiempo.\n` +

                        `Puedes volver a intentarlo otro día.`,

                    components: []

                });

            } catch (error) {

                console.error(
                    "Error cancelando Simón:",
                    error
                );

            }

            return;

        }


        /*
         * ====================================================
         * BUCLE PRINCIPAL
         * ====================================================
         */

        while (
            !gameFinished
        ) {

            /*
             * =================================================
             * AÑADIR UN ÚNICO COLOR
             * =================================================
             */

            addColorToSequence(

                sequence,

                round

            );


            playerPosition = 0;


            /*
             * =================================================
             * MOSTRAR SECUENCIA
             * =================================================
             */

            const sequenceShown =
                await showSequence(

                    interaction,

                    sequence,

                    round,

                    points,

                    isGameFinished

                );


            if (
                !sequenceShown ||
                gameFinished
            ) {

                break;

            }


            /*
             * =================================================
             * ESPERAR RESPUESTA DEL JUGADOR
             * =================================================
             */

            await new Promise(
                resolve => {

                    interaction
                        .fetchReply()
                        .then(
                            gameMessage => {

                                collector =
                                    gameMessage
                                        .createMessageComponentCollector({

                                            filter:
                                                componentInteraction => {

                                                    return (

                                                        componentInteraction.user.id ===
                                                        interaction.user.id &&

                                                        componentInteraction.customId.startsWith(
                                                            "simon_color_"
                                                        )

                                                    );

                                                }

                                        });


                                /*
                                 * =================================================
                                 * RECIBIR RESPUESTA
                                 * =================================================
                                 */

                                collector.on(

                                    "collect",

                                    async componentInteraction => {

                                        if (
                                            gameFinished
                                        ) {

                                            return;

                                        }


                                        const colorId =
                                            componentInteraction.customId.replace(

                                                "simon_color_",

                                                ""

                                            );


                                        const expectedColor =
                                            sequence[
                                            playerPosition
                                            ];


                                        /*
                                         * =================================================
                                         * RESPUESTA CORRECTA
                                         * =================================================
                                         */

                                        if (
                                            colorId ===
                                            expectedColor.id
                                        ) {

                                            playerPosition++;


                                            try {

                                                await componentInteraction.deferUpdate();

                                            } catch (error) {

                                                console.error(
                                                    "Error en interacción de Simón:",
                                                    error
                                                );

                                                return;

                                            }


                                            /*
                                             * ¿Ha terminado la secuencia?
                                             */

                                            if (
                                                playerPosition >=
                                                sequence.length
                                            ) {

                                                /*
                                                 * Ronda completada.
                                                 *
                                                 * points sigue siendo el
                                                 * valor BASE.
                                                 */

                                                points +=
                                                    POINTS_PER_ROUND;


                                                /*
                                                 * Pasar a siguiente ronda.
                                                 */

                                                round++;


                                                collector.stop(
                                                    "round_complete"
                                                );


                                                resolve();

                                            } else {

                                                /*
                                                 * Mostrar progreso.
                                                 */

                                                try {

                                                    await interaction.editReply({

                                                        content:

                                                            createGameContent(

                                                                round,

                                                                points,

                                                                `✅ **${playerPosition}/${sequence.length}** correctos.\n` +

                                                                `🎯 ¡Sigue!`

                                                            ),

                                                        components:

                                                            createColorButtons(

                                                                getAvailableColors(
                                                                    round
                                                                ),

                                                                false

                                                            )

                                                    });

                                                } catch (error) {

                                                    console.error(
                                                        "Error actualizando progreso:",
                                                        error
                                                    );

                                                }

                                            }

                                        }


                                        /*
                                         * =================================================
                                         * RESPUESTA INCORRECTA
                                         * =================================================
                                         */

                                        else {

                                            try {

                                                await componentInteraction.deferUpdate();

                                            } catch (error) {

                                                console.error(
                                                    "Error confirmando fallo:",
                                                    error
                                                );

                                            }


                                            collector.stop(
                                                "wrong"
                                            );

                                        }

                                    }

                                );


                                /*
                                 * =================================================
                                 * FINAL DEL COLLECTOR
                                 * =================================================
                                 */

                                collector.on(

                                    "end",

                                    async (
                                        collected,
                                        reason
                                    ) => {

                                        collector = null;


                                        if (
                                            gameFinished
                                        ) {

                                            resolve();

                                            return;

                                        }


                                        /*
                                         * Ronda completada.
                                         */

                                        if (
                                            reason ===
                                            "round_complete"
                                        ) {

                                            resolve();

                                            return;

                                        }


                                        /*
                                         * =================================================
                                         * ERROR DEL JUGADOR
                                         * =================================================
                                         */

                                        if (
                                            reason ===
                                            "wrong"
                                        ) {

                                            await finishGame(
                                                "error"
                                            );

                                            resolve();

                                            return;

                                        }


                                        resolve();

                                    }

                                );

                            }
                        );

                }
            );

        }

    }

};
