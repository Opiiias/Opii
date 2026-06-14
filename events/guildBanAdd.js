const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LogConfig } = require("../schemas");

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban, client) {
    const config = await LogConfig.findOne({ guildId: ban.guild.id });
    const log = config?.logs?.memberBan;
    if (!log?.enabled || !log?.channelId) return;

    const channel = await client.channels.fetch(log.channelId).catch(() => null);
    if (!channel) return;

    const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
    const entry = auditLogs?.entries.first();
    const moderator = entry?.executor?.tag || "Nepoznat";
    const reason = entry?.reason || "Nije naveden razlog";

    const embed = new EmbedBuilder()
      .setColor(log.color || "#c0392b")
      .setTitle("🔨 Korisnik Banovan")
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: "Korisnik", value: ban.user.tag, inline: true },
        { name: "Moderator", value: moderator, inline: true },
        { name: "Razlog", value: reason }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};