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
        text: "Después de varios meses ahorrando dinero, preparando el equipaje y organizando cada detalle del viaje, finalmente llegó el día que todos estaban esperando. El avión despegó poco después del amanecer y, mientras las nubes quedaban cada vez más lejos, comenzaron a darse cuenta de que realmente estaban dejando atrás su vida cotidiana durante unas semanas. Al llegar a su destino, descubrieron una ciudad enorme, llena de calles desconocidas, restaurantes pequeños, edificios antiguos y personas que parecían tener siempre algún lugar al que ir. Durante los primeros días se perdieron varias veces, pero terminaron descubriendo lugares mucho más interesantes que los que aparecían en cualquier guía turística."
    },

    {
        image: "frase2.png",
        text: "Durante años, aquel reloj permaneció guardado en el fondo de un cajón que nadie utilizaba. Había pertenecido a su abuelo y, aunque aparentemente no tenía nada de especial, siempre había existido una extraña historia relacionada con él. Según contaba la familia, el reloj se había detenido exactamente a las tres y diecisiete de la madrugada el día que ocurrió un acontecimiento que cambió sus vidas para siempre. Nadie sabía explicar por qué, pero cada vez que alguien intentaba ponerlo nuevamente en funcionamiento, las agujas volvían a detenerse en la misma hora. Una tarde, mientras ordenaba la casa, decidió sacarlo del cajón y llevarlo a un relojero. Lo que descubrió después hizo que aquella vieja historia familiar pareciera mucho menos absurda de lo que había imaginado."
    },

    {
        image: "frase3.png",
        text: "Durante mucho tiempo pensó que quedarse en aquella ciudad era la decisión más segura que podía tomar, porque allí tenía un trabajo estable, una casa conocida y personas con las que había compartido prácticamente toda su vida. Sin embargo, cada mañana se despertaba con la sensación de estar perdiéndose algo importante, como si hubiera dejado una parte de sí mismo en algún lugar que todavía no conocía. Una tarde, después de regresar del trabajo, abrió un viejo cuaderno donde había escrito años atrás todos los lugares que quería visitar, las cosas que quería aprender y los proyectos que algún día esperaba comenzar. Al leer aquellas páginas se dio cuenta de que casi ninguno de sus sueños había desaparecido realmente, simplemente los había ido dejando para más adelante hasta convencerse de que ya no eran importantes. Aquella noche tomó una decisión que llevaba años evitando y comenzó a preparar todo lo necesario para empezar una nueva etapa."
    },

    {
        image: "frase4.png",
        text: "La lluvia había comenzado poco después de las seis de la tarde y no parecía tener intención de detenerse. Las calles estaban prácticamente vacías, los coches avanzaban lentamente y las luces de las tiendas se reflejaban sobre el asfalto mojado creando pequeñas manchas de colores que desaparecían cada vez que pasaba alguien caminando. Desde la ventana de su habitación observaba todo aquello mientras escuchaba las gotas golpear contra el cristal. Había sido un día especialmente complicado y lo único que quería era olvidarse durante unas horas de todas las responsabilidades que tenía pendientes. Entonces recibió un mensaje de un viejo amigo al que no veía desde hacía varios años. El mensaje era sencillo y solamente decía que estaba cerca y que le gustaría hablar. Sin saber exactamente por qué, se puso una chaqueta, salió de casa y comenzó a caminar bajo la lluvia. Lo que parecía una conversación cualquiera terminó convirtiéndose en una de esas noches que ambos recordarían durante mucho tiempo."
    },

    {
        image: "frase5.png",
        text: "Cuando llegó a la estación, faltaban solamente diez minutos para que saliera el último tren de la noche. Había pasado todo el día dudando sobre si realmente debía marcharse, porque abandonar su ciudad significaba despedirse de muchas personas y empezar prácticamente desde cero en un lugar donde no conocía a nadie. Aun así, sabía que si regresaba a casa probablemente volvería a cambiar de opinión y terminaría quedándose exactamente donde estaba. Compró el billete, guardó la cartera en el bolsillo y se sentó en uno de los bancos mientras esperaba. A su alrededor, varias personas hablaban por teléfono, otras revisaban sus maletas y algunas simplemente miraban las vías en silencio. Cuando finalmente escuchó el sonido del tren acercándose, sintió una mezcla de miedo y emoción que no había experimentado nunca. Subió al vagón, encontró un asiento junto a la ventana y observó cómo la estación comenzaba a alejarse lentamente. Por primera vez en mucho tiempo, no sabía qué iba a ocurrir al día siguiente, pero precisamente eso era lo que más ilusión le hacía."
    },

    {
        image: "frase6.png",
        text: "En aquella pequeña biblioteca había miles de libros, algunos tan antiguos que sus páginas comenzaban a romperse cada vez que alguien intentaba pasarlas. El lugar llevaba décadas abierto y, aunque ya casi nadie acudía allí para estudiar, seguía siendo uno de los rincones más tranquilos de la ciudad. Una tarde, mientras buscaba información para un trabajo, encontró un libro que no aparecía en el catálogo y que parecía haber sido colocado allí por accidente. No tenía título en la portada ni nombre de autor, solamente una pequeña fecha escrita con tinta negra en la primera página. Movido por la curiosidad, comenzó a leerlo y descubrió que cada capítulo hablaba de acontecimientos que todavía no habían ocurrido. Al principio pensó que se trataba de una historia de ficción, pero después encontró descrito exactamente lo que había sucedido aquella misma mañana. Continuó leyendo hasta llegar a una página en blanco donde solamente había una frase escrita: «A partir de este momento, tú decides lo que ocurre». Cerró el libro inmediatamente y durante varios segundos se quedó mirando la portada sin saber si debía volver a abrirlo."
    },

    {
        image: "frase7.png",
        text: "El pueblo llevaba varios días preparándose para la celebración más importante del año. Desde primera hora de la mañana, las calles estaban llenas de personas colocando luces, decorando las plazas y preparando los puestos donde se venderían comida, bebidas y productos artesanales. Los niños corrían de un lado para otro mientras los mayores intentaban terminar todos los preparativos antes de que comenzara la fiesta. Al caer la tarde, las campanas de la iglesia comenzaron a sonar y poco a poco las calles se llenaron de música y conversaciones. Nadie parecía preocupado por el paso del tiempo, porque aquella noche todos tenían algún motivo para celebrar. Cerca de la plaza principal, un grupo de músicos comenzó a tocar una canción que casi todo el mundo conocía y decenas de personas se acercaron para cantar y bailar. Durante unas horas, las diferencias entre unos y otros parecieron desaparecer y todo el pueblo consiguió sentirse como una única comunidad. Cuando finalmente llegó la madrugada y las luces comenzaron a apagarse, muchos regresaron a sus casas cansados, pero con la sensación de haber vivido una noche que tardarían mucho tiempo en olvidar."
    },

    {
        image: "frase8.png",
        text: "Aquel verano decidió aceptar un trabajo en un pequeño pueblo situado junto al mar, pensando que solamente sería una experiencia temporal antes de regresar a su ciudad. Al principio todo le resultó extraño, porque estaba acostumbrado al ruido constante de los coches, a las calles llenas de gente y a tener prácticamente cualquier cosa a pocos minutos de distancia. En aquel lugar, en cambio, las tiendas cerraban temprano, las calles quedaban vacías después de las diez y casi todos parecían conocerse entre ellos. Poco a poco comenzó a acostumbrarse a aquel ritmo de vida y descubrió que disfrutaba de cosas que antes nunca había valorado. Cada mañana caminaba hasta la playa antes de empezar a trabajar, por las tardes se sentaba en una cafetería cercana y algunas noches se quedaba hablando durante horas con las personas que había conocido allí. Cuando finalmente llegó el momento de regresar a casa, se dio cuenta de que aquel lugar que al principio solamente consideraba una parada temporal se había convertido en uno de los sitios donde más cómodo se había sentido en toda su vida."
    },

    {
        image: "frase9.png",
        text: "Después de tantos años trabajando en el mismo lugar, había aprendido a reconocer cada sonido de la oficina, cada movimiento de sus compañeros y hasta la hora exacta en la que la mayoría de las personas comenzaban a cansarse. Todo parecía funcionar siguiendo una rutina perfectamente establecida, y aunque en muchas ocasiones había pensado que necesitaba un cambio, siempre encontraba alguna razón para retrasarlo. Una mañana recibió una llamada que cambió completamente sus planes. Una empresa de otra ciudad le ofrecía la oportunidad de participar en un proyecto importante que llevaba meses esperando conseguir, pero aceptar significaba dejar atrás muchas cosas que conocía y empezar de nuevo. Durante todo el día estuvo pensando en las ventajas y desventajas de aquella decisión, imaginando todos los problemas que podrían aparecer si decía que sí y todas las oportunidades que podría perder si decía que no. Finalmente, cuando terminó su jornada, apagó el ordenador, recogió sus cosas y se quedó unos segundos mirando aquella oficina que había visto todos los días durante años. Entonces comprendió que quizá no necesitaba estar seguro de que todo iba a salir bien, solamente necesitaba estar dispuesto a descubrir qué podía ocurrir."
    },

    {
        image: "frase10.png",
        text: "La primera vez que vio aquella fotografía no le dio ninguna importancia, porque parecía una imagen completamente normal de una familia reunida durante unas vacaciones muchos años atrás. Sin embargo, cuando volvió a mirarla con más atención, descubrió algo extraño en una de las ventanas del edificio que aparecía al fondo. Había una persona observándolos desde dentro, aunque nadie recordaba que hubiera alguien en aquella habitación cuando se tomó la fotografía. Al principio pensó que se trataba simplemente de un reflejo o de algún efecto producido por la cámara, pero después encontró otras fotografías tomadas durante el mismo viaje y descubrió que aquella misma figura aparecía en todas ellas, siempre en un lugar diferente y siempre mirando directamente hacia la cámara. Durante los días siguientes intentó averiguar quién podía ser aquella persona, preguntó a sus familiares y revisó antiguos álbumes, pero nadie consiguió reconocerla. Finalmente encontró una caja guardada en el desván de sus abuelos y dentro había una fotografía mucho más antigua en la que aparecía la misma figura. En la parte posterior alguien había escrito una fecha y una frase que hizo que se quedara completamente paralizado: No vuelvas a buscarla."
    }

];



