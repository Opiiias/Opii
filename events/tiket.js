const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require("discord.js");

let tiketBrojac = 1;

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "otvori_tiket") {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const member = interaction.member;

      // Provjeri da li vec ima otvoren tiket
      const postojeci = guild.channels.cache.find(
        ch => ch.name === `tiket-${member.user.username.toLowerCase().replace(/\s/g, "-")}`
      );

      if (postojeci) {
        return interaction.editReply(`❌ Već imaš otvoren tiket: <#${postojeci.id}>`);
      }

      // Nađi kategoriju Tiketi
      const kategorija = guild.channels.cache.find(
        ch => ch.name === "Tiketi" && ch.type === ChannelType.GuildCategory
      );

      // Kreiraj tiket kanal
      const tiketKanal = await guild.channels.create({
        name: `tiket-${tiketBrojac++}`,
        type: ChannelType.GuildText,
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

      // Poruka u tiketu
      const tiketEmbed = new EmbedBuilder()
        .setTitle("🎫 Admiral BET Verifikacija")
        .setDescription(
          `Zdravo ${member}! 👋\n\n` +
          "**Uputstvo za verifikaciju:**\n\n" +
          "1️⃣ Pošaljite screenshot vaše registracije na Admiral BET\n" +
          "2️⃣ Screenshot mora prikazivati vaše korisničko ime i datum registracije\n" +
          "3️⃣ Registracija mora biti obavljena putem našeg linka\n" +
          "4️⃣ Sačekajte da naš tim pregleda vaš zahtev\n\n" +
          "⏳ Vreme čekanja: **do 24 sata**\n\n" +
          "❓ Ako imate pitanja, slobodno ih postavite ovde."
        )
        .setColor(0xFFD700)
        .setFooter({ text: "Admiral BET Verifikacija" })
        .setTimestamp();

      const zatvoriRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("zatvori_tiket")
          .setLabel("🔒 Zatvori tiket")
          .setStyle(ButtonStyle.Danger)
      );

      await tiketKanal.send({ content: `${member}`, embeds: [tiketEmbed], components: [zatvoriRow] });

      await interaction.editReply(`✅ Tvoj tiket je otvoren: <#${tiketKanal.id}>`);
    }

    if (interaction.customId === "zatvori_tiket") {
      await interaction.reply({ content: "🔒 Tiket se zatvara za 5 sekundi...", ephemeral: true });
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  }
};