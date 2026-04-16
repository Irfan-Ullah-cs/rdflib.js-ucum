/**
 * UCUM Service
 *
 * Wraps @lhncbc/ucum-lhc using ONLY its public API.
 *
 * Public API used:
 *   utils.validateUnitString(str, true)        -> ucumCode, status
 *   utils.convertUnitTo(from, val, to, false)  -> toVal, status
 *   utils.convertToBaseUnits(str, val)         -> magnitude, unitToExp, fromUnitIsSpecial, status
 *
 * Zero internal property access (no dimVec_, magnitude_, cnv_, isSpecial_).
 */

let ucumModule: any = null
let ucumUtils: any = null
const unitMetaCache = new Map<string, UnitMeta | null>()

function getUcumUtils(): any {
  if (ucumUtils) return ucumUtils
  if (!ucumModule) {
    try {
      ucumModule = require('@lhncbc/ucum-lhc')
    } catch {
      throw new Error(
        'rdflib-cdt requires @lhncbc/ucum-lhc. Install it: npm install @lhncbc/ucum-lhc'
      )
    }
  }
  ucumUtils = ucumModule.UcumLhcUtils.getInstance()
  return ucumUtils
}

// ----------------
// Types
// ----------------

export interface UnitMeta {
  /**
   * Named dimension map from convertToBaseUnits.
   * e.g. { m: 1, s: -1 } for speed, { K: 1 } for temperature.
   * For proportional units: stable scale map.
   * NOTE: mol is dimensionless in the UCUM spec — amountOfSubstance
   * and catalyticActivity will appear as {} or {s:-1} respectively.
   */
  unitToExp: Record<string, number>
  /**
   * Result of convertToBaseUnits(unitStr, 1).
   * For proportional units this is the SI scale factor.
   * For special units (Celsius etc.) this is the SI value of 1 unit
   * including the offset — do NOT use directly for scaling.
   */
  magnitude: number
  /** True for non-proportional units with an offset, e.g. Celsius, Fahrenheit */
  isSpecial: boolean
  /** Canonical UCUM code as returned by validateUnitString */
  ucumCode: string
}

export interface UnitValidationResult {
  valid: boolean
  ucumCode: string | null
  message: string[]
  unit: any | null
}

export interface CanonicalValue {
  value: number
  baseUnit: string
  isSpecial: boolean
}

// ----------------
// Startup check
// ----------------

/**
 * Assert that the convertToBaseUnits public API works as expected.
 * Call once at startup to catch version incompatibilities immediately.
 */
export function assertUcumInternalsAvailable(): void {
  const utils = getUcumUtils()
  try {
    const r = utils.convertToBaseUnits('km', 1)
    if (
      r?.status !== 'succeeded' ||
      typeof r.magnitude !== 'number' ||
      typeof r.unitToExp !== 'object' ||
      r.unitToExp === null
    ) {
      throw new Error('unexpected response shape')
    }
  } catch (e: any) {
    throw new Error(
      'rdflib-cdt: @lhncbc/ucum-lhc convertToBaseUnits API is unavailable or ' +
      `returned an unexpected shape. Details: ${e.message}`
    )
  }
}

// ----------------
// Core public-API access
// ----------------

/**
 * Get unit metadata via convertToBaseUnits.
 * Returns null if the unit is invalid.
 */
export function getUnitMeta(unitStr: string): UnitMeta | null {
  if (unitMetaCache.has(unitStr)) return unitMetaCache.get(unitStr)!

  const utils = getUcumUtils()
  try {
    // Single call to convertToBaseUnits for magnitude, unitToExp, isSpecial
    const r = utils.convertToBaseUnits(unitStr, 1)
    if (r?.status !== 'succeeded' || typeof r.unitToExp !== 'object') {
      unitMetaCache.set(unitStr, null)
      return null
    }

    // Single call to validateUnitString for ucumCode
    const v = utils.validateUnitString(unitStr, true)

    // Sort unitToExp keys for stable ordering
    const rawExp = r.unitToExp as Record<string, number>
    const unitToExp: Record<string, number> = {}
    for (const k of Object.keys(rawExp).sort()) {
      unitToExp[k] = rawExp[k]!
    }

    const meta: UnitMeta = {
      unitToExp,
      magnitude: r.magnitude as number,
      isSpecial: r.fromUnitIsSpecial === true,
      ucumCode:  v?.ucumCode || unitStr,
    }

    unitMetaCache.set(unitStr, meta)
    return meta
  } catch {
    unitMetaCache.set(unitStr, null)
    return null
  }
}
/**
 * Build a SI base unit string from a named dimension map.
 * { m:1, s:-1 } -> "m.s-1"
 * { K:1 }       -> "K"
 * {}             -> "1"  (dimensionless)
 */
