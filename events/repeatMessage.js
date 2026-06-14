const { ServerConfig } = require("../schemas");
const { EmbedBuilder } = require("discord.js");

const counters = new Map();

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    const guildId = message.guild?.id;
    if (!guildId) return;

    const config = await ServerConfig.findOne({ guildId });
    if (!config?.repeat?.enabled) return;
    if (message.channel.id !== config.repeat.channelId) return;

    const key = `${guildId}-${config.repeat.channelId}`;
    const current = (counters.get(key) || 0) + 1;

    if (current >= config.repeat.interval) {
      counters.set(key, 0);

      const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: "Opii Bot" });

      if (config.repeat.color) embed.setColor(config.repeat.color);
      if (config.repeat.message) embed.setDescription(config.repeat.message);
      if (config.repeat.image) embed.setImage(config.repeat.image);
      if (config.repeat.url) embed.setURL(config.repeat.url);

      const mention = config.repeat.mention || "";
      await message.channel.send({ content: mention || null, embeds: [embed] });
    } else {
      counters.set(key, current);
    }
  },
};