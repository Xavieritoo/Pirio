const {
    ChannelType
} = require("discord.js");


const {
    ensureUser,
    getUserByDiscordId,
    updateUserFields
} = require("./users");


/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const VOICE_XP_AMOUNT = 100;

const VOICE_XP_INTERVAL =
    30 * 60 * 1000;


/*
 * ============================================================
 * CANALES DE VOZ EXCLUIDOS
 * ============================================================
 *
 * Añade aquí los IDs de los canales de voz que NO deben
 * proporcionar XP.
 *
 * Para obtener el ID de un canal:
 *
 * Discord → Ajustes de usuario → Avanzado
 * → Activar "Modo desarrollador"
 *
 * Después:
 *
 * Click derecho sobre el canal → Copiar ID
 *
 *
 * Ejemplo:
 *
 * const EXCLUDED_VOICE_CHANNELS = [
 *
 *     "123456789012345678",
 *     "987654321098765432"
 *
 * ];
 *
 * ============================================================
 */

const EXCLUDED_VOICE_CHANNELS = [

    "940737728369291264",
    "940711983731335170"


];


/*
 * ============================================================
 * EVITAR EJECUCIONES SIMULTÁNEAS
 * ============================================================
 */

let processing = false;


/*
 * ============================================================
 * COMPROBAR SI UN CANAL DE VOZ ES VÁLIDO
 * ============================================================
 *
 * Un canal proporciona XP si:
 *
 * - Es un canal de voz normal.
 * - No está en EXCLUDED_VOICE_CHANNELS.
 * - No es el canal AFK del servidor.
 *
 * No comprobamos permisos ni roles.
 *
 * Esto significa que tú controlas manualmente qué canales
 * proporcionan XP y cuáles no.
 *
 * ============================================================
 */

function isValidVoiceChannel(
    channel,
    guild
) {

    /*
     * ========================================================
     * SOLO CANALES DE VOZ NORMALES
     * ========================================================
     */

    if (
        !channel ||
        channel.type !== ChannelType.GuildVoice
    ) {

        return false;

    }


    /*
     * ========================================================
     * COMPROBAR CANALES EXCLUIDOS MANUALMENTE
     * ========================================================
     */

    if (
        EXCLUDED_VOICE_CHANNELS.includes(
            channel.id
        )
    ) {

        return false;

    }


    /*
     * ========================================================
     * EXCLUIR CANAL AFK
     * ========================================================
     */

    if (
        guild.afkChannelId &&
        channel.id === guild.afkChannelId
    ) {

        return false;

    }


    /*
     * ========================================================
     * CANAL VÁLIDO
     * ========================================================
     */

    return true;

}


/*
 * ============================================================
 * REGISTRAR ENTRADA EN VOZ
 * ============================================================
 */

async function handleVoiceJoin(
    voiceState
) {

    try {

        const member =
            voiceState.member;


        /*
         * ====================================================
         * IGNORAR BOTS
         * ====================================================
         */

        if (
            !member ||
            member.user.bot
        ) {

            return;

        }


        const channel =
            voiceState.channel;


        /*
         * ====================================================
         * COMPROBAR CANAL
         * ====================================================
         */

        if (
            !isValidVoiceChannel(
                channel,
                voiceState.guild
            )
        ) {

            /*
             * Si entra en un canal excluido,
             * eliminamos cualquier contador anterior.
             */

            await resetVoiceUser(
                voiceState.id
            );


            console.log(

                `[VOICE XP] ${member.user.tag} ` +
                `ha entrado en un canal excluido. ` +
                `No obtiene XP.`

            );


            return;

        }


        /*
         * ====================================================
         * ASEGURAR USUARIO
         * ====================================================
         */

        await ensureUser(

            member.user.id,

            member.user.tag

        );


        /*
         * ====================================================
         * INICIAR CONTADOR
         * ====================================================
         */

        const now =
            new Date();


        await updateUserFields(

            member.user.id,

            {

                voice_joined_at:
                    now,

                last_voice_xp_at:
                    null

            }

        );


        console.log(

            `[VOICE XP] ${member.user.tag} ` +

            `ha entrado en ${channel.name}. ` +

            `Contador iniciado.`

        );

    } catch (error) {

        console.error(

            "[VOICE XP] Error procesando entrada:",

            error

        );

    }

}


