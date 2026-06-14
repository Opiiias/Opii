const { EmbedBuilder } = require("discord.js");
const { ServerConfig } = require("../schemas");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    try {
      const config = await ServerConfig.findOne({ guildId: member.guild.id });
      if (!config?.leave?.enabled || !config?.leave?.channelId) return;

      const channel = member.guild.channels.cache.get(config.leave.channelId);
      if (!channel) return;

      const poruka = config.leave.message
        .replaceAll("{user}", `<@${member.id}>`)
        .replaceAll("{username}", member.user.username)
        .replaceAll("{server}", member.guild.name)
        .replaceAll("{membercount}", `${member.guild.memberCount}`);

      const embed = new EmbedBuilder()
        .setColor(config.leave.color || "#E74C3C")
        .setTitle("👋 Član je napustio server")
        .setDescription(poruka)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `Trenutno članova: ${member.guild.memberCount}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("guildMemberRemove greška:", err);
    }
  },
};