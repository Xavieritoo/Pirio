const { SlashCommandBuilder } = require("discord.js");
const { getTopUsers } = require("../database/users");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("Muestra el ranking top 10 de jugadores por puntos"),

  async execute(interaction) {
    const topUsers = await getTopUsers(10);

    if (!topUsers.length) {
      return interaction.reply({
        content: "No hay jugadores registrados todavía.",
        ephemeral: true
      });
    }

    const lines = topUsers.map((user, index) =>
      `**${index + 1}.** ${user.username} — **${user.points}** puntos`
    );

    return interaction.reply({
      content: `🏆 **Top 10 jugadores**\n\n${lines.join("\n")}`,
      ephemeral: false
    });
  }
};
