const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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
        .setDescription("Glavni link do tvog sadržaja")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("jezik")
        .setDescription("Jezik poruke")
        .setRequired(true)
        .addChoices(
          { name: "Srpski", value: "sr" },
          { name: "English", value: "en" }
        )
    )
    .addStringOption(opt =>
      opt.setName("tag")
        .setDescription("Tag: everyone, here, ili bez taga")
        .setRequired(false)
        .addChoices(
          { name: "@everyone", value: "@everyone" },
          { name: "@here", value: "@here" },
          { name: "Bez taga", value: "none" }
        )
    )
    .addStringOption(opt =>
      opt.setName("opis")
        .setDescription("Kratki opis sadržaja")
        .setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName("slika")
        .setDescription("Prevuci i pusti sliku (opciono)")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("link2")
        .setDescription("Drugi link (opciono)")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("ime_buttna")
        .setDescription("Ime drugog buttna (opciono)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const naslov = interaction.options.getString("naslov");
    const link = interaction.options.getString("link");
    const jezik = interaction.options.getString("jezik");
    const tag = interaction.options.getString("tag") || "none";
    const opis = interaction.options.getString("opis");
    const slika = interaction.options.getAttachment("slika");
    const link2 = interaction.options.getString("link2");
    const imeButtna = interaction.options.getString("ime_buttna") || "🔗 Link 2";

    const linkLower = link.toLowerCase();
    const zabranjeno = ZABRANJENI_DOMENI.find(d => linkLower.includes(d));

    if (zabranjeno) {
      return interaction.reply({
        content: `❌ Link ne sme da sadrži **${zabranjeno}**! Koristi samo linkove do svog sadržaja.`,
        ephemeral: true
      });
    }

    try {
      new URL(link);
    } catch {
      return interaction.reply({
        content: "❌ Nisi uneo validan link!",
        ephemeral: true
      });
    }

    let opis_poruke;
    let dugme;

    if (jezik === "en") {
      opis_poruke =
        `${opis ? `${opis}\n\n` : ""}` +
        `📂 : Mega file with content 🥵 👇\n` +
        `videos and pictures\n\n` +
        `**[Open Link](${link})**\n\n` +
        `When you click the link, you get to the content!\n\n` +
        `-# The links are not viruses, no data is saved and so on.`;

      dugme = new ButtonBuilder()
        .setLabel("👁️ View Content")
        .setStyle(ButtonStyle.Link)
        .setURL(link);
    } else {
      opis_poruke =
        `${opis ? `${opis}\n\n` : ""}` +
        `**Mega fajlovi sa sadržajem 🥵👇**\n` +
        `slike i videi:\n\n` +
        `**[Otvori Link](${link})**\n\n` +
        `Kada pređete link dolazite do sadržaja!\n\n` +
        `-# Linkovi nisu nikakvi virusi, nikakvi podaci se ne čuvaju i slično..`;

      dugme = new ButtonBuilder()
        .setLabel("👁️ Pogledaj sadržaj")
        .setStyle(ButtonStyle.Link)
        .setURL(link);
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF4500)
      .setTitle(`🔥 ${naslov}`)
      .setDescription(opis_poruke)
      .setTimestamp();

    if (slika) embed.setImage(slika.url);

    const row = new ActionRowBuilder().addComponents(dugme);

    // Dodaj drugi buttn ako postoji link2
    if (link2) {
      try {
        new URL(link2);
        const dugme2 = new ButtonBuilder()
          .setLabel(imeButtna)
          .setStyle(ButtonStyle.Link)
          .setURL(link2);
        row.addComponents(dugme2);
      } catch {
        // ako link2 nije validan jednostavno ga preskoči
      }
    }

    const tagContent = tag === "none" ? null : tag;

    await interaction.reply({
      content: tagContent,
      embeds: [embed],
      components: [row],
      allowedMentions: { parse: ["everyone", "here", "roles"] }
    });
  }
};