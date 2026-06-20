const { Router } = require("express");
const crypto = require("crypto");
const axios = require("axios");
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

  router.get("/auth/discord/redirect", async (req, res) => {
    const { code, guildId } = req.query;

    if (!code) {
      return res.status(400).send("Nedostaje autorizacioni kod.");
    }

    try {
      const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://opii.onrender.com/webhook/auth/discord/redirect",
      });

      const tokenRes = await axios.post("https://discord.com/api/v10/oauth2/token", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const accessToken = tokenRes.data.access_token;

      const userRes = await axios.get("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const discordUser = userRes.data;

      const config = await ServerConfig.findOne({ guildId });
      if (!config?.verify?.roleId) {
        return res.status(404).send("Verifikacija nije podešena za ovaj server.");
      }

      const guild = await client.guilds.fetch(guildId);

      await axios.put(
        `https://discord.com/api/v10/guilds/${guildId}/members/${discordUser.id}`,
        { access_token: accessToken },
        { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, "Content-Type": "application/json" } }
      ).catch(() => null);

      const member = await guild.members.fetch(discordUser.id).catch(() => null);
      if (member) {
        await member.roles.add(config.verify.roleId).catch(() => null);
      }

      res.send(`
        <html>
          <body style="background:#2c2f33;color:white;font-family:sans-serif;text-align:center;padding-top:100px;">
            <h1>✅ Verifikacija uspešna!</h1>
            <p>Možeš se vratiti na Discord.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("❌ Greška u OAuth2 verifikaciji:", err.response?.data || err.message);
      res.status(500).send("Greška prilikom verifikacije. Pokušaj ponovo.");
    }
  });

  return router;
};