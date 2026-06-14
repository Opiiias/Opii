const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Prikaži sve komande i šta rade"),

  async execute(interaction) {
    const embed1 = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 Opii Bot — Komande")
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: "🛡️ __AutoMod__", value: "_ _" },
        { name: "/automod action", value: "Postavi akciju za filter (delete/warn/timeout/kick/ban)" },
        { name: "/automod addword", value: "Dodaj jednu zabranjenu reč" },
        { name: "/automod addwords", value: "Dodaj više zabranjenih reči odjednom" },
        { name: "/automod listwords", value: "Prikaži listu zabranjenih reči" },
        { name: "/automod removeword", value: "Ukloni zabranjenu reč" },
        { name: "/automod setannounce", value: "Postavi kanal za web-app notifikacije" },
        { name: "/automod setlog", value: "Postavi mod-log kanal" },
        { name: "/automod toggle", value: "Uključi/isključi AutoMod" },
      )
      .setFooter({ text: "Opii Bot • Stranica 1/4" })
      .setTimestamp();

    const embed2 = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 Opii Bot — Komande")
      .addFields(
        { name: "🔨 __Moderacija__", value: "_ _" },
        { name: "/ban", value: "Banuje člana sa servera" },
        { name: "/kick", value: "Kickuje člana sa servera" },
        { name: "/timeout", value: "Stavlja timeout na člana" },
        { name: "🎨 __Custom Komande__", value: "_ _" },
        { name: "/customcmd dodaj", value: "Dodaj novu custom komandu" },
        { name: "/customcmd lista", value: "Lista svih custom komandi" },
        { name: "/customcmd obrisi", value: "Obriši custom komandu" },
        { name: "📢 __Ostalo__", value: "_ _" },
        { name: "/embed", value: "Pošalji obaveštenje kao Embed" },
        { name: "/server", value: "Prikazuje informacije o ovom serveru" },
        { name: "/iliili", value: "Pokreni igru Koja je bolja devojka!" },
      )
      .setFooter({ text: "Opii Bot • Stranica 2/4" })
      .setTimestamp();

    const embed3 = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 Opii Bot — Komande")
      .addFields(
        { name: "📝 __Logovi__", value: "_ _" },
        { name: "/logs podesi", value: "Podesi kanal i boju za log" },
        { name: "/logs status", value: "Prikaži status svih logova" },
        { name: "/logs toggle", value: "Uključi/isključi određeni log" },
        { name: "🔁 __Repeat (Automatske poruke)__", value: "_ _" },
        { name: "/repeat set-channel", value: "Postavi kanal za automatske poruke" },
        { name: "/repeat set-interval", value: "Na koliko poruka Opii šalje poruku" },
        { name: "/repeat set-message", value: "Poruka koju Opii šalje" },
        { name: "/repeat set-color", value: "Boja embeda" },
        { name: "/repeat set-image", value: "Slika u poruci (link)" },
        { name: "/repeat set-url", value: "Link u poruci" },
        { name: "/repeat set-mention", value: "Tag role ili usera" },
        { name: "/repeat toggle", value: "Uključi/isključi automatske poruke" },
      )
      .setFooter({ text: "Opii Bot • Stranica 3/4" })
      .setTimestamp();

    const embed4 = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 Opii Bot — Komande")
      .addFields(
        { name: "👋 __Welcome / Leave__", value: "_ _" },
        { name: "/welcome add-channels", value: "Dodaj welcome kanale (odvoji zarezom: #kanal1,#kanal2)" },
        { name: "/welcome remove-channel", value: "Ukloni welcome kanal" },
        { name: "/welcome list-channels", value: "Prikaži sve welcome kanale" },
        { name: "/welcome set-message", value: "Postavi welcome poruku ({user}, {username}, {server}, {membercount})" },
        { name: "/welcome set-color", value: "Postavi boju welcome embeda" },
        { name: "/welcome set-timer", value: "Koliko sekundi poruka ostaje (0 = ne briše se)" },
        { name: "/welcome toggle", value: "Uključi/isključi welcome poruke" },
        { name: "/welcome leave-channel", value: "Postavi leave kanal" },
        { name: "/welcome leave-message", value: "Postavi leave poruku" },
        { name: "/welcome leave-color", value: "Postavi boju leave embeda" },
        { name: "/welcome leave-toggle", value: "Uključi/isključi leave poruke" },
      )
      .setFooter({ text: "Opii Bot • Stranica 4/4" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed1, embed2, embed3, embed4], ephemeral: true });
  },
};