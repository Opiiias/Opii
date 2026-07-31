const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const SLIKE = [
  "https://imgur.com/zqetS1O.jpg",
  "https://imgur.com/2M7FlnU.jpg",
  "https://imgur.com/fTcHgSg.jpg",
  "https://imgur.com/6keQ8ex.jpg",
  "https://imgur.com/MaoRcFE.jpg",
  "https://imgur.com/3zNQ1Kg.jpg",
  "https://imgur.com/1zs3jb4.jpg",
  "https://imgur.com/d5uNkj6.jpg",
  "https://imgur.com/xqzzVje.jpg",
  "https://imgur.com/2HNqMp9.jpg",
  "https://imgur.com/Gu5yVVA.jpg",
  "https://imgur.com/jOrrOFd.jpg",
  "https://imgur.com/VULZXqS.jpg",
  "https://imgur.com/LSNrwGS.jpg",
  "https://imgur.com/SQtzusT.jpg",
  "https://imgur.com/vLqTfYN.jpg",
  "https://imgur.com/WtmYvTu.jpg",
  "https://imgur.com/AjYJfSn.jpg",
  "https://imgur.com/mdnndaM.jpg",
];

const aktivneIgre = new Map();

function izmesaj(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("klinke")
    .setDescription("Pokreni igru Koja je bolja klinka!"),

  async execute(interaction) {
    const channelId = interaction.channelId;

    if (aktivneIgre.has(channelId)) {
      return interaction.reply({
        content: "❌ Igra je već aktivna u ovom kanalu!",
        ephemeral: true,
      });
    }

    aktivneIgre.set(channelId, true);

    const mesaneSlike = izmesaj(SLIKE);

    const prijavaEmbed = new EmbedBuilder()
      .setColor(0xe91e8c)
      .setTitle("🔥 Koja je bolja klinka?")
      .setDescription(
        "Turnir počinje! Ko želi da učestvuje, stiklira ✅ ispod!\n\n⏳ **Prijave se zatvaraju za 7 sekundi!**"
      )
      .setTimestamp();

    const prijavaRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prijava_klinke")
        .setLabel("✅ Učestvujem!")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [prijavaEmbed], components: [prijavaRow] });
    const prijavaMsg = await interaction.fetchReply();

    await new Promise((r) => setTimeout(r, 7000));

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prijava_klinke")
        .setLabel("✅ Prijave zatvorene")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    await prijavaMsg.edit({ components: [disabledRow] });

    await pokreniTurnir(interaction, channelId, mesaneSlike);
  },
};

async function pokreniTurnir(interaction, channelId, slike) {
  const channel = interaction.channel;
  let trenutnaPobednica = null;
  let preostale = [...slike];
  const ukupnoRundi = slike.length - 1;

  for (let runda = 0; runda < ukupnoRundi; runda++) {
    const prva = trenutnaPobednica || preostale.shift();
    const druga = preostale.shift();

    if (!druga) break;

    await channel.send({
      content: "⬅️ **Prva klinka**",
      files: [prva],
    }).catch(() => null);

    await channel.send({
      content: "➡️ **Druga klinka**",
      files: [druga],
    }).catch(() => null);

    const glasanjeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prva_klinka")
        .setLabel("⬅️ Prva klinka")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("druga_klinka")
        .setLabel("➡️ Druga klinka")
        .setStyle(ButtonStyle.Primary)
    );

    const glasanjeEmbed = new EmbedBuilder()
      .setColor(0xe91e8c)
      .setTitle(`🗳️ Glasanje — Runda ${runda + 1}/${ukupnoRundi}`)
      .setDescription("Ko je bolja klinka? Glasaj ispod! ⏳ **7 sekundi**");

    const glasanjeMsg = await channel.send({
      embeds: [glasanjeEmbed],
      components: [glasanjeRow],
    });

    const glasovi = { prva_klinka: new Set(), druga_klinka: new Set() };

    const kolektor = glasanjeMsg.createMessageComponentCollector({ time: 7000 });

    kolektor.on("collect", async (btn) => {
      await btn.deferUpdate();
      glasovi.prva_klinka.delete(btn.user.id);
      glasovi.druga_klinka.delete(btn.user.id);
      glasovi[btn.customId].add(btn.user.id);
    });

    await new Promise((r) => setTimeout(r, 7500));
    kolektor.stop();

    const disabledGlasanje = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prva_klinka")
        .setLabel(`⬅️ Prva (${glasovi.prva_klinka.size})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("druga_klinka")
        .setLabel(`➡️ Druga (${glasovi.druga_klinka.size})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
    );
    await glasanjeMsg.edit({ components: [disabledGlasanje] });

    const prvaGlasovi = glasovi.prva_klinka.size;
    const drugaGlasovi = glasovi.druga_klinka.size;

    if (prvaGlasovi === 0 && drugaGlasovi === 0) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("😴 Niko nije glasao!")
            .setDescription("Igra se resetuje. Pokreni ponovo sa `/klinke`!"),
        ],
      });
      aktivneIgre.delete(channelId);
      return;
    }

    if (prvaGlasovi >= drugaGlasovi) {
      trenutnaPobednica = prva;
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`✅ Prva klinka ide dalje! (${prvaGlasovi} vs ${drugaGlasovi})`)
            .setDescription(runda < ukupnoRundi - 1 ? "➡️ Sledeća runda počinje za trenutak..." : "🏆 **FINALE!**")
            .setImage(prva),
        ],
      });
    } else {
      trenutnaPobednica = druga;
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`✅ Druga klinka ide dalje! (${drugaGlasovi} vs ${prvaGlasovi})`)
            .setDescription(runda < ukupnoRundi - 1 ? "➡️ Sledeća runda počinje za trenutak..." : "🏆 **FINALE!**")
            .setImage(druga),
        ],
      });
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("👑 ONA JE NAJBOLJA KLINKA!")
        .setDescription("Čestitamo pobednici turnira! 🎉🔥")
        .setImage(trenutnaPobednica)
        .setTimestamp(),
    ],
  });

  aktivneIgre.delete(channelId);
}