const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hola")
        .setDescription("Saluda al usuario"),

    async execute(interaction) {
        await interaction.reply("¡Hola!");
    }
};
