/*
============================================================
CONFIGURACIÓN DE RANGOS
============================================================
*/

/*
 * Cada rango se consigue al alcanzar ese nivel.
 *
 * El sistema buscará el rango más alto cuyo nivel
 * sea menor o igual al nivel del usuario.
 */

const LEVEL_ROLES = [

    {
        level: 10,
        roleId: "1543285488805482606"
    },

    {
        level: 30,
        roleId: "1543286996536131664"
    },

    {
        level: 60,
        roleId: "1063198148924805130"
    },

    {
        level: 100,
        roleId: "1543290609727701002"
    }

];


/*
============================================================
OBTENER RANGO CORRESPONDIENTE AL NIVEL
============================================================
*/

function getLevelRole(level) {

    const userLevel =
        Number(level || 1);


    /*
     * Buscamos el rango más alto que el usuario
     * pueda tener según su nivel.
     */

    let selectedRole =
        null;


    for (
        const levelRole of LEVEL_ROLES
    ) {

        if (
            userLevel >= levelRole.level
        ) {

            selectedRole =
                levelRole;

        }

    }


    return selectedRole;

}


/*
============================================================
SINCRONIZAR RANGO DEL USUARIO
============================================================
*/

async function syncLevelRole(
    member,
    level
) {

    /*
     * Si no existe el miembro,
     * no hacemos nada.
     */

    if (
        !member
    ) {

        return null;

    }


    /*
     * ========================================================
     * OBTENER RANGO CORRESPONDIENTE
     * ========================================================
     */

    const selectedRole =
        getLevelRole(
            level
        );


    /*
     * ========================================================
     * TODOS LOS ROLES ADMINISTRADOS
     * ========================================================
     */

    const managedRoleIds =
        LEVEL_ROLES.map(
            role =>
                role.roleId
        );


    /*
     * ========================================================
     * QUITAR RANGOS ANTERIORES
     * ========================================================
     *
     * Solo quitamos los rangos administrados por este sistema
     * que NO sean el rango que corresponde actualmente.
     */

    for (
        const roleId of managedRoleIds
    ) {

        /*
         * Si no tiene este rol,
         * no hacemos nada.
         */

        if (
            !member.roles.cache.has(
                roleId
            )
        ) {

            continue;

        }


        /*
         * Si este es exactamente el rango que corresponde,
         * lo dejamos puesto.
         */

        if (
            selectedRole &&
            roleId === selectedRole.roleId
        ) {

            continue;

        }


        /*
         * Quitar rango anterior.
         */

        try {

            await member.roles.remove(
                roleId
            );

        } catch (error) {

            console.error(
                `Error quitando el rol ${roleId}: `,
                error
            );

        }

    }


    /*
     * ========================================================
     * SI NO HA LLEGADO AL NIVEL 10
     * ========================================================
     */

    if (
        !selectedRole
    ) {

        return null;

    }


    /*
     * ========================================================
     * AÑADIR RANGO
     * ========================================================
     */

    /*
     * Si ya tiene el rango correcto,
     * no hacemos ninguna llamada a Discord.
     */

    if (
        member.roles.cache.has(
            selectedRole.roleId
        )
    ) {

        return (
            member.guild.roles.cache.get(
                selectedRole.roleId
            ) ||
            null
        );

    }


    /*
     * Añadir nuevo rango.
     */

    try {

        await member.roles.add(
            selectedRole.roleId
        );

    } catch (error) {

        console.error(
            `Error añadiendo el rol ${selectedRole.roleId}: `,
            error
        );

        return null;

    }


    /*
     * ========================================================
     * DEVOLVER OBJETO ROLE
     * ========================================================
     */

    return (
        member.guild.roles.cache.get(
            selectedRole.roleId
        ) ||
        null
    );

}


/*
============================================================
OBTENER RANGO ACTUAL
============================================================
*/

function getCurrentLevelRole(
    member
) {

    if (
        !member
    ) {

        return null;

    }


    /*
     * Recorremos desde el rango más alto
     * hasta el más bajo.
     */

    for (
        let i =
            LEVEL_ROLES.length - 1;

        i >= 0;

        i--
    ) {

        const role =
            LEVEL_ROLES[i];


        if (
            member.roles.cache.has(
                role.roleId
            )
        ) {

            return (
                member.guild.roles.cache.get(
                    role.roleId
                ) ||
                null
            );

        }

    }


    return null;

}


/*
============================================================
EXPORTS
============================================================
*/

module.exports = {

    LEVEL_ROLES,

    getLevelRole,

    syncLevelRole,

    getCurrentLevelRole

};
