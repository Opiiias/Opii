const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const SLIKE = [
  "https://images-ext-1.discordapp.net/external/iUzbbSSOK-LLhR1Bx-lj77hInouPEGL4NhtYgX7NMPk/https/probot.media/sUrkixW2P4.jpg?format=webp",
  "https://images-ext-1.discordapp.net/external/UzLjKhBTlCkbMWj2TJAdQfLdkOcDOty1L03Y4HpMl_E/%3Fformat%3Dwebp%26width%3D477%26height%3D750/https/images-ext-1.discordapp.net/external/Oq4YFxaOC_t3560hJ1KnXdBQ31phPDV1GhlW0iiQ1B8/https/probot.media/UQqT6Oqx9u.jpg?format=webp",
  "https://images-ext-1.discordapp.net/external/AxpgJbo5wANYaorOdfelxfTcjyXY1mLRyjY60vkXBVQ/https/probot.media/VvKYpTc8rf.jpg?format=webp",
  "https://images-ext-1.discordapp.net/external/_4Tdj07VHhEsdVv5OFLXcKDitvVvOyL2_95tV4GWito/https/probot.media/N1qPJN3i56.jpg?format=webp&width=215&height=300",
  "https://media.discordapp.net/attachments/1505090150844076136/1511286175195861002/IMG_3580.png?ex=6a2fb86e&is=6a2e66ee&hm=145158fc5ff8243131b284d77cad4697fe543a1c3206b0cba9d49bb9537d26f4&=&format=webp&quality=lossless&width=410&height=750",
  "https://images-ext-1.discordapp.net/external/YgFvgObO4Vl3kFmSd1QVYrrjVrDhOKx0j2nmSnFBVv8/https/probot.media/tVVE541jNk.jpg?format=webp&width=423&height=750",
  "https://images-ext-1.discordapp.net/external/izbW8rLdRFC7YwFTaOOI8SBL5jLr8epZsXAseH6PGEw/https/probot.media/GTV2qYr1K2.jpg?format=webp",
];

// Aktivne igre po kanalu
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
    .setName("iliili")
    .setDescription("Pokreni igru Koja je bolja devojka!"),

  async execute(interaction) {
    const channelId = interaction.channelId;

    if (aktivneIgre.has(channelId)) {
      return interaction.reply({
        content: "❌ Igra je već aktivna u ovom kanalu!",
        ephemeral: true,
      });
    }

    aktivneIgre.set(channelId, true);

    // Izmesaj slike
    const mesaneSlike = izmesaj(SLIKE);

    // Prijava igrača
    const prijavaEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎮 Koja je bolja devojka?")
      .setDescription(
        "Turnir počinje! Ko želi da učestvuje, stiklira ✅ ispod!\n\n⏳ **Prijave se zatvaraju za 7 sekundi!**"
      )
      .setTimestamp();

    const prijavaRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prijava")
        .setLabel("✅ Učestvujem!")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [prijavaEmbed], components: [prijavaRow] });
    const prijavaMsg = await interaction.fetchReply();

    // Čekaj 7 sekundi za prijave
    await new Promise((r) => setTimeout(r, 7000));

    // Fetch poruke da dobijemo ko je kliknuo
    const updatedMsg = await prijavaMsg.fetch();
    const igraci = new Set();

    // Sakupi igrače iz button interakcija
    const collector = updatedMsg.createMessageComponentCollector({ time: 1 });
    collector.stop();

    // Disable dugme prijave
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prijava")
        .setLabel("✅ Prijave zatvorene")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    await prijavaMsg.edit({ components: [disabledRow] });

    // Pokrenemo turnir sa svim 7 slika
    await pokreniTurnir(interaction, channelId, mesaneSlike, igraci);
  },
};

