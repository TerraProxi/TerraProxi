import { describe, expect, it } from 'vitest'
import variablesCss from './variables.css?raw'

/** Seuil WCAG 2.1 AA pour un texte de taille normale. */
const AA_NORMAL_TEXT = 4.5

function readToken(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(variablesCss)
  if (!match) throw new Error(`Jeton --${name} introuvable ou non hexadécimal`)
  return match[1]
}

/** Luminance relative WCAG 2.1 d'une couleur #RRGGBB. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

describe('jetons de couleur (variables.css)', () => {
  const backgrounds = { blanc: readToken('color-white'), 'fond clair': readToken('color-light-bg') }

  it.each(['color-primary-strong', 'color-secondary-strong', 'color-danger-strong', 'color-warning-strong', 'color-text-muted', 'color-dark'])(
    '--%s atteint 4,5:1 sur blanc et sur le fond clair',
    (token) => {
      for (const background of Object.values(backgrounds)) {
        expect(contrastRatio(readToken(token), background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      }
    },
  )

  it('les teintes de la charte restent trop claires pour du texte (usage décoratif uniquement)', () => {
    expect(contrastRatio(readToken('color-primary'), backgrounds.blanc)).toBeCloseTo(1.85, 1)
    expect(contrastRatio(readToken('color-secondary'), backgrounds.blanc)).toBeLessThan(3)
  })
})
