/**
 * CDT Comparison
 *
 * Value-based equality, ordering, and commensurability for CDT literals.
 * Works with rdflib.js Literal objects — does NOT modify them.
 *
 * DESIGN: All comparisons use ucum-lhc's convertUnitTo() API directly.
 * This avoids any dependency on internal magnitude/dimension extraction.
 *
 * Error behaviour :
 *   - cdtCompare throws UCUMParseError for non-CDT inputs
 *   - cdtCompare throws UCUMDimensionError for incommensurable units
 *   - cdtConvert throws UCUMDimensionError when conversion is not possible
 *   - cdtCompareSafe catches all errors and returns null instead
 */

import { parseCdtLiteral, ParsedCdtLiteral } from './cdt-literal'
import {
  isCdtQuantityDatatype,
  CDT_IRIS,
} from './cdt-namespace'
import { convertValue, areCommensurable } from './ucum-service'
import { UCUMParseError, UCUMDimensionError } from './cdt-errors'

//---
// Helpers to extract CDT info from rdflib Literal objects
//---

/**
 * Try to parse an rdflib Literal as a CDT quantity.
 * Returns null if the literal is not a CDT quantity type.
 */
export function tryParseCdt(literal: any): ParsedCdtLiteral | null {
  if (!literal || literal.termType !== 'Literal') return null
  const dtIri = literal.datatype?.value
  if (!dtIri || !isCdtQuantityDatatype(dtIri)) return null
  return parseCdtLiteral(literal.value, dtIri)
}

//---
// Equality
//---

/**
 * Value-based equality for two rdflib Literal nodes with CDT datatypes.
 *
 * Two CDT literals are equal if converting one to the other's unit
 * produces the same numeric value.
 *
 * This correctly handles:
 *   - "1 km" == "1000 m"  (same value, same dimension)
 *   - "90 km/h" == "25 m/s"  (both normalize to 25 m/s)
 *   - "0 Cel" == "273.15 K"  (temperature offset handled)
 *   - "1 km" != "1 kg"  (different dimensions → not convertible)
 *
 * @returns true if equal, false otherwise. Returns false for non-CDT literals.
 */
export function cdtEquals(literal1: any, literal2: any): boolean {
  const a = tryParseCdt(literal1)
  const b = tryParseCdt(literal2)
  if (!a || !b) return false

  // Fast path: same unit, same value
  if (a.unitString === b.unitString) {
    return Math.abs(a.numericValue - b.numericValue) <
      Math.abs(a.numericValue + b.numericValue) * 1e-12 + 1e-15
  }

  // Convert a's value to b's unit
  const aInBUnit = convertValue(a.numericValue, a.unitString, b.unitString)
  if (aInBUnit === null) return false // Not commensurable

  // Compare with tolerance
  return Math.abs(aInBUnit - b.numericValue) <
    Math.abs(aInBUnit + b.numericValue) * 1e-12 + 1e-15
}

/**
 * Strict equality: same as cdtEquals but also requires the same datatype IRI.
 */
export function cdtStrictEquals(literal1: any, literal2: any): boolean {
  if (!literal1 || !literal2) return false
  if (literal1.datatype?.value !== literal2.datatype?.value) return false
  return cdtEquals(literal1, literal2)
}

//---
// Ordering
//---

/**
 * Compare two CDT literals for ordering.
 *
 * Converts the first literal to the second's unit, then compares numerically.
 *
 * @returns -1 if a < b, 0 if a == b, +1 if a > b
 * @throws UCUMParseError if either argument is not a valid CDT quantity literal
 * @throws UCUMDimensionError if the literals have different physical dimensions
 */
export function cdtCompare(literal1: any, literal2: any): -1 | 0 | 1 {
  const a = tryParseCdt(literal1)
  const b = tryParseCdt(literal2)
  if (!a || !b) {
    throw new UCUMParseError(
      'Cannot compare: one or both arguments are not valid CDT quantity literals'
    )
  }

  // Fast path: same unit
  if (a.unitString === b.unitString) {
    const diff = a.numericValue - b.numericValue
    const tolerance = Math.abs(a.numericValue + b.numericValue) * 1e-12 + 1e-15
    if (Math.abs(diff) < tolerance) return 0
    return diff < 0 ? -1 : 1
  }

  // Convert a to b's unit
  const aInBUnit = convertValue(a.numericValue, a.unitString, b.unitString)
  if (aInBUnit === null) {
    throw new UCUMDimensionError(
      `Cannot compare incommensurable quantities: ` +
      `"${a.lexicalForm}" (${a.unitString}) and "${b.lexicalForm}" (${b.unitString}) ` +
      `have different physical dimensions`
    )
  }

  const diff = aInBUnit - b.numericValue
  const tolerance = Math.abs(aInBUnit + b.numericValue) * 1e-12 + 1e-15

  if (Math.abs(diff) < tolerance) return 0
  return diff < 0 ? -1 : 1
}

/**
 * Safe comparison that returns null instead of throwing.
 * Catches UCUMParseError, UCUMDimensionError, and any other errors.
 */
export function cdtCompareSafe(
  literal1: any,
  literal2: any
): -1 | 0 | 1 | null {
  try {
    return cdtCompare(literal1, literal2)
  } catch {
    return null
  }
}

//---
// Commensurability
//---

/**
 * Check if two CDT literals are commensurable (measure the same physical quantity).
 */
export function cdtCommensurable(literal1: any, literal2: any): boolean {
  const a = tryParseCdt(literal1)
  const b = tryParseCdt(literal2)
  if (!a || !b) return false
  return areCommensurable(a.unitString, b.unitString)
}

//---
// Conversion
//---

/**
 * Convert a CDT literal to a different unit.
 * Returns a new rdflib Literal with the converted value and new unit,
 * keeping the same datatype.
 *
 * @param rdflib The rdflib module
 * @param literal The source CDT literal
 * @param targetUnit The target UCUM unit expression
 * @returns A new rdflib Literal
 * @throws UCUMDimensionError if the source and target units are not commensurable
 * @returns null if the input is not a valid CDT literal
 */
export function cdtConvert(
  rdflib: any,
  literal: any,
  targetUnit: string
): any | null {
  const parsed = tryParseCdt(literal)
  if (!parsed) return null

  const converted = convertValue(parsed.numericValue, parsed.unitString, targetUnit)
  if (converted === null) {
    throw new UCUMDimensionError(
      `Cannot convert "${parsed.unitString}" to "${targetUnit}": incompatible physical dimensions`
    )
  }

  const newLexical = `${converted} ${targetUnit}`
  return rdflib.literal(newLexical, literal.datatype)
}

/**
 * Get the numeric value of a CDT literal in a specific unit.
 * Does not create a new Literal — just returns the number.
 */
export function cdtValueIn(literal: any, targetUnit: string): number | null {
  const parsed = tryParseCdt(literal)
  if (!parsed) return null
  return convertValue(parsed.numericValue, parsed.unitString, targetUnit)
}