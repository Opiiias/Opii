const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Pošalji obaveštenje kao Embed.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName("naslov").setDescription("Naslov embed-a").setRequired(true))
    .addStringOption((o) => o.setName("opis").setDescription("Tekst poruke").setRequired(true))
    .addChannelOption((o) => o.setName("kanal").setDescription("Kanal za slanje").setRequired(false))
    .addStringOption((o) => o.setName("slika").setDescription("URL slike").setRequired(false))
    .addStringOption((o) => o.setName("link").setDescription("URL za dugme 'Pogledaj'").setRequired(false))
    .addStringOption((o) => o.setName("boja").setDescription("Hex boja npr. #FF5733").setRequired(false))
    .addStringOption((o) => o.setName("tag").setDescription("Koga da taguje npr. @everyone @here ili @Korisnik").setRequired(false)),

  async execute(interaction) {
    const naslov = interaction.options.getString("naslov");
    const opis = interaction.options.getString("opis");
    const channel = interaction.options.getChannel("kanal") || interaction.channel;
    const slika = interaction.options.getString("slika");
    const link = interaction.options.getString("link");
    const bojaRaw = interaction.options.getString("boja") || "#5865F2";
    const tag = interaction.options.getString("tag") || null;
    const boja = parseInt(bojaRaw.replace("#", ""), 16) || 0x5865f2;

    const embed = new EmbedBuilder()
      .setColor(boja)
      .setTitle(naslov)
      .setDescription(opis)
      .setTimestamp()
      .setFooter({ text: `Objavio: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (slika) embed.setImage(slika);

    let components = [];
    if (link) {
      const dugme = new ButtonBuilder()
        .setLabel("👁️ Pogledaj")
        .setURL(link)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(dugme);
      components = [row];
    }

    try {
      await channel.send({
        content: tag || undefined,
        embeds: [embed],
        components,
      });
      await interaction.reply({ content: `✅ Poruka poslata u <#${channel.id}>!`, ephemeral: true });
    } catch {
      await interaction.reply({ content: "❌ Nemam pristup tom kanalu.", ephemeral: true });
    }
  },
};