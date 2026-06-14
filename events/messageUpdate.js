const { Events, EmbedBuilder } = require("discord.js");
const { LogConfig } = require("../schemas");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const config = await LogConfig.findOne({ guildId: oldMessage.guild.id });
    const log = config?.logs?.messageEdit;
    if (!log?.enabled || !log?.channelId) return;

    const channel = await client.channels.fetch(log.channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(log.color || "#f39c12")
      .setTitle("✏️ Poruka Izmenjena")
      .addFields(
        { name: "Korisnik", value: `${oldMessage.author.tag}`, inline: true },
        { name: "Kanal", value: `<#${oldMessage.channelId}>`, inline: true },
        { name: "Stara poruka", value: oldMessage.content?.substring(0, 1024) || "N/A" },
        { name: "Nova poruka", value: newMessage.content?.substring(0, 1024) || "N/A" }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};