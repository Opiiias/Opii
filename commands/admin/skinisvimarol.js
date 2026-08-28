const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skinisvimarol")
    .setDescription("Skida rol svim memberima koji ga imaju")
    .addRoleOption(opt =>
      opt.setName("rol")
        .setDescription("Rol koji skinaš svim memberima")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const rol = interaction.options.getRole("rol");
    const guild = interaction.guild;

    await guild.members.fetch();

    let uspesno = 0;
    let neuspesno = 0;
    let nemaju = 0;

    for (const [, member] of guild.members.cache) {
      if (member.user.bot) continue;
      if (!member.roles.cache.has(rol.id)) { nemaju++; continue; }

      try {
        await member.roles.remove(rol);
        uspesno++;
        await new Promise(r => setTimeout(r, 500));
      } catch {
        neuspesno++;
      }
    }

    await interaction.editReply(`✅ Skinuto **${uspesno}** memberima.\n⏭️ Nisu imali: **${nemaju}**\n❌ Neuspešno: **${neuspesno}**`);
  }
};