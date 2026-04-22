/**
 * CDT Store — CDT-enabled store factory and value-based query wrappers.
 * Literals are stored with their original lexical form (RDF spec compliant).
 */

import { createCdtFactory, CdtFactoryOptions } from './cdt-factory'
import { cdtEquals, tryParseCdt } from './cdt-comparison'
import { isCdtQuantityDatatype, CDT_IRIS } from './cdt-namespace'

/**
 * Create a CDT-enabled rdflib Store.
 *
 * @example
 *   const store = createCdtStore($rdf)
 *   const dt = $rdf.namedNode(CDT_IRIS.ucum)
 *   store.add(subj, pred, $rdf.literal('90 km/h', dt))
 *   store.holds(subj, pred, $rdf.literal('25 m/s', dt))  // -> true
 */
export function createCdtStore(
  rdflib: any,
  features?: any,
  factoryOptions?: CdtFactoryOptions
): any {
  const normalize = factoryOptions?.normalize !== false
  const baseFactory = rdflib.DataFactory ?? new rdflib.Store().rdfFactory
  const cdtFactory = createCdtFactory(baseFactory, factoryOptions)
  const store = new rdflib.Store(features, { rdfFactory: cdtFactory })

  if (normalize) {
    // When obj is a CDT literal, bypass the object index and filter by value.
    const originalSM = store.statementsMatching.bind(store)
    store.statementsMatching = function(
      subj?: any, pred?: any, obj?: any, why?: any, justOne?: boolean
    ): any[] {
      if (obj?.termType === 'Literal' && obj.datatype?.value
          && isCdtQuantityDatatype(obj.datatype.value)) {
        const candidates = originalSM(subj, pred, undefined, why)
        const results = candidates.filter((st: any) =>
          st.object?.termType === 'Literal'
          && isCdtQuantityDatatype(st.object.datatype?.value)
          && cdtEquals(st.object, obj)
        )
        return justOne ? results.slice(0, 1) : results
      }
      return originalSM(subj, pred, obj, why, justOne)
    }
  }

  return store
}

/**
 * Create a CDT quantity literal.
 *
 * @example
 *   store.add(sensor, temp, cdtStoreLiteral(store, 100, 'Cel'))
 *   store.holds(sensor, temp, cdtStoreLiteral(store, 373.15, 'K'))  // -> true
 */
export function cdtStoreLiteral(store: any, value: number, unit: string): any {
  return store.literal(`${value} ${unit}`, store.namedNode(CDT_IRIS.ucum))
}

/** Value-based statementsMatching for a plain store. */
export function cdtStatementsMatching(
  store: any,
  subj?: any,
  pred?: any,
  obj?: any,
  why?: any
): any[] {
  if (!obj || obj.termType !== 'Literal'
      || !obj.datatype?.value || !isCdtQuantityDatatype(obj.datatype.value)) {
    return store.statementsMatching(subj, pred, obj, why)
  }
  const candidates = store.statementsMatching(subj, pred, undefined, why)
  return candidates.filter((st: any) => {
    const o = st.object
    return o?.termType === 'Literal'
      && isCdtQuantityDatatype(o.datatype?.value)
      && cdtEquals(o, obj)
  })
}

/** Value-based any() for a plain store. */
export function cdtAny(
  store: any, subj?: any, pred?: any, obj?: any, why?: any
): any | undefined {
  const results = cdtStatementsMatching(store, subj, pred, obj, why)
  if (results.length === 0) return undefined
  if (!subj) return results[0].subject
  if (!pred) return results[0].predicate
  if (!obj)  return results[0].object
  if (!why)  return results[0].graph
  return results[0].object
}

/** Value-based holds() for a plain store. */
export function cdtHolds(
  store: any, subj?: any, pred?: any, obj?: any, why?: any
): boolean {
  return cdtStatementsMatching(store, subj, pred, obj, why).length > 0
}

/** CDT literals for a subject/predicate sorted ascending by canonical SI value. */
export function cdtSortedValues(store: any, subj: any, pred: any, why?: any): any[] {
  const statements = store.statementsMatching(subj, pred, undefined, why)
  const cdtLiterals = statements
    .map((st: any) => st.object)
    .filter((obj: any) =>
      obj?.termType === 'Literal'
      && isCdtQuantityDatatype(obj.datatype?.value)
      && tryParseCdt(obj) !== null
    )
  cdtLiterals.sort((a: any, b: any) =>
    tryParseCdt(a)!.canonicalValue - tryParseCdt(b)!.canonicalValue
  )
  return cdtLiterals
}

/** Statements where the CDT object value falls within [min, max]. */
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
  return store.statementsMatching(subj, pred, undefined, why).filter((st: any) => {
    const parsed = tryParseCdt(st.object)
    return parsed
      && parsed.canonicalValue >= parsedMin.canonicalValue
      && parsed.canonicalValue <= parsedMax.canonicalValue
  })
}