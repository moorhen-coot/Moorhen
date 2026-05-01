# Moorhen WASM Bindings

This directory contains the Emscripten embind wrappers that expose C++ libraries (gemmi, coot, clipper, etc.) to JavaScript/TypeScript via WebAssembly.

## File Structure

### Gemmi bindings
- **`gemmi-wrappers-helpers.h`** — Shared includes, helper functions, custom structs used across gemmi wrapper files
- **`gemmi-wrappers.cc`** — Core gemmi bindings: Structure/Model/Chain/Residue/Atom, geometry (Vec3/Position/UnitCell/Mat33), symmetry (SpaceGroup/Op), secondary structure, metadata, restraints
- **`gemmi-cif-wrappers.cc`** — CIF document/block/table types, ChemComp, MonLib, Selection, ResidueInfo
- **`gemmi-data-wrappers.cc`** — MTZ, ReflnBlock, CifToMtz, Grid/Ccp4, SmallStructure, value_arrays, free functions

### Moorhen/Coot bindings
- **`moorhen-wrappers-helpers.h`** — Shared includes, helper functions, `molecules_container_js` class definition
- **`moorhen-wrappers.cc`** — `molecules_container_t` and `molecules_container_js` embind bindings (the main API)
- **`moorhen-types-wrappers.cc`** — Supporting types: value_objects, register_vectors, clipper/mmdb classes, coot utility types, pairs, value_arrays, free functions

### Other
- **`small_molecule_to_cif.cc`** — Small molecule CIF conversion
- **`smilestopdb.cc`** — SMILES to PDB conversion
- **`privateer-wrappers.h`** — Glycan validation (privateer) bindings
- **`moorhen.d.ts`** — Auto-generated TypeScript declarations (via `--emit-tsd`)

## Adding New Bindings

### 1. Add the C++ binding

Choose the appropriate wrapper file based on which library the class/function belongs to:

```cpp
// In the relevant EMSCRIPTEN_BINDINGS block:

// For a new class:
class_<gemmi::NewClass>("NewClass")
    .property("field_name", &gemmi::NewClass::field_name)
    .function("method_name", &gemmi::NewClass::method_name)
;

// For a new free function:
function("myFunction", &myFunction);

// For a vector of your new type (needed if used as a property type):
register_vector<gemmi::NewClass>("VectorGemmiNewClass");
```

### 2. Handle common pitfalls

**Static methods** must use `.class_function()` not `.function()`:
```cpp
.class_function("static_method", &MyClass::static_method)
```

**Unbound types** — if your class has properties or return types that aren't themselves bound, the TSD generator will fail. You need to add bindings for those types too, even if just opaque:
```cpp
class_<SomeReturnType>("SomeReturnType"); // minimal opaque binding
```

**STL containers** used as property types need explicit registration:
```cpp
register_vector<MyType>("VectorMyType");
register_map<std::string, MyType>("MapStringMyType");
```

**Pointer-to-member parameters** (e.g., `bool Metadata::has(double RefinementInfo::*field)`) are not supported by `--emit-tsd`. Write a C++ wrapper function instead:
```cpp
inline bool metadata_has_field(const Metadata& m, const std::string& field) { ... }
```

**Iterator/proxy return types** (e.g., `FilterProxy`, `CraProxy`) cannot be bound directly. Write wrapper functions that return `std::vector<T>` instead.

### 3. Rebuild the WASM module

```bash
# From the Moorhen root:
./moorhen_build.sh moorhen          # 32-bit
./moorhen_build.sh moorhen --64bit  # 64-bit

# Or for faster iteration (incremental rebuild):
source ../emsdk_env.sh
cd CCP4_WASM_BUILD/moorhen_build
cmake --build . --target moorhen -- -j4
```

### 4. Generate TypeScript declarations

```bash
# Rebuild with TSD generation enabled:
cd CCP4_WASM_BUILD/moorhen_build
cmake -DEMIT_TSD=ON .
cmake --build . --target moorhen -- -j4

# Requires TypeScript 5.x (not 7.0+) installed globally or in PATH:
npm install -g typescript@5
```

The generated `moorhen.d.ts` will be in the build directory. Copy it to `wasm_src/moorhen.d.ts`.

### 5. Update the TypeScript type files

The auto-generated `moorhen.d.ts` has flat exports. The hand-maintained files in `baby-gru/src/types/` wrap these into namespaces:

- **`gemmi.d.ts`** — Maps auto-generated gemmi types into the `gemmi` namespace with `emscriptem` base types. Semi-automated: regenerate from `moorhen.d.ts` using the pattern in the existing file.
- **`libcoot.d.ts`** — Maps coot/moorhen types into the `libcootApi` namespace. **Currently fully manual** — this is the file that needs updating when you add new coot bindings. Migrating this to auto-generated types is a future goal.
- **`emscriptem.d.ts`** — Base types (`instance<T>`, `vector<T>`, `map<T1,T2>`). Rarely changes.

### 6. Run tests

```bash
cd baby-gru
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --detectOpenHandles --forceExit \
  --testPathPatterns="gemmi.test" --selectProjects api-utils
```

Tests are in `baby-gru/tests/__tests__/gemmi.test.js` (36 tests covering structure reading, MTZ, CIF tables, metadata, selections, elements, spacegroups, and more).

## Architecture Notes

Each `.cc` file has its own `EMSCRIPTEN_BINDINGS(unique_name)` block. Embind merges all blocks at link time, so splitting files is purely for maintainability.

The `--emit-tsd` linker flag generates TypeScript declarations by running the WASM module through a Node.js-based type emitter. It requires all types referenced in function signatures to be bound — otherwise it fails with "Missing binding for type" errors.

The `EMIT_TSD` CMake option is OFF by default to avoid breaking CI (requires TypeScript 5.x). Enable it explicitly with `-DEMIT_TSD=ON`.
