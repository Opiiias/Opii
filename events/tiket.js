const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Kada klikne "Već sam ušao u grupu"
    if (interaction.customId === "vec_usao") {
      let tekst = "✅ Odlično! Ako ste ušli u Telegram grupu Balkanske Droljice i uslikali ekran (screenshot) kao dokaz, kliknite dugme ispod da otvorite tiket i pošaljete screenshot.";

      try {
        const putanja = path.join(__dirname, "../data/ephemeralPoruka.json");
        if (fs.existsSync(putanja)) {
          const podaci = JSON.parse(fs.readFileSync(putanja));
          tekst = podaci.tekst;
        }
      } catch {}

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("otvori_tiket")
          .setLabel("🎫 Otvori tiket")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ content: tekst, components: [row], ephemeral: true });
    }

    // Kada klikne "Otvori tiket"
    if (interaction.customId === "otvori_tiket") {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const member = interaction.member;

      // Provjeri da li već ima otvoren tiket
      const postojeci = guild.channels.cache.find(
        ch => ch.topic === `tiket-${member.id}`
      );

      if (postojeci) {
        return interaction.editReply(`❌ Već imaš otvoren tiket: <#${postojeci.id}>`);
      }

      // Nađi kategoriju Tiketi
      const kategorija = guild.channels.cache.find(
        ch => ch.name === "Tiketi" && ch.type === ChannelType.GuildCategory
      );

      const broj = guild.channels.cache.filter(ch => ch.name.startsWith("tiket-")).size + 1;

      // Kreiraj tiket kanal (vidljiv samo botu i korisniku koji ga je otvorio)
      const tiketKanal = await guild.channels.create({
        name: `tiket-${broj}`,
        type: ChannelType.GuildText,
        topic: `tiket-${member.id}`,
        parent: kategorija?.id || null,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
          },
          {
            id: interaction.client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
        ],
      });

      // Učitaj tiket poruku
      let naslov = "🔞 Balkanske Droljice Verifikacija";
      let opis = `Zdravo ${member}! 👋\n\nAko ste se pridružili telegram grupi pošaljite screen ekrana kao dokaz da ste ušli i sačekajte da vam Admini odobre pristup 18+ Sadržaju.`;
      let boja = "FFD700";
      let slika = null;
      let thumbnail = null;

      try {
        const putanja = path.join(__dirname, "../data/tiketPoruka.json");
        if (fs.existsSync(putanja)) {
          const podaci = JSON.parse(fs.readFileSync(putanja));
          naslov = podaci.naslov || naslov;
          opis = (podaci.opis || opis).replace("{member}", `${member}`);
          boja = podaci.boja || boja;
          slika = podaci.slika || null;
          thumbnail = podaci.thumbnail || null;
        }
      } catch {}

      const embed = new EmbedBuilder()
        .setTitle(naslov)
        .setDescription(opis)
        .setColor(parseInt(boja.replace("#", ""), 16))
        .setTimestamp()
        .setFooter({ text: "Balkanske Droljice Verifikacija" });

      if (slika) embed.setImage(slika);
      if (thumbnail) embed.setThumbnail(thumbnail);

      const zatvoriRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("zatvori_tiket")
          .setLabel("🔒 Zatvori tiket")
          .setStyle(ButtonStyle.Danger)
      );

      await tiketKanal.send({ content: `${member}`, embeds: [embed], components: [zatvoriRow] });
      await interaction.editReply(`✅ Tvoj tiket je otvoren: <#${tiketKanal.id}>\n\nOdi u tiket, pročitaj uputstvo i pošalji screenshot!`);
    }

    // Zatvori tiket
    if (interaction.customId === "zatvori_tiket") {
      await interaction.reply({ content: "🔒 Tiket se zatvara za 5 sekundi...", ephemeral: true });
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};