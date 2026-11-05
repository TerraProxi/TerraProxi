// Configuration Metro pour un monorepo pnpm (guide Expo « Work with monorepos », SDK 51).
// Voir docs/setup.md, section « Application mobile ».
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Surveiller tout le monorepo (paquets partagés, node_modules racine)
config.watchFolders = [workspaceRoot]
// 2. Résoudre d'abord les modules de l'application, puis ceux de la racine
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// 3. Ne pas remonter l'arborescence : évite de charger deux copies de react / react-native
config.resolver.disableHierarchicalLookup = true

module.exports = config
