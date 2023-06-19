/// <reference types="./index.d.ts" />

interface CootPhiPsi extends emscriptemInstanceInterface<CootPhiPsi> {
    ins_code: string;
    residue_number: number;
    chain_id: string;
    phi: () => number;
    psi: () => number;
}

interface CootPhiPsiProbT extends emscriptemInstanceInterface<CootPhiPsiProbT> {
    phi_psi: CootPhiPsi;
    is_allowed_flag: boolean;
    residue_name: string;
}

interface InterestingPlaceT extends emscriptemInstanceInterface<InterestingPlaceT> {
    feature_type: string;
    residue_spec: ResidueSpecT;
    x: number;
    y: number;
    z: number;
    button_label: string;
    feature_value: number;
    badness: number;
}

interface HBondAtom extends emscriptemInstanceInterface<HBondAtom> {
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
    altLoc: string;
}

interface MoorhenHBond extends emscriptemInstanceInterface<MoorhenHBond> {
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

interface DensityCorrelationStatsInfoT extends emscriptemInstanceInterface<DensityCorrelationStatsInfoT> {
    n: number;
    sum_xy: number;
    sum_sqrd_x: number;
    sum_sqrd_y: number;
    sum_x: number;
    sum_y: number;
    correlation: () => number;
}

interface CootCartesian extends emscriptemInstanceInterface<CootCartesian> {
    x: () => number;
    y: () => number;
    z: () => number;
}

interface CootCartesianPair extends emscriptemInstanceInterface<CootCartesianPair> {
    getStart: () => CootCartesian;
    getFinish: () => CootCartesian;
    amplitude: () => number;
    size: number;
}

interface Generic3dLinesBondsBoxT extends emscriptemInstanceInterface<Generic3dLinesBondsBoxT> {
    line_segments: emscriptemVectorInterface<emscriptemVectorInterface<CootCartesianPair>>;
}

interface SimpleMeshT extends emscriptemInstanceInterface<SimpleMeshT> {
    vertices: emscriptemVectorInterface<VncVertex>;
    triangles: emscriptemVectorInterface<gTriangle>;
}

interface SymmetryData extends emscriptemInstanceInterface<SymmetryData> {
    cell: CellTranslation;
    symm_trans: emscriptemVectorInterface<PairType<SymmetryTransT, CellTranslation>>;
}

interface CellTranslation extends emscriptemInstanceInterface<CellTranslation> {
    us: number;
    vs: number;
    ws: number;
}

interface SymmetryTransT extends emscriptemInstanceInterface<SymmetryTransT> {
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

interface ClipperCoordOrth extends emscriptemInstanceInterface<ClipperCoordOrth> {
    x: () => number;
    y: () => number;
    z: () => number;
}

interface MapMoleculeCentreInfo extends emscriptemInstanceInterface<MapMoleculeCentreInfo> {
    success: boolean;
    updated_centre: ClipperCoordOrth;
    suggested_contour_level: number;
    sum_of_densities: number;
}

interface ResidueSpecT extends emscriptemInstanceInterface<ResidueSpecT> {
    model_number: number;
    chain_id: string;
    res_no: number;
    ins_code: string;    
}


interface ResidueValidationInformationT extends emscriptemInstanceInterface<ResidueValidationInformationT> {
    label: string;
    residue_spec: ResidueSpecT;
    function_value: number;
}

interface ChainValidationInformationT extends emscriptemInstanceInterface<ChainValidationInformationT> {
    chain_id: string;
    rviv: emscriptemVectorInterface<ResidueValidationInformationT>;
}

interface ValidationInformationT extends emscriptemInstanceInterface<ValidationInformationT> {
    get_index_for_chain: (arg0: string) => number;
    empty: () => boolean;
    name: string;
    cviv: emscriptemVectorInterface<ChainValidationInformationT>;
}

interface SuperposeResultsT extends emscriptemInstanceInterface<SuperposeResultsT> {
    suppose_info: string;
    alignment: PairType<string, string>;
    alignment_info: ValidationInformationT;
}

interface InstancedDataType extends emscriptemInstanceInterface<InstancedDataType> {
    position: [number, number, number];
    size: [number, number, number];
    colour: [number, number, number, number];
    orientation: [[number, number, number, number], [number, number, number, number], [number, number, number, number], [number, number, number, number]];
}

interface gTriangle extends emscriptemInstanceInterface<gTriangle> {
    point_id: [number, number, number];
}

interface VncVertex extends emscriptemInstanceInterface<VncVertex> {
    pos: [number, number, number];
    normal: [number, number, number];
    color: [number, number, number, number];
}

interface InstancedGeomT extends emscriptemInstanceInterface<InstancedGeomT> {
    vertices: emscriptemVectorInterface<VncVertex>;
    triangles: emscriptemVectorInterface<gTriangle>;
    name: string;
    instancing_data_A: emscriptemVectorInterface<InstancedDataType>;
    instancing_data_B: emscriptemVectorInterface<InstancedDataType>;
}

interface InstancedMeshT extends emscriptemInstanceInterface<InstancedMeshT> {
    geom: emscriptemVectorInterface<InstancedGeomT>;
    markup: SimpleMeshT;
}

