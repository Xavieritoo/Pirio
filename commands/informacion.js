const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

/*
 * ============================================================
 * CANAL DONDE SE PUBLICA LA INFORMACIÓN
 * ============================================================
 */

const INFO_CHANNEL_ID =
  "1063120769577648270";

/*
 * ============================================================
 * ROLES DEL CANAL #1037519793735077979
 * ============================================================
 */

const CHANNEL_ROLES = [
  "951095525258698813",
  "951096325066346576",
  "951096954669113344",
  "951097247712559105",
  "951098157956202526",
  "997518022354935943",
  "951098419844374599",
  "951098802436177990"
];

/*
 * ============================================================
 * ROLES GENERALES CON DESCRIPCIÓN
 * ============================================================
 */

const GENERAL_ROLES = [
  { id: "1010202184060776499", description: "Este es el rol más básico, el que se gana al entrar al servidor y verificarte." },
  { id: "949386166292054056", description: "Solo para los que tengan herman@s dentro del servidor." },
  { id: "940728271841165312", description: "Este rol es para quienes hagan contenido para Twitch y lleven un tiempo considerable en el servidor." },
  { id: "940723606198038609", description: "Son bots que permiten opciones que Discord mismo no deja." },
  { id: "985596850864271380", description: "Te permite tener un rol adicional propio, solo los <@&940712890447581194> pueden considerar atribuírtelo." },
  { id: "940718860473081896", description: "Te permite tener un rol adicional propio, es exclusivo para los primeros integrantes de Pirio." },
  { id: "940717925147476040", description: "Este rol es únicamente para <@624273705295413258>." },
  { id: "1056629179195609118", description: "Rol para los que mejoran el servidor." },
  { id: "940712890447581194", description: "Este rol es únicamente para <@379238508507955212> y <@590641060405837865>." }
];

/*
 * ============================================================
 * ROL QUE PUEDE USAR EL COMANDO (MODERADORES)
 * ============================================================
 */

const MODERATOR_ROLE_ID =
  "940712890447581194";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("informacion")
    .setDescription("Publica la información de roles del servidor en su canal")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers
    ),

  async execute(interaction) {
    /*
     * ========================================================
     * COMPROBAR ROL DE MODERADOR
     * ========================================================
     */

    if (
      !interaction.member.roles.cache.has(
        MODERATOR_ROLE_ID
      )
    ) {
      return interaction.reply({
        content:
          "❌ No tienes permisos para utilizar este comando.",
        ephemeral: true
      });
    }

    const channel = await interaction.client.channels.fetch(
      INFO_CHANNEL_ID
    );

    const embed = new EmbedBuilder()
      .setColor("#c52ef3")
      .setTitle("📋 Información de roles")
      .addFields(
        {
          name: "✨ Roles de <#1037519793735077979>:",
          value:
            CHANNEL_ROLES.map((id) => `<@&${id}>`).join("\n") +
            "\n\n──────────────  ✦  ──────────────"
        },
        {
          name: "⚙️ Roles generales:",
          value: GENERAL_ROLES.map(
            (role) => `**<@&${role.id}>** — ${role.description}`
          ).join("\n")
        }
      )
      .setFooter({
        text: `Pirio • Información de roles`
      });

    await channel.send({
      embeds: [embed]
    });

    return interaction.reply({
      content: `✅ Información de roles publicada en <#${INFO_CHANNEL_ID}>.`,
      ephemeral: true
    });
  }
};