const { EmbedBuilder } = require("discord.js");
const { ServerConfig } = require("../schemas");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    console.log(`🔔 guildMemberAdd okidan za: ${member.user.username}`);
    try {
      const config = await ServerConfig.findOne({ guildId: member.guild.id });
      console.log(`📋 Config pronađen:`, config?.welcome);
      if (!config?.welcome?.enabled) return;

      const channelIds = config.welcome.channelIds || [];
      console.log(`📋 ChannelIds:`, channelIds);
      if (channelIds.length === 0) return;

      const poruka = (config.welcome.message || "👋 Zdravo {user}, dobrodošao/la na **{server}**!")
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

      await Promise.allSettled(
        channelIds.map(async (channelId) => {
          const channel = member.guild.channels.cache.get(channelId);
          if (!channel) {
            console.log(`❌ Kanal nije pronađen: ${channelId}`);
            return;
          }
          console.log(`✅ Šaljem u kanal: ${channelId}`);
          const sent = await channel.send({ embeds: [embed] });
          if (config.welcome.timer > 0) {
            setTimeout(() => sent.delete().catch(() => {}), config.welcome.timer * 1000);
          }
        })
      );

      if (config.welcome.dmEnabled && config.welcome.dmMessage) {
        const dmTekst = config.welcome.dmMessage
          .replaceAll("{user}", member.user.username)
          .replaceAll("{server}", member.guild.name);
        try {
          await member.user.send(dmTekst);
        } catch (_) {
          console.log(`❌ Ne mogu da pošaljem DM za: ${member.user.username}`);
        }
      }
    } catch (err) {
      console.error("guildMemberAdd greška:", err);
    }
  },
};