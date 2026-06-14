const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { LogConfig } = require("../../schemas");

const LOG_TYPES = [
  { name: "👋 Član ušao", value: "memberJoin" },
  { name: "🚪 Član izašao", value: "memberLeave" },
  { name: "🗑️ Poruka obrisana", value: "messagDelete" },
  { name: "✏️ Poruka izmenjena", value: "messageEdit" },
  { name: "🔨 Ban", value: "memberBan" },
  { name: "✅ Unban", value: "memberUnban" },
  { name: "🎭 Uloga promenjena", value: "roleUpdate" },
  { name: "🔇 Timeout", value: "timeout" },
  { name: "📝 Kanal kreiran", value: "channelCreate" },
  { name: "❌ Kanal obrisan", value: "channelDelete" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Podešavanje log sistema.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand((sub) =>
      sub.setName("podesi").setDescription("Podesi kanal i boju za log.")
        .addStringOption((opt) => {
          opt.setName("tip").setDescription("Tip loga").setRequired(true);
          LOG_TYPES.forEach((t) => opt.addChoices({ name: t.name, value: t.value }));
          return opt;
        })
        .addChannelOption((opt) =>
          opt.setName("kanal").setDescription("Kanal za log").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("boja").setDescription("Hex boja npr. #FF5733").setRequired(false)
        )
    )

    .addSubcommand((sub) =>
      sub.setName("toggle").setDescription("Uključi/isključi određeni log.")
        .addStringOption((opt) => {
          opt.setName("tip").setDescription("Tip loga").setRequired(true);
          LOG_TYPES.forEach((t) => opt.addChoices({ name: t.name, value: t.value }));
          return opt;
        })
        .addBooleanOption((opt) =>
          opt.setName("stanje").setDescription("true = ON, false = OFF").setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Prikaži status svih logova.")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Logs" });

    if (sub === "podesi") {
      const tip = interaction.options.getString("tip");
      const ch = interaction.options.getChannel("kanal");
      const boja = interaction.options.getString("boja") || null;

      const update = {
        [`logs.${tip}.channelId`]: ch.id,
        [`logs.${tip}.enabled`]: true,
      };
      if (boja) update[`logs.${tip}.color`] = boja;

      await LogConfig.findOneAndUpdate(
        { guildId },
        { $set: update },
        { upsert: true, new: true }
      );

      embed.setColor(0x2ecc71)
        .setTitle("✅ Log Podešen")
        .addFields(
          { name: "Tip", value: LOG_TYPES.find(t => t.value === tip)?.name || tip, inline: true },
          { name: "Kanal", value: `<#${ch.id}>`, inline: true },
          { name: "Status", value: "✅ Uključen", inline: true }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "toggle") {
      const tip = interaction.options.getString("tip");
      const stanje = interaction.options.getBoolean("stanje");

      await LogConfig.findOneAndUpdate(
        { guildId },
        { $set: { [`logs.${tip}.enabled`]: stanje } },
        { upsert: true, new: true }
      );

      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c)
        .setTitle(`Log ${stanje ? "UKLJUČEN" : "ISKLJUČEN"}`)
        .setDescription(`**${LOG_TYPES.find(t => t.value === tip)?.name}** je sada ${stanje ? "✅ aktivan" : "❌ isključen"}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "status") {
      const config = await LogConfig.findOne({ guildId });

      if (!config) {
        embed.setColor(0xe74c3c).setTitle("❌ Logovi nisu podešeni.");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const lines = LOG_TYPES.map((t) => {
        const log = config.logs[t.value];
        const status = log?.enabled ? "✅" : "❌";
        const kanal = log?.channelId ? `<#${log.channelId}>` : "nije podešen";
        return `${status} ${t.name} → ${kanal}`;
      });

      embed.setColor(0x3498db)
        .setTitle("📋 Status Logova")
        .setDescription(lines.join("\n"));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};