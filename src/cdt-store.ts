/**
 * CDT Store
 * 
 * Convenience functions to create CDT-enabled rdflib stores and 
 * CDT-aware query wrappers for when you need value-based matching
 * without normalizing lexical forms.
 */

import { createCdtFactory, CdtFactoryOptions } from './cdt-factory'
import { cdtEquals, tryParseCdt } from './cdt-comparison'
import { isCdtQuantityDatatype } from './cdt-namespace'

/**
 * Create a CDT-enabled rdflib Store.
 * 
 * This is the simplest way to get started. It creates a store that
 * automatically normalizes CDT literals so that equivalent values
 * (like "1 km" and "1000 m") are treated as equal.
 * 
 * @param rdflib The rdflib module (import * as $rdf from 'rdflib')
 * @param features Optional store features (e.g. ['sameAs'])
 * @param factoryOptions Options for the CDT factory
 * @returns A new rdflib Store with CDT support
 * 
 * @example
 *   import * as $rdf from 'rdflib'
 *   import { createCdtStore, CDT_IRIS } from 'rdflib-cdt'
 * 
 *   const store = createCdtStore($rdf)
 *   const subj = $rdf.namedNode('http://example.org/sensor1')
 *   const pred = $rdf.namedNode('http://example.org/measures')
 *   const cdt = $rdf.namedNode(CDT_IRIS.length)
 * 
 *   store.add(subj, pred, $rdf.literal("1 km", null, cdt))
 *   
 *   // This now works because "1000 m" normalizes to the same value as "1 km":
 *   store.holds(subj, pred, $rdf.literal("1000 m", null, cdt))
 *   // → true
 */
export function createCdtStore(
  rdflib: any,
  features?: any,
  factoryOptions?: CdtFactoryOptions
): any {
  const baseFactory = rdflib.DataFactory
  const cdtFactory = createCdtFactory(baseFactory, factoryOptions)
  return new rdflib.Store(features, { rdfFactory: cdtFactory })
}

/**
 * CDT-aware wrapper for statementsMatching that handles value-based
 * matching for CDT literals.
 * 
 * Use this when you want to keep original lexical forms (normalize=false)
 * but still need value-based matching.
 * 
 * @param store An rdflib Store
 * @param subj Subject to match (or null/undefined for wildcard)
 * @param pred Predicate to match (or null/undefined for wildcard)
 * @param obj Object to match (or null/undefined for wildcard)
 * @param why Graph to match (or null/undefined for wildcard)
 * @returns Array of matching statements
 * 
 * @example
 *   // Store has: <s> <p> "90 km/h"^^cdt:speed
 *   // Query for: <s> <p> "25 m/s"^^cdt:speed
 *   cdtStatementsMatching(store, s, p, $rdf.literal("25 m/s", null, speedDt))
 *   // → finds the "90 km/h" statement because they have the same value
 */
export function cdtStatementsMatching(
  store: any,
  subj?: any,
  pred?: any,
  obj?: any,
  why?: any
): any[] {
  // If obj is not a CDT literal, delegate directly to the store
  if (!obj || obj.termType !== 'Literal' || 
      !obj.datatype?.value || !isCdtQuantityDatatype(obj.datatype.value)) {
    return store.statementsMatching(subj, pred, obj, why)
  }

  // For CDT object patterns: get all statements matching s, p, ?, g
  // then filter by CDT value equality
  const candidates = store.statementsMatching(subj, pred, undefined, why)
  
  return candidates.filter((st: any) => {
    const stObj = st.object
    if (!stObj || stObj.termType !== 'Literal') return false
    if (!stObj.datatype?.value || !isCdtQuantityDatatype(stObj.datatype.value)) return false
    return cdtEquals(stObj, obj)
  })
}

/**
 * CDT-aware `any()` — find any object matching a CDT value.
 * 
 * @param store An rdflib Store
 * @param subj Subject to match
 * @param pred Predicate to match
 * @param obj Object CDT literal to match by value (or undefined for any)
 * @param why Graph to match
 * @returns The first matching term, or undefined
 */
export function cdtAny(
  store: any,
  subj?: any,
  pred?: any,
  obj?: any,
  why?: any
): any | undefined {
  const results = cdtStatementsMatching(store, subj, pred, obj, why)
  if (results.length === 0) return undefined
  
  // Return the term in the wildcard position
  if (!subj) return results[0].subject
  if (!pred) return results[0].predicate
  if (!obj) return results[0].object
  if (!why) return results[0].graph
  return results[0].object
}

/**
 * CDT-aware `holds()` — check if a statement with CDT value equality exists.
 * 
 * @param store An rdflib Store
 * @param subj Subject
 * @param pred Predicate
 * @param obj Object (CDT literal for value-based matching)
 * @param why Graph
 * @returns true if a matching statement exists
 */
export function cdtHolds(
  store: any,
  subj?: any,
  pred?: any,
  obj?: any,
  why?: any
): boolean {
  return cdtStatementsMatching(store, subj, pred, obj, why).length > 0
}

/**
 * Find all CDT quantity literals in the store for a given subject and predicate,
 * and return them sorted by value (ascending).
 * 
 * @param store An rdflib Store
 * @param subj The subject
 * @param pred The predicate
 * @param why Optional graph filter
 * @returns Array of CDT literal objects, sorted by canonical value
 */
export function cdtSortedValues(
  store: any,
  subj: any,
  pred: any,
  why?: any
): any[] {
  const statements = store.statementsMatching(subj, pred, undefined, why)
  
  const cdtLiterals = statements
    .map((st: any) => st.object)
    .filter((obj: any) => {
      return obj?.termType === 'Literal' &&
        obj.datatype?.value &&
        isCdtQuantityDatatype(obj.datatype.value) &&
        tryParseCdt(obj) !== null
    })

  cdtLiterals.sort((a: any, b: any) => {
    const pa = tryParseCdt(a)!
    const pb = tryParseCdt(b)!
    return pa.canonicalValue - pb.canonicalValue
  })

  return cdtLiterals
}

/**
 * Filter statements from the store where the CDT object value
 * falls within a range.
 * 
 * @param store An rdflib Store
 * @param subj Subject pattern
 * @param pred Predicate pattern
 * @param min Minimum value (CDT literal, inclusive)
 * @param max Maximum value (CDT literal, inclusive)
 * @param why Optional graph filter
 * @returns Matching statements
 */
export function cdtStatementsInRange(
  store: any,
  subj: any | undefined,
  pred: any | undefined,
  min: any,
  max: any,
  why?: any
): any[] {
  const parsedMin = tryParseCdt(min)
  const parsedMax = tryParseCdt(max)
  if (!parsedMin || !parsedMax) return []

  const statements = store.statementsMatching(subj, pred, undefined, why)

  return statements.filter((st: any) => {
    const parsed = tryParseCdt(st.object)
    if (!parsed) return false
    return parsed.canonicalValue >= parsedMin.canonicalValue &&
           parsed.canonicalValue <= parsedMax.canonicalValue
  })
}
