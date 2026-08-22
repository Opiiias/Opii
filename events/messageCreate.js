const { Events, EmbedBuilder } = require("discord.js");
const { ServerConfig, BannedWord, Warning, LevelConfig, MemberLevel } = require("../schemas");
const { sendModLog } = require("../utils/modLog");

const spamMap = new Map();
const lastRepeatMsg = new Map();

const ZABRANJENI_PATERNI = [
  /discord\.gg\/[a-zA-Z0-9]+/i,
  /discord\.com\/invite\/[a-zA-Z0-9]+/i,
  /t\.me\/[a-zA-Z0-9]+/i,
  /\.gg\/[a-zA-Z0-9]+/i,
];

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    if (message.content.toLowerCase() === "-lb") {
      const guildId = message.guild.id;
      const top = await MemberLevel.find({ guildId }).sort({ level: -1, messageCount: -1 }).limit(15);
      const embed = new EmbedBuilder().setColor(0xf1c40f).setTitle("🏆 Top 15 — Leaderboard").setTimestamp().setFooter({ text: "Opii Bot" });
      if (top.length === 0) {
        embed.setDescription("Niko još nije zaradio level.");
      } else {
        const medals = ["🥇", "🥈", "🥉"];
        const opis = top.map((m, i) => {
          const medal = medals[i] || `**${i + 1}.**`;
          return `${medal} <@${m.userId}> — Level **${m.level}** | **${m.messageCount}** poruka`;
        }).join("\n");
        embed.setDescription(opis);
      }
      return message.channel.send({ embeds: [embed] });
    }

    const guildId = message.guild.id;
    const userId = message.author.id;

    const levelConfig = await LevelConfig.findOne({ guildId });
    if (levelConfig?.enabled) {
      const mpl = levelConfig.messagesPerLevel || 50;
      const data = await MemberLevel.findOneAndUpdate(
        { guildId, userId },
        { $inc: { messageCount: 1 } },
        { upsert: true, new: true }
      );
      const noviLevel = Math.floor(data.messageCount / mpl);
      if (noviLevel > data.level) {
        await MemberLevel.updateOne({ guildId, userId }, { level: noviLevel });
        if (levelConfig.channelId) {
          const channel = message.guild.channels.cache.get(levelConfig.channelId);
          if (channel) {
            const tekst = (levelConfig.congratsMessage || "🎉 Čestitamo {user}, sada si **Level {level}**!")
              .replace("{user}", `<@${userId}>`)
              .replace("{level}", noviLevel);
            const lvlEmbed = new EmbedBuilder()
              .setColor(0xf1c40f)
              .setDescription(tekst)
              .setTimestamp()
              .setFooter({ text: "Opii Bot" });
            channel.send({ embeds: [lvlEmbed] });
          }
        }
      }
    }

    // Repeat sistem
    const { ServerConfig: SC } = require("../schemas");
    const repeatConfig = await SC.findOne({ guildId });
    if (repeatConfig?.repeat?.enabled) {
      const kanali = repeatConfig.repeat.channelIds || (repeatConfig.repeat.channelId ? [repeatConfig.repeat.channelId] : []);

      if (kanali.includes(message.channel.id)) {
        const key = `repeat-${guildId}-${message.channel.id}`;
        if (!spamMap.has(key)) spamMap.set(key, 0);
        const count = spamMap.get(key) + 1;

        if (count >= (repeatConfig.repeat.interval || 5)) {
          spamMap.set(key, 0);

          const repeatEmbed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Bot" });
          if (repeatConfig.repeat.color) repeatEmbed.setColor(repeatConfig.repeat.color);
          if (repeatConfig.repeat.message) repeatEmbed.setDescription(repeatConfig.repeat.message);
          if (repeatConfig.repeat.image) repeatEmbed.setImage(repeatConfig.repeat.image);
          if (repeatConfig.repeat.url) repeatEmbed.setURL(repeatConfig.repeat.url);
          const mention = repeatConfig.repeat.mention || null;

          const prethodna = lastRepeatMsg.get(key);
          if (prethodna) {
            try { await prethodna.delete(); } catch (_) {}
          }

          const novaPoruka = await message.channel.send({ content: mention, embeds: [repeatEmbed] });
          lastRepeatMsg.set(key, novaPoruka);

        } else {
          spamMap.set(key, count);
        }
      }
    }

    // Linkban sistem
    const linkbanConfig = await ServerConfig.findOne({ guildId });
    if (linkbanConfig?.linkban?.enabled && linkbanConfig?.linkban?.kanali?.includes(message.channel.id)) {
      if (!message.member.permissions.has("Administrator")) {

        let trebaBrisati = false;
        let razlog = "";

        // Forwarded poruka ima HasSnapshot flag i hasReference
        const isForwarded = message.flags?.toArray()?.includes("HasSnapshot") && !!message.reference;
        if (isForwarded) {
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

        // Provjeri embeds
        if (!trebaBrisati && message.embeds.length > 0) {
          for (const embed of message.embeds) {
            if (embed.url && ZABRANJENI_PATERNI.some(p => p.test(embed.url))) {
              trebaBrisati = true;
              razlog = "Discord/Telegram link u embedu";
              break;
            }
            if (embed.description && ZABRANJENI_PATERNI.some(p => p.test(embed.description))) {
              trebaBrisati = true;
              razlog = "Discord/Telegram link u embedu";
              break;
            }
          }
        }

        if (trebaBrisati) {
          try { await message.delete(); } catch (_) {}

          const akcija = linkbanConfig.linkban.akcija || "timeout";
          const vreme = linkbanConfig.linkban.vreme || 10;
          const member = message.member;

          try {
            switch (akcija) {
              case "ban":
                if (member.bannable) {
                  await member.ban({ deleteMessageSeconds: vreme * 24 * 60 * 60, reason: razlog });
                }
                break;
              case "kick":
                if (member.kickable) await member.kick(razlog);
                break;
              case "timeout":
                if (member.moderatable) await member.timeout(vreme * 60 * 1000, razlog);
                break;
            }

            const upozorenjeMsg = await message.channel.send({
              content: `⛔ ${message.author} — **${razlog}**! Akcija: **${akcija.toUpperCase()}**`,
            });
            setTimeout(() => upozorenjeMsg.delete().catch(() => {}), 5000);

          } catch (e) {
            console.error("Linkban greška:", e.message);
          }

          return;
        }
      }
    }

    // AutoMod
    const config = await ServerConfig.findOne({ guildId });
    if (!config?.autoMod?.enabled) return;
    if (message.member.permissions.has("Administrator")) return;

    const { autoMod } = config;

    if (autoMod.bannedWords.enabled) {
      const bannedWords = await BannedWord.find({ guildId }).select("word");
      const content = message.content.toLowerCase();
      const found = bannedWords.find((bw) => content.includes(bw.word.toLowerCase()));
      if (found) {
        await applyAction(message, autoMod.bannedWords.action, `AutoMod: Zabranjena reč "${found.word}"`, autoMod.bannedWords.timeoutDuration, client);
        return;
      }
    }

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
        await applyAction(message, autoMod.antiSpam.action, `AutoMod: Spam detekcija (${recent.length} poruka u ${interval / 1000}s)`, autoMod.antiSpam.timeoutDuration, client);
      }
    }

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