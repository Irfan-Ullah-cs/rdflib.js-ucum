/**
 * CDT Arithmetic
 *
 * Add, subtract, multiply, and divide CDT quantity literals.
 *   - Add/subtract require commensurable units, result in the first operand's unit
 *   - Multiply/divide work on any units, result unit is the product/quotient of units
 *   - Scalar multiply/divide supported (xsd:integer, xsd:decimal, xsd:float, xsd:double)
 *
 * Error behaviour :
 *   - cdtAdd / cdtSubtract throw UCUMDimensionError for incommensurable units
 *   - cdtDivide throws UCUMArithmeticError for division by zero
 *   - All functions return null when an argument is not a recognised CDT or XSD
 *     literal (wrong type, not a logic error)
 */

import { tryParseCdt } from './cdt-comparison'
import {
  convertValue,
  areCommensurable,
} from './ucum-service'
import { CDT_IRIS } from './cdt-namespace'
import { UCUMDimensionError, UCUMArithmeticError } from './cdt-errors'

//---
// Helpers
//---

const XSD_NUMERIC_TYPES = new Set([
  'http://www.w3.org/2001/XMLSchema#integer',
  'http://www.w3.org/2001/XMLSchema#decimal',
  'http://www.w3.org/2001/XMLSchema#float',
  'http://www.w3.org/2001/XMLSchema#double',
  'http://www.w3.org/2001/XMLSchema#int',
  'http://www.w3.org/2001/XMLSchema#long',
  'http://www.w3.org/2001/XMLSchema#short',
  'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
  'http://www.w3.org/2001/XMLSchema#positiveInteger',
])

function isXsdNumeric(literal: any): boolean {
  if (!literal || literal.termType !== 'Literal') return false
  return XSD_NUMERIC_TYPES.has(literal.datatype?.value)
}

function getXsdNumericValue(literal: any): number | null {
  if (!isXsdNumeric(literal)) return null
  const val = parseFloat(literal.value)
  return isNaN(val) ? null : val
}

/**
 * Build a UCUM unit string from multiplying two unit strings.
 */
function multiplyUnitStrings(unit1: string, unit2: string): string {
  return `(${unit1}).(${unit2})`
}

function divideUnitStrings(unit1: string, unit2: string): string {
  return `(${unit1})/(${unit2})`
}

//---
// Addition
//---

/**
 * Add two CDT quantity literals.
 * The units must be commensurable. Result is expressed in the first operand's unit.
 *
 * @throws UCUMDimensionError if the units are not commensurable
 * @returns null if either argument is not a valid CDT literal
 */
export function cdtAdd(rdflib: any, a: any, b: any): any | null {
  const parsedA = tryParseCdt(a)
  const parsedB = tryParseCdt(b)
  if (!parsedA || !parsedB) return null

  if (!areCommensurable(parsedA.unitString, parsedB.unitString)) {
    throw new UCUMDimensionError(
      `Cannot add incommensurable quantities: ` +
      `"${parsedA.lexicalForm}" (${parsedA.unitString}) and ` +
      `"${parsedB.lexicalForm}" (${parsedB.unitString}) have different physical dimensions`
    )
  }

  // Convert b's value to a's unit
  const bInAUnit = convertValue(parsedB.numericValue, parsedB.unitString, parsedA.unitString)
  if (bInAUnit === null) {
    // Should not happen after a successful commensurability check, but guard anyway
    throw new UCUMArithmeticError(
      `Unexpected conversion failure from "${parsedB.unitString}" to "${parsedA.unitString}"`
    )
  }

  const resultValue = parsedA.numericValue + bInAUnit
  const lexical = `${resultValue} ${parsedA.unitString}`
  return rdflib.literal(lexical, a.datatype)
}

//---
// Subtraction
//---

/**
 * Subtract two CDT quantity literals.
 * The units must be commensurable. Result is expressed in the first operand's unit.
 *
 * @throws UCUMDimensionError if the units are not commensurable
 * @returns null if either argument is not a valid CDT literal
 */
export function cdtSubtract(rdflib: any, a: any, b: any): any | null {
  const parsedA = tryParseCdt(a)
  const parsedB = tryParseCdt(b)
  if (!parsedA || !parsedB) return null

  if (!areCommensurable(parsedA.unitString, parsedB.unitString)) {
    throw new UCUMDimensionError(
      `Cannot subtract incommensurable quantities: ` +
      `"${parsedA.lexicalForm}" (${parsedA.unitString}) and ` +
      `"${parsedB.lexicalForm}" (${parsedB.unitString}) have different physical dimensions`
    )
  }

  const bInAUnit = convertValue(parsedB.numericValue, parsedB.unitString, parsedA.unitString)
  if (bInAUnit === null) {
    throw new UCUMArithmeticError(
      `Unexpected conversion failure from "${parsedB.unitString}" to "${parsedA.unitString}"`
    )
  }

  const resultValue = parsedA.numericValue - bInAUnit
  const lexical = `${resultValue} ${parsedA.unitString}`
  return rdflib.literal(lexical, a.datatype)
}

