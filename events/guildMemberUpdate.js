const { Events, EmbedBuilder } = require("discord.js");
const { LogConfig } = require("../schemas");

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    const config = await LogConfig.findOne({ guildId: newMember.guild.id });

    // Timeout log
    const wasTimedOut = !oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil;
    if (wasTimedOut) {
      const log = config?.logs?.timeout;
      if (log?.enabled && log?.channelId) {
        const channel = await client.channels.fetch(log.channelId).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(log.color || "#e74c3c")
            .setTitle("🔇 Timeout Dat")
            .addFields(
              { name: "Korisnik", value: newMember.user.tag, inline: true },
              { name: "Istice", value: `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      }
    }

    // Uloge log
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0 || removedRoles.size > 0) {
      const log = config?.logs?.roleUpdate;
      if (log?.enabled && log?.channelId) {
        const channel = await client.channels.fetch(log.channelId).catch(() => null);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(log.color || "#9b59b6")
            .setTitle("🎭 Uloge Promenjene")
            .addFields(
              { name: "Korisnik", value: newMember.user.tag, inline: true }
            );

          if (addedRoles.size > 0) {
            embed.addFields({ name: "✅ Dodate uloge", value: addedRoles.map(r => `<@&${r.id}>`).join(", ") });
          }
          if (removedRoles.size > 0) {
            embed.addFields({ name: "❌ Uklonjene uloge", value: removedRoles.map(r => `<@&${r.id}>`).join(", ") });
          }

          embed.setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      }
    }
  },
};