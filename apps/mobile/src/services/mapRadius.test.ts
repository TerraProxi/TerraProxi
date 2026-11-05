import { mapSearchRadiusKm, MAX_RADIUS_KM } from './mapRadius'

describe('rayon de recherche de la carte', () => {
  it('couvre la zone visible (1° ≈ 111 km) et se plafonne à 500 km quand on dézoome', () => {
    expect(mapSearchRadiusKm(0.5, 0.3)).toBeCloseTo(55.5)
    expect(mapSearchRadiusKm(12, 20)).toBe(MAX_RADIUS_KM)
    expect(MAX_RADIUS_KM).toBe(500)
  })
})
