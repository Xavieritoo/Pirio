const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Te explica cómo funciona el sistema del bot"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#c52ef3")
      .setTitle("¿Cómo funciona Pirio?")
      .setDescription(
        "Este bot tiene un sistema de experiencia diaria. Cada día progresa tu cuenta, y tú decides cuánto aprovecharlo. Aquí te explico lo esencial con el que podrás empezar hoy mismo."
      )
      .addFields(
        {
          name: "⛏️ `Minar`",
          value:
            "Una vez al día puedes usar **/minar** para excavar en busca de minerales. Los minerales tienen distintos valores: cuanto más raro sea lo que encuentres, **más experiencia (XP)** ganarás. Solo puedes minar **una vez al día**, así que no olvides pasar por la mina cada jornada."
        },
        {
          name: "🔥 `Racha diaria`",
          value:
            "Cada día que completes el minijuego diario, sumas **un día a tu racha**. Si te saltas un día, la racha **se reinicia desde cero**. Cuanto más larga sea tu racha, **mayores serán tus recompensas**: se aplica un bonus de experiencia que mejora cuantos más días consecutivos lleves jugando, además de conseguir mejores recompensar en la mina. ¡La constancia tiene premio!"
        },
        {
          name: "🎯 `Diario`",
          value:
            "Cada día hay **un minijuego distinto**. Usa **/diario** para saber cuál es el de hoy y cómo se juega. No te adelanto cuáles son: la sorpresa es parte de la diversión. ¡Ser más activo y jugar a diario es lo que hará crecer a tu cuenta más rápido!"
        },
        {
          name: "🏁 `Para empezar`",
          value:
            "Mira tu progreso con **/perfil** y consulta el ranking de jugadores con **/top**. Si tienes dudas sobre algún comando, este siempre está a tu disposición con **/help**. ¡Disfruta del día!"
        }
      )
      .setFooter({
        text: "Pirio • Buena suerte con tu racha"
      });

    return interaction.reply({
      embeds: [embed]
    });
  }
};