/**
 * test_03_equality_and_hash.ts

 */

import { expect } from 'chai'
import * as $rdf from 'rdflib'
import {
  UCUMOperations,
  parseCdtLiteral,
  canonicalKey,
  CDT_IRIS,
} from '../src/index'

const ops = new UCUMOperations($rdf)


// Helper: build a cdt:ucum Literal the same way application code would
const UCUMDatatype = $rdf.namedNode(CDT_IRIS.ucum)

function lit(lexical: string): any {
  return $rdf.literal(lexical, UCUMDatatype)
}




describe('TestUCUMQuantityEquality', () => {

  it('same unit same value: 1000 m == 1 km', () => {
    expect(ops.equals(lit('1000 m'), lit('1 km'))).to.be.true
  })

  it('cross-unit time: 1 h == 3600 s', () => {
    expect(ops.equals(lit('1 h'), lit('3600 s'))).to.be.true
  })

  it('cross-unit pressure: 1 kPa == 1000 Pa', () => {
    expect(ops.equals(lit('1 kPa'), lit('1000 Pa'))).to.be.true
  })

  it('cross-unit speed: 3.6 km/h == 1 m/s', () => {
    expect(ops.equals(lit('3.6 km/h'), lit('1 m/s'))).to.be.true
  })

  it('different values not equal: 1 km != 500 m', () => {
    expect(ops.equals(lit('1 km'), lit('500 m'))).to.be.false
  })

  it('incompatible dimensions not equal: 1 m != 1 kg', () => {
    // Must return false, not throw
    expect(ops.equals(lit('1 m'), lit('1 kg'))).to.be.false
  })


  it('derived unit: 1 N == 1 kg.m/s2', () => {
    expect(ops.equals(lit('1 N'), lit('1 kg.m/s2'))).to.be.true
  })

  it('derived unit: 1 J == 1 N.m', () => {
    expect(ops.equals(lit('1 J'), lit('1 N.m'))).to.be.true
  })

  it('derived unit: 1 W == 1 J/s', () => {
    expect(ops.equals(lit('1 W'), lit('1 J/s'))).to.be.true
  })

  it('derived unit: 1 Pa == 1 kg/(m.s2)', () => {
    expect(ops.equals(lit('1 Pa'), lit('1 kg/(m.s2)'))).to.be.true
  })

  it('derived unit: 1 Hz == 1 s-1', () => {
    expect(ops.equals(lit('1 Hz'), lit('1 s-1'))).to.be.true
  })

  it('dimensionless ratio: 50 % == 0.5 1', () => {
    expect(ops.equals(lit('50 %'), lit('0.5 1'))).to.be.true
  })

  it('speed of light: 299792458 m/s == 1 [c]', () => {
    expect(ops.equals(lit('299792458 m/s'), lit('1 [c]'))).to.be.true
  })

  it('unit factor order irrelevant: 1 kg.m/s2 == 1 s-2.m.kg', () => {
    expect(ops.equals(lit('1 kg.m/s2'), lit('1 s-2.m.kg'))).to.be.true
  })

})


//  Hash consistency (canonicalKey)

describe('TestHashConsistency', () => {

  // Helper: parse or throw
  function key(lexical: string): string {
    const parsed = parseCdtLiteral(lexical, CDT_IRIS.ucum)
    if (!parsed) throw new Error(`parseCdtLiteral returned null for: "${lexical}"`)
    return canonicalKey(parsed)
  }

  it('equal time: canonicalKey("1 h") === canonicalKey("3600 s")', () => {
    expect(key('1 h')).to.equal(key('3600 s'))
  })

  it('equal derived: canonicalKey("1 N") === canonicalKey("1 kg.m/s2")', () => {
    expect(key('1 N')).to.equal(key('1 kg.m/s2'))
  })

  it('same quantity consistent: canonicalKey called twice gives same result', () => {
    expect(key('1.5 km')).to.equal(key('1.5 km'))
  })

  it('equal values have equal keys: 1 km and 1000 m', () => {
    expect(key('1 km')).to.equal(key('1000 m'))
  })

  it('set deduplication: 1 km and 1000 m yield 1 unique key; 2 km is distinct', () => {
    const keys = new Set([key('1 km'), key('1000 m'), key('2 km')])
    expect(keys.size).to.equal(2)
  })

  it('different values have different keys: 1 km !== 2 km', () => {
    expect(key('1 km')).to.not.equal(key('2 km'))
  })


})