# rdflib.js-ucum

**UCUM custom datatypes for rdflib.js** - unit-aware equality, comparison, arithmetic, and CDT literal support.

[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

## Overview

`rdflib.js-ucum` extends [rdflib.js](https://github.com/linkeddata/rdflib.js) with CDT (Custom Datatypes) quantity support, following the vocabulary defined by Lefrançois & Zimmermann. A CDT literal has a simple lexical form: a number, a space, and a UCUM unit expression - like `"90 km/h"` or `"0 Cel"`. Internally the library maps every literal to an SI base value, so `"1 km"` and `"1000 m"` refer to the same thing. The full spec is at [ci.mines-stetienne.fr/lindt/v4/custom_datatypes](https://ci.mines-stetienne.fr/lindt/v4/custom_datatypes).

Two datatypes are supported. `cdt:ucum` is for quantity literals - a number paired with a unit. `cdt:ucumunit` is for bare unit expressions with no numeric value. That's it; the library doesn't try to cover every CDT dimension type.

The core constraint is: don't touch rdflib.js. Everything works as an external layer, injected through the `opts.rdfFactory` hook and a thin wrapper around `statementsMatching`. No forking, no patching - it works alongside any rdflib.js version.

## How It Works

There are three layers. `createCdtStore` wraps rdflib.js's `statementsMatching` so that queries with a CDT-typed object match by physical value, not by string. Ask for `"25 m/s"` and you'll find a stored `"90 km/h"` - because they're the same quantity.

All UCUM parsing and conversion goes through [`@lhncbc/ucum-lhc`](https://github.com/lhncbc/ucum-lhc) (NIH/NLM), via a service layer that only calls the library's public API. Parsed unit metadata is cached, so you don't pay the lookup cost twice for the same unit string.

The comparison, conversion, and arithmetic functions work on plain rdflib.js `Literal` objects and return new ones. They don't mutate anything, and they don't need a CDT store to run - you can use them standalone.

## Installation

```bash
npm install rdflib.js-ucum
```

Or directly from GitHub while the package isn't on npm yet:

```bash
npm install github:Irfan-Ullah-cs/rdflib.js-ucum
```

**Dependencies:** `rdflib >= 2.0.0`, `@lhncbc/ucum-lhc ^5.0.0`, `decimal.js ^10.6.0`

## Quick Start

```javascript
const $rdf = require('rdflib')
const {
  createCdtStore,
  CDT_IRIS,
  cdtCompare,
  cdtConvert,
  cdtAdd,
  cdtSubtract,
  cdtMultiply,
  cdtDivide,
} = require('rdflib.js-ucum')

const EX  = $rdf.Namespace('https://example.org/')
const CDT = $rdf.namedNode(CDT_IRIS.ucum)
const lit = (s) => $rdf.literal(s, CDT)

// --- Store: value-based lookup across units ---
const store = createCdtStore($rdf)
store.add(EX('sensor'), EX('speed'), lit('90 km/h'))
store.add(EX('sensor'), EX('temp'),  lit('273.15 K'))

console.log('holds 90 km/h:',    store.holds(EX('sensor'), EX('speed'), lit('90 km/h')))  // true
console.log('holds 25 m/s:',     store.holds(EX('sensor'), EX('speed'), lit('25 m/s')))   // true
console.log('holds 30 m/s:',     store.holds(EX('sensor'), EX('speed'), lit('30 m/s')))   // false
console.log('holds 0 Cel:',      store.holds(EX('sensor'), EX('temp'),  lit('0 Cel')))    // true

// --- Comparison ---
console.log('1 km vs 500 m:',    cdtCompare(lit('1 km'),  lit('500 m')))     //  1
console.log('1 kg vs 1000 g:',   cdtCompare(lit('1 kg'),  lit('1000 g')))    //  0
console.log('3 m/s vs 90 km/h:', cdtCompare(lit('3 m/s'), lit('90 km/h')))  // -1

// --- Conversion ---
console.log('0 Cel -> K:',       cdtConvert($rdf, lit('0 Cel'), 'K').value)  // 273.15 K
console.log('1 km  -> m:',       cdtConvert($rdf, lit('1 km'),  'm').value)  // 1000 m

// --- Arithmetic ---
console.log('5 km + 200 m:',     cdtAdd($rdf,      lit('5 km'),  lit('200 m')).value)  // 5.2 km
console.log('1 h - 30 min:',     cdtSubtract($rdf, lit('1 h'),   lit('30 min')).value) // 0.5 h
console.log('10 N * 5 m:',       cdtMultiply($rdf, lit('10 N'),  lit('5 m')).value)    // 50 (N).(m)
console.log('100 m / 10 s:',     cdtDivide($rdf,   lit('100 m'), lit('10 s')).value)   // 10 (m)/(s)
```

Add and subtract only work on commensurable units and give back the result in the first operand's unit. Multiply and divide work on anything and produce a compound unit string. If you pass incompatible units like `km + kg`, you'll get a `UCUMDimensionError`. Division by zero throws `UCUMArithmeticError`. If an argument isn't a recognised CDT or XSD literal, the function returns `null`.

## References

- Lefrançois, M. & Zimmermann, A. (2018). *The Unified Code for Units of Measure in RDF: cdt:ucum and other UCUM Datatypes*. ESWC 2018 (Demo).
- Lefrançois, M. & Zimmermann, A. (2016). *Supporting Arbitrary Custom Datatypes in RDF and SPARQL*. ESWC 2016.
- [CDT specification v4](https://ci.mines-stetienne.fr/lindt/v4/custom_datatypes) - formal definition of the `cdt:ucum` datatype and related quantity types
- [UCUM specification](https://ucum.org/ucum) - the standard for unit codes
- [`@lhncbc/ucum-lhc`](https://github.com/lhncbc/ucum-lhc) - UCUM parsing and conversion engine (NIH/NLM)
- [rdflib.js](https://github.com/linkeddata/rdflib.js) - the RDF library this package extends
- [rdflib-ucum](https://github.com/Irfan-Ullah-cs/rdflib-ucum) - the Python sibling library
