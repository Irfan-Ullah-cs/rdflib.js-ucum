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
const CDT_BARE_NUMBER_REGEX = /^([+\-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?)$/

export function parseCdtLiteral(
  lexicalForm: string,
  datatypeIri: string
): ParsedCdtLiteral | null {
  if (!isCdtQuantityDatatype(datatypeIri)) return null

  let rawValue: string
  let unitString: string

  const match = lexicalForm.match(CDT_QUANTITY_REGEX)
  if (match) {
    rawValue   = match[1]!
    unitString = match[2]!.trim()
  } else {
    // Fallback: bare number -> dimensionless unit "1"
    const bareMatch = lexicalForm.trim().match(CDT_BARE_NUMBER_REGEX)
    if (!bareMatch) return null
    rawValue   = bareMatch[1]!
    unitString = '1'
  }

  const numericValue = parseFloat(rawValue)
  if (isNaN(numericValue)) return null

  try {
    const kind      = getCdtKind(datatypeIri) || undefined
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
 * With only cdt:ucum remaining, any valid UCUM unit is accepted.
 * Always returns true.
 */
export function validateCdtDimension(parsed: ParsedCdtLiteral): boolean {
  return true
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
  const rounded = parseFloat(parsed.canonicalValue.toPrecision(12))
  return `${rounded} ${parsed.baseUnit}`
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