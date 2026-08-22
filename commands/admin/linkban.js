const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { ServerConfig } = require("../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("linkban")
    .setDescription("Podešavanja za automatsko brisanje Discord/Telegram linkova i forwarded poruka")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName("ukljuci")
      .setDescription("Uključi linkban sistem")
    )
    .addSubcommand(sub => sub
      .setName("iskljuci")
      .setDescription("Isključi linkban sistem")
    )
    .addSubcommand(sub => sub
      .setName("akcija")
      .setDescription("Izaberi akciju za prekršaj")
      .addStringOption(opt =>
        opt.setName("tip")
          .setDescription("Vrsta akcije")
          .setRequired(true)
          .addChoices(
            { name: "Ban", value: "ban" },
            { name: "Kick", value: "kick" },
            { name: "Timeout", value: "timeout" }
          )
      )
      .addIntegerOption(opt =>
        opt.setName("vreme")
          .setDescription("Koliko minuta timeout ili dana ban (nije potrebno za kick)")
          .setRequired(false)
          .setMinValue(1)
      )
    )
    .addSubcommand(sub => sub
      .setName("dodaj-kanale")
      .setDescription("Dodaj kanale u kojima radi linkban")
      .addStringOption(opt =>
        opt.setName("kanali")
          .setDescription("Kanali odvojeni zarezom (#kanal1, #kanal2)")
          .setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName("ukloni-kanale")
      .setDescription("Ukloni kanale iz linkban liste")
      .addStringOption(opt =>
        opt.setName("kanali")
          .setDescription("Kanali odvojeni zarezom (#kanal1, #kanal2)")
          .setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName("info")
      .setDescription("Prikaži trenutna podešavanja")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    await ServerConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true }
    );

    if (sub === "ukljuci") {
      await ServerConfig.updateOne({ guildId }, { $set: { "linkban.enabled": true } });
      return interaction.reply({ content: "✅ Linkban sistem uključen!", ephemeral: true });
    }

    if (sub === "iskljuci") {
      await ServerConfig.updateOne({ guildId }, { $set: { "linkban.enabled": false } });
      return interaction.reply({ content: "🔴 Linkban sistem isključen!", ephemeral: true });
    }

    if (sub === "akcija") {
      const tip = interaction.options.getString("tip");
      const vreme = interaction.options.getInteger("vreme");

      if (tip === "ban" && !vreme) {
        return interaction.reply({ content: "❌ Moraš uneti broj dana za ban!", ephemeral: true });
      }
      if (tip === "timeout" && !vreme) {
        return interaction.reply({ content: "❌ Moraš uneti broj minuta za timeout!", ephemeral: true });
      }

      await ServerConfig.updateOne({ guildId }, {
        $set: {
          "linkban.akcija": tip,
          "linkban.vreme": vreme || null
        }
      });

      let poruka = `✅ Akcija postavljena: **${tip.toUpperCase()}**`;
      if (tip === "ban") poruka += ` na **${vreme} dana**`;
      if (tip === "timeout") poruka += ` na **${vreme} minuta**`;

      return interaction.reply({ content: poruka, ephemeral: true });
    }

    if (sub === "dodaj-kanale") {
      const input = interaction.options.getString("kanali");
      const ids = input.match(/\d{17,20}/g);

      if (!ids || ids.length === 0) {
        return interaction.reply({ content: "❌ Nisi uneo validne kanale!", ephemeral: true });
      }

      await ServerConfig.updateOne(
        { guildId },
        { $addToSet: { "linkban.kanali": { $each: ids } } }
      );

      return interaction.reply({
        content: `✅ Dodato ${ids.length} kanala: ${ids.map(id => `<#${id}>`).join(", ")}`,
        ephemeral: true
      });
    }

    if (sub === "ukloni-kanale") {
      const input = interaction.options.getString("kanali");
      const ids = input.match(/\d{17,20}/g);

      if (!ids || ids.length === 0) {
        return interaction.reply({ content: "❌ Nisi uneo validne kanale!", ephemeral: true });
      }

      await ServerConfig.updateOne(
        { guildId },
        { $pull: { "linkban.kanali": { $in: ids } } }
      );

      return interaction.reply({
        content: `✅ Uklonjeno ${ids.length} kanala: ${ids.map(id => `<#${id}>`).join(", ")}`,
        ephemeral: true
      });
    }

    if (sub === "info") {
      const config = await ServerConfig.findOne({ guildId });
      const lb = config?.linkban;

      return interaction.reply({
        content:
          `**Linkban podešavanja:**\n` +
          `Status: ${lb?.enabled ? "🟢 Uključen" : "🔴 Isključen"}\n` +
          `Akcija: ${lb?.akcija?.toUpperCase() || "Nije postavljena"}\n` +
          `Vreme: ${lb?.vreme ? `${lb.vreme} ${lb.akcija === "ban" ? "dana" : "minuta"}` : "N/A"}\n` +
          `Kanali: ${lb?.kanali?.length ? lb.kanali.map(id => `<#${id}>`).join(", ") : "Nema kanala"}`,
        ephemeral: true
      });
    }
  }
};