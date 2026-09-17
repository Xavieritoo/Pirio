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
COMANDO /REMOVE
============================================================
*
* Permite a los moderadores RESTAR a un usuario:
*
* - Racha diaria
* - XP acumulada
*
* La racha y la XP se restan a los valores que ya tenía
* el usuario (a diferencia de /set, que los sobrescribe).
*
* Ni la racha ni la XP pueden quedar por debajo de 0.
*
* Si se modifica la XP, también se sincroniza el rango y
* se detecta una posible bajada de nivel.
*
============================================================
*/

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                "remove"
            )

            .setDescription(
                "Resta racha y/o XP a un usuario."
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
                            "Usuario al que quieres restar."
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
                            "Días de racha que quieres restar."
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
                            "Cantidad de XP que quieres restar."
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


        const streakToRemove =
            interaction.options.getInteger(
                "racha"
            );


        const xpToRemove =
            interaction.options.getInteger(
                "xp"
            );


        /*
         * ========================================================
         * COMPROBAR QUE SE HAYA INDICADO ALGO
         * ========================================================
         */

        if (
            streakToRemove === null &&
            xpToRemove === null
        ) {

            return interaction.reply({

                content:
                    "❌ Debes indicar al menos una opción: **racha** o **xp**.",

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
            xpToRemove !== null
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
                "Error obteniendo usuario para /remove:",
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
         * RESTAR RACHA
         * ========================================================
         */

        if (
            streakToRemove !== null
        ) {

            const currentStreak =
                Number(
                    user.daily_streak || 0
                );


            /*
             * La racha nunca puede quedar por debajo de 0.
             */

            fields.daily_streak =
                Math.max(
                    0,
                    currentStreak - streakToRemove
                );


            /*
             * Guardamos también la fecha actual
             * para que la racha quede activa.
             */

            fields.streak_last_date =
                getLocalDateString();

        }


        /*
         * ========================================================
         * RESTAR XP
         * ========================================================
         */

        let newLevel = null;


        if (
            xpToRemove !== null
        ) {

            const currentXp =
                Number(
                    user.xp || 0
                );


            /*
             * updateUserFields() ya se encarga de que la XP
             * no quede por debajo de 0 y de recalcular el nivel.
             */

            const newXp =
                Math.max(
                    0,
                    currentXp - xpToRemove
                );


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
                "Error actualizando usuario mediante /remove:",
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
         * de sincronizar el rango y detectar una bajada de nivel.
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
            streakToRemove !== null
        ) {

            changes.push(
                `➖ Racha: **-${streakToRemove} días** ` +

                `(${Number(user.daily_streak || 0)} → ${fields.daily_streak})`
            );

        }


        /*
         * XP
         */

        if (
            xpToRemove !== null
        ) {

            changes.push(
                `✨ XP: **-${xpToRemove.toLocaleString("es-ES")} XP** ` +

                `(${Number(user.xp || 0).toLocaleString("es-ES")} → ` +

                `${fields.xp.toLocaleString("es-ES")} XP)`
            );


            changes.push(
                `📉 Nivel: **${newLevel}**`
            );

        }


        /*
         * ========================================================
         * RESPUESTA
         * ========================================================
         */

        return interaction.reply({

            content:

                `✅ Se han restado puntos a ` +

                `**${targetUser.username}**.\\n\\n` +

                changes.join(
                    "\\n"
                ),

            ephemeral: false

        });

    }

};