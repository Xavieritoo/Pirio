const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const {
    getDailyCommandName,
    getLocalDateString
} = require("../database/daily-game");

const {
    ensureUser,
    updateUserFields,
    getUserByDiscordId,
    addXp
} = require("../database/users");

const {
    registerDailyGame,
    applyStreakMultiplier
} = require("../database/streaks");


/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const BOARD_SIZE = 5;

const TOTAL_CELLS =
    BOARD_SIZE * BOARD_SIZE;

const MINES = 6;

const SAFE_CELLS =
    TOTAL_CELLS - MINES;

const VICTORY_POINTS = 700;

const MAX_LIVES = 3;


/*
 * ============================================================
 * EMOJIS
 * ============================================================
 */

const HIDDEN = "⬛";

const MINE = "💣";

const EMPTY = "⬜";

const LIFE = "❤️";

const LOST_LIFE = "🖤";

const NUMBERS = [
    "0️⃣",
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣"
];


/*
 * ============================================================
 * CREAR TABLERO VACÍO
 * ============================================================
 */

function createEmptyBoard() {

    const board = [];

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        const boardRow = [];

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            boardRow.push({

                mine: false,

                revealed: false,

                adjacent: 0

            });

        }

        board.push(boardRow);

    }

    return board;

}


/*
 * ============================================================
 * GENERAR MINAS
 * ============================================================
 */

function generateMines(board) {

    let minesPlaced = 0;

    while (
        minesPlaced < MINES
    ) {

        const row =
            Math.floor(
                Math.random() * BOARD_SIZE
            );

        const col =
            Math.floor(
                Math.random() * BOARD_SIZE
            );

        if (
            board[row][col].mine
        ) {

            continue;

        }

        board[row][col].mine = true;

        minesPlaced++;

    }

}


/*
 * ============================================================
 * CONTAR MINAS ADYACENTES
 * ============================================================
 */

function calculateNumbers(board) {

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            if (
                board[row][col].mine
            ) {

                continue;

            }

            let count = 0;

            for (
                let rowOffset = -1;
                rowOffset <= 1;
                rowOffset++
            ) {

                for (
                    let colOffset = -1;
                    colOffset <= 1;
                    colOffset++
                ) {

                    if (
                        rowOffset === 0 &&
                        colOffset === 0
                    ) {

                        continue;

                    }

                    const newRow =
                        row + rowOffset;

                    const newCol =
                        col + colOffset;

                    if (
                        newRow < 0 ||
                        newRow >= BOARD_SIZE ||
                        newCol < 0 ||
                        newCol >= BOARD_SIZE
                    ) {

                        continue;

                    }

                    if (
                        board[newRow][newCol].mine
                    ) {

                        count++;

                    }

                }

            }

            board[row][col].adjacent =
                count;

        }

    }

}


/*
 * ============================================================
 * GENERAR TABLERO
 * ============================================================
 */

function generateBoard() {

    const board =
        createEmptyBoard();

    generateMines(board);

    calculateNumbers(board);

    return board;

}


/*
 * ============================================================
 * OBTENER VECINOS
 * ============================================================
 */

function getNeighbours(
    row,
    col
) {

    const neighbours = [];

    for (
        let rowOffset = -1;
        rowOffset <= 1;
        rowOffset++
    ) {

        for (
            let colOffset = -1;
            colOffset <= 1;
            colOffset++
        ) {

            if (
                rowOffset === 0 &&
                colOffset === 0
            ) {

                continue;

            }

            const newRow =
                row + rowOffset;

            const newCol =
                col + colOffset;

            if (
                newRow < 0 ||
                newRow >= BOARD_SIZE ||
                newCol < 0 ||
                newCol >= BOARD_SIZE
            ) {

                continue;

            }

            neighbours.push({

                row: newRow,

                col: newCol

            });

        }

    }

    return neighbours;

}


/*
 * ============================================================
 * DESCUBRIR CASILLA
 * ============================================================
 */

