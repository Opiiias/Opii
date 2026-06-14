const { ServerConfig } = require("../schemas");

async function sendModLog(client, guild, embed) {
  try {
    const config = await ServerConfig.findOne({ guildId: guild.id });
    if (!config?.modLogChannelId) return;
    const channel = await client.channels.fetch(config.modLogChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ sendModLog greška:", err);
  }
}

module.exports = { sendModLog };