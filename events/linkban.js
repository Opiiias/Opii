const { ServerConfig } = require("../schemas");

const ZABRANJENI_PATERNI = [
  /discord\.gg\/[a-zA-Z0-9]+/i,
  /discord\.com\/invite\/[a-zA-Z0-9]+/i,
  /t\.me\/[a-zA-Z0-9]+/i,
  /\.gg\/[a-zA-Z0-9]+/i,
];

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const config = await ServerConfig.findOne({ guildId });

    if (!config?.linkban?.enabled) return;
    if (!config?.linkban?.kanali?.includes(message.channel.id)) return;

    // Preskoci administratore
    if (message.member.permissions.has("Administrator")) return;

    const akcija = config.linkban.akcija || "timeout";
    const vreme = config.linkban.vreme || 10;

    let trebaBrisati = false;
    let razlog = "";

    // Provjeri forwarded poruke
    if (message.reference && message.forwarded) {
      trebaBrisati = true;
      razlog = "Forwarded poruka sa drugog servera";
    }

    // Provjeri linkove u tekstu
    if (!trebaBrisati) {
      for (const patern of ZABRANJENI_PATERNI) {
        if (patern.test(message.content)) {
          trebaBrisati = true;
          razlog = "Discord/Telegram link u poruci";
          break;
        }
      }
    }

    // Provjeri slike i videe (embedovi i attachmenti sa linkovima u imenu)
    if (!trebaBrisati && message.attachments.size > 0) {
      for (const [, attachment] of message.attachments) {
        for (const patern of ZABRANJENI_PATERNI) {
          if (patern.test(attachment.name || "") || patern.test(attachment.url || "")) {
            trebaBrisati = true;
            razlog = "Zabranjeni link u prilogu";
            break;
          }
        }
      }
    }

    if (!trebaBrisati) return;

    try {
      await message.delete();
    } catch (_) {}

    const member = message.member;

    try {
      switch (akcija) {
        case "ban":
          if (member.bannable) {
            await member.ban({
              deleteMessageSeconds: vreme * 24 * 60 * 60,
              reason: razlog
            });
          }
          break;
        case "kick":
          if (member.kickable) {
            await member.kick(razlog);
          }
          break;
        case "timeout":
          if (member.moderatable) {
            await member.timeout(vreme * 60 * 1000, razlog);
          }
          break;
      }

      await message.channel.send({
        content: `⛔ ${message.author} — **${razlog}**! Akcija: **${akcija.toUpperCase()}**`,
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));

    } catch (e) {
      console.error("Linkban greška:", e.message);
    }
  }
};