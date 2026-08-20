const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
} = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.on('error', (err) => {
  console.error('❌ Client error:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err?.message || err);
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const slashCommandData = [];

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith(".js")) {
      try {
        const command = require(fullPath);
        if (!command.data || !command.execute) {
          console.log(`⚠️ Preskočen: ${fullPath}`);
          continue;
        }
        console.log(`✅ Učitan: ${command.data.name}`);
        client.commands.set(command.data.name, command);
        slashCommandData.push(command.data.toJSON());
      } catch (err) {
        console.error(`❌ Greška pri učitavanju ${fullPath}:`, err.message);
      }
    }
  }
}

loadCommands(commandsPath);

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("🔄 Registrujem slash komande...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: slashCommandData,
    });
    console.log(`✅ Registrovano ${slashCommandData.length} slash komandi.`);
  } catch (err) {
    console.error("❌ Greška pri registraciji komandi:", err.message);
  }
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Povezan sa MongoDB.");
  } catch (err) {
    console.error("❌ MongoDB greška:", err);
    process.exit(1);
  }
}

const express = require("express");
const webhookRouter = require("./webhook/webhookServer");
const app = express();
app.use(express.json());

app.get("/ping", (req, res) => {
  res.status(200).send("OK");
});

app.use("/webhook", webhookRouter(client));

const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(WEBHOOK_PORT, () => {
  console.log(`🌐 Webhook server sluša na portu ${WEBHOOK_PORT}`);
});

(async () => {
  await connectDB();
  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
})();

module.exports = client;