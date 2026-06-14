const { Router } = require("express");
const crypto = require("crypto");
const { EmbedBuilder } = require("discord.js");
const { ServerConfig, WebNotification } = require("../schemas");

module.exports = function webhookRouter(client) {
  const router = Router();

  function verifySignature(req, res, next) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) return next();
    const signature = req.headers["x-opii-signature"];
    if (!signature) return res.status(401).json({ error: "Nedostaje potpis." });
    const hash = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
    if (`sha256=${hash}` !== signature) return res.status(403).json({ error: "Neispravan potpis." });
    next();
  }

  router.post("/new-post", verifySignature, async (req, res) => {
    const { postId, title, description, authorName, imageUrl, postUrl, guildId, pingEveryone = false } = req.body;

    if (!postId || !title || !postUrl || !guildId) {
      return res.status(400).json({ error: "Nedostaju obavezna polja." });
    }

    const config = await ServerConfig.findOne({ guildId });
    if (!config?.announcementChannelId) {
      return res.status(404).json({ error: "Announcement kanal nije konfigurisan." });
    }

    const channel = await client.channels.fetch(config.announcementChannelId).catch(() => null);
    if (!channel?.isTextBased()) return res.status(404).json({ error: "Kanal nije pronađen." });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📢 ${title}`)
      .setURL(postUrl)
      .setDescription(description || "")
      .setFooter({ text: authorName ? `Objavio: ${authorName}` : "Opii Bot", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);

    let discordMessage = null;
    try {
      discordMessage = await channel.send({
        content: pingEveryone ? "@everyone Novi post!" : undefined,
        embeds: [embed],
      });
    } catch (err) {
      console.error("❌ Greška pri slanju Discord poruke:", err);
      return res.status(500).json({ error: "Slanje nije uspelo." });
    }

    await WebNotification.findOneAndUpdate(
      { postId },
      { postId, title, description, authorName, imageUrl, postUrl, sentToGuildId: guildId, sentToChannelId: config.announcementChannelId, discordMessageId: discordMessage.id, status: "sent" },
      { upsert: true, new: true }
    );

    return res.json({ success: true, messageId: discordMessage.id });
  });

  router.post("/setup", verifySignature, async (req, res) => {
    const { guildId, announcementChannelId, modLogChannelId, trustedDomains } = req.body;
    if (!guildId) return res.status(400).json({ error: "guildId je obavezan." });

    await ServerConfig.findOneAndUpdate(
      { guildId },
      { $set: { ...(announcementChannelId && { announcementChannelId }), ...(modLogChannelId && { modLogChannelId }), ...(trustedDomains && { trustedDomains }) } },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: "Konfiguracija ažurirana." });
  });

  return router;
};