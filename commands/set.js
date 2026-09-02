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
COMANDO /SET
============================================================
*
* Permite a los moderadores modificar:
*
* - Racha diaria
* - XP acumulada
*
* Si se modifica la XP, también se actualiza automáticamente
* el rango de Discord correspondiente al nuevo nivel.
*
============================================================
*/

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                "set"
            )

            .setDescription(
                "Establece manualmente la racha y/o XP de un usuario."
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
                            "Usuario al que quieres modificar."
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
                            "Número de días de racha que quieres establecer."
                        )

                        .setMinValue(
                            0
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
                            "Cantidad de XP acumulada que quieres establecer."
                        )

                        .setMinValue(
                            0
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


        const streak =
            interaction.options.getInteger(
                "racha"
            );


        const xp =
            interaction.options.getInteger(
                "xp"
            );


        /*
         * ========================================================
         * COMPROBAR QUE SE HAYA INDICADO ALGO
         * ========================================================
         */

        if (
            streak === null &&
            xp === null
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
            xp !== null
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
                "Error obteniendo usuario para /set:",
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
         * CAMBIAR RACHA
         * ========================================================
         */

        if (
            streak !== null
        ) {

            fields.daily_streak =
                streak;


            /*
             * Guardamos también la fecha actual
             * para que la racha quede activa.
             */

            fields.streak_last_date =
                getLocalDateString();

        }


        /*
         * ========================================================
         * CAMBIAR XP
         * ========================================================
         */

        let newLevel = null;


        if (
            xp !== null
        ) {

            /*
             * Calculamos el nivel real correspondiente
             * a la XP establecida.
             */

            newLevel =
                getLevelFromXp(
                    xp
                );


            fields.xp =
                xp;


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
                "Error actualizando usuario mediante /set:",
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
         *
         * Ejemplo:
         *
         * 0 XP
         * ↓
         * /set xp:10000
         * ↓
         * Nivel 10
         * ↓
         * Se añade el rango de nivel 10 y se envía la notificación.
         *
         * ========================================================
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
            streak !== null
        ) {

            changes.push(

                `🔥 Racha: **${streak} días**`

            );

        }


        /*
         * XP
         */

        if (
            xp !== null
        ) {

            changes.push(

                `✨ XP: **${xp.toLocaleString("es-ES")} XP**`

            );


            changes.push(

                `📈 Nivel: **${newLevel}**`

            );

        }


        /*
         * ========================================================
         * RESPUESTA
         * ========================================================
         */

        return interaction.reply({

            content:

                `✅ Se han actualizado los datos de ` +

                `**${targetUser.username}**.\n\n` +

                changes.join(
                    "\n"
                ),

            ephemeral: false

        });

    }

};
