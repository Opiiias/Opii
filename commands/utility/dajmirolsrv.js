const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dajmirolsrv")
    .setDescription("Daje rol korisniku na drugom serveru preko ID-a")
    .addStringOption(opt =>
      opt.setName("serverid")
        .setDescription("ID servera na kom treba da se da rol")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("userid")
        .setDescription("ID korisnika kome se daje rol")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("rolid")
        .setDescription("ID rola koji se daje")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const serverId = interaction.options.getString("serverid");
    const userId = interaction.options.getString("userid");
    const rolId = interaction.options.getString("rolid");

    let guild;
    try {
      guild = await interaction.client.guilds.fetch(serverId);
    } catch {
      return interaction.editReply("❌ Bot nije na tom serveru ili je ID pogrešan.");
    }

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch {
      return interaction.editReply("❌ Taj korisnik nije na tom serveru.");
    }

    let rol;
    try {
      rol = await guild.roles.fetch(rolId);
      if (!rol) throw new Error();
    } catch {
      return interaction.editReply("❌ Taj rol ne postoji na tom serveru.");
    }

    if (member.roles.cache.has(rol.id)) {
      return interaction.editReply(`❌ Korisnik već ima rol **${rol.name}**!`);
    }

    try {
      await member.roles.add(rol);
      await interaction.editReply(`✅ Uspešno dodat rol **${rol.name}** korisniku **${member.user.tag}** na serveru **${guild.name}**!`);
    } catch (e) {
      await interaction.editReply(`❌ Ne mogu da dam ovaj rol. Verovatno je rol viši od uloge bota u hijerarhiji na tom serveru.`);
    }
  }
};