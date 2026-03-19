/**
 * rdflib-cdt — public API
 */

// ─── Namespace & Constants ───────────────────────────────────────────────────
export {
  CDT_NAMESPACE,
  CDT_IRIS,
  CDT_KIND_ANCHOR,
  UCUM_BLIND_SPOT_KINDS,
  isCdtDatatype,
  isCdtQuantityDatatype,
  getCdtKind,
} from './cdt-namespace'
export type { CdtDatatypeKey } from './cdt-namespace'

// ─── UCUM Service ────────────────────────────────────────────────────────────
export {
  assertUcumInternalsAvailable,
  getUnitMeta,
  unitExpToSiBaseUnit,
  validateUnit,
  convertValue,
  areCommensurable,
  dimensionsEqual,
  findBaseUnit,
  computeCanonicalValue,
} from './ucum-service'
export type {
  UnitMeta,
  UnitValidationResult,
  CanonicalValue,
} from './ucum-service'

// ─── CDT Literal ─────────────────────────────────────────────────────────────
export {
  parseCdtLiteral,
  parseCdtUnit,
  validateCdtDimension,
  canonicalKey,
  canonicalLexicalForm,
  cdtLiteral,
  cdtUnitLiteral,
} from './cdt-literal'
export type {
  ParsedCdtLiteral,
  ParsedCdtUnit,
} from './cdt-literal'

// ─── CDT Comparison ──────────────────────────────────────────────────────────
export {
  tryParseCdt,
  cdtEquals,
  cdtStrictEquals,
  cdtCompare,
  cdtCompareSafe,
  cdtCommensurable,
  cdtConvert,
  cdtValueIn,
} from './cdt-comparison'

// ─── CDT Arithmetic ──────────────────────────────────────────────────────────
export {
  cdtAdd,
  cdtSubtract,
  cdtMultiply,
  cdtDivide,
} from './cdt-arithmetic'

// ─── CDT Factory & Store ─────────────────────────────────────────────────────
export {
  createCdtFactory,
} from './cdt-factory'
export type { CdtFactoryOptions } from './cdt-factory'

export {
  createCdtStore,
  cdtStatementsMatching,
  cdtAny,
  cdtHolds,
  cdtSortedValues,
  cdtStatementsInRange,
} from './cdt-store'