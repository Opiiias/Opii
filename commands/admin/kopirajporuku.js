const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, WebhookClient } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kopirajporuku")
    .setDescription("Kopira poruku po ID-u i šalje je u ovaj kanal")
    .addStringOption(option =>
      option.setName("porukaid")
        .setDescription("ID poruke koju želiš da kopiraš")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("kanalid")
        .setDescription("ID kanala u kom se nalazi poruka (ako je sa drugog servera)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const porukaid = interaction.options.getString("porukaid");
    const kanalidOpcija = interaction.options.getString("kanalid");

    let targetChannel;

    // Ako je dat ID kanala, traži taj kanal
    if (kanalidOpcija) {
      try {
        targetChannel = await interaction.client.channels.fetch(kanalidOpcija);
      } catch {
        return interaction.editReply("❌ Ne mogu da nađem kanal sa tim ID-em. Provjeri da li je bot na tom serveru.");
      }
    } else {
      targetChannel = interaction.channel;
    }

    // Dohvati poruku
    let poruka;
    try {
      poruka = await targetChannel.messages.fetch(porukaid);
    } catch {
      return interaction.editReply("❌ Ne mogu da nađem poruku sa tim ID-em. Provjeri ID kanala i poruke.");
    }

    const odredisniKanal = interaction.channel;

    // Webhook da izgleda kao originalni pošiljalac
    try {
      const webhooks = await odredisniKanal.fetchWebhooks();
      let webhook = webhooks.find(w => w.owner?.id === interaction.client.user.id);

      if (!webhook) {
        webhook = await odredisniKanal.createWebhook({
          name: "Kopiraj Poruku",
          avatar: interaction.client.user.displayAvatarURL(),
        });
      }

      const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });

      const options = {
        username: poruka.author.username,
        avatarURL: poruka.author.displayAvatarURL(),
        content: poruka.content || undefined,
        embeds: poruka.embeds.length > 0 ? poruka.embeds.map(e => EmbedBuilder.from(e)) : undefined,
        files: poruka.attachments.size > 0 ? [...poruka.attachments.values()].map(a => a.url) : undefined,
      };

      await webhookClient.send(options);
      await interaction.editReply("✅ Poruka je uspješno kopirana!");

    } catch (err) {
      console.error("❌ Greška pri kopiranju poruke:", err);
      await interaction.editReply("❌ Došlo je do greške. Provjeri da li bot ima permisiju za Webhooks u ovom kanalu.");
    }
  }
};