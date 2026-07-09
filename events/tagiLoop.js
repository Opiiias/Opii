const { ServerConfig } = require("../schemas");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    setInterval(async () => {
      try {
        const configs = await ServerConfig.find({ "tagi.enabled": true });
        const now = Date.now();

        for (const config of configs) {
          const { tag, kanali, interval, autoDelete, lastSent } = config.tagi || {};
          if (!tag || !kanali?.length || !interval) continue;

          const intervalMs = interval * 1000;
          const last = lastSent ? new Date(lastSent).getTime() : 0;

          if (now - last < intervalMs) continue;

          const guild = client.guilds.cache.get(config.guildId);
          if (!guild) continue;

          await ServerConfig.updateOne(
            { guildId: config.guildId },
            { $set: { "tagi.lastSent": new Date() } }
          );

          for (const channelId of kanali) {
            try {
              const channel = guild.channels.cache.get(channelId);
              if (!channel) continue;

              const sentMsg = await channel.send(tag);

              if (autoDelete && autoDelete > 0) {
                setTimeout(() => {
                  sentMsg.delete().catch(() => {});
                }, autoDelete * 1000);
              }
            } catch (e) {
              console.error(`Greška pri slanju taga u kanal ${channelId}:`, e.message);
            }
          }
        }
      } catch (err) {
        console.error("Tagi loop greška:", err);
      }
    }, 5000);
  },
};