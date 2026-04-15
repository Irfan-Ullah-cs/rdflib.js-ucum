/**
 * test_05_arithmetic.ts
 *
 * Tests for CDT arithmetic: add, subtract, multiply, divide, convert.
 */

import { expect } from 'chai'
import * as $rdf from 'rdflib'
import {
  cdtAdd,
  cdtSubtract,
  cdtMultiply,
  cdtDivide,
  cdtConvert,
  cdtEquals,
  cdtCompare,
  parseCdtLiteral,
  parseCdtUnit,
  areCommensurable,
  CDT_IRIS,
} from '../src/index'

// ---
// Helpers
// ---

const UCUM        = $rdf.namedNode(CDT_IRIS.ucum)
const XSD_INTEGER = $rdf.namedNode('http://www.w3.org/2001/XMLSchema#integer')
const XSD_DOUBLE  = $rdf.namedNode('http://www.w3.org/2001/XMLSchema#double')
const XSD_DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal'

/** Create a cdt:ucum quantity literal */
function lit(lexical: string): any {
  return $rdf.literal(lexical, UCUM)
}

/** Create an xsd:integer scalar literal */
function intLit(n: number): any {
  return $rdf.literal(String(n), XSD_INTEGER)
}

/** Create an xsd:double scalar literal */
function dblLit(n: number): any {
  return $rdf.literal(String(n), XSD_DOUBLE)
}

/**
 * Assert result is not null and parse it. Throws if either fails.
 * Returns { numericValue, unitString } from parseCdtLiteral.
 */
function parseResult(result: any): { numericValue: number; unitString: string } {
  expect(result, 'arithmetic result must not be null').to.not.be.null
  const parsed = parseCdtLiteral(result.value, result.datatype.value)
  expect(parsed, `parseCdtLiteral failed on "${result.value}"^^<${result.datatype.value}>`).to.not.be.null
  return parsed!
}

/**
 * Numeric comparison with relative + absolute tolerance.
 * Mirrors the tolerance used in cdtEquals.
 */
function expectNear(actual: number, expected: number, relTol = 1e-9): void {
  const tol = Math.abs(expected) * relTol + 1e-15
  expect(
    Math.abs(actual - expected),
    `expected ${actual} ≈ ${expected} (tolerance ${tol})`
  ).to.be.lessThan(tol)
}


// ---
// Addition
// ---

describe('TestAddition', () => {

  it('same unit: 5 km + 3 km = 8 km', () => {
    const r = parseResult(cdtAdd($rdf, lit('5 km'), lit('3 km')))
    expect(r.numericValue).to.equal(8)
    expect(r.unitString).to.equal('km')
  })

  it('cross-unit converts to left: 5 km + 200 m = 5.2 km', () => {
    const r = parseResult(cdtAdd($rdf, lit('5 km'), lit('200 m')))
    expectNear(r.numericValue, 5.2)
    expect(r.unitString).to.equal('km')
  })

  it('mass: 1 kg + 500 g = 1.5 kg', () => {
    const r = parseResult(cdtAdd($rdf, lit('1 kg'), lit('500 g')))
    expectNear(r.numericValue, 1.5)
    expect(r.unitString).to.equal('kg')
  })

  it('time: 1 h + 30 min = 1.5 h', () => {
    const r = parseResult(cdtAdd($rdf, lit('1 h'), lit('30 min')))
    expectNear(r.numericValue, 1.5)
    expect(r.unitString).to.equal('h')
  })

  it('energy: 1 kJ + 500 J = 1.5 kJ', () => {
    const r = parseResult(cdtAdd($rdf, lit('1 kJ'), lit('500 J')))
    expectNear(r.numericValue, 1.5)
    expect(r.unitString).to.equal('kJ')
  })

  it('complex compound: 10 N + 5 kg.m/s2 = 15 N', () => {
    // N and kg.m/s2 are the same physical dimension
    const r = parseResult(cdtAdd($rdf, lit('10 N'), lit('5 kg.m/s2')))
    expectNear(r.numericValue, 15.0)
    expect(r.unitString).to.equal('N')
  })

  it('incompatible dimensions returns null: 1 m + 1 kg', () => {
    // JS returns null
    expect(cdtAdd($rdf, lit('1 m'), lit('1 kg'))).to.be.null
  })

})


