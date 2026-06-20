const { Router } = require("express");
const { EmbedBuilder } = require("discord.js");
const { ServerConfig } = require("../schemas");

module.exports = function webhookRouter(client) {
  const router = Router();

  const pendingVerifications = new Map();

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
      pendingVerifications.set(token, { guildId, userId: member.id });

      setTimeout(() => pendingVerifications.delete(token), 10 * 60 * 1000);

      const verifyUrl = `https://opii.onrender.com/webhook/verify?token=${token}`;

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("✅ Verifikacija")
        .setDescription(`Klikni link ispod da se verifikuješ:\n\n[Klikni ovde da se verifikuješ](${verifyUrl})`)
        .setTimestamp();

      await member.send({ embeds: [embed] });
      await interaction.reply({ content: "📧 Poslali smo ti DM sa linkom!", ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: "❌ Nije moguće poslati DM. Otvori DM-ove pa pokušaj ponovo.", ephemeral: true });
    }
  });

  router.get("/verify", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Neispravan token.");

    const data = pendingVerifications.get(token);
    if (!data) {
      return res.status(400).send(`
        <html><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#fff;text-align:center;">
          <div><div style="font-size:80px;">❌</div><h1 style="font-size:28px;font-weight:700;margin-top:16px;color:#111;">Token nije validan ili je istekao.<br>Klikni dugme ponovo.</h1></div>
        </body></html>
      `);
    }

    try {
      const { guildId, userId } = data;
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      const config = await ServerConfig.findOne({ guildId });
      const role = guild.roles.cache.get(config.verify.roleId);

      await member.roles.add(role);
      pendingVerifications.delete(token);

      try {
        const owner = await client.users.fetch(process.env.OWNER_ID);
        const ownerEmbed = new EmbedBuilder()
          .setColor("#2ecc71")
          .setTitle("🔐 Nova verifikacija")
          .setDescription(`Korisnik <@${userId}> (${member.user.tag}) se verifikovao!`)
          .setTimestamp();
        await owner.send({ embeds: [ownerEmbed] });
      } catch (e) {}

      res.send(`
        <html><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#fff;text-align:center;">
          <div><div style="font-size:80px;">✅</div><h1 style="font-size:28px;font-weight:700;margin-top:16px;color:#111;">USPEŠNO STE VERIFIKOVALI NALOG!</h1></div>
        </body></html>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send("Greška pri verifikaciji.");
    }
  });

  return router;
};