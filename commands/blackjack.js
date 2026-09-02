const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require("discord.js");

const {
  ensureUser,
  updateUserFields
} = require("../database/users");

const {
  getDailyCommandName,
  getLocalDateString
} = require("../database/daily-game");

const {
  registerDailyGame,
  applyStreakMultiplier
} = require("../database/streaks");


/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const MAX_BET_PERCENTAGE = 0.15;

const MIN_BET = 1;


/*
 * Multiplicadores:
 *
 * Derrota:
 *     -100% de la apuesta
 *
 * Empate:
 *      0%
 *
 * Victoria:
 *     +100% de la apuesta
 *
 * Blackjack:
 *     +150% de la apuesta
 */

const PAYOUT_MULTIPLIERS = {

  lose: -1,

  tie: 0,

  win: 1,

  blackjack: 1.5

};


/*
 * ============================================================
 * BARAJA
 * ============================================================
 */

const SUITS = [
  "♠",
  "♥",
  "♦",
  "♣"
];

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K"
];


function buildDeck() {

  return SUITS.flatMap(
    suit =>
      RANKS.map(
        rank => ({
          rank,
          suit
        })
      )
  );

}


/*
 * ============================================================
 * BARAJAR
 * ============================================================
 */

function shuffleDeck(
  deck,
  seed
) {

  const result = [
    ...deck
  ];

  let hash = 0;


  for (
    let i = 0;
    i < seed.length;
    i += 1
  ) {

    hash =
      (
        hash * 31 +
        seed.charCodeAt(i)
      ) >>> 0;

  }


  function random() {

    hash =
      Math.imul(
        hash ^ (hash >>> 15),
        2246822519
      ) >>> 0;

    hash =
      Math.imul(
        hash ^ (hash >>> 13),
        3266489917
      ) >>> 0;

    return (
      (
        hash ^
        (hash >>> 16)
      ) >>> 0
    ) / 4294967296;

  }


  for (
    let i = result.length - 1;
    i > 0;
    i -= 1
  ) {

    const j =
      Math.floor(
        random() *
        (i + 1)
      );


    [
      result[i],
      result[j]
    ] = [
        result[j],
        result[i]
      ];

  }


  return result;

}


/*
 * ============================================================
 * CARTAS
 * ============================================================
 */

function cardLabel(card) {

  return `${card.rank}${card.suit}`;

}


function renderHand(cards) {

  return cards
    .map(cardLabel)
    .join(" ");

}


/*
 * ============================================================
 * VALOR DE MANO
 * ============================================================
 */

function handValue(cards) {

  let total = 0;

  let aces = 0;


  for (const card of cards) {

    if (
      card.rank === "A"
    ) {

      aces += 1;

      total += 1;

    } else if (
      [
        "J",
        "Q",
        "K"
      ].includes(card.rank)
    ) {

      total += 10;

    } else {

      total += Number(
        card.rank
      );

    }

  }


  while (
    aces > 0 &&
    total + 10 <= 21
  ) {

    total += 10;

    aces -= 1;

  }


  return total;

}


/*
 * ============================================================
 * FECHAS
 * ============================================================
 */

function normalizeDate(value) {

  if (!value) {

    return null;

  }


  if (
    value instanceof Date
  ) {

    if (
      Number.isNaN(
        value.getTime()
      )
    ) {

      return null;

    }


    return value
      .toISOString()
      .slice(0, 10);

  }


  const stringValue =
    String(value);


  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      stringValue
    )
  ) {

    return stringValue.slice(
      0,
      10
    );

  }


  return stringValue;

}


/*
 * ============================================================
 * ESTADO DE LA PARTIDA
 * ============================================================
 */

function buildBlackjackState(
  userId,
  date,
  seed,
  playerCount,
  bet
) {

  return [
    userId,
    date,
    seed,
    playerCount,
    bet
  ].join(":");

}