// ---
// Subtraction
// ---

describe('TestSubtraction', () => {

  it('same unit: 5 km - 3 km = 2 km', () => {
    const r = parseResult(cdtSubtract($rdf, lit('5 km'), lit('3 km')))
    expect(r.numericValue).to.equal(2)
    expect(r.unitString).to.equal('km')
  })

  it('cross-unit: 5 km - 200 m = 4.8 km', () => {
    const r = parseResult(cdtSubtract($rdf, lit('5 km'), lit('200 m')))
    expectNear(r.numericValue, 4.8)
    expect(r.unitString).to.equal('km')
  })

  it('subtract to zero: 1 km - 1000 m = 0', () => {
    const r = parseResult(cdtSubtract($rdf, lit('1 km'), lit('1000 m')))
    expectNear(r.numericValue, 0)
  })

  it('negative result: 200 m - 1 km = -800 m', () => {
    const r = parseResult(cdtSubtract($rdf, lit('200 m'), lit('1 km')))
    expectNear(r.numericValue, -800)
    expect(r.unitString).to.equal('m')
  })

  it('incompatible dimensions returns null: 1 m - 1 s', () => {
    //  JS returns null
    expect(cdtSubtract($rdf, lit('1 m'), lit('1 s'))).to.be.null
  })

})


// ---
// Scalar operations
// ---

describe('TestScalarOperations', () => {

  it('quantity * integer: 5 km * 3 = 15 km', () => {
    const r = parseResult(cdtMultiply($rdf, lit('5 km'), intLit(3)))
    expect(r.numericValue).to.equal(15)
    expect(r.unitString).to.equal('km')
  })

  it('quantity * float: 2 km * 0.5 = 1.0 km', () => {
    const r = parseResult(cdtMultiply($rdf, lit('2 km'), dblLit(0.5)))
    expectNear(r.numericValue, 1.0)
  })

  it('scalar * quantity (reversed): 3 * 5 km = 15 km', () => {
    // Python: 3 * UCUMQuantity("5 km") via __rmul__
    const r = parseResult(cdtMultiply($rdf, intLit(3), lit('5 km')))
    expect(r.numericValue).to.equal(15)
  })

  it('quantity / integer: 10 km / 2 = 5 km', () => {
    const r = parseResult(cdtDivide($rdf, lit('10 km'), intLit(2)))
    expect(r.numericValue).to.equal(5)
    expect(r.unitString).to.equal('km')
  })

  it('quantity / float: 1 km / 0.5 = 2.0 km', () => {
    const r = parseResult(cdtDivide($rdf, lit('1 km'), dblLit(0.5)))
    expectNear(r.numericValue, 2.0)
  })

})


// ---
// Dimension-changing arithmetic
// ---

