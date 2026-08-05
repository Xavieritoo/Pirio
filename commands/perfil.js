const { SlashCommandBuilder } = require("discord.js");
const { ensureUser } = require("../database/users");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Muestra tus puntos y partidas ganadas"),

  async execute(interaction) {
    const user = await ensureUser(interaction.user.id, interaction.user.tag);

    return interaction.reply({
      content: `📊 Perfil de <@${interaction.user.id}>:\n\n` +
        `• Puntos: **${user.points}**\n` +
        `• Partidas ganadas: **${user.wins}**`,
      ephemeral: false
    });
  }
};
