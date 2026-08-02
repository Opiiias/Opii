const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Kada klikne "Već sam ušao u grupu"
    if (interaction.customId === "vec_usao") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("otvori_tiket")
          .setLabel("🎫 Otvori tiket")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "✅ Odlično! Ako si se pridružio Telegram grupi i skrinuo ekran, klikni dugme ispod da otvoriš tiket i pošalješ screenshot kao dokaz!\n\n👇 Klikni **Otvori tiket** ispod!",
        components: [row],
        ephemeral: true
      });
    }

    // Otvori tiket
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
        .setTitle("🎫 Verifikacija — Telegram Grupa")
        .setDescription(
          `Zdravo ${member}! 👋\n\n` +
          "**Uputstvo:**\n\n" +
          "1️⃣ Pošaljite **screenshot** kao dokaz da ste se pridružili Telegram grupi\n" +
          "2️⃣ Screenshot mora jasno prikazivati da ste član grupe\n" +
          "3️⃣ Sačekajte da Admin pregleda vaš screenshot i odobri pristup\n\n" +
          "✅ Nakon odobrenja dobićete pristup ekskluzivnom 18+ sadržaju!\n\n" +
          "⚠️ **Napomena:** Screenshot mora biti jasan i čitak!"
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
      await interaction.editReply(`✅ Tvoj tiket je otvoren: <#${tiketKanal.id}>\n\nOdi u tiket i pošalji screenshot!`);
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