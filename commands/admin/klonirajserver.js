const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("klonirajserver")
    .setDescription("Kopira sve kanale iz ovog servera u drugi server bez brisanja")
    .addStringOption(option =>
      option.setName("serverid")
        .setDescription("ID ciljnog servera u koji se kopiraju kanali")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetId = interaction.options.getString("serverid");
    const sourceGuild = interaction.guild;

    if (targetId === sourceGuild.id) {
      return interaction.editReply("❌ Ne možeš koristiti isti server kao izvor i cilj!");
    }

    const targetGuild = interaction.client.guilds.cache.get(targetId);
    if (!targetGuild) {
      return interaction.editReply("❌ Bot nije na tom serveru ili je ID pogrešan.");
    }

    try {
      await interaction.editReply("⏳ Počinjem kloniranje... ovo može potrajati.");

      await sourceGuild.channels.fetch();
      const sourceChannels = sourceGuild.channels.cache.sort((a, b) => a.position - b.position);

      // Mapa: stari ID kategorije -> novi kanal objekat
      const categoryMap = new Map();

      // 1. Kreiraj kategorije
      for (const [, channel] of sourceChannels) {
        if (channel.type !== ChannelType.GuildCategory) continue;

        const permissionOverwrites = channel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id === sourceGuild.id ? targetGuild.id : overwrite.id,
          allow: overwrite.allow,
          deny: overwrite.deny,
          type: overwrite.type,
        }));

        try {
          const newCategory = await targetGuild.channels.create({
            name: channel.name,
            type: ChannelType.GuildCategory,
            position: channel.position,
            permissionOverwrites,
          });
          categoryMap.set(channel.id, newCategory);
        } catch (e) {
          console.error(`❌ Greška pri kreiranju kategorije ${channel.name}:`, e.message);
        }
      }

      // 2. Kreiraj ostale kanale
      for (const [, channel] of sourceChannels) {
        if (channel.type === ChannelType.GuildCategory) continue;

        const permissionOverwrites = channel.permissionOverwrites.cache.map(overwrite => ({
          id: overwrite.id === sourceGuild.id ? targetGuild.id : overwrite.id,
          allow: overwrite.allow,
          deny: overwrite.deny,
          type: overwrite.type,
        }));

        const options = {
          name: channel.name,
          type: channel.type,
          position: channel.position,
          permissionOverwrites,
        };

        if (channel.parentId && categoryMap.has(channel.parentId)) {
          options.parent = categoryMap.get(channel.parentId).id;
        }

        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
          options.topic = channel.topic || undefined;
          options.nsfw = channel.nsfw;
          options.rateLimitPerUser = channel.rateLimitPerUser;
        }

        if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
          options.bitrate = channel.bitrate;
          options.userLimit = channel.userLimit;
        }

        try {
          await targetGuild.channels.create(options);
        } catch (e) {
          console.error(`❌ Greška pri kreiranju kanala ${channel.name}:`, e.message);
        }
      }

      await interaction.editReply(`✅ Uspešno klonirani svi kanali u server **${targetGuild.name}**!`);

    } catch (err) {
      console.error("❌ Greška pri kloniranju:", err);
      await interaction.editReply("❌ Došlo je do greške pri kloniranju.");
    }
  }
};