export function unitExpToSiBaseUnit(unitToExp: Record<string, number>): string {
  const parts: string[] = []
  for (const [unit, exp] of Object.entries(unitToExp)) {
    if (exp === 0) continue
    parts.push(exp === 1 ? unit : `${unit}${exp}`)
  }
  return parts.length === 0 ? '1' : parts.join('.')
}

// ----------------
// Public API
// ----------------

/**
 * Validate a UCUM unit expression string.
 */
export function validateUnit(unitStr: string): UnitValidationResult {
  const utils = getUcumUtils()
  const result = utils.validateUnitString(unitStr, true)
  return {
    valid:    result.status === 'valid',
    ucumCode: result.ucumCode || null,
    message:  result.msg || [],
    unit:     result.unit || null,
  }
}

/**
 * Convert a numeric value from one UCUM unit to another.
 * Returns null if the units are not commensurable.
 */
export function convertValue(value: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return value
  const utils = getUcumUtils()
  try {
    const result = utils.convertUnitTo(fromUnit, value, toUnit, false) // false = do not suggest alternative units
    if (result.status === 'succeeded') return result.toVal
    return null
  } catch {
    return null
  }
}

/**
 * Check if two UCUM unit expressions are commensurable.
 *
 * Compares unitToExp maps from convertToBaseUnits.
 * This is reliable for all standard physical quantities.
 *
 * Known UCUM limitation: mol is treated as dimensionless in the UCUM spec,
 * so amountOfSubstance and catalyticActivity cannot be distinguished via
 * unitToExp. Those cases are handled separately in validateCdtDimension.
 */
export function areCommensurable(unit1: string, unit2: string): boolean {
  if (unit1 === unit2) return true
  const m1 = getUnitMeta(unit1)
  const m2 = getUnitMeta(unit2)
  if (!m1 || !m2) return false

  const allKeys = new Set([...Object.keys(m1.unitToExp), ...Object.keys(m2.unitToExp)])
  for (const k of allKeys) {
    if ((m1.unitToExp[k] ?? 0) !== (m2.unitToExp[k] ?? 0)) return false
  }
  return true
}

/**
 * Check if two units share the same physical dimension.
 */
export function dimensionsEqual(unit1: string, unit2: string): boolean {
  return areCommensurable(unit1, unit2)
}

/**
 * Find the SI base unit string for a given unit expression.
 * findBaseUnit('km')   -> 'm'
 * findBaseUnit('km/h') -> 'm.s-1'
 * findBaseUnit('Cel')  -> 'K'
 * findBaseUnit('N')    -> 'm.s-2.g'
 */
export function findBaseUnit(unitStr: string): string {
  const meta = getUnitMeta(unitStr)
  return meta ? unitExpToSiBaseUnit(meta.unitToExp) : unitStr
}

/**
 * Compute the canonical value for a CDT quantity literal.
 *
 * Proportional units:  canonical = numericValue × magnitude
 *   Fast path — pure scalar multiplication, no extra conversion call.
 *
 * Special units (Celsius, Fahrenheit, …):
 *   Calls convertToBaseUnits(unitStr, numericValue) to apply the offset correctly.
 *
 * The `kind` parameter is accepted for API compatibility but is no longer used.
 */
export function computeCanonicalValue(
  numericValue: number,
  unitStr: string,
  _kind?: string
): CanonicalValue {
  const utils = getUcumUtils()
  const meta = getUnitMeta(unitStr)

  if (!meta) {
    return { value: numericValue, baseUnit: unitStr, isSpecial: false }
  }

  const baseUnit = unitExpToSiBaseUnit(meta.unitToExp)

  if (!meta.isSpecial) {
    // Fast path — proportional unit: scale by magnitude
    return { value: numericValue * meta.magnitude, baseUnit, isSpecial: false }
  }

  // Special unit — call convertToBaseUnits with the actual value to get correct offset
  try {
    const r = utils.convertToBaseUnits(unitStr, numericValue)
    if (r?.status === 'succeeded') {
      return { value: r.magnitude as number, baseUnit, isSpecial: true }
    }
  } catch {}

  // Fallback — should not happen for valid CDT units
  return { value: numericValue, baseUnit, isSpecial: true }
}