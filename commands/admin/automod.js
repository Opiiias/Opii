const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { ServerConfig, BannedWord } = require("../../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Podešavanja Auto-Moderatora.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName("toggle").setDescription("Uključi/isključi AutoMod.")
        .addBooleanOption((opt) =>
          opt.setName("stanje").setDescription("true = ON, false = OFF").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("setlog").setDescription("Postavi mod-log kanal.")
        .addChannelOption((opt) =>
          opt.setName("kanal").setDescription("Kanal za mod logove").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("setannounce").setDescription("Postavi kanal za web-app notifikacije.")
        .addChannelOption((opt) =>
          opt.setName("kanal").setDescription("Announcement kanal").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("addword").setDescription("Dodaj zabranjenu reč.")
        .addStringOption((opt) =>
          opt.setName("rec").setDescription("Reč za dodavanje").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("removeword").setDescription("Ukloni zabranjenu reč.")
        .addStringOption((opt) =>
          opt.setName("rec").setDescription("Reč za uklanjanje").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("listwords").setDescription("Lista zabranjenih reči.")
    )
    .addSubcommand((sub) =>
      sub.setName("action").setDescription("Postavi akciju za filter.")
        .addStringOption((opt) =>
          opt.setName("filter").setDescription("Koji filter?").setRequired(true)
            .addChoices(
              { name: "Zabranjene reči", value: "bannedWords" },
              { name: "Anti-spam", value: "antiSpam" }
            )
        )
        .addStringOption((opt) =>
          opt.setName("akcija").setDescription("Akcija").setRequired(true)
            .addChoices(
              { name: "Samo obriši", value: "delete" },
              { name: "Upozorenje", value: "warn" },
              { name: "Timeout", value: "timeout" },
              { name: "Kick", value: "kick" },
              { name: "Ban", value: "ban" }
            )
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    await ServerConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId, guildName: interaction.guild.name } },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii AutoMod" });

    if (sub === "toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "autoMod.enabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c)
        .setTitle(`🤖 AutoMod ${stanje ? "UKLJUČEN" : "ISKLJUČEN"}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "setlog") {
      const ch = interaction.options.getChannel("kanal");
      await ServerConfig.updateOne({ guildId }, { modLogChannelId: ch.id });
      embed.setColor(0x3498db).setTitle("📋 Mod Log Kanal Postavljen")
        .setDescription(`Kanal: <#${ch.id}>`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "setannounce") {
      const ch = interaction.options.getChannel("kanal");
      await ServerConfig.updateOne({ guildId }, { announcementChannelId: ch.id });
      embed.setColor(0x3498db).setTitle("📢 Announcement Kanal Postavljen")
        .setDescription(`Kanal: <#${ch.id}>`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "addword") {
      const word = interaction.options.getString("rec").toLowerCase().trim();
      try {
        await BannedWord.create({ guildId, word, addedBy: interaction.user.id });
        embed.setColor(0xe74c3c).setTitle("🚫 Reč dodana").setDescription(`**${word}**`);
      } catch {
        embed.setColor(0xe74c3c).setTitle("⚠️ Reč već postoji na listi.");
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "removeword") {
      const word = interaction.options.getString("rec").toLowerCase().trim();
      const result = await BannedWord.deleteOne({ guildId, word });
      embed.setColor(0x2ecc71).setTitle(
        result.deletedCount > 0 ? `✅ Reč "${word}" uklonjena.` : `⚠️ Reč "${word}" nije pronađena.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "listwords") {
      const words = await BannedWord.find({ guildId }).select("word");
      const lista = words.length > 0
        ? words.map((w) => `\`${w.word}\``).join(", ")
        : "Lista je prazna.";
      embed.setColor(0xf39c12).setTitle("📋 Zabranjene Reči").setDescription(lista);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "action") {
      const filter = interaction.options.getString("filter");
      const akcija = interaction.options.getString("akcija");
      await ServerConfig.updateOne({ guildId }, { [`autoMod.${filter}.action`]: akcija });
      embed.setColor(0x9b59b6).setTitle("⚙️ Akcija Ažurirana")
        .addFields(
          { name: "Filter", value: filter, inline: true },
          { name: "Nova akcija", value: akcija.toUpperCase(), inline: true }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};