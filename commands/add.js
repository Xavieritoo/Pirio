const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const {
    ensureUser,
    updateUserFields,
    getLevelFromXp
} = require("../database/users");

const {
    getLocalDateString
} = require("../database/daily-game");

const MODERATOR_ROLE_ID =
    "940712890447581194";


/*
============================================================
COMANDO /ADD
============================================================
*
* Permite a los moderadores AÑADIR a un usuario:
*
* - Racha diaria
* - XP acumulada
* - Minas extra del día
*
* La racha y la XP se suman a los valores que ya tenía
* el usuario (a diferencia de /set, que los sobrescribe).
*
* Las minas extra se suman como minas adicionales para el
* día actual (por ejemplo, 1, 2 o 5) y se reinician al día
* siguiente de forma automática.
*
* Si se modifica la XP, también se sincroniza el rango y
* se notifica una posible subida de nivel.
*
============================================================
*/

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                "add"
            )

            .setDescription(
                "Añade racha, XP y/o minas extra a un usuario."
            )


            /*
             * ====================================================
             * REQUISITO DE MODERADOR
             * ====================================================
             */

            .setDefaultMemberPermissions(
                PermissionFlagsBits.ModerateMembers
            )


            /*
             * ====================================================
             * USUARIO
             * ====================================================
             */

            .addUserOption(
                option =>

                    option
                        .setName(
                            "usuario"
                        )

                        .setDescription(
                            "Usuario al que quieres añadir."
                        )

                        .setRequired(
                            true
                        )
            )


            /*
             * ====================================================
             * RACHA
             * ====================================================
             */

            .addIntegerOption(
                option =>

                    option
                        .setName(
                            "racha"
                        )

                        .setDescription(
                            "Días de racha que quieres añadir."
                        )

                        .setMinValue(
                            1
                        )

                        .setRequired(
                            false
                        )
            )


            /*
             * ====================================================
             * XP
             * ====================================================
             */

            .addIntegerOption(
                option =>

                    option
                        .setName(
                            "xp"
                        )

                        .setDescription(
                            "Cantidad de XP que quieres añadir."
                        )

                        .setMinValue(
                            1
                        )

                        .setRequired(
                            false
                        )
            )


            /*
             * ====================================================
             * MINAS EXTRA
             * ====================================================
             */

            .addIntegerOption(
                option =>

                    option
                        .setName(
                            "minas"
                        )

                        .setDescription(
                            "Minas extra que quieres añadir para hoy."
                        )

                        .setMinValue(
                            1
                        )

                        .setRequired(
                            false
                        )
            ),


    async execute(
        interaction
    ) {
/*
         * ========================================================
         * COMPROBAR PERMISOS
         * ========================================================
         */

        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.ModerateMembers
            )
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes permisos para utilizar este comando.",

                ephemeral: true

            });

        }


        /*
         * ========================================================
         * COMPROBAR ROL DE MODERADOR
         * ========================================================
         *
         * El comando solo puede usarlo el rol de moderadores,
         * independientemente de los permisos que tenga el usuario.
         */

        if (
            !interaction.member.roles.cache.has(
                MODERATOR_ROLE_ID
            )
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes permisos para utilizar este comando.",

                ephemeral: true

            });

        }


        /*
         * ========================================================
         * OBTENER OPCIONES
         * ========================================================
         */

        const targetUser =
            interaction.options.getUser(
                "usuario"
            );


        const streakToAdd =
            interaction.options.getInteger(
                "racha"
            );


        const xpToAdd =
            interaction.options.getInteger(
                "xp"
            );


        const minesToAdd =
            interaction.options.getInteger(
                "minas"
            );


        /*
         * ========================================================
         * COMPROBAR QUE SE HAYA INDICADO ALGO
         * ========================================================
         */

        if (
            streakToAdd === null &&
            xpToAdd === null &&
            minesToAdd === null
        ) {

            return interaction.reply({

                content:
                    "❌ Debes indicar al menos una opción: **racha**, **xp** o **minas**.",

                ephemeral: true

            });

        }


        /*
         * ========================================================
         * ASEGURAR USUARIO
         * ========================================================
         */

        let user;

        const targetMember =
            xpToAdd !== null
                ? await interaction.guild
                    ?.members
                    .fetch(
                        targetUser.id
                    )
                    .catch(
                        () => null
                    )
                : null;


        try {

            user =
                await ensureUser(

                    targetUser.id,

                    targetUser.tag

                );

        } catch (error) {

            console.error(
                "Error obteniendo usuario para /add:",
                error
            );


            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al cargar el usuario.",

                ephemeral: true

            });

        }
