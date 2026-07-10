const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("postavitiketporuku")
    .setDescription("Postavi uputstvo koje se šalje kada korisnik otvori tiket")
    .addStringOption(opt =>
      opt.setName("naslov")
        .setDescription("Naslov poruke u tiketu")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("opis")
        .setDescription("Opis poruke (za novi red piši \\n)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("boja")
        .setDescription("Boja embeda u hex (npr. FFD700)")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("slika")
        .setDescription("Link slike ili gifa koji se prikazuje u tiketu")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("thumbnail")
        .setDescription("Mala slika u gornjem desnom uglu")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const naslov = interaction.options.getString("naslov");
    const opis = interaction.options.getString("opis").replace(/\\n/g, "\n");
    const boja = interaction.options.getString("boja") || "FFD700";
    const slika = interaction.options.getString("slika");
    const thumbnail = interaction.options.getString("thumbnail");

    const podaci = { naslov, opis, boja, slika, thumbnail };

    const putanja = path.join(__dirname, "../../data/tiketPoruka.json");
    fs.mkdirSync(path.dirname(putanja), { recursive: true });
    fs.writeFileSync(putanja, JSON.stringify(podaci, null, 2));

    await interaction.reply({ content: "✅ Poruka za tiket sačuvana!", ephemeral: true });
  }
};