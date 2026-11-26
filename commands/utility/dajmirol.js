const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dajmirol")
    .setDescription("Dodeli sebi rol koji izabereš")
    .addRoleOption(opt =>
      opt.setName("rol")
        .setDescription("Rol koji želiš da dobiješ")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const rol = interaction.options.getRole("rol");
    const member = interaction.member;

    if (member.roles.cache.has(rol.id)) {
      return interaction.reply({
        content: `❌ Već imaš rol **${rol.name}**!`,
        ephemeral: true
      });
    }

    try {
      await member.roles.add(rol);
      await interaction.reply({
        content: `✅ Uspešno si dobio rol **${rol.name}**!`,
        ephemeral: true
      });
    } catch (e) {
      await interaction.reply({
        content: `❌ Ne mogu da ti dam ovaj rol. Verovatno je rol viši od uloge bota u hijerarhiji.`,
        ephemeral: true
      });
    }
  }
};