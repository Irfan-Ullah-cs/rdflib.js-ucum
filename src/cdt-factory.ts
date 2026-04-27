/** CDT DataFactory — wraps rdflib's DataFactory. */
 
export function createCdtFactory(baseFactory: any): any {
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
 