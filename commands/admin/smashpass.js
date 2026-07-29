const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("smashpass")
    .setDescription("Postavi kanal za Smash or Pass glasanje")
    .addChannelOption(opt =>
      opt.setName("kanal")
        .setDescription("Kanal u kom bot reaguje na slike/videe")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("smash")
        .setDescription("Emoji za Smash")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("pass")
        .setDescription("Emoji za Pass")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const kanal = interaction.options.getChannel("kanal");
    const smash = interaction.options.getString("smash") || "<:smash:1531993142113472592>";
    const pass = interaction.options.getString("pass") || "<:pass:1531993213085286471>";

    const putanja = path.join(__dirname, "../../data/smashpass.json");
    fs.mkdirSync(path.dirname(putanja), { recursive: true });

    let podaci = {};
    try {
      if (fs.existsSync(putanja)) {
        podaci = JSON.parse(fs.readFileSync(putanja));
      }
    } catch {}

    podaci[interaction.guild.id] = {
      kanalId: kanal.id,
      smash,
      pass
    };

    fs.writeFileSync(putanja, JSON.stringify(podaci, null, 2));

    await interaction.reply({
      content: `✅ Smash or Pass postavljen u <#${kanal.id}>!`,
      ephemeral: true
    });
  }
};