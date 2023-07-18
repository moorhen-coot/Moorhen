
import { emscriptem } from "./emscriptem";
import { gemmi } from "./gemmi"

declare global {
    function print(arg0: string): void;
    function createRSRModule(arg0: any): Promise<any>;
    function createCCP4Module(arg0: any): Promise<libcootApi.CCP4ModuleType>;    
}

export namespace libcootApi {
    type CCP4ModuleType = {
        check_polymer_type(polymerConst: emscriptem.instance<number>): {value: number};
        remove_ligands_and_waters_chain(chain: gemmi.Chain): void;
        gemmi_setup_entities(gemmiStructure: gemmi.Structure): void;
        remove_ligands_and_waters_structure(gemmiStructure: gemmi.Structure): void;
        read_structure_from_string(pdbData: string | ArrayBuffer, molName: string): gemmi.Structure;
        get_mtz_columns(fileName: string): emscriptem.vector<string>;
        FS_createDataFile(arg0: string, fileName: string, byteArray: Uint8Array, arg3: boolean, arg4: boolean): void;
        getElementNameAsString: (arg0: emscriptem.instance<string>) => string;
        FS_unlink: (arg0: string) => void;
        cif_parse_string: (arg0: gemmi.cifDocument, arg1: string) => void;
        get_pdb_string_from_gemmi_struct: (arg0:gemmi.Structure) => string;
        Selection: { new(cid: string): gemmi.Selection };
        NeighborSearch: { new(model: gemmi.Model, unitCell: gemmi.UnitCell, radius: number): gemmi.NeighborSearch };
        Position: { new(x: number, y: number, z: number): gemmi.Position };
        Fractional: { new(x: number, y: number, z: number): gemmi.Fractional };
        cifDocument: { new(): gemmi.cifDocument }
    }
    type AtomInfo = {
        pos: [number, number, number];
        x: number;
        y: number;
        z: number;
        charge: number;
        element: emscriptem.instance<string>;
        symbol: string;
        tempFactor: number;
        serial: string;
        name: string;
        has_altloc: boolean;
        alt_loc: string;
        mol_name: string;
        chain_id: string;
        res_no: string;
        res_name: string;
        label: string;
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
    interface InterestingPlaceT extends emscriptem.instance<InterestingPlaceT> {
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
    interface Generic3dLinesBondsBoxT extends emscriptem.instance<Generic3dLinesBondsBoxT> {
        line_segments: emscriptem.vector<emscriptem.vector<CootCartesianPair>>;
    }
    type Generic3dLinesBondsBoxJS = {
        start: { x: number; y: number; z: number };
        end: { x: number; y: number; z: number };
        dist: number;
    }
    type RotamerInfoJS = {
        name: string;
        rank: number;
        status: string;
        richardson_probability: number;
    }
    interface SimpleMeshT extends emscriptem.instance<SimpleMeshT> {
        vertices: emscriptem.vector<VncVertex>;
        triangles: emscriptem.vector<gTriangle>;
    }
    interface SimpleMeshJS {
        prim_types: [[string]];
        useIndices?: [[boolean]];
        idx_tri: [[number[]]];
        vert_tri: [[number[]]];
        additional_norm_tri?: [[number[]]];
        norm_tri: [[number[]]];
        col_tri: [[number[]]];
    }
    interface SymmetryData extends emscriptem.instance<SymmetryData> {
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
    }
    interface ClipperCoordOrth extends emscriptem.instance<ClipperCoordOrth> {
        x: () => number;
        y: () => number;
        z: () => number;
    }
    interface MapMoleculeCentreInfo extends emscriptem.instance<MapMoleculeCentreInfo> {
        success: boolean;
        updated_centre: ClipperCoordOrth;
        suggested_contour_level: number;
        sum_of_densities: number;
    }
    type MapMoleculeCentreInfoJS = {
        success: boolean;
        updated_centre: [number, number, number];
        suggested_contour_level: number;
    }
    interface ResidueSpecT extends emscriptem.instance<ResidueSpecT> {
        model_number: number;
        chain_id: string;
        res_no: number;
        ins_code: string;    
    }
    interface ResidueSpecJS {
        resNum: number;
        insCode: string;
        modelNumber: number;
        chainId: string;
    } 
    interface ResidueValidationInformationT extends emscriptem.instance<ResidueValidationInformationT> {
        label: string;
        residue_spec: ResidueSpecT;
        function_value: number;
    }
    interface ChainValidationInformationT extends emscriptem.instance<ChainValidationInformationT> {
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
    }
    interface SuperposeResultsT extends emscriptem.instance<SuperposeResultsT> {
        superpose_info: string;
        alignment: PairType<string, string>;
        alignment_info_vec: emscriptem.vector<ValidationInformationT>;
        aligned_pairs: emscriptem.vector<PairType<ResidueValidationInformationT, ResidueValidationInformationT>>;
    }
    type SuperposeResultsJS = {
        referenceSequence: string,
        movingSequence: string,
        supperposeInfo: string,
        alignedPairsData: {reference: ValidationInformationJS, moving: ValidationInformationJS}[],
    }
    interface InstancedDataType extends emscriptem.instance<InstancedDataType> {
        position: [number, number, number];
        size: [number, number, number];
        colour: [number, number, number, number];
        orientation: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]];
    }
    interface gTriangle extends emscriptem.instance<gTriangle> {
        point_id: [number, number, number];
    }
    interface VncVertex extends emscriptem.instance<VncVertex> {
        pos: [number, number, number];
        normal: [number, number, number];
        color: [number, number, number, number];
    }
    interface InstancedGeomT extends emscriptem.instance<InstancedGeomT> {
        vertices: emscriptem.vector<VncVertex>;
        triangles: emscriptem.vector<gTriangle>;
        name: string;
        instancing_data_A: emscriptem.vector<InstancedDataType>;
        instancing_data_B: emscriptem.vector<InstancedDataType>;
    }
    interface InstancedMeshT extends emscriptem.instance<InstancedMeshT> {
        geom: emscriptem.vector<InstancedGeomT>;
        markup: SimpleMeshT;
    }
    type InstancedMeshJS = {
        prim_types: any;
        idx_tri: any;
        vert_tri: any;
        norm_tri: any
        col_tri: any;
        instance_use_colors: any;
        instance_sizes: any;
        instance_origins: any;
        instance_orientations: any;
    }
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
        moved_atoms: emscriptem.vector<MovedAtomT>
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
    }
    type CootModule = {
        SmilesToPDB(arg0: string, arg1: string, arg2: number, arg3: number): PairType<string, string>;
        FS: {
            readFile(tempFilename: string, arg1: { encoding: string; }): string | Uint8Array;
            mkdir: (arg0: string) => void; 
        };
        FS_unlink(tempFilename: string): void;
        FS_createDataFile(arg0: string, arg1: string, arg2: Uint8Array | string, arg3: boolean, arg4: boolean, arg5?: boolean): void;
        molecules_container_js: { new(verbose: boolean): MoleculesContainerJS };
        Vectormoved_residue_t: { new(): emscriptem.vector<MovedResidueT>};
        moved_residue_t: { new(arg0: string, arg1: number, arg2: string): MovedResidueT};
        moved_atom_t: { new(arg0: string, arg1: string, arg2: number, arg3: number, arg4: number, arg5: number): MovedAtomT};
        MapIntFloat3: { new(): emscriptem.map<[number, number, number], number>};
        VectorStringUInt_pair: { new(): emscriptem.vector<{ first: string, second: number }>};
        getRamachandranData(arg0: string, arg1: string): emscriptem.vector<RamaData>
    }
    interface MoleculesContainerJS {
        close_molecule(molNo: number): number;
        copy_fragment_using_residue_range(molNo: number, chainId: string, res_no_start: number, res_no_end: number): number;
        writeCCP4Map(molNo: number, tempFilename: string): void;
        writeCIFASCII(molNo: number, tempFilename: string): void;
        writePDBASCII(molNo: number, tempFilename: string): void;
        set_map_sampling_rate(arg0: number): void;
        fill_rotamer_probability_tables(): void;
        set_user_defined_atom_colour_by_residue(imol: number, indexedResiduesVec: emscriptem.vector<{ first: string; second: number; }>): void;
        set_user_defined_bond_colours(imol: number, colourMap: emscriptem.map<[number, number, number], number>): void;
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
    }       
}
