/**
 * test_04_comparison.ts
 */

import { expect } from 'chai'
import * as $rdf from 'rdflib'
import {
  cdtCompare,
  cdtCompareSafe,
  parseCdtLiteral,
  CDT_IRIS,
} from '../src/index'

const UCUMDatatype = $rdf.namedNode(CDT_IRIS.ucum)

function lit(lexical: string): any {
  return $rdf.literal(lexical, UCUMDatatype)
}


// Group 1 — Ordering

describe('TestOrdering', () => {

  it('same unit: 500 m < 1000 m', () => {
    expect(cdtCompare(lit('500 m'), lit('1000 m'))).to.equal(-1)
  })

  it('cross-unit mass: 500 g < 1 kg', () => {
    expect(cdtCompare(lit('500 g'), lit('1 kg'))).to.equal(-1)
  })

  it('cross-unit time: 59 min < 1 h', () => {
    expect(cdtCompare(lit('59 min'), lit('1 h'))).to.equal(-1)
  })

  it('cross-unit energy: 1 eV < 1 J', () => {
    expect(cdtCompare(lit('1 eV'), lit('1 J'))).to.equal(-1)
  })

  it('mass: 1 kg > 999 g', () => {
    expect(cdtCompare(lit('1 kg'), lit('999 g'))).to.equal(1)
  })

  it('speed: 10 m/s > 30 km/h', () => {
    expect(cdtCompare(lit('10 m/s'), lit('30 km/h'))).to.equal(1)
  })

  it('acceleration: 9.81 m/s2 > 9.0 m/s2', () => {
    expect(cdtCompare(lit('9.81 m/s2'), lit('9.0 m/s2'))).to.equal(1)
  })

  it('equal cross-unit: 1 km == 1000 m returns 0', () => {
    expect(cdtCompare(lit('1 km'), lit('1000 m'))).to.equal(0)
  })

  it('equal cross-unit: 1000 m == 1 km returns 0', () => {
    expect(cdtCompare(lit('1000 m'), lit('1 km'))).to.equal(0)
  })

  it('incompatible dimensions throws', () => {
    expect(() => cdtCompare(lit('1 m'), lit('1 kg'))).to.throw()
  })

  it('incompatible dimensions throws: m vs s', () => {
    expect(() => cdtCompare(lit('1 m'), lit('1 s'))).to.throw()
  })

  it('cdtCompareSafe returns null for incompatible dimensions', () => {
    expect(cdtCompareSafe(lit('1 m'), lit('1 kg'))).to.be.null
  })

})


// Group 2 — Compound and derived units

describe('TestCompoundAndDerivedComparison', () => {

  it('derived unit: 2 N > 1 kg.m/s2', () => {
    expect(cdtCompare(lit('2 N'), lit('1 kg.m/s2'))).to.equal(1)
  })

  it('compound force: 10 kg.m/s2 > 5 N', () => {
    expect(cdtCompare(lit('10 kg.m/s2'), lit('5 N'))).to.equal(1)
  })

  it('compound pressure: 101325 Pa > 1 bar', () => {
    expect(cdtCompare(lit('101325 Pa'), lit('1 bar'))).to.equal(1)
  })

  it('inverse unit frequency: 100 s-1 > 10 Hz', () => {
    expect(cdtCompare(lit('100 s-1'), lit('10 Hz'))).to.equal(1)
  })

  it('energy: 1 kJ > 1 J', () => {
    expect(cdtCompare(lit('1 kJ'), lit('1 J'))).to.equal(1)
  })

    it('compound with astronomical units: 1 [ly].kg/(AU.s2) > 1 m.kg/(AU.s2)', () => {
    expect(cdtCompare(lit('1 [ly].kg/(AU.s2)'), lit('1 m.kg/(AU.s2)'))).to.equal(1)
    })

  it('compound unit: 500 g.m/s2 < 1 kg.m/s2', () => {
    expect(cdtCompare(lit('500 g.m/s2'), lit('1 kg.m/s2'))).to.equal(-1)
  })

})


// Group 3 — Temperature (offset units)

describe('TestTemperatureComparison', () => {

  it('273.15 K parses correctly', () => {
    const p = parseCdtLiteral('273.15 K', CDT_IRIS.ucum)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(273.15)
  })

  it('0 Cel parses correctly', () => {
    const p = parseCdtLiteral('0 Cel', CDT_IRIS.ucum)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(0)
  })

  it('300 K > 273.15 K', () => {
    expect(cdtCompare(lit('300 K'), lit('273.15 K'))).to.equal(1)
  })

  it('300 K > 0 Cel', () => {
    expect(cdtCompare(lit('300 K'), lit('0 Cel'))).to.equal(1)
  })

  it('200 K < 0 Cel', () => {
    expect(cdtCompare(lit('200 K'), lit('0 Cel'))).to.equal(-1)
  })

  it('100 K > 90 K', () => {
    expect(cdtCompare(lit('100 K'), lit('90 K'))).to.equal(1)
  })

})


// Group 4 — Float overflow boundary

describe('TestLargeValueComparison', () => {

  it('1E1000 m overflows to Infinity', () => {
    const p = parseCdtLiteral('1E1000 m', CDT_IRIS.ucum)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(Infinity)
    expect(isFinite(p!.numericValue)).to.be.false
  })

  it('1E808 m > 1E307 m — Infinity vs finite float', () => {
    expect(cdtCompare(lit('1E808 m'), lit('1E307 m'))).to.equal(1)
  })

    it('1E700 km vs 1E703 m — both overflow to Infinity, NaN diff returns 1', () => {
    expect(cdtCompare(lit('1E700 km'), lit('1E703 m'))).to.equal(1)
    })

  it('big < bigger', () => {
    const big  = '1' + '0'.repeat(300) + ' m'
    const bigger = '1' + '0'.repeat(300) + '1 m'
    expect(cdtCompare(lit(big), lit(bigger))).to.equal(-1)
  })

})


// Group 5 — Float underflow and precision boundary

describe('TestSmallValueComparison', () => {

  it('1E-1023 m underflows to 0', () => {
    const p = parseCdtLiteral('1E-1023 m', CDT_IRIS.ucum)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(0)
  })

  it('16 significant digits collapse to same float — returns 0', () => {
    expect(cdtCompare(lit('1.000000000000000003 m'), lit('1.000000000000000002 m'))).to.equal(0)
  })

})


// Group 6 — Dimensionless

describe('TestDimensionlessComparison', () => {

  it('0.5 1 < 1 1', () => {
    expect(cdtCompare(lit('0.5 1'), lit('1 1'))).to.equal(-1)
  })

})