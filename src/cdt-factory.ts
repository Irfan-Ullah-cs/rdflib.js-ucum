/** CDT DataFactory — wraps rdflib's DataFactory. */

export interface CdtFactoryOptions {
  /** Enable CDT-aware value-based matching in createCdtStore. Default: true. */
  normalize?: boolean
}

export function createCdtFactory(
  baseFactory: any,
  options: CdtFactoryOptions = {}
): any {
  const cdtFactory = Object.create(baseFactory)
  for (const key of Object.keys(baseFactory)) {
    cdtFactory[key] = typeof baseFactory[key] === 'function'
      ? baseFactory[key].bind(baseFactory)
      : baseFactory[key]
  }
  if (baseFactory.supports) {
    cdtFactory.supports = { ...baseFactory.supports }
  }
  return cdtFactory
}