async function pokreniTurnir(interaction, channelId, slike, igraci) {
  const channel = interaction.channel;
  let trenutnaPobednica = null;
  let preostale = [...slike];

  for (let runda = 0; runda < 6; runda++) {
    const leva = trenutnaPobednica || preostale.shift();
    const desna = preostale.shift();

    if (!desna) break;

    const rundaEmbed = new EmbedBuilder()
      .setColor(0xe91e8c)
      .setTitle(`🏆 Runda ${runda + 1}/6 — Koja je bolja?`)
      .setDescription(
        `**Leva devojka** vs **Desna devojka**\n\nGlasajte ispod! ⏳ **7 sekundi!**`
      )
      .setImage(leva)
      .setTimestamp();

    // Pošalji levu sliku
    const levaMsg = await channel.send({
      content: "⬅️ **Leva devojka**",
      files: [leva],
    }).catch(() => null);

    // Pošalji desnu sliku
    const desnaMsg = await channel.send({
      content: "➡️ **Desna devojka**",
      files: [desna],
    }).catch(() => null);

    // Glasanje
    const glasanjeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("leva")
        .setLabel("⬅️ Leva devojka")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("desna")
        .setLabel("➡️ Desna devojka")
        .setStyle(ButtonStyle.Primary)
    );

    const glasanjeEmbed = new EmbedBuilder()
      .setColor(0xe91e8c)
      .setTitle(`🗳️ Glasanje — Runda ${runda + 1}/6`)
      .setDescription("Ko je bolja? Glasaj ispod! ⏳ **7 sekundi**");

    const glasanjeMsg = await channel.send({
      embeds: [glasanjeEmbed],
      components: [glasanjeRow],
    });

    // Skupljaj glasove 7 sekundi
    const glasovi = { leva: new Set(), desna: new Set() };

    const kolektor = glasanjeMsg.createMessageComponentCollector({
      time: 7000,
    });

    kolektor.on("collect", async (btn) => {
      await btn.deferUpdate();
      // Ukloni prethodni glas
      glasovi.leva.delete(btn.user.id);
      glasovi.desna.delete(btn.user.id);
      // Dodaj novi glas
      glasovi[btn.customId].add(btn.user.id);
    });

    await new Promise((r) => setTimeout(r, 7500));
    kolektor.stop();

    // Disable dugmad
    const disabledGlasanje = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("leva")
        .setLabel(`⬅️ Leva (${glasovi.leva.size})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("desna")
        .setLabel(`➡️ Desna (${glasovi.desna.size})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)
    );
    await glasanjeMsg.edit({ components: [disabledGlasanje] });

    // Proveri ko je pobedio
    const levaGlasovi = glasovi.leva.size;
    const desnaGlasovi = glasovi.desna.size;

    if (levaGlasovi === 0 && desnaGlasovi === 0) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("😴 Niko nije glasao!")
            .setDescription("Igra se resetuje. Pokreni ponovo sa `/iliili`!"),
        ],
      });
      aktivneIgre.delete(channelId);
      return;
    }

    if (levaGlasovi >= desnaGlasovi) {
      trenutnaPobednica = leva;
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`✅ Leva devojka ide dalje! (${levaGlasovi} vs ${desnaGlasovi})`)
            .setDescription(
              runda < 5
                ? "➡️ Sledeća runda počinje za trenutak..."
                : "🏆 **FINALE!**"
            )
            .setImage(leva),
        ],
      });
    } else {
      trenutnaPobednica = desna;
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`✅ Desna devojka ide dalje! (${desnaGlasovi} vs ${levaGlasovi})`)
            .setDescription(
              runda < 5
                ? "➡️ Sledeća runda počinje za trenutak..."
                : "🏆 **FINALE!**"
            )
            .setImage(desna),
        ],
      });
    }

    // Pauza između rundi
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Pobednica
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("👑 ONA JE NAJBOLJA DEVOJKA!")
        .setDescription("Čestitamo pobednici turnira! 🎉")
        .setImage(trenutnaPobednica)
        .setTimestamp(),
    ],
  });

  aktivneIgre.delete(channelId);
}