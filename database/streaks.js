const {
    getUserByDiscordId,
    updateUserFields
} = require("./users");

const {
    getLocalDateString
} = require("./daily-game");

/*

============================================================
CONFIGURACIÓN DEL MULTIPLICADOR DE RACHA
============================================================


La racha aumenta ligeramente los puntos obtenidos.


Racha 1 → x1.005
Racha 10 → x1.05
Racha 20 → x1.10
Racha 30 → x1.15
Racha 40 → x1.20
Racha 50 → x1.25
Racha 50+ → x1.25


El multiplicador máximo es x1.25.


============================================================
*/

const MAX_STREAK_MULTIPLIER_STREAK = 50;
const STREAK_MULTIPLIER_PER_LEVEL = 0.005;

/*

============================================================
OBTENER MULTIPLICADOR DE RACHA
============================================================


Recibe una racha y devuelve el multiplicador correspondiente.


Ejemplos:


getStreakMultiplier(1) → 1.005
getStreakMultiplier(10) → 1.05
getStreakMultiplier(25) → 1.125
getStreakMultiplier(50) → 1.25
getStreakMultiplier(1089) → 1.25


============================================================
*/

function getStreakMultiplier(streak) {

    const safeStreak =
        Math.max(
            0,
            Number(streak) || 0
        );


    const cappedStreak =
        Math.min(
            safeStreak,
            MAX_STREAK_MULTIPLIER_STREAK
        );


    return (
        1 +
        cappedStreak *
        STREAK_MULTIPLIER_PER_LEVEL
    );

}

/*

============================================================
APLICAR MULTIPLICADOR A UNA PUNTUACIÓN
============================================================


Aplica el multiplicador correspondiente a la racha.


El resultado se redondea hacia abajo para evitar decimales.


Ejemplos:


50 × 1.005 = 50.25 → 50 XP
50 × 1.05 = 52.5 → 52 XP
500 × 1.25 = 625 → 625 XP


============================================================
*/

function applyStreakMultiplier(
    points,
    streak
) {

    const basePoints =
        Number(points) || 0;


    if (
        basePoints <= 0
    ) {

        return 0;

    }


    const multiplier =
        getStreakMultiplier(
            streak
        );


    return Math.floor(
        basePoints *
        multiplier
    );

}

/*

============================================================
OBTENER FECHA DE AYER
============================================================


Convierte una fecha YYYY-MM-DD en la fecha del día anterior.


IMPORTANTE:


El formato devuelto debe ser exactamente:


YYYY-MM-DD


Sin espacios.


============================================================
*/

function getPreviousDate(
    dateString
) {

    const date =
        new Date(
            `${dateString}T12:00:00`
        );


    date.setDate(
        date.getDate() - 1
    );


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}

/*

============================================================
REGISTRAR PARTIDA DIARIA EN LA RACHA
============================================================


Esta función SOLO modifica:






daily_streak




streak_last_date


NO modifica:






last_daily_date




daily_attempts




daily_solved


La racha y el sistema de intentos diarios
funcionan de forma independiente.


============================================================
*/

