/**
 * CDT Literal
 *
 * Parses CDT lexical forms, represents parsed quantity values,
 * and provides factory functions to create rdflib.js Literal nodes
 * with CDT datatypes.
 */

import {
  computeCanonicalValue,
  areCommensurable,
  convertValue,
  validateUnit,
  findBaseUnit,
  CanonicalValue,
} from './ucum-service'
import {
  CDT_IRIS,
  CDT_NAMESPACE,
  isCdtDatatype,
  isCdtQuantityDatatype,
  getCdtKind,
  CdtDatatypeKey,
  CDT_KIND_ANCHOR,
  UCUM_BLIND_SPOT_KINDS,
} from './cdt-namespace'

export interface ParsedCdtLiteral {
  numericValue:   number
  unitString:     string
  datatypeIri:    string
  canonicalValue: number
  baseUnit:       string
  isSpecial:      boolean
  lexicalForm:    string
}

export interface ParsedCdtUnit {
  unitString: string
  baseUnit:   string
  lexicalForm: string
}

const CDT_QUANTITY_REGEX = /^([+\-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?)\s+(.+)$/

export function parseCdtLiteral(
  lexicalForm: string,
  datatypeIri: string
): ParsedCdtLiteral | null {
  if (!isCdtQuantityDatatype(datatypeIri)) return null

  const match = lexicalForm.match(CDT_QUANTITY_REGEX)
  if (!match) return null

  const numericValue = parseFloat(match[1])
  const unitString   = match[2].trim()
  if (isNaN(numericValue)) return null

  try {
    const kind     = getCdtKind(datatypeIri) || undefined
    const canonical = computeCanonicalValue(numericValue, unitString, kind)
    return {
      numericValue,
      unitString,
      datatypeIri,
      canonicalValue: canonical.value,
      baseUnit:       canonical.baseUnit,
      isSpecial:      canonical.isSpecial,
      lexicalForm,
    }
  } catch {
    return null
  }
}

export function parseCdtUnit(lexicalForm: string): ParsedCdtUnit | null {
  try {
    const validation = validateUnit(lexicalForm.trim())
    if (!validation.valid) return null
    return {
      unitString:  validation.ucumCode || lexicalForm.trim(),
      baseUnit:    findBaseUnit(lexicalForm.trim()),
      lexicalForm,
    }
  } catch {
    return null
  }
}

/**
 * Validate that a CDT literal's unit matches the expected dimension for its datatype.
 *
 * Strategy:
 *   cdt:ucum          → accept any valid unit (no dimension constraint)
 *   UCUM blind spots  → fall back to convertValue() commensurability check
 *   All other kinds   → compare unitToExp maps via areCommensurable()
 *
 * The blind spot fallback uses convertValue() because:
 *   - amountOfSubstance / catalyticActivity: mol is dimensionless in UCUM spec
 *   - radiationDoseAbsorbed / radiationDoseEffective: Gy and Sv share the same
 *     physical dimension — ucum-lhc correctly rejects Gy↔Sv conversion even
 *     though their unitToExp maps are identical
 */
export function validateCdtDimension(parsed: ParsedCdtLiteral): boolean {
  const kind = getCdtKind(parsed.datatypeIri)
  if (!kind) return false
  if (kind === 'ucum') return true

  const anchor = CDT_KIND_ANCHOR[kind as CdtDatatypeKey]
  if (!anchor) return true // unknown kind — accept rather than reject

  if (UCUM_BLIND_SPOT_KINDS.has(kind as CdtDatatypeKey)) {
    // Blind spot: unitToExp comparison is unreliable — use conversion test
    return convertValue(1, parsed.unitString, anchor) !== null
  }

  // Standard case: compare dimension maps via areCommensurable()
  return areCommensurable(parsed.unitString, anchor)
}

/**
 * Compute a canonical string key for a parsed CDT literal.
 *
 * Includes datatypeIri so that physically identical dimensions with different
 * CDT types (Gy vs Sv) produce different keys — correct store deduplication
 * without any hardcoded dimension vectors.
 */
export function canonicalKey(parsed: ParsedCdtLiteral): string {
  // Round to 12 significant figures to absorb floating point path differences
  // between special units (offset via convertToBaseUnits) and proportional
  // units (direct magnitude multiplication). 12 sig figs retains full
  // physical precision — no measurement requires more than ~10 sig figs.
  const rounded = parseFloat(parsed.canonicalValue.toPrecision(12))
  return `${parsed.datatypeIri}|${rounded}|${parsed.baseUnit}`
}

/**
 * Compute a canonical lexical form for a CDT literal.
 * The base unit is derived dynamically from the dimension vector.
 */
export function canonicalLexicalForm(parsed: ParsedCdtLiteral): string {
  return `${parsed.canonicalValue} ${parsed.baseUnit}`
}

// ------
// Factory functions
// ------

export function cdtLiteral(
  rdflib: any,
  value: number,
  unit: string,
  datatypeKey: CdtDatatypeKey = 'ucum'
): any {
  const datatypeIri = CDT_IRIS[datatypeKey]
  if (!datatypeIri) throw new Error(`Unknown CDT datatype key: "${datatypeKey}"`)
  return rdflib.literal(`${value} ${unit}`, rdflib.namedNode(datatypeIri))
}

export function cdtUnitLiteral(rdflib: any, unit: string): any {
  return rdflib.literal(unit, rdflib.namedNode(CDT_IRIS.ucumunit))
}