/**
 * CDT DataFactory
 * 
 * A custom DataFactory that wraps rdflib.js's built-in factory and adds
 * CDT-aware behavior. When passed to a rdflib Store via opts.rdfFactory,
 * it enables correct indexing and duplicate detection for CDT literals.
 * 
 * Strategy: The factory overrides the `literal()` method to normalize CDT
 * lexical forms on creation. This means two equivalent CDT literals
 * (e.g. "1 km" and "1000 m") get the SAME normalized .value string,
 * so rdflib's native .equals() and id() work correctly without modification.
 * 
 * IMPORTANT: This changes the lexical form stored in the literal.
 * If you need to preserve original lexical forms, use the standard factory
 * and the comparison utilities from cdt-comparison.ts instead.
 */

import { parseCdtLiteral, canonicalLexicalForm } from './cdt-literal'
import { isCdtQuantityDatatype, CDT_IRIS, isCdtDatatype } from './cdt-namespace'

/**
 * Configuration options for the CDT DataFactory.
 */
export interface CdtFactoryOptions {
  /**
   * If true, CDT literals are stored with their canonical (normalized) lexical form.
   * This enables correct .equals() and store indexing for equivalent values.
   * 
   * If false, original lexical forms are preserved. You must use the
   * cdtEquals() / cdtCompare() functions for value-based comparisons.
   * 
   * Default: true
   */
  normalize?: boolean
}

/**
 * Create a CDT-aware DataFactory that wraps an existing rdflib DataFactory.
 * 
 * @param baseFactory The base rdflib DataFactory to wrap.
 *   Typically: `import { DataFactory } from 'rdflib'` or the store's existing rdfFactory.
 * @param options Configuration options
 * @returns A new DataFactory that normalizes CDT literals
 * 
 * @example
 *   import * as $rdf from 'rdflib'
 *   import { createCdtFactory } from 'rdflib-cdt'
 * 
 *   const factory = createCdtFactory($rdf.DataFactory)
 *   const store = $rdf.graph(undefined, { rdfFactory: factory })
 * 
 *   // Now the store correctly handles CDT literal equality:
 *   store.add(subj, pred, factory.literal("1 km", null, factory.namedNode(CDT.length)))
 *   store.holds(subj, pred, factory.literal("1000 m", null, factory.namedNode(CDT.length)))
 *   // → true!
 */
export function createCdtFactory(
  baseFactory: any,
  options: CdtFactoryOptions = {}
): any {
  const normalize = options.normalize !== false // default true

  // Create a proxy object that delegates everything to baseFactory
  // but intercepts literal() calls for CDT normalization
  const cdtFactory = Object.create(baseFactory)

  // Copy all enumerable properties (handles the spread-style factories in rdflib)
  for (const key of Object.keys(baseFactory)) {
    if (typeof baseFactory[key] === 'function') {
      cdtFactory[key] = baseFactory[key].bind(baseFactory)
    } else {
      cdtFactory[key] = baseFactory[key]
    }
  }

  // Override literal() to normalize CDT lexical forms
  const originalLiteral = baseFactory.literal.bind(baseFactory)

  cdtFactory.literal = function (
    value: string | number | boolean | Date,
    languageOrDatatype?: string | any
  ) {
    // Only intercept when normalize is on and we have a CDT datatype
    if (normalize && typeof value === 'string' && languageOrDatatype) {
      const dtIri = typeof languageOrDatatype === 'string'
        ? (languageOrDatatype.indexOf(':') !== -1 ? languageOrDatatype : null)
        : languageOrDatatype?.value

      if (dtIri && isCdtQuantityDatatype(dtIri)) {
        const parsed = parseCdtLiteral(value, dtIri)
        if (parsed) {
          const normalizedLexical = canonicalLexicalForm(parsed)
          return originalLiteral(normalizedLexical, languageOrDatatype)
        }
      }
    }

    return originalLiteral(value, languageOrDatatype)
  }

  // Override id() to produce canonical IDs for CDT literals
  // This is a safety net: even if normalization is off, the index hash
  // will be the same for equivalent CDT values
  if (baseFactory.id) {
    const originalId = baseFactory.id.bind(baseFactory)

    cdtFactory.id = function (term: any): string {
      if (!term) return originalId(term)

      // For CDT quantity literals, produce a canonical ID
      if (term.termType === 'Literal' && term.datatype?.value) {
        const dtIri = term.datatype.value
        if (isCdtQuantityDatatype(dtIri)) {
          const parsed = parseCdtLiteral(term.value, dtIri)
          if (parsed) {
            // Build a canonical NQ representation
            const canonLex = canonicalLexicalForm(parsed)
            return `"${canonLex}"^^<${dtIri}>`
          }
        }
      }

      return originalId(term)
    }
  }

  // Copy the supports object if it exists
  if (baseFactory.supports) {
    cdtFactory.supports = { ...baseFactory.supports }
  }

  return cdtFactory
}