async function registerDailyGame(
    userId
) {

    const user =
        await getUserByDiscordId(
            userId
        );


    if (!user) {

        throw new Error(
            `No se encontró el usuario ${userId} al actualizar la racha.`
        );

    }


    /*
     * ========================================================
     * FECHA ACTUAL
     * ========================================================
     */

    const today =
        getLocalDateString();


    /*
     * ========================================================
     * FECHA DE LA ÚLTIMA PARTIDA DE RACHA
     * ========================================================
     */

    const streakLastDate =
        user.streak_last_date
            ? String(
                user.streak_last_date
            ).trim()
            : null;


    /*
     * ========================================================
     * RACHA ACTUAL
     * ========================================================
     */

    const currentStreak =
        Number(
            user.daily_streak || 0
        );


    /*
     * ========================================================
     * YA REGISTRADA HOY
     * ========================================================
     *
     * Si por algún motivo se llama dos veces el mismo día,
     * no aumentamos la racha otra vez.
     *
     * Esto es especialmente importante cuando /set ha
     * establecido manualmente la racha para el día actual.
     *
     * ========================================================
     */

    if (
        streakLastDate === today
    ) {

        return {

            streak:
                currentStreak,

            increased:
                false,

            reset:
                false,

            alreadyPlayed:
                true,

            previousStreak:
                currentStreak

        };

    }


    /*
     * ========================================================
     * PRIMERA PARTIDA DE LA RACHA
     * ========================================================
     */

    if (!streakLastDate) {

        const newStreak =
            1;


        await updateUserFields(

            userId,

            {

                daily_streak:
                    newStreak,

                streak_last_date:
                    today

            }

        );


        return {

            streak:
                newStreak,

            increased:
                true,

            reset:
                false,

            alreadyPlayed:
                false,

            previousStreak:
                0

        };

    }


    /*
     * ========================================================
     * OBTENER FECHA DE AYER
     * ========================================================
     */

    const yesterday =
        getPreviousDate(
            today
        );


    /*
     * ========================================================
     * CONTINUAR RACHA
     * ========================================================
     *
     * Si jugó ayer, aumenta la racha.
     *
     * ========================================================
     */

    if (
        streakLastDate === yesterday
    ) {

        const newStreak =
            currentStreak + 1;


        await updateUserFields(

            userId,

            {

                daily_streak:
                    newStreak,

                streak_last_date:
                    today

            }

        );


        return {

            streak:
                newStreak,

            increased:
                true,

            reset:
                false,

            alreadyPlayed:
                false,

            previousStreak:
                currentStreak

        };

    }


    /*
     * ========================================================
     * RACHA PERDIDA
     * ========================================================
     *
     * Si no jugó ayer, empieza una nueva racha desde 1.
     *
     * ========================================================
     */

    const newStreak =
        1;


    await updateUserFields(

        userId,

        {

            daily_streak:
                newStreak,

            streak_last_date:
                today

        }

    );


    return {

        streak:
            newStreak,

        increased:
            false,

        reset:
            true,

        alreadyPlayed:
            false,

        previousStreak:
            currentStreak

    };

}

/*

============================================================
OBTENER RACHA ACTUAL
============================================================


Esta función NO modifica la base de datos.


Devuelve:




La racha actual si jugó hoy.


La racha actual si jugó ayer.


0 si lleva más de un día sin jugar.


============================================================
*/

async function getUserStreak(
    userId
) {

    const user =
        await getUserByDiscordId(
            userId
        );


    if (!user) {

        throw new Error(
            `No se encontró el usuario ${userId} al consultar la racha.`
        );

    }


    /*
     * ========================================================
     * FECHA ACTUAL
     * ========================================================
     */

    const today =
        getLocalDateString();


    /*
     * ========================================================
     * FECHA DE LA ÚLTIMA RACHA
     * ========================================================
     */

    const streakLastDate =
        user.streak_last_date
            ? String(
                user.streak_last_date
            ).trim()
            : null;


    /*
     * ========================================================
     * RACHA ACTUAL
     * ========================================================
     */

    const currentStreak =
        Number(
            user.daily_streak || 0
        );


    /*
     * ========================================================
     * NUNCA HA JUGADO
     * ========================================================
     */

    if (!streakLastDate) {

        return 0;

    }


    /*
     * ========================================================
     * JUGÓ HOY
     * ========================================================
     */

    if (
        streakLastDate === today
    ) {

        return currentStreak;

    }


    /*
     * ========================================================
     * JUGÓ AYER
     * ========================================================
     */

    const yesterday =
        getPreviousDate(
            today
        );


    if (
        streakLastDate === yesterday
    ) {

        return currentStreak;

    }


    /*
     * ========================================================
     * RACHA ROTA
     * ========================================================
     */

    return 0;

}

/*

============================================================
EXPORTAR
============================================================
*/

module.exports = {

    registerDailyGame,

    getUserStreak,

    getStreakMultiplier,

    applyStreakMultiplier

};