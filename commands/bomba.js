const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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

const INITIAL_TIME = 35000; // 35 segundos
const POINTS_PER_WORD = 50; // 50 XP por palabra correcta

const RE_SEND_EVERY = 8;     // reenviar el estado cada X mensajes


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
CREAR BOTÓN DE INICIO
============================================================
*/

function createStartButton(
    customId,
    disabled = false
) {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId(customId)
                .setLabel("▶️ Empezar partida")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled)

        );

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

            return interaction.reply({

                content:
                    "❌ No se ha podido registrar tu partida. Inténtalo de nuevo.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        ABRIR CHAT PRIVADO (DM)
        ====================================================
        */

        let dmChannel;

        try {

            dmChannel =
                await interaction.user.createDM();

        } catch (error) {

            console.error(
                "Error abriendo tu chat privado de Bomba:",
                error
            );

            return interaction.reply({

                content:
                    "❌ No he podido abrirte un mensaje directo.\n\n" +
                    "Activa **Mensajes directos** para poder jugar a la **Bomba**.",

                ephemeral: true

            });

        }


        /*
        ====================================================
        CONFIRMAR INICIO EN EL CANAL
        ====================================================
        */

        try {

            await interaction.reply({

                content:
                    "💬 Te he enviado el minijuego **Bomba** a tu chat privado.\n\n" +
                    "Abre tu MP y pulsa **▶️ Empezar partida**.",

                ephemeral: true

            });

        } catch (error) {

            console.error(
                "Error confirmando inicio de Bomba:",
                error
            );

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

        let messageCount = 0;


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


        /*
        ====================================================
        CONSTRUIR ESTADO DEL JUEGO
        ====================================================
        */

        function buildGameStatus(extraLine = "") {

            const timeText =
                gameStarted
                    ? (currentTime / 1000).toFixed(1) + " segundos"
                    : "Sin límite";

            return (

                `💣 **¡BOMBA!**\n\n` +

                `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                `⏱️ Tiempo restante: **${timeText}**\n\n` +

                `🎯 Puntos: **${score * POINTS_PER_WORD}**\n\n` +

                extraLine

            );

        }


        /*
        ====================================================
        ACTUALIZAR MENSAJE PRINCIPAL (DM)
        ====================================================
        */

        let gameMessage = null;

        const updateGameMessage =
            async (content, components = []) => {

                if (
                    gameFinished ||
                    !gameMessage
                ) {

                    return;

                }


                try {

                    await gameMessage.edit({

                        content,

                        components

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
        REENVIAR MENSAJE PRINCIPAL (DM)
        ====================================================

        Cada RE_SEND_EVERY mensajes del jugador, el estado
        con la sílaba y el tiempo se reenvía en un mensaje
        nuevo para que no se pierda hacia arriba mientras
        se acumulan los mensajes del chat.

        ====================================================
        */

        const refreshGameMessage =
            async (content, components = []) => {

                if (gameFinished) {

                    return;

                }


                messageCount++;


                if (
                    gameMessage &&
                    messageCount % RE_SEND_EVERY !== 0
                ) {

                    try {

                        await gameMessage.edit({

                            content,

                            components

                        });

                    } catch (error) {

                        console.error(
                            "Error actualizando mensaje de Bomba:",
                            error
                        );

                    }

                    return;

                }


                try {

                    gameMessage =
                        await dmChannel.send({

                            content,

                            components

                        });

                } catch (error) {

                    console.error(
                        "Error reenviando mensaje de Bomba:",
                        error
                    );

                }

            };


        /*
        ====================================================
        FINALIZAR PARTIDA
        ====================================================
        */

        let buttonCollector = null;

        let messageCollector = null;

        const finishGame =
            async () => {

                if (gameFinished) {

                    return;

                }


                gameFinished = true;


                /*
                =================================================
                PARAR COLECTORES
                =================================================
                */

                if (
                    messageCollector &&
                    !messageCollector.ended
                ) {

                    try {

                        messageCollector.stop();

                    } catch (error) {}

                }

                if (
                    buttonCollector &&
                    !buttonCollector.ended
                ) {

                    try {

                        buttonCollector.stop();

                    } catch (error) {}

                }


                /*
                =================================================
                PARAR TEMPORIZADOR
                =================================================
                */

                if (timer) {

                    clearInterval(timer);

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
                MENSAJE PRIVADO FINAL (DM)
                =================================================
                */

                try {

                    if (gameMessage) {

                        await gameMessage.edit({

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

                    }

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


                /*
                =====================================================
                CONTEO REGRESIVO VISIBLE
                =====================================================

                Cada segundo se reduce currentTime y se actualiza el
                mensaje del DM mostrando el tiempo restante. Cuando
                llega a 0, la bomba explota (finishGame).

                =====================================================
                */

                timer =
                    setInterval(

                        async () => {

                            if (gameFinished) {

                                clearInterval(timer);

                                timer = null;

                                return;

                            }


                            const remaining =
                                currentTime - 1000;


                            if (remaining <= 0) {

                                currentTime = 0;

                                clearInterval(timer);

                                timer = null;

                                await finishGame();

                                return;

                            }


                            currentTime = remaining;


                            if (gameMessage) {

                                try {

                                    await updateGameMessage(

                                        buildGameStatus(

                                            "💣 **¡La bomba está a punto de explotar!**\n\n" +

                                            "**Sigue escribiendo palabras con la sílaba.**"

                                        ),

                                        []

                                    );

                                } catch (error) {

                                    console.error(
                                        "Error actualizando cuenta atrás de Bomba:",
                                        error
                                    );

                                }

                            }

                        },

                        1000

                    );

            };


        /*
        ====================================================
        ENVIAR MENSAJE EN EL CHAT PRIVADO (BOTÓN DE INICIO)
        ====================================================
        */

        try {

            gameMessage =
                await dmChannel.send({

                    content:

                        `💣 **¡BOMBA!**\n\n` +

                        `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                        `⏳ **La primera palabra no tiene límite de tiempo.**\n\n` +

                        `Escribe en este chat una palabra que contenga **${syllable.toUpperCase()}**.\n\n` +

                        `🎯 Puntos: **0**`,

                    components: [

                        createStartButton(
                            buttonId
                        )

                    ]

                });

        } catch (error) {

            console.error(
                "Error enviando mensaje de Bomba por DM:",
                error
            );

            try {

                await interaction.followUp({

                    content:
                        "❌ No se pudo enviar el minijuego a tu chat privado.",

                    ephemeral: true

                });

            } catch (ignoreError) {}

            return;

        }


        /*
        ====================================================
        COLLECTOR DEL BOTÓN (EMPEZAR PARTIDA)
        ====================================================
        */

        buttonCollector =
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
        BOTÓN PULSADO (EMPEZAR)
        ====================================================
        */

        buttonCollector.on(

            "collect",

            async buttonInteraction => {

                if (gameFinished) {

                    return;

                }


                try {

                    await buttonInteraction.deferUpdate();

                } catch (error) {

                    console.error(
                        "Error confirmando inicio de Bomba:",
                        error
                    );

                    return;

                }


                await updateGameMessage(

                    buildGameStatus(

                        "✅ **¡Partida iniciada!**\n\n" +

                        "⏱️ La bomba cuenta **20 segundos**.\n\n" +

                        "**Escribe una palabra con la sílaba en el chat." +

                        "** Cuantas más aciertes, más XP."

                    ),

                    []

                );


                startTimer();

            }

        );


        /*
        ====================================================
        COLLECTOR DE MENSAJES (PALABRAS EN EL CHAT)
        ====================================================
        */

        messageCollector =
            dmChannel.createMessageCollector({

                filter:
                    message =>
                        message.author.id ===
                        interaction.user.id,

                time:
                    15 * 60 * 1000

            });


        messageCollector.on(

            "collect",

            async message => {

                if (gameFinished) {

                    return;

                }


                const rawWord =
                    message.content;


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

                        buildGameStatus(

                            "❌ **Escribe una palabra en el chat.**"

                        ),

                        []

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

                        buildGameStatus(

                            `❌ **${rawWord}** ya ha sido utilizada.\n\n` +

                            `Escribe otra palabra en el chat.`

                        ),

                        []

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

                        buildGameStatus(

                            `❌ **${rawWord}** no contiene la sílaba **${syllable.toUpperCase()}**.\n\n` +

                            `Escribe otra palabra en el chat.`

                        ),

                        []

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

                        buildGameStatus(

                            `❌ **${rawWord}** no es una palabra válida.\n\n` +

                            `Escribe otra palabra en el chat.`

                        ),

                        []

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
                CAMBIAR SÍLABA
                =================================================
                */

                syllable =
                    getRandomSyllable(

                        syllable

                    );


                /*
                =================================================
                ACTUALIZAR MENSAJE PRINCIPAL
                =================================================
                */

                await refreshGameMessage(

                    `💣 **¡BOMBA!**\n\n` +

                    `🔤 Sílaba: **${syllable.toUpperCase()}**\n\n` +

                    `⏱️ Tiempo restante: **${(
                        currentTime / 1000
                    ).toFixed(1)} segundos**\n\n` +

                    `🎯 Puntos: **${score * POINTS_PER_WORD
                    }**\n\n` +

                    `✅ **¡Correcto!**\n\n` +

                    `💥 **¡SIGUE!**\n\n` +

                    `Escribe otra palabra con la sílaba en el chat.`,

                    []

                );

            }

        );


        /*
        ====================================================
        FINALIZACIÓN DE COLECTORES
        ====================================================
        */

        const endCollectors =
            () => {

                if (!gameFinished) {

                    finishGame();

                }

            };


        buttonCollector.on(
            "end",
            endCollectors
        );


        messageCollector.on(
            "end",
            endCollectors
        );

    }

};
