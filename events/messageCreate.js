const { Events, EmbedBuilder } = require("discord.js");
const { ServerConfig, BannedWord, Warning } = require("../schemas");
const { sendModLog } = require("../utils/modLog");

const spamMap = new Map();

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const config = await ServerConfig.findOne({ guildId: message.guild.id });
    if (!config?.autoMod?.enabled) return;
    if (message.member.permissions.has("Administrator")) return;

    const { autoMod } = config;

    // Filter zabranjenih reči
    if (autoMod.bannedWords.enabled) {
      const bannedWords = await BannedWord.find({ guildId: message.guild.id }).select("word");
      const content = message.content.toLowerCase();
      const found = bannedWords.find((bw) => content.includes(bw.word.toLowerCase()));
      if (found) {
        await applyAction(
          message,
          autoMod.bannedWords.action,
          `AutoMod: Zabranjena reč "${found.word}"`,
          autoMod.bannedWords.timeoutDuration,
          client
        );
        return;
      }
    }

    // Anti-spam
    if (autoMod.antiSpam.enabled) {
      const key = `${message.author.id}_${message.channelId}`;
      const now = Date.now();
      const { maxMessages, interval } = autoMod.antiSpam;
      if (!spamMap.has(key)) spamMap.set(key, []);
      const timestamps = spamMap.get(key);
      const recent = timestamps.filter((t) => now - t < interval);
      recent.push(now);
      spamMap.set(key, recent);
      if (recent.length >= maxMessages) {
        spamMap.delete(key);
        await applyAction(
          message,
          autoMod.antiSpam.action,
          `AutoMod: Spam detekcija (${recent.length} poruka u ${interval / 1000}s)`,
          autoMod.antiSpam.timeoutDuration,
          client
        );
      }
    }

    // Trusted domain reakcija
    if (config.trustedDomains?.length > 0) {
      const urlRegex = /https?:\/\/[^\s]+/gi;
      const links = message.content.match(urlRegex) || [];
      for (const link of links) {
        const isTrusted = config.trustedDomains.some((d) => link.includes(d));
        if (isTrusted) {
          try { await message.react("🔗"); } catch (_) {}
        }
      }
    }
  },
};

async function applyAction(message, action, reason, timeoutMinutes, client) {
  const { member, guild, channel } = message;
  try { await message.delete(); } catch (_) {}

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("🤖 AutoMod akcija")
    .addFields(
      { name: "Korisnik", value: `${message.author.tag}`, inline: true },
      { name: "Kanal", value: `<#${channel.id}>`, inline: true },
      { name: "Akcija", value: action.toUpperCase(), inline: true },
      { name: "Razlog", value: reason }
    )
    .setTimestamp();

  switch (action) {
    case "warn":
      await Warning.create({
        guildId: guild.id,
        userId: message.author.id,
        moderatorId: client.user.id,
        reason,
        source: "automod",
      });
      try { await message.author.send(`⚠️ **Upozorenje na ${guild.name}:** ${reason}`); } catch (_) {}
      break;
    case "timeout":
      if (member.moderatable) {
        await member.timeout(timeoutMinutes * 60 * 1000, reason);
        embed.addFields({ name: "Trajanje", value: `${timeoutMinutes} min`, inline: true });
      }
      break;
    case "kick":
      if (member.kickable) await member.kick(reason);
      break;
    case "ban":
      if (member.bannable) await member.ban({ reason });
      break;
  }

  await sendModLog(client, guild, embed);
}