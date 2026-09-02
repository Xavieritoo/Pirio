const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const spanishWords = require("an-array-of-spanish-words");

const {
    getDailyCommandName,
    getLocalDateString
} = require("../database/daily-game");

const {
    ensureUser,
    updateUserFields,
    getUserByDiscordId,
    addXp
} = require("../database/users");

const {
    registerDailyGame,
    applyStreakMultiplier
} = require("../database/streaks");


/*
============================================================
CONFIGURACIÓN
============================================================
*/

const INITIAL_TIME = 20000; // 20 segundos
const TIME_DECREASE = 500;  // -0.5 segundos
const MIN_TIME = 1500;      // mínimo 1.5 segundos
const POINTS_PER_WORD = 50; // 50 XP base por palabra


/*
============================================================
SÍLABAS
============================================================
*/

const SYLLABLES = [

    // 2 letras
    "ba", "be", "ca", "ce", "de",
    "di", "fa", "fi", "la", "le",
    "ma", "mi", "no", "pa", "pe",
    "ra", "re", "sa", "se", "ta",
    "te", "va", "ve",

    // 3 letras
    "bra", "bre", "bri",
    "cha", "che", "chi",
    "cla", "cle", "cli",
    "cra", "cre", "cri",
    "dra", "dre", "dri",
    "fra", "fre", "fri",
    "gla", "gle", "gri",
    "pla", "ple", "pli",
    "pra", "pre", "pri",
    "tra", "tre", "tri",
    "cho", "chu",
    "gue", "gui",
    "que", "qui",
    "cua", "cue", "cui",
    "dia", "die", "dio",
    "fue", "fui",
    "mue",
    "nue",
    "pie", "pio",
    "sue", "sui",
    "via", "vie", "vio",
    "bue", "bui",
    "lio", "mia", "mio",
    "nia", "nio",
    "pua", "pue",
    "tua", "tue"
];


/*
============================================================
NORMALIZAR TEXTO
============================================================
*/

function normalize(text) {

    return String(text || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]/g, "");

}


/*
============================================================
DICCIONARIO OPTIMIZADO
============================================================
*/

const WORD_SET = new Set(

    spanishWords
        .map(word => normalize(word))
        .filter(Boolean)

);


/*
============================================================
COMPROBAR PALABRA
============================================================
*/

function isSpanishWord(word) {

    return WORD_SET.has(word);

}


/*
============================================================
COMPROBAR SÍLABA
============================================================
*/

function containsSyllable(word, syllable) {

    return word.includes(syllable);

}


/*
============================================================
ELEGIR SÍLABA
============================================================
*/

function getRandomSyllable(previousSyllable = null) {

    let syllable;

    do {

        syllable =
            SYLLABLES[
            Math.floor(
                Math.random() * SYLLABLES.length
            )
            ];

    } while (
        SYLLABLES.length > 1 &&
        syllable === previousSyllable
    );

    return syllable;

}


/*
============================================================
CREAR BOTÓN
============================================================
*/

function createWordButton(
    customId,
    disabled = false
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(customId)
                .setLabel("💣 Escribir palabra")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled)

        );

}


/*
============================================================
CREAR MODAL
============================================================
*/

function createWordModal(
    customId,
    syllable
) {

    const modal =
        new ModalBuilder()
            .setCustomId(customId)
            .setTitle(
                `💣 Bomba — ${syllable.toUpperCase()}`
            );


    const input =
        new TextInputBuilder()
            .setCustomId("word")
            .setLabel(
                `Palabra con ${syllable.toUpperCase()}`
            )
            .setPlaceholder("Ejemplo: napolitana")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);


    const row =
        new ActionRowBuilder()
            .addComponents(input);


    modal.addComponents(row);


    return modal;

}


/*
============================================================
COMANDO
============================================================
*/

