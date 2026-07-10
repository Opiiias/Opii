const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("postaviephemeralnaporuku")
    .setDescription("Postavi poruku koju korisnik vidi nakon klika na Registruj se")
    .addStringOption(opt =>
      opt.setName("tekst")
        .setDescription("Poruka (za novi red piši \\n)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const tekst = interaction.options.getString("tekst").replace(/\\n/g, "\n");

    const putanja = path.join(__dirname, "../../data/ephemeralPoruka.json");
    fs.mkdirSync(path.dirname(putanja), { recursive: true });
    fs.writeFileSync(putanja, JSON.stringify({ tekst }, null, 2));

    await interaction.reply({ content: "✅ Ephemeral poruka sačuvana!", ephemeral: true });
  }
};