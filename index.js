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

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);
const slashCommandData = [];

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (!command.data || !command.execute) continue;
    client.commands.set(command.data.name, command);
    slashCommandData.push(command.data.toJSON());
  }
}

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
    console.error("❌ Greška pri registraciji komandi:", err);
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