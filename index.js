require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
    Client,
    GatewayIntentBits,
    Collection,
    Events
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) {
        console.warn(`El comando ${file} no exporta "data" o "execute".`);
        continue;
    }

    client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, () => {
    console.log(`Conectado como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error ejecutando el comando ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "❌ Ocurrió un error al ejecutar este comando.",
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: "❌ Ocurrió un error al ejecutar este comando.",
                ephemeral: true
            });
        }
    }

});

client.login(process.env.TOKEN);

