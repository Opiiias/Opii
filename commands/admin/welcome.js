const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { ServerConfig } = require("../../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Podešavanja za welcome/leave poruke")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub => sub
      .setName("set-channel")
      .setDescription("Postavi welcome kanal")
      .addChannelOption(opt => opt.setName("kanal").setDescription("Kanal").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-message")
      .setDescription("Welcome poruka ({user}, {username}, {server}, {membercount})")
      .addStringOption(opt => opt.setName("poruka").setDescription("Poruka").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-color")
      .setDescription("Boja welcome embeda (hex, npr. #2ecc71)")
      .addStringOption(opt => opt.setName("boja").setDescription("Hex boja").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("toggle")
      .setDescription("Uključi/isključi welcome poruke")
      .addBooleanOption(opt => opt.setName("stanje").setDescription("true/false").setRequired(true)))

    .addSubcommand(sub => sub
      .setName("leave-channel")
      .setDescription("Postavi leave kanal")
      .addChannelOption(opt => opt.setName("kanal").setDescription("Kanal").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("leave-message")
      .setDescription("Leave poruka ({user}, {username}, {server}, {membercount})")
      .addStringOption(opt => opt.setName("poruka").setDescription("Poruka").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("leave-color")
      .setDescription("Boja leave embeda (hex, npr. #e74c3c)")
      .addStringOption(opt => opt.setName("boja").setDescription("Hex boja").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("leave-toggle")
      .setDescription("Uključi/isključi leave poruke")
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
      const ch = interaction.options.getChannel("kanal");
      await ServerConfig.updateOne({ guildId }, { "welcome.channelId": ch.id });
      embed.setColor(0x3498db).setTitle("✅ Welcome kanal postavljen").setDescription(`<#${ch.id}>`);
    }
    else if (sub === "set-message") {
      const msg = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "welcome.message": msg });
      embed.setColor(0x3498db).setTitle("✅ Welcome poruka postavljena").setDescription(`\`${msg}\``);
    }
    else if (sub === "set-color") {
      const boja = interaction.options.getString("boja");
      await ServerConfig.updateOne({ guildId }, { "welcome.color": boja });
      embed.setColor(boja).setTitle("✅ Welcome boja postavljena").setDescription(boja);
    }
    else if (sub === "toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "welcome.enabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Welcome ${stanje ? "✅ UKLJUČEN" : "❌ ISKLJUČEN"}`);
    }
    else if (sub === "leave-channel") {
      const ch = interaction.options.getChannel("kanal");
      await ServerConfig.updateOne({ guildId }, { "leave.channelId": ch.id });
      embed.setColor(0x3498db).setTitle("✅ Leave kanal postavljen").setDescription(`<#${ch.id}>`);
    }
    else if (sub === "leave-message") {
      const msg = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "leave.message": msg });
      embed.setColor(0x3498db).setTitle("✅ Leave poruka postavljena").setDescription(`\`${msg}\``);
    }
    else if (sub === "leave-color") {
      const boja = interaction.options.getString("boja");
      await ServerConfig.updateOne({ guildId }, { "leave.color": boja });
      embed.setColor(boja).setTitle("✅ Leave boja postavljena").setDescription(boja);
    }
    else if (sub === "leave-toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "leave.enabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Leave ${stanje ? "✅ UKLJUČEN" : "❌ ISKLJUČEN"}`);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};