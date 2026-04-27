import { createCdtFactory } from './cdt-factory'
import { cdtEquals } from './cdt-comparison'
import { isCdtQuantityDatatype } from './cdt-namespace'

/**
 * Create a CDT-enabled rdflib.js Store.
 *
 * The store's native query API works by physical value for CDT literals:
 *   store.holds(subj, pred, $rdf.literal('1000 m', cdt))  // true if "1 km" is stored
 *   store.any(subj, pred, $rdf.literal('25 m/s', cdt))    // finds "90 km/h"
 *   store.each(subj, pred)                                 // returns stored literals
 *
 * @param rdflib  The rdflib.js module (import $rdf from 'rdflib')
 * @param features Optional store features (e.g. ['sameAs'])
 */
export function createCdtStore(rdflib: any, features?: any): any {
  const rdf = rdflib?.default ?? rdflib
  const baseFactory = rdf.DataFactory ?? new rdf.Store().rdfFactory
  const cdtFactory = createCdtFactory(baseFactory)
  const store = new rdf.Store(features, { rdfFactory: cdtFactory })

  const originalSM = store.statementsMatching.bind(store)
  store.statementsMatching = function(
    subj?: any, pred?: any, obj?: any, why?: any, justOne?: boolean
  ): any[] {
    if (obj?.termType === 'Literal'
        && obj.datatype?.value
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

  return store
}