/**
 * test_06_store_query.ts
 *
 * Tests for CDT store functions:
 * 
 *   cdtStatementsMatching — value-based matching for plain store
 *   cdtAny                — value-based any() for plain store
 *   cdtSortedValues       — sort CDT literals by physical value
 *   cdtStatementsInRange  — range query by physical value
 */

import { expect } from 'chai'
import * as $rdf from 'rdflib'
import {
  createCdtStore,
  cdtStoreLiteral,
  cdtHolds,
  cdtStatementsMatching,
  cdtAny,
  cdtSortedValues,
  cdtStatementsInRange,
  CDT_IRIS,
} from '../src/index'

const EX  = 'https://example.org/'
const dt  = $rdf.namedNode(CDT_IRIS.ucum)
const ex  = (id: string) => $rdf.namedNode(EX + id)
const lit = (v: string)  => $rdf.literal(v, dt)

const dist   = ex('distance')
const weight = ex('weight')
const temp   = ex('temperature')


// --- createCdtStore -------------------------------------------------------

describe('TestCdtStore', () => {

  it('stores the original lexical form unchanged', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), dist, lit('50 cm'))
    const result = store.statementsMatching(ex('s1'), dist, null)
    expect(result[0].object.value).to.equal('50 cm')
  })

  it('holds() finds equivalent value in a different unit', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), dist, lit('1 m'))
    expect(store.holds(ex('s1'), dist, lit('100 cm'))).to.be.true
  })

  it('holds() returns false for a different value', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), dist, lit('1 m'))
    expect(store.holds(ex('s1'), dist, lit('2 m'))).to.be.false
  })

  it('statementsMatching() wildcard finds all subjects for a predicate', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('1 m'))
    store.add(ex('b'), dist, lit('50 cm'))
    const results = store.statementsMatching(null, dist, null)
    expect(results).to.have.length(2)
  })

  it('statementsMatching() finds both subjects with equivalent values', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('1 m'))
    store.add(ex('b'), dist, lit('100 cm'))
    const results = store.statementsMatching(null, dist, lit('1 m'))
    const subjects = results.map((st: any) => st.subject.value)
    expect(subjects).to.include(EX + 'a')
    expect(subjects).to.include(EX + 'b')
  })

  it('any() returns the object in a wildcard position', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), dist, lit('75 cm'))
    const node = store.any(ex('s1'), dist, null)
    expect(node).to.not.be.null
    expect(node.value).to.equal('75 cm')
  })

  it('any() returns the subject when querying by equivalent value', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), dist, lit('1 m'))
    const node = store.any(null, dist, lit('100 cm'))
    expect(node).to.not.be.null
    expect(node.value).to.equal(EX + 's1')
  })

  it('each() returns all objects for a predicate', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('1 m'))
    store.add(ex('b'), dist, lit('50 cm'))
    store.add(ex('c'), dist, lit('200 cm'))
    const nodes = store.each(null, dist, null)
    expect(nodes).to.have.length(3)
  })

  it('temperature: Celsius and Kelvin match in holds()', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), temp, lit('100 Cel'))
    expect(store.holds(ex('s1'), temp, lit('373.15 K'))).to.be.true
  })

})


// --- cdtStoreLiteral ------------------------------------------------------

describe('TestCdtStoreLiteral', () => {

  it('creates a literal with cdt:ucum datatype', () => {
    const store = createCdtStore($rdf)
    const l = cdtStoreLiteral(store, 5, 'm')
    expect(l.termType).to.equal('Literal')
    expect(l.datatype.value).to.equal(CDT_IRIS.ucum)
  })

  it('created literal can be stored and retrieved', () => {
    const store = createCdtStore($rdf)
    store.add(ex('s1'), dist, cdtStoreLiteral(store, 5, 'm'))
    expect(store.holds(ex('s1'), dist, cdtStoreLiteral(store, 500, 'cm'))).to.be.true
  })

})


// --- Plain store wrappers -------------------------------------------------

