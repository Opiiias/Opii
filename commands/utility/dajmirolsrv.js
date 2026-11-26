const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const serverId = interaction.options.getString("serverid");
    const userId = interaction.options.getString("userid");

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

    await guild.roles.fetch();
    const botMember = await guild.members.fetchMe();
    const botPozicija = botMember.roles.highest.position;

    // Filtriraj samo rolove koje bot moze da da (ispod bot rola i nije @everyone)
    const dostupniRolovi = guild.roles.cache
      .filter(r => r.id !== guild.id && r.position < botPozicija)
      .sort((a, b) => b.position - a.position)
      .first(25);

    if (dostupniRolovi.length === 0) {
      return interaction.editReply("❌ Bot nema rolova koje može da dodeli na ovom serveru.");
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`dajrol_${guild.id}_${member.id}`)
      .setPlaceholder("Izaberi rol koji želiš da dodeliš")
      .addOptions(
        dostupniRolovi.map(r => ({
          label: r.name,
          value: r.id,
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      content: `📋 Izaberi rol za korisnika **${member.user.tag}** na serveru **${guild.name}**:`,
      components: [row]
    });
  }
};