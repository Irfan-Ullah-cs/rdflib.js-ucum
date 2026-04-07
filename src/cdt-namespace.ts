/**
 * CDT Namespace — Custom Datatypes for Quantity Values
 *
 * Based on: https://ci.mines-stetienne.fr/lindt/v4/custom_datatypes.html
 * Namespace: https://w3id.org/cdt/
 */

export const CDT_NAMESPACE = 'https://w3id.org/cdt/'

export const CDT_IRIS = {
  ucum:     CDT_NAMESPACE + 'ucum',
  ucumunit: CDT_NAMESPACE + 'ucumunit',
} as const

export type CdtDatatypeKey = keyof typeof CDT_IRIS



export function isCdtDatatype(datatypeIri: string): boolean {
  return datatypeIri.startsWith(CDT_NAMESPACE)
}

export function isCdtQuantityDatatype(datatypeIri: string): boolean {
  return isCdtDatatype(datatypeIri) && datatypeIri !== CDT_IRIS.ucumunit
}

export function getCdtKind(datatypeIri: string): string | null {
  if (!isCdtDatatype(datatypeIri)) return null
  return datatypeIri.slice(CDT_NAMESPACE.length)
} 