const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "data", "welcomeConfig.json");

// Učitaj kompletan config fajl (svi serveri)
function ucitajSveKonfiguracije() {
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, "{}");
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

// Sačuvaj kompletan config fajl
function sacuvajSveKonfiguracije(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

// Default podešavanja za welcome i leave poruke
const DEFAULTI = {
  welcome: {
    enabled: false,
    channelId: null,
    color: "#5865F2",
    message: "👋 Zdravo {user}, dobrodošao/la na **{server}**!",
  },
  leave: {
    enabled: false,
    channelId: null,
    color: "#E74C3C",
    message: "👋 **{username}** je napustio/la server **{server}**.",
  },
};

// Vrati podešavanja za određeni server i tip ("welcome" ili "leave")
function getKonfiguracija(guildId, tip) {
  const sve = ucitajSveKonfiguracije();
  const server = sve[guildId] || {};
  return { ...DEFAULTI[tip], ...(server[tip] || {}) };
}

// Izmeni jedno ili više podešavanja (boja, poruka, kanal, status) za server
function setKonfiguracija(guildId, tip, izmene) {
  const sve = ucitajSveKonfiguracije();

  if (!sve[guildId]) sve[guildId] = {};
  if (!sve[guildId][tip]) sve[guildId][tip] = { ...DEFAULTI[tip] };

  sve[guildId][tip] = { ...sve[guildId][tip], ...izmene };

  sacuvajSveKonfiguracije(sve);
  return sve[guildId][tip];
}

// Zameni placeholdere u poruci sa stvarnim podacima o članu i serveru
function popuniPoruku(poruka, member) {
  return poruka
    .replaceAll("{user}", `${member.user ?? member}`)
    .replaceAll("{username}", member.user ? member.user.username : member.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{membercount}", `${member.guild.memberCount}`);
}

module.exports = {
  getKonfiguracija,
  setKonfiguracija,
  popuniPoruku,
};