const { Router } = require("express");
const { EmbedBuilder } = require("discord.js");
const { ServerConfig } = require("../schemas");

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
      const verifyToken = `${guildId}_${member.id}_${Date.now()}`;
      const verifyUrl = `https://opii.onrender.com/webhook/verify?token=${verifyToken}`;

      await ServerConfig.updateOne(
        { guildId },
        { $set: { [`verify.pending.${member.id}`]: verifyToken } }
      );

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("✅ Verifikacija")
        .setDescription(`Klikni link ispod da se verifikuješ:\n\n[Verifikuj nalog](${verifyUrl})`)
        .setTimestamp();

      await member.send({ embeds: [embed] });
      await interaction.reply({ content: "📧 Poslali smo ti DM sa linkom za verifikaciju!", ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: "❌ Nije moguće poslati DM. Otvori DM-ove pa pokušaj ponovo.", ephemeral: true });
    }
  });

  router.get("/verify", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Neispravan token.");

    const parts = token.split("_");
    const guildId = parts[0];
    const userId = parts[1];

    const config = await ServerConfig.findOne({ guildId });
    if (!config?.verify?.pending?.[userId]) {
      return res.status(400).send("Token nije validan ili je istekao.");
    }

    const savedToken = config.verify.pending[userId];
    if (savedToken !== token) {
      return res.status(403).send("Neispravan token.");
    }

    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      const role = guild.roles.cache.get(config.verify.roleId);

      await member.roles.add(role);

      await ServerConfig.updateOne(
        { guildId },
        { $unset: { [`verify.pending.${userId}`]: "" } }
      );

      const ownerEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("🔐 Nova verifikacija")
        .setDescription(`Korisnik <@${userId}> se verifikovao!`)
        .setTimestamp();

      const owner = await client.users.fetch(process.env.OWNER_ID);
      await owner.send({ embeds: [ownerEmbed] });

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