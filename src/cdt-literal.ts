import {
  computeCanonicalValue,
  validateUnit,
  findBaseUnit,
} from './ucum-service'
import {
  isCdtQuantityDatatype,
  getCdtKind,
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
  unitString:  string
  baseUnit:    string
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
    // bare number — treat as dimensionless unit "1"
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
 * Canonical store key. Rounded to 12 sig figs to absorb floating-point
 * path differences between proportional and offset units.
 */
export function canonicalKey(parsed: ParsedCdtLiteral): string {
  const rounded = parseFloat(parsed.canonicalValue.toPrecision(12))
  return `${parsed.datatypeIri}|${rounded}|${parsed.baseUnit}`
}

// e.g. "1 km" → "1000 m"
export function canonicalLexicalForm(parsed: ParsedCdtLiteral): string {
  const rounded = parseFloat(parsed.canonicalValue.toPrecision(12))
  return `${rounded} ${parsed.baseUnit}`
}