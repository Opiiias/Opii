const fs = require("fs");
const path = require("path");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    const putanja = path.join(__dirname, "../data/smashpass.json");

    let podaci = {};
    try {
      if (fs.existsSync(putanja)) {
        podaci = JSON.parse(fs.readFileSync(putanja));
      }
    } catch {
      return;
    }

    const config = podaci[message.guild?.id];
    if (!config) return;
    if (message.channel.id !== config.kanalId) return;

    const imaSliku = message.attachments.some(a =>
      a.contentType?.startsWith("image") || a.contentType?.startsWith("video")
    );

    if (!imaSliku) return;

    try {
      await message.react(config.smash);
      await message.react(config.pass);
    } catch (e) {
      console.error("Greška pri reakciji:", e.message);
    }
  }
};