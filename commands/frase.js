const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    AttachmentBuilder
} = require("discord.js");

const path = require("path");
const fs = require("fs");

const {
    ensureUser,
    updateUserFields
} = require("../database/users");

const {
    getDailyCommandName,
    getLocalDateString
} = require("../database/daily-game");

const {
    registerDailyGame,
    applyStreakMultiplier
} = require("../database/streaks");



// ============================================================
// FRASES
// ============================================================

const PHRASES = [

    {
        image: "frase1.png",
        text: "Después de varios meses ahorrando dinero, preparando el equipaje y organizando cada detalle del viaje, finalmente llegó el día que todos estaban esperando. El avión despegó poco después del amanecer y, mientras las nubes quedaban cada vez más lejos, comenzaron a darse cuenta de que realmente estaban dejando atrás su vida cotidiana durante unas semanas."
    },

    {
        image: "frase2.png",
        text: "Durante años, aquel reloj permaneció guardado en el fondo de un cajón que nadie utilizaba. Había pertenecido a su abuelo y, aunque aparentemente no tenía nada de especial, siempre había existido una extraña historia relacionada con él. Según contaba la familia, el reloj se había detenido exactamente a las tres y diecisiete de la madrugada el día que ocurrió un acontecimiento que cambió sus vidas para siempre."
    },

    {
        image: "frase3.png",
        text: "Durante mucho tiempo pensó que quedarse en aquella ciudad era la decisión más segura que podía tomar, porque allí tenía un trabajo estable, una casa conocida y personas con las que había compartido prácticamente toda su vida. Sin embargo, cada mañana se despertaba con la sensación de estar perdiéndose algo importante, como si hubiera dejado una parte de sí mismo en algún lugar que todavía no conocía."
    },

    {
        image: "frase4.png",
        text: "La lluvia había comenzado poco después de las seis de la tarde y no parecía tener intención de detenerse. Las calles estaban prácticamente vacías, los coches avanzaban lentamente y las luces de las tiendas se reflejaban sobre el asfalto mojado creando pequeñas manchas de colores que desaparecían cada vez que pasaba alguien caminando. Desde la ventana de su habitación observaba todo aquello mientras escuchaba las gotas golpear contra el cristal."
    },

    {
        image: "frase5.png",
        text: "Cuando llegó a la estación, faltaban solamente diez minutos para que saliera el último tren de la noche. Había pasado todo el día dudando sobre si realmente debía marcharse, porque abandonar su ciudad significaba despedirse de muchas personas y empezar prácticamente desde cero en un lugar donde no conocía a nadie. Aun así, sabía que si regresaba a casa probablemente volvería a cambiar de opinión y terminaría quedándose exactamente donde estaba. Compró el billete, guardó la cartera en el bolsillo y se sentó en uno de los bancos mientras esperaba."
    },

    {
        image: "frase6.png",
        text: "En aquella pequeña biblioteca había miles de libros, algunos tan antiguos que sus páginas comenzaban a romperse cada vez que alguien intentaba pasarlas. El lugar llevaba décadas abierto y, aunque ya casi nadie acudía allí para estudiar, seguía siendo uno de los rincones más tranquilos de la ciudad. Una tarde, mientras buscaba información para un trabajo, encontró un libro que no aparecía en el catálogo y que parecía haber sido colocado allí por accidente."
    },

    {
        image: "frase7.png",
        text: "El pueblo llevaba varios días preparándose para la celebración más importante del año. Desde primera hora de la mañana, las calles estaban llenas de personas colocando luces, decorando las plazas y preparando los puestos donde se venderían comida, bebidas y productos artesanales. Los niños corrían de un lado para otro mientras los mayores intentaban terminar todos los preparativos antes de que comenzara la fiesta."
    },

    {
        image: "frase8.png",
        text: "Aquel verano decidió aceptar un trabajo en un pequeño pueblo situado junto al mar, pensando que solamente sería una experiencia temporal antes de regresar a su ciudad. Al principio todo le resultó extraño, porque estaba acostumbrado al ruido constante de los coches, a las calles llenas de gente y a tener prácticamente cualquier cosa a pocos minutos de distancia. En aquel lugar, en cambio, las tiendas cerraban temprano, las calles quedaban vacías después de las diez y casi todos parecían conocerse entre ellos. Poco a poco comenzó a acostumbrarse a aquel ritmo de vida y descubrió que disfrutaba de cosas que antes nunca había valorado."
    },

    {
        image: "frase9.png",
        text: "Después de tantos años trabajando en el mismo lugar, había aprendido a reconocer cada sonido de la oficina, cada movimiento de sus compañeros y hasta la hora exacta en la que la mayoría de las personas comenzaban a cansarse. Todo parecía funcionar siguiendo una rutina perfectamente establecida, y aunque en muchas ocasiones había pensado que necesitaba un cambio, siempre encontraba alguna razón para retrasarlo. Una mañana recibió una llamada que cambió completamente sus planes."
    },

    {
        image: "frase10.png",
        text: "La primera vez que vio aquella fotografía no le dio ninguna importancia, porque parecía una imagen completamente normal de una familia reunida durante unas vacaciones muchos años atrás. Sin embargo, cuando volvió a mirarla con más atención, descubrió algo extraño en una de las ventanas del edificio que aparecía al fondo. Había una persona observándolos desde dentro, aunque nadie recordaba que hubiera alguien en aquella habitación cuando se tomó la fotografía."
    }

];



