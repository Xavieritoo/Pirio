const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const path = require("path");
const fs = require("fs");

const {
    ensureUser,
    updateUserFields,
    addXp
} = require("../database/users");

const {
    getSongForDate
} = require("../database/songs");

const {
    getDailyCommandName,
    getLocalDateString
} = require("../database/daily-game");

const {
    registerDailyGame,
    getUserStreak,
    applyStreakMultiplier
} = require("../database/streaks");


const MAX_ATTEMPTS = 3;


/*
 * ============================================================
 * CANCIONES
 * ============================================================
 */

const SONGS = [
    {
        file: "cancion1.mp3",
        answers: [
            "despacito",
            "despacito luis fonsi",
            "despacito - luis fonsi"
        ],
        label: "Despacito"
    },

    {
        file: "cancion2.mp3",
        answers: [
            "without me",
            "without me eminem",
            "without me - eminem"
        ],
        label: "Without Me"
    },

    {
        file: "cancion3.mp3",
        answers: [
            "no tiene sentido",
            "no tiene sentido - beéle",
            "no tiene sentido beéle"
        ],
        label: "No tiene sentido"
    },

    {
        file: "cancion4.mp3",
        answers: [
            "gran vía",
            "gran via",
            "gran vía - quevedo ft. aitana"
        ],
        label: "GRAN VÍA - Quevedo ft. Aitana"
    },

    {
        file: "cancion5.mp3",
        answers: [
            "el bachatón de la l",
            "el bachaton de la l",
            "el bachatón de la l - lola indigo, lucho rk"
        ],
        label: "Lola Indigo, Lucho RK - EL BACHATÓN DE LA L"
    },

    {
        file: "cancion6.mp3",
        answers: [
            "la perla",
            "la perla - rosalía",
            "la perla - rosalía ft. yahritza y su esencia"
        ],
        label: "ROSALÍA - La Perla (Official Video) ft. Yahritza Y Su Esencia"
    },

    {
        file: "cancion7.mp3",
        answers: [
            "choque",
            "choque - checho corleone, bad gyal",
            "choque checho corleone, bad gyal"
        ],
        label: "Bad Gyal, Chencho Corleone - Choque (Visualizer)"
    },

    {
        file: "cancion8.mp3",
        answers: [
            "dai dai",
            "dai dai - shakira, burna boy",
            "dai dai shakira, burna boy"
        ],
        label: "Shakira, Burna Boy - Dai Dai (Official Video)"
    },

    {
        file: "cancion9.mp3",
        answers: [
            "bring your love",
            "bring your love - madonna & sabrina carpenter",
            "bring your love madonna & sabrina carpenter"
        ],
        label: "Madonna & Sabrina Carpenter - Bring Your Love (Official Video)"
    },

    {
        file: "cancion10.mp3",
        answers: [
            "golden",
            "golden - huntr/x",
            "golden huntr/x ft. ejae, audrey nuna, rei ami"
        ],
        label: "HUNTR/X - Golden (Lyrics) ft. EJAE · AUDREY NUNA · REI AMI"
    },

    {
        file: "cancion11.mp3",
        answers: [
            "la plena",
            "la plena - w sound, beéle, westcol, ovy on the drums",
            "la plena w sound, beéle, westcol, ovy on the drums"
        ],
        label: "W Sound, Beéle, Westcol, Ovy On The Drums - La Plena (Lyric Video) | CantoYo"
    },

    {
        file: "cancion12.mp3",
        answers: [
            "soleao",
            "soleao - myke towers & quevedo",
            "soleao - myke towers quevedo"
        ],
        label: "Myke Towers & Quevedo - SOLEAO (Official Music Video)"
    },

    {
        file: "cancion13.mp3",
        answers: [
            "de lejitos",
            "de lejitos (remix)",
            "de lejitos - jay wheeler, omar courtz"
        ],
        label: "Jay Wheeler, Omar Courtz - De Lejitos (Remix) (Video Oficial)"
    },

    {
        file: "cancion14.mp3",
        answers: [
            "fuga",
            "fuga - jay wheeler",
            "fuga jay wheeler"
        ],
        label: "Jay Wheeler - Fuga (Official Visualizer)"
    },

    {
        file: "cancion15.mp3",
        answers: [
            "yo te conozco",
            "yo te conozco - de la rose",
            "yo te conozco de la rose"
        ],
        label: "De La Rose - Yo te conozco :): (Visual Art)"
    },

    {
        file: "cancion16.mp3",
        answers: [
            "tu vas sin",
            "tu vas sin (fav)",
            "tu vas sin (fav) - rels b"
        ],
        label: "Rels B - TU VAS SIN (fav) | afroLOVA 25'"
    },

    {
        file: "cancion17.mp3",
        answers: [
            "droga",
            "droga - mora, c. tangana",
            "droga mora, c. tangana"
        ],
        label: "Mora, C. Tangana - DROGA (Video Oficial) | LO MISMO DE SIEMPRE"
    },

    {
        file: "cancion18.mp3",
        answers: [
            "uwaie",
            "uwaie - kapo",
            "uwaie kapo"
        ],
        label: "UWAIE - Kapo"
    },

    {
        file: "cancion19.mp3",
        answers: [
            "si te pillara",
            "si te pillara - beéle",
            "si te pillara beéle"
        ],
        label: "Beéle - si te pillara (Performance/Lyrics)"
    },

    {
        file: "cancion20.mp3",
        answers: [
            "nuevayol",
            "nuevayol - bad bunny",
            "nuevayol bad bunny"
        ],
        label: "BAD BUNNY - NUEVAYoL (Video Oficial) | DeBÍ TiRAR MáS FOToS"
    },

    {
        file: "cancion21.mp3",
        answers: [
            "qué pasaría",
            "qué pasaría...",
            "qué pasaría - rauw alejandro, bad bunny"
        ],
        label: "Rauw Alejandro, Bad Bunny - Qué Pasaría... (Official Lyric Video)"
    },

    {
        file: "cancion22.mp3",
        answers: [
            "se lo juro mor",
            "se lo juro mor - feid",
            "se lo juro mor feid"
        ],
        label: "Feid - Se Lo Juro Mor (Official Video)"
    },

    {
        file: "cancion23.mp3",
        answers: [
            "cosita linda",
            "cosita linda - elena rose & justin quiles",
            "cosita linda elena rose & justin quiles"
        ],
        label: "ELENA ROSE & Justin Quiles - COSITA LINDA"
    },

    {
        file: "cancion24.mp3",
        answers: [
            "menos el cora",
            "menos el cora - ryan castro, manuel turizo",
            "menos el cora ryan castro, manuel turizo"
        ],
        label: "Ryan Castro, Manuel Turizo - MENOS EL CORA (Video Oficial) | SENDÉ"
    },

    {
        file: "cancion25.mp3",
        answers: [
            "la pelirroja",
            "la pelirroja - sebastián yatra",
            "la pelirroja sebastián yatra"
        ],
        label: "Sebastián Yatra - La Pelirroja (Official Video)"
    },

    {
        file: "cancion26.mp3",
        answers: [
            "me has invitado a bailar",
            "me has invitado a bailar - dani fernández",
            "me has invitado a bailar dani fernández"
        ],
        label: "Dani Fernández - Me has invitado a bailar (Videoclip Oficial)"
    },

    {
        file: "cancion27.mp3",
        answers: [
            "animal",
            "animal - maria becerra",
            "animal maria becerra"
        ],
        label: "Maria Becerra, Cazzu - ANIMAL (Official Video)"
    },

    {
        file: "cancion28.mp3",
        answers: [
            "mamiii",
            "mamiii - becky g, karol g",
            "mamiii becky g, karol g"
        ],
        label: "Becky G, KAROL G - MAMIII (Official Video)"
    },

    {
        file: "cancion29.mp3",
        answers: [
            "el merengue",
            "el merengue - marshmello, manuel turizo",
            "el merengue marshmello, manuel turizo"
        ],
        label: "Marshmello, Manuel Turizo - El Merengue (Official Video)"
    },

    {
        file: "cancion30.mp3",
        answers: [
            "gata only",
            "gata only - floyymenor, cris mj",
            "gata only floyymenor, cris mj"
        ],
        label: "FloyyMenor, Cris MJ - Gata Only (Video Oficial)"
    }
];


