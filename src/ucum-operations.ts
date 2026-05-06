import { cdtAdd, cdtSubtract, cdtMultiply, cdtDivide } from './cdt-arithmetic'
import {
  tryParseCdt,
  cdtEquals,
  cdtCompare,
  cdtConvert,
  cdtValueIn,
  cdtCommensurable,
} from './cdt-comparison'



export class UCUMOperations {
  private rdflib: any

  constructor(rdflib: any) {
    this.rdflib = rdflib
  }

  add(a: any, b: any): any | null {
    return cdtAdd(this.rdflib, a, b)
  }

  subtract(a: any, b: any): any | null {
    return cdtSubtract(this.rdflib, a, b)
  }

  multiply(a: any, b: any): any | null {
    return cdtMultiply(this.rdflib, a, b)
  }

  divide(a: any, b: any): any | null {
    return cdtDivide(this.rdflib, a, b)
  }

  convert(a: any, targetUnit: string): any | null {
    return cdtConvert(this.rdflib, a, targetUnit)
  }

  getValue(a: any, targetUnit: string): number | null {
    return cdtValueIn(a, targetUnit)
  }

  getUnit(a: any): string | null {
    return tryParseCdt(a)?.unitString ?? null
  }

  equals(a: any, b: any): boolean {
    return cdtEquals(a, b)
  }

  compare(a: any, b: any): -1 | 0 | 1 {
    return cdtCompare(a, b)
  }

  sameDimension(a: any, b: any): boolean {
    return cdtCommensurable(a, b)
  }
}