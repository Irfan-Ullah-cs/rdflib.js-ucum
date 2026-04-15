/**
 * CDT Errors
 *
 * Custom error hierarchy for rdflib-cdt.
 * Mirrors exceptions.py from the Python rdflib-ucum sibling library.
 *
 * Hierarchy:
 *   UCUMError               (base, extends Error)
 *   ├── UCUMParseError      bad lexical form or non-CDT literal, e.g. "1m", ""
 *   ├── UCUMUnitError       invalid unit code, e.g. "KM", "Newton"
 *   ├── UCUMDimensionError  incompatible dimensions in operation, e.g. km + kg
 *   └── UCUMArithmeticError arithmetic failure, e.g. division by zero
 *
 * All extend Error, so existing `catch (e)` blocks and `instanceof Error`
 * checks in user code continue to work unchanged.
 *
 * Note: `Object.setPrototypeOf(this, new.target.prototype)` is required in
 * every subclass to fix the prototype chain when TypeScript compiles to ES5.
 * Without it, `instanceof UCUMDimensionError` would return false at runtime.
 */

export class UCUMError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UCUMError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UCUMParseError extends UCUMError {
  /** Lexical form could not be parsed, or argument is not a CDT literal. */
  constructor(message: string) {
    super(message)
    this.name = 'UCUMParseError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UCUMUnitError extends UCUMError {
  /** Unit code is invalid or unknown (e.g. "KM", "Newton"). */
  constructor(message: string) {
    super(message)
    this.name = 'UCUMUnitError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UCUMDimensionError extends UCUMError {
  /** Incompatible physical dimensions in an operation (e.g. km + kg). */
  constructor(message: string) {
    super(message)
    this.name = 'UCUMDimensionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UCUMArithmeticError extends UCUMError {
  /** Arithmetic failure such as division by zero. */
  constructor(message: string) {
    super(message)
    this.name = 'UCUMArithmeticError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
