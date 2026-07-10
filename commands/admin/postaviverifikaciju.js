const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("postaviverifikaciju")
    .setDescription("Postavi poruku za Admiral BET verifikaciju")
    .addChannelOption(opt =>
      opt.setName("kanal")
        .setDescription("Kanal u koji se šalje poruka")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const kanal = interaction.options.getChannel("kanal");

    const embed = new EmbedBuilder()
      .setTitle("🎰 Admiral BET Verifikacija")
      .setDescription(
        "Da biste dobili pristup serveru, potrebno je da se registrujete putem našeg linka na Admiral BET.\n\n" +
        "**Koraci:**\n" +
        "1️⃣ Kliknite dugme **Registruj se** ispod\n" +
        "2️⃣ Registrujte se na Admiral BET sajtu\n" +
        "3️⃣ Vratite se ovde i kliknite **Otvori tiket**\n" +
        "4️⃣ Pošaljite screenshot registracije u tiketu\n" +
        "5️⃣ Sačekajte da naš tim potvrdi vašu registraciju\n\n" +
        "⚠️ **Napomena:** Koristite isključivo naš link za registraciju!"
      )
      .setColor(0xFFD700)
      .setFooter({ text: "Admiral BET x Balkanske droljice" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🎰 Registruj se")
        .setStyle(ButtonStyle.Link)
        .setURL("TVOJ_ADMIRAL_BET_LINK_OVDE"),
      new ButtonBuilder()
        .setCustomId("otvori_tiket")
        .setLabel("🎫 Otvori tiket")
        .setStyle(ButtonStyle.Success)
    );

    await kanal.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "✅ Poruka postavljena!", ephemeral: true });
  }
};