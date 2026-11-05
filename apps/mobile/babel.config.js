// Metro applique babel-preset-expo par défaut ; Jest (babel-jest) a besoin de ce fichier
// pour transformer le code React Native (Flow, JSX) de la même façon.
module.exports = function babelConfig(api) {
  api.cache(true)
  return { presets: ['babel-preset-expo'] }
}
