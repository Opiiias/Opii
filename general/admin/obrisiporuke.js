const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("obrisiporuke")
    .setDescription("Briše određeni broj poruka u ovom kanalu")
    .addIntegerOption(opt =>
      opt.setName("broj")
        .setDescription("Koliko poruka da obriše (max 100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const broj = interaction.options.getInteger("broj");

    await interaction.deferReply({ ephemeral: true });

    try {
      const obrisane = await interaction.channel.bulkDelete(broj, true);
      await interaction.editReply(`✅ Obrisano **${obrisane.size}** poruka!`);
    } catch (e) {
      await interaction.editReply("❌ Greška — poruke starije od 14 dana ne mogu se brisati!");
    }
  }
};