describe('TestDimensionChangingArithmetic', () => {

  it('area from m * m: 3 m * 4 m = 12, commensurable with m2', () => {
    const result = cdtMultiply($rdf, lit('3 m'), lit('4 m'))
    expect(result).to.not.be.null
    const r = parseResult(result)
    expectNear(r.numericValue, 12)
    expect(areCommensurable(r.unitString, 'm2')).to.be.true
  })

  it('velocity from m / s: 100 m / 10 s = 10, commensurable with m/s', () => {
    const result = cdtDivide($rdf, lit('100 m'), lit('10 s'))
    expect(result).to.not.be.null
    const r = parseResult(result)
    expectNear(r.numericValue, 10)
    // JS result unit is "(m)/(s)";
    expect(areCommensurable(r.unitString, 'm/s')).to.be.true
  })

  it('force from kg * m/s2: 2 kg * 3 m/s2 = 6, equals 6 N', () => {
    const result = cdtMultiply($rdf, lit('2 kg'), lit('3 m/s2'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 6)
    expect(cdtEquals(result, lit('6 N'))).to.be.true
  })

  it('energy from N * m: 10 N * 5 m = 50, equals 50 J', () => {
    const result = cdtMultiply($rdf, lit('10 N'), lit('5 m'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 50)
    expect(cdtEquals(result, lit('50 J'))).to.be.true
  })

  it('power from J / s: 100 J / 10 s = 10, equals 10 W', () => {
    const result = cdtDivide($rdf, lit('100 J'), lit('10 s'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 10)
    expect(cdtEquals(result, lit('10 W'))).to.be.true
  })

  it('pressure from N / m2: 10 N / 2 m2 = 5, equals 5 Pa', () => {
    const result = cdtDivide($rdf, lit('10 N'), lit('2 m2'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 5)
    expect(cdtEquals(result, lit('5 Pa'))).to.be.true
  })

  it('frequency from 1/s: 1 1 / 0.01 s = 100, equals 100 Hz', () => {
    const result = cdtDivide($rdf, lit('1 1'), lit('0.01 s'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 100)
    expect(cdtEquals(result, lit('100 Hz'))).to.be.true
  })

  it('dimensionless from same-unit division: 5 m / 5 m = 1 (xsd:decimal)', () => {
    const result = cdtDivide($rdf, lit('5 m'), lit('5 m'))
    expect(result).to.not.be.null
    // Same unit → cdtDivide returns xsd:decimal, not cdt:ucum
    expect(result.datatype.value).to.equal(XSD_DECIMAL)
    expectNear(parseFloat(result.value), 1.0)
  })

  it('dimensionless from mass division: 2 kg / 1 kg = 2 (xsd:decimal)', () => {
    const result = cdtDivide($rdf, lit('2 kg'), lit('1 kg'))
    expect(result).to.not.be.null
    expect(result.datatype.value).to.equal(XSD_DECIMAL)
    expectNear(parseFloat(result.value), 2.0)
  })

  it('electric power: 10 V * 2 A = 20, equals 20 W', () => {
    const result = cdtMultiply($rdf, lit('10 V'), lit('2 A'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 20)
    expect(cdtEquals(result, lit('20 W'))).to.be.true
  })

  it("Ohm's law: 10 V / 2 A = 5, equals 5 Ohm", () => {
    const result = cdtDivide($rdf, lit('10 V'), lit('2 A'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 5)
    expect(cdtEquals(result, lit('5 Ohm'))).to.be.true
  })

})


// ---
// Unary operators (not implemented in rdflib-cdt)



// ---
// Unit conversion
// ---

describe('TestUnitConversion', () => {

  it('m to km: 1000 m = 1 km', () => {
    const r = parseResult(cdtConvert($rdf, lit('1000 m'), 'km'))
    expectNear(r.numericValue, 1)
  })

  it('g to kg: 500 g = 0.5 kg', () => {
    const r = parseResult(cdtConvert($rdf, lit('500 g'), 'kg'))
    expectNear(r.numericValue, 0.5)
  })

  it('h to s: 1 h = 3600 s', () => {
    const r = parseResult(cdtConvert($rdf, lit('1 h'), 's'))
    expectNear(r.numericValue, 3600)
  })

  it('min to s: 1 min = 60 s', () => {
    const r = parseResult(cdtConvert($rdf, lit('1 min'), 's'))
    expectNear(r.numericValue, 60)
  })

  it('MHz to Hz: 1 MHz = 1e6 Hz', () => {
    const r = parseResult(cdtConvert($rdf, lit('1 MHz'), 'Hz'))
    expectNear(r.numericValue, 1e6)
  })

  it('mV to V: 1000 mV = 1 V', () => {
    const r = parseResult(cdtConvert($rdf, lit('1000 mV'), 'V'))
    expectNear(r.numericValue, 1)
  })

  it('km/h to m/s: 3.6 km/h = 1.0 m/s', () => {
    const r = parseResult(cdtConvert($rdf, lit('3.6 km/h'), 'm/s'))
    expectNear(r.numericValue, 1.0)
  })

  it('eV to J: 1 eV ≈ 1.602176634e-19 J', () => {
    const r = parseResult(cdtConvert($rdf, lit('1 eV'), 'J'))
    expectNear(r.numericValue, 1.602176634e-19, 1e-6)
  })

  it('N to kg.m/s2: 1 N = 1 kg.m/s2', () => {
    const r = parseResult(cdtConvert($rdf, lit('1 N'), 'kg.m/s2'))
    expectNear(r.numericValue, 1.0)
  })

  it('incompatible conversion returns null: 1 m to kg', () => {
    expect(cdtConvert($rdf, lit('1 m'), 'kg')).to.be.null
  })

  it('incompatible conversion returns null: 1 s to m', () => {
    expect(cdtConvert($rdf, lit('1 s'), 'm')).to.be.null
  })

})


// ---
// Negative exponent units
// ---

describe('TestNegativeExponentUnits', () => {

  it('s-1 equals Hz: "1 s-1" == "1 Hz"', () => {
    expect(cdtEquals(lit('1 s-1'), lit('1 Hz'))).to.be.true
  })

  it('m-2 is commensurable with itself', () => {
    expect(areCommensurable('m-2', 'm-2')).to.be.true
  })

  it('100 s-1 > 10 Hz', () => {
    expect(cdtCompare(lit('100 s-1'), lit('10 Hz'))).to.equal(1)
  })

  it('m/s equals m.s-1: "1 m/s" == "1 m.s-1"', () => {
    expect(cdtEquals(lit('1 m/s'), lit('1 m.s-1'))).to.be.true
  })

})


// ---
// Temperature arithmetic
// ---

describe('TestTemperatureArithmetic', () => {

  it('Kelvin addition: 100 K + 200 K = 300 K', () => {
    const r = parseResult(cdtAdd($rdf, lit('100 K'), lit('200 K')))
    expectNear(r.numericValue, 300)
    expect(r.unitString).to.equal('K')
  })

})


// ---
// Dimensionless arithmetic
// ---

describe('TestDimensionlessArithmetic', () => {

  it('"1 1" parses as dimensionless with numericValue 1', () => {
    const p = parseCdtLiteral('1 1', CDT_IRIS.ucum)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(1.0)
    expect(p!.unitString).to.equal('1')
  })

  it('"50 %" parses with numericValue 50', () => {
    const p = parseCdtLiteral('50 %', CDT_IRIS.ucum)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(50)
  })

  it('percent equality: "50 %" == "0.5 1"', () => {
    expect(cdtEquals(lit('50 %'), lit('0.5 1'))).to.be.true
  })

  it('dimensionless from division: 5 m / 5 m → xsd:decimal 1', () => {
    const result = cdtDivide($rdf, lit('5 m'), lit('5 m'))
    expect(result).to.not.be.null
    expect(result.datatype.value).to.equal(XSD_DECIMAL)
    expectNear(parseFloat(result.value), 1.0)
  })

  it('dimensionless multiplication: 0.5 1 * 10 m = 5, commensurable with m', () => {
    const result = cdtMultiply($rdf, lit('0.5 1'), lit('10 m'))
    expect(result).to.not.be.null
    expectNear(parseResult(result).numericValue, 5.0)
    expect(areCommensurable(parseResult(result).unitString, 'm')).to.be.true
  })

})


// ---
// UCUMUnit
// ---

describe('TestUCUMUnit', () => {

  it('parse simple unit "km"', () => {
    const u = parseCdtUnit('km')
    expect(u).to.not.be.null
    expect(u!.unitString).to.equal('km')
  })

  it('equality with cancellation: m.kg/kg has same baseUnit as m', () => {
    expect(areCommensurable('m.kg/kg', 'm')).to.be.true
    const u1 = parseCdtUnit('m.kg/kg')
    const u2 = parseCdtUnit('m')
    expect(u1).to.not.be.null
    expect(u2).to.not.be.null
    expect(u1!.baseUnit).to.equal(u2!.baseUnit)
  })

  it('equivalent notation: m/s2 and m.s-2 share the same baseUnit', () => {
    expect(areCommensurable('m/s2', 'm.s-2')).to.be.true
    const u1 = parseCdtUnit('m/s2')
    const u2 = parseCdtUnit('m.s-2')
    expect(u1!.baseUnit).to.equal(u2!.baseUnit)
  })

  it('inequality: km and m have different unitString values', () => {
    const u1 = parseCdtUnit('km')
    const u2 = parseCdtUnit('m')
    expect(u1!.unitString).to.not.equal(u2!.unitString)
  })

  it('hash consistency: same input produces identical parse result', () => {
    const u1 = parseCdtUnit('km')
    const u2 = parseCdtUnit('km')
    expect(u1!.baseUnit).to.equal(u2!.baseUnit)
    expect(u1!.unitString).to.equal(u2!.unitString)
  })

})