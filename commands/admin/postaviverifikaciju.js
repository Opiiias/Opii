const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("postaviverifikaciju")
    .setDescription("Postavi poruku za Telegram verifikaciju")
    .addChannelOption(opt =>
      opt.setName("kanal")
        .setDescription("Kanal u koji se šalje poruka")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("naslov")
        .setDescription("Naslov poruke")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("opis")
        .setDescription("Opis poruke (za novi red piši \\n)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("boja")
        .setDescription("Boja embeda u hex (npr. FF0000)")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("slika")
        .setDescription("Link slike ili gifa")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const kanal = interaction.options.getChannel("kanal");
    const naslov = interaction.options.getString("naslov");
    const opis = interaction.options.getString("opis").replace(/\\n/g, "\n");
    const bojaHex = interaction.options.getString("boja") || "FF0000";
    const slika = interaction.options.getString("slika");

    const boja = parseInt(bojaHex.replace("#", ""), 16);

    const embed = new EmbedBuilder()
      .setTitle(naslov)
      .setDescription(opis)
      .setColor(boja)
      .setTimestamp()
      .setFooter({ text: "Verifikacija" });

    if (slika) embed.setImage(slika);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("📲 Uđi u Telegram grupu")
        .setStyle(ButtonStyle.Link)
        .setURL("https://t.me/balkanskedr"),
      new ButtonBuilder()
        .setCustomId("vec_usao")
        .setLabel("✅ Već sam ušao u grupu")
        .setStyle(ButtonStyle.Primary)
    );

    await kanal.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "✅ Poruka postavljena!", ephemeral: true });
  }
};