const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const ZABRANJENI_DOMENI = [
  "discord", "t.me", "telegram", "tiktok", "tik.tok",
  "instagram", "facebook", "twitter", "x.com", "youtube",
  "youtu.be", "snapchat", "whatsapp"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("postavi")
    .setDescription("Postavi svoj sadržaj sa linkom")
    .addStringOption(opt =>
      opt.setName("naslov")
        .setDescription("Naslov tvog sadržaja")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("link")
        .setDescription("Link do tvog sadržaja")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("opis")
        .setDescription("Kratki opis sadržaja")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("slika")
        .setDescription("Link slike (opciono)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const naslov = interaction.options.getString("naslov");
    const link = interaction.options.getString("link");
    const opis = interaction.options.getString("opis");
    const slika = interaction.options.getString("slika");

    // Provjeri zabranjene domene
    const linkLower = link.toLowerCase();
    const zabranjeno = ZABRANJENI_DOMENI.find(d => linkLower.includes(d));

    if (zabranjeno) {
      return interaction.reply({
        content: `❌ Link ne sme da sadrži **${zabranjeno}**! Koristi samo linkove do svog sadržaja (Linkvertise, Google Drive, MEGA i slično).`,
        ephemeral: true
      });
    }

    // Provjeri da li je validan URL
    try {
      new URL(link);
    } catch {
      return interaction.reply({
        content: "❌ Nisi uneo validan link!",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF4500)
      .setTitle(`🔥 ${naslov}`)
      .setDescription(
        `${opis ? `${opis}\n\n` : ""}` +
        `**Mega fajlovi sa sadržajem 🥵👇**\n` +
        `slike i videi:\n` +
        `${link}\n\n` +
        `Kada pređete link dolazite do sadržaja!`
      )
      .setFooter({ text: `Objavio: ${interaction.user.username}` })
      .setTimestamp();

    if (slika) embed.setImage(slika);

    await interaction.reply({ embeds: [embed] });
  }
};