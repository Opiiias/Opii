const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dmsvima")
    .setDescription("Šalje DM poruku svim memberima servera")
    .addStringOption(opt =>
      opt.setName("poruka")
        .setDescription("Poruka (za novi red \\n, za tag korisnika {user})")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const porukaSablon = interaction.options.getString("poruka").replace(/\\n/g, "\n");
    const guild = interaction.guild;

    await guild.members.fetch();

    let uspesno = 0;
    let neuspesno = 0;

    for (const [, member] of guild.members.cache) {
      if (member.user.bot) continue;

      try {
        const poruka = porukaSablon.replace("{user}", `${member}`);
        await member.send(poruka);
        uspesno++;
        await new Promise(r => setTimeout(r, 1000));
      } catch {
        neuspesno++;
      }
    }

    await interaction.editReply(`✅ Poslato **${uspesno}** memberima.\n❌ Neuspešno: **${neuspesno}**`);
  }
};