const { Events, EmbedBuilder } = require("discord.js");
const { LogConfig } = require("../schemas");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const config = await LogConfig.findOne({ guildId: member.guild.id });
    const log = config?.logs?.memberJoin;
    if (!log?.enabled || !log?.channelId) return;

    const channel = await client.channels.fetch(log.channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(log.color || "#2ecc71")
      .setTitle("👋 Novi član")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "Korisnik", value: `${member.user.tag}`, inline: true },
        { name: "ID", value: member.user.id, inline: true },
        { name: "Nalog kreiran", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Ukupno članova", value: String(member.guild.memberCount), inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};