function parseBlackjackState(
  state
) {

  const parts =
    String(state).split(":");


  return {

    userId:
      parts[0],

    date:
      parts[1],

    seed:
      parts[2],

    playerCount:
      Number(
        parts[3] || 0
      ),

    bet:
      Number(
        parts[4] || 0
      )

  };

}


/*
 * ============================================================
 * REPARTIR CARTAS
 * ============================================================
 */

function dealHands(
  seed,
  playerCount
) {

  const deck =
    shuffleDeck(
      buildDeck(),
      seed
    );


  const playerCards = [

    deck[0],

    deck[2]

  ];


  for (
    let i = 2;
    i < playerCount;
    i += 1
  ) {

    playerCards.push(
      deck[
      4 + i - 2
      ]
    );

  }


  const dealerCards = [

    deck[1],

    deck[3]

  ];


  return {

    playerCards,

    dealerCards,

    deck

  };

}


/*
 * ============================================================
 * JUEGO DEL CRUPIER
 * ============================================================
 */

function dealerPlay(
  deck,
  playerCount
) {

  const dealerCards = [

    deck[1],

    deck[3]

  ];


  let nextIndex =
    4 +
    Math.max(
      0,
      playerCount - 2
    );


  while (
    handValue(dealerCards) < 17 &&
    nextIndex < deck.length
  ) {

    dealerCards.push(
      deck[nextIndex]
    );

    nextIndex += 1;

  }


  return dealerCards;

}


/*
 * ============================================================
 * MULTIPLICADOR DE RACHA
 * ============================================================
 */

function getFinalScore(
  baseScore,
  streak
) {

  if (
    baseScore <= 0
  ) {

    return 0;

  }


  return Math.floor(
    applyStreakMultiplier(
      baseScore,
      streak
    )
  );

}


/*
 * ============================================================
 * OBTENER APUESTA MÁXIMA
 * ============================================================
 */

function getMaxBet(
  xp
) {

  const currentXp =
    Math.max(
      0,
      Number(xp || 0)
    );


  return Math.floor(
    currentXp *
    MAX_BET_PERCENTAGE
  );

}


/*
 * ============================================================
 * GUARDAR RESULTADO
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Toda la XP pasa por updateUserFields().
 *
 * users.js se encarga de:
 *
 * - calcular el nuevo nivel
 * - sincronizar el rango
 * - detectar la subida de nivel
 * - llamar a notifyLevelUp()
 *
 * ============================================================
 */

async function saveScore(
  userId,
  username,
  xpChange,
  isWin = false,
  member = null
) {

  const user =
    await ensureUser(
      userId,
      username,
      member
    );


  const currentXp =
    Math.max(
      0,
      Number(
        user.xp || 0
      )
    );


  const currentWins =
    Number(
      user.wins || 0
    );


  const change =
    Number(
      xpChange || 0
    );


  const newXp =
    Math.max(
      0,
      currentXp + change
    );


  await updateUserFields(

    userId,

    {

      xp:
        newXp,

      ...(isWin
        ? {

          wins:
            currentWins + 1

        }
        : {}
      )

    },

    member

  );


  const updatedUser =
    await ensureUser(
      userId,
      username,
      member
    );


  return {

    xp:
      Number(
        updatedUser.xp || 0
      ),

    level:
      Number(
        updatedUser.level || 1
      ),

    wins:
      Number(
        updatedUser.wins || 0
      ),

    xpChange:
      change

  };

}


/*
 * ============================================================
 * BOTONES
 * ============================================================
 */

function buildButtons(
  state
) {

  return new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()

        .setCustomId(
          `blackjack_hit_${state}`
        )

        .setLabel(
          "Pedir carta"
        )

        .setStyle(
          ButtonStyle.Primary
        ),


      new ButtonBuilder()

        .setCustomId(
          `blackjack_stand_${state}`
        )

        .setLabel(
          "Plantarse"
        )

        .setStyle(
          ButtonStyle.Success
        )

    );

}


