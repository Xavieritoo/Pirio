const {
    getLevelRole
} = require("./rango");


/*
============================================================
CONFIGURACIÓN
============================================================
*/

const LEVEL_CHANNEL_ID =
    "1063373041746333736";


/*
============================================================
NOTIFICAR SUBIDA DE NIVEL
============================================================
*/

async function notifyLevelUp(
    member,
    oldLevel,
    newLevel
) {

    /*
     * No hacemos nada si no hay miembro.
     */

    if (
        !member
    ) {

        return;

    }


    /*
     * Solo notificamos si realmente ha subido
     * de nivel.
     */

    if (
        newLevel <= oldLevel
    ) {

        return;

    }


    /*
     * Obtener el canal de niveles.
     */

    let channel = null;


    try {

        channel =
            await member.guild.channels.fetch(
                LEVEL_CHANNEL_ID
            );

    } catch (error) {

        console.error(
            "Error obteniendo el canal de niveles:",
            error
        );

        return;

    }


    /*
     * Comprobar que el canal existe
     * y permite enviar mensajes.
     */

    if (
        !channel ||
        !channel.isTextBased()
    ) {

        console.error(
            `El canal de niveles ${LEVEL_CHANNEL_ID} no existe o no es un canal de texto.`
        );

        return;

    }


    /*
     * ========================================================
     * COMPROBAR SI HA CONSEGUIDO UN NUEVO RANGO
     * ========================================================
     *
     * getLevelRole(newLevel) devuelve el rango que
     * corresponde al nivel actual.
     *
     * getLevelRole(oldLevel) devuelve el rango anterior.
     *
     * Si son diferentes, significa que acaba de
     * alcanzar un nuevo rango.
     *
     * ========================================================
     */

    const oldRole =
        getLevelRole(
            oldLevel
        );


    const newRole =
        getLevelRole(
            newLevel
        );


    const hasNewRank =
        newRole &&
        (
            !oldRole ||
            oldRole.roleId !== newRole.roleId
        );


    /*
     * ========================================================
     * MENSAJE
     * ========================================================
     */

    let message;


    if (
        hasNewRank
    ) {

        /*
         * Obtenemos el rol de Discord para mostrar su nombre,
         * nunca su identificador interno.
         */

        const discordRole =
            member.guild.roles.cache.get(
                newRole.roleId
            ) ||
            await member.guild.roles.fetch(
                newRole.roleId
            ).catch(
                () => null
            );


        const roleName =
            discordRole?.name ||
            "un nuevo rango";

        /*
         * Ha subido de nivel Y ha conseguido
         * un nuevo rango.
         */

        message =
            `🎉 ¡Enhorabuena <@${member.id}>! Has subido al **nivel ${newLevel}** y has conseguido el rango **${roleName}**. 🏆`;

    } else {

        /*
         * Solo ha subido de nivel.
         */

        message =
            `🎉 ¡Enhorabuena <@${member.id}>! Has subido al **nivel ${newLevel}**. ✨`;

    }


    /*
     * ========================================================
     * ENVIAR MENSAJE
     * ========================================================
     */

    try {

        await channel.send(
            message
        );

    } catch (error) {

        console.error(
            "Error enviando notificación de subida de nivel:",
            error
        );

    }

}


module.exports = {

    notifyLevelUp

};