// ============================================================
// CONFIGURACIÓN
// ============================================================

/*
 * Tope de seguridad para evitar partidas huérfanas si el jugador
 * abandona sin enviar nada. NO es un límite de juego real: el
 * cronómetro cuenta hacia arriba y solo se alcanza esto si se
 * deja la partida abierta sin responder.
 */
const MAX_TIME = 15 * 60 * 1000;

// XP por completar la frase al 100% y al instante.
// (Valor comparable al de otros minijuegos diarios.)
const PERFECT_XP = 700;

// Ventana (ms) en la que el bonus por rapidez cae de su máximo (1) a 0.
// Cuanto antes se envíe la frase dentro de esta ventana, más puntos.
const SPEED_WINDOW_MS = 3 * 60 * 1000;

// Parte del premio que siempre se mantiene (por completar) y parte
// que se gana con la velocidad. Ambas suman 1.
const BASE_RATIO = 0.35;
const SPEED_RATIO = 1 - BASE_RATIO;

/*
 * ============================================================
 * DETECCIÓN DE TEXTO PEGADO / EXTRAÍDO (heurística)
 * ============================================================
 *
 * La frase se muestra como IMAGEN, por lo que la única forma de
 * obtener el texto sin escribirlo es usar OCR y luego pegarlo.
 * Pegar es prácticamente instantáneo y casi siempre exacto.
 *
 * No se puede detectar pegado de forma exacta (la API solo expone
 * el texto), pero existe una señal clara: si la respuesta llega
 * casi perfecta en un tiempo imposible para escribirla a mano,
 * casi seguro que NO se ha tecleado.
 *
 * Regla actual:
 *
 *  - Exactitud >= PASTE_MIN_ACCURACY (casi perfecta).
 *  - Tiempo de llegada entre PASTE_MIN_TIME_MS y PASTE_MAX_TIME_MS
 *    (de 1 a 15 segundos).
 *
 * Si se detecta, se le retira el bonus por velocidad (solo se
 * entrega la parte base) porque ese bonus premia el tecleado.
 * ============================================================
 */

// Exactitud mínima para considerar la respuesta "casi perfecta".
const PASTE_MIN_ACCURACY = 0.98;

// Llegar en menos de 1 s es tan anómalo que se considera fallout/error
// (p. ej. un mensaje automático), no un tecleado -> no se penaliza.
const PASTE_MIN_TIME_MS = 1000;

// Llegar hasta en 15 segundos con casi perfecta exactitud es
// imposible de teclear una frase larga -> señal de pegado.
const PASTE_MAX_TIME_MS = 15 * 1000;



// ============================================================
// PARTIDAS ACTIVAS
// ============================================================

const activeGames = new Map();

/*
============================================================
CANAL ORIGINAL DE CADA JUGADOR CON PARTIDA PENDIENTE
============================================================

Guarda el canal del servidor donde se ejecutó /frase
para poder publicar allí el resultado público,
aunque el juego transcurra por mensaje directo.
============================================================
*/

const pendingGames = new Map();



// ============================================================
// UTILIDADES
// ============================================================