function revealCell(
    board,
    startRow,
    startCol
) {

    const queue = [

        {
            row: startRow,
            col: startCol
        }

    ];

    const revealedCells = [];

    const visited = new Set();

    while (
        queue.length > 0
    ) {

        const {
            row,
            col
        } = queue.shift();

        const key =
            `${ row }_${ col } `;

        if (
            visited.has(key)
        ) {

            continue;

        }

        visited.add(key);

        const cell =
            board[row][col];

        if (
            cell.revealed
        ) {

            continue;

        }

        if (
            cell.mine
        ) {

            continue;

        }

        cell.revealed = true;

        revealedCells.push({

            row,

            col

        });


        if (
            cell.adjacent !== 0
        ) {

            continue;

        }


        const neighbours =
            getNeighbours(
                row,
                col
            );

        for (
            const neighbour of neighbours
        ) {

            const neighbourCell =
                board[
                    neighbour.row
                ][
                    neighbour.col
                ];

            if (
                !neighbourCell.revealed &&
                !neighbourCell.mine
            ) {

                queue.push(
                    neighbour
                );

            }

        }

    }

    return revealedCells;

}


/*
 * ============================================================
 * CONTAR CASILLAS DESCUBIERTAS
 * ============================================================
 */

function countRevealed(board) {

    let count = 0;

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const cell =
                board[row][col];

            if (
                cell.revealed &&
                !cell.mine
            ) {

                count++;

            }

        }

    }

    return count;

}


/*
 * ============================================================
 * COMPROBAR VICTORIA
 * ============================================================
 */

function hasWon(board) {

    return (
        countRevealed(board) ===
        SAFE_CELLS
    );

}


/*
 * ============================================================
 * OBTENER EMOJI DE CASILLA
 * ============================================================
 */

function getCellEmoji(
    cell,
    revealMines = false
) {

    if (
        !cell.revealed
    ) {

        if (
            revealMines &&
            cell.mine
        ) {

            return MINE;

        }

        return HIDDEN;

    }


    if (
        cell.mine
    ) {

        return MINE;

    }


    if (
        cell.adjacent === 0
    ) {

        return EMPTY;

    }


    return (
        NUMBERS[cell.adjacent] ||
        EMPTY
    );

}


/*
 * ============================================================
 * CREAR BOTONES DEL TABLERO
 * ============================================================
 */

function createBoardButtons(
    board,
    gameId
) {

    const rows = [];

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        const actionRow =
            new ActionRowBuilder();

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const cell =
                board[row][col];

            const label =
                getCellEmoji(cell);


            if (
                cell.revealed
            ) {

                const button =
                    new ButtonBuilder()

                        .setCustomId(
                            `buscaminas_revealed_${ gameId }_${ row }_${ col } `
                        )

                        .setLabel(label)

                        .setStyle(
                            ButtonStyle.Secondary
                        )

                        .setDisabled(true);

                actionRow.addComponents(
                    button
                );

            } else {

                const button =
                    new ButtonBuilder()

                        .setCustomId(
                            `buscaminas_cell_${ gameId }_${ row }_${ col } `
                        )

                        .setLabel(HIDDEN)

                        .setStyle(
                            ButtonStyle.Secondary
                        );

                actionRow.addComponents(
                    button
                );

            }

        }

        rows.push(
            actionRow
        );

    }

    return rows;

}


/*
 * ============================================================
 * CREAR TABLERO FINAL
 * ============================================================
 */

function createFinalBoardButtons(
    board,
    gameId
) {

    const rows = [];

    for (
        let row = 0;
        row < BOARD_SIZE;
        row++
    ) {

        const actionRow =
            new ActionRowBuilder();

        for (
            let col = 0;
            col < BOARD_SIZE;
            col++
        ) {

            const cell =
                board[row][col];

            const label =
                getCellEmoji(
                    cell,
                    true
                );

            const button =
                new ButtonBuilder()

                    .setCustomId(
                        `buscaminas_final_${ gameId }_${ row }_${ col } `
                    )

                    .setLabel(label)

                    .setStyle(

                        cell.mine
                            ? ButtonStyle.Danger
                            : ButtonStyle.Secondary

                    )

                    .setDisabled(true);

            actionRow.addComponents(
                button
            );

        }

        rows.push(
            actionRow
        );

    }

    return rows;

}


/*
 * ============================================================
 * CONTENIDO DEL JUEGO
 * ============================================================
 */

