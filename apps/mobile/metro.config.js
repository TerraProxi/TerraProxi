// Configuration Metro du monorepo pnpm (voir docs/setup.md, « Application mobile »).
// Depuis le SDK 51, getDefaultConfig détecte le workspace : il surveille les paquets du
// monorepo et le node_modules racine, et résout les modules dans apps/mobile/node_modules
// puis node_modules. Ne pas surcharger ces valeurs (expo-doctor les vérifie).
const { getDefaultConfig } = require('expo/metro-config')

module.exports = getDefaultConfig(__dirname)
