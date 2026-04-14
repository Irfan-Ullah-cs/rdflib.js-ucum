/**
 * test_02_namespace.ts
 *
 * Tests for CDT namespace definitions.
 */

import { expect } from 'chai'
import {
  CDT_NAMESPACE,
  CDT_IRIS,
  isCdtDatatype,
  isCdtQuantityDatatype,
} from '../src/cdt-namespace'

// --- TestCDTNamespaceURI -----

describe('TestCDTNamespaceURI', () => {

  it('base URI is correct', () => {
    expect(CDT_NAMESPACE).to.equal('https://w3id.org/cdt/')
  })

  it('cdt:ucum IRI is correct', () => {
    expect(CDT_IRIS.ucum).to.equal('https://w3id.org/cdt/ucum')
  })

  it('cdt:ucumunit IRI is correct', () => {
    expect(CDT_IRIS.ucumunit).to.equal('https://w3id.org/cdt/ucumunit')
  })

})

// --- TestCDTTypeCounts -------

describe('TestCDTTypeCounts', () => {

  it('CDT_IRIS has exactly 2 entries', () => {
    expect(Object.keys(CDT_IRIS)).to.have.length(2)
  })

  it('all CDT IRI values are strings', () => {
    for (const iri of Object.values(CDT_IRIS)) {
      expect(typeof iri).to.equal('string', `${iri} should be a string`)
    }
  })


})

// --- TestIsCdtDatatype -------

describe('TestIsCdtDatatype', () => {

  it('returns false for xsd:string', () => {
    expect(isCdtDatatype('http://www.w3.org/2001/XMLSchema#string')).to.be.false
  })

  it('returns false for xsd:integer', () => {
    expect(isCdtDatatype('http://www.w3.org/2001/XMLSchema#integer')).to.be.false
  })

  it('returns false for xsd:double', () => {
    expect(isCdtDatatype('http://www.w3.org/2001/XMLSchema#double')).to.be.false
  })

  it('returns false for undefined/null', () => {
    expect(isCdtDatatype(undefined as any)).to.be.false
    expect(isCdtDatatype(null as any)).to.be.false
  })

  it('returns false for an arbitrary non-CDT URI', () => {
    expect(isCdtDatatype('https://example.org/mytype')).to.be.false
  })

  it('returns true for cdt:ucum', () => {
    expect(isCdtDatatype(CDT_IRIS.ucum)).to.be.true
  })

  it('returns true for cdt:ucumunit', () => {
    expect(isCdtDatatype(CDT_IRIS.ucumunit)).to.be.true
  })

})