module.exports = {

    data:
        new SlashCommandBuilder()
            .setName("bomba")
            .setDescription(
                "Juego de la bomba: escribe palabras antes de que explote"
            ),


    async execute(interaction) {

        /*
        ====================================================
        COMPROBAR SI HOY TOCA BOMBA
        ====================================================
        */

        if (
            getDailyCommandName() !==
            "bomba"
        ) {

            return interaction.reply({

                content:
                    "❌ Hoy el minijuego diario no es Bomba. Usa `/diario` para saber cuál toca hoy.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        ASEGURAR USUARIO
        ====================================================
        */

        let user;

        try {

            user =
                await ensureUser(

                    interaction.user.id,

                    interaction.user.tag,

                    interaction.member

                );

        } catch (error) {

            console.error(
                "Error obteniendo usuario:",
                error
            );

            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al cargar tu perfil.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        COMPROBAR SI YA JUGÓ HOY
        ====================================================
        */

        const today =
            getLocalDateString();


        const lastDailyDate =
            user.last_daily_date
                ? String(user.last_daily_date)
                : null;


        if (
            lastDailyDate ===
            today
        ) {

            return interaction.reply({

                content:
                    "❌ **Ya has jugado tu minijuego diario hoy.**\n\n" +
                    "⏳ Vuelve mañana para jugar otra partida.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        REGISTRAR PARTIDA DIARIA
        ====================================================
        */

        let streakResult;

        try {

            streakResult =
                await registerDailyGame(

                    interaction.user.id

                );

        } catch (error) {

            console.error(
                "Error registrando racha diaria:",
                error
            );

            return interaction.reply({

                content:
                    "❌ No se ha podido iniciar tu partida diaria. Inténtalo de nuevo.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        OBTENER RACHA INTERNAMENTE
        ====================================================
        */

        const streak =
            Number(
                streakResult?.streak || 0
            );


        /*
        ====================================================
        REGISTRAR INTENTO
        ====================================================
        */

        try {

            await updateUserFields(

                interaction.user.id,

                {

                    daily_attempts:
                        (
                            user.daily_attempts ||
                            0
                        ) + 1

                }

            );

        } catch (error) {

            console.error(
                "Error registrando intento diario:",
                error
            );

            return interaction.reply({

                content:
                    "❌ No se ha podido registrar tu partida. Inténtalo de nuevo.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        VARIABLES DE PARTIDA
        ====================================================
        */

        let score = 0;

        let gameStarted = false;

        let gameFinished = false;

        let currentTime = null;

        let timer = null;

        let modalOpen = false;


        /*
        ====================================================
        SÍLABA INICIAL
        ====================================================
        */

        let syllable =
            getRandomSyllable();


        /*
        ====================================================
        PALABRAS UTILIZADAS
        ====================================================
        */

        const usedWords =
            new Set();


        /*
        ====================================================
        ID ÚNICO DE PARTIDA
        ====================================================
        */

        const gameId =
            `${interaction.user.id}_${Date.now()}`;


        const buttonId =
            `bomba_button_${gameId}`;


        let modalNumber = 0;


        /*
        ====================================================
        ACTUALIZAR MENSAJE PRINCIPAL
        ====================================================
        */

        const updateGameMessage =
            async (content) => {

                if (gameFinished) {

                    return;

                }


                try {

                    await interaction.editReply({

                        content,

                        components: [

                            createWordButton(
                                buttonId
                            )

                        ]

                    });

                } catch (error) {

                    console.error(
                        "Error actualizando mensaje de Bomba:",
                        error
                    );

                }

            };


        /*
        ====================================================
        FINALIZAR PARTIDA
        ====================================================
        */

        const finishGame =
            async () => {

                if (gameFinished) {

                    return;

                }


                gameFinished = true;


                /*
                =================================================
                PARAR TEMPORIZADOR
                =================================================
                */

                if (timer) {

                    clearTimeout(timer);

                    timer = null;

                }


                /*
                =================================================
                CALCULAR XP BASE
                =================================================
                */

                const baseXpGain =
                    score *
                    POINTS_PER_WORD;


                /*
                =================================================
                APLICAR MULTIPLICADOR DE RACHA
                =================================================
                */

                let xpGain = 0;


                if (
                    baseXpGain > 0
                ) {

                    const multipliedXp =
                        applyStreakMultiplier(

                            baseXpGain,

                            streak

                        );


                    xpGain =
                        Math.ceil(
                            Number(
                                multipliedXp
                            ) || 0
                        );

                }


                /*
                =================================================
                SUMAR XP
                =================================================
                *
                * IMPORTANTE:
                *
                * Aquí NO usamos updateUserFields().
                *
                * Usamos addXp() porque addXp():
                *
                * 1. Calcula el nuevo nivel.
                * 2. Guarda XP y nivel.
                * 3. Sincroniza el rango.
                * 4. Detecta subida de nivel.
                * 5. Envía notifyLevelUp().
                *
                =================================================
                */

                let xpResult = null;


                try {

                    if (
                        xpGain > 0
                    ) {

                        xpResult =
                            await addXp(

                                interaction.user.id,

                                xpGain,

                                interaction.member

                            );

                    }

                } catch (error) {

                    console.error(
                        "Error sumando XP de Bomba:",
                        error
                    );

                }


                /*
                =================================================
                REGISTRAR DIARIO COMPLETADO
                =================================================
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
                                    currentUser?.daily_solved ||
                                    0
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
                =================================================
                INFORMACIÓN DE NIVEL
                =================================================
                */

                const newLevel =
                    xpResult?.newLevel ??
                    null;


                /*
                =================================================
                MENSAJE PRIVADO FINAL
                =================================================
                */

                try {

                    await interaction.editReply({

                        content:

                            `💥 **¡BOOM!**\n\n` +

                            `💣 La bomba ha explotado.\n\n` +

                            `🏆 Palabras acertadas: **${score}**\n` +

                            `⭐ Puntos conseguidos: **${xpGain} XP**` +

                            (
                                newLevel &&
                                    xpResult?.leveledUp
                                    ? `\n\n🎉 Has subido al **nivel ${newLevel}**.`
                                    : ""
                            ),

                        components: []

                    });

                } catch (error) {

                    console.error(
                        "Error mostrando resultado privado de Bomba:",
                        error
                    );

                }


                /*
                =================================================
                MENSAJE PÚBLICO
                =================================================
                */

                try {

                    await interaction.channel.send({

                        content:

                            `💥 **¡La bomba ha explotado!**\n\n` +

                            `💣 **${interaction.user.username}** ha conseguido ` +

                            `**${score} palabra${score === 1 ? "" : "s"}** ` +

                            `y ha ganado **${xpGain} XP**.`

                    });

                } catch (error) {

                    console.error(
                        "Error enviando resultado público de Bomba:",
                        error
                    );

                }

            };


        /*
        ====================================================
        INICIAR TEMPORIZADOR
        ====================================================
        */

        const startTimer =
            () => {

                if (
                    gameStarted ||
                    gameFinished
                ) {

                    return;

                }


                gameStarted = true;


                currentTime =
                    INITIAL_TIME;


                timer =
                    setTimeout(

                        finishGame,

                        currentTime

                    );

            };


        /*
        ====================================================
        MENSAJE INICIAL
        ====================================================
        */

        const gameMessage =
            await interaction.reply({

                content:

                    `💣 **¡BOMBA!**\n\n` +

                    `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                    `⏳ **La primera palabra no tiene límite de tiempo.**\n\n` +

                    `Pulsa el botón y escribe una palabra que contenga **${syllable.toUpperCase()}**.\n\n` +

                    `🎯 Puntos: **0**`,

                components: [

                    createWordButton(
                        buttonId
                    )

                ],

                ephemeral: true,

                fetchReply: true

            });


        /*
        ====================================================
        COLLECTOR DEL BOTÓN
        ====================================================
        */

        const buttonCollector =
            gameMessage.createMessageComponentCollector({

                filter:
                    buttonInteraction => {

                        return (

                            buttonInteraction.customId ===
                            buttonId &&

                            buttonInteraction.user.id ===
                            interaction.user.id

                        );

                    },

                time:
                    15 * 60 * 1000

            });


        /*
        ====================================================
        BOTÓN PULSADO
        ====================================================
        */

        buttonCollector.on(

            "collect",

            async buttonInteraction => {

                if (gameFinished) {

                    return;

                }


                /*
                =================================================
                EVITAR VARIOS MODALES SIMULTÁNEOS
                =================================================
                */

                if (modalOpen) {

                    try {

                        await buttonInteraction.reply({

                            content:
                                "⏳ Ya tienes una palabra abierta para responder.",

                            ephemeral: true

                        });

                    } catch (error) {

                        console.error(
                            "Error avisando de modal abierto:",
                            error
                        );

                    }

                    return;

                }


                modalOpen = true;

                modalNumber++;


                const modalId =
                    `bomba_modal_${gameId}_${modalNumber}`;


                /*
                =================================================
                MOSTRAR MODAL
                =================================================
                */

                try {

                    await buttonInteraction.showModal(

                        createWordModal(

                            modalId,

                            syllable

                        )

                    );

                } catch (error) {

                    modalOpen = false;

                    console.error(
                        "Error mostrando modal de Bomba:",
                        error
                    );

                    return;

                }


                /*
                =================================================
                ESPERAR RESPUESTA DEL MODAL
                =================================================
                */

                let modalInteraction;


                try {

                    modalInteraction =
                        await buttonInteraction.awaitModalSubmit({

                            filter:
                                submittedInteraction => {

                                    return (

                                        submittedInteraction.customId ===
                                        modalId &&

                                        submittedInteraction.user.id ===
                                        interaction.user.id

                                    );

                                },

                            time:
                                60 * 1000

                        });

                } catch (error) {

                    modalOpen = false;

                    return;

                }


                modalOpen = false;


                /*
                =================================================
                CONFIRMAR MODAL
                =================================================
                */

                try {

                    await modalInteraction.deferUpdate();

                } catch (error) {

                    console.error(
                        "Error confirmando modal:",
                        error
                    );

                    return;

                }


                /*
                =================================================
                COMPROBAR PARTIDA
                =================================================
                */

                if (gameFinished) {

                    return;

                }


                /*
                =================================================
                OBTENER PALABRA
                =================================================
                */

                const rawWord =
                    modalInteraction.fields.getTextInputValue(
                        "word"
                    );


                const word =
                    normalize(
                        rawWord
                    );


                /*
                =================================================
                PALABRA VACÍA
                =================================================
                */

                if (!word) {

                    await updateGameMessage(

                        `💣 **¡BOMBA!**\n\n` +

                        `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                        `⏱️ Tiempo: **${gameStarted
                            ? (currentTime / 1000).toFixed(1) + " segundos"
                            : "Sin límite"
                        }**\n\n` +

                        `🎯 Puntos: **${score * POINTS_PER_WORD
                        }**\n\n` +

                        `❌ **Escribe una palabra.**`

                    );

                    return;

                }


                /*
                =================================================
                PALABRA REPETIDA
                =================================================
                */

                if (
                    usedWords.has(word)
                ) {

                    await updateGameMessage(

                        `💣 **¡BOMBA!**\n\n` +

                        `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                        `⏱️ Tiempo: **${gameStarted
                            ? (currentTime / 1000).toFixed(1) + " segundos"
                            : "Sin límite"
                        }**\n\n` +

                        `🎯 Puntos: **${score * POINTS_PER_WORD
                        }**\n\n` +

                        `❌ **${rawWord}** ya ha sido utilizada.\n\n` +

                        `Pulsa el botón para intentarlo de nuevo.`

                    );

                    return;

                }


                /*
                =================================================
                COMPROBAR SÍLABA
                =================================================
                */

                if (
                    !containsSyllable(

                        word,

                        syllable

                    )
                ) {

                    await updateGameMessage(

                        `💣 **¡BOMBA!**\n\n` +

                        `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                        `⏱️ Tiempo: **${gameStarted
                            ? (currentTime / 1000).toFixed(1) + " segundos"
                            : "Sin límite"
                        }**\n\n` +

                        `🎯 Puntos: **${score * POINTS_PER_WORD
                        }**\n\n` +

                        `❌ **${rawWord}** no contiene la sílaba **${syllable.toUpperCase()}**.\n\n` +

                        `Pulsa el botón para intentarlo de nuevo.`

                    );

                    return;

                }


                /*
                =================================================
                COMPROBAR DICCIONARIO
                =================================================
                */

                if (
                    !isSpanishWord(word)
                ) {

                    await updateGameMessage(

                        `💣 **¡BOMBA!**\n\n` +

                        `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                        `⏱️ Tiempo: **${gameStarted
                            ? (currentTime / 1000).toFixed(1) + " segundos"
                            : "Sin límite"
                        }**\n\n` +

                        `🎯 Puntos: **${score * POINTS_PER_WORD
                        }**\n\n` +

                        `❌ **${rawWord}** no es una palabra válida.\n\n` +

                        `Pulsa el botón para intentarlo de nuevo.`

                    );

                    return;

                }


                /*
                =================================================
                PALABRA CORRECTA
                =================================================
                */

                usedWords.add(word);

                score++;


                /*
                =================================================
                CONTROL DEL TIEMPO
                =================================================
                */

                if (!gameStarted) {

                    startTimer();

                } else {

                    currentTime =
                        Math.max(

                            MIN_TIME,

                            currentTime -
                            TIME_DECREASE

                        );

                }


                /*
                =================================================
                CAMBIAR SÍLABA
                =================================================
                */

                syllable =
                    getRandomSyllable(

                        syllable

                    );


                /*
                =================================================
                REINICIAR TEMPORIZADOR
                =================================================
                */

                if (timer) {

                    clearTimeout(timer);

                }


                timer =
                    setTimeout(

                        finishGame,

                        currentTime

                    );


                /*
                =================================================
                ACTUALIZAR MENSAJE PRINCIPAL
                =================================================
                */

                await updateGameMessage(

                    `💣 **¡BOMBA!**\n\n` +

                    `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                    `⏱️ Tiempo para esta palabra: **${(
                        currentTime / 1000
                    ).toFixed(1)} segundos**\n\n` +

                    `🎯 Puntos: **${score * POINTS_PER_WORD
                    }**\n\n` +

                    `✅ **¡Correcto!**\n\n` +

                    `💥 **¡RÁPIDO!**\n\n` +

                    `Pulsa el botón para escribir la siguiente palabra.`

                );

            }

        );


        /*
        ====================================================
        FINALIZACIÓN DEL COLLECTOR
        ====================================================
        */

        buttonCollector.on(

            "end",

            () => {

                if (!gameFinished) {

                    finishGame();

                }

            }

        );

    }

};
