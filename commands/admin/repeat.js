const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { ServerConfig } = require("../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Podešavanja za automatske poruke")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName("set-channel")
      .setDescription("Postavi kanale za automatske poruke (odvoji zarezom: #kanal1, #kanal2)")
      .addStringOption(opt => opt.setName("kanali").setDescription("Kanali odvojeni zarezom").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-interval")
      .setDescription("Na koliko poruka Opii šalje poruku")
      .addIntegerOption(opt => opt.setName("broj").setDescription("Broj poruka").setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub
      .setName("set-message")
      .setDescription("Poruka koju Opii šalje")
      .addStringOption(opt => opt.setName("poruka").setDescription("Tekst poruke").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-color")
      .setDescription("Boja embeda (hex, npr. #2ecc71)")
      .addStringOption(opt => opt.setName("boja").setDescription("Hex boja").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-image")
      .setDescription("Slika u poruci (link)")
      .addStringOption(opt => opt.setName("link").setDescription("URL slike").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-url")
      .setDescription("Link u poruci")
      .addStringOption(opt => opt.setName("url").setDescription("URL").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-mention")
      .setDescription("Tag role ili usera")
      .addMentionableOption(opt => opt.setName("tag").setDescription("Role ili user").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("toggle")
      .setDescription("Uključi/isključi automatske poruke")
      .addBooleanOption(opt => opt.setName("stanje").setDescription("true/false").setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Bot" });

    await ServerConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId, guildName: interaction.guild.name } },
      { upsert: true, new: true }
    );

    if (sub === "set-channel") {
      const input = interaction.options.getString("kanali");
      const ids = input.match(/\d{17,20}/g);

      if (!ids || ids.length === 0) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Nisi uneo validne kanale!");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await ServerConfig.updateOne({ guildId }, { "repeat.channelIds": ids });
      embed.setColor(0x3498db).setTitle("✅ Repeat kanali postavljeni").setDescription(ids.map(id => `<#${id}>`).join(", "));
    } else if (sub === "set-interval") {
      const broj = interaction.options.getInteger("broj");
      await ServerConfig.updateOne({ guildId }, { "repeat.interval": broj });
      embed.setColor(0x3498db).setTitle("✅ Interval postavljen").setDescription(`Svaka **${broj}** poruka`);
    } else if (sub === "set-message") {
      const msg = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "repeat.message": msg });
      embed.setColor(0x3498db).setTitle("✅ Poruka postavljena").setDescription(`\`${msg}\``);
    } else if (sub === "set-color") {
      const boja = interaction.options.getString("boja");
      await ServerConfig.updateOne({ guildId }, { "repeat.color": boja });
      embed.setColor(boja).setTitle("✅ Boja postavljena").setDescription(boja);
    } else if (sub === "set-image") {
      const link = interaction.options.getString("link");
      await ServerConfig.updateOne({ guildId }, { "repeat.image": link });
      embed.setColor(0x3498db).setTitle("✅ Slika postavljena").setDescription(link);
    } else if (sub === "set-url") {
      const url = interaction.options.getString("url");
      await ServerConfig.updateOne({ guildId }, { "repeat.url": url });
      embed.setColor(0x3498db).setTitle("✅ Link postavljen").setDescription(url);
    } else if (sub === "set-mention") {
      const tag = interaction.options.getMentionable("tag");
      const mentionStr = tag.toString();
      await ServerConfig.updateOne({ guildId }, { "repeat.mention": mentionStr });
      embed.setColor(0x3498db).setTitle("✅ Mention postavljen").setDescription(mentionStr);
    } else if (sub === "toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "repeat.enabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Repeat ${stanje ? "✅ UKLJUČEN" : "❌ ISKLJUČEN"}`);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};