//---
// Multiplication
//---

/**
 * Multiply two CDT quantity literals, or a CDT literal by a scalar.
 *
 * Quantity × Quantity: result unit is the product of both units.
 * Quantity × Scalar:   result unit is the same as the quantity's unit.
 * Scalar × Quantity:   result unit is the same as the quantity's unit.
 *
 * @returns null if the combination of argument types is not supported
 */
export function cdtMultiply(rdflib: any, a: any, b: any): any | null {
  const parsedA = tryParseCdt(a)
  const parsedB = tryParseCdt(b)
  const scalarA = getXsdNumericValue(a)
  const scalarB = getXsdNumericValue(b)

  // Quantity × Quantity
  if (parsedA && parsedB) {
    const resultValue = parsedA.numericValue * parsedB.numericValue
    const resultUnit = multiplyUnitStrings(parsedA.unitString, parsedB.unitString)
    const lexical = `${resultValue} ${resultUnit}`
    return rdflib.literal(lexical, rdflib.namedNode(CDT_IRIS.ucum))
  }

  // Quantity × Scalar
  if (parsedA && scalarB !== null) {
    const resultValue = parsedA.numericValue * scalarB
    const lexical = `${resultValue} ${parsedA.unitString}`
    return rdflib.literal(lexical, a.datatype)
  }

  // Scalar × Quantity
  if (scalarA !== null && parsedB) {
    const resultValue = scalarA * parsedB.numericValue
    const lexical = `${resultValue} ${parsedB.unitString}`
    return rdflib.literal(lexical, b.datatype)
  }

  return null
}

//---
// Division
//---

/**
 * Divide two CDT quantity literals, or a CDT literal by a scalar,
 * or a scalar by a CDT literal.
 *
 * @throws UCUMArithmeticError if the divisor is zero
 * @returns null if the combination of argument types is not supported
 */
export function cdtDivide(rdflib: any, a: any, b: any): any | null {
  const parsedA = tryParseCdt(a)
  const parsedB = tryParseCdt(b)
  const scalarA = getXsdNumericValue(a)
  const scalarB = getXsdNumericValue(b)

  // Guard against division by zero
  if (parsedB && parsedB.numericValue === 0) {
    throw new UCUMArithmeticError(
      `Division by zero: cannot divide by "${parsedB.lexicalForm}"`
    )
  }
  if (scalarB === 0) {
    throw new UCUMArithmeticError('Division by zero: scalar divisor is 0')
  }

  // Quantity / Quantity
  if (parsedA && parsedB) {
    // If same unit, result is dimensionless scalar
    if (parsedA.unitString === parsedB.unitString) {
      return rdflib.literal(
        String(parsedA.numericValue / parsedB.numericValue),
        rdflib.namedNode('http://www.w3.org/2001/XMLSchema#decimal')
      )
    }
    // If commensurable but different units, convert first then return dimensionless
    if (areCommensurable(parsedA.unitString, parsedB.unitString)) {
      const bConverted = convertValue(parsedB.numericValue, parsedB.unitString, parsedA.unitString)
      if (bConverted !== null && bConverted !== 0) {
        return rdflib.literal(
          String(parsedA.numericValue / bConverted),
          rdflib.namedNode('http://www.w3.org/2001/XMLSchema#decimal')
        )
      }
    }
    // Different dimensions: result is a new compound unit
    const resultValue = parsedA.numericValue / parsedB.numericValue
    const resultUnit = divideUnitStrings(parsedA.unitString, parsedB.unitString)
    const lexical = `${resultValue} ${resultUnit}`
    return rdflib.literal(lexical, rdflib.namedNode(CDT_IRIS.ucum))
  }

  // Quantity / Scalar
  if (parsedA && scalarB !== null) {
    const resultValue = parsedA.numericValue / scalarB
    const lexical = `${resultValue} ${parsedA.unitString}`
    return rdflib.literal(lexical, a.datatype)
  }

  // Scalar / Quantity
  if (scalarA !== null && parsedB) {
    const resultValue = scalarA / parsedB.numericValue
    const resultUnit = `/${parsedB.unitString}`
    const lexical = `${resultValue} ${resultUnit}`
    return rdflib.literal(lexical, rdflib.namedNode(CDT_IRIS.ucum))
  }

  return null
}