function createGameContent(
    board,
    lives,
    message = null
) {

    const revealed =
        countRevealed(board);

    const livesDisplay =
        Array.from(
            { length: MAX_LIVES },
            (_, index) =>
                index < lives
                    ? LIFE
                    : LOST_LIFE
        ).join(" ");

    let content =
        `💣 ** BUSCAMINAS 5×5 **\n\n` +

        `💥 Minas: ** ${ MINES }**\n` +

        `🔓 Casillas seguras: ** ${ revealed }/${SAFE_CELLS}**\n` +

        `❤️ Vidas: ${livesDisplay}\n` +

    `🏆 Victoria: **+${VICTORY_POINTS} XP**\n\n`;


if (
    message
) {

    content +=
        `${message}\n\n`;

}


content +=
    `👇 **Pulsa una casilla para descubrirla.**`;

return content;

}


/*
 * ============================================================
 * COMANDO
 * ============================================================
 */

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                "buscaminas"
            )

            .setDescription(
                "Juega al Buscaminas diario en un tablero de 5x5"
            ),


    async execute(
        interaction
    ) {

        /*
         * ====================================================
         * COMPROBAR MINIJUEGO DIARIO
         * ====================================================
         */

        if (
            getDailyCommandName() !==
            "buscaminas"
        ) {

            return interaction.reply({

                content:
                    "❌ Hoy el minijuego diario no es Buscaminas. Usa `/diario` para saber cuál toca hoy.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * OBTENER MIEMBRO DE DISCORD
         * ====================================================
         *
         * Necesitamos el GuildMember para que addXp()
         * pueda:
         *
         * 1. Sincronizar el rango.
         * 2. Detectar subida de nivel.
         * 3. Enviar la notificación mediante nivel.js.
         *
         * ====================================================
         */

        let member = null;

        try {

            member =
                await interaction.guild.members.fetch(
                    interaction.user.id
                );

        } catch (error) {

            console.error(
                "Error obteniendo GuildMember para Buscaminas:",
                error
            );

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
                    interaction.user.tag,
                    member
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
         * COMPROBAR SI YA JUGÓ HOY
         * ====================================================
         */

        const today =
            getLocalDateString();

        const lastDailyDate =
            user.last_daily_date
                ? String(user.last_daily_date)
                : null;

        if (
            lastDailyDate === today
        ) {

            return interaction.reply({

                content:
                    "❌ **Ya has jugado tu minijuego diario hoy.**\n\n" +
                    "⏳ Vuelve mañana para jugar otra partida.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * REGISTRAR PARTIDA DIARIA
         * ====================================================
         */

        try {

            await registerDailyGame(
                interaction.user.id
            );

        } catch (error) {

            console.error(
                "Error registrando partida diaria:",
                error
            );

            return interaction.reply({

                content:
                    "❌ No se ha podido registrar tu partida diaria. Inténtalo de nuevo.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * REGISTRAR INTENTO
         * ====================================================
         */

        try {

            await updateUserFields(

                interaction.user.id,

                {

                    daily_attempts:
                        (
                            user.daily_attempts ||
                            0
                        ) + 1

                }

            );

        } catch (error) {

            console.error(
                "Error registrando intento diario:",
                error
            );

            return interaction.reply({

                content:
                    "❌ No se ha podido registrar tu partida. Inténtalo de nuevo.",

                ephemeral: true

            });

        }


        /*
         * ====================================================
         * GENERAR TABLERO
         * ====================================================
         */

        const board =
            generateBoard();


        /*
         * ====================================================
         * VARIABLES DE PARTIDA
         * ====================================================
         */

        let gameFinished = false;

        let lives = MAX_LIVES;


        /*
         * ====================================================
         * ID ÚNICO DE PARTIDA
         * ====================================================
         */

        const gameId =
            `${interaction.user.id}_${Date.now()}`;


        /*
         * ====================================================
         * ACTUALIZAR MENSAJE
         * ====================================================
         */

        const updateGameMessage =
            async (
                message = null
            ) => {

                if (
                    gameFinished
                ) {

                    return;

                }

                try {

                    await interaction.editReply({

                        content:
                            createGameContent(
                                board,
                                lives,
                                message
                            ),

                        components:
                            createBoardButtons(
                                board,
                                gameId
                            )

                    });

                } catch (error) {

                    console.error(
                        "Error actualizando Buscaminas:",
                        error
                    );

                }

            };


        /*
         * ====================================================
         * FINALIZAR PARTIDA
         * ====================================================
         */

        const finishGame =
            async (
                won
            ) => {

                if (
                    gameFinished
                ) {

                    return;

                }

                gameFinished = true;


                /*
                 * =================================================
                 * XP BASE
                 * =================================================
                 */

                const baseXpGain =
                    won
                        ? VICTORY_POINTS
                        : 0;


                /*
                 * =================================================
                 * OBTENER RACHA ACTUAL
                 * =================================================
                 *
                 * La racha solamente se utiliza internamente
                 * para calcular la XP final.
                 *
                 * =================================================
                 */

                let xpGain =
                    baseXpGain;


                if (
                    won
                ) {

                    try {

                        const currentUser =
                            await getUserByDiscordId(
                                interaction.user.id
                            );

                        const currentStreak =
                            Number(
                                currentUser?.daily_streak || 0
                            );

                        xpGain =
                            applyStreakMultiplier(
                                baseXpGain,
                                currentStreak
                            );

                        /*
                         * Aseguramos que XP siempre sea un número
                         * entero positivo.
                         */

                        xpGain =
                            Math.ceil(
                                Number(xpGain) || 0
                            );

                    } catch (error) {

                        console.error(
                            "Error calculando multiplicador de racha:",
                            error
                        );

                        /*
                         * Si falla la consulta de racha,
                         * el usuario conserva la recompensa base.
                         */

                        xpGain =
                            baseXpGain;

                    }

                }


                /*
                 * =================================================
                 * SUMAR XP
                 * =================================================
                 *
                 * IMPORTANTE:
                 *
                 * Usamos addXp() en lugar de actualizar
                 * directamente "xp" y "level".
                 *
                 * addXp() se encarga automáticamente de:
                 *
                 * - Calcular el nuevo nivel.
                 * - Detectar si ha subido.
                 * - Sincronizar el rango.
                 * - Notificar la subida de nivel.
                 *
                 * =================================================
                 */

                let xpResult = null;

                try {

                    if (
                        xpGain > 0
                    ) {

                        xpResult =
                            await addXp(

                                interaction.user.id,

                                xpGain,

                                member

                            );

                    }

                } catch (error) {

                    console.error(
                        "Error sumando XP de Buscaminas:",
                        error
                    );

                }


                /*
                 * =================================================
                 * REGISTRAR DIARIO COMPLETADO
                 * =================================================
                 */

                try {

                    if (
                        won
                    ) {

                        const currentUser =
                            await getUserByDiscordId(
                                interaction.user.id
                            );

                        await updateUserFields(

                            interaction.user.id,

                            {

                                daily_solved:
                                    (
                                        currentUser?.daily_solved ||
                                        0
                                    ) + 1

                            }

                        );

                    }

                } catch (error) {

                    console.error(
                        "Error registrando diario completado:",
                        error
                    );

                }


                /*
                 * =================================================
                 * MENSAJE FINAL
                 * =================================================
                 */

                let finalMessage;


                if (
                    won
                ) {

                    finalMessage =

                        `🏆 **¡HAS GANADO!**\n\n` +

                        `💣 Has descubierto todas las ` +
                        `casillas seguras del tablero.\n\n` +

                        `🔓 Casillas descubiertas: **${countRevealed(board)}/${SAFE_CELLS}**\n` +

                        `⭐ Puntos conseguidos: **${xpGain} XP**\n\n` +

                        `🎉 ¡Enhorabuena!`;

                } else {

                    finalMessage =

                        `💥 **¡HAS PERDIDO!**\n\n` +

                        `💣 Te has quedado sin vidas.\n\n` +

                        `🔓 Casillas descubiertas: **${countRevealed(board)}/${SAFE_CELLS}**\n` +

                        `⭐ Puntos conseguidos: **${xpGain} XP**\n\n` +

                        `💀 ¡Mejor suerte mañana!`;

                }


                /*
                 * =================================================
                 * MOSTRAR RESULTADO
                 * =================================================
                 */

                try {

                    await interaction.editReply({

                        content:
                            finalMessage,

                        components:
                            createFinalBoardButtons(
                                board,
                                gameId
                            )

                    });

                } catch (error) {

                    console.error(
                        "Error mostrando resultado de Buscaminas:",
                        error
                    );

                }


                /*
                 * =================================================
                 * MENSAJE PÚBLICO
                 * =================================================
                 */

                try {

                    await interaction.channel.send({

                        content:

                            won

                                ? `🏆 **¡${interaction.user.username} ha ganado el Buscaminas!**\n` +
                                `💣 Ha descubierto todas las casillas seguras y ha conseguido **${xpGain} XP**.`

                                : `💥 **¡${interaction.user.username} se ha quedado sin vidas!**\n` +
                                `💣 Ha descubierto **${countRevealed(board)} casillas** y ha conseguido **0 XP**.`

                    });

                } catch (error) {

                    console.error(
                        "Error enviando resultado público de Buscaminas:",
                        error
                    );

                }

            };


        /*
         * ====================================================
         * MENSAJE INICIAL
         * ====================================================
         */

        const gameMessage =
            await interaction.reply({

                content:
                    createGameContent(
                        board,
                        lives
                    ),

                components:
                    createBoardButtons(
                        board,
                        gameId
                    ),

                ephemeral: true,

                fetchReply: true

            });


        /*
         * ====================================================
         * COLLECTOR
         * ====================================================
         */

        const collector =
            gameMessage.createMessageComponentCollector({

                filter:
                    componentInteraction => {

                        return (

                            componentInteraction.user.id ===
                            interaction.user.id &&

                            componentInteraction.customId.startsWith(
                                `buscaminas_cell_${gameId}_`
                            )

                        );

                    },

                time:
                    15 * 60 * 1000

            });


        /*
         * ====================================================
         * PULSAR CASILLA
         * ====================================================
         */

        collector.on(

            "collect",

            async componentInteraction => {

                if (
                    gameFinished
                ) {

                    return;

                }


                /*
                 * =================================================
                 * EXTRAER FILA Y COLUMNA
                 * =================================================
                 */

                const parts =
                    componentInteraction.customId.split("_");


                const row =
                    Number(
                        parts[
                        parts.length - 2
                        ]
                    );


                const col =
                    Number(
                        parts[
                        parts.length - 1
                        ]
                    );


                /*
                 * =================================================
                 * VALIDAR COORDENADAS
                 * =================================================
                 */

                if (

                    Number.isNaN(row) ||
                    Number.isNaN(col) ||

                    row < 0 ||
                    row >= BOARD_SIZE ||

                    col < 0 ||
                    col >= BOARD_SIZE

                ) {

                    await componentInteraction.reply({

                        content:
                            "❌ Esa casilla no es válida.",

                        ephemeral: true

                    });

                    return;

                }


                const cell =
                    board[row][col];


                /*
                 * =================================================
                 * CASILLA YA DESCUBIERTA
                 * =================================================
                 */

                if (
                    cell.revealed
                ) {

                    await componentInteraction.reply({

                        content:
                            "❌ Esa casilla ya está descubierta.",

                        ephemeral: true

                    });

                    return;

                }


                /*
                 * =================================================
                 * CONFIRMAR INTERACCIÓN
                 * =================================================
                 */

                try {

                    await componentInteraction.deferUpdate();

                } catch (error) {

                    console.error(
                        "Error haciendo defer del botón:",
                        error
                    );

                    return;

                }


                /*
                 * =================================================
                 * MINA
                 * =================================================
                 */

                if (
                    cell.mine
                ) {

                    cell.revealed = true;

                    lives--;

                    if (
                        lives <= 0
                    ) {

                        await finishGame(
                            false
                        );

                        return;

                    }

                    await updateGameMessage(

                        `💥 **¡Has pisado una mina!**\n` +

                        `❤️ Te quedan **${lives} vida${lives === 1 ? "" : "s"}**.`

                    );

                    return;

                }


                /*
                 * =================================================
                 * CASILLA SEGURA
                 * =================================================
                 */

                const revealedCells =
                    revealCell(
                        board,
                        row,
                        col
                    );


                /*
                 * =================================================
                 * COMPROBAR VICTORIA
                 * =================================================
                 */

                if (
                    hasWon(board)
                ) {

                    await finishGame(
                        true
                    );

                    return;

                }


                /*
                 * =================================================
                 * ACTUALIZAR TABLERO
                 * =================================================
                 */

                await updateGameMessage(

                    `✅ Has descubierto **${revealedCells.length} casilla${revealedCells.length === 1 ? "" : "s"}**.`

                );

            }

        );


        /*
         * ====================================================
         * FINALIZACIÓN DEL COLLECTOR
         * ====================================================
         */

        collector.on(

            "end",

            async () => {

                if (
                    gameFinished
                ) {

                    return;

                }


                /*
                 * Si pasan 15 minutos,
                 * termina la partida como derrota.
                 */

                await finishGame(
                    false
                );

            }

        );

    }

};
