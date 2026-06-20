const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const { ServerConfig } = require("../../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verifysetup")
    .setDescription("Podešavanja za verifikacioni sistem")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub => sub
      .setName("set-title")
      .setDescription("Postavi naslov verifikacione poruke")
      .addStringOption(opt => opt.setName("naslov").setDescription("Naslov").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-message")
      .setDescription("Postavi tekst verifikacione poruke")
      .addStringOption(opt => opt.setName("poruka").setDescription("Poruka").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-button")
      .setDescription("Postavi tekst dugmeta")
      .addStringOption(opt => opt.setName("tekst").setDescription("Tekst dugmeta").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-color")
      .setDescription("Postavi boju embeda (hex, npr. #5865F2)")
      .addStringOption(opt => opt.setName("boja").setDescription("Hex boja").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("lock-channels")
      .setDescription("Uključi/isključi zaključavanje kanala za neverifikovane")
      .addBooleanOption(opt => opt.setName("stanje").setDescription("true/false").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("send")
      .setDescription("Pošalji verifikacionu poruku u kanal")
      .addChannelOption(opt => opt.setName("kanal").setDescription("Kanal").setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Bot" });

    let config = await ServerConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId, guildName: interaction.guild.name } },
      { upsert: true, new: true }
    );

    if (sub === "set-title") {
      const naslov = interaction.options.getString("naslov");
      await ServerConfig.updateOne({ guildId }, { "verify.title": naslov });
      embed.setColor(0x3498db).setTitle("✅ Naslov postavljen").setDescription(naslov);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "set-message") {
      const poruka = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "verify.message": poruka });
      embed.setColor(0x3498db).setTitle("✅ Poruka postavljena").setDescription(poruka);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "set-button") {
      const tekst = interaction.options.getString("tekst");
      await ServerConfig.updateOne({ guildId }, { "verify.buttonText": tekst });
      embed.setColor(0x3498db).setTitle("✅ Tekst dugmeta postavljen").setDescription(tekst);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "set-color") {
      const boja = interaction.options.getString("boja");
      await ServerConfig.updateOne({ guildId }, { "verify.color": boja });
      embed.setColor(boja).setTitle("✅ Boja postavljena").setDescription(boja);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "lock-channels") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "verify.lockChannels": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Zaključavanje kanala ${stanje ? "✅ UKLJUČENO" : "❌ ISKLJUČENO"}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "send") {
      const channel = interaction.options.getChannel("kanal");

      // Kreiraj rolu "Verified" ako ne postoji
      let role = interaction.guild.roles.cache.find(r => r.id === config.verify.roleId);
      if (!role) {
        role = await interaction.guild.roles.create({
          name: "Verified",
          color: "Green",
          reason: "Automatski kreirana verifikaciona rola",
        });
        await ServerConfig.updateOne({ guildId }, { "verify.roleId": role.id, "verify.enabled": true, "verify.channelId": channel.id });
      } else {
        await ServerConfig.updateOne({ guildId }, { "verify.enabled": true, "verify.channelId": channel.id });
      }

      // Učitaj svežu konfiguraciju
      config = await ServerConfig.findOne({ guildId });

      const verifyEmbed = new EmbedBuilder()
        .setColor(config.verify.color || "#5865F2")
        .setTitle(config.verify.title || "✅ Verifikacija")
        .setDescription(config.verify.message || "Klikni dugme ispod da se verifikuješ!")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(config.verify.buttonText || "Verifikacija")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://opii.onrender.com/api/auth/discord/redirect?guildId=${guildId}`)
      );

      await channel.send({ embeds: [verifyEmbed], components: [row] });

      embed.setColor(0x2ecc71).setTitle("✅ Verifikaciona poruka poslata").setDescription(`Poslato u <#${channel.id}>`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};