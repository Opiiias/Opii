const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Opii Bot je online kao ${client.user.tag}`);
    client.user.setActivity("vaš server 👀", { type: ActivityType.Watching });
  },
};