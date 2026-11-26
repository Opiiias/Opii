const { Events, EmbedBuilder } = require("discord.js");
const { CustomCommand } = require("../schemas");

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction, client) {
    // Select menu za dajmirolsrv
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("dajrol_")) {
      await interaction.deferUpdate();

      const [, serverId, userId] = interaction.customId.split("_");
      const rolId = interaction.values[0];

      try {
        const guild = await interaction.client.guilds.fetch(serverId);
        const member = await guild.members.fetch(userId);
        const rol = await guild.roles.fetch(rolId);

        if (member.roles.cache.has(rol.id)) {
          return interaction.editReply({
            content: `❌ Korisnik već ima rol **${rol.name}**!`,
            components: []
          });
        }

        await member.roles.add(rol);
        await interaction.editReply({
          content: `✅ Uspešno dodat rol **${rol.name}** korisniku **${member.user.tag}** na serveru **${guild.name}**!`,
          components: []
        });
      } catch (e) {
        await interaction.editReply({
          content: `❌ Greška pri dodeli rola: ${e.message}`,
          components: []
        });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (command) {
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Greška u komandi ${interaction.commandName}:`, err);
        const msg = { content: "❌ Greška pri izvršavanju komande.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
      return;
    }

    if (!interaction.guild) return;

    const custom = await CustomCommand.findOne({
      guildId: interaction.guild.id,
      name: interaction.commandName,
    });

    if (custom) {
      const embed = new EmbedBuilder()
        .setColor(custom.color || "#5865F2")
        .setTitle(custom.name.charAt(0).toUpperCase() + custom.name.slice(1))
        .setDescription(custom.description);

      if (custom.imageUrl) embed.setImage(custom.imageUrl);
      if (custom.link) embed.setURL(custom.link);

      embed.setFooter({ text: `Opii Bot • ${interaction.guild.name}` }).setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  },
};