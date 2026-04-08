/**
 * test_01_parsing_and_service.ts
 *
 * Tests for:
 *   - CDT lexical parsing (valid and invalid forms)
 *   - UCUM unit validation and conversion
 *
 **/

import { expect } from 'chai'
import { parseCdtLiteral, parseCdtUnit, cdtLiteral, cdtUnitLiteral } from '../src/cdt-literal'
import { CDT_IRIS } from '../src/cdt-namespace'
import { getUnitMeta } from '../src/ucum-service'

const UCUM = CDT_IRIS.ucum


const mockRdf = {
  literal: (value: string, datatype: any) => ({ termType: 'Literal', value, datatype }),
  namedNode: (iri: string) => ({ termType: 'NamedNode', value: iri }),
}

// --- Valid lexical forms -------

describe('TestValidLexicalForms', () => {

  it('parses an integer value', () => {
    const p = parseCdtLiteral('1 m', UCUM)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('m')
  })

  it('parses a decimal value', () => {
    const p = parseCdtLiteral('1.5 km', UCUM)
    expect(p!.numericValue).to.equal(1.5)
    expect(p!.unitString).to.equal('km')
  })

  it('parses a negative value', () => {
    const p = parseCdtLiteral('-1.5 km', UCUM)
    expect(p!.numericValue).to.equal(-1.5)
    expect(p!.unitString).to.equal('km')
  })

  it('large magnitude: 1e308 m is finite', () => {
    const p = parseCdtLiteral('1e308 m', UCUM)
    expect(p).to.not.be.null
    expect(isFinite(p!.numericValue)).to.be.true
    expect(p!.numericValue).to.equal(1e308)
    expect(p!.unitString).to.equal('m')
  })

  it('small magnitude: 5e-324 m is finite and non-zero (smallest subnormal)', () => {
    const p = parseCdtLiteral('5e-324 m', UCUM)
    expect(p).to.not.be.null
    expect(isFinite(p!.numericValue)).to.be.true
    expect(p!.numericValue).to.equal(5e-324)
    expect(p!.numericValue).to.be.greaterThan(0) // did not underflow to zero
    expect(p!.unitString).to.equal('m')
  })

  // xfail(reason="1e309 exceeds sys.float_info.max, overflows to inf")
  it.skip('xfail: 1e309 overflows to Infinity — parser should reject it', () => {
    const p = parseCdtLiteral('1e309 m', UCUM)
    expect(p).to.not.be.null
    expect(isFinite(p!.numericValue)).to.be.true   // fails — numericValue is Infinity
  })

  it('underflow to zero: 1e-325 m magnitude is 0', () => {
    const p = parseCdtLiteral('1e-325 m', UCUM)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(0)
  })

  it('parses a compound division unit (9.8 m/s2)', () => {
    const p = parseCdtLiteral('9.8 m/s2', UCUM)
    expect(p!.numericValue).to.equal(9.8)
    expect(p!.unitString).to.equal('m/s2')
  })

  it('parses a compound dot-notation unit (1 kg.m/s2)', () => {
    const p = parseCdtLiteral('1 kg.m/s2', UCUM)
    expect(p!.numericValue).to.equal(1)
  })

  it('parses an inverse unit (60 s-1)', () => {
    const p = parseCdtLiteral('60 s-1', UCUM)
    expect(p!.numericValue).to.equal(60)
    expect(p!.unitString).to.equal('s-1')
  })

  // should fail(reason="NM is not a valid UCUM unit")
  it.skip('rejects invalid unit NM', () => {
    const p = parseCdtLiteral('60 NM', UCUM)
    expect(p).to.be.null  
  })

  it('parses random valid combination: 1 s.cd/kg', () => {
    const p = parseCdtLiteral('1 s.cd/kg', UCUM)
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('s.cd/kg')
  })

  it('parses random valid combination: 1 [ly].s/[ft_i]', () => {
    const p = parseCdtLiteral('1 [ly].s/[ft_i]', UCUM)
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('[ly].s/[ft_i]')
    expect(getUnitMeta('[ly].s/[ft_i]')!.unitToExp).to.deep.equal({ s: 1 })
  })

  it('parses physically meaningless but valid UCUM syntax: 1 [dr_ap]/[min_us]2.[c]', () => {
    const p = parseCdtLiteral('1 [dr_ap]/[min_us]2.[c]', UCUM)
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('[dr_ap]/[min_us]2.[c]')
  })

  it('parses compound physical constant unit: 1 [pi].[c]/[h]', () => {
    const p = parseCdtLiteral('1 [pi].[c]/[h]', UCUM)
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('[pi].[c]/[h]')
    expect(isFinite(p!.numericValue)).to.be.true
  })

  it('parses temperature in Kelvin with large exponent: 273.15e33 K', () => {
    const p = parseCdtLiteral('273.15e33 K', UCUM)
    expect(p!.numericValue).to.equal(273.15e33)
    expect(p!.unitString).to.equal('K')
  })

  it('parses dimensionless unit "1"', () => {
    const p = parseCdtLiteral('1 1', UCUM)
    expect(p!.numericValue).to.equal(1)
  })

  //  parseCdtLiteral requires "<number> <unit>" — returns null for bare "1.2" which it should not. it should treat it as a dimensionless quantity.
  it.skip('parses bare number as dimensionless quantity', () => {
    expect(parseCdtLiteral('1.2', UCUM)).to.be.not.null
  })

  it('parses dimensionless ratio: 1.2 m/m', () => {
    const p = parseCdtLiteral('1.2 m/m', UCUM)
    expect(p!.numericValue).to.equal(1.2)
    expect(p!.unitString).to.equal('m/m')
    expect(getUnitMeta('m/m')!.unitToExp).to.deep.equal({})
  })
})

