const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { ServerConfig } = require("../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tagi")
    .setDescription("Sistem za automatsko tagovanje")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("postavi")
        .setDescription("Postavi tag i vreme slanja")
        .addStringOption((opt) =>
          opt.setName("tag").setDescription("Tag koji se šalje (npr. @everyone)").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("sekunde").setDescription("Na koliko sekundi se šalje tag").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("brisanje").setDescription("Posle koliko sekundi se briše poslata poruka (ostavi prazno = bez brisanja)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("kanali-dodaj")
        .setDescription("Dodaj kanale za tagovanje (npr. #kanal1, #kanal2)")
        .addStringOption((opt) =>
          opt.setName("kanali").setDescription("Kanali odvojeni zarezom").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("kanali-obrisi")
        .setDescription("Obriši kanale iz liste")
        .addStringOption((opt) =>
          opt.setName("kanali").setDescription("Kanali odvojeni zarezom").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("ukljuci")
        .setDescription("Uključi automatsko tagovanje")
    )
    .addSubcommand((sub) =>
      sub
        .setName("iskljuci")
        .setDescription("Isključi automatsko tagovanje")
    )
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Prikaži trenutna podešavanja")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Bot" });

    if (sub === "postavi") {
      const tag = interaction.options.getString("tag");
      const sekunde = interaction.options.getInteger("sekunde");
      const brisanje = interaction.options.getInteger("brisanje"); // može biti null

      if (sekunde < 1) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Interval mora biti najmanje 1 sekunda!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (brisanje !== null && brisanje < 1) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Vreme brisanja mora biti najmanje 1 sekunda!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await ServerConfig.updateOne(
        { guildId },
        { $set: { "tagi.tag": tag, "tagi.interval": sekunde, "tagi.autoDelete": brisanje || null } },
        { upsert: true }
      );

      embed.setColor(0x2ecc71)
        .setTitle("✅ Tag postavljen")
        .setDescription(
          `**Tag:** ${tag}\n**Interval:** svakih ${sekunde} sekundi\n**Brisanje poruke:** ${brisanje ? `posle ${brisanje} sekundi` : "isključeno"}`
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "kanali-dodaj") {
      const input = interaction.options.getString("kanali");
      const ids = input.match(/\d{17,20}/g);

      if (!ids || ids.length === 0) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Nisi uneo validne kanale!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await ServerConfig.updateOne(
        { guildId },
        { $addToSet: { "tagi.kanali": { $each: ids } } },
        { upsert: true }
      );

      embed.setColor(0x2ecc71)
        .setTitle("✅ Kanali dodati")
        .setDescription(ids.map(id => `<#${id}>`).join(", "));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "kanali-obrisi") {
      const input = interaction.options.getString("kanali");
      const ids = input.match(/\d{17,20}/g);

      if (!ids || ids.length === 0) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Nisi uneo validne kanale!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await ServerConfig.updateOne(
        { guildId },
        { $pull: { "tagi.kanali": { $in: ids } } }
      );

      embed.setColor(0x2ecc71)
        .setTitle("✅ Kanali obrisani")
        .setDescription(ids.map(id => `<#${id}>`).join(", "));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "ukljuci") {
      const config = await ServerConfig.findOne({ guildId });

      if (!config?.tagi?.tag) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Prvo postavi tag sa `/tagi postavi`!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      if (!config?.tagi?.kanali?.length) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Prvo dodaj kanale sa `/tagi kanali-dodaj`!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await ServerConfig.updateOne({ guildId }, { $set: { "tagi.enabled": true } });

      embed.setColor(0x2ecc71).setTitle("✅ Tagovanje uključeno")
        .setDescription(`Tag **${config.tagi.tag}** će se slati svakih **${config.tagi.interval}** sekundi.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "iskljuci") {
      await ServerConfig.updateOne({ guildId }, { $set: { "tagi.enabled": false } });

      embed.setColor(0xe74c3c).setTitle("🔴 Tagovanje isključeno");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "info") {
      const config = await ServerConfig.findOne({ guildId });
      const tagi = config?.tagi;

      embed.setColor(0x5865f2).setTitle("📋 Tagi podešavanja")
        .addFields(
          { name: "Status", value: tagi?.enabled ? "🟢 Uključeno" : "🔴 Isključeno" },
          { name: "Tag", value: tagi?.tag || "Nije postavljen" },
          { name: "Interval", value: tagi?.interval ? `${tagi.interval} sekundi` : "Nije postavljen" },
          { name: "Brisanje poruke", value: tagi?.autoDelete ? `${tagi.autoDelete} sekundi nakon slanja` : "Isključeno" },
          { name: "Kanali", value: tagi?.kanali?.length ? tagi.kanali.map(id => `<#${id}>`).join(", ") : "Nema kanala" }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};