/*
 * ============================================================
 * NORMALIZAR RESPUESTA
 * ============================================================
 */

function normalize(text) {

    return String(text || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/*
 * ============================================================
 * XP SEGÚN INTENTO
 * ============================================================
 *
 * Intento 1 -> 700 XP
 * Intento 2 -> 650 XP
 * Intento 3 -> 600 XP
 *
 * ============================================================
 */

function getXpForAttempt(attempt) {

    return Math.max(
        150,
        700 - (attempt - 1) * 50
    );

}


/*
 * ============================================================
 * COMANDO
 * ============================================================
 */

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName("cancion")

            .setDescription(
                "Adivina la canción del día"
            )

            .addStringOption(option =>
                option
                    .setName("respuesta")
                    .setDescription(
                        "Tu respuesta para la canción"
                    )
                    .setRequired(false)
            ),


    async execute(interaction) {

        /*
         * ====================================================
         * COMPROBAR QUE HOY TOCA CANCIÓN
         * ====================================================
         */

        const dailyCommand =
            getDailyCommandName();


        if (
            dailyCommand !== "cancion"
        ) {

            return interaction.reply({

                content:
                    "❌ Hoy el minijuego de diario no es Canción. Usa `/diario` para saber cuál toca hoy.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * FECHA ACTUAL
         * ====================================================
         */

        const today =
            getLocalDateString();


        /*
         * ====================================================
         * OBTENER CANCIÓN DEL DÍA
         * ====================================================
         */

        const song =
            await getSongForDate(
                today,
                SONGS
            );


        /*
         * ====================================================
         * RUTA DEL AUDIO
         * ====================================================
         */

        const audioPath =
            path.join(
                __dirname,
                "..",
                "audio",
                song.file
            );


        /*
         * ====================================================
         * COMPROBAR AUDIO
         * ====================================================
         */

        if (
            !fs.existsSync(audioPath)
        ) {

            console.error(
                `No se encontró el archivo: ${audioPath}`
            );

            return interaction.reply({

                content:
                    "❌ El audio de la canción de hoy no está disponible.",

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

            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al cargar tu perfil.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * COMPROBAR SI ES UN NUEVO DÍA
         * ====================================================
         */

        const lastDailyDate =
            user.last_daily_date
                ? String(user.last_daily_date)
                : null;


        const isNewDailyGame =
            lastDailyDate !== today;


        /*
         * ====================================================
         * NUEVO DÍA
         * ====================================================
         */

        if (
            isNewDailyGame
        ) {

            try {

                /*
                 * Registrar la partida en la racha.
                 */

                await registerDailyGame(
                    interaction.user.id
                );


                /*
                 * Reiniciar estado del minijuego.
                 */

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


                /*
                 * Recargar usuario.
                 */

                user =
                    await ensureUser(

                        interaction.user.id,

                        interaction.user.tag

                    );

            } catch (error) {

                console.error(
                    "Error inicializando partida diaria:",
                    error
                );

                return interaction.reply({

                    content:
                        "❌ No se ha podido iniciar tu partida diaria. Inténtalo de nuevo.",

                    ephemeral: true

                });

            }

        }


        /*
         * ====================================================
         * OBTENER RACHA ACTUAL
         * ====================================================
         */

        let currentStreak = 0;

        try {

            currentStreak =
                await getUserStreak(
                    interaction.user.id
                );

        } catch (error) {

            console.error(
                "Error obteniendo racha:",
                error
            );

            currentStreak = 0;

        }


        /*
         * ====================================================
         * DATOS ACTUALES
         * ====================================================
         */

        const currentAttempts =
            Number(
                user.daily_attempts || 0
            );


        const dailySolved =
            Number(
                user.daily_solved || 0
            );


        /*
         * ====================================================
         * YA HA RESUELTO HOY
         * ====================================================
         */

        if (
            dailySolved === 1
        ) {

            return interaction.reply({

                content:
                    "✅ Ya has completado la Canción de hoy. ¡Vuelve mañana!",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * YA HA AGOTADO LOS INTENTOS
         * ====================================================
         */

        if (
            currentAttempts >= MAX_ATTEMPTS
        ) {

            return interaction.reply({

                content:
                    `💀 Ya has agotado tus ${MAX_ATTEMPTS} intentos de hoy.\n` +
                    `🎵 La canción era **${song.label}**.`,

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * OBTENER RESPUESTA
         * ====================================================
         */

        const guessOption =
            interaction.options.getString(
                "respuesta"
            );


        /*
         * ====================================================
         * SI NO HAY RESPUESTA
         * ====================================================
         */

        if (
            !guessOption
        ) {

            const attachment =
                new AttachmentBuilder(
                    audioPath
                );


            return interaction.reply({

                content:

                    `🎧 **Canción del día**\n\n` +

                    `Escucha el fragmento y adivina qué canción es.\n\n` +

                    `🎯 Intentos: **${currentAttempts}/${MAX_ATTEMPTS}**\n\n` +

                    `💡 Responde usando:\n` +

                    "`/cancion respuesta:<tu respuesta>`",

                files: [
                    attachment
                ],

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * COMPROBAR RESPUESTA
         * ====================================================
         */

        const normalizedGuess =
            normalize(
                guessOption
            );


        const found =
            song.answers.some(
                answer =>
                    normalize(answer) ===
                    normalizedGuess
            );


        const nextAttempt =
            currentAttempts + 1;


        /*
         * ====================================================
         * RESPUESTA CORRECTA
         * ====================================================
         */

        if (
            found
        ) {

            /*
             * ==================================================
             * XP BASE
             * ==================================================
             */

            const baseXp =
                getXpForAttempt(
                    nextAttempt
                );


            /*
             * ==================================================
             * APLICAR MULTIPLICADOR DE RACHA
             * ==================================================
             */

            const xpGain =
                applyStreakMultiplier(
                    baseXp,
                    currentStreak
                );


            /*
             * ==================================================
             * DAR XP
             * ==================================================
             *
             * IMPORTANTE:
             *
             * Ya NO modificamos directamente:
             *
             * xp
             * level
             *
             * addXp() se encarga de:
             *
             * - sumar XP
             * - calcular nivel
             * - sincronizar rango
             * - detectar subida de nivel
             * - enviar notificación
             *
             * ==================================================
             */

            try {

                await addXp(

                    interaction.user.id,

                    xpGain,

                    interaction.member

                );

            } catch (error) {

                console.error(
                    "Error añadiendo XP:",
                    error
                );

                return interaction.reply({

                    content:
                        "❌ Ha ocurrido un error al guardar la experiencia obtenida.",

                    ephemeral: true

                });

            }


            /*
             * ==================================================
             * GUARDAR RESULTADO DEL DIARIO
             * ==================================================
             *
             * Aquí SOLO modificamos el estado del minijuego.
             *
             * No tocamos XP ni nivel.
             *
             * ==================================================
             */

            try {

                await updateUserFields(

                    interaction.user.id,

                    {

                        daily_attempts:
                            nextAttempt,

                        daily_solved:
                            1

                    }

                );

            } catch (error) {

                console.error(
                    "Error guardando resultado correcto:",
                    error
                );

                return interaction.reply({

                    content:
                        "❌ Ha ocurrido un error al guardar tu resultado.",

                    ephemeral: true

                });

            }


            /*
             * ==================================================
             * MENSAJE DE VICTORIA
             * ==================================================
             *
             * La notificación de nivel/rango se envía desde
             * users.js -> addXp() -> nivel.js.
             *
             * Aquí solamente mostramos la XP conseguida.
             *
             * ==================================================
             */

            return interaction.reply({

                content:
                    `🎉 **${interaction.user.username}** ha acertado la canción de hoy y ha ganado **${xpGain} XP**.`,

                ephemeral: false

            });

        }


        /*
         * ====================================================
         * RESPUESTA INCORRECTA
         * ====================================================
         */

        try {

            await updateUserFields(

                interaction.user.id,

                {

                    daily_attempts:
                        nextAttempt

                }

            );

        } catch (error) {

            console.error(
                "Error guardando intento incorrecto:",
                error
            );

            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al guardar tu intento.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * ÚLTIMO INTENTO FALLADO
         * ====================================================
         */

        if (
            nextAttempt >= MAX_ATTEMPTS
        ) {

            return interaction.reply({

                content:

                    `💀 **${interaction.user.username}** ha fallado la canción de hoy.\n\n` +

                    `🎵 La canción era **${song.label}**.`,

                ephemeral: false

            });

        }


        /*
         * ====================================================
         * TODAVÍA QUEDAN INTENTOS
         * ====================================================
         */

        return interaction.reply({

            content:

                `❌ **${guessOption}** no es correcta.\n\n` +

                `🎯 Intentos: **${nextAttempt}/${MAX_ATTEMPTS}**\n` +

                `🔄 Todavía tienes **${MAX_ATTEMPTS - nextAttempt}** intento(s).`,

            ephemeral: true

        });

    }

};