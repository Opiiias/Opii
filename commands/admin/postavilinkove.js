const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const KANALI = [
  { id: "1534592641587478628", link: "https://direct-link.net/6147336/gokbDNL7Y803", slika: "https://i.imgur.com/kBHCdAj.jpg" },
  { id: "1534592670326984734", link: "https://direct-link.net/6147336/Wq9PYp2RK0UH", slika: "https://i.imgur.com/Mm0XBRd.jpg" },
  { id: "1534592748861132891", link: "https://link-hub.net/6147336/hAEZzjSY8siQ", slika: "https://i.imgur.com/TzWzlFb.jpg" },
  { id: "1534592768133828658", link: "https://link-hub.net/6147336/pxK2XkAKphC5", slika: "https://i.imgur.com/fWbVmO0.jpg" },
  { id: "1534592794067210481", link: "https://link-hub.net/6147336/WreeOrnmOVwk", slika: "https://i.imgur.com/Ji4A9fH.jpg" },
  { id: "1534592818335580210", link: "https://link-hub.net/6147336/manfhGpFrBxG", slika: "https://i.imgur.com/JZTk0yN.jpg" },
  { id: "1534592837470130299", link: "https://link-hub.net/6147336/kQFHVvH12tUx", slika: "https://i.imgur.com/aH5isSH.jpg" },
  { id: "1534592871594852352", link: "https://link-hub.net/6147336/kqHA4oOp3ZCU", slika: "https://i.imgur.com/kN5O3rc.jpg" },
  { id: "1534592855782461490", link: "https://link-center.net/6147336/bUzlxB0dYxCH", slika: "https://i.imgur.com/3mEm8AN.jpg" },
  { id: "1534592888673931434", link: "https://link-hub.net/6147336/8z9WqzKz2eyW", slika: "https://i.imgur.com/q9UCXlV.jpg" },
  { id: "1534592908777492500", link: "https://link-center.net/6147336/HY7y7w5shoY4", slika: "https://i.imgur.com/t75MmFk.jpg" },
  { id: "1534592923608416366", link: "https://link-hub.net/6147336/2zwQbdtTd3XN", slika: null },
  { id: "1534592940347756618", link: "https://direct-link.net/6147336/VhzyIpN4g1iF", slika: "https://i.imgur.com/bc6GkIx.jpg" },
  { id: "1534592959041900705", link: "https://direct-link.net/6147336/ufQju5lcYstU", slika: "https://i.imgur.com/jMDxVzl.jpg" },
  { id: "1534592974057636191", link: "https://link-center.net/6147336/CKjSQFbma9RA", slika: "https://i.imgur.com/e3C4gjJ.jpg" },
  { id: "1534592994596884600", link: "https://link-center.net/6147336/1D4SMa8NjE2R", slika: "https://i.imgur.com/goTG8NB.jpg" },
  { id: "1534593135848587274", link: "https://link-hub.net/6147336/EA6cizsfeUgg", slika: "https://i.imgur.com/I8GBYy0.jpg" },
  { id: "1534593165775077588", link: "https://link-target.net/6147336/L6uH7ZseOYie", slika: "https://i.imgur.com/4lCFiMl.jpg" },
  { id: "1534593182006771832", link: "https://link-target.net/6147336/Zi32obGLvOGn", slika: "https://i.imgur.com/mhVSuOd.jpg" },
  { id: "1534593201707548712", link: "https://link-target.net/6147336/hmsOj764d3Ow", slika: "https://i.imgur.com/YwX2ULR.jpg" },
  { id: "1534593223710871764", link: "https://link-hub.net/6147336/FPvjjoIsLAr8", slika: "https://i.imgur.com/Z0ZiSK7.jpg" },
  { id: "1534593242387976364", link: "https://link-center.net/6147336/afoNOHPlvZLe", slika: "https://i.imgur.com/haDUezy.jpg" },
  { id: "1534593260675272917", link: "https://link-center.net/6147336/cEMFyMHscB1Y", slika: "https://i.imgur.com/rsQDY2r.jpg" },
  { id: "1534593278907912293", link: "https://direct-link.net/6147336/SGNJY1Y1JUcf", slika: "https://i.imgur.com/k1khBDx.jpg" },
  { id: "1534593296737767655", link: "https://link-hub.net/6147336/2EZetlYKszJo", slika: "https://i.imgur.com/jjeF1bd.jpg" },
  { id: "1534593311149396058", link: "https://link-center.net/6147336/ebNlYw9No0YL", slika: "https://i.imgur.com/IJMX23s.jpg" },
  { id: "1534593332381089885", link: "https://link-center.net/6147336/pUnY1nGnjGb8", slika: "https://i.imgur.com/fhAi1Kz.jpg" },
  { id: "1534593348147347627", link: "https://direct-link.net/6147336/JQmfyAaXCaTj", slika: "https://i.imgur.com/hL4vJyw.jpg" },
  { id: "1534593364559794318", link: "https://link-target.net/6147336/aHHfGELXe5k7", slika: "https://i.imgur.com/dqJVQ6u.jpg" },
  { id: "1534593378011058216", link: "https://link-hub.net/6147336/rigwJ7CBqQuA", slika: "https://i.imgur.com/hHWBonk.jpg" },
  { id: "1534593394565976206", link: "https://direct-link.net/6147336/mRQxLNiEtYK0", slika: "https://i.imgur.com/OqhshT9.jpg" },
  { id: "1534593409954615416", link: "https://link-target.net/6147336/6EBSmGAIIDwi", slika: "https://i.imgur.com/BLuBKwG.jpg" },
  { id: "1534593436328399059", link: "https://link-center.net/6147336/je9EMzroTetQ", slika: "https://i.imgur.com/T2sF3gi.jpg" },
  { id: "1534593451683872931", link: "https://link-center.net/6147336/W6mXXF8EyNR5", slika: "https://i.imgur.com/vPayqkW.jpg" },
  { id: "1534593472026378481", link: "https://link-target.net/6147336/L1LZOulEQp5W", slika: "https://i.imgur.com/cur8pa3.jpg" },
  { id: "1534593562245857540", link: "https://link-hub.net/6147336/X9E7DfXhDS9q", slika: "https://i.imgur.com/0KpZsae.jpg" },
  { id: "1534593577349288047", link: "https://direct-link.net/6147336/OucZgSYo6Gux", slika: "https://i.imgur.com/FzATwHh.jpg" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("postavilinkove")
    .setDescription("Šalje poruke sa linkovima u sve kanale")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let uspesno = 0;
    let neuspesno = 0;

    for (const kanal of KANALI) {
      try {
        const ch = await interaction.client.channels.fetch(kanal.id).catch(() => null);
        if (!ch) { neuspesno++; continue; }

        const chName = ch.name.toUpperCase();

        const embed = new EmbedBuilder()
          .setTitle(`🔥 NEW PREMIUM! — ${chName}`)
          .setURL(kanal.link)
          .setDescription(
            `📂 : Mega file with content 🥵 👇\nvideos and pictures\n\n` +
            `When you click the link, you get to the content!\n\n` +
            `-# The links are not viruses, no data is saved and so on.`
          )
          .setColor(0xFF4500)
          .setTimestamp();

        if (kanal.slika) embed.setImage(kanal.slika);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("👁️ View Content")
            .setStyle(ButtonStyle.Link)
            .setURL(kanal.link)
        );

        await ch.send({ content: "@everyone", embeds: [embed], components: [row] });
        uspesno++;

        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Greška u kanalu ${kanal.id}:`, e.message);
        neuspesno++;
      }
    }

    await interaction.editReply(`✅ Poslato u **${uspesno}** kanala. Neuspešno: **${neuspesno}**`);
  }
};