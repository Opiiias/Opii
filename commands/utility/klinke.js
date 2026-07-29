const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const SLIKE = [
  "https://media.discordapp.net/attachments/1531893611334205494/1531986459278442597/BEF238FB-CF4D-47F8-A951-A5D0AD2F67CE.jpg?ex=6a6b3512&is=6a69e392&hm=bdec6abc1115d691dd1dde8e12bbafc3da7ac1f8a54c11519484f272d5ae7424&=&format=webp&width=388&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986459580567593/AACF8CD9-EF24-4BC9-8E78-0BAA26380627.jpg?ex=6a6b3512&is=6a69e392&hm=d9773e92d136416e367459922040e8377f359b9e1ce88db4543cc99d3a3b128d&=&format=webp&width=384&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986459878490253/A3DDA617-372B-44CD-B4DE-442E9F86C6D6.jpg?ex=6a6b3512&is=6a69e392&hm=373d0dff166d166301da92dfef86f50e50ed8de8fae99c7a0297fffff808ca92&=&format=webp&width=385&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986460193067028/23EB131E-C5E3-41C1-A145-57642B350DEE.jpg?ex=6a6b3513&is=6a69e393&hm=d6475600feff33978ed4359c2c32523daab0d3e7ec3a5c3afe635150a77a92ce&=&format=webp&width=388&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986460520091668/428D3BE7-7A54-4DAE-A07D-EA388A7E765A.jpg?ex=6a6b3513&is=6a69e393&hm=2300b5c7e4bc2b1a5111e609b6277856aa12c5a40bd17d8c22bf79bbcd624634&=&format=webp&width=386&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986460868346080/B0F813EA-4846-4185-9B70-90C7617C8B5E.jpg?ex=6a6b3513&is=6a69e393&hm=be5c1b59efb09deed2f37a83b54b6002b36fc71d4d13f0ef800adce695cbf25b&=&format=webp&width=392&height=708",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986461166014644/3F07E44C-92F0-48C7-B432-B5C3C0DBE3F2.jpg?ex=6a6b3513&is=6a69e393&hm=0915869d5bce2724c1e1cc8e45606fff4a3a43bc8d8916af48b6695b9444bd17&=&format=webp&width=384&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986461476262119/2DF66242-2740-4D92-9636-5FA9E31CD702.jpg?ex=6a6b3513&is=6a69e393&hm=40397f7a4ae68177ad51b2846460f202b5cfbb2e62f578cf9c424e175dadc4b4&=&format=webp&width=391&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986462038429727/E03C222B-819A-4B7F-B5E7-0573B7FC54AB.jpg?ex=6a6b3513&is=6a69e393&hm=191bc52a71284c8822ccd2d5002851555396ce2bb281b16523c2f8b0265269c0&=&format=webp&width=392&height=708",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986527062724708/0D0D2052-8F10-470F-96D3-E8D5EFFEC6BB.jpg?ex=6a6b3522&is=6a69e3a2&hm=46298432d049f542eb5aab3877be4ca3c8d10bc6a111f3ea978bea3a93aadca1&=&format=webp&width=383&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986527364583596/D6FD703C-D218-4338-8AE4-A2889E6989B1.jpg?ex=6a6b3523&is=6a69e3a3&hm=b63a8ec47dc55b81d58904c6bbc4ed28dbc9ff26aeeaf02f41a6bc122b5d904a&=&format=webp&width=392&height=708",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986527649923112/BBF8A669-1EB0-4059-9738-3F27F921CB35.jpg?ex=6a6b3523&is=6a69e3a3&hm=415be8d6b9af444f2627accf58351e0e688e825b8043c224dcdcf54cffa89580&=&format=webp&width=383&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986527952044142/10D77CF8-A2F4-4FD1-ADF4-35BF33B447C4.jpg?ex=6a6b3523&is=6a69e3a3&hm=4718236b4df60c3c333866edd897603fb160437506a7a7161c9c06e378f0d3c0&=&format=webp&width=384&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986528228610058/D2C09D88-D6F1-438C-8264-042A65B10B8D.jpg?ex=6a6b3523&is=6a69e3a3&hm=b4c11539936a84a274b3b14210f6730b32309a975c332a2d72c23f45e463df98&=&format=webp&width=389&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986528505565334/90099ED5-C46D-405B-B1AD-0583BAC63646.jpg?ex=6a6b3523&is=6a69e3a3&hm=98ed7454faa98baff2c515fe737f94336b7c5e6797d23ccc025bd1041e45dc00&=&format=webp&width=389&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986528807424030/BEE521B0-D2D9-43D2-B74B-20D4D5044FFB.jpg?ex=6a6b3523&is=6a69e3a3&hm=6c4f2201ef9cc3d72fa93611dce7625c93d077abc3bcec24494f39563670e7fb&=&format=webp&width=510&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986529172455547/7A2396B1-C1AD-4D9B-94A7-AEA43721E825.jpg?ex=6a6b3523&is=6a69e3a3&hm=9e7c8411ae912be4ae7fa9f7c6d82c80187393d7748650b146496d5ac188f7c6&=&format=webp&width=394&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986610139304016/B60D3C24-65B9-477A-8AEA-E323498FCBD2.jpg?ex=6a6b3536&is=6a69e3b6&hm=123b0e510971ab2d525938e793558761cd268ca1bfa99f8740b932b54c30ab3a&=&format=webp&width=392&height=708",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986610479038616/931EAC5B-7222-4902-A5C2-E3A406B8C52D.jpg?ex=6a6b3536&is=6a69e3b6&hm=34d3bff948b93d4fb63015fc30de85c9d8014f5c7d822e1c9e3f74d955895af2&=&format=webp&width=391&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986610965708871/B18F7EB7-2259-4F65-AA91-D5F300ACD08F.jpg?ex=6a6b3536&is=6a69e3b6&hm=bb1f073b6f94e9d8adbd96ffd321a3293848dc9e7bfdd57c0d025dffd490448b&=&format=webp&width=387&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986612958003231/4515DFF5-BA8B-4F2B-B7B0-F7C524DAC170.jpg?ex=6a6b3537&is=6a69e3b7&hm=530c60151c48029fe5123d63f5d60fa4f88c3e028213679e704f69f5a3050faa&=&format=webp&width=383&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986613301805117/0E9FCE0C-10F9-4D90-B8F9-4DA65B78617A.jpg?ex=6a6b3537&is=6a69e3b7&hm=c18fbcc28db994d6813da054e0a350da48fbd40f197e16756cbffb0c7a7c68aa&=&format=webp&width=386&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986613603799261/68AEB53D-9F4C-4E0D-8DF6-B4D5B6CD0284.jpg?ex=6a6b3537&is=6a69e3b7&hm=55e9416272b62f94af163e238a96bc5a33bcda804f37c86d3b035592597f38a4&=&format=webp&width=384&height=709",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986663356498130/F011A3AD-5861-443C-BE6A-2ABBB880976A.jpg?ex=6a6b3543&is=6a69e3c3&hm=08d4c43b5177412196b9694e281744457cfd69e567bb4b350db7370c92d27e6a&=&format=webp&width=392&height=708",
  "https://media.discordapp.net/attachments/1531893611334205494/1531986663809749073/0D210C4A-0CFC-4E93-8847-AA1647C188D5.jpg?ex=6a6b3543&is=6a69e3c3&hm=21495fa895898314fd5840857137902b23bd8d8540b5079dc03105abf0503c59&=&format=webp&width=384&height=708",
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