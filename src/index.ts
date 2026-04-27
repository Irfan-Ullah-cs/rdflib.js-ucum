export {
  UCUMError,
  UCUMParseError,
  UCUMUnitError,
  UCUMDimensionError,
  UCUMArithmeticError,
} from './cdt-errors'

export {
  CDT_NAMESPACE,
  CDT_IRIS,
  isCdtDatatype,
  isCdtQuantityDatatype,
  getCdtKind,
} from './cdt-namespace'

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

export {
  parseCdtLiteral,
  parseCdtUnit,
  canonicalKey,
  canonicalLexicalForm,
} from './cdt-literal'
export type {
  ParsedCdtLiteral,
  ParsedCdtUnit,
} from './cdt-literal'

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

export {
  cdtAdd,
  cdtSubtract,
  cdtMultiply,
  cdtDivide,
} from './cdt-arithmetic'

export { createCdtFactory } from './cdt-factory'
export { createCdtStore } from './cdt-store'