/*
         * ========================================================
         * PREPARAR CAMBIOS
         * ========================================================
         */

        const fields = {};


        /*
         * ========================================================
         * AÑADIR RACHA
         * ========================================================
         */

        if (
            streakToAdd !== null
        ) {

            const currentStreak =
                Number(
                    user.daily_streak || 0
                );


            fields.daily_streak =
                currentStreak + streakToAdd;


            /*
             * Guardamos también la fecha actual
             * para que la racha quede activa.
             */

            fields.streak_last_date =
                getLocalDateString();

        }


        /*
         * ========================================================
         * AÑADIR XP
         * ========================================================
         */

        let newLevel = null;


        if (
            xpToAdd !== null
        ) {

            const currentXp =
                Number(
                    user.xp || 0
                );


            const newXp =
                currentXp + xpToAdd;


            /*
             * Calculamos el nivel real correspondiente
             * a la nueva XP.
             */

            newLevel =
                getLevelFromXp(
                    newXp
                );


            fields.xp =
                newXp;


            fields.level =
                newLevel;

        }


        /*
         * ========================================================
         * AÑADIR MINAS EXTRA
         * ========================================================
         *
         * Las minas extra se guardan junto a la fecha de hoy.
         * Si ya se añadieron hoy, se suman a las anteriores;
         * si es un día nuevo, se parte desde 0.
         */

        if (
            minesToAdd !== null
        ) {

            const today =
                getLocalDateString();


            const currentBonusMines =
                String(user.bonus_mines_date || "") === today
                    ? Number(user.bonus_mines || 0)
                    : 0;


            fields.bonus_mines =
                currentBonusMines + minesToAdd;


            fields.bonus_mines_date =
                today;

        }


        /*
         * ========================================================
         * ACTUALIZAR BASE DE DATOS
         * ========================================================
         */

        try {

            await updateUserFields(

                targetUser.id,

                fields,

                targetMember

            );

        } catch (error) {

            console.error(
                "Error actualizando usuario mediante /add:",
                error
            );


            return interaction.reply({

                content:
                    "❌ Ha ocurrido un error al actualizar el usuario.",

                ephemeral: true

            });

        }


        /*
         * ========================================================
         * RANGO Y NOTIFICACIÓN DE NIVEL
         * ========================================================
         *
         * updateUserFields() recibe targetMember y se encarga
         * de sincronizar el rango y notificar una subida de nivel.
         */

        /*
         * ========================================================
         * CREAR RESPUESTA
         * ========================================================
         */

        const changes = [];


        /*
         * RACHA
         */

        if (
            streakToAdd !== null
        ) {

            changes.push(
                `➕ Racha: **+${streakToAdd} días** ` +

                `(${Number(user.daily_streak || 0)} → ${fields.daily_streak})`
            );

        }


        /*
         * XP
         */

        if (
            xpToAdd !== null
        ) {

            changes.push(
                `✨ XP: **+${xpToAdd.toLocaleString("es-ES")} XP** ` +

                `(${Number(user.xp || 0).toLocaleString("es-ES")} → ` +

                `${fields.xp.toLocaleString("es-ES")} XP)`
            );


            changes.push(
                `📈 Nivel: **${newLevel}**`
            );

        }


        /*
         * MINAS EXTRA
         */

        if (
            minesToAdd !== null
        ) {

            changes.push(
                `⛏️ Minas extra: **+${minesToAdd}** ` +

                `para hoy (total: **${fields.bonus_mines}**)`
            );

        }


        /*
         * ========================================================
         * RESPUESTA
         * ========================================================
         */

        return interaction.reply({

            content:

                `✅ Se han añadido los cambios a ` +

                `**${targetUser.username}**.\\n\\n` +

                changes.join(
                    "\\n"
                ),

            ephemeral: false

        });

    }

};