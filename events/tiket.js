const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "verifikovao_sam_se") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("otvori_tiket")
          .setLabel("🎫 Otvori tiket")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🔐 Ako ste ušli na link i videli kod, potrebno je da otvorite tiket i napišete sedmocifreni broj koji je pisao u folderu.\n\n👇 Kliknite **Otvori tiket** ispod!",
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === "otvori_tiket") {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const member = interaction.member;

      const postojeci = guild.channels.cache.find(
        ch => ch.topic === `tiket-${member.id}`
      );

      if (postojeci) {
        return interaction.editReply(`❌ Već imaš otvoren tiket: <#${postojeci.id}>`);
      }

      const kategorija = guild.channels.cache.find(
        ch => ch.name === "Tiketi" && ch.type === ChannelType.GuildCategory
      );

      const broj = guild.channels.cache.filter(ch => ch.name.startsWith("tiket-")).size + 1;

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

      const embed = new EmbedBuilder()
        .setTitle("🎫 Verifikacija — Unos koda")
        .setDescription(
          `Zdravo ${member}! 👋\n\n` +
          "**Uputstvo:**\n\n" +
          "1️⃣ Unesite **sedmocifreni kod** koji ste videli u folderu na linku\n" +
          "2️⃣ Napišite kod ovde u tiketu\n" +
          "3️⃣ Sačekajte da Admin proveri i potvrdi vašu verifikaciju\n\n" +
          "✅ Nakon potvrde dobićete pristup svom sadržaju!\n\n" +
          "⚠️ **Napomena:** Kod mora biti tačan kako bi verifikacija bila prihvaćena!"
        )
        .setColor(0xFF0000)
        .setTimestamp()
        .setFooter({ text: "Verifikacija" });

      const zatvoriRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("zatvori_tiket")
          .setLabel("🔒 Zatvori tiket")
          .setStyle(ButtonStyle.Danger)
      );

      await tiketKanal.send({ content: `${member}`, embeds: [embed], components: [zatvoriRow] });
      await interaction.editReply(`✅ Tvoj tiket je otvoren: <#${tiketKanal.id}>\n\nOdi u tiket i upiši sedmocifreni kod!`);
    }

    if (interaction.customId === "zatvori_tiket") {
      await interaction.reply({ content: "🔒 Tiket se zatvara za 5 sekundi...", ephemeral: true });
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};