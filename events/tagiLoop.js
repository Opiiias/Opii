const { ServerConfig } = require("../schemas");

const lastSent = new Map(); // guildId -> timestamp poslednjeg slanja

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    setInterval(async () => {
      try {
        const configs = await ServerConfig.find({ "tagi.enabled": true });
        const now = Date.now();

        for (const config of configs) {
          const { tag, kanali, interval } = config.tagi || {};
          if (!tag || !kanali?.length || !interval) continue;

          const guildId = config.guildId;
          const last = lastSent.get(guildId) || 0;
          const intervalMs = interval * 1000; // interval je sada u sekundama

          if (now - last < intervalMs) continue;

          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;

          for (const channelId of kanali) {
            try {
              const channel = guild.channels.cache.get(channelId);
              if (channel) await channel.send(tag);
            } catch (e) {
              console.error(`Greška pri slanju taga u kanal ${channelId}:`, e.message);
            }
          }

          lastSent.set(guildId, now);
        }
      } catch (err) {
        console.error("Tagi loop greška:", err);
      }
    }, 1000); // proverava svake sekunde
  },
};