// ============================================================
// CONFIGURACIÓN
// ============================================================

const MAX_TIME = 30000;



// ============================================================
// PARTIDAS ACTIVAS
// ============================================================

const activeGames = new Map();



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



function calculateXp(
    correctWords,
    totalWords,
    elapsedMs
) {

    if (totalWords === 0) {
        return 0;
    }

    const baseXp =
        correctWords * 35;

    const timeRatio =
        Math.max(
            0,
            Math.min(
                1,
                1 - (elapsedMs / MAX_TIME)
            )
        );

    const speedMultiplier =
        1 + timeRatio;

    return Math.round(
        baseXp * speedMultiplier
    );

}



function formatTime(ms) {

    return `${(ms / 1000).toFixed(2)} segundos`;

}



// ============================================================
// EMBED DEL CRONÓMETRO
// ============================================================

function createGameEmbed(secondsLeft) {

    let timerText;

    if (secondsLeft <= 0) {

        timerText =
            "⏰ **¡TIEMPO AGOTADO!**";

    } else if (secondsLeft <= 5) {

        timerText =
            `🚨 **¡${secondsLeft} SEGUNDOS!**`;

    } else if (secondsLeft <= 10) {

        timerText =
            `⚠️ **¡Quedan ${secondsLeft} segundos!**`;

    } else {

        timerText =
            `⏱️ **${secondsLeft} segundos restantes**`;

    }


    let description =
        `${timerText}\n\n` +
        "Escribe la frase utilizando:\n" +
        "`/frase contenido: tu frase aquí`\n\n";


    if (
        secondsLeft <= 10 &&
        secondsLeft > 5
    ) {

        description +=
            "⚠️ **¡Date prisa!**";

    } else if (
        secondsLeft <= 5 &&
        secondsLeft > 0
    ) {

        description +=
            "🚨 **¡ENVÍA TU RESPUESTA YA!**";

    } else if (secondsLeft <= 0) {

        description +=
            "❌ **El tiempo ha terminado.**";

    } else {

        description +=
            "⚡ Cuanto más rápido y preciso seas, más puntos conseguirás.";

    }


    return new EmbedBuilder()
        .setColor("#fc0037")
        .setTitle("📝 ¡ESCRIBE LA FRASE!")
        .setDescription(description)
        .setFooter({
            text:
                "Tu respuesta será procesada automáticamente."
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

    const baseXp =
        calculateXp(
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
            "⏰ **Se acabaron los 30 segundos.**"
        );

    } else {

        privateEmbed.setDescription(
            "✅ **Respuesta enviada correctamente.**"
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
    // Buscar canal
    // --------------------------------------------------------

    let channel =
        interaction.channel;


    if (
        !channel &&
        game.channelId
    ) {

        try {

            channel =
                await interaction.client.channels.fetch(
                    game.channelId
                );

        } catch (error) {

            console.error(
                "No se pudo obtener el canal:",
                error
            );

        }

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
                "Escribe la frase del día lo más rápido posible"
            )

            .addStringOption(option =>

                option

                    .setName("contenido")

                    .setDescription(
                        "La frase que has escrito"
                    )

                    .setRequired(false)

            ),



    // ========================================================
    // /frase
    // ========================================================

    async execute(interaction) {

        const answer =
            interaction.options.getString(
                "contenido"
            );


        if (answer !== null) {

            return handleAnswer(
                interaction,
                answer
            );

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

                    "⏱️ **Tienes 30 segundos.**\n" +

                    "⚡ Cuanto más rápido y preciso seas, más puntos conseguirás.\n\n" +

                    "Prepara el comando `/frase contenido:` y pulsa **Empezar** cuando estés listo.\n\n" +

                    "⚠️ Si no envías la frase en 30 segundos, la partida se dará por perdida."

                )

                .setFooter({

                    text:
                        "La imagen aparecerá al pulsar Empezar."

                });



        // ----------------------------------------------------
        // Todo privado
        // ----------------------------------------------------

        return interaction.reply({

            embeds:
                [embed],

            components:
                [row],

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

        const game = {

            phrase,

            channelId:
                interaction.channel.id,

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
        // Collector
        // ----------------------------------------------------

        const collector =
            interaction.channel.createMessageCollector({

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
                30
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


                        const remaining =
                            Math.max(

                                0,

                                MAX_TIME -
                                elapsed

                            );


                        const secondsLeft =
                            Math.ceil(
                                remaining / 1000
                            );



                        // ------------------------------------------------
                        // Tiempo agotado
                        // ------------------------------------------------

                        if (
                            remaining <= 0
                        ) {

                            clearInterval(
                                game.timer
                            );

                            game.timer =
                                null;

                            return;

                        }



                        // ------------------------------------------------
                        // Actualizar embed
                        // ------------------------------------------------

                        await interaction.editReply({

                            embeds: [

                                createGameEmbed(
                                    secondsLeft
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
        // TIEMPO AGOTADO
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



// ============================================================
// PROCESAR /FRASE CONTENIDO:
// ============================================================

async function handleAnswer(
    interaction,
    answer
) {

    // --------------------------------------------------------
    // Buscar partida
    // --------------------------------------------------------

    const game =
        activeGames.get(
            interaction.user.id
        );



    // --------------------------------------------------------
    // No hay partida
    // --------------------------------------------------------

    if (!game) {

        return interaction.reply({

            content:
                "❌ No tienes ninguna partida de **Frase** activa. Usa `/frase` y pulsa **Empezar** primero.",

            ephemeral:
                true

        });

    }



    // --------------------------------------------------------
    // Comprobar canal
    // --------------------------------------------------------

    if (
        game.channelId !==
        interaction.channel.id
    ) {

        return interaction.reply({

            content:
                "❌ Debes enviar la frase en el mismo canal donde comenzaste la partida.",

            ephemeral:
                true

        });

    }



    // --------------------------------------------------------
    // Comprobar tiempo
    // --------------------------------------------------------

    const elapsed =
        Date.now() -
        game.startedAt;


    if (
        elapsed >= MAX_TIME
    ) {

        activeGames.delete(
            interaction.user.id
        );


        if (
            game.timer
        ) {

            clearInterval(
                game.timer
            );

            game.timer =
                null;

        }


        if (
            game.collector
        ) {

            game.collector.stop(
                "timeout-command"
            );

        }


        return finishGame(

            interaction,

            game,

            "",

            true

        );

    }



    // --------------------------------------------------------
    // Eliminar partida
    // --------------------------------------------------------

    activeGames.delete(
        interaction.user.id
    );



    // --------------------------------------------------------
    // Detener cronómetro
    // --------------------------------------------------------

    if (
        game.timer
    ) {

        clearInterval(
            game.timer
        );

        game.timer =
            null;

    }



    // --------------------------------------------------------
    // Detener collector
    // --------------------------------------------------------

    if (
        game.collector
    ) {

        game.collector.stop(
            "submitted"
        );

    }



    // --------------------------------------------------------
    // Finalizar
    // --------------------------------------------------------

    await finishGame(

        interaction,

        game,

        answer,

        false

    );

}