describe('TestPlainStoreWrappers', () => {

  it('cdtHolds() finds equivalent value on a plain store', () => {
    const store = $rdf.graph()
    store.add(ex('s1'), dist, lit('1 m'))
    expect(cdtHolds(store, ex('s1'), dist, lit('100 cm'))).to.be.true
  })

  it('cdtHolds() returns false for a different value', () => {
    const store = $rdf.graph()
    store.add(ex('s1'), dist, lit('1 m'))
    expect(cdtHolds(store, ex('s1'), dist, lit('2 m'))).to.be.false
  })

  it('cdtStatementsMatching() finds both subjects with equivalent values', () => {
    const store = $rdf.graph()
    store.add(ex('a'), dist, lit('1 m'))
    store.add(ex('b'), dist, lit('100 cm'))
    const results = cdtStatementsMatching(store, null, dist, lit('1 m'))
    const subjects = results.map((st: any) => st.subject.value)
    expect(subjects).to.include(EX + 'a')
    expect(subjects).to.include(EX + 'b')
  })

  it('cdtAny() returns the first matching subject', () => {
    const store = $rdf.graph()
    store.add(ex('s1'), dist, lit('1 m'))
    const node = cdtAny(store, null, dist, lit('100 cm'))
    expect(node).to.not.be.undefined
    expect(node.value).to.equal(EX + 's1')
  })

  it('cdtAny() returns undefined when no match', () => {
    const store = $rdf.graph()
    store.add(ex('s1'), dist, lit('1 m'))
    const node = cdtAny(store, null, dist, lit('5 m'))
    expect(node).to.be.undefined
  })

})


// --- cdtSortedValues ------------------------------------------------------

describe('TestCdtSortedValues', () => {

  it('sorts by physical value ascending', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('200 cm'))
    store.add(ex('b'), dist, lit('50 cm'))
    store.add(ex('c'), dist, lit('1 m'))
    const sorted = cdtSortedValues(store, null, dist)
    expect(sorted[0].value).to.equal('50 cm')
    expect(sorted[sorted.length - 1].value).to.equal('200 cm')
  })

  it('sorts mixed units by physical value not lexical order', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('999 mm'))  // 0.999 m
    store.add(ex('b'), dist, lit('1 m'))     // 1.000 m
    store.add(ex('c'), dist, lit('101 cm'))  // 1.010 m
    const sorted = cdtSortedValues(store, null, dist)
    expect(sorted[0].value).to.equal('999 mm')
    expect(sorted[1].value).to.equal('1 m')
    expect(sorted[2].value).to.equal('101 cm')
  })

  it('works on a plain store', () => {
    const store = $rdf.graph()
    store.add(ex('a'), dist, lit('200 cm'))
    store.add(ex('b'), dist, lit('50 cm'))
    const sorted = cdtSortedValues(store, null, dist)
    expect(sorted[0].value).to.equal('50 cm')
    expect(sorted[1].value).to.equal('200 cm')
  })

})


// --- cdtStatementsInRange -------------------------------------------------

describe('TestCdtStatementsInRange', () => {

  it('returns statements within inclusive range', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('50 cm'))
    store.add(ex('b'), dist, lit('1 m'))
    store.add(ex('c'), dist, lit('200 cm'))
    const results = cdtStatementsInRange(store, null, dist, lit('60 cm'), lit('150 cm'))
    const subjects = results.map((st: any) => st.subject.value)
    expect(subjects).to.include(EX + 'b')
    expect(subjects).to.not.include(EX + 'a')
    expect(subjects).to.not.include(EX + 'c')
  })

  it('boundary values are inclusive', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('50 cm'))
    store.add(ex('b'), dist, lit('1 m'))
    const results = cdtStatementsInRange(store, null, dist, lit('50 cm'), lit('1 m'))
    expect(results).to.have.length(2)
  })

  it('bounds can use different units than stored values', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('500 mm'))
    store.add(ex('b'), dist, lit('75 cm'))
    store.add(ex('c'), dist, lit('1 m'))
    const results = cdtStatementsInRange(store, null, dist, lit('0.5 m'), lit('80 cm'))
    const subjects = results.map((st: any) => st.subject.value)
    expect(subjects).to.include(EX + 'a')
    expect(subjects).to.include(EX + 'b')
    expect(subjects).to.not.include(EX + 'c')
  })

  it('empty range returns no results', () => {
    const store = createCdtStore($rdf)
    store.add(ex('a'), dist, lit('1 m'))
    const results = cdtStatementsInRange(store, null, dist, lit('5 m'), lit('10 m'))
    expect(results).to.have.length(0)
  })

  it('works on a plain store', () => {
    const store = $rdf.graph()
    store.add(ex('a'), dist, lit('50 cm'))
    store.add(ex('b'), dist, lit('1 m'))
    store.add(ex('c'), dist, lit('200 cm'))
    const results = cdtStatementsInRange(store, null, dist, lit('60 cm'), lit('150 cm'))
    expect(results).to.have.length(1)
    expect(results[0].subject.value).to.equal(EX + 'b')
  })

})
