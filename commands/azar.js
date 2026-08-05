const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("azar")
        .setDescription("Elige un elemento al azar")
        .addStringOption(option =>
            option
                .setName("elementos")
                .setDescription("Escribe los elementos separados por comas")
                .setRequired(true)
        ),

    async execute(interaction) {

        const texto = interaction.options.getString("elementos");

        const elementos = texto
            .split(",")
            .map(elemento => elemento.trim())
            .filter(elemento => elemento.length > 0);

        if (elementos.length < 2) {
            return interaction.reply({
                content: "❌ Debes escribir al menos dos elementos separados por comas.",
                ephemeral: true
            });
        }

        const elegir = () =>
            elementos[Math.floor(Math.random() * elementos.length)];

        const crearEmbed = (resultado) => {
            return new EmbedBuilder()
                .setTitle("🎲 Ruleta del Azar")
                .addFields(
                    {
                        name: "📋 Opciones",
                        value: elementos.map(e => `• ${e}`).join("\n")
                    },
                    {
                        name: "🏆 Resultado",
                        value: `**${resultado}**`
                    }
                )
                .setColor(0x5865F2)
                .setFooter({
                    text: `${elementos.length} elementos`
                });
        };

        const boton = new ButtonBuilder()
            .setCustomId("girar")
            .setLabel("Girar otra vez")
            .setEmoji("🎲")
            .setStyle(ButtonStyle.Primary);

        const fila = new ActionRowBuilder().addComponents(boton);

        await interaction.reply({
            embeds: [crearEmbed(elegir())],
            components: [fila]
        });

        const mensaje = await interaction.fetchReply();

        const collector = mensaje.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutos
        });

        collector.on("collect", async i => {

            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Solo quien ejecutó el comando puede volver a girar.",
                    ephemeral: true
                });
            }

            await i.update({
                embeds: [crearEmbed(elegir())],
                components: [fila]
            });

        });

        collector.on("end", async () => {

            boton.setDisabled(true);

            await mensaje.edit({
                components: [new ActionRowBuilder().addComponents(boton)]
            }).catch(() => { });

        });

    }
};