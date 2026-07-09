const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, WebhookClient } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dodajsveporuke")
    .setDescription("Kopira sve poruke iz nekog kanala u ovaj kanal")
    .addStringOption(option =>
      option.setName("kanalid")
        .setDescription("ID kanala iz kojeg želiš da kopiraš poruke")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const kanalId = interaction.options.getString("kanalid");
    const odredisniKanal = interaction.channel;

    // Dohvati izvorni kanal
    let izvorniKanal;
    try {
      izvorniKanal = await interaction.client.channels.fetch(kanalId);
    } catch {
      return interaction.editReply("❌ Ne mogu da nađem kanal sa tim ID-em.");
    }

    await interaction.editReply("⏳ Kopiranje poruka u toku... ovo može potrajati.");

    // Dohvati sve poruke (max 100 po pozivu, ponavljamo dok ne dohvatimo sve)
    let sveporuke = [];
    let lastId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await izvorniKanal.messages.fetch(options);
      if (batch.size === 0) break;

      sveporuke = sveporuke.concat([...batch.values()]);
      lastId = batch.last().id;

      if (batch.size < 100) break;
    }

    // Sortiraj od najstarije ka najnovijoj
    sveporuke.reverse();

    // Napravi ili dohvati webhook
    let webhook;
    try {
      const webhooks = await odredisniKanal.fetchWebhooks();
      webhook = webhooks.find(w => w.owner?.id === interaction.client.user.id);

      if (!webhook) {
        webhook = await odredisniKanal.createWebhook({
          name: "Kopiraj Poruke",
          avatar: interaction.client.user.displayAvatarURL(),
        });
      }
    } catch (e) {
      return interaction.editReply("❌ Ne mogu da kreiram webhook. Provjeri da li bot ima permisiju za Webhooks.");
    }

    const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });

    let kopirano = 0;
    let preskoceno = 0;

    for (const poruka of sveporuke) {
      // Preskoči prazne poruke bez sadržaja
      if (!poruka.content && poruka.embeds.length === 0 && poruka.attachments.size === 0) {
        preskoceno++;
        continue;
      }

      try {
        const options = {
          username: poruka.member?.displayName || poruka.author.username,
          avatarURL: poruka.author.displayAvatarURL(),
          content: poruka.content || undefined,
          embeds: poruka.embeds.length > 0 ? poruka.embeds.map(e => EmbedBuilder.from(e)) : undefined,
          files: poruka.attachments.size > 0 ? [...poruka.attachments.values()].map(a => a.url) : undefined,
        };

        await webhookClient.send(options);
        kopirano++;

        // Pauza da ne udari Discord rate limit
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (e) {
        console.error(`❌ Greška pri kopiranju poruke ${poruka.id}:`, e.message);
        preskoceno++;
      }
    }

    await interaction.editReply(`✅ Gotovo! Kopirano **${kopirano}** poruka. Preskočeno: **${preskoceno}**`);
  }
};