/*
 * ============================================================
 * REINICIAR CONTADOR
 * ============================================================
 */

async function resetVoiceUser(
    userId
) {

    try {

        await updateUserFields(

            userId,

            {

                voice_joined_at:
                    null,

                last_voice_xp_at:
                    null

            }

        );

    } catch (error) {

        console.error(

            `[VOICE XP] Error reiniciando ${userId}:`,

            error

        );

    }

}


/*
 * ============================================================
 * PROCESAR USUARIO
 * ============================================================
 */

async function processVoiceUser(
    voiceState,
    now
) {

    try {

        const member =
            voiceState.member;


        /*
         * ====================================================
         * IGNORAR BOTS
         * ====================================================
         */

        if (
            !member ||
            member.user.bot
        ) {

            return;

        }


        const channel =
            voiceState.channel;


        /*
         * ====================================================
         * COMPROBAR CANAL
         * ====================================================
         */

        if (
            !isValidVoiceChannel(
                channel,
                voiceState.guild
            )
        ) {

            /*
             * Si está en un canal excluido,
             * no debe acumular tiempo.
             */

            await resetVoiceUser(
                voiceState.id
            );


            return;

        }


        /*
         * ====================================================
         * ASEGURAR USUARIO
         * ====================================================
         */

        const user =
            await ensureUser(

                member.user.id,

                member.user.tag

            );


        /*
         * ====================================================
         * OBTENER DATOS DEL CONTADOR
         * ====================================================
         */

        const joinedAt =
            user.voice_joined_at
                ? new Date(
                    user.voice_joined_at
                )
                : null;


        const lastXpAt =
            user.last_voice_xp_at
                ? new Date(
                    user.last_voice_xp_at
                )
                : null;


        /*
         * ====================================================
         * PRIMERA DETECCIÓN
         * ====================================================
         *
         * Si el bot se inició mientras el usuario ya estaba
         * en un canal válido, empezamos a contar desde ahora.
         *
         * No damos XP inmediatamente.
         *
         * ====================================================
         */

        if (
            !joinedAt
        ) {

            await updateUserFields(

                member.user.id,

                {

                    voice_joined_at:
                        now,

                    last_voice_xp_at:
                        null

                }

            );


            console.log(

                `[VOICE XP] ${member.user.tag} ` +

                `detectado en ${channel.name}. ` +

                `Contador iniciado.`

            );


            return;

        }


        /*
         * ====================================================
         * TIEMPO DESDE LA ENTRADA
         * ====================================================
         */

        const elapsed =
            now.getTime() -
            joinedAt.getTime();


        /*
         * Todavía no lleva 30 minutos.
         */

        if (
            elapsed <
            VOICE_XP_INTERVAL
        ) {

            return;

        }


        /*
         * ====================================================
         * COMPROBAR ÚLTIMO PAGO
         * ====================================================
         *
         * 30 minutos -> +100 XP
         * 60 minutos -> +100 XP
         * 90 minutos -> +100 XP
         * etc.
         *
         * ====================================================
         */

        if (
            lastXpAt
        ) {

            const elapsedSinceLastXp =
                now.getTime() -
                lastXpAt.getTime();


            if (
                elapsedSinceLastXp <
                VOICE_XP_INTERVAL
            ) {

                return;

            }

        }


        /*
         * ====================================================
         * CALCULAR XP
         * ====================================================
         */

        const currentXp =
            Number(
                user.xp || 0
            );


        const totalXp =
            currentXp +
            VOICE_XP_AMOUNT;


        /*
         * ====================================================
         * CALCULAR NIVEL
         * ====================================================
         */

        const nextLevel =
            Math.floor(
                totalXp / 1000
            ) + 1;


        /*
         * ====================================================
         * GUARDAR XP
         * ====================================================
         */

        await updateUserFields(

            member.user.id,

            {

                xp:
                    totalXp,

                level:
                    nextLevel,

                last_voice_xp_at:
                    now

            },

            member

        );


        console.log(

            `[VOICE XP] ${member.user.tag} ` +

            `ha recibido +${VOICE_XP_AMOUNT} XP ` +

            `(total: ${totalXp} XP).`

        );

    } catch (error) {

        console.error(

            `[VOICE XP] Error procesando ${voiceState.id}:`,

            error

        );

    }

}


