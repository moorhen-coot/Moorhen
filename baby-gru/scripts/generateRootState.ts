/**
 * Script to generate a fully-resolved RootState type from the Redux store.
 *
 * Usage:  npx tsx scripts/generateRootState.ts
 *
 * This reads the project's tsconfig, resolves the RootState type via the
 * TypeScript compiler API, and writes a plain-text object type to
 *   src/store/RootState.generated.ts
 * so that library consumers never need @reduxjs/toolkit installed to get
 * the full type definition.
 */
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const ROOT_DIR = path.resolve(__dirname, "..");
const STORE_FILE = path.join(ROOT_DIR, "src/store/MoorhenReduxStore.ts");
const OUTPUT_FILE = path.join(ROOT_DIR, "./scripts/RootState.d.ts");
const STORE_DIR = path.join(ROOT_DIR, "src/store");

// ── Type-to-import-path mapping ────────────────────────────────────────
// Maps external type names to their import path (relative to src/store/)
const TYPE_IMPORT_MAP: Record<string, string> = {};

// ── helpers ────────────────────────────────────────────────────────────

function loadProgram(): ts.Program {
    const configPath = ts.findConfigFile(ROOT_DIR, ts.sys.fileExists, "tsconfig.json");
    if (!configPath) throw new Error("tsconfig.json not found");
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const { options, fileNames } = ts.parseJsonConfigFileContent(config, ts.sys, ROOT_DIR);
    return ts.createProgram(fileNames, options);
}

/** Scan the generated body for PascalCase type names that need importing. */
function collectTypeReferences(body: string): Set<string> {
    const refs = new Set<string>();
    // Match PascalCase identifiers that appear after `: ` or `< ` or `| ` or as array element types
    const regex = /(?<=[:,|<\s])([A-Z][A-Za-z0-9]+)(?=[\[;\]>|,\s])/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body)) !== null) {
        const name = match[1];
        if (name in TYPE_IMPORT_MAP) {
            refs.add(name);
        }
    }
    return refs;
}

/** Build import statements grouped by source path. */
function buildImports(refs: Set<string>): string {
    // Group types by their import path
    const byPath = new Map<string, string[]>();
    for (const name of [...refs].sort()) {
        const importPath = TYPE_IMPORT_MAP[name];
        if (!byPath.has(importPath)) byPath.set(importPath, []);
        byPath.get(importPath)!.push(name);
    }
    // Sort by path for deterministic output
    const sorted = [...byPath.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([path, names]) => `import type { ${names.join(", ")} } from "${path}";`).join("\n");
}

// ── main ───────────────────────────────────────────────────────────────

function main() {
    const program = loadProgram();
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(STORE_FILE);
    if (!sourceFile) throw new Error(`Cannot find source file: ${STORE_FILE}`);

    // Find the "reducers" variable in the store file
    let reducersType: ts.Type | undefined;
    ts.forEachChild(sourceFile, node => {
        if (
            ts.isVariableStatement(node) &&
            node.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === "reducers")
        ) {
            const decl = node.declarationList.declarations.find(d => ts.isIdentifier(d.name) && d.name.text === "reducers")!;
            reducersType = checker.getTypeAtLocation(decl);
        }
    });

    if (!reducersType) throw new Error("Could not find 'reducers' export in MoorhenReduxStore.ts");

    // Build the RootState by getting ReturnType of each reducer
    const props = reducersType.getProperties();
    const indent = "    ";
    const stateLines: string[] = [];

    for (const prop of props) {
        const reducerType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration ?? prop.declarations![0]);
        // A reducer is (state, action) => State – get the return type
        const callSigs = reducerType.getCallSignatures();
        if (callSigs.length === 0) {
            throw new Error(`Reducer "${prop.name}" has no call signatures`);
        }
        const returnType = callSigs[0].getReturnType();
        const typeStr = checker.typeToString(
            returnType,
            undefined,
            ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.MultilineObjectLiterals
        );
        stateLines.push(`${indent}${prop.name}: ${typeStr};`);
    }

    const body = stateLines.join("\n");

    // Collect and generate imports
    const refs = collectTypeReferences(body);
    const imports = buildImports(refs);

    const output = [
        "/* eslint-disable */",
        "// AUTO-GENERATED – do not edit manually.",
        "// Re-run:  npx tsx scripts/generateRootState.ts",
        "",
        "// This file provides a fully-resolved RootState type so that library",
        "// consumers never need @reduxjs/toolkit to obtain the store's shape.",
        "",
        ...(imports ? [imports, ""] : []),
        "export type RootState = {",
        body,
        "};",
        "",
    ].join("\n");

    fs.writeFileSync(OUTPUT_FILE, output, "utf-8");
    // console.log(`✓ Generated ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
    // console.log(`  ${refs.size} type imports resolved`);
}

main();
