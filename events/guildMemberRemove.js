const { EmbedBuilder } = require("discord.js");
const { getKonfiguracija, popuniPoruku } = require("../utils/welcomeConfig");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    const config = getKonfiguracija(member.guild.id, "leave");

    // Ako je isključeno ili kanal nije postavljen, ne radi ništa
    if (!config.enabled || !config.channelId) return;

    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const poruka = popuniPoruku(config.message, member);

    const embed = new EmbedBuilder()
      .setColor(config.color)
      .setTitle("👋 Član je napustio server")
      .setDescription(poruka)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `Trenutno članova: ${member.guild.memberCount}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
  },
};