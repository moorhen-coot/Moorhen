// TypeScript declarations for the standalone gemmi WASM module.
// This module provides gemmi crystallography functions without the full
// coot/moorhen stack, and does NOT require SharedArrayBuffer/pthreads.

import type { gemmi } from '../types/gemmi';
import type { emscriptem } from '../types/emscriptem';

export interface GemmiModule {
    // File I/O
    FS_createDataFile(parent: string, name: string, data: Uint8Array | string, canRead: boolean, canWrite: boolean): void;
    FS_unlink(path: string): void;
    FS: any;

    // Structure reading
    read_structure_file(filePath: string, format: number): gemmi.Structure;
    read_structure_from_string(data: string, path: string): gemmi.Structure;

    // CIF parsing
    read_string(data: string): gemmi.cifDocument;
    cif_parse_string(doc: gemmi.cifDocument, data: string): void;

    // MTZ reading
    read_mtz_file(filePath: string): gemmi.Mtz;

    // Residue classification
    find_tabulated_residue(name: string): gemmi.ResidueInfo;

    // Space groups
    get_spacegroup_by_name(name: string): gemmi.SpaceGroup;
    getSpaceGroupHMAsString(sg: gemmi.SpaceGroup): string;
    getSpaceGroupHallAsString(sg: gemmi.SpaceGroup): string;

    // Structure utilities
    structure_is_ligand(structure: gemmi.Structure): boolean;
    count_residues_in_selection(structure: gemmi.Structure, selection: gemmi.Selection): number;
    remove_non_selected_atoms(structure: gemmi.Structure, selection: gemmi.Selection): gemmi.Structure;
    gemmi_setup_entities(structure: gemmi.Structure): void;
    remove_ligands_and_waters_structure(structure: gemmi.Structure): void;
    calculate_mass_model(model: gemmi.Model): number;
    calculate_mass_chain(chain: gemmi.Chain): number;
    guess_coord_data_format(fileContents: string): number;
    get_mmcif_string_from_gemmi_struct(structure: gemmi.Structure): string;
    get_pdb_string_from_gemmi_struct(structure: gemmi.Structure): string;

    // Metadata wrappers
    metadata_has_double_field(metadata: gemmi.Metadata, fieldName: string): boolean;
    metadata_has_int_field(metadata: gemmi.Metadata, fieldName: string): boolean;
    metadata_has_string_field(metadata: gemmi.Metadata, fieldName: string): boolean;

    // Selection wrappers
    selection_get_models(selection: gemmi.Selection, structure: gemmi.Structure): emscriptem.vector<gemmi.Model>;
    selection_get_chains(selection: gemmi.Selection, model: gemmi.Model): emscriptem.vector<gemmi.Chain>;
    selection_get_residues(selection: gemmi.Selection, chain: gemmi.Chain): emscriptem.vector<gemmi.Residue>;
    selection_get_atoms(selection: gemmi.Selection, residue: gemmi.Residue): emscriptem.vector<gemmi.Atom>;

    // Constructors
    Selection: { new(cid: string): gemmi.Selection };
    Position: { new(x: number, y: number, z: number): gemmi.Position };
    Fractional: { new(x: number, y: number, z: number): gemmi.Fractional };
    cifDocument: { new(): gemmi.cifDocument };
    VectorString: { new(): emscriptem.vector<string> };

    // Enums
    CoorFormat: { Unknown: number; UnknownAny: number; Pdb: number; Mmcif: number; Mmjson: number; ChemComp: number; };
}

/**
 * Create a standalone gemmi WASM module.
 * Does NOT require SharedArrayBuffer or Cross-Origin headers.
 *
 * @example
 * ```typescript
 * import createGemmiModule from 'moorhen/gemmi';
 * const gemmi = await createGemmiModule();
 * const mtz = gemmi.read_mtz_file('./data.mtz');
 * console.log(mtz.nreflections, mtz.resolution_high());
 * ```
 */
declare function createGemmiModule(options?: {
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    locateFile?: (path: string, prefix: string) => string;
}): Promise<GemmiModule>;

export default createGemmiModule;