function normalize(text) {

    return String(text || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9ñ ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}



function getWords(text) {

    const normalized = normalize(text);

    if (!normalized) {
        return [];
    }

    return normalized.split(" ");

}



function getDailyPhrase() {

    const date = getLocalDateString();

    const seed = date
        .split("")
        .reduce(
            (acc, char) =>
                acc + char.charCodeAt(0),
            0
        );

    return PHRASES[seed % PHRASES.length];

}



function compareWords(
    originalText,
    userText
) {

    const originalWords =
        getWords(originalText);

    const userWords =
        getWords(userText);

    let correctWords = 0;

    for (
        let i = 0;
        i < originalWords.length;
        i++
    ) {

        if (
            userWords[i] &&
            userWords[i] === originalWords[i]
        ) {

            correctWords++;

        }

    }

    return {

        correctWords,
        totalWords:
            originalWords.length

    };

}



/*
 * ============================================================
 * CALCULAR XP
 * ============================================================
 *
 * No hay límite de tiempo: el cronómetro cuenta hacia arriba.
 *
 * El premio depende de dos cosas:
 *
 *  1. Precisión  → proporción de palabras correctas (0..1).
 *  2. Rapidez    → cuánto antes se envía la frase (0..1).
 *
 * Fórmula:
 *
 *   XP = PERFECT_XP × precisión × (BASE_RATIO + SPEED_RATIO × rapidez)
 *
 * - Frase perfecta e instantánea → 700 XP (antes de la racha).
 * - Frase perfecta pero lenta   → ~245 XP (solo parte base).
 * - Frase incompleta            → menos puntos (proporcional).
 * - Respuesta vacía             → 0 XP.
 *
 * ============================================================
 */

function calculateXp(
    correctWords,
    totalWords,
    elapsedMs
) {

    if (totalWords === 0) {
        return 0;
    }

    const accuracy =
        Math.min(
            1,
            Math.max(
                0,
                correctWords / totalWords
            )
        );

    const speedFactor =
        Math.min(
            1,
            Math.max(
                0,
                1 - (elapsedMs / SPEED_WINDOW_MS)
            )
        );

    const xp =
        PERFECT_XP *
        accuracy *
        (
            BASE_RATIO +
            SPEED_RATIO * speedFactor
        );

    return Math.round(xp);

}



// ============================================================
// DETECCIÓN DE RESPUESTA POSIBLEMENTE PEGADA
// ============================================================
//
// Devuelve true si la respuesta llegó casi perfecta dentro de una
// ventana de tiempo (1-15 s) imposible de teclear a mano una frase
// larga. Conservador: requiere exactitud casi perfecta.
//
// ============================================================

function isSuspectedPaste(
    elapsedMs,
    accuracy
) {

    if (
        accuracy < PASTE_MIN_ACCURACY
    ) {

        return false;

    }


    return (
        elapsedMs >= PASTE_MIN_TIME_MS &&
        elapsedMs <= PASTE_MAX_TIME_MS
    );

}



function formatTime(ms) {

    return `${(ms / 1000).toFixed(2)} segundos`;

}



// ============================================================
// EMBED DEL CRONÓMETRO
// ============================================================

function createGameEmbed(elapsedSeconds = 0) {

    const safeSeconds =
        Math.max(
            0,
            Math.floor(elapsedSeconds)
        );

    const description =
        `⏱️ **Tiempo transcurrido: ${formatTime(safeSeconds * 1000)}**\n\n` +
        "✍️ **Escribe la frase directamente en este chat.**\n\n" +
        "⚡ Cuanto antes la envíes, más puntos conseguirás.\n" +
        "✍️ Si la envías incompleta también cuenta, pero obtendrás menos puntos.";


    return new EmbedBuilder()
        .setColor("#00d26a")
        .setTitle("📝 ¡ESCRIBE LA FRASE!")
        .setDescription(description)
        .setFooter({
            text:
                "Sin límite de tiempo. Tu respuesta será procesada automáticamente."
        });

}



// ============================================================
// FINALIZAR PARTIDA
// ============================================================

async function finishGame(
    interaction,
    game,
    answer,
    timedOut = false
) {

    const elapsedMs =
        Math.min(
            Date.now() - game.startedAt,
            MAX_TIME
        );


    // --------------------------------------------------------
    // Comparar respuesta
    // --------------------------------------------------------

    const result =
        compareWords(
            game.phrase.text,
            answer
        );

    const {
        correctWords,
        totalWords
    } = result;


    // --------------------------------------------------------
    // Calcular XP base
    // --------------------------------------------------------

    const accuracy =
        totalWords > 0
            ? correctWords / totalWords
            : 0;

    // Detección heurística de texto pegado / extraído (OCR).
    const suspectedPaste =
        isSuspectedPaste(
            elapsedMs,
            accuracy
        );

    // Si se sospecha pegado, NO se otorgan puntos: la respuesta
    // casi perfecta en 1-15 s es señal de OCR + pegado, y ese
    // método no debería recompensarse. Se deja en 0 XP.
    const baseXp =
        suspectedPaste
            ? 0
            : calculateXp(
                correctWords,
                totalWords,
                elapsedMs
            );


    // --------------------------------------------------------
    // Aplicar multiplicador de racha
    // --------------------------------------------------------
    //
    // El multiplicador se aplica internamente.
    //
    // El usuario NO verá:
    //
    // - La racha.
    // - El multiplicador.
    // - El XP base.
    //
    // Solamente verá el XP final obtenido.
    //
    // --------------------------------------------------------

    const xpGain =
        applyStreakMultiplier(
            baseXp,
            game.streak
        );


    const percentage =
        Math.round(
            (correctWords / totalWords) * 100
        );



    // --------------------------------------------------------
    // Obtener usuario
    // --------------------------------------------------------

    const discordUser =
        interaction.user ||
        interaction.author;


    if (!discordUser) {

        console.error(
            "No se pudo obtener el usuario de la interacción."
        );

        return;

    }


    const user =
        await ensureUser(
            discordUser.id,
            discordUser.tag
        );


    const totalXp =
        Number(user.xp || 0) +
        xpGain;


    const nextLevel =
        Math.floor(totalXp / 1000) + 1;



    // --------------------------------------------------------
    // Actualizar estadísticas
    // --------------------------------------------------------

    await updateUserFields(

        discordUser.id,

        {

            daily_attempts:
                Number(user.daily_attempts || 0) + 1,

            daily_solved:
                1,

            xp:
                totalXp,

            level:
                nextLevel,

            wins:
                Number(user.wins || 0) + 1

        },

        interaction.member

    );



    // ========================================================
    // RESULTADO PRIVADO
    // ========================================================

    const privateEmbed =
        new EmbedBuilder()

            .setColor(
                percentage === 100
                    ? "#00d26a"
                    : "#fc0037"
            )

            .setTitle(
                "📝 Resultado de la frase"
            )

            .addFields(

                {

                    name:
                        "🎯 Palabras correctas",

                    value:
                        `**${correctWords}/${totalWords}** (${percentage}%)`,

                    inline:
                        true

                },

                {

                    name:
                        "⏱️ Tiempo",

                    value:
                        `**${formatTime(elapsedMs)}**`,

                    inline:
                        true

                },

                {

                    name:
                        "✨ Puntos",

                    value:
                        `**+${xpGain} XP**`,

                    inline:
                        true

                }

            );


    if (timedOut) {

        privateEmbed.setDescription(
            "⏰ **La partida se cerró por inactividad (no se recibió ninguna frase).**"
        );

    } else {

        let description =
            "✅ **Respuesta enviada correctamente.**";

        if (
            suspectedPaste
        ) {

            description +=

                "\n\n" +

                "🤖 **Posible texto pegado/extraído detectado:**\n" +

                "la respuesta llegó casi perfecta en muy poco tiempo, " +

                "así que **no se han otorgado puntos (0 XP)**.";

        }

        privateEmbed.setDescription(
            description
        );

    }



    // --------------------------------------------------------
    // Respuesta privada
    // --------------------------------------------------------

    if (
        interaction.isRepliable &&
        interaction.isRepliable()
    ) {

        if (
            interaction.deferred ||
            interaction.replied
        ) {

            await interaction.followUp({

                embeds:
                    [privateEmbed],

                ephemeral:
                    true

            });

        } else {

            await interaction.reply({

                embeds:
                    [privateEmbed],

                ephemeral:
                    true

            });

        }

    }



    // ========================================================
    // RESULTADO PÚBLICO
    // ========================================================

    const publicEmbed =
        new EmbedBuilder()

            .setColor(
                percentage === 100
                    ? "#00d26a"
                    : "#fc0037"
            )

            .setDescription(
                `📝 **${discordUser.username}** ha conseguido **+${xpGain} XP** en la frase del día.`
            );



    // --------------------------------------------------------
    // Buscar canal ORIGINAL del servidor (donde se ejecutó
    // /frase). El juego ocurre por MD, pero el resultado
    // público debe aparecer en el canal del servidor.
    // --------------------------------------------------------

    let channel =
        null;


    if (
        game.channelId
    ) {

        try {

            channel =
                await interaction.client.channels.fetch(
                    game.channelId
                );

        } catch (error) {

            console.error(
                "No se pudo obtener el canal original:",
                error
            );

        }

    }


    // Respaldo: si no se pudo recuperar el canal original
    // y la interacción proviene de un canal válido.

    if (
        !channel &&
        interaction.channel &&
        interaction.channel.guild
    ) {

        channel =
            interaction.channel;

    }


    if (channel) {

        await channel.send({

            embeds:
                [publicEmbed]

        });

    }

}



// ============================================================
// COMANDO
// ============================================================

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("frase")

            .setDescription(
                "Escribe la frase del día lo más rápido posible (se juega por MD)"
            ),



    // ========================================================
    // /frase
    // ========================================================

    async execute(interaction) {

        // ----------------------------------------------------
        // Comprobar diario
        // ----------------------------------------------------

        if (
            getDailyCommandName() !==
            "frase"
        ) {

            return interaction.reply({

                content:
                    "❌ Hoy el minijuego de diario no es **Frase**. Usa `/diario` para saber cuál toca hoy.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Comprobar partida existente
        // ----------------------------------------------------

        if (
            activeGames.has(
                interaction.user.id
            )
        ) {

            return interaction.reply({

                content:
                    "⚠️ Ya tienes una partida de Frase en curso.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Usuario
        // ----------------------------------------------------

        const user =
            await ensureUser(
                interaction.user.id,
                interaction.user.tag
            );


        const today =
            getLocalDateString();


        const lastDailyDate =
            user.last_daily_date
                ? String(
                    user.last_daily_date
                )
                : null;



        // ----------------------------------------------------
        // Reiniciar datos diarios
        // ----------------------------------------------------

        if (
            lastDailyDate !== today
        ) {

            await updateUserFields(

                interaction.user.id,

                {

                    last_daily_date:
                        today,

                    daily_attempts:
                        0,

                    daily_solved:
                        0

                }

            );

            user.daily_attempts = 0;
            user.daily_solved = 0;

        }



        // ----------------------------------------------------
        // Comprobar completado
        // ----------------------------------------------------

        if (
            Number(
                user.daily_solved || 0
            ) === 1
        ) {

            return interaction.reply({

                content:
                    "✅ Ya has completado la **Frase de hoy**. ¡Vuelve mañana!",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Obtener frase
        // ----------------------------------------------------

        const phrase =
            getDailyPhrase();



        // ----------------------------------------------------
        // Comprobar imagen
        // ----------------------------------------------------

        const imagePath =
            path.join(
                __dirname,
                "..",
                "phrases",
                phrase.image
            );


        if (
            !fs.existsSync(
                imagePath
            )
        ) {

            console.error(
                `No se encontró la imagen: ${imagePath}`
            );

            return interaction.reply({

                content:
                    "❌ La imagen de la frase no está disponible.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Botón
        // ----------------------------------------------------

        const button =
            new ButtonBuilder()

                .setCustomId(
                    "frase-start"
                )

                .setLabel(
                    "Empezar"
                )

                .setEmoji(
                    "✍️"
                )

                .setStyle(
                    ButtonStyle.Primary
                );


        const row =
            new ActionRowBuilder()
                .addComponents(
                    button
                );



        // ----------------------------------------------------
        // Embed inicial SIN IMAGEN
        // ----------------------------------------------------

        const embed =
            new EmbedBuilder()

                .setColor(
                    "#fc0037"
                )

                .setTitle(
                    "📝 FRASE DEL DÍA"
                )

                .setDescription(

                    "Tendrás que copiar la frase que aparecerá al comenzar.\n\n" +

                    "♾️ **No hay límite de tiempo.**\n" +

                    "⚡ Cuanto antes y más preciso seas, más puntos conseguirás.\n" +

                    "✍️ Da igual si la envías incompleta: también cuenta, pero te darán menos puntos.\n\n" +

                    "Pulsa **Empezar** cuando estés listo y escribe la frase\n" +

                    "directamente en este chat."

                )

                .setFooter({

                    text:
                        "La imagen aparecerá al pulsar Empezar."

                });


        // ----------------------------------------------------
        // Guardar canal original para el resultado público
        // ----------------------------------------------------

        pendingGames.set(
            interaction.user.id,
            interaction.channel.id
        );


        // ----------------------------------------------------
        // Enviar el juego por MD
        // ----------------------------------------------------

        let dmChannel;

        try {

            dmChannel =
                await interaction.user.createDM();

            await dmChannel.send({

                embeds:
                    [embed],

                components:
                    [row]

            });

        } catch (error) {

            console.error(
                "No se pudo enviar la Frase por MD:",
                error
            );

            pendingGames.delete(
                interaction.user.id
            );

            return interaction.reply({

                content:
                    "❌ No he podido enviarte el minijuego por mensaje directo.\n\n📩 Revisa tu configuración de privacidad y permite mensajes directos de miembros de este servidor.",

                ephemeral:
                    true

            });

        }


        // ----------------------------------------------------
        // Confirmación en el canal
        // ----------------------------------------------------

        return interaction.reply({

            content:
                "📩 Te he enviado la **Frase del día** por mensaje directo. Ábrela y pulsa **Empezar**.",

            ephemeral:
                true

        });

    },



    // ========================================================
    // BOTÓN "EMPEZAR"
    // ========================================================

    async handleButton(interaction) {

        if (
            interaction.customId !==
            "frase-start"
        ) {

            return;

        }



        // ----------------------------------------------------
        // Comprobar diario
        // ----------------------------------------------------

        if (
            getDailyCommandName() !==
            "frase"
        ) {

            return interaction.reply({

                content:
                    "❌ Hoy el diario no es Frase.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Comprobar partida existente
        // ----------------------------------------------------

        if (
            activeGames.has(
                interaction.user.id
            )
        ) {

            return interaction.reply({

                content:
                    "⚠️ Ya tienes una partida en curso.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Obtener usuario
        // ----------------------------------------------------

        const user =
            await ensureUser(
                interaction.user.id,
                interaction.user.tag
            );



        // ----------------------------------------------------
        // Comprobar que todavía no haya completado el diario
        // ----------------------------------------------------

        if (
            Number(
                user.daily_solved || 0
            ) === 1
        ) {

            return interaction.reply({

                content:
                    "✅ Ya has completado la **Frase de hoy**. ¡Vuelve mañana!",

                ephemeral:
                    true

            });

        }



        // ====================================================
        // REGISTRAR PARTIDA EN LA RACHA
        // ====================================================

        let streakResult;

        try {

            streakResult =
                await registerDailyGame(
                    interaction.user.id
                );

        } catch (error) {

            console.error(
                "Error registrando partida diaria en la racha:",
                error
            );

            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al registrar tu partida diaria.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Obtener frase
        // ----------------------------------------------------

        const phrase =
            getDailyPhrase();



        // ----------------------------------------------------
        // Imagen
        // ----------------------------------------------------

        const imagePath =
            path.join(
                __dirname,
                "..",
                "phrases",
                phrase.image
            );


        if (
            !fs.existsSync(
                imagePath
            )
        ) {

            return interaction.reply({

                content:
                    "❌ No se encuentra la imagen de esta frase.",

                ephemeral:
                    true

            });

        }



        // ----------------------------------------------------
        // Crear partida
        // ----------------------------------------------------

        /*
         * El canal original es el del servidor donde
         * se ejecutó /frase (guardado en pendingGames),
         * para publicar allí el resultado público.
         */

        const originalChannelId =
            pendingGames.get(interaction.user.id) ||
            interaction.channel?.id;


        pendingGames.delete(
            interaction.user.id
        );


        const game = {

            phrase,

            channelId:
                originalChannelId,

            startedAt:
                Date.now(),

            collector:
                null,

            timer:
                null,

            streak:
                streakResult.streak

        };


        // ----------------------------------------------------
        // Canal directo del jugador
        // ----------------------------------------------------

        let dmChannel;

        try {

            dmChannel =
                await interaction.user.createDM();

        } catch (error) {

            console.error(
                "No se pudo abrir el MD para Frase:",
                error
            );

            return interaction.reply({

                content:
                    "❌ No he podido abrir tu chat privado.",

                ephemeral:
                    true

            });

        }


        // ----------------------------------------------------
        // Collector (en el MD)
        // ----------------------------------------------------

        const collector =
            dmChannel.createMessageCollector({

                filter:
                    message =>
                        message.author.id ===
                        interaction.user.id,

                time:
                    MAX_TIME,

                max:
                    1

            });


        game.collector =
            collector;


        activeGames.set(

            interaction.user.id,

            game

        );



        // ----------------------------------------------------
        // Imagen como archivo independiente
        // ----------------------------------------------------

        const attachment =
            new AttachmentBuilder(

                imagePath,

                {

                    name:
                        phrase.image

                }

            );



        // ----------------------------------------------------
        // Embed inicial
        // ----------------------------------------------------

        const startEmbed =
            createGameEmbed(
                0
            );



        // ----------------------------------------------------
        // Actualizar mensaje privado
        // ----------------------------------------------------

        await interaction.update({

            embeds:
                [startEmbed],

            components:
                [],

            files:
                [attachment]

        });



        // ====================================================
        // CRONÓMETRO VISUAL
        // ====================================================

        game.timer =
            setInterval(

                async () => {

                    try {

                        if (
                            !activeGames.has(
                                interaction.user.id
                            )
                        ) {

                            clearInterval(
                                game.timer
                            );

                            game.timer =
                                null;

                            return;

                        }


                        const elapsed =
                            Date.now() -
                            game.startedAt;


                        const elapsedSeconds =
                            Math.floor(
                                elapsed / 1000
                            );



                        // ------------------------------------------------
                        // Actualizar embed (tiempo transcurrido)
                        // ------------------------------------------------

                        await interaction.editReply({

                            embeds: [

                                createGameEmbed(
                                    elapsedSeconds
                                )

                            ]

                        });

                    } catch (error) {

                        console.error(
                            "Error actualizando cronómetro:",
                            error
                        );

                    }

                },

                1000

            );



        // ====================================================
        // RESPUESTA DEL USUARIO
        // ====================================================

        collector.on(

            "collect",

            async message => {

                try {

                    const answer =
                        message.content;



                    // ----------------------------------------
                    // Borrar mensaje
                    // ----------------------------------------

                    try {

                        await message.delete();

                    } catch (error) {

                        console.error(
                            "No se pudo borrar el mensaje:",
                            error.message
                        );

                    }



                    // ----------------------------------------
                    // Eliminar partida
                    // ----------------------------------------

                    activeGames.delete(
                        interaction.user.id
                    );



                    // ----------------------------------------
                    // Detener cronómetro
                    // ----------------------------------------

                    if (
                        game.timer
                    ) {

                        clearInterval(
                            game.timer
                        );

                        game.timer =
                            null;

                    }



                    // ----------------------------------------
                    // Detener collector
                    // ----------------------------------------

                    if (
                        !collector.ended
                    ) {

                        collector.stop(
                            "submitted"
                        );

                    }



                    // ----------------------------------------
                    // Finalizar
                    // ----------------------------------------

                    await finishGame(

                        interaction,

                        game,

                        answer,

                        false

                    );

                } catch (error) {

                    console.error(
                        "Error procesando frase:",
                        error
                    );

                }

            }

        );



        // ====================================================
        // PARTIDA CERRADA POR INACTIVIDAD
        // ====================================================

        collector.on(

            "end",

            async (
                collected,
                reason
            ) => {

                if (
                    reason !== "time" ||
                    collected.size > 0
                ) {

                    return;

                }


                if (
                    !activeGames.has(
                        interaction.user.id
                    )
                ) {

                    return;

                }


                activeGames.delete(
                    interaction.user.id
                );



                // ------------------------------------------------
                // Detener cronómetro
                // ------------------------------------------------

                if (
                    game.timer
                ) {

                    clearInterval(
                        game.timer
                    );

                    game.timer =
                        null;

                }



                try {

                    // Mostrar 0 segundos antes del resultado.

                    await interaction.editReply({

                        embeds: [

                            createGameEmbed(
                                0
                            )

                        ]

                    });

                } catch (error) {

                    console.error(
                        "No se pudo actualizar el cronómetro final:",
                        error
                    );

                }



                try {

                    await finishGame(

                        interaction,

                        game,

                        "",

                        true

                    );

                } catch (error) {

                    console.error(
                        "Error finalizando frase por tiempo:",
                        error
                    );

                }

            }

        );

    }

};