// --- Invalid lexical forms -----

describe('TestInvalidLexicalForms', () => {

  // reason="Spaces is not allowed at the beginning and end")
  it.skip('xfail: leading/trailing whitespace not stripped — returns null', () => {
    const p = parseCdtLiteral('  1.5 km  ', UCUM)
    expect(p).to.not.be.null  
    expect(p!.numericValue).to.equal(1.5)
    expect(p!.unitString).to.equal('km')
  })

  it('returns null for a unit-only string (no numeric part)', () => {
    expect(parseCdtLiteral('km', UCUM)).to.be.null
  })

  it('returns null for an empty string', () => {
    expect(parseCdtLiteral('', UCUM)).to.be.null
  })

  it('returns null when value and unit have no separating space', () => {
    expect(parseCdtLiteral('1km', UCUM)).to.be.null
  })

  it('returns null for a whitespace-only string', () => {
    expect(parseCdtLiteral('   ', UCUM)).to.be.null
  })
})



describe('TestRegistration', () => {

  it('cdtLiteral round-trips through parseCdtLiteral', () => {
    const lit = cdtLiteral(mockRdf, 1, 'm')
    const p = parseCdtLiteral(lit.value, lit.datatype.value)
    expect(p).to.not.be.null
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('m')
  })

  it('cdtUnitLiteral round-trips through parseCdtUnit ', () => {
    const lit = cdtUnitLiteral(mockRdf, 'km')
    const u = parseCdtUnit(lit.value)
    expect(u).to.not.be.null
    expect(u!.unitString).to.not.be.empty
  })

  it('invalid lexical form returns null — ill-typed literal (equivalent to lit.ill_typed)', () => {
    expect(parseCdtLiteral('not_a_quantity', UCUM)).to.be.null
  })

  it('parseCdtLiteral is idempotent — multiple calls return equal results', () => {
    const first  = parseCdtLiteral('1 km', UCUM)
    const second = parseCdtLiteral('1 km', UCUM)
    expect(first!.numericValue).to.equal(second!.numericValue)
    expect(first!.unitString).to.equal(second!.unitString)
  })

  it('parses permeability of vacuum unit: 70 H/m', () => {
    const p = parseCdtLiteral('70 H/m', UCUM)
    expect(p!.numericValue).to.equal(70)
    expect(p!.unitString).to.equal('H/m')
  })

  it('parses twice the speed of light: 2 [c]', () => {
    const p = parseCdtLiteral('2 [c]', UCUM)
    expect(p!.numericValue).to.equal(2)
    expect(p!.unitString).to.equal('[c]')
    expect(getUnitMeta('[c]')!.unitToExp).to.deep.equal({ m: 1, s: -1 })
  })

  it('parses astronomical unit: 1 AU', () => {
    const p = parseCdtLiteral('1 AU', UCUM)
    expect(p!.numericValue).to.equal(1)
    expect(p!.unitString).to.equal('AU')
    expect(getUnitMeta('AU')!.unitToExp).to.deep.equal({ m: 1 })
  })
})