/*
 * ============================================================
 * PROCESAR TODOS LOS USUARIOS EN VOZ
 * ============================================================
 */

async function processAllVoiceXp(
    client
) {

    /*
     * ========================================================
     * EVITAR EJECUCIONES SIMULTÁNEAS
     * ========================================================
     */

    if (
        processing
    ) {

        console.log(

            "[VOICE XP] " +

            "El ciclo anterior todavía está ejecutándose."

        );


        return;

    }


    processing = true;


    try {

        const now =
            new Date();


        /*
         * ====================================================
         * RECORRER TODOS LOS SERVIDORES
         * ====================================================
         */

        for (
            const guild
            of client.guilds.cache.values()
        ) {

            /*
             * =================================================
             * RECORRER ESTADOS DE VOZ
             * =================================================
             */

            for (
                const voiceState
                of guild.voiceStates.cache.values()
            ) {

                await processVoiceUser(

                    voiceState,

                    now

                );

            }

        }

    } catch (error) {

        console.error(

            "[VOICE XP] Error en ciclo:",

            error

        );

    } finally {

        processing = false;

    }

}


/*
 * ============================================================
 * INICIAR SISTEMA
 * ============================================================
 */

function startVoiceXpSystem(
    client
) {

    console.log(
        "🎙️ Sistema de XP por voz iniciado."
    );


    /*
     * ========================================================
     * EVENTOS DE VOZ
     * ========================================================
     */

    client.on(

        "voiceStateUpdate",

        async (
            oldState,
            newState
        ) => {

            try {

                /*
                 * ==================================================
                 * IGNORAR BOTS
                 * ==================================================
                 */

                if (
                    newState.member?.user?.bot
                ) {

                    return;

                }


                const oldChannel =
                    oldState.channel;


                const newChannel =
                    newState.channel;


                /*
                 * ==================================================
                 * HA SALIDO COMPLETAMENTE DE VOZ
                 * ==================================================
                 */

                if (
                    oldChannel &&
                    !newChannel
                ) {

                    await resetVoiceUser(
                        oldState.id
                    );


                    console.log(

                        `[VOICE XP] ${oldState.id} ` +

                        `ha salido de voz.`

                    );


                    return;

                }


                /*
                 * ==================================================
                 * HA CAMBIADO DE CANAL
                 * ==================================================
                 */

                if (
                    oldChannel &&
                    newChannel &&
                    oldChannel.id !== newChannel.id
                ) {

                    /*
                     * Reiniciamos el contador.
                     */

                    await resetVoiceUser(
                        oldState.id
                    );


                    /*
                     * Comprobamos el nuevo canal.
                     */

                    await handleVoiceJoin(
                        newState
                    );


                    return;

                }


                /*
                 * ==================================================
                 * HA ENTRADO EN VOZ
                 * ==================================================
                 */

                if (
                    !oldChannel &&
                    newChannel
                ) {

                    await handleVoiceJoin(
                        newState
                    );


                    return;

                }

            } catch (error) {

                console.error(

                    "[VOICE XP] " +

                    "Error en voiceStateUpdate:",

                    error

                );

            }

        }

    );


    /*
     * ========================================================
     * COMPROBACIÓN CADA 30 MINUTOS
     * ========================================================
     */

    setInterval(

        async () => {

            await processAllVoiceXp(
                client
            );

        },

        VOICE_XP_INTERVAL

    );


    /*
     * ========================================================
     * COMPROBACIÓN INICIAL
     * ========================================================
     *
     * Si el bot se inicia mientras hay alguien conectado
     * a voz, empieza a contar desde el momento del inicio.
     *
     * ========================================================
     */

    setTimeout(

        async () => {

            await processAllVoiceXp(
                client
            );

        },

        5000

    );

}


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

module.exports = {

    startVoiceXpSystem,

    isValidVoiceChannel

};
