const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { ServerConfig } = require("../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Podešavanja za welcome/leave poruke")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName("add-channels")
      .setDescription("Dodaj welcome kanale (odvoji zarezom: #kanal1,#kanal2)")
      .addStringOption(opt => opt.setName("kanali").setDescription("Kanali odvojeni zarezom").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("remove-channel")
      .setDescription("Ukloni welcome kanal")
      .addChannelOption(opt => opt.setName("kanal").setDescription("Kanal").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("list-channels")
      .setDescription("Prikaži sve welcome kanale"))
    .addSubcommand(sub => sub
      .setName("set-message")
      .setDescription("Welcome poruka ({user}, {username}, {server}, {membercount})")
      .addStringOption(opt => opt.setName("poruka").setDescription("Poruka").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-color")
      .setDescription("Boja welcome embeda (hex, npr. #2ecc71)")
      .addStringOption(opt => opt.setName("boja").setDescription("Hex boja").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-timer")
      .setDescription("Koliko sekundi da poruka ostane (0 = ne briše se)")
      .addIntegerOption(opt => opt.setName("sekunde").setDescription("Sekunde").setRequired(true).setMinValue(0)))
    .addSubcommand(sub => sub
      .setName("toggle")
      .setDescription("Uključi/isključi welcome poruke")
      .addBooleanOption(opt => opt.setName("stanje").setDescription("true/false").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-dm")
      .setDescription("Poruka koja se šalje u DM novom članu ({user}, {server})")
      .addStringOption(opt => opt.setName("poruka").setDescription("Tekst poruke").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("dm-toggle")
      .setDescription("Uključi/isključi DM poruku novim članovima")
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

    if (sub === "add-channels") {
      const input = interaction.options.getString("kanali");
      const mentions = input.split(",").map(s => s.trim());
      const channelIds = [];
      for (const mention of mentions) {
        const match = mention.match(/^<#(\d+)>$/) || mention.match(/^(\d+)$/);
        if (match) channelIds.push(match[1]);
      }
      if (channelIds.length === 0) {
        embed.setColor(0xe74c3c).setTitle("❌ Nisu pronađeni validni kanali").setDescription("Taguj kanale sa # ili unesi ID-eve odvojene zarezom.");
      } else {
        await ServerConfig.updateOne({ guildId }, { $addToSet: { "welcome.channelIds": { $each: channelIds } } });
        embed.setColor(0x2ecc71).setTitle("✅ Kanali dodati").setDescription(channelIds.map(id => `<#${id}>`).join("\n"));
      }
    } else if (sub === "remove-channel") {
      const ch = interaction.options.getChannel("kanal");
      await ServerConfig.updateOne({ guildId }, { $pull: { "welcome.channelIds": ch.id } });
      embed.setColor(0xe74c3c).setTitle("✅ Kanal uklonjen").setDescription(`<#${ch.id}>`);
    } else if (sub === "list-channels") {
      const config = await ServerConfig.findOne({ guildId });
      const ids = config?.welcome?.channelIds || [];
      embed.setColor(0x3498db).setTitle("📋 Welcome kanali").setDescription(ids.length ? ids.map(id => `<#${id}>`).join("\n") : "Nema postavljenih kanala.");
    } else if (sub === "set-message") {
      const msg = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "welcome.message": msg });
      embed.setColor(0x3498db).setTitle("✅ Welcome poruka postavljena").setDescription(`\`${msg}\``);
    } else if (sub === "set-color") {
      const boja = interaction.options.getString("boja");
      await ServerConfig.updateOne({ guildId }, { "welcome.color": boja });
      embed.setColor(boja).setTitle("✅ Welcome boja postavljena").setDescription(boja);
    } else if (sub === "set-timer") {
      const sekunde = interaction.options.getInteger("sekunde");
      await ServerConfig.updateOne({ guildId }, { "welcome.timer": sekunde });
      embed.setColor(0x3498db).setTitle("✅ Timer postavljen").setDescription(sekunde === 0 ? "Poruka se neće brisati." : `Poruka će se obrisati posle **${sekunde}** sekundi.`);
    } else if (sub === "toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "welcome.enabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Welcome ${stanje ? "✅ UKLJUČEN" : "❌ ISKLJUČEN"}`);
    } else if (sub === "set-dm") {
      const msg = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "welcome.dmMessage": msg });
      embed.setColor(0x3498db).setTitle("✅ DM poruka postavljena").setDescription(`\`${msg}\``);
    } else if (sub === "dm-toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "welcome.dmEnabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`DM poruka ${stanje ? "✅ UKLJUČENA" : "❌ ISKLJUČENA"}`);
    } else if (sub === "leave-channel") {
      const ch = interaction.options.getChannel("kanal");
      await ServerConfig.updateOne({ guildId }, { "leave.channelId": ch.id });
      embed.setColor(0x3498db).setTitle("✅ Leave kanal postavljen").setDescription(`<#${ch.id}>`);
    } else if (sub === "leave-message") {
      const msg = interaction.options.getString("poruka");
      await ServerConfig.updateOne({ guildId }, { "leave.message": msg });
      embed.setColor(0x3498db).setTitle("✅ Leave poruka postavljena").setDescription(`\`${msg}\``);
    } else if (sub === "leave-color") {
      const boja = interaction.options.getString("boja");
      await ServerConfig.updateOne({ guildId }, { "leave.color": boja });
      embed.setColor(boja).setTitle("✅ Leave boja postavljena").setDescription(boja);
    } else if (sub === "leave-toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await ServerConfig.updateOne({ guildId }, { "leave.enabled": stanje });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Leave ${stanje ? "✅ UKLJUČEN" : "❌ ISKLJUČEN"}`);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};