/*
 * ============================================================
 * MODAL DE APUESTA
 * ============================================================
 */

function buildBetModal(
  maxBet
) {

  const modal =
    new ModalBuilder()

      .setCustomId(
        "blackjack_bet_modal"
      )

      .setTitle(
        "Apuesta de Blackjack"
      );


  const betInput =
    new TextInputBuilder()

      .setCustomId(
        "blackjack_bet"
      )

      .setLabel(
        `Cantidad a apostar (máx. ${maxBet})`
      )

      .setPlaceholder(
        `Introduce una cantidad entre ${MIN_BET} y ${maxBet}`
      )

      .setStyle(
        TextInputStyle.Short
      )

      .setRequired(
        true
      );


  const row =
    new ActionRowBuilder()
      .addComponents(
        betInput
      );


  modal.addComponents(
    row
  );


  return modal;

}


/*
 * ============================================================
 * EMBED
 * ============================================================
 */

function buildResultEmbed({

  description,

  playerCards,

  dealerCards,

  playerTotal,

  dealerTotal,

  score,

  note,

  bet = null,

  xpChange = null

}) {

  const embed =
    new EmbedBuilder()

      .setColor(
        "#2F3136"
      )

      .setTitle(
        "Blackjack"
      )

      .setDescription(
        description
      );


  if (
    bet !== null
  ) {

    embed.addFields({

      name:
        "💰 Apuesta",

      value:
        `**${bet} puntos**`,

      inline:
        true

    });

  }


  embed.addFields({

    name:
      "Tus cartas",

    value:
      `${renderHand(playerCards)}\n` +
      `Total: **${playerTotal}**`,

    inline:
      true

  });


  embed.addFields({

    name:
      "Cartas del crupier",

    value:
      `${renderHand(dealerCards)}\n` +
      `Total: **${dealerTotal}**`,

    inline:
      true

  });


  embed.addFields({

    name:
      "Puntuación",

    value:
      `**${score} puntos**`,

    inline:
      false

  });


  if (
    xpChange !== null
  ) {

    let xpText;


    if (
      xpChange > 0
    ) {

      xpText =
        `🟢 **+${xpChange} XP**`;

    } else if (
      xpChange < 0
    ) {

      xpText =
        `🔴 **${xpChange} XP**`;

    } else {

      xpText =
        `⚪ **0 XP**`;

    }


    embed.addFields({

      name:
        "Experiencia",

      value:
        xpText,

      inline:
        false

    });

  }


  if (note) {

    embed.addFields({

      name:
        "Resultado",

      value:
        note,

      inline:
        false

    });

  }


  return embed;

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
        "blackjack"
      )

      .setDescription(
        "Juega una partida de Blackjack apostando tus puntos"
      ),


  /*
   * ==========================================================
   * EJECUTAR BLACKJACK
   * ==========================================================
   */

  async execute(
    interaction
  ) {

    const dailyCommand =
      getDailyCommandName();


    if (
      dailyCommand !==
      "blackjack"
    ) {

      return interaction.reply({

        content:
          "❌ Hoy el minijuego de diario no es Blackjack. Usa `/diario` para saber cuál es el comando disponible.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    const user =
      await ensureUser(

        interaction.user.id,

        interaction.user.tag,

        interaction.member

      );


    const currentXp =
      Number(
        user.xp || 0
      );


    const maxBet =
      getMaxBet(
        currentXp
      );


    if (
      maxBet <
      MIN_BET
    ) {

      return interaction.reply({

        content:
          "❌ No tienes suficientes puntos para apostar.\n\nNecesitas al menos **7 XP** para poder realizar una apuesta del 15%.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    const today =
      normalizeDate(
        getLocalDateString()
      );


    const lastDailyDate =
      normalizeDate(
        user.last_daily_date
      );


    if (
      lastDailyDate ===
      today
    ) {

      return interaction.reply({

        content:
          "❌ **Ya has jugado tu minijuego diario hoy.**\n\n⏳ Vuelve mañana para jugar otra partida.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    return interaction.showModal(
      buildBetModal(
        maxBet
      )
    );

  },


  /*
   * ==========================================================
   * MODAL DE APUESTA
   * ==========================================================
   */

  async handleModalSubmit(
    interaction
  ) {

    if (
      interaction.customId !==
      "blackjack_bet_modal"
    ) {

      return;

    }


    await interaction.deferReply({

      flags:
        MessageFlags.Ephemeral

    });


    const dailyCommand =
      getDailyCommandName();


    if (
      dailyCommand !==
      "blackjack"
    ) {

      return interaction.editReply({

        content:
          "❌ Hoy el minijuego de diario ya no es Blackjack."

      });

    }


    const user =
      await ensureUser(

        interaction.user.id,

        interaction.user.tag,

        interaction.member

      );


    const currentXp =
      Number(
        user.xp || 0
      );


    const maxBet =
      getMaxBet(
        currentXp
      );


    const rawBet =
      interaction.fields.getTextInputValue(
        "blackjack_bet"
      );


    if (
      !/^\d+$/.test(
        String(rawBet).trim()
      )
    ) {

      return interaction.editReply({

        content:
          "❌ La apuesta debe ser un número entero."

      });

    }


    const bet =
      Number(
        String(rawBet).trim()
      );


    if (
      bet <
      MIN_BET
    ) {

      return interaction.editReply({

        content:
          `❌ La apuesta mínima es de **${MIN_BET} punto**.`

      });

    }


    if (
      bet >
      maxBet
    ) {

      return interaction.editReply({

        content:
          `❌ No puedes apostar más de **${maxBet} puntos**.\n\nTu apuesta máxima es el **15% de tu XP actual**.`

      });

    }


    const today =
      normalizeDate(
        getLocalDateString()
      );


    const latestUser =
      await ensureUser(

        interaction.user.id,

        interaction.user.tag,

        interaction.member

      );


    const latestLastDailyDate =
      normalizeDate(
        latestUser.last_daily_date
      );


    if (
      latestLastDailyDate ===
      today
    ) {

      return interaction.editReply({

        content:
          "❌ **Ya has jugado tu minijuego diario hoy.**\n\n⏳ Vuelve mañana para jugar otra partida."

      });

    }


    /*
     * ========================================================
     * REGISTRAR RACHA
     * ========================================================
     */

    let streakResult;


    try {

      streakResult =
        await registerDailyGame(
          interaction.user.id
        );

    } catch (error) {

      console.error(
        "Error registrando partida en la racha:",
        error
      );


      return interaction.editReply({

        content:
          "❌ Ha ocurrido un error al registrar tu partida. Inténtalo de nuevo."

      });

    }


    const streak =
      Number(
        streakResult.streak || 0
      );


    /*
     * ========================================================
     * MARCAR DIARIO COMO JUGADO
     * ========================================================
     */

    await updateUserFields(

      interaction.user.id,

      {

        last_daily_date:
          today

      },

      interaction.member

    );


    /*
     * ========================================================
     * CREAR PARTIDA
     * ========================================================
     */

    const seed =
      `${Date.now().toString(36)}${Math.floor(
        Math.random() * 100000
      ).toString(36)}`;


    const playerCount =
      2;


    const state =
      buildBlackjackState(

        interaction.user.id,

        today,

        seed,

        playerCount,

        bet

      );


    const {
      playerCards,
      dealerCards
    } =
      dealHands(

        seed,

        playerCount

      );


    const playerTotal =
      handValue(
        playerCards
      );


    const dealerTotal =
      handValue(
        dealerCards
      );


    /*
     * ========================================================
     * BLACKJACK INICIAL
     * ========================================================
     */

    if (
      playerTotal === 21
    ) {

      /*
       * EMPATE
       */

      if (
        dealerTotal === 21
      ) {

        const xpChange =
          0;


        await saveScore(

          interaction.user.id,

          interaction.user.tag,

          xpChange,

          false,

          interaction.member

        );


        const embed =
          buildResultEmbed({

            description:
              "🤝 Empate por Blackjack. Ambos tienen 21.",

            playerCards,

            dealerCards,

            playerTotal,

            dealerTotal,

            score:
              0,

            bet,

            xpChange,

            note:
              "No ganas ni pierdes la apuesta."

          });


        await interaction.editReply({

          embeds:
            [embed],

          components:
            []

        });


        return interaction.followUp({

          content:
            `🤝 ${interaction.user.username} ha empatado el Blackjack de hoy.`,

          flags:
            MessageFlags.SuppressNotifications

        });

      }


      /*
       * BLACKJACK
       */

      const basePrize =
        Math.floor(
          bet *
          PAYOUT_MULTIPLIERS.blackjack
        );


      const finalScore =
        getFinalScore(

          basePrize,

          streak

        );


      await saveScore(

        interaction.user.id,

        interaction.user.tag,

        finalScore,

        true,

        interaction.member

      );


      const embed =
        buildResultEmbed({

          description:
            "🃏 ¡Blackjack! Has vencido al crupier con 21.",

          playerCards,

          dealerCards,

          playerTotal,

          dealerTotal,

          score:
            finalScore,

          bet,

          xpChange:
            finalScore,

          note:
            `🎉 Blackjack: **+${finalScore} XP**`

        });


      await interaction.editReply({

        embeds:
          [embed],

        components:
          []

      });


      return interaction.followUp({

        content:
          `🃏 ${interaction.user.username} ha conseguido un Blackjack y ha ganado **${finalScore} puntos**.`,

        flags:
          MessageFlags.SuppressNotifications

      });

    }


    /*
     * ========================================================
     * CARTA OCULTA DEL CRUPIER
     * ========================================================
     */

    const hiddenDealerCards = [

      dealerCards[0],

      {

        rank:
          "?",

        suit:
          ""

      }

    ];


    const embed =
      buildResultEmbed({

        description:
          "Tu turno: pide carta o plántate. Si te pasas, pierdes la apuesta.",

        playerCards,

        dealerCards:
          hiddenDealerCards,

        playerTotal,

        dealerTotal:
          handValue([
            dealerCards[0]
          ]),

        score:
          "En juego",

        bet,

        note:
          "Pulsa **Pedir carta** o **Plantarse** para continuar."

      });


    return interaction.editReply({

      embeds:
        [embed],

      components:
        [
          buildButtons(
            state
          )
        ]

    });

  },


  /*
   * ==========================================================
   * BOTONES DEL BLACKJACK
   * ==========================================================
   */

  async handleButton(
    interaction
  ) {

    const parts =
      String(
        interaction.customId
      ).split("_");


    const command =
      parts[0];


    const action =
      parts[1];


    const stateString =
      parts
        .slice(2)
        .join("_");


    if (
      command !==
      "blackjack" ||
      ![
        "hit",
        "stand"
      ].includes(action)
    ) {

      return;

    }


    const {
      userId,
      date,
      seed,
      playerCount,
      bet
    } =
      parseBlackjackState(
        stateString
      );


    if (
      !userId ||
      !date ||
      !seed ||
      !Number.isInteger(playerCount) ||
      playerCount < 2 ||
      playerCount > 20 ||
      !Number.isInteger(bet) ||
      bet < MIN_BET
    ) {

      return interaction.reply({

        content:
          "❌ Esta partida de Blackjack ya no es válida.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    if (
      userId !==
      interaction.user.id
    ) {

      return interaction.reply({

        content:
          "❌ Esta partida de Blackjack no es tuya.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    const today =
      normalizeDate(
        getLocalDateString()
      );


    const gameDate =
      normalizeDate(
        date
      );


    if (
      gameDate !==
      today
    ) {

      return interaction.reply({

        content:
          "❌ Esta partida de Blackjack ha caducado. Solo puedes jugar el minijuego correspondiente al día actual.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    const dailyCommand =
      getDailyCommandName();


    if (
      dailyCommand !==
      "blackjack"
    ) {

      return interaction.reply({

        content:
          "❌ Hoy el minijuego de diario ya no es Blackjack.",

        flags:
          MessageFlags.Ephemeral

      });

    }


    await interaction.deferUpdate();


    const currentUser =
      await ensureUser(

        interaction.user.id,

        interaction.user.tag,

        interaction.member

      );


    const {
      playerCards,
      dealerCards,
      deck
    } =
      dealHands(

        seed,

        playerCount

      );


    const currentPlayerTotal =
      handValue(
        playerCards
      );


    /*
     * ========================================================
     * PEDIR CARTA
     * ========================================================
     */

    if (
      action ===
      "hit"
    ) {

      const nextCount =
        playerCount + 1;


      const nextCard =
        deck[
        4 +
        playerCount -
        2
        ];


      if (
        !nextCard
      ) {

        return interaction.editReply({

          content:
            "❌ No quedan cartas disponibles.",

          embeds:
            [],

          components:
            []

        });

      }


      const nextPlayerCards = [

        ...playerCards,

        nextCard

      ];


      const nextTotal =
        handValue(
          nextPlayerCards
        );


      /*
       * PASARSE
       */

      if (
        nextTotal > 21
      ) {

        const xpChange =
          -bet;


        await saveScore(

          interaction.user.id,

          interaction.user.tag,

          xpChange,

          false,

          interaction.member

        );


        const embed =
          buildResultEmbed({

            description:
              "💀 Te has pasado. Has perdido la apuesta.",

            playerCards:
              nextPlayerCards,

            dealerCards,

            playerTotal:
              nextTotal,

            dealerTotal:
              handValue(
                dealerCards
              ),

            score:
              0,

            bet,

            xpChange,

            note:
              `Has perdido **${Math.abs(xpChange)} XP**.`

          });


        await interaction.editReply({

          embeds:
            [embed],

          components:
            []

        });


        return interaction.followUp({

          content:
            `💀 ${interaction.user.username} ha perdido **${Math.abs(xpChange)} puntos** en Blackjack.`,

          flags:
            MessageFlags.SuppressNotifications

        });

      }


      /*
       * LLEGA A 21
       */

      if (
        nextTotal === 21
      ) {

        const finalDealerCards =
          dealerPlay(

            deck,

            nextCount

          );


        const dealerFinalTotal =
          handValue(
            finalDealerCards
          );


        const isTie =
          dealerFinalTotal === 21;


        const basePrize =
          isTie

            ? 0

            : Math.floor(
              bet *
              PAYOUT_MULTIPLIERS.win
            );


        const finalScore =
          isTie

            ? 0

            : getFinalScore(

              basePrize,

              Number(
                currentUser.daily_streak || 0
              )

            );


        await saveScore(

          interaction.user.id,

          interaction.user.tag,

          finalScore,

          !isTie,

          interaction.member

        );


        const description =
          isTie

            ? "🤝 Empate con 21."

            : "🎉 Has alcanzado 21. Has ganado contra el crupier.";


        const embed =
          buildResultEmbed({

            description,

            playerCards:
              nextPlayerCards,

            dealerCards:
              finalDealerCards,

            playerTotal:
              nextTotal,

            dealerTotal:
              dealerFinalTotal,

            score:
              finalScore,

            bet,

            xpChange:
              finalScore,

            note:

              isTie

                ? "No ganas ni pierdes la apuesta."

                : `Victoria: **+${finalScore} XP**`

          });


        await interaction.editReply({

          embeds:
            [embed],

          components:
            []

        });


        return interaction.followUp({

          content:

            isTie

              ? `🤝 ${interaction.user.username} ha empatado el Blackjack de hoy.`

              : `🎉 ${interaction.user.username} ha ganado **${finalScore} puntos** en Blackjack.`,

          flags:
            MessageFlags.SuppressNotifications

        });

      }


      /*
       * CONTINUAR PARTIDA
       */

      const nextState =
        buildBlackjackState(

          userId,

          date,

          seed,

          nextCount,

          bet

        );


      const nextEmbed =
        buildResultEmbed({

          description:
            "Sigue jugando o plántate. Si te pasas, pierdes la apuesta.",

          playerCards:
            nextPlayerCards,

          dealerCards: [

            dealerCards[0],

            {

              rank:
                "?",

              suit:
                ""

            }

          ],

          playerTotal:
            nextTotal,

          dealerTotal:
            handValue([
              dealerCards[0]
            ]),

          score:
            "En juego",

          bet,

          note:
            "Pulsa **Pedir carta** o **Plantarse**."

        });


      return interaction.editReply({

        embeds:
          [nextEmbed],

        components:
          [
            buildButtons(
              nextState
            )
          ]

      });

    }


    /*
     * ========================================================
     * PLANTARSE
     * ========================================================
     */

    const finalDealerCards =
      dealerPlay(

        deck,

        playerCount

      );


    const dealerFinalTotal =
      handValue(
        finalDealerCards
      );


    const playerFinalTotal =
      currentPlayerTotal;


    /*
     * ========================================================
     * OBTENER RACHA
     * ========================================================
     */

    const currentStreak =
      Number(
        currentUser.daily_streak || 0
      );


    let description;

    let finalScore;

    let xpChange;

    let note;

    let isWin =
      false;


    /*
     * VICTORIA
     */

    if (

      dealerFinalTotal > 21 ||

      playerFinalTotal >
      dealerFinalTotal

    ) {

      description =
        "🎉 Has ganado al crupier.";


      const basePrize =
        Math.floor(
          bet *
          PAYOUT_MULTIPLIERS.win
        );


      finalScore =
        getFinalScore(

          basePrize,

          currentStreak

        );


      xpChange =
        finalScore;


      note =
        `Victoria: **+${finalScore} XP**`;


      isWin =
        true;

    }


    /*
     * EMPATE
     */

    else if (

      playerFinalTotal ===
      dealerFinalTotal

    ) {

      description =
        "🤝 Empate con el crupier.";


      finalScore =
        0;


      xpChange =
        0;


      note =
        "No ganas ni pierdes la apuesta.";

    }


    /*
     * DERROTA
     */

    else {

      description =
        "💀 El crupier ha ganado.";


      finalScore =
        0;


      xpChange =
        -bet;


      note =
        `Has perdido **${Math.abs(xpChange)} XP**.`;

    }


    /*
     * ========================================================
     * GUARDAR RESULTADO
     * ========================================================
     */

    await saveScore(

      interaction.user.id,

      interaction.user.tag,

      xpChange,

      isWin,

      interaction.member

    );


    /*
     * ========================================================
     * RESULTADO FINAL
     * ========================================================
     */

    const embed =
      buildResultEmbed({

        description,

        playerCards,

        dealerCards:
          finalDealerCards,

        playerTotal:
          playerFinalTotal,

        dealerTotal:
          dealerFinalTotal,

        score:
          finalScore,

        bet,

        xpChange,

        note

      });


    await interaction.editReply({

      embeds:
        [embed],

      components:
        []

    });


    return interaction.followUp({

      content:

        xpChange < 0

          ? `💀 ${interaction.user.username} ha perdido **${Math.abs(xpChange)} puntos** en Blackjack.`

          : xpChange === 0

            ? `🤝 ${interaction.user.username} ha empatado el Blackjack de hoy.`

            : `🎉 ${interaction.user.username} ha ganado **${xpChange} puntos** en Blackjack.`,

      flags:
        MessageFlags.SuppressNotifications

    });

  }

};
