/**
 * test_06_store_query.ts
 *
 * Tests for the CDT-enabled store created by createCdtStore().
 * The store's native query API (holds, any, each, statementsMatching)
 * works by physical value for CDT literals automatically.
 */

import { expect } from 'chai'
import * as $rdf from 'rdflib'
import {
  createCdtStore,
  CDT_IRIS,
} from '../src/index'

const EX  = 'https://example.org/'
const dt  = $rdf.namedNode(CDT_IRIS.ucum)
const ex  = (id: string) => $rdf.namedNode(EX + id)
const lit = (v: string)  => $rdf.literal(v, dt)

const dist = ex('distance')
const temp = ex('temperature')


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