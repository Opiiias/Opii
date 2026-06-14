const { EmbedBuilder } = require("discord.js");
const { ServerConfig } = require("../schemas");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    try {
      const config = await ServerConfig.findOne({ guildId: member.guild.id });
      if (!config?.welcome?.enabled || !config?.welcome?.channelId) return;

      const channel = member.guild.channels.cache.get(config.welcome.channelId);
      if (!channel) return;

      const poruka = config.welcome.message
        .replaceAll("{user}", `<@${member.id}>`)
        .replaceAll("{username}", member.user.username)
        .replaceAll("{server}", member.guild.name)
        .replaceAll("{membercount}", `${member.guild.memberCount}`);

      const embed = new EmbedBuilder()
        .setColor(config.welcome.color || "#5865F2")
        .setTitle("🎉 Novi član na serveru!")
        .setDescription(poruka)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `Trenutno članova: ${member.guild.memberCount}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("guildMemberAdd greška:", err);
    }
  },
};