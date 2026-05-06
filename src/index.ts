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

export { createCdtFactory } from './cdt-factory'
export { createCdtStore } from './cdt-store'
export { UCUMOperations } from './ucum-operations'