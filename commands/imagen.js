const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const path = require("path");
const fs = require("fs");

const {
    ensureUser,
    updateUserFields
} = require("../database/users");

const {
    getImageForDate
} = require("../database/images");

const {
    getDailyCommandName,
    getLocalDateString
} = require("../database/daily-game");

const {
    registerDailyGame,
    getStreakMultiplier
} = require("../database/streaks");


const MAX_ATTEMPTS = 3;


/*
 * ============================================================
 * IMÁGENES DEL MINIJUEGO
 * ============================================================
 */

const IMAGES = [

    {
        file: "minecraft.png",
        pixel: "minecraftpx.png",
        answers: [
            "minecraft"
        ],
        label: "Minecraft"
    },

    {
        file: "gta5.png",
        pixel: "gta5px.png",
        answers: [
            "gta 5",
            "gta v",
            "grand theft auto 5",
            "grand theft auto v",
            "gta5"
        ],
        label: "Grand Theft Auto V"
    },

    {
        file: "fortnite.png",
        pixel: "fortnitepx.png",
        answers: [
            "fortnite"
        ],
        label: "Fortnite"
    },

    {
        file: "mariokart8.png",
        pixel: "mariokart8px.png",
        answers: [
            "mario kart",
            "mario kart 8",
            "mario kart 8 deluxe"
        ],
        label: "Mario Kart 8"
    },

    {
        file: "valorant.png",
        pixel: "valorantpx.png",
        answers: [
            "valorant"
        ],
        label: "Valorant"
    },

    {
        file: "lethalcompany.png",
        pixel: "lethalcompanypx.png",
        answers: [
            "lethal company"
        ],
        label: "Lethal Company"
    },

    {
        file: "repo.png",
        pixel: "repopx.png",
        answers: [
            "repo",
            "r.e.p.o",
            "r e p o"
        ],
        label: "R.E.P.O."
    },

    {
        file: "gangbeasts.png",
        pixel: "gangbeastspx.png",
        answers: [
            "gang beasts",
            "gang beast"
        ],
        label: "Gang Beasts"
    },

    {
        file: "mechachameleon.png",
        pixel: "mechachameleonpx.png",
        answers: [
            "mecha chameleon",
            "meccha chameleon"
        ],
        label: "Meccha Chameleon"
    },

    {
        file: "counterstrike2.png",
        pixel: "counterstrike2px.png",
        answers: [
            "counter strike 2",
            "counter-strike 2",
            "counter strike",
            "cs2",
            "cs 2"
        ],
        label: "Counter-Strike 2"
    },

    {
        file: "fallguys.png",
        pixel: "fallguyspx.png",
        answers: [
            "fall guys",
            "fallguys"
        ],
        label: "Fall Guys"
    },

    {
        file: "warzone.png",
        pixel: "warzonepx.png",
        answers: [
            "call of duty warzone",
            "call of duty: warzone",
            "cod warzone",
            "warzone"
        ],
        label: "Call of Duty: Warzone"
    },

    {
        file: "fifa.png",
        pixel: "fifapx.png",
        answers: [
            "fifa",
            "fifa 26",
            "fifa 2026"
        ],
        label: "FIFA"
    },

    {
        file: "zelda_botw.png",
        pixel: "zelda_botwpx.png",
        answers: [
            "zelda",
            "breath of the wild",
            "zelda breath of the wild",
            "the legend of zelda breath of the wild"
        ],
        label: "The Legend of Zelda: Breath of the Wild"
    },

    {
        file: "supermariobros.png",
        pixel: "supermariobrospx.png",
        answers: [
            "super mario bros",
            "super mario"
        ],
        label: "Super Mario Bros."
    },

    {
        file: "pokemonrojo.png",
        pixel: "pokemonrojopx.png",
        answers: [
            "pokemon rojo",
            "pokemon red",
            "pokemon rojo fuego"
        ],
        label: "Pokémon Rojo"
    },

    {
        file: "pokemonazul.png",
        pixel: "pokemonazulpx.png",
        answers: [
            "pokemon azul",
            "pokemon blue"
        ],
        label: "Pokémon Azul"
    },

    {
        file: "pokemonesmeralda.png",
        pixel: "pokemonesmeraldapx.png",
        answers: [
            "pokemon esmeralda",
            "pokemon emerald"
        ],
        label: "Pokémon Esmeralda"
    },

    {
        file: "pokemonplatino.png",
        pixel: "pokemonplatinopx.png",
        answers: [
            "pokemon platino",
            "pokemon platinum"
        ],
        label: "Pokémon Platino"
    },

    {
        file: "amongus.png",
        pixel: "amonguspx.png",
        answers: [
            "among us",
            "amongus"
        ],
        label: "Among Us"
    },

    {
        file: "leagueoflegends.png",
        pixel: "leagueoflegendspx.png",
        answers: [
            "league of legends",
            "league",
            "lol"
        ],
        label: "League of Legends"
    },

    {
        file: "reddeadredemption2.png",
        pixel: "reddeadredemption2px.png",
        answers: [
            "red dead redemption 2",
            "red dead redemption ii",
            "rdr2",
            "rdr 2"
        ],
        label: "Red Dead Redemption 2"
    },

    {
        file: "thewitcher3.png",
        pixel: "thewitcher3px.png",
        answers: [
            "the witcher 3",
            "witcher 3",
            "the witcher"
        ],
        label: "The Witcher 3"
    },

    {
        file: "godofwar.png",
        pixel: "godofwarpx.png",
        answers: [
            "god of war",
            "godofwar"
        ],
        label: "God of War"
    },

    {
        file: "eldenring.png",
        pixel: "eldenringpx.png",
        answers: [
            "elden ring",
            "eldenring"
        ],
        label: "Elden Ring"
    },

    {
        file: "darksouls.png",
        pixel: "darksoulspx.png",
        answers: [
            "dark souls",
            "darksouls",
            "dark souls 3",
            "darksouls 3"
        ],
        label: "Dark Souls"
    },

    {
        file: "residentevil4.png",
        pixel: "residentevil4px.png",
        answers: [
            "resident evil 4",
            "resident evil 4 remake",
            "re4"
        ],
        label: "Resident Evil 4"
    },

    {
        file: "assassinscreed.png",
        pixel: "assassinscreedpx.png",
        answers: [
            "assassins creed",
            "assassin's creed",
            "assassins creed unity",
            "assassin's creed unity",
            "ac unity"
        ],
        label: "Assassin's Creed II"
    },

    {
        file: "rocketleague.png",
        pixel: "rocketleaguepx.png",
        answers: [
            "rocket league",
            "rocketleague"
        ],
        label: "Rocket League"
    },

    {
        file: "overwatch2.png",
        pixel: "overwatch2px.png",
        answers: [
            "overwatch 2",
            "overwatch",
            "ow2"
        ],
        label: "Overwatch 2"
    },

    {
        file: "terraria.png",
        pixel: "terrariapx.png",
        answers: [
            "terraria"
        ],
        label: "Terraria"
    },

    {
        file: "roblox.png",
        pixel: "robloxpx.png",
        answers: [
            "roblox"
        ],
        label: "Roblox"
    },

    {
        file: "thelastofus.png",
        pixel: "thelastofuspx.png",
        answers: [
            "the last of us",
            "last of us",
            "tlou"
        ],
        label: "The Last of Us"
    },

    {
        file: "skyrim.png",
        pixel: "skyrimpx.png",
        answers: [
            "skyrim",
            "the elder scrolls v skyrim",
            "elder scrolls skyrim"
        ],
        label: "The Elder Scrolls V: Skyrim"
    },

    {
        file: "halo.png",
        pixel: "halopx.png",
        answers: [
            "halo 4",
            "halo"
        ],
        label: "Halo"
    },

    {
        file: "needforspeedmostwanted.png",
        pixel: "needforspeedmostwantedpx.png",
        answers: [
            "need for speed most wanted",
            "nfs most wanted",
            "need for speed",
            "most wanted"
        ],
        label: "Need for Speed: Most Wanted"
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
 * XP SEGÚN EL INTENTO
 * ============================================================
 */

function getXpForAttempt(attempt) {

    return Math.max(
        100,
        700 - attempt * 50
    );

}


/*
 * ============================================================
 * RUTA IMAGEN ORIGINAL
 * ============================================================
 */

function getImagePath(image) {

    return path.join(
        __dirname,
        "..",
        "images",
        image.file
    );

}


/*
 * ============================================================
 * RUTA IMAGEN PIXELADA
 * ============================================================
 */

function getPixelImagePath(image) {

    return path.join(
        __dirname,
        "..",
        "images",
        image.pixel
    );

}


/*
 * ============================================================
 * ATTACHMENT IMAGEN PIXELADA
 * ============================================================
 */

function generatePixelImageAttachment(image) {

    const pixelPath =
        getPixelImagePath(image);

    if (!fs.existsSync(pixelPath)) {

        throw new Error(
            `No se encontró la imagen pixelada: ${pixelPath}`
        );

    }

    return new AttachmentBuilder(
        pixelPath
    );

}


/*
 * ============================================================
 * ATTACHMENT IMAGEN ORIGINAL
 * ============================================================
 */

function generateOriginalImageAttachment(image) {

    const imagePath =
        getImagePath(image);

    if (!fs.existsSync(imagePath)) {

        throw new Error(
            `No se encontró la imagen original: ${imagePath}`
        );

    }

    return new AttachmentBuilder(
        imagePath
    );

}


module.exports = {

    data: new SlashCommandBuilder()

        .setName("imagen")

        .setDescription(
            "Adivina qué videojuego aparece en la imagen"
        )

        .addStringOption(option =>
            option
                .setName("respuesta")
                .setDescription(
                    "Tu respuesta"
                )
                .setRequired(false)
        ),


    /*
     * ==========================================================
     * EJECUTAR IMAGEN
     * ==========================================================
     */

    async execute(interaction) {

        /*
         * ------------------------------------------------------
         * COMPROBAR SI HOY TOCA IMAGEN
         * ------------------------------------------------------
         */

        const dailyCommand =
            getDailyCommandName();

        if (dailyCommand !== "imagen") {

            return interaction.reply({

                content:
                    "❌ Hoy el minijuego diario no es Imagen. Usa `/diario` para saber cuál toca hoy.",

                ephemeral: true

            });

        }


        /*
         * ------------------------------------------------------
         * FECHA ACTUAL
         * ------------------------------------------------------
         */

        const today =
            getLocalDateString();


        /*
         * ------------------------------------------------------
         * OBTENER IMAGEN DEL DÍA
         * ------------------------------------------------------
         */

        const image =
            await getImageForDate(
                today,
                IMAGES
            );

        if (!image) {

            console.error(
                `No se pudo obtener una imagen para ${today}.`
            );

            return interaction.reply({

                content:
                    "❌ No se ha podido seleccionar la imagen de hoy.",

                ephemeral: true

            });

        }


        /*
         * ------------------------------------------------------
         * COMPROBAR IMAGEN ORIGINAL
         * ------------------------------------------------------
         */

        const imagePath =
            getImagePath(image);

        if (!fs.existsSync(imagePath)) {

            console.error(
                `No se encontró la imagen original: ${imagePath}`
            );

            return interaction.reply({

                content:
                    "❌ La imagen original del minijuego no está disponible.",

                ephemeral: true

            });

        }


        /*
         * ------------------------------------------------------
         * COMPROBAR IMAGEN PIXELADA
         * ------------------------------------------------------
         */

        const pixelImagePath =
            getPixelImagePath(image);

        if (!fs.existsSync(pixelImagePath)) {

            console.error(
                `No se encontró la imagen pixelada: ${pixelImagePath}`
            );

            return interaction.reply({

                content:
                    "❌ La imagen pixelada del minijuego no está disponible.",

                ephemeral: true

            });

        }


        /*
         * ------------------------------------------------------
         * OBTENER USUARIO
         * ------------------------------------------------------
         */

        const user =
            await ensureUser(
                interaction.user.id,
                interaction.user.tag
            );


        /*
         * ======================================================
         * REINICIAR DATOS SI ES UN NUEVO DÍA
         * ======================================================
         */

        const lastDailyDate =
            user.last_daily_date
                ? String(user.last_daily_date)
                : null;


        if (lastDailyDate !== today) {

            await updateUserFields(

                interaction.user.id,

                {
                    daily_attempts: 0,
                    daily_solved: 0,
                    last_daily_date: today
                },

                interaction.member

            );

            user.daily_attempts = 0;
            user.daily_solved = 0;
            user.last_daily_date = today;

        }


        /*
         * ======================================================
         * DATOS ACTUALES
         * ======================================================
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
         * ======================================================
         * JUEGO YA TERMINADO
         * ======================================================
         */

        if (
            dailySolved === 1 ||
            currentAttempts >= MAX_ATTEMPTS
        ) {

            return interaction.reply({

                content:
                    "✅ Ya has completado la Imagen de hoy. ¡Vuelve mañana!",

                ephemeral: true

            });

        }


        /*
         * ------------------------------------------------------
         * REGISTRAR PARTIDA EN LA RACHA
         * ------------------------------------------------------
         *
         * Esto se hace antes de calcular el multiplicador
         * para que la partida de hoy utilice la racha resultante.
         *
         * ------------------------------------------------------
         */

        const streakData =
            await registerDailyGame(
                interaction.user.id
            );


        /*
         * ======================================================
         * MULTIPLICADOR DE RACHA
         * ======================================================
         *
         * Se calcula internamente.
         *
         * NO se muestra al usuario.
         *
         * ======================================================
         */

        const streakMultiplier =
            getStreakMultiplier(
                streakData.streak
            );


        /*
         * ------------------------------------------------------
         * OBTENER RESPUESTA
         * ------------------------------------------------------
         */

        const guessOption =
            interaction.options.getString(
                "respuesta"
            );


        /*
         * ======================================================
         * SIN RESPUESTA
         * ======================================================
         */

        if (!guessOption) {

            try {

                const attachment =
                    generatePixelImageAttachment(
                        image
                    );

                return interaction.reply({

                    content:
                        `🖼️ **¿Qué videojuego es?**\n\n` +
                        `Adivina qué aparece en la imagen.\n\n` +
                        `🎯 Intentos: **${currentAttempts}/${MAX_ATTEMPTS}**\n\n` +
                        `💡 Responde usando:\n` +
                        "`/imagen respuesta:<tu respuesta>`",

                    files: [
                        attachment
                    ],

                    ephemeral: true

                });

            } catch (error) {

                console.error(
                    "Error mostrando imagen pixelada:",
                    error
                );

                return interaction.reply({

                    content:
                        "❌ No se ha podido mostrar la imagen pixelada.",

                    ephemeral: true

                });

            }

        }


        /*
         * ======================================================
         * NORMALIZAR RESPUESTA
         * ======================================================
         */

        const normalizedGuess =
            normalize(
                guessOption
            );


        /*
         * ======================================================
         * COMPROBAR RESPUESTA
         * ======================================================
         */

        const found =
            image.answers.some(

                answer =>
                    normalize(answer) ===
                    normalizedGuess

            );


        /*
         * ======================================================
         * CONSUMIR INTENTO
         * ======================================================
         */

        const nextAttempt =
            currentAttempts + 1;


        /*
         * ======================================================
         * RESPUESTA CORRECTA
         * ======================================================
         */

        if (found) {

            /*
             * --------------------------------------------------
             * XP BASE
             * --------------------------------------------------
             */

            const baseXp =
                getXpForAttempt(
                    nextAttempt
                );


            /*
             * --------------------------------------------------
             * XP FINAL CON MULTIPLICADOR
             * --------------------------------------------------
             *
             * El multiplicador se aplica internamente.
             *
             * El usuario solo verá xpGain.
             *
             * --------------------------------------------------
             */

            const xpGain =
                Math.floor(
                    baseXp *
                    streakMultiplier
                );


            /*
             * --------------------------------------------------
             * CALCULAR XP TOTAL
             * --------------------------------------------------
             */

            const totalXp =
                Number(user.xp || 0) +
                xpGain;


            /*
             * --------------------------------------------------
             * CALCULAR NIVEL
             * --------------------------------------------------
             */

            const nextLevel =
                Math.floor(
                    totalXp / 1000
                ) + 1;


            /*
             * --------------------------------------------------
             * GUARDAR DATOS
             * --------------------------------------------------
             */

            await updateUserFields(

                interaction.user.id,

                {

                    daily_attempts:
                        nextAttempt,

                    daily_solved:
                        1,

                    xp:
                        totalXp,

                    level:
                        nextLevel,

                    wins:
                        Number(
                            user.wins || 0
                        ) + 1

                },

                interaction.member

            );


            /*
             * --------------------------------------------------
             * MENSAJE PÚBLICO
             * --------------------------------------------------
             *
             * SOLO mostramos los XP finales.
             *
             * --------------------------------------------------
             */

            await interaction.reply({

                content:
                    `🎉 **${interaction.user.username}** ha ganado la Imagen de hoy y ha conseguido **${xpGain} XP**.`,

                ephemeral: false

            });


            /*
             * --------------------------------------------------
             * IMAGEN ORIGINAL PRIVADA
             * --------------------------------------------------
             */

            try {

                const originalAttachment =
                    generateOriginalImageAttachment(
                        image
                    );

                return interaction.followUp({

                    content:
                        "🎮 **¡Correcto!** Esta era la imagen original:",

                    files: [
                        originalAttachment
                    ],

                    ephemeral: true

                });

            } catch (error) {

                console.error(
                    "Error enviando imagen original:",
                    error
                );

                return interaction.followUp({

                    content:
                        "🎉 ¡Has acertado! No se pudo mostrar la imagen original.",

                    ephemeral: true

                });

            }

        }


        /*
         * ======================================================
         * RESPUESTA INCORRECTA
         * ======================================================
         */

        if (
            nextAttempt >= MAX_ATTEMPTS
        ) {

            await updateUserFields(

                interaction.user.id,

                {

                    daily_attempts:
                        MAX_ATTEMPTS,

                    daily_solved:
                        1,

                    last_daily_date:
                        today

                }

            );


            /*
             * --------------------------------------------------
             * MENSAJE PÚBLICO
             * --------------------------------------------------
             */

            await interaction.reply({

                content:
                    `💀 **${interaction.user.username}** ha perdido la Imagen de hoy.`,

                ephemeral: false

            });


            /*
             * --------------------------------------------------
             * IMAGEN ORIGINAL PRIVADA
             * --------------------------------------------------
             */

            try {

                const originalAttachment =
                    generateOriginalImageAttachment(
                        image
                    );

                return interaction.followUp({

                    content:
                        "💀 **Has fallado los 3 intentos.** Esta era la imagen original:",

                    files: [
                        originalAttachment
                    ],

                    ephemeral: true

                });

            } catch (error) {

                console.error(
                    "Error enviando imagen original:",
                    error
                );

                return interaction.followUp({

                    content:
                        "💀 Has fallado los 3 intentos. No se pudo mostrar la imagen original.",

                    ephemeral: true

                });

            }

        }


        /*
         * ======================================================
         * TODAVÍA QUEDAN INTENTOS
         * ======================================================
         */

        await updateUserFields(

            interaction.user.id,

            {

                daily_attempts:
                    nextAttempt

            }

        );


        /*
         * ------------------------------------------------------
         * MOSTRAR DE NUEVO LA IMAGEN PIXELADA
         * ------------------------------------------------------
         */

        try {

            const attachment =
                generatePixelImageAttachment(
                    image
                );

            return interaction.reply({

                content:
                    `❌ **${guessOption}** no es correcto.\n\n` +
                    `🎯 Intentos: **${nextAttempt}/${MAX_ATTEMPTS}**\n` +
                    `🔄 Te quedan **${MAX_ATTEMPTS - nextAttempt}** intento(s).`,

                files: [
                    attachment
                ],

                ephemeral: true

            });

        } catch (error) {

            console.error(
                "Error mostrando imagen pixelada:",
                error
            );

            return interaction.reply({

                content:
                    `❌ **${guessOption}** no es correcto.\n\n` +
                    `🎯 Intentos: **${nextAttempt}/${MAX_ATTEMPTS}**\n` +
                    `🔄 Te quedan **${MAX_ATTEMPTS - nextAttempt}** intento(s).`,

                ephemeral: true

            });

        }

    }

};
