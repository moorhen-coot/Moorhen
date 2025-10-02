import { emscriptem } from './emscriptem';
import { gemmi } from './gemmi';
import { privateer } from './privateer';

// Warning: do not import moorhen namespace otherwise worker code breaks during transpilation

declare global {
    function print(arg0: string): void;
    function createCoot64Module(arg0: any): Promise<libcootApi.CootModule>;
    function createCootModule(arg0: any): Promise<libcootApi.CootModule>;
}

export namespace libcootApi {
    type CCP4ModuleType = {
        get_non_selected_cids(gemmiStructure: gemmi.Structure, cid: string): emscriptem.vector<string>;
        parse_multi_cids(gemmiStructure: gemmi.Structure, cid: string): emscriptem.vector<string>;
        parse_ligand_dict_info(fileContent: string): emscriptem.vector<{ comp_id: string; dict_contents: string }>;
        get_ligand_info_for_structure(gemmiStructure: gemmi.Structure): emscriptem.vector<{
            resName: string;
            chainName: string;
            resNum: string;
            modelName: string;
            cid: string;
        }>;
        guess_coord_data_format(coordDataString: string): number;
        get_structure_bfactors(gemmiStructure: gemmi.Structure): emscriptem.vector<{ cid: string; bFactor: number; normalised_bFactor }>;
        get_sequence_info(gemmiStructure: gemmi.Structure, molName: string): emscriptem.vector<SequenceEntry>;
        get_atom_info_for_selection(gemmiStructure: gemmi.Structure, arg1: string, arg2: string): emscriptem.vector<AtomInfo>;
        structure_is_ligand(gemmiStructure: gemmi.Structure): boolean;
        count_residues_in_selection(gemmiStructure: gemmi.Structure, selection: gemmi.Selection): number;
        remove_non_selected_atoms(gemmiStructure: gemmi.Structure, selection: gemmi.Selection): gemmi.Structure;
        check_polymer_type(polymerConst: emscriptem.instance<number>): { value: number };
        remove_ligands_and_waters_chain(chain: gemmi.Chain): void;
        gemmi_setup_entities(gemmiStructure: gemmi.Structure): void;
        has_hydrogen(model: gemmi.Model): number;
        gemmi_add_entity_types(gemmiStructure: gemmi.Structure, overWrite: boolean): void;
        remove_ligands_and_waters_structure(gemmiStructure: gemmi.Structure): void;
        remove_hydrogens_structure(gemmiStructure: gemmi.Structure): void;
        read_structure_from_string(coordData: string | ArrayBuffer, molName: string): gemmi.Structure;
        read_string(coordData: string): gemmi.cifDocument;
        is_small_structure(coordData: string): boolean;
        copy_to_assembly_to_new_structure(gemmiStructure: gemmi.Structure, assembly_name: string): gemmi.Structure;
        get_mtz_columns(fileName: string): emscriptem.vector<string>;
        FS_createDataFile(arg0: string, fileName: string, byteArray: Uint8Array, arg3: boolean, arg4: boolean): void;
        getElementNameAsString: (arg0: emscriptem.instance<string>) => string;
        FS_unlink: (arg0: string) => void;
        cif_parse_string: (arg0: gemmi.cifDocument, arg1: string) => void;
        get_pdb_string_from_gemmi_struct: (arg0: gemmi.Structure) => string;
        get_mmcif_string_from_gemmi_struct: (arg0: gemmi.Structure) => string;
        validate: (file: string, name: string) => emscriptem.vector<privateer.ResultsEntry>;
        Selection: { new (cid: string): gemmi.Selection };
        NeighborSearch: { new (model: gemmi.Model, unitCell: gemmi.UnitCell, radius: number): gemmi.NeighborSearch };
        Position: { new (x: number, y: number, z: number): gemmi.Position };
        Fractional: { new (x: number, y: number, z: number): gemmi.Fractional };
        cifDocument: { new (): gemmi.cifDocument };
    };
    type headerInfoGemmi = {
        title: string;
        journal: emscriptem.map<emscriptem.vector<string>, string>;
        author: emscriptem.map<emscriptem.vector<string>, string>;
        compound: string;
        software: string;
    };
    type AuthorJournal = {
        journal: string[];
        author: string[];
        id: string;
    };
    type headerInfoGemmiJS = {
        title: string;
        author_journal: AuthorJournal[];
        compound: string;
        software: string;
    };
    type headerInfo = {
        title: string;
        journal_lines: emscriptem.vector<string>;
        author_lines: emscriptem.vector<string>;
        compound_lines: emscriptem.vector<string>;
    };
    type headerInfoJS = {
        title: string;
        author_journal: AuthorJournal[];
        compound_lines: string[];
    };
    type mapCell = {
        a: () => number;
        b: () => number;
        c: () => number;
        alpha: () => number;
        beta: () => number;
        gamma: () => number;
    };
    type mapCellJS = {
        a: number;
        b: number;
        c: number;
        alpha: number;
        beta: number;
        gamma: number;
    };
    type SequenceResInfo = {
        resNum: number;
        resCode: string;
        cid: string;
    };
    type SequenceEntry = {
        type: number;
        name: string;
        chain: string;
        sequence: emscriptem.vector<SequenceResInfo>;
    };
    // We need to define AtomInfo here because we cannot import moorhen namespace otherwise worker code breaks during transpilation
    type AtomInfo = {
        x: number;
        y: number;
        z: number;
        charge: number;
        element: string;
        tempFactor: number;
        serial: number;
        occupancy: number;
        name: string;
        has_altloc: boolean;
        alt_loc: string;
        mol_name: string;
        chain_id: string;
        res_no: string;
        res_name: string;
    };
    interface AutoReadMtzInfo {
        idx: number;
        F: string;
        phi: string;
        w: string;
        F_obs: string;
        sigF_obs: string;
        Rfree: string;
        weights_used: boolean;
    }
    interface CootPhiPsi extends emscriptem.instance<CootPhiPsi> {
        ins_code: string;
        residue_number: number;
        chain_id: string;
        phi: () => number;
        psi: () => number;
    }
    interface CootPhiPsiProbT extends emscriptem.instance<CootPhiPsiProbT> {
        phi_psi: CootPhiPsi;
        is_allowed_flag: boolean;
        residue_name: () => string;
    }
    interface InterestingPlaceT {
        feature_type: string;
        residue_spec: ResidueSpecT;
        x: number;
        y: number;
        z: number;
        button_label: string;
        feature_value: number;
        badness: number;
    }
    interface InterestingPlaceDataJS extends ResidueSpecJS {
        featureType: string;
        featureValue: number;
        buttonLabel: string;
        badness: number;
        coordX: number;
        coordY: number;
        coordZ: number;
    }
    interface HBondAtom extends emscriptem.instance<HBondAtom> {
        serial: number;
        x: number;
        y: number;
        z: number;
        charge: number;
        occ: number;
        b_iso: number;
        element: string;
        name: string;
        model: number;
        chain: string;
        res_no: number;
        residue_name: string;
        altLoc: number | string;
    }
    interface AcedrgTypesForBond extends emscriptem.instance<AcedrgTypesForBond> {
        atom_id_1: string;
        atom_id_2: string;
        atom_type_1: string;
        atom_type_2: string;
        bond_length: number;
    }
    interface AcedrgTypesForBondJS {
        atom_id_1: string;
        atom_id_2: string;
        atom_type_1: string;
        atom_type_2: string;
        bond_length: number;
    }
    interface MoorhenHBond extends emscriptem.instance<MoorhenHBond> {
        hb_hydrogen: HBondAtom;
        donor: HBondAtom;
        acceptor: HBondAtom;
        donor_neigh: HBondAtom;
        acceptor_neigh: HBondAtom;
        angle_1: number;
        angle_2: number;
        angle_3: number;
        dist: number;
        ligand_atom_is_donor: boolean;
        hydrogen_is_ligand_atom: boolean;
        bond_has_hydrogen_flag: boolean;
    }
    interface HistogramInfo extends emscriptem.instance<HistogramInfo> {
        base: number;
        bin_width: number;
        counts: emscriptem.vector<number>;
    }
    type HistogramInfoJS = {
        base: number;
        bin_width: number;
        counts: number[];
    };
    type AutoReadMtzInfoJS = {
        idx: number;
        F: string;
        phi: string;
        w: string;
        F_obs: string;
        sigF_obs: string;
        Rfree: string;
        weights_used: boolean;
    };
    type HBondJS = {
        hb_hydrogen: libcootApi.HBondAtom;
        donor: libcootApi.HBondAtom;
        acceptor: libcootApi.HBondAtom;
        donor_neigh: libcootApi.HBondAtom;
        acceptor_neigh: libcootApi.HBondAtom;
        angle_1: number;
        angle_2: number;
        angle_3: number;
        dist: number;
        ligand_atom_is_donor: boolean;
        hydrogen_is_ligand_atom: boolean;
        bond_has_hydrogen_flag: boolean;
    };
    interface MMRCCStatsJS {
        'All atoms': DensityCorrelationStatsInfoJS[];
        'Side-chains': DensityCorrelationStatsInfoJS[];
    }
    interface DensityCorrelationStatsInfoJS {
        resNum: number;
        insCode: string;
        modelNumber: number;
        chainId: string;
        n: number;
        correlation: number;
    }
    interface DensityCorrelationStatsInfoT extends emscriptem.instance<DensityCorrelationStatsInfoT> {
        n: number;
        sum_xy: number;
        sum_sqrd_x: number;
        sum_sqrd_y: number;
        sum_x: number;
        sum_y: number;
        correlation: () => number;
    }
    interface CootCartesian extends emscriptem.instance<CootCartesian> {
        x: () => number;
        y: () => number;
        z: () => number;
    }
    interface CootCartesianPair extends emscriptem.instance<CootCartesianPair> {
        getStart: () => CootCartesian;
        getFinish: () => CootCartesian;
        amplitude: () => number;
        size: number;
    }
    interface Generic3dLinesBondsBoxT {
        line_segments: emscriptem.vector<emscriptem.vector<CootCartesianPair>>;
    }
    type Generic3dLinesBondsBoxJS = {
        start: { x: number; y: number; z: number };
        end: { x: number; y: number; z: number };
        dist: number;
    };
    type DiffDiffMapPeaksJS = {
        value: number;
        coord: { x: number; y: number; z: number };
    }[];
    type RotamerInfoJS = {
        name: string;
        rank: number;
        status: string;
        richardson_probability: number;
    };
    interface SimpleMeshT {
        vertices: emscriptem.vector<VncVertex>;
        triangles: emscriptem.vector<gTriangle>;
    }
    interface SimpleMeshJS {
        prim_types: [[string]];
        useIndices?: [[boolean]];
        idx_tri: [[number[] | Uint32Array]];
        vert_tri: [[number[] | Float32Array]];
        additional_norm_tri?: [[number[] | Float32Array]];
        norm_tri: [[number[] | Float32Array]];
        col_tri: [[number[] | Float32Array]];
    }
    interface SymmetryData {
        cell: CellTranslation;
        symm_trans: emscriptem.vector<PairType<SymmetryTransT, CellTranslation>>;
    }
    interface CellTranslation extends emscriptem.instance<CellTranslation> {
        us: number;
        vs: number;
        ws: number;
    }
    interface SymmetryTransT extends emscriptem.instance<SymmetryTransT> {
        x: () => number;
        y: () => number;
        z: () => number;
        is_identity: () => boolean;
        str: () => string;
        isym: () => number;
        symm_as_string: string;
    }
    type PairType<T1, T2> = {
        first: T1;
        second: T2;
    };
    interface ClipperCoordOrth extends emscriptem.instance<ClipperCoordOrth> {
        x: () => number;
        y: () => number;
        z: () => number;
    }
    interface MapMoleculeCentreInfo extends emscriptem.instance<MapMoleculeCentreInfo> {
        success: boolean;
        updated_centre: ClipperCoordOrth;
        suggested_contour_level: number;
        suggested_radius: number;
        sum_of_densities: number;
    }
    type MapMoleculeCentreInfoJS = {
        success: boolean;
        updated_centre: [number, number, number];
        suggested_contour_level: number;
        suggested_radius: number;
    };
    interface ResidueSpecT {
        model_number: number;
        chain_id: string;
        res_no: number;
        ins_code: string;
        int_user_data: number;
    }
    interface ResidueSpecJS {
        resNum: number;
        insCode: string;
        modelNumber: number;
        chainId: string;
        intUserData: number;
    }
    interface AtomSpecT {
        chain_id: string;
        res_no: number;
        ins_code: string;
        atom_name: string;
        alt_conf: string;
        int_user_data: number;
        float_user_data: number;
        string_user_data: string;
        model_number: number;
    }
    interface AtomSpecJS {
        chain_id: string;
        res_no: number;
        ins_code: string;
        atom_name: string;
        alt_conf: string;
        int_user_data: number;
        float_user_data: number;
        string_user_data: string;
        model_number: number;
    }
    interface ResidueValidationInformationT {
        label: string;
        residue_spec: ResidueSpecT;
        function_value: number;
    }
    interface ChainValidationInformationT {
        chain_id: string;
        rviv: emscriptem.vector<ResidueValidationInformationT>;
    }
    interface ValidationInformationT extends emscriptem.instance<ValidationInformationT> {
        get_index_for_chain: (arg0: string) => number;
        empty: () => boolean;
        name: string;
        cviv: emscriptem.vector<ChainValidationInformationT>;
    }
    type ValidationInformationJS = {
        chainId: string;
        insCode: string;
        seqNum: number;
        restype: string;
        value: number;
        label?: string;
    };
    interface SuperposeResultsT extends emscriptem.instance<SuperposeResultsT> {
        superpose_info: string;
        alignment: PairType<string, string>;
        alignment_info_vec: emscriptem.vector<ValidationInformationT>;
        aligned_pairs: emscriptem.vector<PairType<ResidueValidationInformationT, ResidueValidationInformationT>>;
    }
    type SuperposeResultsJS = {
        referenceSequence: string;
        movingSequence: string;
        supperposeInfo: string;
        alignedPairsData: { reference: ValidationInformationJS; moving: ValidationInformationJS }[];
    };
    type InstancedDataType = {
        position: [number, number, number];
        size: [number, number, number];
        colour: [number, number, number, number];
        orientation: [
            [number, number, number, number],
            [number, number, number, number],
            [number, number, number, number],
            [number, number, number, number],
        ];
    };
    interface gTriangle {
        point_id: [number, number, number];
    }
    interface VncVertex {
        pos: [number, number, number];
        normal: [number, number, number];
        color: [number, number, number, number];
    }
    interface InstancedGeomT {
        vertices: emscriptem.vector<VncVertex>;
        triangles: emscriptem.vector<gTriangle>;
        name: string;
        instancing_data_A: emscriptem.vector<InstancedDataType>;
        instancing_data_B: emscriptem.vector<InstancedDataType>;
    }
    interface InstancedMeshT {
        geom: emscriptem.vector<InstancedGeomT>;
        markup: SimpleMeshT;
    }
    type InstancedMeshJS = {
        prim_types: any;
        idx_tri: any;
        vert_tri: any;
        norm_tri: any;
        col_tri: any;
        instance_use_colors: any;
        instance_sizes: any;
        instance_origins: any;
        instance_orientations: any;
    };
    interface MovedAtomT extends emscriptem.instance<MovedAtomT> {
        atom_name: string;
        alt_conf: string;
        x: number;
        y: number;
        z: number;
        index: number;
    }
    interface MovedResidueT extends emscriptem.instance<MovedResidueT> {
        add_atom: (arg: MovedAtomT) => void;
        chain_id: string;
        res_no: number;
        ins_code: string;
        moved_atoms: emscriptem.vector<MovedAtomT>;
    }
    interface RamaData extends emscriptem.instance<RamaData> {
        chainId: string;
        insCode: string;
        seqNum: number;
        restype: string;
        phi: number;
        psi: number;
        isOutlier: boolean;
        is_pre_pro: boolean;
    }
    type RamaDataJS = {
        chainId: string;
        insCode: string;
        seqNum: number;
        restype: string;
        isOutlier: boolean;
        phi: number;
        psi: number;
        is_pre_pro: boolean;
    };
    type textureAsFloats = {
        width: number;
        height: number;
        x_size: number;
        y_size: number;
        z_position: number;
    };
    type textureAsFloatsJS = {
        width: number;
        height: number;
        x_size: number;
        y_size: number;
        z_position: number;
        image_data: Float32Array;
    };
    type fitLigandInfo = {
        imol: number;
        cluster_idx: number;
        ligand_idx: number;
    };
    type compoundInfo = {
        name: string;
        three_letter_code: string;
    };
    type CootModule = {
        unpackCootDataFile(arg0: string, arg1: boolean, arg2: string, arg3: string): number;
        SmilesToPDB(arg0: string, arg1: string, arg2: number, arg3: number): PairType<string, string>;
        get_mmcif_string_from_gemmi_struct(arg0: gemmi.Structure): string;
        read_structure_from_string(coordData: string | ArrayBuffer, molName: string): gemmi.Structure;
        read_string(coordData: string): gemmi.cifDocument;
        MolTextToPDB(
            mol_text_cpp: string,
            TLC: string,
            nconf: number,
            maxIters: number,
            keep_orig_coords: boolean,
            minimize: boolean
        ): PairType<string, string>;

        FS: {
            readFile(tempFilename: string, arg1: { encoding: string }): string | Uint8Array;
            mkdir: (arg0: string) => void;
        };
        FS_unlink(tempFilename: string): void;
        FS_createDataFile(arg0: string, arg1: string, arg2: Uint8Array | string, arg3: boolean, arg4: boolean, arg5?: boolean): void;
        testFloat32Array(arg0: any): Float32Array;
        copy_to_assembly_to_new_structure(gemmiStructure: gemmi.Structure, assembly_name: string): gemmi.Structure;
        getPositionsFromSimpleMesh(arg0: any): Float32Array;
        getNormalsFromSimpleMesh(arg0: any): Float32Array;
        getReversedNormalsFromSimpleMesh(arg0: any): Float32Array;
        getColoursFromSimpleMesh(arg0: any): Float32Array;
        getTextureArray(arg0: any, arg1: any): void;
        getPositionsFromSimpleMesh2(arg0: any, arg1: any): void;
        getNormalsFromSimpleMesh2(arg0: any, arg1: any): void;
        getReversedNormalsFromSimpleMesh2(arg0: any, arg1: any): void;
        getReversedNormalsFromSimpleMesh3(arg0: any, arg1: any): void;
        getColoursFromSimpleMesh2(arg0: any, arg1: any): void;
        getLineIndicesFromSimpleMesh(arg0: any): Uint32Array;
        getPermutedTriangleIndicesFromSimpleMesh(arg0: any): Uint32Array;
        getTriangleIndicesFromSimpleMesh(arg0: any): Uint32Array;
        getLineIndicesFromSimpleMesh2(arg0: any, arg1: any): void;
        getPermutedTriangleIndicesFromSimpleMesh2(arg0: any, arg1: any): void;
        getTriangleIndicesFromSimpleMesh2(arg0: any, arg1: any): void;
        getRamachandranData(arg0: string, arg1: string): emscriptem.vector<RamaData>;
        validate(arg0: string, arg1: string): emscriptem.vector<PrivateerResultsEntry>;
        parse_mon_lib_list_cif(arg0: string): emscriptem.vector<compoundInfo>;
        SmallMoleculeCifToMMCif(fileName: string): PairType<string, string>;
        get_coord_header_info(docString: string, path: string): headerInfoGemmi;
        molecules_container_js: { new (verbose: boolean): MoleculesContainerJS };
        Vectormoved_residue_t: { new (): emscriptem.vector<MovedResidueT> };
        moved_residue_t: { new (arg0: string, arg1: number, arg2: string): MovedResidueT };
        moved_atom_t: { new (arg0: string, arg1: string, arg2: number, arg3: number, arg4: number, arg5: number): MovedAtomT };
        MapIntFloat3: { new (): emscriptem.map<[number, number, number], number> };
        MapIntFloat4: { new (): emscriptem.map<[number, number, number, number], number> };
        VectorStringUInt_pair: { new (): emscriptem.vector<{ first: string; second: number }> };
        vector_pair_double_vector_double: { new (): emscriptem.vector<{ first: double; second: emscriptem.vector<double> }> };
        VectorDouble: { new (): emscriptem.vector<double> };
        is64bit(): boolean;
    };
    interface DoublePairDoubleJS {
        first: number;
        second: any;
    }
    interface MoleculesContainerJS {
        [key: string]: any;
        delete(): void;
        set_max_number_of_simple_mesh_vertices(maxVertex: number);
        get_max_number_of_simple_mesh_vertices(): numbers;
        get_overlap_dots(imol: number): void;
        set_colour_map_for_map_coloured_by_other_map(arg0: any): void;
        set_refinement_is_verbose(arg0: boolean): void;
        set_use_gemmi(arg0: boolean): void;
        get_use_gemmi(): boolean;
        export_molecular_representation_as_gltf(
            imol: number,
            cid: string,
            colourScheme: string,
            style: string,
            useSecondaryStructureScheme: number,
            fileName: string
        ): void;
        export_model_molecule_as_gltf(
            imol: number,
            cid: string,
            mode: string,
            isDark: boolean,
            bondWidth: number,
            atomRadius: number,
            bondSmoothness: number,
            drawHydrogens: boolean,
            drawMissingResidues: boolean,
            fileName: string
        ): void;
        export_map_molecule_as_gltf(
            imol: number,
            x: number,
            y: number,
            z: number,
            radius: number,
            contourLevel: number,
            fileName: string
        ): void;
        set_max_number_of_threads(arg0: number): void;
        set_map_is_contoured_with_thread_pool(arg0: boolean): void;
        close_molecule(molNo: number): number;
        copy_fragment_using_residue_range(molNo: number, chainId: string, res_no_start: number, res_no_end: number): number;
        writeCCP4Map(molNo: number, tempFilename: string): void;
        writeCIFASCII(molNo: number, tempFilename: string): void;
        writePDBASCII(molNo: number, tempFilename: string): void;
        set_map_sampling_rate(arg0: number): void;
        fill_rotamer_probability_tables(): void;
        read_coords_string(pdb_string: string, molecule_name: string): PairType<number, string>;
        set_user_defined_atom_colour_by_selection(
            imol: number,
            indexedResiduesVec: emscriptem.vector<{ first: string; second: number }>,
            nonCarbon: boolean
        ): void;
        set_user_defined_bond_colours(imol: number, colourMap: emscriptem.map<[number, number, number, number], number>): void;
        read_ccp4_map(arg0: string, arg2: boolean): number;
        associate_data_mtz_file_with_map(arg0: number, arg1: string, arg2: string, arg3: string, arg5: string): void;
        read_mtz(arg0: string, arg1: string, arg2: string, arg3: string, arg4: boolean, arg5: boolean): number;
        replace_map_by_mtz_from_file(arg0: number, arg1: string, arg2: string, arg3: string, arg4: string, arg5: boolean): number;
        replace_molecule_by_model_from_file(imol: number, tempFilename: string): void;
        import_cif_dictionary(tempFilename: string, associatedMolNo: number): number;
        auto_read_mtz(tempFilename: string): emscriptem.vector<number>;
        read_pdb(tempFilename: string): number;
        set_show_timings: (arg0: boolean) => void;
        new_positions_for_atoms_in_residues: (arg0: number, arg1: emscriptem.vector<MovedResidueT>) => number;
        get_map_spacegroup(arg0: number): string;
        get_map_data_resolution(arg0: number): number;
    }
}
