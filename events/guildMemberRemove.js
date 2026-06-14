const { Events, EmbedBuilder } = require("discord.js");
const { LogConfig } = require("../schemas");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const config = await LogConfig.findOne({ guildId: member.guild.id });
    const log = config?.logs?.memberLeave;
    if (!log?.enabled || !log?.channelId) return;

    const channel = await client.channels.fetch(log.channelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(log.color || "#e74c3c")
      .setTitle("🚪 Član napustio server")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "Korisnik", value: `${member.user.tag}`, inline: true },
        { name: "ID", value: member.user.id, inline: true },
        { name: "Bio na serveru od", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};