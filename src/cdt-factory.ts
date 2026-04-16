/**
 * CDT DataFactory — wraps rdflib's DataFactory to normalize CDT literals.
 *
 * Overrides literal(), quad(), and id() so that equivalent CDT values
 * (e.g. "1 km" and "1000 m") are stored and indexed identically.
 */

import { parseCdtLiteral, canonicalLexicalForm } from './cdt-literal'
import { isCdtQuantityDatatype } from './cdt-namespace'

export interface CdtFactoryOptions {
  /** Normalize CDT literals to canonical SI form on write. Default: true. */
  normalize?: boolean
}

/**
 * Wrap an rdflib DataFactory with CDT normalization.
 *
 * @example
 *   const factory = createCdtFactory($rdf.DataFactory)
 *   const store = $rdf.graph(undefined, { rdfFactory: factory })
 *   const ucumDt = $rdf.namedNode(CDT_IRIS.ucum)
 *
 *   store.add(subj, pred, $rdf.literal('1 km', ucumDt))
 *   store.holds(subj, pred, $rdf.literal('1000 m', ucumDt))  //  true
 */
export function createCdtFactory(
  baseFactory: any,
  options: CdtFactoryOptions = {}
): any {
  const normalize = options.normalize !== false

  const cdtFactory = Object.create(baseFactory)
  for (const key of Object.keys(baseFactory)) {
    cdtFactory[key] = typeof baseFactory[key] === 'function'
      ? baseFactory[key].bind(baseFactory)
      : baseFactory[key]
  }

  const originalLiteral = baseFactory.literal.bind(baseFactory)

  // Returns a normalized literal if value is a CDT quantity, otherwise null.
  function normalizeCdtLiteral(value: string, languageOrDatatype: any): any | null {
    if (!normalize || !languageOrDatatype) return null
    const dtIri = typeof languageOrDatatype === 'string'
      ? (languageOrDatatype.indexOf(':') !== -1 ? languageOrDatatype : null)
      : languageOrDatatype?.value
    if (!dtIri || !isCdtQuantityDatatype(dtIri)) return null
    const parsed = parseCdtLiteral(value, dtIri)
    if (!parsed) return null
    return originalLiteral(canonicalLexicalForm(parsed), languageOrDatatype)
  }

  // Normalize on literal creation (store.literal(), parser output).
  cdtFactory.literal = function (
    value: string | number | boolean | Date,
    languageOrDatatype?: string | any
  ): any {
    if (typeof value === 'string') {
      const normalized = normalizeCdtLiteral(value, languageOrDatatype)
      if (normalized) return normalized
    }
    return originalLiteral(value, languageOrDatatype)
  }

  // Normalize on quad assembly — fires for every store.add() call,
  // including literals created via the global $rdf.literal().
  if (baseFactory.quad) {
    const originalQuad = baseFactory.quad.bind(baseFactory)
    cdtFactory.quad = function (subject: any, predicate: any, object: any, graph: any): any {
      if (normalize && object?.termType === 'Literal' && object.datatype?.value
          && isCdtQuantityDatatype(object.datatype.value)) {
        const parsed = parseCdtLiteral(object.value, object.datatype.value)
        if (parsed) {
          object = originalLiteral(canonicalLexicalForm(parsed), object.datatype)
        }
      }
      return originalQuad(subject, predicate, object, graph)
    }
  }

  // Canonical index key — ensures equivalent CDT values land in the same bucket.
  if (baseFactory.id) {
    const originalId = baseFactory.id.bind(baseFactory)
    cdtFactory.id = function (term: any): string {
      if (term?.termType === 'Literal' && term.datatype?.value
          && isCdtQuantityDatatype(term.datatype.value)) {
        const parsed = parseCdtLiteral(term.value, term.datatype.value)
        if (parsed) {
          return `"${canonicalLexicalForm(parsed)}"^^<${term.datatype.value}>`
        }
      }
      return originalId(term)
    }
  }

  if (baseFactory.supports) {
    cdtFactory.supports = { ...baseFactory.supports }
  }

  return cdtFactory
}