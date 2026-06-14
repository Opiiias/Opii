const { Events, EmbedBuilder } = require("discord.js");
const { LogConfig } = require("../schemas");

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    const config = await LogConfig.findOne({ guildId: message.guild.id });
    const log = config?.logs?.messagDelete;
    if (!log?.enabled || !log?.channelId) return;

    const channel = await client.channels.fetch(log.channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(log.color || "#e67e22")
      .setTitle("🗑️ Poruka Obrisana")
      .addFields(
        { name: "Korisnik", value: `${message.author?.tag || "Nepoznat"}`, inline: true },
        { name: "Kanal", value: `<#${message.channelId}>`, inline: true },
        { name: "Sadržaj", value: message.content?.substring(0, 1024) || "N/A" }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};