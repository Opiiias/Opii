const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("svirol")
    .setDescription("Daje rol svim memberima koji ga nemaju")
    .addRoleOption(opt =>
      opt.setName("rol")
        .setDescription("Rol koji daješ svim memberima")
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
    let vecImaju = 0;

    for (const [, member] of guild.members.cache) {
      if (member.user.bot) continue;
      if (member.roles.cache.has(rol.id)) { vecImaju++; continue; }

      try {
        await member.roles.add(rol);
        uspesno++;
        await new Promise(r => setTimeout(r, 500));
      } catch {
        neuspesno++;
      }
    }

    await interaction.editReply(`✅ Dato **${uspesno}** memberima.\n⏭️ Već imaju: **${vecImaju}**\n❌ Neuspešno: **${neuspesno}**`);
  }
};