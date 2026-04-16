/**
 * CDT Store — CDT-enabled store factory and value-based query wrappers.
 */

import { createCdtFactory, CdtFactoryOptions } from './cdt-factory'
import { cdtEquals, tryParseCdt } from './cdt-comparison'
import { parseCdtLiteral, canonicalLexicalForm } from './cdt-literal'
import { isCdtQuantityDatatype, CDT_IRIS } from './cdt-namespace'

/**
 * Create a CDT-enabled rdflib Store.
 *
 * CDT literals are normalized to SI canonical form on write, so rdflib's
 * native holds(), any(), each(), and statementsMatching() all work correctly
 * across equivalent units (e.g. "1 km" equals "1000 m").
 *
 * @example
 *   const store = createCdtStore($rdf)
 *   store.add(subj, pred, $rdf.literal('1 km', $rdf.namedNode(CDT_IRIS.ucum)))
 *   store.holds(subj, pred, $rdf.literal('1000 m', $rdf.namedNode(CDT_IRIS.ucum)))  // -> true
 *
 *   // or use the helper:
 *   store.add(subj, pred, cdtStoreLiteral(store, 90, 'km/h'))
 *   store.holds(subj, pred, cdtStoreLiteral(store, 25, 'm/s'))  // -> true
 */
export function createCdtStore(
  rdflib: any,
  features?: any,
  factoryOptions?: CdtFactoryOptions
): any {
  const normalize = factoryOptions?.normalize !== false
  const baseFactory = rdflib.DataFactory
  const cdtFactory = createCdtFactory(baseFactory, factoryOptions)
  const store = new rdflib.Store(features, { rdfFactory: cdtFactory })

  if (normalize) {
    // statementsMatching uses term.equals() for candidate filtering, which
    // compares raw lexical strings. Normalize the query object so both sides
    // of the equals check carry the same canonical form.
    const originalSM = store.statementsMatching.bind(store)
    store.statementsMatching = function(
      subj?: any, pred?: any, obj?: any, why?: any, justOne?: boolean
    ): any[] {
      if (obj?.termType === 'Literal' && obj.datatype?.value
          && isCdtQuantityDatatype(obj.datatype.value)) {
        const parsed = parseCdtLiteral(obj.value, obj.datatype.value)
        if (parsed) obj = cdtFactory.literal(canonicalLexicalForm(parsed), obj.datatype)
      }
      return originalSM(subj, pred, obj, why, justOne)
    }
  }

  return store
}

/**
 * Create a CDT quantity literal through the store's CDT factory.
 *
 * @example
 *   store.add(sensor, temp, cdtStoreLiteral(store, 100, 'Cel'))
 *   store.holds(sensor, temp, cdtStoreLiteral(store, 373.15, 'K'))  // -> true
 */
export function cdtStoreLiteral(store: any, value: number, unit: string): any {
  return store.literal(`${value} ${unit}`, store.namedNode(CDT_IRIS.ucum))
}

/**
 * Value-based statementsMatching for a plain store.
 * Matches CDT literals by physical value, not lexical form.
 */
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

/**
 * Return all CDT literals for a subject/predicate, sorted ascending by
 * canonical SI value. Works on plain and CDT stores.
 */
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

/**
 * Return statements where the CDT object value falls within [min, max].
 * Bounds can use any commensurable unit. Works on plain and CDT stores.
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
  return store.statementsMatching(subj, pred, undefined, why).filter((st: any) => {
    const parsed = tryParseCdt(st.object)
    return parsed
      && parsed.canonicalValue >= parsedMin.canonicalValue
      && parsed.canonicalValue <= parsedMax.canonicalValue
  })
}