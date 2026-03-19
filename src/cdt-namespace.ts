/**
 * CDT Namespace — Custom Datatypes for Quantity Values
 *
 * Based on: https://ci.mines-stetienne.fr/lindt/v4/custom_datatypes.html
 * Namespace: https://w3id.org/cdt/
 */

export const CDT_NAMESPACE = 'https://w3id.org/cdt/'

export const CDT_IRIS = {
  ucum:                   CDT_NAMESPACE + 'ucum',
  ucumunit:               CDT_NAMESPACE + 'ucumunit',
  acceleration:           CDT_NAMESPACE + 'acceleration',
  amountOfSubstance:      CDT_NAMESPACE + 'amountOfSubstance',
  angle:                  CDT_NAMESPACE + 'angle',
  area:                   CDT_NAMESPACE + 'area',
  catalyticActivity:      CDT_NAMESPACE + 'catalyticActivity',
  dimensionless:          CDT_NAMESPACE + 'dimensionless',
  electricCapacitance:    CDT_NAMESPACE + 'electricCapacitance',
  electricCharge:         CDT_NAMESPACE + 'electricCharge',
  electricConductance:    CDT_NAMESPACE + 'electricConductance',
  electricCurrent:        CDT_NAMESPACE + 'electricCurrent',
  electricInductance:     CDT_NAMESPACE + 'electricInductance',
  electricPotential:      CDT_NAMESPACE + 'electricPotential',
  electricResistance:     CDT_NAMESPACE + 'electricResistance',
  energy:                 CDT_NAMESPACE + 'energy',
  force:                  CDT_NAMESPACE + 'force',
  frequency:              CDT_NAMESPACE + 'frequency',
  illuminance:            CDT_NAMESPACE + 'illuminance',
  length:                 CDT_NAMESPACE + 'length',
  luminousFlux:           CDT_NAMESPACE + 'luminousFlux',
  luminousIntensity:      CDT_NAMESPACE + 'luminousIntensity',
  magneticFlux:           CDT_NAMESPACE + 'magneticFlux',
  magneticFluxDensity:    CDT_NAMESPACE + 'magneticFluxDensity',
  mass:                   CDT_NAMESPACE + 'mass',
  power:                  CDT_NAMESPACE + 'power',
  pressure:               CDT_NAMESPACE + 'pressure',
  radiationDoseAbsorbed:  CDT_NAMESPACE + 'radiationDoseAbsorbed',
  radiationDoseEffective: CDT_NAMESPACE + 'radiationDoseEffective',
  radioactivity:          CDT_NAMESPACE + 'radioactivity',
  solidAngle:             CDT_NAMESPACE + 'solidAngle',
  speed:                  CDT_NAMESPACE + 'speed',
  temperature:            CDT_NAMESPACE + 'temperature',
  time:                   CDT_NAMESPACE + 'time',
  volume:                 CDT_NAMESPACE + 'volume',
} as const

export type CdtDatatypeKey = keyof typeof CDT_IRIS

// -----------------------------------------------------------------------------
// Dimension validation anchor table
//
// ONE job: provide a reference unit per CDT kind so that validateCdtDimension()
// can ask ucum-lhc "is this unit commensurable with the reference?".
//
// This table drives NO math, NO canonicalization, NO conversion.
// All actual dimension comparison is delegated to ucum-lhc at runtime.
//
// -- UCUM Blind Spots --------------------------------------------------------
// Four CDT kinds cannot be validated via unitToExp dimension maps alone due to
// fundamental limitations in the UCUM specification itself:
//
//   amountOfSubstance / catalyticActivity:
//     The UCUM spec explicitly removes mol from the 7-dimensional base system,
//     treating it as dimensionless. So mol and kat cannot be distinguished from
//     dimensionless/frequency via unitToExp. These kinds fall back to
//     convertValue() commensurability in validateCdtDimension().
//
//   radiationDoseAbsorbed (Gy) / radiationDoseEffective (Sv):
//     Both have identical physical dimension (J/kg = m²/s²). The UCUM org
//     acknowledges this is an unsolved problem in the specification itself.
//     These kinds also fall back to convertValue() which correctly rejects
//     cross-kind conversions (Gy ↔ Sv is not a valid conversion).
//
// For all other 29 kinds, unitToExp comparison via areCommensurable() works
// correctly and requires no special handling.
// -----------------------------------------------------------------------------

export const CDT_KIND_ANCHOR: Partial<Record<CdtDatatypeKey, string>> = {
  // 29 kinds — validated via unitToExp comparison (areCommensurable)
  acceleration:        'm/s2',
  angle:               'rad',
  area:                'm2',
  dimensionless:       '1',
  electricCapacitance: 'F',
  electricCharge:      'C',
  electricConductance: 'S',
  electricCurrent:     'A',
  electricInductance:  'H',
  electricPotential:   'V',
  electricResistance:  'Ohm',
  energy:              'J',
  force:               'N',
  frequency:           'Hz',
  illuminance:         'lx',
  length:              'm',
  luminousFlux:        'lm',
  luminousIntensity:   'cd',
  magneticFlux:        'Wb',
  magneticFluxDensity: 'T',
  mass:                'g',
  power:               'W',
  pressure:            'Pa',
  radioactivity:       'Bq',
  solidAngle:          'sr',
  speed:               'm/s',
  temperature:         'K',
  time:                's',
  volume:              'm3',

  // 4 UCUM blind spots — validated via convertValue() fallback
  amountOfSubstance:      'mol',
  catalyticActivity:      'kat',
  radiationDoseAbsorbed:  'Gy',
  radiationDoseEffective: 'Sv',
}

/**
 * CDT kinds that cannot be validated via unitToExp dimension maps.
 * These fall back to convertValue() in validateCdtDimension().
 * See the comments on CDT_KIND_ANCHOR for the full explanation.
 */
export const UCUM_BLIND_SPOT_KINDS = new Set<CdtDatatypeKey>([
  'amountOfSubstance',
  'catalyticActivity',
  'radiationDoseAbsorbed',
  'radiationDoseEffective',
])

export function isCdtDatatype(datatypeIri: string): boolean {
  return datatypeIri.startsWith(CDT_NAMESPACE)
}

export function isCdtQuantityDatatype(datatypeIri: string): boolean {
  return isCdtDatatype(datatypeIri) && datatypeIri !== CDT_IRIS.ucumunit
}

export function getCdtKind(datatypeIri: string): string | null {
  if (!isCdtDatatype(datatypeIri)) return null
  return datatypeIri.slice(CDT_NAMESPACE.length)
} 