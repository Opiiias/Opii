const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ocistiserver")
    .setDescription("Briše sve kanale na ciljnom serveru")
    .addStringOption(option =>
      option.setName("serverid")
        .setDescription("ID servera na kom želiš da obrišeš sve kanale")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetId = interaction.options.getString("serverid");
    const sourceGuild = interaction.guild;

    if (targetId === sourceGuild.id) {
      return interaction.editReply("❌ Ne možeš koristiti isti server!");
    }

    let targetGuild;
    try {
      targetGuild = await interaction.client.guilds.fetch(targetId);
      await targetGuild.channels.fetch();
    } catch {
      return interaction.editReply("❌ Bot nije na tom serveru ili je ID pogrešan.");
    }

    await interaction.editReply(`⏳ Brišem sve kanale na serveru **${targetGuild.name}**...`);

    let obrisano = 0;
    let greske = 0;

    for (const [, channel] of targetGuild.channels.cache) {
      try {
        await channel.delete();
        obrisano++;
      } catch (e) {
        greske++;
        console.error(`❌ Nije moguće obrisati ${channel.name}:`, e.message);
      }
    }

    await interaction.editReply(`✅ Gotovo! Obrisano **${obrisano}** kanala. Greške: **${greske}**`);
  }
};