// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    namespace FS {
        export let root: any;
        export let mounts: any[];
        export let devices: {};
        export let streams: any[];
        export let nextInode: number;
        export let nameTable: any;
        export let currentPath: string;
        export let initialized: boolean;
        export let ignorePermissions: boolean;
        export let filesystems: any;
        export let syncFSRequests: number;
        export let readFiles: {};
        export { ErrnoError };
        export { FSStream };
        export { FSNode };
        export function lookupPath(path: any, opts?: {}): {
            path: string;
            node?: undefined;
        } | {
            path: string;
            node: any;
        };
        export function getPath(node: any): any;
        export function hashName(parentid: any, name: any): number;
        export function hashAddNode(node: any): void;
        export function hashRemoveNode(node: any): void;
        export function lookupNode(parent: any, name: any): any;
        export function createNode(parent: any, name: any, mode: any, rdev: any): any;
        export function destroyNode(node: any): void;
        export function isRoot(node: any): boolean;
        export function isMountpoint(node: any): boolean;
        export function isFile(mode: any): boolean;
        export function isDir(mode: any): boolean;
        export function isLink(mode: any): boolean;
        export function isChrdev(mode: any): boolean;
        export function isBlkdev(mode: any): boolean;
        export function isFIFO(mode: any): boolean;
        export function isSocket(mode: any): boolean;
        export function flagsToPermissionString(flag: any): string;
        export function nodePermissions(node: any, perms: any): 0 | 2;
        export function mayLookup(dir: any): any;
        export function mayCreate(dir: any, name: any): any;
        export function mayDelete(dir: any, name: any, isdir: any): any;
        export function mayOpen(node: any, flags: any): any;
        export function checkOpExists(op: any, err: any): any;
        export let MAX_OPEN_FDS: number;
        export function nextfd(): number;
        export function getStreamChecked(fd: any): any;
        export function getStream(fd: any): any;
        export function createStream(stream: any, fd?: number): any;
        export function closeStream(fd: any): void;
        export function dupStream(origStream: any, fd?: number): any;
        export function doSetAttr(stream: any, node: any, attr: any): void;
        export namespace chrdev_stream_ops {
            function open(stream: any): void;
            function llseek(): never;
        }
        export function major(dev: any): number;
        export function minor(dev: any): number;
        export function makedev(ma: any, mi: any): number;
        export function registerDevice(dev: any, ops: any): void;
        export function getDevice(dev: any): any;
        export function getMounts(mount: any): any[];
        export function syncfs(populate: any, callback: any): void;
        export function mount(type: any, opts: any, mountpoint: any): any;
        export function unmount(mountpoint: any): void;
        export function lookup(parent: any, name: any): any;
        export function mknod(path: any, mode: any, dev: any): any;
        export function statfs(path: any): any;
        export function statfsStream(stream: any): any;
        export function statfsNode(node: any): {
            bsize: number;
            frsize: number;
            blocks: number;
            bfree: number;
            bavail: number;
            files: any;
            ffree: number;
            fsid: number;
            flags: number;
            namelen: number;
        };
        export function create(path: any, mode?: number): any;
        export function mkdir(path: any, mode?: number): any;
        export function mkdirTree(path: any, mode: any): void;
        export function mkdev(path: any, mode: any, dev: any): any;
        export function symlink(oldpath: any, newpath: any): any;
        export function rename(old_path: any, new_path: any): void;
        export function rmdir(path: any): void;
        export function readdir(path: any): any;
        export function unlink(path: any): void;
        export function readlink(path: any): any;
        export function stat(path: any, dontFollow: any): any;
        export function fstat(fd: any): any;
        export function lstat(path: any): any;
        export function doChmod(stream: any, node: any, mode: any, dontFollow: any): void;
        export function chmod(path: any, mode: any, dontFollow: any): void;
        export function lchmod(path: any, mode: any): void;
        export function fchmod(fd: any, mode: any): void;
        export function doChown(stream: any, node: any, dontFollow: any): void;
        export function chown(path: any, uid: any, gid: any, dontFollow: any): void;
        export function lchown(path: any, uid: any, gid: any): void;
        export function fchown(fd: any, uid: any, gid: any): void;
        export function doTruncate(stream: any, node: any, len: any): void;
        export function truncate(path: any, len: any): void;
        export function ftruncate(fd: any, len: any): void;
        export function utime(path: any, atime: any, mtime: any): void;
        export function open(path: any, flags: any, mode?: number): any;
        export function close(stream: any): void;
        export function isClosed(stream: any): boolean;
        export function llseek(stream: any, offset: any, whence: any): any;
        export function read(stream: any, buffer: any, offset: any, length: any, position: any): any;
        export function write(stream: any, buffer: any, offset: any, length: any, position: any, canOwn: any): any;
        export function mmap(stream: any, length: any, position: any, prot: any, flags: any): any;
        export function msync(stream: any, buffer: any, offset: any, length: any, mmapFlags: any): any;
        export function ioctl(stream: any, cmd: any, arg: any): any;
        export function readFile(path: any, opts?: {}): any;
        export function writeFile(path: any, data: any, opts?: {}): void;
        export function cwd(): any;
        export function chdir(path: any): void;
        export function createDefaultDirectories(): void;
        export function createDefaultDevices(): void;
        export function createSpecialDirectories(): void;
        export function createStandardStreams(input: any, output: any, error: any): void;
        export function staticInit(): void;
        export function init(input: any, output: any, error: any): void;
        export function quit(): void;
        export function findObject(path: any, dontResolveLastLink: any): any;
        export function analyzePath(path: any, dontResolveLastLink: any): {
            isRoot: boolean;
            exists: boolean;
            error: number;
            name: any;
            path: any;
            object: any;
            parentExists: boolean;
            parentPath: any;
            parentObject: any;
        };
        export function createPath(parent: any, path: any, canRead: any, canWrite: any): any;
        export function createFile(parent: any, name: any, properties: any, canRead: any, canWrite: any): any;
        export function createDataFile(parent: any, name: any, data: any, canRead: any, canWrite: any, canOwn: any): void;
        export function createDevice(parent: any, name: any, input: any, output: any): any;
        export function forceLoadFile(obj: any): boolean;
        export function createLazyFile(parent: any, name: any, url: any, canRead: any, canWrite: any): any;
        export function absolutePath(): void;
        export function createFolder(): void;
        export function createLink(): void;
        export function joinPath(): void;
        export function mmapAlloc(): void;
        export function standardizePath(): void;
    }
    function FS_createPath(...args: any[]): any;
    function FS_createDataFile(...args: any[]): any;
    function FS_createPreloadedFile(parent: any, name: any, url: any, canRead: any, canWrite: any, onload: any, onerror: any, dontCreateFile: any, canOwn: any, preFinish: any): void;
    function FS_unlink(...args: any[]): any;
    function FS_createLazyFile(...args: any[]): any;
    function FS_createDevice(...args: any[]): any;
    let addRunDependency: any;
    let removeRunDependency: any;
}
declare class ErrnoError extends Error {
    constructor(errno: any);
    errno: any;
    code: string;
}
declare class FSStream {
    shared: {};
    set object(val: any);
    get object(): any;
    node: any;
    get isRead(): boolean;
    get isWrite(): boolean;
    get isAppend(): number;
    set flags(val: any);
    get flags(): any;
    set position(val: any);
    get position(): any;
}
declare class FSNode {
    constructor(parent: any, name: any, mode: any, rdev: any);
    node_ops: {};
    stream_ops: {};
    readMode: number;
    writeMode: number;
    mounted: any;
    parent: any;
    mount: any;
    id: number;
    name: any;
    mode: any;
    rdev: any;
    atime: number;
    mtime: number;
    ctime: number;
    set read(val: boolean);
    get read(): boolean;
    set write(val: boolean);
    get write(): boolean;
    get isFolder(): any;
    get isDevice(): any;
}
interface WasmModule {
  __ZN5boost13serialization16singleton_module8get_lockEv(_0: number): number;
  __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN5RDKit9MolBundleEE16save_object_dataERNS1_14basic_oarchiveEPKv(_0: number, _1: number, _2: number): void;
  __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv(_0: number, _1: number, _2: number): void;
  __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN5RDKit9MolBundleEE16load_object_dataERNS1_14basic_iarchiveEPvj(_0: number, _1: number, _2: number, _3: number): void;
  __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__26vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj(_0: number, _1: number, _2: number, _3: number): void;
  ___set_stack_limits(_0: number, _1: number): void;
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  clone(): this;
}
export interface molecules_container_t extends ClassHandle {
  use_gemmi: boolean;
  dedust_map(_0: number): number;
  set_max_number_of_simple_mesh_vertices(_0: number): void;
  get_max_number_of_simple_mesh_vertices(): number;
  rotate_around_bond(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: EmbindString, _5: EmbindString, _6: number): number;
  read_extra_restraints(_0: number, _1: EmbindString): number;
  add_lsq_superpose_atom_match(_0: EmbindString, _1: number, _2: EmbindString, _3: EmbindString, _4: number, _5: EmbindString): void;
  split_residue_using_map(_0: number, _1: EmbindString, _2: number): number;
  flood(_0: number, _1: number, _2: number): number;
  copy_molecule(_0: number): number;
  mmcif_tests(_0: boolean): number;
  M2T_updateIntParameter(_0: number, _1: EmbindString, _2: number): void;
  M2T_updateFloatParameter(_0: number, _1: EmbindString, _2: number): void;
  clear_lsq_matches(): void;
  add_lsq_superpose_match(_0: EmbindString, _1: number, _2: number, _3: EmbindString, _4: number, _5: number, _6: number): void;
  assign_sequence(_0: number, _1: number): void;
  associate_sequence(_0: number, _1: EmbindString, _2: EmbindString): void;
  get_group_for_monomer(_0: EmbindString): string;
  get_hb_type(_0: EmbindString, _1: number, _2: EmbindString): string;
  get_imol_enc_any(): number;
  get_median_temperature_factor(_0: number): number;
  get_number_of_map_sections(_0: number, _1: number): number;
  get_number_of_molecules(): number;
  get_use_rama_plot_restraints(): boolean;
  get_use_torsion_restraints(): boolean;
  make_power_scaled_map(_0: number, _1: number): number;
  print_secondary_structure_info(_0: number): void;
  read_coordinates(_0: EmbindString): number;
  refine_residues(_0: number, _1: EmbindString, _2: number, _3: EmbindString, _4: EmbindString, _5: EmbindString, _6: number): number;
  set_add_waters_sigma_cutoff(_0: number): void;
  set_add_waters_variance_limit(_0: number): void;
  set_molecule_name(_0: number, _1: EmbindString): void;
  write_coordinates(_0: number, _1: EmbindString): number;
  get_density_at_position(_0: number, _1: number, _2: number, _3: number): number;
  lsq_superpose(_0: number, _1: number): boolean;
  new_molecule(_0: EmbindString): number;
  copy_dictionary(_0: EmbindString, _1: number, _2: number): boolean;
  end_delete_closed_molecules(): void;
  make_ensemble(_0: EmbindString): number;
  match_ligand_torsions_and_position_using_cid(_0: number, _1: number, _2: EmbindString): boolean;
  set_rama_plot_restraints_weight(_0: number): void;
  get_rama_plot_restraints_weight(): number;
  set_use_rama_plot_restraints(_0: boolean): void;
  set_use_torsion_restraints(_0: boolean): void;
  set_torsion_restraints_weight(_0: number): void;
  get_torsion_restraints_weight(): number;
  set_refinement_is_verbose(_0: boolean): void;
  print_non_drawn_bonds(_0: number): void;
  pop_back(): void;
  get_use_gemmi(): boolean;
  set_use_gemmi(_0: boolean): void;
  generate_local_self_restraints(_0: number, _1: number, _2: EmbindString): void;
  set_max_number_of_threads(_0: number): void;
  set_map_is_contoured_with_thread_pool(_0: boolean): void;
  is_EM_map(_0: number): boolean;
  scale_map(_0: number, _1: number): void;
  set_map_sampling_rate(_0: number): void;
  molecule_to_mmCIF_string(_0: number): string;
  molecule_to_PDB_string(_0: number): string;
  clear_refinement(_0: number): void;
  get_suggested_initial_contour_level(_0: number): number;
  clear_target_position_restraints(_0: number): void;
  init_refinement_of_molecule_as_fragment_based_on_reference(_0: number, _1: number, _2: number): void;
  copy_fragment_for_refinement_using_cid(_0: number, _1: EmbindString): number;
  add_target_position_restraint(_0: number, _1: EmbindString, _2: number, _3: number, _4: number): void;
  set_colour_wheel_rotation_base(_0: number, _1: number): void;
  set_base_colour_for_bonds(_0: number, _1: number, _2: number, _3: number): void;
  set_use_bespoke_carbon_atom_colour(_0: number, _1: boolean): void;
  fit_to_map_by_random_jiggle_using_cid(_0: number, _1: EmbindString, _2: number, _3: number): number;
  is_a_difference_map(_0: number): boolean;
  add_hydrogen_atoms(_0: number): number;
  delete_hydrogen_atoms(_0: number): number;
  get_monomer_from_dictionary(_0: EmbindString, _1: number, _2: boolean): number;
  get_map_weight(): number;
  set_map_weight(_0: number): void;
  set_show_timings(_0: boolean): void;
  get_molecule_name(_0: number): string;
  get_map_mean(_0: number): number;
  get_map_rmsd_approx(_0: number): number;
  set_draw_missing_residue_loops(_0: boolean): void;
  set_make_backups(_0: boolean): void;
  get_residue_name(_0: number, _1: EmbindString, _2: number, _3: EmbindString): string;
  get_molecule_diameter(_0: number): number;
  multiply_residue_temperature_factors(_0: number, _1: EmbindString, _2: number): void;
  shift_field_b_factor_refinement(_0: number, _1: number): boolean;
  write_map(_0: number, _1: EmbindString): number;
  calculate_new_rail_points(): number;
  rail_points_total(): number;
  sfcalc_genmap(_0: number, _1: number, _2: number): void;
  add_colour_rule(_0: number, _1: EmbindString, _2: EmbindString): void;
  delete_colour_rules(_0: number): void;
  add_colour_rules_multi(_0: number, _1: EmbindString): void;
  get_svg_for_residue_type(_0: number, _1: EmbindString, _2: boolean, _3: EmbindString): string;
  get_svg_for_2d_ligand_environment_view(_0: number, _1: EmbindString, _2: boolean): string;
  is_valid_model_molecule(_0: number): boolean;
  is_valid_map_molecule(_0: number): boolean;
  read_pdb(_0: EmbindString): number;
  read_ccp4_map(_0: EmbindString, _1: boolean): number;
  read_mtz(_0: EmbindString, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: boolean, _5: boolean): number;
  import_cif_dictionary(_0: EmbindString, _1: number): number;
  get_number_of_atoms(_0: number): number;
  get_number_of_hydrogen_atoms(_0: number): number;
  flipPeptide_cid(_0: number, _1: EmbindString, _2: EmbindString): number;
  side_chain_180(_0: number, _1: EmbindString): number;
  eigen_flip_ligand(_0: number, _1: EmbindString): void;
  jed_flip(_0: number, _1: EmbindString, _2: boolean): string;
  add_terminal_residue_directly_using_cid(_0: number, _1: EmbindString): number;
  auto_fit_rotamer(_0: number, _1: EmbindString, _2: number, _3: EmbindString, _4: EmbindString, _5: number): number;
  rigid_body_fit(_0: number, _1: EmbindString, _2: number): number;
  cis_trans_convert(_0: number, _1: EmbindString): number;
  geometry_init_standard(): void;
  fill_rotamer_probability_tables(): void;
  copy_fragment_using_residue_range(_0: number, _1: EmbindString, _2: number, _3: number): number;
  copy_fragment_using_cid(_0: number, _1: EmbindString): number;
  close_molecule(_0: number): number;
  undo(_0: number): number;
  redo(_0: number): number;
  refine_residues_using_atom_cid(_0: number, _1: EmbindString, _2: EmbindString, _3: number): number;
  refine_residue_range(_0: number, _1: EmbindString, _2: number, _3: number, _4: number): number;
  set_imol_refinement_map(_0: number): void;
  mutate(_0: number, _1: EmbindString, _2: EmbindString): number;
  fill_partial_residue(_0: number, _1: EmbindString, _2: number, _3: EmbindString): number;
  fill_partial_residues(_0: number): number;
  add_alternative_conformation(_0: number, _1: EmbindString): number;
  clear(): void;
  get_monomer(_0: EmbindString): number;
  get_monomer_and_position_at(_0: EmbindString, _1: number, _2: number, _3: number, _4: number): number;
  move_molecule_to_new_centre(_0: number, _1: number, _2: number, _3: number): number;
  apply_transformation_to_atom_selection(_0: number, _1: EmbindString, _2: number, _3: number, _4: number, _5: number, _6: number, _7: number, _8: number, _9: number, _10: number, _11: number, _12: number, _13: number, _14: number, _15: number, _16: number, _17: number): number;
  add_waters(_0: number, _1: number): number;
  set_add_waters_water_to_protein_distance_lim_min(_0: number): void;
  set_add_waters_water_to_protein_distance_lim_max(_0: number): void;
  associate_data_mtz_file_with_map(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: EmbindString): void;
  connect_updating_maps(_0: number, _1: number, _2: number, _3: number): number;
  export_chemical_features_as_gltf(_0: number, _1: EmbindString, _2: EmbindString): void;
  export_molecular_representation_as_gltf(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: number, _5: EmbindString): void;
  export_model_molecule_as_gltf(_0: number, _1: EmbindString, _2: EmbindString, _3: boolean, _4: number, _5: number, _6: number, _7: boolean, _8: boolean, _9: EmbindString): void;
  export_map_molecule_as_gltf(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: EmbindString): void;
  add_to_non_drawn_bonds(_0: number, _1: EmbindString): void;
  clear_non_drawn_bonds(_0: number): void;
  file_name_to_string(_0: EmbindString): string;
  replace_molecule_by_model_from_file(_0: number, _1: EmbindString): void;
  replace_residue(_0: number, _1: EmbindString, _2: EmbindString, _3: number): void;
  replace_map_by_mtz_from_file(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: EmbindString, _5: boolean): number;
  replace_fragment(_0: number, _1: number, _2: EmbindString): number;
  sharpen_blur_map(_0: number, _1: number, _2: boolean): number;
  flip_hand(_0: number): number;
  mask_map_by_atom_selection(_0: number, _1: number, _2: EmbindString, _3: number, _4: boolean): number;
  generate_self_restraints(_0: number, _1: number): number;
  generate_chain_self_restraints(_0: number, _1: number, _2: EmbindString): void;
  generate_local_self_restraints(_0: number, _1: number, _2: EmbindString): void;
  clear_extra_restraints(_0: number): void;
  fit_to_map_by_random_jiggle_with_blur_using_cid(_0: number, _1: number, _2: EmbindString, _3: number, _4: number, _5: number): number;
  set_refinement_geman_mcclure_alpha(_0: number): void;
  get_geman_mcclure_alpha(): number;
  sharpen_blur_map_with_resample(_0: number, _1: number, _2: number, _3: boolean): number;
  get_rdkit_mol_pickle_base64(_0: EmbindString, _1: number): string;
  get_SMILES_for_residue_type(_0: EmbindString, _1: number): string;
  set_occupancy(_0: number, _1: EmbindString, _2: number): void;
  read_small_molecule_cif(_0: EmbindString): number;
  get_missing_residue_ranges(_0: number): vector_residue_range_t;
  get_map_molecule_centre(_0: number): map_molecule_centre_info_t;
  get_mutation_info(_0: number): chain_mutation_info_container_t;
  get_acedrg_atom_types_for_ligand(_0: number, _1: EmbindString): acedrg_types_for_residue_t;
  peptide_omega_analysis(_0: number): validation_information_t;
  density_fit_analysis(_0: number, _1: number): validation_information_t;
  ramachandran_analysis(_0: number): validation_information_t;
  density_correlation_analysis(_0: number, _1: number): validation_information_t;
  rotamer_analysis(_0: number): validation_information_t;
  get_q_score(_0: number, _1: number): validation_information_t;
  get_q_score_for_cid(_0: number, _1: EmbindString, _2: number): validation_information_t;
  get_map_section_texture(_0: number, _1: number, _2: number, _3: number, _4: number): texture_as_floats_t;
  get_atom(_0: number, _1: atom_spec_t): Atom | null;
  flipPeptide(_0: number, _1: atom_spec_t, _2: EmbindString): number;
  get_molecule_centre(_0: number): Cartesian;
  fit_to_map_by_random_jiggle(_0: number, _1: residue_spec_t, _2: number, _3: number): number;
  residue_cid_to_residue_spec(_0: number, _1: EmbindString): residue_spec_t;
  get_residue(_0: number, _1: residue_spec_t): Residue | null;
  change_to_next_rotamer(_0: number, _1: EmbindString, _2: EmbindString): rotamer_change_info_t;
  change_to_previous_rotamer(_0: number, _1: EmbindString, _2: EmbindString): rotamer_change_info_t;
  change_to_first_rotamer(_0: number, _1: EmbindString, _2: EmbindString): rotamer_change_info_t;
  fit_ligand(_0: number, _1: number, _2: number, _3: number, _4: boolean, _5: number): VectorFitLigandInfo_t;
  find_water_baddies(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: boolean, _7: boolean): VectorAtomSpec_t;
  auto_read_mtz(_0: EmbindString): VectorAutoReadMtzInfo_t;
  set_user_defined_bond_colours(_0: number, _1: MapIntFloat4): void;
  get_diff_diff_map_peaks(_0: number, _1: number, _2: number, _3: number): VectorClipperCoordOrth_float_pair;
  fourier_shell_correlation(_0: number, _1: number): VectorDouble_pair;
  set_user_defined_atom_colour_by_selection(_0: number, _1: VectorStringUInt_pair, _2: boolean): void;
  get_symmetry(_0: number, _1: number, _2: number, _3: number, _4: number): symmetry_info_t;
  get_colour_rules(_0: number): Vectorstring_string_pair;
  get_gphl_chem_comp_info(_0: EmbindString, _1: number): Vectorstring_string_pair;
  new_positions_for_atoms_in_residues(_0: number, _1: Vectormoved_residue_t): number;
  new_positions_for_residue_atoms(_0: number, _1: EmbindString, _2: Vectormoved_atom_t): number;
  get_sum_density_for_atoms_in_residue(_0: number, _1: EmbindString, _2: VectorString, _3: number): number;
  get_groups_for_monomers(_0: VectorString): VectorString;
  non_standard_residue_types_in_model(_0: number): VectorString;
  get_chains_in_model(_0: number): VectorString;
  get_residue_names_with_no_dictionary(_0: number): VectorString;
  get_ncs_related_chains(_0: number): VectorVectorString;
  average_map(_0: EmbindString, _1: VectorFloat): number;
  regen_map(_0: number, _1: EmbindString, _2: VectorFloat): boolean;
  get_residue_sidechain_average_position(_0: number, _1: EmbindString): VectorDouble;
  get_residue_CA_position(_0: number, _1: EmbindString): VectorDouble;
  get_residue_average_position(_0: number, _1: EmbindString): VectorDouble;
  get_dictionary_conformers(_0: EmbindString, _1: number, _2: boolean): VectorInt;
  split_multi_model_molecule(_0: number): VectorInt;
  partition_map_by_chain(_0: number, _1: number): VectorInt;
  fit_ligand_right_here(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: number, _7: boolean, _8: number): VectorInt;
  make_masked_maps_split_by_chain(_0: number, _1: number): VectorInt;
  get_map_histogram(_0: number, _1: number, _2: number): histogram_info_t;
  get_map_vertices_histogram(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: number, _7: number): histogram_info_t;
  get_residues_near_residue(_0: number, _1: EmbindString, _2: number): Vectorresidue_spec_t;
  residues_with_missing_atoms(_0: number): Vectorresidue_spec_t;
  difference_map_peaks(_0: number, _1: number, _2: number): Vectorinteresting_place_t;
  pepflips_using_difference_map(_0: number, _1: number, _2: number): Vectorinteresting_place_t;
  unmodelled_blobs(_0: number, _1: number, _2: number): Vectorinteresting_place_t;
  get_octahemisphere(_0: number): simple_mesh_t;
  get_mesh_for_ligand_validation_vs_dictionary(_0: number, _1: EmbindString): simple_mesh_t;
  get_gaussian_surface(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): simple_mesh_t;
  get_molecular_representation_mesh(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: number): simple_mesh_t;
  test_origin_cube(): simple_mesh_t;
  get_ramachandran_validation_markup_mesh(_0: number): simple_mesh_t;
  get_rotamer_dodecs(_0: number): simple_mesh_t;
  get_map_contours_mesh(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): simple_mesh_t;
  get_chemical_features_mesh(_0: number, _1: EmbindString): simple_mesh_t;
  get_bonds_mesh(_0: number, _1: EmbindString, _2: boolean, _3: number, _4: number, _5: number): simple_mesh_t;
  get_map_contours_mesh_using_other_map_for_colours(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: number, _7: number, _8: number, _9: boolean): simple_mesh_t;
  add_target_position_restraint_and_refine(_0: number, _1: EmbindString, _2: number, _3: number, _4: number, _5: number): instanced_mesh_t;
  get_rotamer_dodecs_instanced(_0: number): instanced_mesh_t;
  contact_dots_for_ligand(_0: number, _1: EmbindString, _2: number): instanced_mesh_t;
  all_molecule_contact_dots(_0: number, _1: number): instanced_mesh_t;
  get_goodsell_style_mesh_instanced(_0: number, _1: number, _2: number, _3: number): instanced_mesh_t;
  get_bonds_mesh_instanced(_0: number, _1: EmbindString, _2: boolean, _3: number, _4: number, _5: boolean, _6: boolean, _7: boolean, _8: boolean, _9: number): instanced_mesh_t;
  get_bonds_mesh_for_selection_instanced(_0: number, _1: EmbindString, _2: EmbindString, _3: boolean, _4: number, _5: number, _6: boolean, _7: boolean, _8: boolean, _9: boolean, _10: number): instanced_mesh_t;
  get_extra_restraints_mesh(_0: number, _1: number): instanced_mesh_t;
  get_single_letter_codes_for_chain(_0: number, _1: EmbindString): Vectorresidue_spec_t_string_pair;
  ramachandran_validation(_0: number): Vectophi_psi_prob_t;
  get_h_bonds(_0: number, _1: EmbindString, _2: boolean): Vectorh_bond;
  sfcalc_genmaps_using_bulk_solvent(_0: number, _1: number, _2: number, _3: number): sfcalc_genmap_stats_t;
  get_r_factor_stats(): r_factor_stats;
  merge_molecules(_0: number, _1: EmbindString): int_vector_merge_molecule_results_info_t_pair;
  mmrrcc(_0: number, _1: EmbindString, _2: number): map_residue_spec_t_:density_correlation_stats_info_t_pair;
  SSM_superpose(_0: number, _1: EmbindString, _2: number, _3: EmbindString): superpose_results_t;
  add_terminal_residue_directly(_0: number, _1: EmbindString, _2: number, _3: EmbindString): int_string_pair;
  get_active_atom(_0: number, _1: number, _2: number, _3: EmbindString): int_string_pair;
  change_chain_id(_0: number, _1: EmbindString, _2: EmbindString, _3: boolean, _4: number, _5: number): int_string_pair;
  delete_atom(_0: number, _1: EmbindString, _2: number, _3: EmbindString, _4: EmbindString, _5: EmbindString): int_uint_pair;
  delete_atom_using_cid(_0: number, _1: EmbindString): int_uint_pair;
  delete_residue(_0: number, _1: EmbindString, _2: number, _3: EmbindString): int_uint_pair;
  delete_residue_using_cid(_0: number, _1: EmbindString): int_uint_pair;
  delete_residue_atoms_with_alt_conf(_0: number, _1: EmbindString, _2: number, _3: EmbindString, _4: EmbindString): int_uint_pair;
  delete_residue_atoms_using_cid(_0: number, _1: EmbindString): int_uint_pair;
  delete_side_chain(_0: number, _1: EmbindString, _2: number, _3: EmbindString): int_uint_pair;
  delete_chain_using_cid(_0: number, _1: EmbindString): int_uint_pair;
  delete_using_cid(_0: number, _1: EmbindString, _2: EmbindString): int_uint_pair;
  get_ligand_distortion(_0: number, _1: EmbindString, _2: boolean): int_double_pair;
  get_lsq_matrix(_0: number, _1: number, _2: boolean): lsq_results_t;
  transform_map_using_lsq_matrix(_0: number, _1: lsq_results_t, _2: number, _3: number, _4: number, _5: number): number;
  get_header_info(_0: number): moorhen_header_info_t;
  set_colour_map_for_map_coloured_by_other_map(_0: vector_pair_double_vector_double): void;
  minimize_energy(_0: number, _1: EmbindString, _2: number, _3: boolean, _4: number, _5: boolean, _6: number, _7: boolean): int_instanced_mesh_pair;
  refine(_0: number, _1: number): int_instanced_mesh_pair;
  get_overlap_dots(_0: number): coot_atom_overlaps_dots_container_t;
  get_ligand_validation_vs_dictionary(_0: number, _1: EmbindString, _2: boolean): Vector_coot_geometry_distortion_info_pod_container_t;
  get_validation_vs_dictionary_for_selection(_0: number, _1: EmbindString, _2: boolean): Vector_coot_geometry_distortion_info_pod_container_t;
  go_to_blob(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: number): pair_bool_Coord_orth;
  get_cell(_0: number): api_cell_t;
  dictionary_atom_name_map(_0: EmbindString, _1: number, _2: EmbindString, _3: number): MapStringString_2;
}

export interface molecules_container_js extends molecules_container_t {
  get_validation(_0: number): string;
  writePDBASCII(_0: number, _1: EmbindString): number;
  writeCIFASCII(_0: number, _1: EmbindString): number;
  writeCCP4Map(_0: number, _1: EmbindString): number;
  get_map_data_resolution(_0: number): number;
  add(_0: number): number;
  get_neighbours_cid(_0: number, _1: EmbindString, _2: number): string;
  model_has_glycans(_0: number): boolean;
  get_molecule_atoms(_0: number, _1: EmbindString): string;
  replace_molecule_by_model_from_string(_0: number, _1: EmbindString): void;
  read_dictionary_string(_0: EmbindString, _1: number): number;
  molecule_to_mmCIF_string_with_gemmi(_0: number): string;
  export_molecular_representation_as_obj(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: number, _5: EmbindString): void;
  export_model_molecule_as_obj(_0: number, _1: EmbindString, _2: EmbindString, _3: boolean, _4: number, _5: number, _6: number, _7: boolean, _8: boolean, _9: EmbindString): void;
  export_map_molecule_as_obj(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: EmbindString): void;
  export_molecular_representation_as_3mf_xml(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: number, _5: EmbindString): void;
  export_model_molecule_as_3mf_xml(_0: number, _1: EmbindString, _2: EmbindString, _3: boolean, _4: number, _5: number, _6: number, _7: boolean, _8: boolean, _9: EmbindString): void;
  export_map_molecule_as_3mf_xml(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: EmbindString): void;
  export_metaballs_as_obj(_0: number, _1: EmbindString, _2: number, _3: number, _4: number, _5: EmbindString): void;
  export_metaballs_as_gltf(_0: number, _1: EmbindString, _2: number, _3: number, _4: number, _5: EmbindString): void;
  export_metaballs_as_3mf_xml(_0: number, _1: EmbindString, _2: number, _3: number, _4: number, _5: EmbindString): void;
  privateer_validate(_0: number): Table;
  get_map_spacegroup(_0: number): Spacegroup;
  get_map_cell(_0: number): Cell;
  get_map_bounding_sphere(_0: number, _1: number): pair_position_value;
  make_exportable_environment_bond_box(_0: number, _1: EmbindString, _2: number, _3: EmbindString, _4: number): generic_3d_lines_bonds_box_t;
  slicendice_slice(_0: number, _1: number, _2: EmbindString, _3: EmbindString): VectorStringInt_pair;
  go_to_blob_array(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number, _6: number): VectorFloat;
  getFloats(_0: number): VectorFloat;
  GetSecondaryStructure(_0: number, _1: number): Vectorresidue_spec_t;
  count_simple_mesh_vertices(_0: simple_mesh_t): number;
  DrawMoorhenMetaBalls(_0: number, _1: EmbindString, _2: number, _3: number, _4: number, _5: number): simple_mesh_t;
  DrawGlycoBlocks(_0: number, _1: EmbindString): instanced_mesh_t;
  smiles_to_pdb(_0: EmbindString, _1: EmbindString, _2: number, _3: number): string_string_pair;
  mol_text_to_pdb(_0: EmbindString, _1: EmbindString, _2: number, _3: number, _4: boolean, _5: boolean): string_string_pair;
  read_coords_string(_0: EmbindString, _1: EmbindString): int_string_pair;
  get_symmetry_with_matrices(_0: number, _1: number, _2: number, _3: number, _4: number): symmetry_info_t_matrixVector_pair;
}

export type TorsionEntry = {
  sugar_1: EmbindString,
  sugar_2: EmbindString,
  atom_number_1: EmbindString,
  atom_number_2: EmbindString,
  phi: number,
  psi: number
};

export interface vector<TorsionEntry> extends ClassHandle {
  push_back(_0: TorsionEntry): void;
  resize(_0: number, _1: TorsionEntry): void;
  size(): number;
  get(_0: number): TorsionEntry | undefined;
  set(_0: number, _1: TorsionEntry): boolean;
}

export interface vector_residue_range_t extends ClassHandle {
  size(): number;
  get(_0: number): residue_range_t | undefined;
  push_back(_0: residue_range_t): void;
  resize(_0: number, _1: residue_range_t): void;
  set(_0: number, _1: residue_range_t): boolean;
}

export interface vector_geometry_distortion_info_container_t extends ClassHandle {
  size(): number;
  get(_0: number): geometry_distortion_info_container_t | undefined;
  push_back(_0: geometry_distortion_info_container_t): void;
  resize(_0: number, _1: geometry_distortion_info_container_t): void;
  set(_0: number, _1: geometry_distortion_info_container_t): boolean;
}

export interface vector_geometry_distortion_info_t extends ClassHandle {
  size(): number;
  get(_0: number): geometry_distortion_info_t | undefined;
  push_back(_0: geometry_distortion_info_t): void;
  resize(_0: number, _1: geometry_distortion_info_t): void;
  set(_0: number, _1: geometry_distortion_info_t): boolean;
}

export type TableEntry = {
  svg: EmbindString,
  wurcs: EmbindString,
  chain: EmbindString,
  glyconnect_id: EmbindString,
  glytoucan_id: EmbindString,
  id: EmbindString,
  torsion_err: number,
  conformation_err: number,
  anomer_err: number,
  puckering_err: number,
  chirality_err: number,
  torsions: vector<TorsionEntry>
};

export interface Table extends ClassHandle {
  push_back(_0: TableEntry): void;
  resize(_0: number, _1: TableEntry): void;
  size(): number;
  get(_0: number): TableEntry | undefined;
  set(_0: number, _1: TableEntry): boolean;
}

export interface Coord_orth extends ClassHandle {
  x(): number;
  y(): number;
  z(): number;
}

export type map_molecule_centre_info_t = {
  success: boolean,
  updated_centre: Coord_orth,
  suggested_radius: number,
  suggested_contour_level: number
};

export type atom_overlap_t = {
  overlap_volume: number,
  r_1: number,
  r_2: number,
  is_h_bond: boolean,
  ligand_atom_index: number
};

export interface vector_overlap extends ClassHandle {
  push_back(_0: atom_overlap_t): void;
  resize(_0: number, _1: atom_overlap_t): void;
  size(): number;
  get(_0: number): atom_overlap_t | undefined;
  set(_0: number, _1: atom_overlap_t): boolean;
}

export interface Spgr_descr extends ClassHandle {
  spacegroup_number(): number;
  symbol_hall(): Clipper_String;
  symbol_hm(): Clipper_String;
  symbol_xhm(): Clipper_String;
  symbol_hm_ext(): Clipper_String;
}

export interface Spacegroup extends Spgr_descr {
}

export interface Cell_descr extends ClassHandle {
  a(): number;
  b(): number;
  c(): number;
  alpha(): number;
  beta(): number;
  gamma(): number;
  alpha_deg(): number;
  beta_deg(): number;
  gamma_deg(): number;
  format(): Clipper_String;
}

export interface Cell extends Cell_descr {
  a_star(): number;
  b_star(): number;
  c_star(): number;
  alpha_star(): number;
  beta_star(): number;
  gamma_star(): number;
  descr(): Cell_descr;
  is_null(): boolean;
  init(_0: Cell_descr): void;
}

export interface Xmap_base extends ClassHandle {
  cell(): Cell;
}

export interface Clipper_String extends ClassHandle {
  as_string(): string;
}

export interface Xmap_float extends Xmap_base {
}

export interface CCP4MAPfile extends ClassHandle {
  open_read(_0: Clipper_String): void;
  open_write(_0: Clipper_String): void;
  close_read(): void;
  close_write(): void;
}

export interface simple_rotamer extends ClassHandle {
  P_r1234(): number;
  Probability_rich(): number;
  get_chi(_0: number): number;
}

export interface geometry_distortion_info_container_t extends ClassHandle {
  geometry_distortion: vector_geometry_distortion_info_t;
  get chain_id(): string;
  set chain_id(value: EmbindString);
  n_atoms: number;
  min_resno: number;
  max_resno: number;
  set_min_max(_0: number, _1: number): void;
  size(): number;
  print(): number;
  distortion(): number;
  distortion_sum(): number;
  get_geometry_distortion_info(_0: number): geometry_distortion_info_t;
}

export interface geometry_distortion_info_t extends ClassHandle {
  is_set: boolean;
  distortion_score: number;
  residue_spec: residue_spec_t;
  atom_specs: VectorAtomSpec_t;
  atom_indices: VectorInt;
  initialised_p(): boolean;
}

export interface residue_range_t extends ClassHandle {
  get chain_id(): string;
  set chain_id(value: EmbindString);
  res_no_start: number;
  res_no_end: number;
}

export interface mutate_insertion_range_info_t extends ClassHandle {
  start_resno: number;
  types: VectorString;
  end_resno(): number;
}

export interface chain_mutation_info_container_t extends ClassHandle {
  get chain_id(): string;
  set chain_id(value: EmbindString);
  get alignedS(): string;
  set alignedS(value: EmbindString);
  get alignedT(): string;
  set alignedT(value: EmbindString);
  get alignedS_label(): string;
  set alignedS_label(value: EmbindString);
  get alignedT_label(): string;
  set alignedT_label(value: EmbindString);
  get alignment_string(): string;
  set alignment_string(value: EmbindString);
  deletions: Vectorresidue_spec_t;
  single_insertions: Vectorresidue_spec_t_string_pair;
  mutations: Vectorresidue_spec_t_string_pair;
  alignment_score: pair_bool_float;
  insertions: Vector_coot_mutate_insertion_range_info_t;
  rationalize_insertions(): void;
  print(): void;
  dissimilarity_score(): number;
  add_deletion(_0: residue_spec_t): void;
  add_mutation(_0: residue_spec_t, _1: EmbindString): void;
  add_insertion(_0: residue_spec_t, _1: EmbindString): void;
  get_residue_type(_0: residue_spec_t): string;
}

export type acedrg_types_for_bond_t = {
  atom_id_1: EmbindString,
  atom_id_2: EmbindString,
  atom_type_1: EmbindString,
  atom_type_2: EmbindString,
  bond_length: number
};

export interface VectorAcedrgTypesForBond_t extends ClassHandle {
  push_back(_0: acedrg_types_for_bond_t): void;
  resize(_0: number, _1: acedrg_types_for_bond_t): void;
  size(): number;
  get(_0: number): acedrg_types_for_bond_t | undefined;
  set(_0: number, _1: acedrg_types_for_bond_t): boolean;
}

export type acedrg_types_for_residue_t = {
  bond_types: VectorAcedrgTypesForBond_t
};

export interface validation_information_t extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  get type(): string;
  set type(value: EmbindString);
  cviv: Vectorchain_validation_information_t;
  get_index_for_chain(_0: EmbindString): number;
  empty(): boolean;
}

export interface Atom extends ClassHandle {
  x: number;
  y: number;
  z: number;
  serNum: number;
  occupancy: number;
  tempFactor: number;
  charge: number;
  sigX: number;
  sigY: number;
  sigZ: number;
  sigOcc: number;
  sigTemp: number;
  u11: number;
  u22: number;
  u33: number;
  u12: number;
  u13: number;
  u23: number;
  Het: boolean;
  Ter: boolean;
  GetNBonds(): number;
  GetModelNum(): number;
  GetSeqNum(): number;
  GetLabelSeqID(): number;
  GetLabelEntityID(): number;
  GetSSEType(): number;
  isTer(): boolean;
  isMetal(): boolean;
  isSolvent(): boolean;
  isInSelection(_0: number): boolean;
  isNTerminus(): boolean;
  isCTerminus(): boolean;
  GetResidueNo(): number;
  GetIndex(): number;
  GetAtomName(): string;
  GetChainID(): string;
  GetLabelAsymID(): string;
  GetLabelCompID(): string;
  GetInsCode(): string;
}

export interface Residue extends ClassHandle {
  seqNum: number;
  label_seq_id: number;
  label_entity_id: number;
  index: number;
  nAtoms: number;
  GetModelNum(): number;
  GetSeqNum(): number;
  GetLabelSeqID(): number;
  GetLabelEntityID(): number;
  GetResidueNo(): number;
  GetNofAltLocations(): number;
  isAminoacid(): boolean;
  isNucleotide(): boolean;
  isDNARNA(): number;
  isSugar(): boolean;
  isSolvent(): boolean;
  isModRes(): boolean;
  isInSelection(_0: number): boolean;
  isNTerminus(): boolean;
  isCTerminus(): boolean;
  GetResName(): string;
  GetChainID(): string;
  GetLabelAsymID(): string;
  GetLabelCompID(): string;
  GetInsCode(): string;
  GetAtom(_0: number): Atom | null;
  GetNumberOfAtoms(): number;
  GetNumberOfAtoms_countTers(_0: boolean): number;
}

export interface phi_psi_prob_t extends ClassHandle {
  is_allowed_flag: boolean;
  phi_psi: phi_psi_t;
  position: Cartesian;
  residue_name(): string;
  is_allowed(): boolean;
}

export interface moved_atom_t extends ClassHandle {
  get atom_name(): string;
  set atom_name(value: EmbindString);
  get alt_conf(): string;
  set alt_conf(value: EmbindString);
  x: number;
  y: number;
  z: number;
  index: number;
}

export type auto_read_mtz_info_t = {
  idx: number,
  F: EmbindString,
  F_obs: EmbindString,
  sigF_obs: EmbindString,
  Rfree: EmbindString,
  phi: EmbindString,
  w: EmbindString,
  weights_used: boolean
};

export interface moved_residue_t extends ClassHandle {
  get chain_id(): string;
  set chain_id(value: EmbindString);
  res_no: number;
  get ins_code(): string;
  set ins_code(value: EmbindString);
  moved_atoms: Vectormoved_atom_t;
  add_atom(_0: moved_atom_t): void;
}

export type Coot_Cell = {
  a: number,
  b: number,
  c: number,
  alpha: number,
  beta: number,
  gamma: number
};

export type texture_as_floats_t = {
  width: number,
  height: number,
  x_size: number,
  y_size: number,
  z_position: number
};

export type fit_ligand_info_t = {
  imol: number,
  cluster_idx: number,
  ligand_idx: number,
  fitting_score: number,
  cluster_volume: number
};

export interface CartesianPair extends ClassHandle {
  amplitude(): number;
  getStart(): Cartesian;
  getFinish(): Cartesian;
}

export interface RamachandranInfo extends ClassHandle {
  get chainId(): string;
  set chainId(value: EmbindString);
  seqNum: number;
  get insCode(): string;
  set insCode(value: EmbindString);
  get restype(): string;
  set restype(value: EmbindString);
  phi: number;
  psi: number;
  isOutlier: boolean;
  is_pre_pro: boolean;
}

export interface ResiduePropertyInfo extends ClassHandle {
  get chainId(): string;
  set chainId(value: EmbindString);
  seqNum: number;
  get insCode(): string;
  set insCode(value: EmbindString);
  get restype(): string;
  set restype(value: EmbindString);
  property: number;
}

export type atom_spec_t = {
  chain_id: EmbindString,
  res_no: number,
  ins_code: EmbindString,
  atom_name: EmbindString,
  alt_conf: EmbindString,
  int_user_data: number,
  float_user_data: number,
  string_user_data: EmbindString,
  model_number: number
};

export interface phi_psi_t extends ClassHandle {
  get ins_code(): string;
  set ins_code(value: EmbindString);
  get chain_id(): string;
  set chain_id(value: EmbindString);
  residue_number: number;
  phi(): number;
  psi(): number;
  label(): string;
  residue_name(): string;
  is_filled(): boolean;
  is_pre_pro(): boolean;
}

export interface Cartesian extends ClassHandle {
  x(): number;
  y(): number;
  z(): number;
}

export type residue_spec_t = {
  model_number: number,
  chain_id: EmbindString,
  res_no: number,
  ins_code: EmbindString,
  int_user_data: number
};

export type merge_molecule_results_info_t = {
  chain_id: EmbindString,
  spec: residue_spec_t,
  is_chain: boolean
};

export type residue_validation_information_t = {
  function_value: number,
  label: EmbindString,
  residue_spec: residue_spec_t,
  atom_spec: atom_spec_t
};

export type interesting_place_t = {
  feature_type: EmbindString,
  residue_spec: residue_spec_t,
  button_label: EmbindString,
  feature_value: number,
  badness: number,
  x: number,
  y: number,
  z: number
};

export type rotamer_change_info_t = {
  rank: number,
  name: EmbindString,
  richardson_probability: number,
  status: number
};

export type Cell_Translation = {
  us: number,
  ws: number,
  vs: number
};

export interface symm_trans_t extends ClassHandle {
  get symm_as_string(): string;
  set symm_as_string(value: EmbindString);
  is_identity(): boolean;
  add_shift(_0: number, _1: number, _2: number): void;
  isym(): number;
  x(): number;
  y(): number;
  z(): number;
}

export interface density_correlation_stats_info_t extends ClassHandle {
  n: number;
  sum_xy: number;
  sum_sqrd_x: number;
  sum_sqrd_y: number;
  sum_x: number;
  sum_y: number;
  var_x(): number;
  var_y(): number;
  correlation(): number;
}

export type array_native_float_16 = [ number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number ];

export type array_native_float_3 = [ number, number, number ];

export type pair_position_value = {
  position: array_native_float_3,
  value: number
};

export type array_native_float_4 = [ number, number, number, number ];

export interface vector_header_info_t extends ClassHandle {
  size(): number;
  get(_0: number): moorhen_header_info_t | undefined;
  push_back(_0: moorhen_header_info_t): void;
  resize(_0: number, _1: moorhen_header_info_t): void;
  set(_0: number, _1: moorhen_header_info_t): boolean;
}

export type h_bond_atom = {
  serial: number,
  x: number,
  y: number,
  z: number,
  charge: number,
  occ: number,
  b_iso: number,
  element: EmbindString,
  name: EmbindString,
  model: number,
  chain: EmbindString,
  res_no: number,
  residue_name: EmbindString,
  altLoc: EmbindString
};

export type h_bond = {
  hb_hydrogen: h_bond_atom,
  donor: h_bond_atom,
  acceptor: h_bond_atom,
  donor_neigh: h_bond_atom,
  acceptor_neigh: h_bond_atom,
  angle_1: number,
  angle_2: number,
  angle_3: number,
  dist: number,
  ligand_atom_is_donor: boolean,
  hydrogen_is_ligand_atom: boolean,
  bond_has_hydrogen_flag: boolean
};

export type ConKitValidateOptions = {
  seqfile: EmbindString,
  seqformat: EmbindString,
  model_file: EmbindString,
  pdb_file: EmbindString,
  pdb_chain: EmbindString,
  model_chain: EmbindString,
  output: EmbindString,
  overwrite: boolean,
  gap_opening_penalty: number,
  gap_extension_penalty: number,
  seq_separation_cutoff: number,
  n_iterations: number,
  use_gap_ss: boolean,
  gap_ss_w: number,
  use_prf: boolean,
  prf_w: number,
  map_align_silent: boolean,
  silent: boolean,
  renumber: boolean
};

export interface VectorFitLigandInfo_t extends ClassHandle {
  push_back(_0: fit_ligand_info_t): void;
  resize(_0: number, _1: fit_ligand_info_t): void;
  size(): number;
  get(_0: number): fit_ligand_info_t | undefined;
  set(_0: number, _1: fit_ligand_info_t): boolean;
}

export interface VectorAtomSpec_t extends ClassHandle {
  push_back(_0: atom_spec_t): void;
  resize(_0: number, _1: atom_spec_t): void;
  size(): number;
  get(_0: number): atom_spec_t | undefined;
  set(_0: number, _1: atom_spec_t): boolean;
}

export interface VectorAutoReadMtzInfo_t extends ClassHandle {
  push_back(_0: auto_read_mtz_info_t): void;
  resize(_0: number, _1: auto_read_mtz_info_t): void;
  size(): number;
  get(_0: number): auto_read_mtz_info_t | undefined;
  set(_0: number, _1: auto_read_mtz_info_t): boolean;
}

export interface VectorCootCartesianPair extends ClassHandle {
  push_back(_0: CartesianPair): void;
  resize(_0: number, _1: CartesianPair): void;
  size(): number;
  get(_0: number): CartesianPair | undefined;
  set(_0: number, _1: CartesianPair): boolean;
}

export interface VectorVectorCootCartesianPair extends ClassHandle {
  push_back(_0: VectorCootCartesianPair): void;
  resize(_0: number, _1: VectorCootCartesianPair): void;
  size(): number;
  get(_0: number): VectorCootCartesianPair | undefined;
  set(_0: number, _1: VectorCootCartesianPair): boolean;
}

export type generic_3d_lines_bonds_box_t = {
  line_segments: VectorVectorCootCartesianPair
};

export interface VectorCootCartesian extends ClassHandle {
  push_back(_0: Cartesian): void;
  resize(_0: number, _1: Cartesian): void;
  size(): number;
  get(_0: number): Cartesian | undefined;
  set(_0: number, _1: Cartesian): boolean;
}

export interface VectorVectorCootCartesian extends ClassHandle {
  push_back(_0: VectorCootCartesian): void;
  resize(_0: number, _1: VectorCootCartesian): void;
  size(): number;
  get(_0: number): VectorCootCartesian | undefined;
  set(_0: number, _1: VectorCootCartesian): boolean;
}

export interface MapStringVectorString extends ClassHandle {
  size(): number;
  get(_0: EmbindString): VectorString | undefined;
  set(_0: EmbindString, _1: VectorString): void;
  keys(): VectorString;
}

export interface MapIntFloat3 extends ClassHandle {
  size(): number;
  get(_0: number): array_native_float_3 | undefined;
  set(_0: number, _1: array_native_float_3): void;
  keys(): MoleculeIdVector;
}

export interface MapIntFloat4 extends ClassHandle {
  size(): number;
  get(_0: number): array_native_float_4 | undefined;
  set(_0: number, _1: array_native_float_4): void;
  keys(): MoleculeIdVector;
}

export interface Map_residue_spec_t_density_correlation_stats_info_t extends ClassHandle {
  size(): number;
  get(_0: residue_spec_t): density_correlation_stats_info_t | undefined;
  set(_0: residue_spec_t, _1: density_correlation_stats_info_t): void;
  keys(): Vectorresidue_spec_t;
}

export interface VectorArrayFloat16 extends ClassHandle {
  push_back(_0: array_native_float_16): void;
  resize(_0: number, _1: array_native_float_16): void;
  size(): number;
  get(_0: number): array_native_float_16 | undefined;
  set(_0: number, _1: array_native_float_16): boolean;
}

export interface VectorClipperCoordOrth_float_pair extends ClassHandle {
  size(): number;
  get(_0: number): pair_clipper_coord_orth_float | undefined;
  push_back(_0: pair_clipper_coord_orth_float): void;
  resize(_0: number, _1: pair_clipper_coord_orth_float): void;
  set(_0: number, _1: pair_clipper_coord_orth_float): boolean;
}

export interface VectorStringInt_pair extends ClassHandle {
  size(): number;
  get(_0: number): string_int_pair | undefined;
  push_back(_0: string_int_pair): void;
  resize(_0: number, _1: string_int_pair): void;
  set(_0: number, _1: string_int_pair): boolean;
}

export interface VectorInt_pair extends ClassHandle {
  size(): number;
  get(_0: number): int_int_pair | undefined;
  push_back(_0: int_int_pair): void;
  resize(_0: number, _1: int_int_pair): void;
  set(_0: number, _1: int_int_pair): boolean;
}

export interface VectorFloat_pair extends ClassHandle {
  size(): number;
  get(_0: number): float_float_pair | undefined;
  push_back(_0: float_float_pair): void;
  resize(_0: number, _1: float_float_pair): void;
  set(_0: number, _1: float_float_pair): boolean;
}

export interface VectorDouble_pair extends ClassHandle {
  size(): number;
  get(_0: number): double_double_pair | undefined;
  push_back(_0: double_double_pair): void;
  resize(_0: number, _1: double_double_pair): void;
  set(_0: number, _1: double_double_pair): boolean;
}

export interface VectorStringUInt_pair extends ClassHandle {
  size(): number;
  get(_0: number): string_uint_pair | undefined;
  push_back(_0: string_uint_pair): void;
  resize(_0: number, _1: string_uint_pair): void;
  set(_0: number, _1: string_uint_pair): boolean;
}

export interface Vectorsym_trans_t_Cell_Translation_pair extends ClassHandle {
  size(): number;
  get(_0: number): sym_trans_t_cell_translation_pair | undefined;
  push_back(_0: sym_trans_t_cell_translation_pair): void;
  resize(_0: number, _1: sym_trans_t_cell_translation_pair): void;
  set(_0: number, _1: sym_trans_t_cell_translation_pair): boolean;
}

export type symmetry_info_t = {
  cell: Coot_Cell,
  symm_trans: Vectorsym_trans_t_Cell_Translation_pair
};

export interface Vectorstring_string_pair extends ClassHandle {
  size(): number;
  get(_0: number): string_string_pair | undefined;
  push_back(_0: string_string_pair): void;
  resize(_0: number, _1: string_string_pair): void;
  set(_0: number, _1: string_string_pair): boolean;
}

export interface Vectormoorhen_hbond extends ClassHandle {
  size(): number;
  get(_0: number): moorhen_hbond | undefined;
  push_back(_0: moorhen_hbond): void;
  resize(_0: number, _1: moorhen_hbond): void;
  set(_0: number, _1: moorhen_hbond): boolean;
}

export interface Vectorinstanced_geometry_t extends ClassHandle {
  size(): number;
  get(_0: number): instanced_geometry_t | undefined;
  push_back(_0: instanced_geometry_t): void;
  resize(_0: number, _1: instanced_geometry_t): void;
  set(_0: number, _1: instanced_geometry_t): boolean;
}

export interface Vectormoved_residue_t extends ClassHandle {
  push_back(_0: moved_residue_t): void;
  resize(_0: number, _1: moved_residue_t): void;
  size(): number;
  get(_0: number): moved_residue_t | undefined;
  set(_0: number, _1: moved_residue_t): boolean;
}

export interface Vectormoved_atom_t extends ClassHandle {
  push_back(_0: moved_atom_t): void;
  resize(_0: number, _1: moved_atom_t): void;
  size(): number;
  get(_0: number): moved_atom_t | undefined;
  set(_0: number, _1: moved_atom_t): boolean;
}

export interface VectorString extends ClassHandle {
  push_back(_0: EmbindString): void;
  resize(_0: number, _1: EmbindString): void;
  size(): number;
  get(_0: number): EmbindString | undefined;
  set(_0: number, _1: EmbindString): boolean;
}

export interface VectorVectorString extends ClassHandle {
  push_back(_0: VectorString): void;
  resize(_0: number, _1: VectorString): void;
  size(): number;
  get(_0: number): VectorString | undefined;
  set(_0: number, _1: VectorString): boolean;
}

export interface VectorFloat extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface VectorDouble extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface VectorInt extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export type histogram_info_t = {
  base: number,
  bin_width: number,
  counts: VectorInt
};

export interface VectorChar extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface VectorValidationInformation extends ClassHandle {
  push_back(_0: validation_information_t): void;
  resize(_0: number, _1: validation_information_t): void;
  size(): number;
  get(_0: number): validation_information_t | undefined;
  set(_0: number, _1: validation_information_t): boolean;
}

export interface VectorResidueValidationInformationPair extends ClassHandle {
  size(): number;
  get(_0: number): residue_validation_information_pair | undefined;
  push_back(_0: residue_validation_information_pair): void;
  resize(_0: number, _1: residue_validation_information_pair): void;
  set(_0: number, _1: residue_validation_information_pair): boolean;
}

export interface VectorResidueIdentifier extends ClassHandle {
  push_back(_0: RamachandranInfo): void;
  resize(_0: number, _1: RamachandranInfo): void;
  size(): number;
  get(_0: number): RamachandranInfo | undefined;
  set(_0: number, _1: RamachandranInfo): boolean;
}

export interface VectorResiduePropertyInfo extends ClassHandle {
  push_back(_0: ResiduePropertyInfo): void;
  resize(_0: number, _1: ResiduePropertyInfo): void;
  size(): number;
  get(_0: number): ResiduePropertyInfo | undefined;
  set(_0: number, _1: ResiduePropertyInfo): boolean;
}

export interface Vectorchain_validation_information_t extends ClassHandle {
  size(): number;
  get(_0: number): chain_validation_information_t | undefined;
  push_back(_0: chain_validation_information_t): void;
  resize(_0: number, _1: chain_validation_information_t): void;
  set(_0: number, _1: chain_validation_information_t): boolean;
}

export interface Vectorresidue_validation_information_t extends ClassHandle {
  push_back(_0: residue_validation_information_t): void;
  resize(_0: number, _1: residue_validation_information_t): void;
  size(): number;
  get(_0: number): residue_validation_information_t | undefined;
  set(_0: number, _1: residue_validation_information_t): boolean;
}

export type chain_validation_information_t = {
  chain_id: EmbindString,
  rviv: Vectorresidue_validation_information_t
};

export interface Vectorsimple_rotamer extends ClassHandle {
  push_back(_0: simple_rotamer): void;
  resize(_0: number, _1: simple_rotamer): void;
  size(): number;
  get(_0: number): simple_rotamer | undefined;
  set(_0: number, _1: simple_rotamer): boolean;
}

export interface Vectorresidue_spec_t extends ClassHandle {
  push_back(_0: residue_spec_t): void;
  resize(_0: number, _1: residue_spec_t): void;
  size(): number;
  get(_0: number): residue_spec_t | undefined;
  set(_0: number, _1: residue_spec_t): boolean;
}

export interface Vectorvnc_veertex extends ClassHandle {
  size(): number;
  get(_0: number): vnc_vertex | undefined;
  push_back(_0: vnc_vertex): void;
  resize(_0: number, _1: vnc_vertex): void;
  set(_0: number, _1: vnc_vertex): boolean;
}

export interface Vectorvn_vertex extends ClassHandle {
  size(): number;
  get(_0: number): vn_vertex | undefined;
  push_back(_0: vn_vertex): void;
  resize(_0: number, _1: vn_vertex): void;
  set(_0: number, _1: vn_vertex): boolean;
}

export interface Vectorinteresting_place_t extends ClassHandle {
  push_back(_0: interesting_place_t): void;
  resize(_0: number, _1: interesting_place_t): void;
  size(): number;
  get(_0: number): interesting_place_t | undefined;
  set(_0: number, _1: interesting_place_t): boolean;
}

export interface Vectorg_triangle extends ClassHandle {
  size(): number;
  get(_0: number): g_triangle | undefined;
  push_back(_0: g_triangle): void;
  resize(_0: number, _1: g_triangle): void;
  set(_0: number, _1: g_triangle): boolean;
}

export type simple_mesh_t = {
  vertices: Vectorvnc_veertex,
  triangles: Vectorg_triangle,
  status: number,
  name: EmbindString
};

export type instanced_mesh_t = {
  geom: Vectorinstanced_geometry_t,
  markup: simple_mesh_t
};

export interface Vectorinstancing_data_type_A_t extends ClassHandle {
  size(): number;
  get(_0: number): instancing_data_type_A_t | undefined;
  push_back(_0: instancing_data_type_A_t): void;
  resize(_0: number, _1: instancing_data_type_A_t): void;
  set(_0: number, _1: instancing_data_type_A_t): boolean;
}

export interface Vectorinstancing_data_type_B_t extends ClassHandle {
  size(): number;
  get(_0: number): instancing_data_type_B_t | undefined;
  push_back(_0: instancing_data_type_B_t): void;
  resize(_0: number, _1: instancing_data_type_B_t): void;
  set(_0: number, _1: instancing_data_type_B_t): boolean;
}

export type instanced_geometry_t = {
  vertices: Vectorvn_vertex,
  triangles: Vectorg_triangle,
  instancing_data_A: Vectorinstancing_data_type_A_t,
  instancing_data_B: Vectorinstancing_data_type_B_t,
  name: EmbindString
};

export interface Vectorresidue_spec_t_string_pair extends ClassHandle {
  size(): number;
  get(_0: number): residue_spec_t_string_pair | undefined;
  push_back(_0: residue_spec_t_string_pair): void;
  resize(_0: number, _1: residue_spec_t_string_pair): void;
  set(_0: number, _1: residue_spec_t_string_pair): boolean;
}

export interface Vectormerge_molecule_results_info_t extends ClassHandle {
  push_back(_0: merge_molecule_results_info_t): void;
  resize(_0: number, _1: merge_molecule_results_info_t): void;
  size(): number;
  get(_0: number): merge_molecule_results_info_t | undefined;
  set(_0: number, _1: merge_molecule_results_info_t): boolean;
}

export interface Vectophi_psi_prob_t extends ClassHandle {
  push_back(_0: phi_psi_prob_t): void;
  resize(_0: number, _1: phi_psi_prob_t): void;
  size(): number;
  get(_0: number): phi_psi_prob_t | undefined;
  set(_0: number, _1: phi_psi_prob_t): boolean;
}

export interface Vectorh_bond extends ClassHandle {
  push_back(_0: h_bond): void;
  resize(_0: number, _1: h_bond): void;
  size(): number;
  get(_0: number): h_bond | undefined;
  set(_0: number, _1: h_bond): boolean;
}

export type sfcalc_genmap_stats_t = {
  r_factor: number,
  free_r_factor: number,
  bulk_solvent_volume: number,
  bulk_correction: number,
  n_splines: number
};

export type r_factor_stats = {
  r_factor: number,
  free_r_factor: number,
  rail_points_total: number,
  rail_points_new: number
};

export type pair_bool_float = {
  first: boolean,
  second: number
};

export type pair_double_vector_double = {
  first: number,
  second: VectorDouble
};

export type pair_clipper_coord_orth_float = {
  first: Coord_orth,
  second: number
};

export type int_vector_merge_molecule_results_info_t_pair = {
  first: number,
  second: Vectormerge_molecule_results_info_t
};

export type residue_spec_t_string_pair = {
  first: residue_spec_t,
  second: EmbindString
};

export type sym_trans_t_cell_translation_pair = {
  first: symm_trans_t,
  second: Cell_Translation
};

export type map_residue_spec_t_:density_correlation_stats_info_t_pair = {
  first: Map_residue_spec_t_density_correlation_stats_info_t,
  second: Map_residue_spec_t_density_correlation_stats_info_t
};

export type string_string_pair = {
  first: EmbindString,
  second: EmbindString
};

export type superpose_results_t = {
  superpose_info: EmbindString,
  alignment: string_string_pair,
  alignment_info_vec: VectorValidationInformation,
  aligned_pairs: VectorResidueValidationInformationPair
};

export type string_int_pair = {
  first: EmbindString,
  second: number
};

export type int_string_pair = {
  first: number,
  second: EmbindString
};

export type uint_int_pair = {
  first: number,
  second: number
};

export type int_uint_pair = {
  first: number,
  second: number
};

export type int_int_pair = {
  first: number,
  second: number
};

export type float_float_pair = {
  first: number,
  second: number
};

export type double_double_pair = {
  first: number,
  second: number
};

export type int_double_pair = {
  first: number,
  second: number
};

export type string_uint_pair = {
  first: EmbindString,
  second: number
};

export type symmetry_info_t_matrixVector_pair = {
  first: symmetry_info_t,
  second: VectorArrayFloat16
};

export type residue_validation_information_pair = {
  first: residue_validation_information_t,
  second: residue_validation_information_t
};

export type lsq_results_t = {
  rotation_matrix: VectorDouble,
  translation: VectorDouble
};

export interface helix_t extends ClassHandle {
  serNum: number;
  get helixID(): string;
  set helixID(value: EmbindString);
  get initResName(): string;
  set initResName(value: EmbindString);
  get initChainID(): string;
  set initChainID(value: EmbindString);
  initSeqNum: number;
  get initICode(): string;
  set initICode(value: EmbindString);
  get endResName(): string;
  set endResName(value: EmbindString);
  get endChainID(): string;
  set endChainID(value: EmbindString);
  endSeqNum: number;
  get endICode(): string;
  set endICode(value: EmbindString);
  helixClass: number;
  get comment(): string;
  set comment(value: EmbindString);
  length: number;
}

export interface vector_helix_t extends ClassHandle {
  push_back(_0: helix_t): void;
  resize(_0: number, _1: helix_t): void;
  size(): number;
  get(_0: number): helix_t | undefined;
  set(_0: number, _1: helix_t): boolean;
}

export type moorhen_header_info_t = {
  title: EmbindString,
  journal_lines: VectorString,
  author_lines: VectorString,
  compound_lines: VectorString,
  helix_info: vector_helix_t
};

export interface vector_pair_double_vector_double extends ClassHandle {
  push_back(_0: pair_double_vector_double): void;
  resize(_0: number, _1: pair_double_vector_double): void;
  size(): number;
  get(_0: number): pair_double_vector_double | undefined;
  set(_0: number, _1: pair_double_vector_double): boolean;
}

export type moorhen_hbond_atom = {
  serial: number,
  x: number,
  y: number,
  z: number,
  b_iso: number,
  occ: number,
  charge: number,
  element: EmbindString,
  name: EmbindString,
  model: number,
  chain: EmbindString,
  resNum: number,
  residueName: EmbindString,
  altLoc: EmbindString
};

export type moorhen_hbond = {
  hb_hydrogen: number,
  donor: moorhen_hbond_atom,
  acceptor: moorhen_hbond_atom,
  donor_neigh: moorhen_hbond_atom,
  acceptor_neigh: moorhen_hbond_atom,
  angle_1: number,
  angle_2: number,
  angle_3: number,
  dist: number,
  ligand_atom_is_donor: boolean,
  hydrogen_is_ligand_atom: boolean,
  bond_has_hydrogen_flag: boolean,
  donor: moorhen_hbond_atom,
  acceptor: moorhen_hbond_atom,
  donor_neigh: moorhen_hbond_atom,
  acceptor_neigh: moorhen_hbond_atom
};

export type int_instanced_mesh_pair = {
  first: number,
  second: instanced_mesh_t
};

export type CoordinateHeaderInfo = {
  title: EmbindString,
  author: MapStringVectorString,
  journal: MapStringVectorString,
  software: EmbindString,
  compound: EmbindString
};

export type array_float_3 = [ number, number, number ];

export type vn_vertex = {
  pos: array_float_3,
  normal: array_float_3
};

export type array_float_4 = [ number, number, number, number ];

export type instancing_data_type_A_t = {
  position: array_float_3,
  colour: array_float_4,
  size: array_float_3
};

export type vnc_vertex = {
  pos: array_float_3,
  normal: array_float_3,
  color: array_float_4
};

export type array_mat4 = [ array_float_4, array_float_4, array_float_4, array_float_4 ];

export type instancing_data_type_B_t = {
  position: array_float_3,
  colour: array_float_4,
  size: array_float_3,
  orientation: array_mat4
};

export type array_unsigned_int_3 = [ number, number, number ];

export type g_triangle = {
  point_id: array_unsigned_int_3
};

export interface coot_atom_overlaps_dots_container_t extends ClassHandle {
}

export interface coot_geometry_distortion_info_pod_container_t extends ClassHandle {
}

export interface Vector_coot_geometry_distortion_info_pod_container_t extends ClassHandle {
  push_back(_0: coot_geometry_distortion_info_pod_container_t): void;
  resize(_0: number, _1: coot_geometry_distortion_info_pod_container_t): void;
  size(): number;
  get(_0: number): coot_geometry_distortion_info_pod_container_t | undefined;
  set(_0: number, _1: coot_geometry_distortion_info_pod_container_t): boolean;
}

export interface Vector_coot_mutate_insertion_range_info_t extends ClassHandle {
  push_back(_0: mutate_insertion_range_info_t): void;
  resize(_0: number, _1: mutate_insertion_range_info_t): void;
  size(): number;
  get(_0: number): mutate_insertion_range_info_t | undefined;
  set(_0: number, _1: mutate_insertion_range_info_t): boolean;
}

export type pair_bool_Coord_orth = {
  first: boolean,
  second: Coord_orth
};

export interface api_cell_t extends ClassHandle {
}

export interface MapStringString_2 extends ClassHandle {
  size(): number;
  get(_0: EmbindString): EmbindString | undefined;
  set(_0: EmbindString, _1: EmbindString): void;
  keys(): VectorString;
}

export interface MapStringVectorSimpleRotamer extends ClassHandle {
  size(): number;
  get(_0: EmbindString): Vectorsimple_rotamer | undefined;
  set(_0: EmbindString, _1: Vectorsimple_rotamer): void;
  keys(): VectorString;
}

export interface HowToNameCopiedChainValue<T extends number> {
  value: T;
}
export type HowToNameCopiedChain = HowToNameCopiedChainValue<0>|HowToNameCopiedChainValue<1>|HowToNameCopiedChainValue<2>;

export interface complexdouble extends ClassHandle {
  real(): number;
  imag(): number;
}

export interface VectorGemmiSelection extends ClassHandle {
  size(): number;
  get(_0: number): Selection | undefined;
  push_back(_0: Selection): void;
  resize(_0: number, _1: Selection): void;
  set(_0: number, _1: Selection): boolean;
}

export interface VectorGemmiGridOp extends ClassHandle {
  size(): number;
  get(_0: number): GridOp | undefined;
  push_back(_0: GridOp): void;
  resize(_0: number, _1: GridOp): void;
  set(_0: number, _1: GridOp): boolean;
}

export interface VectorGemmiMtzDataset extends ClassHandle {
  size(): number;
  get(_0: number): MtzDataset | undefined;
  push_back(_0: MtzDataset): void;
  resize(_0: number, _1: MtzDataset): void;
  set(_0: number, _1: MtzDataset): boolean;
}

export interface VectorGemmiMtzColumn extends ClassHandle {
  size(): number;
  get(_0: number): MtzColumn | undefined;
  push_back(_0: MtzColumn): void;
  resize(_0: number, _1: MtzColumn): void;
  set(_0: number, _1: MtzColumn): boolean;
}

export interface VectorGemmiMtzBatch extends ClassHandle {
  size(): number;
  get(_0: number): MtzBatch | undefined;
  push_back(_0: MtzBatch): void;
  resize(_0: number, _1: MtzBatch): void;
  set(_0: number, _1: MtzBatch): boolean;
}

export interface VectorGemmiHklValueComplexFloat extends ClassHandle {
  size(): number;
  get(_0: number): HklValueComplexFloat | undefined;
  push_back(_0: HklValueComplexFloat): void;
  resize(_0: number, _1: HklValueComplexFloat): void;
  set(_0: number, _1: HklValueComplexFloat): boolean;
}

export interface VectorGemmiSmallStructureSite extends ClassHandle {
  size(): number;
  get(_0: number): SmallStructureSite | undefined;
  push_back(_0: SmallStructureSite): void;
  resize(_0: number, _1: SmallStructureSite): void;
  set(_0: number, _1: SmallStructureSite): boolean;
}

export interface VectorGemmiSmallStructureAtomType extends ClassHandle {
  size(): number;
  get(_0: number): SmallStructureAtomType | undefined;
  push_back(_0: SmallStructureAtomType): void;
  resize(_0: number, _1: SmallStructureAtomType): void;
  set(_0: number, _1: SmallStructureAtomType): boolean;
}

export interface VectorGemmiSelectionAtomInequality extends ClassHandle {
  size(): number;
  get(_0: number): SelectionAtomInequality | undefined;
  push_back(_0: SelectionAtomInequality): void;
  resize(_0: number, _1: SelectionAtomInequality): void;
  set(_0: number, _1: SelectionAtomInequality): boolean;
}

export interface VectorGemmiChemCompAliasing extends ClassHandle {
  size(): number;
  get(_0: number): ChemCompAliasing | undefined;
  push_back(_0: ChemCompAliasing): void;
  resize(_0: number, _1: ChemCompAliasing): void;
  set(_0: number, _1: ChemCompAliasing): boolean;
}

export interface VectorGemmiChemModAtomMod extends ClassHandle {
  size(): number;
  get(_0: number): AtomMod | undefined;
  push_back(_0: AtomMod): void;
  resize(_0: number, _1: AtomMod): void;
  set(_0: number, _1: AtomMod): boolean;
}

export interface VectorGemmiCifItem extends ClassHandle {
  size(): number;
  get(_0: number): cifItem | undefined;
  push_back(_0: cifItem): void;
  resize(_0: number, _1: cifItem): void;
  set(_0: number, _1: cifItem): boolean;
}

export interface VectorGemmiCifBlock extends ClassHandle {
  size(): number;
  get(_0: number): cifBlock | undefined;
  push_back(_0: cifBlock): void;
  resize(_0: number, _1: cifBlock): void;
  set(_0: number, _1: cifBlock): boolean;
}

export interface VectorGemmiRestraintsBond extends ClassHandle {
  size(): number;
  get(_0: number): Bond | undefined;
  push_back(_0: Bond): void;
  resize(_0: number, _1: Bond): void;
  set(_0: number, _1: Bond): boolean;
}

export interface VectorGemmiRestraintsAngle extends ClassHandle {
  size(): number;
  get(_0: number): Angle | undefined;
  push_back(_0: Angle): void;
  resize(_0: number, _1: Angle): void;
  set(_0: number, _1: Angle): boolean;
}

export interface VectorGemmiRestraintsTorsion extends ClassHandle {
  size(): number;
  get(_0: number): Torsion | undefined;
  push_back(_0: Torsion): void;
  resize(_0: number, _1: Torsion): void;
  set(_0: number, _1: Torsion): boolean;
}

export interface VectorGemmiRestraintsChirality extends ClassHandle {
  size(): number;
  get(_0: number): Chirality | undefined;
  push_back(_0: Chirality): void;
  resize(_0: number, _1: Chirality): void;
  set(_0: number, _1: Chirality): boolean;
}

export interface VectorGemmiRestraintsPlane extends ClassHandle {
  size(): number;
  get(_0: number): Plane | undefined;
  push_back(_0: Plane): void;
  resize(_0: number, _1: Plane): void;
  set(_0: number, _1: Plane): boolean;
}

export interface VectorGemmiRestraintsAtomId extends ClassHandle {
  size(): number;
  get(_0: number): AtomId | undefined;
  push_back(_0: AtomId): void;
  resize(_0: number, _1: AtomId): void;
  set(_0: number, _1: AtomId): boolean;
}

export interface VectorGemmiTlsGroupSelection extends ClassHandle {
  size(): number;
  get(_0: number): TlsGroupSelection | undefined;
  push_back(_0: TlsGroupSelection): void;
  resize(_0: number, _1: TlsGroupSelection): void;
  set(_0: number, _1: TlsGroupSelection): boolean;
}

export interface VectorGemmiTlsGroup extends ClassHandle {
  size(): number;
  get(_0: number): TlsGroup | undefined;
  push_back(_0: TlsGroup): void;
  resize(_0: number, _1: TlsGroup): void;
  set(_0: number, _1: TlsGroup): boolean;
}

export interface VectorGemmiRefinementInfoRestr extends ClassHandle {
  size(): number;
  get(_0: number): Restr | undefined;
  push_back(_0: Restr): void;
  resize(_0: number, _1: Restr): void;
  set(_0: number, _1: Restr): boolean;
}

export interface VectorGemmiDiffractionInfo extends ClassHandle {
  size(): number;
  get(_0: number): DiffractionInfo | undefined;
  push_back(_0: DiffractionInfo): void;
  resize(_0: number, _1: DiffractionInfo): void;
  set(_0: number, _1: DiffractionInfo): boolean;
}

export interface VectorGemmiReflectionsInfo extends ClassHandle {
  size(): number;
  get(_0: number): ReflectionsInfo | undefined;
  push_back(_0: ReflectionsInfo): void;
  resize(_0: number, _1: ReflectionsInfo): void;
  set(_0: number, _1: ReflectionsInfo): boolean;
}

export interface VectorGemmiBasicRefinementInfo extends ClassHandle {
  size(): number;
  get(_0: number): BasicRefinementInfo | undefined;
  push_back(_0: BasicRefinementInfo): void;
  resize(_0: number, _1: BasicRefinementInfo): void;
  set(_0: number, _1: BasicRefinementInfo): boolean;
}

export interface VectorGemmiExperimentInfo extends ClassHandle {
  size(): number;
  get(_0: number): ExperimentInfo | undefined;
  push_back(_0: ExperimentInfo): void;
  resize(_0: number, _1: ExperimentInfo): void;
  set(_0: number, _1: ExperimentInfo): boolean;
}

export interface VectorGemmiCrystalInfo extends ClassHandle {
  size(): number;
  get(_0: number): CrystalInfo | undefined;
  push_back(_0: CrystalInfo): void;
  resize(_0: number, _1: CrystalInfo): void;
  set(_0: number, _1: CrystalInfo): boolean;
}

export interface VectorGemmiRefinementInfo extends ClassHandle {
  size(): number;
  get(_0: number): RefinementInfo | undefined;
  push_back(_0: RefinementInfo): void;
  resize(_0: number, _1: RefinementInfo): void;
  set(_0: number, _1: RefinementInfo): boolean;
}

export interface VectorGemmiSoftwareItem extends ClassHandle {
  size(): number;
  get(_0: number): SoftwareItem | undefined;
  push_back(_0: SoftwareItem): void;
  resize(_0: number, _1: SoftwareItem): void;
  set(_0: number, _1: SoftwareItem): boolean;
}

export interface VectorGemmiAssemblyGen extends ClassHandle {
  size(): number;
  get(_0: number): AssemblyGen | undefined;
  push_back(_0: AssemblyGen): void;
  resize(_0: number, _1: AssemblyGen): void;
  set(_0: number, _1: AssemblyGen): boolean;
}

export interface VectorGemmiSheetStrand extends ClassHandle {
  size(): number;
  get(_0: number): Strand | undefined;
  push_back(_0: Strand): void;
  resize(_0: number, _1: Strand): void;
  set(_0: number, _1: Strand): boolean;
}

export interface VectorGemmiEntityDbRef extends ClassHandle {
  size(): number;
  get(_0: number): EntityDbRef | undefined;
  push_back(_0: EntityDbRef): void;
  resize(_0: number, _1: EntityDbRef): void;
  set(_0: number, _1: EntityDbRef): boolean;
}

export interface VectorGemmiAtom extends ClassHandle {
  size(): number;
  get(_0: number): GemmiAtom | undefined;
  push_back(_0: GemmiAtom): void;
  resize(_0: number, _1: GemmiAtom): void;
  set(_0: number, _1: GemmiAtom): boolean;
}

export interface VectorGemmiModel extends ClassHandle {
  size(): number;
  get(_0: number): Model | undefined;
  push_back(_0: Model): void;
  resize(_0: number, _1: Model): void;
  set(_0: number, _1: Model): boolean;
}

export interface VectorGemmiOp extends ClassHandle {
  size(): number;
  get(_0: number): Op | undefined;
  push_back(_0: Op): void;
  resize(_0: number, _1: Op): void;
  set(_0: number, _1: Op): boolean;
}

export interface VectorGemmiNcsOp extends ClassHandle {
  size(): number;
  get(_0: number): NcsOp | undefined;
  push_back(_0: NcsOp): void;
  resize(_0: number, _1: NcsOp): void;
  set(_0: number, _1: NcsOp): boolean;
}

export interface VectorGemmiEntity extends ClassHandle {
  size(): number;
  get(_0: number): Entity | undefined;
  push_back(_0: Entity): void;
  resize(_0: number, _1: Entity): void;
  set(_0: number, _1: Entity): boolean;
}

export interface VectorGemmiConnection extends ClassHandle {
  size(): number;
  get(_0: number): Connection | undefined;
  push_back(_0: Connection): void;
  resize(_0: number, _1: Connection): void;
  set(_0: number, _1: Connection): boolean;
}

export interface VectorGemmiHelix extends ClassHandle {
  size(): number;
  get(_0: number): Helix | undefined;
  push_back(_0: Helix): void;
  resize(_0: number, _1: Helix): void;
  set(_0: number, _1: Helix): boolean;
}

export interface VectorGemmiSheet extends ClassHandle {
  size(): number;
  get(_0: number): Sheet | undefined;
  push_back(_0: Sheet): void;
  resize(_0: number, _1: Sheet): void;
  set(_0: number, _1: Sheet): boolean;
}

export interface VectorGemmiAssembly extends ClassHandle {
  size(): number;
  get(_0: number): Assembly | undefined;
  push_back(_0: Assembly): void;
  resize(_0: number, _1: Assembly): void;
  set(_0: number, _1: Assembly): boolean;
}

export interface VectorGemmiChain extends ClassHandle {
  size(): number;
  get(_0: number): Chain | undefined;
  push_back(_0: Chain): void;
  resize(_0: number, _1: Chain): void;
  set(_0: number, _1: Chain): boolean;
}

export interface VectorGemmiResidue extends ClassHandle {
  size(): number;
  get(_0: number): GemmiResidue | undefined;
  push_back(_0: GemmiResidue): void;
  resize(_0: number, _1: GemmiResidue): void;
  set(_0: number, _1: GemmiResidue): boolean;
}

export interface VectorGemmiResidueSpan extends ClassHandle {
  size(): number;
  get(_0: number): ResidueSpan | undefined;
  push_back(_0: ResidueSpan): void;
  resize(_0: number, _1: ResidueSpan): void;
  set(_0: number, _1: ResidueSpan): boolean;
}

export interface VectorGemmiConstResidueSpan extends ClassHandle {
  size(): number;
  get(_0: number): ConstResidueSpan | undefined;
  push_back(_0: ConstResidueSpan): void;
  resize(_0: number, _1: ConstResidueSpan): void;
  set(_0: number, _1: ConstResidueSpan): boolean;
}

export interface CifStyleValue<T extends number> {
  value: T;
}
export type CifStyle = CifStyleValue<0>|CifStyleValue<1>|CifStyleValue<2>|CifStyleValue<3>|CifStyleValue<4>|CifStyleValue<5>;

export interface GridSizeRoundingValue<T extends number> {
  value: T;
}
export type GridSizeRounding = GridSizeRoundingValue<0>|GridSizeRoundingValue<1>|GridSizeRoundingValue<2>;

export interface AxisOrderValue<T extends number> {
  value: T;
}
export type AxisOrder = AxisOrderValue<0>|AxisOrderValue<1>|AxisOrderValue<2>;

export interface MapSetupValue<T extends number> {
  value: T;
}
export type MapSetup = MapSetupValue<0>|MapSetupValue<1>|MapSetupValue<2>;

export interface DataTypeValue<T extends number> {
  value: T;
}
export type DataType = DataTypeValue<0>|DataTypeValue<1>|DataTypeValue<2>|DataTypeValue<3>;

export interface ResidueInfoKindValue<T extends number> {
  value: T;
}
export type ResidueInfoKind = ResidueInfoKindValue<0>|ResidueInfoKindValue<1>|ResidueInfoKindValue<2>|ResidueInfoKindValue<3>|ResidueInfoKindValue<4>|ResidueInfoKindValue<5>|ResidueInfoKindValue<6>|ResidueInfoKindValue<7>|ResidueInfoKindValue<8>|ResidueInfoKindValue<9>|ResidueInfoKindValue<10>|ResidueInfoKindValue<11>;

export interface EnerLibRadiusTypeValue<T extends number> {
  value: T;
}
export type EnerLibRadiusType = EnerLibRadiusTypeValue<0>|EnerLibRadiusTypeValue<1>|EnerLibRadiusTypeValue<2>;

export interface CifItemTypeValue<T extends number> {
  value: T;
}
export type CifItemType = CifItemTypeValue<0>|CifItemTypeValue<1>|CifItemTypeValue<2>|CifItemTypeValue<3>|CifItemTypeValue<4>;

export interface ClassificationValue<T extends number> {
  value: T;
}
export type Classification = ClassificationValue<0>|ClassificationValue<1>|ClassificationValue<2>|ClassificationValue<3>|ClassificationValue<4>|ClassificationValue<5>|ClassificationValue<6>|ClassificationValue<7>|ClassificationValue<8>;

export interface DistanceOfValue<T extends number> {
  value: T;
}
export type DistanceOf = DistanceOfValue<0>|DistanceOfValue<1>;

export interface BondTypeValue<T extends number> {
  value: T;
}
export type BondType = BondTypeValue<0>|BondTypeValue<1>|BondTypeValue<2>|BondTypeValue<3>|BondTypeValue<4>|BondTypeValue<5>|BondTypeValue<6>;

export interface ChiralityTypeValue<T extends number> {
  value: T;
}
export type ChiralityType = ChiralityTypeValue<0>|ChiralityTypeValue<1>|ChiralityTypeValue<2>;

export interface ChemCompGroupValue<T extends number> {
  value: T;
}
export type ChemCompGroup = ChemCompGroupValue<0>|ChemCompGroupValue<1>|ChemCompGroupValue<2>|ChemCompGroupValue<3>|ChemCompGroupValue<4>|ChemCompGroupValue<5>|ChemCompGroupValue<6>|ChemCompGroupValue<7>|ChemCompGroupValue<8>|ChemCompGroupValue<9>|ChemCompGroupValue<10>;

export interface SpecialKindValue<T extends number> {
  value: T;
}
export type SpecialKind = SpecialKindValue<0>|SpecialKindValue<1>|SpecialKindValue<2>|SpecialKindValue<3>;

export interface ConnectionTypeValue<T extends number> {
  value: T;
}
export type ConnectionType = ConnectionTypeValue<0>|ConnectionTypeValue<1>|ConnectionTypeValue<2>|ConnectionTypeValue<3>|ConnectionTypeValue<4>;

export interface HelixClassValue<T extends number> {
  value: T;
}
export type HelixClass = HelixClassValue<0>|HelixClassValue<1>|HelixClassValue<2>|HelixClassValue<3>|HelixClassValue<4>|HelixClassValue<5>|HelixClassValue<6>|HelixClassValue<7>|HelixClassValue<8>|HelixClassValue<9>|HelixClassValue<10>;

export interface AsuValue<T extends number> {
  value: T;
}
export type Asu = AsuValue<0>|AsuValue<1>|AsuValue<2>;

export interface ElValue<T extends number> {
  value: T;
}
export type El = ElValue<0>|ElValue<2>|ElValue<3>|ElValue<4>|ElValue<5>|ElValue<6>|ElValue<7>|ElValue<8>|ElValue<9>|ElValue<10>|ElValue<11>|ElValue<12>|ElValue<13>|ElValue<14>|ElValue<15>|ElValue<16>|ElValue<17>|ElValue<18>|ElValue<19>|ElValue<20>|ElValue<21>|ElValue<22>|ElValue<23>|ElValue<24>|ElValue<25>|ElValue<26>|ElValue<27>|ElValue<28>|ElValue<29>|ElValue<30>|ElValue<31>|ElValue<32>|ElValue<33>|ElValue<34>|ElValue<35>|ElValue<36>|ElValue<37>|ElValue<38>|ElValue<39>|ElValue<40>|ElValue<41>|ElValue<42>|ElValue<43>|ElValue<44>|ElValue<45>|ElValue<46>|ElValue<47>|ElValue<48>|ElValue<49>|ElValue<50>|ElValue<51>|ElValue<52>|ElValue<53>|ElValue<54>|ElValue<55>|ElValue<56>|ElValue<57>|ElValue<58>|ElValue<59>|ElValue<60>|ElValue<61>|ElValue<62>|ElValue<63>|ElValue<64>|ElValue<65>|ElValue<66>|ElValue<67>|ElValue<68>|ElValue<69>|ElValue<70>|ElValue<71>|ElValue<72>|ElValue<73>|ElValue<74>|ElValue<75>|ElValue<76>|ElValue<77>|ElValue<78>|ElValue<79>|ElValue<80>|ElValue<81>|ElValue<82>|ElValue<83>|ElValue<84>|ElValue<85>|ElValue<86>|ElValue<87>|ElValue<88>|ElValue<89>|ElValue<90>|ElValue<91>|ElValue<92>|ElValue<93>|ElValue<94>|ElValue<95>|ElValue<96>|ElValue<97>|ElValue<98>|ElValue<99>|ElValue<100>|ElValue<101>|ElValue<102>|ElValue<103>|ElValue<104>|ElValue<105>|ElValue<106>|ElValue<107>|ElValue<108>|ElValue<109>|ElValue<110>|ElValue<111>|ElValue<112>|ElValue<113>|ElValue<114>|ElValue<115>|ElValue<116>|ElValue<117>|ElValue<118>|ElValue<119>|ElValue<120>;

export interface PolymerTypeValue<T extends number> {
  value: T;
}
export type PolymerType = PolymerTypeValue<0>|PolymerTypeValue<1>|PolymerTypeValue<2>|PolymerTypeValue<3>|PolymerTypeValue<4>|PolymerTypeValue<5>|PolymerTypeValue<6>|PolymerTypeValue<7>|PolymerTypeValue<8>|PolymerTypeValue<9>|PolymerTypeValue<10>;

export interface PointGroupValue<T extends number> {
  value: T;
}
export type PointGroup = PointGroupValue<0>|PointGroupValue<1>|PointGroupValue<2>|PointGroupValue<3>|PointGroupValue<4>|PointGroupValue<5>|PointGroupValue<6>|PointGroupValue<7>|PointGroupValue<8>|PointGroupValue<9>|PointGroupValue<10>|PointGroupValue<11>|PointGroupValue<12>|PointGroupValue<13>|PointGroupValue<14>|PointGroupValue<15>|PointGroupValue<16>|PointGroupValue<17>|PointGroupValue<18>|PointGroupValue<19>|PointGroupValue<20>|PointGroupValue<21>|PointGroupValue<22>|PointGroupValue<23>|PointGroupValue<24>|PointGroupValue<25>|PointGroupValue<26>|PointGroupValue<27>|PointGroupValue<28>|PointGroupValue<29>|PointGroupValue<30>|PointGroupValue<31>;

export interface LaueValue<T extends number> {
  value: T;
}
export type Laue = LaueValue<0>|LaueValue<1>|LaueValue<2>|LaueValue<3>|LaueValue<4>|LaueValue<5>|LaueValue<6>|LaueValue<7>|LaueValue<8>|LaueValue<9>|LaueValue<10>;

export interface EntityTypeValue<T extends number> {
  value: T;
}
export type EntityType = EntityTypeValue<0>|EntityTypeValue<1>|EntityTypeValue<2>|EntityTypeValue<3>|EntityTypeValue<4>;

export interface CalcFlagValue<T extends number> {
  value: T;
}
export type CalcFlag = CalcFlagValue<0>|CalcFlagValue<2>|CalcFlagValue<3>|CalcFlagValue<4>;

export interface CoorFormatValue<T extends number> {
  value: T;
}
export type CoorFormat = CoorFormatValue<0>|CoorFormatValue<1>|CoorFormatValue<2>|CoorFormatValue<3>|CoorFormatValue<4>|CoorFormatValue<5>;

export interface SpanConstResidue extends ClassHandle {
  size(): number;
  empty(): boolean;
  children(): SpanConstResidue;
  front(): GemmiResidue;
  back(): GemmiResidue;
  at(_0: number): GemmiResidue;
}

export interface SpanResidue extends ClassHandle {
  size(): number;
  set_size(_0: number): void;
  empty(): boolean;
  children(): SpanResidue;
  front(): GemmiResidue;
  back(): GemmiResidue;
  at(_0: number): GemmiResidue;
}

export interface MutableVectorSpanResidue extends SpanResidue {
  is_beginning(): boolean;
  is_ending(): boolean;
}

export interface UnitCellParameters extends ClassHandle {
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface UnitCell extends UnitCellParameters {
  volume: number;
  ar: number;
  br: number;
  cr: number;
  cos_alphar: number;
  cos_betar: number;
  cos_gammar: number;
  explicit_matrices: boolean;
  cs_count: number;
  orth: Transform;
  frac: Transform;
  images: VectorGemmiFTransform;
  is_crystal(): boolean;
  approx(_0: UnitCell, _1: number): boolean;
  is_similar(_0: UnitCell, _1: number, _2: number): boolean;
  calculate_properties(): void;
  cos_alpha(): number;
  set(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): void;
  add_ncs_images_to_cs_images(_0: VectorGemmiNcsOp): void;
  volume_per_image(): number;
  calculate_1_d2_double(_0: number, _1: number, _2: number): number;
  reciprocal(): UnitCell;
  calculate_matrix_B(): Mat33;
  primitive_orth_matrix(_0: number): Mat33;
  calculate_u_eq(_0: SMat33double): number;
  metric_tensor(): SMat33double;
  reciprocal_metric_tensor(): SMat33double;
  set_from_vectors(_0: GemmiVec3, _1: GemmiVec3, _2: GemmiVec3): void;
  distance_sq_frac(_0: Fractional, _1: Fractional): number;
  apply_transform(_0: Fractional, _1: number, _2: boolean): void;
  is_special_position_frac(_0: Fractional, _1: number): number;
  orthogonalize(_0: Fractional): Position;
  fractionalize(_0: Position): Fractional;
  orthogonalize_difference(_0: Fractional): Position;
  fractionalize_difference(_0: Position): Fractional;
  distance_sq_pos(_0: Position, _1: Position): number;
  orthogonalize_in_pbc(_0: Position, _1: Fractional): Position;
  find_nearest_pbc_position(_0: Position, _1: Position, _2: number, _3: boolean): Position;
  is_special_position_pos(_0: Position, _1: number): number;
  is_compatible_with_spacegroup(_0: SpaceGroup | null, _1: number): boolean;
  set_cell_images_from_spacegroup(_0: SpaceGroup | null): void;
  set_matrices_from_fract(_0: Transform): void;
  changed_basis_backward(_0: Op, _1: boolean): UnitCell;
  changed_basis_forward(_0: Op, _1: boolean): UnitCell;
  op_as_transform(_0: Op): Transform;
  is_compatible_with_groupops(_0: GroupOps, _1: number): boolean;
  search_pbc_images(_0: Fractional, _1: NearestImage): boolean;
  find_nearest_image(_0: Position, _1: Position, _2: Asu): NearestImage;
  find_nearest_pbc_image_frac(_0: Fractional, _1: Fractional, _2: number): NearestImage;
  find_nearest_pbc_image_pos(_0: Position, _1: Position, _2: number): NearestImage;
  calculate_1_d2(_0: array_int_3): number;
  calculate_d(_0: array_int_3): number;
  calculate_stol_sq(_0: array_int_3): number;
  get_hkl_limits(_0: number): array_int_3;
  get_ncs_transforms(): VectorGemmiFTransform;
}

export interface Model extends ClassHandle {
  num: number;
  name: number;
  chains: VectorGemmiChain;
  remove_chain(_0: EmbindString): void;
  merge_chain_parts(_0: number): void;
  subchains(): VectorGemmiResidueSpan;
  subchains(): VectorGemmiConstResidueSpan;
  get_all_residue_names(): VectorString;
  empty_copy(): Model;
  children(): VectorGemmiChain;
  children_const(): VectorGemmiChain;
  get_subchain_const(_0: EmbindString): ConstResidueSpan;
  get_subchain(_0: EmbindString): ResidueSpan;
  find_residue_group(_0: EmbindString, _1: SeqId): ResidueGroup;
  sole_residue(_0: EmbindString, _1: SeqId): GemmiResidue;
  find_cra(_0: AtomAddress, _1: boolean): CRA;
  find_cra_const(_0: AtomAddress, _1: boolean): const_CRA;
}

export interface Chain extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  residues: VectorGemmiResidue;
  readonly empty_copy: Chain;
  subchains_const(): VectorGemmiConstResidueSpan;
  children_const(): VectorGemmiResidue;
  subchains(): VectorGemmiResidueSpan;
  children(): VectorGemmiResidue;
  whole_const(): ConstResidueSpan;
  get_polymer_const(): ConstResidueSpan;
  get_ligands_const(): ConstResidueSpan;
  get_waters_const(): ConstResidueSpan;
  get_subchain_const(_0: EmbindString): ConstResidueSpan;
  whole(): ResidueSpan;
  get_polymer(): ResidueSpan;
  get_ligands(): ResidueSpan;
  get_waters(): ResidueSpan;
  get_subchain(_0: EmbindString): ResidueSpan;
  find_residue_group_const(_0: SeqId): ConstResidueGroup;
  find_residue_group(_0: SeqId): ResidueGroup;
  is_first_in_group(_0: GemmiResidue): boolean;
}

export interface ConstResidueSpan extends SpanConstResidue {
  length(): number;
  subchain_id(): string;
  extract_sequence(): VectorString;
  extreme_num(_0: boolean, _1: number): OptionalNum;
  find_residue_group(_0: SeqId): ConstResidueGroup;
  label_seq_id_to_auth(_0: OptionalNum): SeqId;
  auth_seq_id_to_label(_0: SeqId): OptionalNum;
}

export interface ResidueSpan extends MutableVectorSpanResidue {
  length(): number;
  subchain_id(): string;
  extreme_num(_0: boolean, _1: number): OptionalNum;
  find_residue_group(_0: SeqId): ResidueGroup;
  find_residue_group_const(_0: SeqId): ConstResidueGroup;
  label_seq_id_to_auth(_0: OptionalNum): SeqId;
  auth_seq_id_to_label(_0: SeqId): OptionalNum;
}

export interface ConstResidueGroup extends ConstResidueSpan {
  by_resname(_0: EmbindString): GemmiResidue;
}

export interface ResidueGroup extends ClassHandle {
  remove_residue(_0: EmbindString): void;
  by_resname(_0: EmbindString): GemmiResidue;
}

export interface OptionalNum extends ClassHandle {
  value: number;
  has_value(): boolean;
  str(_0: number): string;
}

export interface SeqId extends ClassHandle {
  num: OptionalNum;
  icode: number;
  has_icode(): number;
  str(): string;
}

export interface ResidueId extends ClassHandle {
  seqid: SeqId;
  get segment(): string;
  set segment(value: EmbindString);
  get name(): string;
  set name(value: EmbindString);
  group_key(): SeqId;
  matches(_0: ResidueId): boolean;
  matches_noseg(_0: ResidueId): boolean;
}

export interface GemmiResidue extends ResidueId {
  get subchain(): string;
  set subchain(value: EmbindString);
  get entity_id(): string;
  set entity_id(value: EmbindString);
  label_seq: OptionalNum;
  entity_type: EntityType;
  het_flag: number;
  flag: number;
  atoms: VectorGemmiAtom;
  sifts_unp: SiftsUnpResidue;
  empty_copy(): GemmiResidue;
  children(): VectorGemmiAtom;
  children_const(): VectorGemmiAtom;
  same_conformer(_0: GemmiResidue): boolean;
  is_water(): boolean;
  sole_atom(_0: EmbindString): GemmiAtom;
  get(_0: EmbindString): AtomGroup;
}

export interface GemmiAtom extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  altloc: number;
  charge: number;
  calc_flag: CalcFlag;
  flag: number;
  tls_group_id: number;
  serial: number;
  occ: number;
  b_iso: number;
  element: Element;
  aniso: SMat33float;
  pos: Position;
  altloc_or(_0: number): number;
  altloc_matches(_0: number): boolean;
  group_key(): string;
  has_altloc(): boolean;
  b_eq(): number;
  is_hydrogen(): boolean;
  padded_name(): string;
  empty_copy(): GemmiAtom;
}

export interface Element extends ClassHandle {
  elem: El;
  ordinal(): number;
  atomic_number(): number;
  is_hydrogen(): boolean;
  weight(): number;
  covalent_r(): number;
  vdw_r(): number;
  is_metal(): boolean;
  name(): string;
  uname(): string;
}

export interface Mat33 extends ClassHandle {
  multiplyMat33(_0: Mat33): Mat33;
  transpose(): Mat33;
  trace(): number;
  approx(_0: Mat33, _1: number): boolean;
  determinant(): number;
  inverse(): Mat33;
  is_identity(): boolean;
  column_dot(_0: number, _1: number): number;
  row_copy(_0: number): GemmiVec3;
  column_copy(_0: number): GemmiVec3;
  multiplyVec3(_0: GemmiVec3): GemmiVec3;
  left_multiply(_0: GemmiVec3): GemmiVec3;
  multiply_by_diagonal(_0: GemmiVec3): Mat33;
  as_array(): array_native_double_9;
}

export interface SMat33double extends ClassHandle {
  as_mat33(): Mat33;
  trace(): number;
  all_zero(): boolean;
  added_kI(_0: number): SMat33double;
  determinant(): number;
  inverse(): SMat33double;
  multiply(_0: GemmiVec3): GemmiVec3;
  calculate_eigenvalues(): array_double_3;
}

export interface SMat33float extends ClassHandle {
  as_mat33(): Mat33;
  trace(): number;
  all_zero(): boolean;
  added_kI(_0: number): SMat33float;
  determinant(): number;
  inverse(): SMat33float;
  multiply(_0: GemmiVec3): GemmiVec3;
  calculate_eigenvalues(): array_double_3;
}

export interface GemmiVec3 extends ClassHandle {
  x: number;
  y: number;
  z: number;
  at(_0: number): number;
  negated(): GemmiVec3;
  dot(_0: GemmiVec3): number;
  cross(_0: GemmiVec3): GemmiVec3;
  length_sq(): number;
  length(): number;
  changed_magnitude(_0: number): GemmiVec3;
  normalized(): GemmiVec3;
  dist_sq(_0: GemmiVec3): number;
  dist(_0: GemmiVec3): number;
  cos_angle(_0: GemmiVec3): number;
  angle(_0: GemmiVec3): number;
  approx(_0: GemmiVec3, _1: number): boolean;
  has_nan(): boolean;
}

export interface Fractional extends GemmiVec3 {
  wrap_to_unit(): Fractional;
  wrap_to_zero(): Fractional;
  round(): Fractional;
  move_toward_zero_by_one(): void;
}

export interface Position extends GemmiVec3 {
}

export interface NeighborSearch extends ClassHandle {
  radius_specified: number;
  include_h: boolean;
  add_chain(_0: Chain, _1: boolean): void;
  dist(_0: Position, _1: Position): number;
  populate(_0: boolean): NeighborSearch;
}

export interface Mark extends ClassHandle {
  altloc: number;
  element: Element;
  image_idx: number;
  chain_idx: number;
  residue_idx: number;
  atom_idx: number;
}

export interface EntityDbRef extends ClassHandle {
  get db_name(): string;
  set db_name(value: EmbindString);
  get accession_code(): string;
  set accession_code(value: EmbindString);
  get id_code(): string;
  set id_code(value: EmbindString);
  get isoform(): string;
  set isoform(value: EmbindString);
  seq_begin: SeqId;
  seq_end: SeqId;
  db_begin: SeqId;
  db_end: SeqId;
  label_seq_begin: OptionalNum;
  label_seq_end: OptionalNum;
}

export interface Entity extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  subchains: VectorString;
  entity_type: EntityType;
  polymer_type: PolymerType;
  sifts_unp_acc: VectorString;
  full_sequence: VectorString;
  dbrefs: VectorGemmiEntityDbRef;
}

export interface ItemGroupAtom extends ClassHandle {
  size(): number;
  extent(): number;
  empty(): boolean;
  front(): GemmiAtom;
  front_const(): GemmiAtom;
  back(): GemmiAtom;
  back_const(): GemmiAtom;
}

export interface AtomGroup extends ItemGroupAtom {
  name(): string;
  by_altloc(_0: number): GemmiAtom;
}

export interface SpaceGroup extends ClassHandle {
  number: number;
  ccp4: number;
  ext: number;
  basisop_idx: number;
  xhm(): string;
  centring_type(): number;
  ccp4_lattice_type(): number;
  short_name(): string;
  pdb_name(): string;
  is_sohncke(): boolean;
  is_enantiomorphic(): boolean;
  is_symmorphic(): boolean;
  is_centrosymmetric(): boolean;
  point_group(): PointGroup;
  laue_class(): Laue;
  hm(): string;
  hall(): string;
  qualifier(): string;
  basisop(): Op;
  centred_to_primitive(): Op;
  operations(): GroupOps;
}

export interface Transform extends ClassHandle {
  mat: Mat33;
  vec: GemmiVec3;
  inverse(): Transform;
  apply(_0: GemmiVec3): GemmiVec3;
  combine(_0: Transform): Transform;
  is_identity(): boolean;
  set_identity(): void;
  approx(_0: Transform, _1: number): boolean;
}

export interface FTransform extends Transform {
  apply(_0: Fractional): Fractional;
}

export interface Op extends ClassHandle {
  tran: array_int_3;
  rot: array_array_int_3_3;
  triplet(_0: number): string;
  inverse(): Op;
  wrap(): Op;
  det_rot(): number;
  rot_type(): number;
  combine(_0: Op): Op;
  translate(_0: array_int_3): Op;
  translated(_0: array_int_3): Op;
  add_centering(_0: array_int_3): Op;
  apply_to_hkl_without_division(_0: array_int_3): array_int_3;
  apply_to_hkl(_0: array_int_3): array_int_3;
  phase_shift(_0: array_int_3): number;
  apply_to_xyz(_0: array_double_3): array_double_3;
  negated_rot(): array_array_int_3_3;
  transposed_rot(): array_array_int_3_3;
  int_seitz(): array_array_int_4_4;
  float_seitz(): array_array_double_4_4;
}

export interface GroupOps extends ClassHandle {
  sym_ops: VectorGemmiOp;
  order(): number;
  add_missing_elements(): void;
  add_missing_elements_part2(_0: VectorGemmiOp, _1: number, _2: boolean): void;
  add_inversion(): boolean;
  find_centering(): number;
  is_centrosymmetric(): boolean;
  change_basis_impl(_0: Op, _1: Op): void;
  change_basis_forward(_0: Op): void;
  change_basis_backward(_0: Op): void;
  all_ops_sorted(): VectorGemmiOp;
  get_op(_0: number): Op;
  is_same_as(_0: GroupOps): boolean;
  has_same_centring(_0: GroupOps): boolean;
  has_same_rotations(_0: GroupOps): boolean;
  are_directions_symmetry_related(_0: number, _1: number): boolean;
  derive_symmorphic(): GroupOps;
  is_reflection_centric(_0: array_int_3): boolean;
  epsilon_factor(_0: array_int_3): number;
  epsilon_factor_without_centering(_0: array_int_3): number;
  is_systematically_absent(_0: array_int_3): boolean;
  find_grid_factors(): array_int_3;
}

export interface Helix extends ClassHandle {
  pdb_helix_class: HelixClass;
  length: number;
  start: AtomAddress;
  end: AtomAddress;
  set_helix_class_as_int(_0: number): void;
}

export interface Strand extends ClassHandle {
  sense: number;
  get name(): string;
  set name(value: EmbindString);
  start: AtomAddress;
  end: AtomAddress;
  hbond_atom2: AtomAddress;
  hbond_atom1: AtomAddress;
}

export interface Sheet extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  strands: VectorGemmiSheetStrand;
}

export interface Connection extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  get link_id(): string;
  set link_id(value: EmbindString);
  type: ConnectionType;
  asu: Asu;
  reported_distance: number;
  partner1: AtomAddress;
  partner2: AtomAddress;
}

export interface AtomAddress extends ClassHandle {
  get chain_name(): string;
  set chain_name(value: EmbindString);
  res_id: ResidueId;
  get atom_name(): string;
  set atom_name(value: EmbindString);
  altloc: number;
  str(): string;
}

export interface AssemblyOperator extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  get type(): string;
  set type(value: EmbindString);
  transform: Transform;
}

export interface VectorAssemblyOperator extends ClassHandle {
  push_back(_0: AssemblyOperator): void;
  resize(_0: number, _1: AssemblyOperator): void;
  size(): number;
  get(_0: number): AssemblyOperator | undefined;
  set(_0: number, _1: AssemblyOperator): boolean;
}

export interface AssemblyGen extends ClassHandle {
  chains: VectorString;
  subchains: VectorString;
  operators: VectorAssemblyOperator;
}

export interface Assembly extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  author_determined: boolean;
  software_determined: boolean;
  special_kind: SpecialKind;
  oligomeric_count: number;
  get oligomeric_details(): string;
  set oligomeric_details(value: EmbindString);
  get software_name(): string;
  set software_name(value: EmbindString);
  absa: number;
  ssa: number;
  more: number;
  generators: VectorGemmiAssemblyGen;
}

export interface NcsOp extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  given: boolean;
  tr: Transform;
  apply(_0: Position): Position;
}

export interface Metadata extends ClassHandle {
  authors: VectorString;
  experiments: VectorGemmiExperimentInfo;
  crystals: VectorGemmiCrystalInfo;
  refinement: VectorGemmiRefinementInfo;
  software: VectorGemmiSoftwareItem;
  get solved_by(): string;
  set solved_by(value: EmbindString);
  get starting_model(): string;
  set starting_model(value: EmbindString);
  get remark_300_detail(): string;
  set remark_300_detail(value: EmbindString);
  has_restr(): boolean;
  has_tls(): boolean;
}

export interface SoftwareItem extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  get version(): string;
  set version(value: EmbindString);
  get date(): string;
  set date(value: EmbindString);
  classification: Classification;
}

export interface ExperimentInfo extends ClassHandle {
  get method(): string;
  set method(value: EmbindString);
  number_of_crystals: number;
  unique_reflections: number;
  b_wilson: number;
  shells: VectorGemmiReflectionsInfo;
  diffraction_ids: VectorString;
  reflections: ReflectionsInfo;
}

export interface DiffractionInfo extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  temperature: number;
  get source(): string;
  set source(value: EmbindString);
  get source_type(): string;
  set source_type(value: EmbindString);
  get synchrotron(): string;
  set synchrotron(value: EmbindString);
  get beamline(): string;
  set beamline(value: EmbindString);
  get wavelengths(): string;
  set wavelengths(value: EmbindString);
  get scattering_type(): string;
  set scattering_type(value: EmbindString);
  mono_or_laue: number;
  get monochromator(): string;
  set monochromator(value: EmbindString);
  get collection_date(): string;
  set collection_date(value: EmbindString);
  get optics(): string;
  set optics(value: EmbindString);
  get detector(): string;
  set detector(value: EmbindString);
  get detector_make(): string;
  set detector_make(value: EmbindString);
}

export interface ReflectionsInfo extends ClassHandle {
  resolution_high: number;
  resolution_low: number;
  completeness: number;
  redundancy: number;
  r_merge: number;
  r_sym: number;
  mean_I_over_sigma: number;
}

export interface CrystalInfo extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  get description(): string;
  set description(value: EmbindString);
  ph: number;
  get ph_range(): string;
  set ph_range(value: EmbindString);
  diffractions: VectorGemmiDiffractionInfo;
}

export interface BasicRefinementInfo extends ClassHandle {
  resolution_high: number;
  resolution_low: number;
  completeness: number;
  reflection_count: number;
  rfree_set_count: number;
  r_all: number;
  r_work: number;
  r_free: number;
  cc_fo_fc_work: number;
  cc_fo_fc_free: number;
}

export interface TlsGroupSelection extends ClassHandle {
  get chain(): string;
  set chain(value: EmbindString);
  res_begin: SeqId;
  res_end: SeqId;
  get details(): string;
  set details(value: EmbindString);
}

export interface TlsGroup extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  selections: VectorGemmiTlsGroupSelection;
  origin: Position;
  T: SMat33double;
  L: SMat33double;
  S: Mat33;
}

export interface Restr extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  count: number;
  weight: number;
  get function(): string;
  set function(value: EmbindString);
  dev_ideal: number;
}

export interface RefinementInfo extends BasicRefinementInfo {
  get id(): string;
  set id(value: EmbindString);
  get cross_validation_method(): string;
  set cross_validation_method(value: EmbindString);
  get rfree_selection_method(): string;
  set rfree_selection_method(value: EmbindString);
  bin_count: number;
  bins: VectorGemmiBasicRefinementInfo;
  mean_b: number;
  aniso_b: SMat33double;
  luzzati_error: number;
  dpi_blow_r: number;
  dpi_blow_rfree: number;
  dpi_cruickshank_r: number;
  dpi_cruickshank_rfree: number;
  restr_stats: VectorGemmiRefinementInfoRestr;
  tls_groups: VectorGemmiTlsGroup;
  get remarks(): string;
  set remarks(value: EmbindString);
}

export interface Structure extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  get spacegroup_hm(): string;
  set spacegroup_hm(value: EmbindString);
  has_origx: boolean;
  models: VectorGemmiModel;
  ncs: VectorGemmiNcsOp;
  entities: VectorGemmiEntity;
  connections: VectorGemmiConnection;
  helices: VectorGemmiHelix;
  sheets: VectorGemmiSheet;
  assemblies: VectorGemmiAssembly;
  cell: UnitCell;
  meta: Metadata;
  origx: Transform;
  resolution: number;
  raw_remarks: VectorString;
  input_format: CoorFormat;
  get_info(_0: EmbindString): string;
  renumber_models(): void;
  ncs_given_count(): number;
  get_ncs_multiplier(): number;
  ncs_not_expanded(): boolean;
  merge_chain_parts(_0: number): void;
  remove_empty_chains(): void;
  empty_copy(): Structure;
  setup_cell_images(): void;
  first_model(): Model;
  as_string(): string;
}

export interface NearestImage extends ClassHandle {
  dist_sq: number;
  sym_idx: number;
  dist(): number;
  same_asu(): boolean;
  symmetry_code(_0: boolean): string;
}

export interface SiftsUnpResidue extends ClassHandle {
  res: number;
  acc_index: number;
  num: number;
}

export interface Side extends ClassHandle {
  get comp(): string;
  set comp(value: EmbindString);
  get mod(): string;
  set mod(value: EmbindString);
  group: ChemCompGroup;
  matches_group(_0: ChemCompGroup): boolean;
  specificity(): number;
}

export interface ChemLink extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  get name(): string;
  set name(value: EmbindString);
  side1: Side;
  side2: Side;
  rt: Restraints;
  block: cifBlock;
}

export interface Plane extends ClassHandle {
  get label(): string;
  set label(value: EmbindString);
  ids: VectorGemmiRestraintsAtomId;
  esd: number;
  str(): string;
}

export interface Chirality extends ClassHandle {
  sign: ChiralityType;
  id_ctr: AtomId;
  id1: AtomId;
  id2: AtomId;
  id3: AtomId;
  is_wrong(_0: number): boolean;
  str(): string;
  str(): string;
}

export interface Torsion extends ClassHandle {
  value: number;
  esd: number;
  period: number;
  id1: AtomId;
  id2: AtomId;
  id3: AtomId;
  id4: AtomId;
}

export interface Angle extends ClassHandle {
  id1: AtomId;
  id2: AtomId;
  id3: AtomId;
  radians(): number;
  str(): string;
}

export interface Bond extends ClassHandle {
  type: BondType;
  aromatic: boolean;
  value: number;
  esd: number;
  value_nucleus: number;
  esd_nucleus: number;
  id1: AtomId;
  id2: AtomId;
  str(): string;
  lexicographic_str(): string;
  distance(_0: DistanceOf): number;
}

export interface AtomId extends ClassHandle {
  comp: number;
  get atom(): string;
  set atom(value: EmbindString);
}

export interface Restraints extends ClassHandle {
  bonds: VectorGemmiRestraintsBond;
  angles: VectorGemmiRestraintsAngle;
  torsions: VectorGemmiRestraintsTorsion;
  chirs: VectorGemmiRestraintsChirality;
  planes: VectorGemmiRestraintsPlane;
  empty(): boolean;
  find_shortest_path(_0: AtomId, _1: AtomId, _2: VectorGemmiRestraintsAtomId): VectorGemmiRestraintsAtomId;
  chiral_abs_volume(_0: Chirality): number;
  get_or_add_plane(_0: EmbindString): Plane;
  rename_atom(_0: AtomId, _1: EmbindString): void;
}

export interface cifBlock extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  items: VectorGemmiCifItem;
  swap(_0: cifBlock): void;
  has_tag(_0: EmbindString): boolean;
  has_any_value(_0: EmbindString): boolean;
  get_index(_0: EmbindString): number;
  set_pair(_0: EmbindString, _1: EmbindString): void;
  move_item(_0: number, _1: number): void;
  get_mmcif_category_names(): VectorString;
  has_mmcif_category(_0: EmbindString): boolean;
  find_values(_0: EmbindString): cifColumn;
  find_loop(_0: EmbindString): cifColumn;
  find_with_prefix(_0: EmbindString, _1: VectorString): cifTable;
  find(_0: VectorString): cifTable;
  find_any(_0: EmbindString, _1: VectorString): cifTable;
  find_or_add(_0: EmbindString, _1: VectorString): cifTable;
  find_mmcif_category(_0: EmbindString): cifTable;
  init_loop(_0: EmbindString, _1: VectorString): cifLoop;
  init_mmcif_loop(_0: EmbindString, _1: VectorString): cifLoop;
}

export interface WriteOptions extends ClassHandle {
  prefer_pairs: boolean;
  compact: boolean;
  misuse_hash: boolean;
  align_pairs: number;
  align_loops: number;
}

export interface cifDocument extends ClassHandle {
  get source(): string;
  set source(value: EmbindString);
  blocks: VectorGemmiCifBlock;
  add_new_block(_0: EmbindString, _1: number): cifBlock;
  clear(): void;
  sole_block(): cifBlock;
  sole_block_const(): cifBlock;
  write_file(_0: EmbindString): void;
  write_file_with_options(_0: EmbindString, _1: WriteOptions): void;
  write_file_with_style(_0: EmbindString, _1: CifStyle): void;
  as_string(): string;
  as_string_with_options(_0: WriteOptions): string;
  as_string_with_style(_0: CifStyle): string;
}

export interface cifColumn extends ClassHandle {
  length(): number;
  at(_0: number): string;
  at_const(_0: number): string;
  str(_0: number): string;
  col(): number;
}

export interface cifTableRow extends ClassHandle {
  row_index: number;
  value_at_unsafe(_0: number): string;
  value_at(_0: number): string;
  value_at_const(_0: number): string;
  at(_0: number): string;
  at_const(_0: number): string;
  has(_0: number): boolean;
  has2(_0: number): boolean;
  one_of(_0: number, _1: number): string;
  size(): number;
  str(_0: number): string;
}

export interface cifTable extends ClassHandle {
  positions: VectorInt;
  prefix_length: number;
  ok(): boolean;
  width(): number;
  length(): number;
  size(): number;
  has_column(_0: number): boolean;
  at(_0: number): cifTableRow;
  one(): cifTableRow;
  get_prefix(): string;
  find_row(_0: EmbindString): cifTableRow;
  remove_row(_0: number): void;
  remove_rows(_0: number, _1: number): void;
  column_at_pos(_0: number): cifColumn;
  column(_0: number): cifColumn;
  move_row(_0: number, _1: number): void;
  find_column_position(_0: EmbindString): number;
  find_column(_0: EmbindString): cifColumn;
  erase(): void;
}

export interface cifItem extends ClassHandle {
  type: CifItemType;
  line_number: number;
  erase(): void;
  has_prefix(_0: EmbindString): boolean;
  set_value(_0: cifItem): void;
}

export interface cifLoop extends ClassHandle {
  tags: VectorString;
  values: VectorString;
  find_tag_lc(_0: EmbindString): number;
  has_tag(_0: EmbindString): boolean;
  width(): number;
  val(_0: number, _1: number): string;
  clear(): void;
  pop_row(): void;
  move_row(_0: number, _1: number): void;
  set_all_values(_0: VectorVectorString): void;
}

export interface cifItemSpan extends ClassHandle {
  set_pair(_0: EmbindString, _1: EmbindString): void;
}

export interface cifLoopArg extends ClassHandle {
}

export interface cifFrameArg extends ClassHandle {
}

export interface cifCommentArg extends ClassHandle {
}

export interface AtomMod extends ClassHandle {
  func: number;
  get old_id(): string;
  set old_id(value: EmbindString);
  get new_id(): string;
  set new_id(value: EmbindString);
  el: Element;
  charge: number;
  get chem_type(): string;
  set chem_type(value: EmbindString);
}

export interface ChemCompAtom extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  el: Element;
  charge: number;
  get chem_type(): string;
  set chem_type(value: EmbindString);
  is_hydrogen(): boolean;
}

export interface ChemCompAliasing extends ClassHandle {
  group: ChemCompGroup;
}

export interface ChemComp extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  get type_or_group(): string;
  set type_or_group(value: EmbindString);
  group: ChemCompGroup;
  aliases: VectorGemmiChemCompAliasing;
  rt: Restraints;
  atoms: VectorGemmiChemCompAtom;
  get_aliasing(_0: ChemCompGroup): ChemCompAliasing;
  set_group(_0: EmbindString): void;
  has_atom(_0: EmbindString): boolean;
  get_atom_index(_0: EmbindString): number;
  get_atom(_0: EmbindString): ChemCompAtom;
  remove_nonmatching_restraints(): void;
  remove_hydrogens(): ChemComp;
}

export interface ChemMod extends ClassHandle {
  get id(): string;
  set id(value: EmbindString);
  get name(): string;
  set name(value: EmbindString);
  get comp_id(): string;
  set comp_id(value: EmbindString);
  get group_id(): string;
  set group_id(value: EmbindString);
  atom_mods: VectorGemmiChemModAtomMod;
  rt: Restraints;
  block: cifBlock;
  apply_to(_0: ChemComp, _1: ChemCompGroup): void;
}

export interface EnerLibAtom extends ClassHandle {
  element: Element;
  hb_type: number;
  vdw_radius: number;
  vdwh_radius: number;
  ion_radius: number;
  valency: number;
  sp: number;
}

export interface EnerLibBond extends ClassHandle {
  get atom_type_2(): string;
  set atom_type_2(value: EmbindString);
  type: BondType;
  length: number;
  value_esd: number;
}

export interface EnerLib extends ClassHandle {
  read(_0: cifDocument): void;
}

export interface MonLib extends ClassHandle {
  get monomer_dir(): string;
  set monomer_dir(value: EmbindString);
  ener_lib: EnerLib;
  add_monomer_if_present(_0: cifBlock): void;
  path(_0: EmbindString): string;
  read_monomer_doc(_0: cifDocument): void;
  set_monomer_dir(_0: EmbindString): void;
  find_ideal_distance(_0: const_CRA, _1: const_CRA): number;
}

export interface CRA extends ClassHandle {
}

export interface const_CRA extends ClassHandle {
}

export interface SelectionList extends ClassHandle {
  all: boolean;
  inverted: boolean;
  get list(): string;
  set list(value: EmbindString);
  str(): string;
  has(_0: EmbindString): boolean;
}

export interface SelectionFlagList extends ClassHandle {
  get pattern(): string;
  set pattern(value: EmbindString);
  has(_0: number): boolean;
}

export interface SelectionSequenceId extends ClassHandle {
  seqnum: number;
  icode: number;
  empty(): boolean;
  str(): string;
  compare(_0: SeqId): number;
}

export interface SelectionAtomInequality extends ClassHandle {
  property: number;
  relation: number;
  value: number;
  matches(_0: GemmiAtom): boolean;
  str(): string;
}

export interface Selection extends ClassHandle {
  mdl: number;
  chain_ids: SelectionList;
  from_seqid: SelectionSequenceId;
  to_seqid: SelectionSequenceId;
  residue_names: SelectionList;
  entity_types: SelectionList;
  atom_names: SelectionList;
  elements: VectorChar;
  altlocs: SelectionList;
  residue_flags: SelectionFlagList;
  atom_flags: SelectionFlagList;
  atom_inequalities: VectorGemmiSelectionAtomInequality;
  str(): string;
  matches_structure(_0: Structure): boolean;
  matches_model(_0: Model): boolean;
  matches_chain(_0: Chain): boolean;
  matches_residue(_0: GemmiResidue): boolean;
  matches_atom(_0: GemmiAtom): boolean;
  matches_cra(_0: CRA): boolean;
  first_in_model(_0: Model): CRA;
  set_residue_flags(_0: EmbindString): Selection;
  set_atom_flags(_0: EmbindString): Selection;
  remove_selected_residue(_0: GemmiResidue): void;
  remove_not_selected_residue(_0: GemmiResidue): void;
}

export interface ResidueInfo extends ClassHandle {
  kind: ResidueInfoKind;
  one_letter_code: number;
  hydrogen_count: number;
  weight: number;
  found(): boolean;
  is_water(): boolean;
  is_dna(): boolean;
  is_rna(): boolean;
  is_nucleic_acid(): boolean;
  is_amino_acid(): boolean;
  is_buffer_or_water(): boolean;
  is_standard(): boolean;
  fasta_code(): number;
}

export interface SmallStructureSite extends ClassHandle {
  get label(): string;
  set label(value: EmbindString);
  get type_symbol(): string;
  set type_symbol(value: EmbindString);
  fract: Fractional;
  occ: number;
  u_iso: number;
  aniso: SMat33double;
  disorder_group: number;
  element: Element;
  charge: number;
  orth(_0: UnitCell): Position;
  element_and_charge_symbol(): string;
}

export interface SmallStructureAtomType extends ClassHandle {
  get symbol(): string;
  set symbol(value: EmbindString);
  element: Element;
  charge: number;
  dispersion_real: number;
  dispersion_imag: number;
}

export interface SmallStructure extends ClassHandle {
  get name(): string;
  set name(value: EmbindString);
  cell: UnitCell;
  get spacegroup_hm(): string;
  set spacegroup_hm(value: EmbindString);
  sites: VectorGemmiSmallStructureSite;
  atom_types: VectorGemmiSmallStructureAtomType;
  wavelength: number;
  get_all_unit_cell_sites(): VectorGemmiSmallStructureSite;
  remove_hydrogens(): void;
  change_occupancies_to_crystallographic(_0: number): void;
  setup_cell_images(): void;
}

export interface complexfloat extends ClassHandle {
  real(): number;
  imag(): number;
}

export interface HklValueComplexFloat extends ClassHandle {
  value: complexfloat;
  hkl: array_int_3;
}

export interface AsuDataComplexFloat extends ClassHandle {
  v: VectorGemmiHklValueComplexFloat;
  unit_cell_: UnitCell;
  stride(): number;
  size(): number;
  get_f(_0: number): number;
  get_phi(_0: number): number;
  unit_cell(): UnitCell;
  ensure_sorted(): void;
  ensure_asu(_0: boolean): void;
  get_hkl(_0: number): array_int_3;
}

export interface ReflnBlock extends ClassHandle {
  block: cifBlock;
  get entry_id(): string;
  set entry_id(value: EmbindString);
  cell: UnitCell;
  wavelength: number;
  ok(): boolean;
  check_ok(): void;
  tag_offset(): number;
  use_unmerged(_0: boolean): void;
  is_unmerged(): boolean;
  column_labels(): VectorString;
  find_column_index(_0: EmbindString): number;
  get_column_index(_0: EmbindString): number;
  make_1_d2_vector(): VectorDouble;
  make_d_vector(): VectorDouble;
  get_hkl_column_indices(): array_size_t_3;
  make_miller_vector(): VectorMiller;
}

export interface ReflnDataProxy extends ClassHandle {
  hkl_cols_: array_size_t_3;
  stride(): number;
  size(): number;
  get_num(_0: number): number;
  unit_cell(): UnitCell;
  column_index(_0: EmbindString): number;
  get_hkl(_0: number): array_int_3;
}

export interface CifToMtzEntry extends ClassHandle {
  get refln_tag(): string;
  set refln_tag(value: EmbindString);
  get col_label(): string;
  set col_label(value: EmbindString);
  col_type: number;
  dataset_id: number;
  translate_code_to_number(_0: EmbindString): number;
}

export interface CifToMtz extends ClassHandle {
  verbose: boolean;
  force_unmerged: boolean;
  get title(): string;
  set title(value: EmbindString);
  history: VectorString;
  spec_lines: VectorString;
}

export interface MtzDataset extends ClassHandle {
  id: number;
  get project_name(): string;
  set project_name(value: EmbindString);
  get crystal_name(): string;
  set crystal_name(value: EmbindString);
  get dataset_name(): string;
  set dataset_name(value: EmbindString);
  cell: UnitCell;
  wavelength: number;
}

export interface MtzColumn extends ClassHandle {
  dataset_id: number;
  type: number;
  get label(): string;
  set label(value: EmbindString);
  min_value: number;
  max_value: number;
  get source(): string;
  set source(value: EmbindString);
  idx: number;
  dataset(): MtzDataset;
  dataset_const(): MtzDataset;
  has_data(): boolean;
  size(): number;
  stride(): number;
  is_integer(): boolean;
}

export interface MtzBatch extends ClassHandle {
  number: number;
  get title(): string;
  set title(value: EmbindString);
  ints: VectorInt;
  floats: VectorFloat;
  axes: VectorString;
  get_cell(): UnitCell;
  set_cell(_0: UnitCell): void;
  dataset_id(): number;
  set_dataset_id(_0: number): void;
  wavelength(): number;
  set_wavelength(_0: number): void;
  phi_start(): number;
  phi_end(): number;
  matrix_U(): Mat33;
}

export interface Mtz extends ClassHandle {
  get source_path(): string;
  set source_path(value: EmbindString);
  same_byte_order: boolean;
  indices_switched_to_original: boolean;
  header_offset: bigint;
  get version_stamp(): string;
  set version_stamp(value: EmbindString);
  get title(): string;
  set title(value: EmbindString);
  nreflections: number;
  min_1_d2: number;
  max_1_d2: number;
  valm: number;
  get title(): string;
  set title(value: EmbindString);
  nsymop: number;
  cell: UnitCell;
  spacegroup_number: number;
  get spacegroup_name(): string;
  set spacegroup_name(value: EmbindString);
  symops: VectorGemmiOp;
  datasets: VectorGemmiMtzDataset;
  columns: VectorGemmiMtzColumn;
  batches: VectorGemmiMtzBatch;
  history: VectorString;
  get appended_text(): string;
  set appended_text(value: EmbindString);
  data: VectorFloat;
  sort_order: array_int_5;
  add_base(): void;
  resolution_high(): number;
  resolution_low(): number;
  get_cell(_0: number): UnitCell;
  get_cell_const(_0: number): UnitCell;
  set_cell_for_all(_0: UnitCell): void;
  last_dataset(): MtzDataset;
  dataset(_0: number): MtzDataset;
  dataset_const(_0: number): MtzDataset;
  count(_0: EmbindString): number;
  count_type(_0: number): number;
  positions_of_columns_with_type(_0: number): VectorInt;
  has_data(): boolean;
  is_merged(): boolean;
  update_reso(): void;
  toggle_endianness(): void;
  setup_spacegroup(): void;
  read_file(_0: EmbindString): void;
  sorted_row_indices(_0: number): VectorInt;
  sort(_0: number): boolean;
  ensure_asu(_0: boolean): void;
  switch_to_original_hkl(): boolean;
  switch_to_asu_hkl(): boolean;
  add_dataset(_0: EmbindString): MtzDataset;
  add_column(_0: EmbindString, _1: number, _2: number, _3: number, _4: boolean): MtzColumn;
  replace_column(_0: number, _1: MtzColumn, _2: VectorString): MtzColumn;
  copy_column(_0: number, _1: MtzColumn, _2: VectorString): MtzColumn;
  remove_column(_0: number): void;
  expand_data_rows(_0: number, _1: number): void;
  get_hkl(_0: number): array_int_3;
  set_hkl(_0: number, _1: array_int_3): void;
  calculate_min_max_1_d2(): array_double_2;
}

export interface MtzDataProxy extends ClassHandle {
  stride(): number;
  size(): number;
  get_num(_0: number): number;
  unit_cell(): UnitCell;
  column_index(_0: EmbindString): number;
  get_hkl(_0: number): array_int_3;
}

export interface MtzExternalDataProxy extends MtzDataProxy {
  size(): number;
  get_num(_0: number): number;
  get_hkl(_0: number): array_int_3;
}

export interface Ccp4Base extends ClassHandle {
  ccp4_header: VectorInt;
  same_byte_order: boolean;
  hstats: DataStats;
  header_i32(_0: number): number;
  header_float(_0: number): number;
  header_str(_0: number, _1: number): string;
  set_header_i32(_0: number, _1: number): void;
  set_header_3i32(_0: number, _1: number, _2: number, _3: number): void;
  set_header_float(_0: number, _1: number): void;
  set_header_str(_0: number, _1: EmbindString): void;
  header_rfloat(_0: number): number;
  has_skew_transformation(): boolean;
  get_skew_transformation(): Transform;
  get_extent(): BoxFractional;
}

export interface Ccp4 extends Ccp4Base {
  prepare_ccp4_header_except_mode_and_stats(): void;
  update_ccp4_header(_0: number, _1: boolean): void;
  full_cell(): boolean;
  setup(_0: number, _1: MapSetup): void;
  read_ccp4_file(_0: EmbindString): void;
  write_ccp4_map(_0: EmbindString): void;
  set_extent(_0: BoxFractional): void;
}

export interface Ccp4Int8_t extends Ccp4Base {
  prepare_ccp4_header_except_mode_and_stats(): void;
  update_ccp4_header(_0: number, _1: boolean): void;
  full_cell(): boolean;
  setup(_0: number, _1: MapSetup): void;
  read_ccp4_file(_0: EmbindString): void;
  write_ccp4_map(_0: EmbindString): void;
  set_extent(_0: BoxFractional): void;
}

export interface DataStats extends ClassHandle {
  dmin: number;
  dmax: number;
  dmean: number;
  rms: number;
  nan_count: number;
}

export interface GridOp extends ClassHandle {
  scaled_op: Op;
}

export interface GridMeta extends ClassHandle {
  unit_cell: UnitCell;
  nu: number;
  nv: number;
  nw: number;
  axis_order: AxisOrder;
  point_count(): number;
  get_fractional(_0: number, _1: number, _2: number): Fractional;
  get_position(_0: number, _1: number, _2: number): Position;
  get_scaled_ops_except_id(): VectorGemmiGridOp;
  index_q_int(_0: number, _1: number, _2: number): number;
  index_q_size_t(_0: number, _1: number, _2: number): number;
  index_n(_0: number, _1: number, _2: number): number;
  index_near_zero(_0: number, _1: number, _2: number): number;
}

export interface GridBasePoint extends ClassHandle {
  u: number;
  v: number;
  w: number;
}

export interface GridBasePointInt8_t extends ClassHandle {
  u: number;
  v: number;
  w: number;
}

export interface GridBase extends GridMeta {
  data: VectorFloat;
  check_not_empty(): void;
  set_size_without_checking(_0: number, _1: number, _2: number): void;
  get_value_q(_0: number, _1: number, _2: number): number;
  index_to_point(_0: number): GridBasePoint;
  fill(_0: number): void;
}

export interface GridBaseInt8_t extends GridMeta {
  data: VectorInt8_t;
  check_not_empty(): void;
  set_size_without_checking(_0: number, _1: number, _2: number): void;
  get_value_q(_0: number, _1: number, _2: number): number;
  index_to_point(_0: number): GridBasePointInt8_t;
  fill(_0: number): void;
}

export interface Grid extends GridBase {
  calculate_spacing(): void;
  set_size_without_checking(_0: number, _1: number, _2: number): void;
  set_size(_0: number, _1: number, _2: number): void;
  set_size_from_spacing(_0: number, _1: GridSizeRounding): void;
  set_unit_cell(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): void;
  index_s(_0: number, _1: number, _2: number): number;
  get_value(_0: number, _1: number, _2: number): number;
  set_value(_0: number, _1: number, _2: number, _3: number): void;
  get_point(_0: number, _1: number, _2: number): GridBasePoint;
  interpolate_value(_0: Position, _1: number): number;
  tricubic_interpolation(_0: number, _1: number, _2: number): number;
  symmetrize_min(): void;
  symmetrize_max(): void;
  symmetrize_abs_max(): void;
  symmetrize_sum(): void;
  symmetrize_nondefault(_0: number): void;
  normalize(): void;
}

export interface GridInt8_t extends GridBaseInt8_t {
}

export interface BoxFractional extends ClassHandle {
  minimum: Fractional;
  maximum: Fractional;
  get_size(): Fractional;
  add_margin(_0: number): void;
}

export interface BoxPosition extends ClassHandle {
  minimum: Position;
  maximum: Position;
  get_size(): Position;
  add_margin(_0: number): void;
}

export interface AtomNameElement extends ClassHandle {
  get atom_name(): string;
  set atom_name(value: EmbindString);
  el: El;
}

export interface VectorSequenceEntry extends ClassHandle {
  size(): number;
  get(_0: number): SequenceEntry | undefined;
  push_back(_0: SequenceEntry): void;
  resize(_0: number, _1: SequenceEntry): void;
  set(_0: number, _1: SequenceEntry): boolean;
}

export type LigandDictInfo = {
  comp_id: EmbindString,
  dict_contents: EmbindString
};

export interface VectorLigandDictInfo extends ClassHandle {
  push_back(_0: LigandDictInfo): void;
  resize(_0: number, _1: LigandDictInfo): void;
  size(): number;
  get(_0: number): LigandDictInfo | undefined;
  set(_0: number, _1: LigandDictInfo): boolean;
}

export type CompoundInfo = {
  name: EmbindString,
  three_letter_code: EmbindString
};

export interface VectorCompoundInfo extends ClassHandle {
  push_back(_0: CompoundInfo): void;
  resize(_0: number, _1: CompoundInfo): void;
  size(): number;
  get(_0: number): CompoundInfo | undefined;
  set(_0: number, _1: CompoundInfo): boolean;
}

export type SequenceResInfo = {
  resNum: number,
  resCode: EmbindString,
  cid: EmbindString
};

export interface VectorSequenceResInfo extends ClassHandle {
  push_back(_0: SequenceResInfo): void;
  resize(_0: number, _1: SequenceResInfo): void;
  size(): number;
  get(_0: number): SequenceResInfo | undefined;
  set(_0: number, _1: SequenceResInfo): boolean;
}

export type SequenceEntry = {
  type: number,
  name: EmbindString,
  chain: EmbindString,
  sequence: VectorSequenceResInfo
};

export type ResidueBFactorInfo = {
  cid: EmbindString,
  bFactor: number,
  normalised_bFactor: number
};

export interface VectorResidueBFactorInfo extends ClassHandle {
  push_back(_0: ResidueBFactorInfo): void;
  resize(_0: number, _1: ResidueBFactorInfo): void;
  size(): number;
  get(_0: number): ResidueBFactorInfo | undefined;
  set(_0: number, _1: ResidueBFactorInfo): boolean;
}

export type LigandInfo = {
  resName: EmbindString,
  chainName: EmbindString,
  resNum: EmbindString,
  modelName: EmbindString,
  cid: EmbindString
};

export interface VectorLigandInfo extends ClassHandle {
  push_back(_0: LigandInfo): void;
  resize(_0: number, _1: LigandInfo): void;
  size(): number;
  get(_0: number): LigandInfo | undefined;
  set(_0: number, _1: LigandInfo): boolean;
}

export type AtomInfo = {
  x: number,
  y: number,
  z: number,
  charge: number,
  element: EmbindString,
  tempFactor: number,
  serial: number,
  occupancy: number,
  name: EmbindString,
  has_altloc: boolean,
  alt_loc: EmbindString,
  mol_name: EmbindString,
  chain_id: EmbindString,
  res_no: EmbindString,
  res_name: EmbindString
};

export interface VectorAtomInfo extends ClassHandle {
  push_back(_0: AtomInfo): void;
  resize(_0: number, _1: AtomInfo): void;
  size(): number;
  get(_0: number): AtomInfo | undefined;
  set(_0: number, _1: AtomInfo): boolean;
}

export type array_native_double_9 = [ number, number, number, number, number, number, number, number, number ];

export type array_int_3 = [ number, number, number ];

export type array_double_3 = [ number, number, number ];

export type array_double_2 = [ number, number ];

export type array_int_5 = [ number, number, number, number, number ];

export type array_size_t_3 = [ number, number, number ];

export type array_string_2 = [ EmbindString, EmbindString ];

export type array_array_int_3_3 = [ array_int_3, array_int_3, array_int_3 ];

export type array_int_4 = [ number, number, number, number ];

export type array_array_int_4_4 = [ array_int_4, array_int_4, array_int_4, array_int_4 ];

export type array_double_4 = [ number, number, number, number ];

export type array_array_double_4_4 = [ array_double_4, array_double_4, array_double_4, array_double_4 ];

export interface VectorGemmiFTransform extends ClassHandle {
  push_back(_0: FTransform): void;
  resize(_0: number, _1: FTransform): void;
  size(): number;
  get(_0: number): FTransform | undefined;
  set(_0: number, _1: FTransform): boolean;
}

export interface VectorGemmiChemCompAtom extends ClassHandle {
  push_back(_0: ChemCompAtom): void;
  resize(_0: number, _1: ChemCompAtom): void;
  size(): number;
  get(_0: number): ChemCompAtom | undefined;
  set(_0: number, _1: ChemCompAtom): boolean;
}

export interface VectorInt8_t extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface VectorMiller extends ClassHandle {
  push_back(_0: array_int_3): void;
  resize(_0: number, _1: array_int_3): void;
  size(): number;
  get(_0: number): array_int_3 | undefined;
  set(_0: number, _1: array_int_3): boolean;
}

export interface DisplayModeValue<T extends number> {
  value: T;
}
export type DisplayMode = DisplayModeValue<0>|DisplayModeValue<1>|DisplayModeValue<2>;

export interface DrawingCommandVector extends ClassHandle {
  size(): number;
  get(_0: number): DrawingCommand | undefined;
  push_back(_0: DrawingCommand): void;
  resize(_0: number, _1: DrawingCommand): void;
  set(_0: number, _1: DrawingCommand): boolean;
}

export interface PathElementVector extends ClassHandle {
  size(): number;
  get(_0: number): PathElement | undefined;
  push_back(_0: PathElement): void;
  resize(_0: number, _1: PathElement): void;
  set(_0: number, _1: PathElement): boolean;
}

export interface TextMeasurementCache extends ClassHandle {
}

export interface Renderer extends ClassHandle {
  get_commands(): DrawingCommandVector;
}

export type Color = {
  r: number,
  g: number,
  b: number,
  a: number
};

export type BrushStyle = {
  color: Color,
  line_width: number
};

export type GraphenePoint = {
  x: number,
  y: number
};

export type Line = {
  start: GraphenePoint,
  end: GraphenePoint
};

export type Arc = {
  origin: GraphenePoint,
  radius: number,
  angle_one: number,
  angle_two: number
};

export interface PathElement extends ClassHandle {
  is_arc(): boolean;
  as_arc(): Arc;
  as_line(): Line;
  is_line(): boolean;
}

export interface Path extends ClassHandle {
  fill_color: Color;
  has_fill: boolean;
  stroke_style: BrushStyle;
  has_stroke: boolean;
  get_elements(): PathElementVector;
}

export interface TextPositioningValue<T extends number> {
  value: T;
}
export type TextPositioning = TextPositioningValue<0>|TextPositioningValue<1>|TextPositioningValue<2>;

export interface TextStyle extends ClassHandle {
  positioning: TextPositioning;
  get weight(): string;
  set weight(value: EmbindString);
  get size(): string;
  set size(value: EmbindString);
  color: Color;
  specifies_color: boolean;
}

export interface TextSpan extends ClassHandle {
  style: TextStyle;
  specifies_style: boolean;
  is_newline(): boolean;
  has_subspans(): boolean;
  as_caption(): string;
  as_subspans(): TextSpanVector;
}

export interface TextSpanVector extends ClassHandle {
  push_back(_0: TextSpan): void;
  resize(_0: number, _1: TextSpan): void;
  size(): number;
  get(_0: number): TextSpan | undefined;
  set(_0: number, _1: TextSpan): boolean;
}

export type TextSize = {
  width: number,
  height: number
};

export interface Text extends ClassHandle {
  origin: GraphenePoint;
  style: TextStyle;
  spans: TextSpanVector;
}

export interface DrawingCommand extends ClassHandle {
  is_path(): boolean;
  as_path(): Path;
  is_text(): boolean;
  as_text(): Text;
}

export interface DeleteTool extends ClassHandle {
}

export interface ChargeModifier extends ClassHandle {
}

export interface GeometryModifier extends ClassHandle {
}

export interface FormatTool extends ClassHandle {
}

export interface RemoveHydrogensTool extends ClassHandle {
}

export interface LhasaElementValue<T extends number> {
  value: T;
}
export type LhasaElement = LhasaElementValue<0>|LhasaElementValue<1>|LhasaElementValue<2>|LhasaElementValue<3>|LhasaElementValue<4>|LhasaElementValue<5>|LhasaElementValue<6>|LhasaElementValue<7>|LhasaElementValue<8>|LhasaElementValue<9>;

export interface ElementInsertion extends ClassHandle {
}

export interface LhasaStructureValue<T extends number> {
  value: T;
}
export type LhasaStructure = LhasaStructureValue<0>|LhasaStructureValue<1>|LhasaStructureValue<2>|LhasaStructureValue<3>|LhasaStructureValue<4>|LhasaStructureValue<5>|LhasaStructureValue<6>;

export interface StructureInsertion extends ClassHandle {
}

export interface BondModifierModeValue<T extends number> {
  value: T;
}
export type BondModifierMode = BondModifierModeValue<0>|BondModifierModeValue<1>|BondModifierModeValue<2>;

export interface BondModifier extends ClassHandle {
}

export interface TransformModeValue<T extends number> {
  value: T;
}
export type TransformMode = TransformModeValue<0>|TransformModeValue<1>;

export interface TransformTool extends ClassHandle {
}

export interface FlipModeValue<T extends number> {
  value: T;
}
export type FlipMode = FlipModeValue<0>|FlipModeValue<1>;

export interface FlipTool extends ClassHandle {
}

export interface ActiveTool extends ClassHandle {
}

export type SizingInfo = {
  width: number,
  height: number
};

export type QEDInfo = {
  number_of_hydrogen_bond_acceptors: number,
  number_of_hydrogen_bond_donors: number,
  number_of_rotatable_bonds: number,
  number_of_aromatic_rings: number,
  number_of_alerts: number,
  molecular_weight: number,
  alogp: number,
  molecular_polar_surface_area: number,
  ads_mw: number,
  ads_alogp: number,
  ads_hba: number,
  ads_hbd: number,
  ads_psa: number,
  ads_rotb: number,
  ads_arom: number,
  ads_alert: number,
  qed_score: number
};

export interface ImplWidgetCoreData extends ClassHandle {
  render(_0: Renderer): void;
}

export interface SmilesMap extends ClassHandle {
  size(): number;
  get(_0: number): EmbindString | undefined;
  set(_0: number, _1: EmbindString): void;
  keys(): MoleculeIdVector;
}

export interface MoleculeIdVector extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface Canvas extends ImplWidgetCoreData {
  set_active_tool(_0: ActiveTool): void;
  update_molecule_from_smiles(_0: number, _1: EmbindString): void;
  set_scale(_0: number): void;
  get_scale(): number;
  undo_edition(): void;
  redo_edition(): void;
  get_molecule_count(): number;
  get_idx_of_first_molecule(): number;
  get_max_molecule_idx(): number;
  set_allow_invalid_molecules(_0: boolean): void;
  get_allow_invalid_molecules(): boolean;
  get_display_mode(): DisplayMode;
  set_display_mode(_0: DisplayMode): void;
  get_smiles(): SmilesMap;
  get_smiles_for_molecule(_0: number): string;
  get_inchi_keys(): SmilesMap;
  get_inchi_key_for_molecule(_0: number): string;
  get_pickled_molecule(_0: number): string;
  get_pickled_molecule_base64(_0: number): string;
  clear_molecules(): void;
  on_hover(_0: number, _1: number, _2: boolean, _3: boolean): void;
  on_scroll(_0: number, _1: number, _2: boolean): void;
  on_left_click(_0: number, _1: number, _2: boolean, _3: boolean, _4: boolean): void;
  on_left_click_released(_0: number, _1: number, _2: boolean, _3: boolean, _4: boolean): void;
  on_right_click(_0: number, _1: number, _2: boolean, _3: boolean, _4: boolean): void;
  on_right_click_released(_0: number, _1: number, _2: boolean, _3: boolean, _4: boolean): void;
  measure(): SizingInfo;
  set_minimum_dimensions(_0: number, _1: number): void;
  connect(_0: EmbindString, _1: any): void;
}

interface EmbindModule {
  molecules_container_t: {
    new(_0: boolean): molecules_container_t;
  };
  molecules_container_js: {
    new(_0: boolean): molecules_container_js;
  };
  vector<TorsionEntry>: {
    new(): vector<TorsionEntry>;
  };
  vector_residue_range_t: {
    new(): vector_residue_range_t;
  };
  vector_geometry_distortion_info_container_t: {
    new(): vector_geometry_distortion_info_container_t;
  };
  vector_geometry_distortion_info_t: {
    new(): vector_geometry_distortion_info_t;
  };
  Table: {
    new(): Table;
  };
  validate(_0: EmbindString, _1: EmbindString): Table;
  unpackCootDataFile(_0: EmbindString, _1: boolean, _2: EmbindString, _3: EmbindString): void;
  testFloat32Array(_0: any): any;
  Coord_orth: {
    new(_0: number, _1: number, _2: number): Coord_orth;
  };
  vector_overlap: {
    new(): vector_overlap;
  };
  Spgr_descr: {};
  Spacegroup: {};
  Cell_descr: {
    new(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): Cell_descr;
  };
  Cell: {
    new(): Cell;
    new(_0: Cell_descr): Cell;
  };
  Xmap_base: {};
  Clipper_String: {
    new(): Clipper_String;
    new(_0: EmbindString): Clipper_String;
  };
  Xmap_float: {
    new(): Xmap_float;
  };
  CCP4MAPfile: {
    new(): CCP4MAPfile;
  };
  simple_rotamer: {};
  geometry_distortion_info_container_t: {
    new(): geometry_distortion_info_container_t;
  };
  geometry_distortion_info_t: {
    new(): geometry_distortion_info_t;
  };
  residue_range_t: {
    new(): residue_range_t;
    new(_0: EmbindString, _1: number, _2: number): residue_range_t;
  };
  mutate_insertion_range_info_t: {
    new(_0: number, _1: VectorString): mutate_insertion_range_info_t;
  };
  chain_mutation_info_container_t: {
    new(): chain_mutation_info_container_t;
    new(_0: EmbindString): chain_mutation_info_container_t;
  };
  VectorAcedrgTypesForBond_t: {
    new(): VectorAcedrgTypesForBond_t;
  };
  validation_information_t: {};
  Atom: {
    new(): Atom;
  };
  Residue: {
    new(): Residue;
  };
  phi_psi_prob_t: {};
  moved_atom_t: {
    new(_0: EmbindString, _1: EmbindString, _2: number, _3: number, _4: number, _5: number): moved_atom_t;
  };
  moved_residue_t: {
    new(_0: EmbindString, _1: number, _2: EmbindString): moved_residue_t;
  };
  getTextureArray(_0: texture_as_floats_t, _1: any): void;
  CartesianPair: {};
  RamachandranInfo: {
    new(): RamachandranInfo;
  };
  ResiduePropertyInfo: {
    new(): ResiduePropertyInfo;
  };
  phi_psi_t: {};
  Cartesian: {};
  symm_trans_t: {};
  density_correlation_stats_info_t: {};
  vector_header_info_t: {
    new(): vector_header_info_t;
  };
  VectorFitLigandInfo_t: {
    new(): VectorFitLigandInfo_t;
  };
  VectorAtomSpec_t: {
    new(): VectorAtomSpec_t;
  };
  VectorAutoReadMtzInfo_t: {
    new(): VectorAutoReadMtzInfo_t;
  };
  VectorCootCartesianPair: {
    new(): VectorCootCartesianPair;
  };
  VectorVectorCootCartesianPair: {
    new(): VectorVectorCootCartesianPair;
  };
  VectorCootCartesian: {
    new(): VectorCootCartesian;
  };
  VectorVectorCootCartesian: {
    new(): VectorVectorCootCartesian;
  };
  MapStringVectorString: {
    new(): MapStringVectorString;
  };
  MapIntFloat3: {
    new(): MapIntFloat3;
  };
  MapIntFloat4: {
    new(): MapIntFloat4;
  };
  Map_residue_spec_t_density_correlation_stats_info_t: {
    new(): Map_residue_spec_t_density_correlation_stats_info_t;
  };
  VectorArrayFloat16: {
    new(): VectorArrayFloat16;
  };
  VectorClipperCoordOrth_float_pair: {
    new(): VectorClipperCoordOrth_float_pair;
  };
  VectorStringInt_pair: {
    new(): VectorStringInt_pair;
  };
  VectorInt_pair: {
    new(): VectorInt_pair;
  };
  VectorFloat_pair: {
    new(): VectorFloat_pair;
  };
  VectorDouble_pair: {
    new(): VectorDouble_pair;
  };
  VectorStringUInt_pair: {
    new(): VectorStringUInt_pair;
  };
  Vectorsym_trans_t_Cell_Translation_pair: {
    new(): Vectorsym_trans_t_Cell_Translation_pair;
  };
  Vectorstring_string_pair: {
    new(): Vectorstring_string_pair;
  };
  Vectormoorhen_hbond: {
    new(): Vectormoorhen_hbond;
  };
  Vectorinstanced_geometry_t: {
    new(): Vectorinstanced_geometry_t;
  };
  Vectormoved_residue_t: {
    new(): Vectormoved_residue_t;
  };
  Vectormoved_atom_t: {
    new(): Vectormoved_atom_t;
  };
  VectorString: {
    new(): VectorString;
  };
  VectorVectorString: {
    new(): VectorVectorString;
  };
  VectorFloat: {
    new(): VectorFloat;
  };
  VectorDouble: {
    new(): VectorDouble;
  };
  VectorInt: {
    new(): VectorInt;
  };
  VectorChar: {
    new(): VectorChar;
  };
  VectorValidationInformation: {
    new(): VectorValidationInformation;
  };
  VectorResidueValidationInformationPair: {
    new(): VectorResidueValidationInformationPair;
  };
  VectorResidueIdentifier: {
    new(): VectorResidueIdentifier;
  };
  VectorResiduePropertyInfo: {
    new(): VectorResiduePropertyInfo;
  };
  Vectorchain_validation_information_t: {
    new(): Vectorchain_validation_information_t;
  };
  Vectorresidue_validation_information_t: {
    new(): Vectorresidue_validation_information_t;
  };
  Vectorsimple_rotamer: {
    new(): Vectorsimple_rotamer;
  };
  Vectorresidue_spec_t: {
    new(): Vectorresidue_spec_t;
  };
  Vectorvnc_veertex: {
    new(): Vectorvnc_veertex;
  };
  Vectorvn_vertex: {
    new(): Vectorvn_vertex;
  };
  Vectorinteresting_place_t: {
    new(): Vectorinteresting_place_t;
  };
  Vectorg_triangle: {
    new(): Vectorg_triangle;
  };
  getPositionsFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  getReversedNormalsFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  getReversedNormalsFromSimpleMesh3(_0: simple_mesh_t, _1: any): void;
  getNormalsFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  getColoursFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  getPositionsFromSimpleMesh(_0: simple_mesh_t): any;
  getReversedNormalsFromSimpleMesh(_0: simple_mesh_t): any;
  getNormalsFromSimpleMesh(_0: simple_mesh_t): any;
  getColoursFromSimpleMesh(_0: simple_mesh_t): any;
  getLineIndicesFromSimpleMesh(_0: simple_mesh_t): any;
  getPermutedTriangleIndicesFromSimpleMesh(_0: simple_mesh_t): any;
  getTriangleIndicesFromSimpleMesh(_0: simple_mesh_t): any;
  getLineIndicesFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  getPermutedTriangleIndicesFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  getTriangleIndicesFromSimpleMesh2(_0: simple_mesh_t, _1: any): void;
  Vectorinstancing_data_type_A_t: {
    new(): Vectorinstancing_data_type_A_t;
  };
  Vectorinstancing_data_type_B_t: {
    new(): Vectorinstancing_data_type_B_t;
  };
  Vectorresidue_spec_t_string_pair: {
    new(): Vectorresidue_spec_t_string_pair;
  };
  Vectormerge_molecule_results_info_t: {
    new(): Vectormerge_molecule_results_info_t;
  };
  Vectophi_psi_prob_t: {
    new(): Vectophi_psi_prob_t;
  };
  Vectorh_bond: {
    new(): Vectorh_bond;
  };
  helix_t: {
    new(_0: number, _1: EmbindString, _2: EmbindString, _3: EmbindString, _4: number, _5: EmbindString, _6: EmbindString, _7: EmbindString, _8: number, _9: EmbindString, _10: number, _11: EmbindString, _12: number): helix_t;
  };
  vector_helix_t: {
    new(): vector_helix_t;
  };
  vector_pair_double_vector_double: {
    new(): vector_pair_double_vector_double;
  };
  SmallMoleculeCifToMMCif(_0: EmbindString): string_string_pair;
  get_mtz_columns(_0: EmbindString): VectorString;
  get_coord_header_info(_0: EmbindString, _1: EmbindString): CoordinateHeaderInfo;
  is64bit(): boolean;
  run_conkit_validate(_0: ConKitValidateOptions): number;
  coot_atom_overlaps_dots_container_t: {};
  coot_geometry_distortion_info_pod_container_t: {};
  Vector_coot_geometry_distortion_info_pod_container_t: {
    new(): Vector_coot_geometry_distortion_info_pod_container_t;
  };
  Vector_coot_mutate_insertion_range_info_t: {
    new(): Vector_coot_mutate_insertion_range_info_t;
  };
  api_cell_t: {};
  MapStringString_2: {
    new(): MapStringString_2;
  };
  MapStringVectorSimpleRotamer: {
    new(): MapStringVectorSimpleRotamer;
  };
  getRotamersMap(): MapStringVectorSimpleRotamer;
  HowToNameCopiedChain: {Short: HowToNameCopiedChainValue<0>, AddNumber: HowToNameCopiedChainValue<1>, Dup: HowToNameCopiedChainValue<2>};
  complexdouble: {
    new(_0: number, _1: number): complexdouble;
    new(_0: complexfloat): complexdouble;
  };
  VectorGemmiSelection: {
    new(): VectorGemmiSelection;
  };
  VectorGemmiGridOp: {
    new(): VectorGemmiGridOp;
  };
  VectorGemmiMtzDataset: {
    new(): VectorGemmiMtzDataset;
  };
  VectorGemmiMtzColumn: {
    new(): VectorGemmiMtzColumn;
  };
  VectorGemmiMtzBatch: {
    new(): VectorGemmiMtzBatch;
  };
  VectorGemmiHklValueComplexFloat: {
    new(): VectorGemmiHklValueComplexFloat;
  };
  VectorGemmiSmallStructureSite: {
    new(): VectorGemmiSmallStructureSite;
  };
  VectorGemmiSmallStructureAtomType: {
    new(): VectorGemmiSmallStructureAtomType;
  };
  VectorGemmiSelectionAtomInequality: {
    new(): VectorGemmiSelectionAtomInequality;
  };
  VectorGemmiChemCompAliasing: {
    new(): VectorGemmiChemCompAliasing;
  };
  VectorGemmiChemModAtomMod: {
    new(): VectorGemmiChemModAtomMod;
  };
  VectorGemmiCifItem: {
    new(): VectorGemmiCifItem;
  };
  VectorGemmiCifBlock: {
    new(): VectorGemmiCifBlock;
  };
  VectorGemmiRestraintsBond: {
    new(): VectorGemmiRestraintsBond;
  };
  VectorGemmiRestraintsAngle: {
    new(): VectorGemmiRestraintsAngle;
  };
  VectorGemmiRestraintsTorsion: {
    new(): VectorGemmiRestraintsTorsion;
  };
  VectorGemmiRestraintsChirality: {
    new(): VectorGemmiRestraintsChirality;
  };
  VectorGemmiRestraintsPlane: {
    new(): VectorGemmiRestraintsPlane;
  };
  VectorGemmiRestraintsAtomId: {
    new(): VectorGemmiRestraintsAtomId;
  };
  VectorGemmiTlsGroupSelection: {
    new(): VectorGemmiTlsGroupSelection;
  };
  VectorGemmiTlsGroup: {
    new(): VectorGemmiTlsGroup;
  };
  VectorGemmiRefinementInfoRestr: {
    new(): VectorGemmiRefinementInfoRestr;
  };
  VectorGemmiDiffractionInfo: {
    new(): VectorGemmiDiffractionInfo;
  };
  VectorGemmiReflectionsInfo: {
    new(): VectorGemmiReflectionsInfo;
  };
  VectorGemmiBasicRefinementInfo: {
    new(): VectorGemmiBasicRefinementInfo;
  };
  VectorGemmiExperimentInfo: {
    new(): VectorGemmiExperimentInfo;
  };
  VectorGemmiCrystalInfo: {
    new(): VectorGemmiCrystalInfo;
  };
  VectorGemmiRefinementInfo: {
    new(): VectorGemmiRefinementInfo;
  };
  VectorGemmiSoftwareItem: {
    new(): VectorGemmiSoftwareItem;
  };
  VectorGemmiAssemblyGen: {
    new(): VectorGemmiAssemblyGen;
  };
  VectorGemmiSheetStrand: {
    new(): VectorGemmiSheetStrand;
  };
  VectorGemmiEntityDbRef: {
    new(): VectorGemmiEntityDbRef;
  };
  VectorGemmiAtom: {
    new(): VectorGemmiAtom;
  };
  VectorGemmiModel: {
    new(): VectorGemmiModel;
  };
  VectorGemmiOp: {
    new(): VectorGemmiOp;
  };
  VectorGemmiNcsOp: {
    new(): VectorGemmiNcsOp;
  };
  VectorGemmiEntity: {
    new(): VectorGemmiEntity;
  };
  VectorGemmiConnection: {
    new(): VectorGemmiConnection;
  };
  VectorGemmiHelix: {
    new(): VectorGemmiHelix;
  };
  VectorGemmiSheet: {
    new(): VectorGemmiSheet;
  };
  VectorGemmiAssembly: {
    new(): VectorGemmiAssembly;
  };
  VectorGemmiChain: {
    new(): VectorGemmiChain;
  };
  VectorGemmiResidue: {
    new(): VectorGemmiResidue;
  };
  VectorGemmiResidueSpan: {
    new(): VectorGemmiResidueSpan;
  };
  VectorGemmiConstResidueSpan: {
    new(): VectorGemmiConstResidueSpan;
  };
  CifStyle: {Simple: CifStyleValue<0>, NoBlankLines: CifStyleValue<1>, PreferPairs: CifStyleValue<2>, Pdbx: CifStyleValue<3>, Indent35: CifStyleValue<4>, Aligned: CifStyleValue<5>};
  GridSizeRounding: {Nearest: GridSizeRoundingValue<0>, Up: GridSizeRoundingValue<1>, Down: GridSizeRoundingValue<2>};
  AxisOrder: {Unknown: AxisOrderValue<0>, XYZ: AxisOrderValue<1>, ZYX: AxisOrderValue<2>};
  MapSetup: {Full: MapSetupValue<0>, NoSymmetry: MapSetupValue<1>, ReorderOnly: MapSetupValue<2>};
  DataType: {Unknown: DataTypeValue<0>, Unmerged: DataTypeValue<1>, Mean: DataTypeValue<2>, Anomalous: DataTypeValue<3>};
  ResidueInfoKind: {UNKNOWN: ResidueInfoKindValue<0>, AA: ResidueInfoKindValue<1>, AAD: ResidueInfoKindValue<2>, PAA: ResidueInfoKindValue<3>, MAA: ResidueInfoKindValue<4>, RNA: ResidueInfoKindValue<5>, DNA: ResidueInfoKindValue<6>, BUF: ResidueInfoKindValue<7>, HOH: ResidueInfoKindValue<8>, PYR: ResidueInfoKindValue<9>, KET: ResidueInfoKindValue<10>, ELS: ResidueInfoKindValue<11>};
  EnerLibRadiusType: {Vdw: EnerLibRadiusTypeValue<0>, Vdwh: EnerLibRadiusTypeValue<1>, Ion: EnerLibRadiusTypeValue<2>};
  CifItemType: {Pair: CifItemTypeValue<0>, Loop: CifItemTypeValue<1>, Frame: CifItemTypeValue<2>, Comment: CifItemTypeValue<3>, Erased: CifItemTypeValue<4>};
  Classification: {DataCollection: ClassificationValue<0>, DataExtraction: ClassificationValue<1>, DataProcessing: ClassificationValue<2>, DataReduction: ClassificationValue<3>, DataScaling: ClassificationValue<4>, ModelBuilding: ClassificationValue<5>, Phasing: ClassificationValue<6>, Refinement: ClassificationValue<7>, Unspecified: ClassificationValue<8>};
  DistanceOf: {ElectronCloud: DistanceOfValue<0>, Nucleus: DistanceOfValue<1>};
  BondType: {Unspec: BondTypeValue<0>, Single: BondTypeValue<1>, Double: BondTypeValue<2>, Triple: BondTypeValue<3>, Aromatic: BondTypeValue<4>, Deloc: BondTypeValue<5>, Metal: BondTypeValue<6>};
  ChiralityType: {Positive: ChiralityTypeValue<0>, Negative: ChiralityTypeValue<1>, Both: ChiralityTypeValue<2>};
  ChemCompGroup: {Peptide: ChemCompGroupValue<0>, PPeptide: ChemCompGroupValue<1>, MPeptide: ChemCompGroupValue<2>, Dna: ChemCompGroupValue<3>, Rna: ChemCompGroupValue<4>, DnaRna: ChemCompGroupValue<5>, Pyranose: ChemCompGroupValue<6>, Ketopyranose: ChemCompGroupValue<7>, Furanose: ChemCompGroupValue<8>, NonPolymer: ChemCompGroupValue<9>, Null: ChemCompGroupValue<10>};
  SpecialKind: {NA: SpecialKindValue<0>, CompleteIcosahedral: SpecialKindValue<1>, RepresentativeHelical: SpecialKindValue<2>, CompletePoint: SpecialKindValue<3>};
  ConnectionType: {Covale: ConnectionTypeValue<0>, Disulf: ConnectionTypeValue<1>, Hydrog: ConnectionTypeValue<2>, MetalC: ConnectionTypeValue<3>, Unknown: ConnectionTypeValue<4>};
  HelixClass: {UnknownHelix: HelixClassValue<0>, RAlpha: HelixClassValue<1>, ROmega: HelixClassValue<2>, RPi: HelixClassValue<3>, RGamma: HelixClassValue<4>, R310: HelixClassValue<5>, LAlpha: HelixClassValue<6>, LOmega: HelixClassValue<7>, LGamma: HelixClassValue<8>, Helix27: HelixClassValue<9>, HelixPolyProlineNone: HelixClassValue<10>};
  Asu: {Same: AsuValue<0>, Different: AsuValue<1>, Any: AsuValue<2>};
  El: {X: ElValue<0>, He: ElValue<2>, Li: ElValue<3>, Be: ElValue<4>, B: ElValue<5>, C: ElValue<6>, N: ElValue<7>, O: ElValue<8>, F: ElValue<9>, Ne: ElValue<10>, Na: ElValue<11>, Mg: ElValue<12>, Al: ElValue<13>, Si: ElValue<14>, P: ElValue<15>, S: ElValue<16>, Cl: ElValue<17>, Ar: ElValue<18>, K: ElValue<19>, Ca: ElValue<20>, Sc: ElValue<21>, Ti: ElValue<22>, V: ElValue<23>, Cr: ElValue<24>, Mn: ElValue<25>, Fe: ElValue<26>, Co: ElValue<27>, Ni: ElValue<28>, Cu: ElValue<29>, Zn: ElValue<30>, Ga: ElValue<31>, Ge: ElValue<32>, As: ElValue<33>, Se: ElValue<34>, Br: ElValue<35>, Kr: ElValue<36>, Rb: ElValue<37>, Sr: ElValue<38>, Y: ElValue<39>, Zr: ElValue<40>, Nb: ElValue<41>, Mo: ElValue<42>, Tc: ElValue<43>, Ru: ElValue<44>, Rh: ElValue<45>, Pd: ElValue<46>, Ag: ElValue<47>, Cd: ElValue<48>, In: ElValue<49>, Sn: ElValue<50>, Sb: ElValue<51>, Te: ElValue<52>, I: ElValue<53>, Xe: ElValue<54>, Cs: ElValue<55>, Ba: ElValue<56>, La: ElValue<57>, Ce: ElValue<58>, Pr: ElValue<59>, Nd: ElValue<60>, Pm: ElValue<61>, Sm: ElValue<62>, Eu: ElValue<63>, Gd: ElValue<64>, Tb: ElValue<65>, Dy: ElValue<66>, Ho: ElValue<67>, Er: ElValue<68>, Tm: ElValue<69>, Yb: ElValue<70>, Lu: ElValue<71>, Hf: ElValue<72>, Ta: ElValue<73>, W: ElValue<74>, Re: ElValue<75>, Os: ElValue<76>, Ir: ElValue<77>, Pt: ElValue<78>, Au: ElValue<79>, Hg: ElValue<80>, Tl: ElValue<81>, Pb: ElValue<82>, Bi: ElValue<83>, Po: ElValue<84>, At: ElValue<85>, Rn: ElValue<86>, Fr: ElValue<87>, Ra: ElValue<88>, Ac: ElValue<89>, Th: ElValue<90>, Pa: ElValue<91>, U: ElValue<92>, Np: ElValue<93>, Pu: ElValue<94>, Am: ElValue<95>, Cm: ElValue<96>, Bk: ElValue<97>, Cf: ElValue<98>, Es: ElValue<99>, Fm: ElValue<100>, Md: ElValue<101>, No: ElValue<102>, Lr: ElValue<103>, Rf: ElValue<104>, Db: ElValue<105>, Sg: ElValue<106>, Bh: ElValue<107>, Hs: ElValue<108>, Mt: ElValue<109>, Ds: ElValue<110>, Rg: ElValue<111>, Cn: ElValue<112>, Nh: ElValue<113>, Fl: ElValue<114>, Mc: ElValue<115>, Lv: ElValue<116>, Ts: ElValue<117>, Og: ElValue<118>, D: ElValue<119>, END: ElValue<120>};
  PolymerType: {Unknown: PolymerTypeValue<0>, PeptideL: PolymerTypeValue<1>, PeptideD: PolymerTypeValue<2>, Dna: PolymerTypeValue<3>, Rna: PolymerTypeValue<4>, DnaRnaHybrid: PolymerTypeValue<5>, SaccharideD: PolymerTypeValue<6>, SaccharideL: PolymerTypeValue<7>, Pna: PolymerTypeValue<8>, CyclicPseudoPeptide: PolymerTypeValue<9>, Other: PolymerTypeValue<10>};
  PointGroup: {C1: PointGroupValue<0>, Ci: PointGroupValue<1>, C2: PointGroupValue<2>, Cs: PointGroupValue<3>, C2h: PointGroupValue<4>, D2: PointGroupValue<5>, C2v: PointGroupValue<6>, D2h: PointGroupValue<7>, C4: PointGroupValue<8>, S4: PointGroupValue<9>, C4h: PointGroupValue<10>, D4: PointGroupValue<11>, C4v: PointGroupValue<12>, D2d: PointGroupValue<13>, D4h: PointGroupValue<14>, C3: PointGroupValue<15>, C3i: PointGroupValue<16>, D3: PointGroupValue<17>, C3v: PointGroupValue<18>, D3d: PointGroupValue<19>, C6: PointGroupValue<20>, C3h: PointGroupValue<21>, C6h: PointGroupValue<22>, D6: PointGroupValue<23>, C6v: PointGroupValue<24>, D3h: PointGroupValue<25>, D6h: PointGroupValue<26>, T: PointGroupValue<27>, Th: PointGroupValue<28>, O: PointGroupValue<29>, Td: PointGroupValue<30>, Oh: PointGroupValue<31>};
  Laue: {L1: LaueValue<0>, L2m: LaueValue<1>, Lmmm: LaueValue<2>, L4m: LaueValue<3>, L4mmm: LaueValue<4>, L3: LaueValue<5>, L3m: LaueValue<6>, L6m: LaueValue<7>, L6mmm: LaueValue<8>, Lm3: LaueValue<9>, Lm3m: LaueValue<10>};
  EntityType: {Unknown: EntityTypeValue<0>, Polymer: EntityTypeValue<1>, NonPolymer: EntityTypeValue<2>, Branched: EntityTypeValue<3>, Water: EntityTypeValue<4>};
  CalcFlag: {NotSet: CalcFlagValue<0>, Determined: CalcFlagValue<2>, Calculated: CalcFlagValue<3>, Dummy: CalcFlagValue<4>};
  CoorFormat: {Unknown: CoorFormatValue<0>, Detect: CoorFormatValue<1>, Pdb: CoorFormatValue<2>, Mmcif: CoorFormatValue<3>, Mmjson: CoorFormatValue<4>, ChemComp: CoorFormatValue<5>};
  SpanConstResidue: {};
  SpanResidue: {};
  MutableVectorSpanResidue: {};
  UnitCellParameters: {
    new(): UnitCellParameters;
  };
  UnitCell: {
    new(): UnitCell;
    new(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): UnitCell;
  };
  Model: {};
  Chain: {};
  ConstResidueSpan: {};
  ResidueSpan: {};
  ConstResidueGroup: {};
  ResidueGroup: {};
  OptionalNum: {};
  SeqId: {};
  ResidueId: {};
  GemmiResidue: {};
  GemmiAtom: {};
  Element: {};
  Mat33: {};
  SMat33double: {};
  SMat33float: {};
  GemmiVec3: {};
  Fractional: {
    new(_0: number, _1: number, _2: number): Fractional;
  };
  Position: {
    new(_0: number, _1: number, _2: number): Position;
  };
  NeighborSearch: {
    new(_0: Model, _1: UnitCell, _2: number): NeighborSearch;
  };
  Mark: {};
  EntityDbRef: {};
  Entity: {
    first_mon(_0: EmbindString): string;
  };
  ItemGroupAtom: {};
  AtomGroup: {};
  SpaceGroup: {};
  Transform: {};
  FTransform: {};
  Op: {
    divide_hkl_by_DEN(_0: array_int_3): array_int_3;
  };
  GroupOps: {
    has_phase_shift(_0: array_int_3, _1: array_int_3): boolean;
  };
  Helix: {};
  Strand: {};
  Sheet: {};
  Connection: {};
  AtomAddress: {};
  AssemblyOperator: {};
  VectorAssemblyOperator: {
    new(): VectorAssemblyOperator;
  };
  AssemblyGen: {};
  Assembly: {};
  NcsOp: {};
  Metadata: {};
  SoftwareItem: {};
  ExperimentInfo: {};
  DiffractionInfo: {};
  ReflectionsInfo: {};
  CrystalInfo: {};
  BasicRefinementInfo: {};
  TlsGroupSelection: {};
  TlsGroup: {};
  Restr: {};
  RefinementInfo: {};
  Structure: {
    new(): Structure;
  };
  NearestImage: {};
  SiftsUnpResidue: {};
  Side: {};
  ChemLink: {};
  Plane: {};
  Chirality: {};
  Torsion: {};
  Angle: {};
  Bond: {};
  AtomId: {};
  Restraints: {
    lexicographic_str(_0: EmbindString, _1: EmbindString): string;
  };
  cifBlock: {};
  WriteOptions: {
    new(): WriteOptions;
  };
  cifDocument: {
    new(): cifDocument;
  };
  cifColumn: {};
  cifTableRow: {};
  cifTable: {};
  cifItem: {};
  cifLoop: {};
  cifItemSpan: {};
  cifLoopArg: {};
  cifFrameArg: {};
  cifCommentArg: {};
  AtomMod: {};
  ChemCompAtom: {};
  ChemCompAliasing: {};
  ChemComp: {
    read_group(_0: EmbindString): ChemCompGroup;
    is_peptide_group(_0: ChemCompGroup): boolean;
    is_nucleotide_group(_0: ChemCompGroup): boolean;
  };
  ChemMod: {};
  EnerLibAtom: {};
  EnerLibBond: {};
  EnerLib: {};
  MonLib: {
    relative_monomer_path(_0: EmbindString): string;
  };
  CRA: {};
  const_CRA: {};
  SelectionList: {};
  SelectionFlagList: {};
  SelectionSequenceId: {};
  SelectionAtomInequality: {};
  Selection: {
    new(_0: EmbindString): Selection;
  };
  ResidueInfo: {};
  SmallStructureSite: {};
  SmallStructureAtomType: {};
  SmallStructure: {};
  complexfloat: {
    new(_0: number, _1: number): complexfloat;
    new(_0: complexfloat): complexfloat;
  };
  HklValueComplexFloat: {};
  AsuDataComplexFloat: {};
  ReflnBlock: {};
  ReflnDataProxy: {};
  CifToMtzEntry: {};
  CifToMtz: {};
  MtzDataset: {};
  MtzColumn: {};
  MtzBatch: {};
  Mtz: {};
  MtzDataProxy: {};
  MtzExternalDataProxy: {};
  Ccp4Base: {};
  Ccp4: {};
  Ccp4Int8_t: {};
  DataStats: {};
  GridOp: {};
  GridMeta: {};
  GridBasePoint: {};
  GridBasePointInt8_t: {};
  GridBase: {};
  GridBaseInt8_t: {};
  Grid: {};
  GridInt8_t: {};
  BoxFractional: {};
  BoxPosition: {};
  AtomNameElement: {};
  VectorSequenceEntry: {
    new(): VectorSequenceEntry;
  };
  VectorLigandDictInfo: {
    new(): VectorLigandDictInfo;
  };
  VectorCompoundInfo: {
    new(): VectorCompoundInfo;
  };
  VectorSequenceResInfo: {
    new(): VectorSequenceResInfo;
  };
  VectorResidueBFactorInfo: {
    new(): VectorResidueBFactorInfo;
  };
  VectorLigandInfo: {
    new(): VectorLigandInfo;
  };
  VectorAtomInfo: {
    new(): VectorAtomInfo;
  };
  remove_non_selected_atoms(_0: Structure, _1: Selection): Structure;
  remove_selected_residues(_0: Structure, _1: Selection): Structure;
  count_residues_in_selection(_0: Structure, _1: Selection): number;
  get_pdb_string_from_gemmi_struct(_0: Structure): string;
  get_mmcif_string_from_gemmi_struct(_0: Structure): string;
  structure_is_ligand(_0: Structure): boolean;
  read_structure_from_string(_0: EmbindString, _1: EmbindString): Structure;
  read_string(_0: EmbindString): cifDocument;
  is_small_structure(_0: EmbindString): boolean;
  copy_to_assembly_to_new_structure(_0: Structure, _1: EmbindString): Structure;
  parse_ligand_dict_info(_0: EmbindString): VectorLigandDictInfo;
  read_structure_file(_0: EmbindString, _1: CoorFormat): Structure;
  read_mtz_file(_0: EmbindString): Mtz;
  get_spacegroup_by_name(_0: EmbindString): SpaceGroup;
  gemmi_setup_entities(_0: Structure): void;
  assign_subchains(_0: Structure, _1: boolean, _2: boolean): void;
  ensure_entities(_0: Structure): void;
  deduplicate_entities(_0: Structure): void;
  shorten_chain_names(_0: Structure): void;
  split_chains_by_segments(_0: Model, _1: HowToNameCopiedChain): void;
  check_polymer_type(_0: ConstResidueSpan, _1: boolean): PolymerType;
  make_one_letter_sequence(_0: ConstResidueSpan): string;
  gemmi_add_entity_types(_0: Structure, _1: boolean): void;
  remove_alternative_conformations_structure(_0: Structure): void;
  remove_alternative_conformations_model(_0: Model): void;
  remove_alternative_conformations_chain(_0: Chain): void;
  remove_waters_structure(_0: Structure): void;
  remove_waters_model(_0: Model): void;
  remove_waters_chain(_0: Chain): void;
  remove_ligands_and_waters_structure(_0: Structure): void;
  remove_ligands_and_waters_model(_0: Model): void;
  remove_ligands_and_waters_chain(_0: Chain): void;
  has_hydrogen(_0: Model): boolean;
  calculate_mass_model(_0: Model): number;
  calculate_mass_chain(_0: Chain): number;
  add_residue_chain(_0: Chain, _1: GemmiResidue, _2: number): GemmiResidue;
  add_residue_residuespan(_0: ResidueSpan, _1: GemmiResidue, _2: number): GemmiResidue;
  remove_hydrogens_structure(_0: Structure): void;
  remove_hydrogens_model(_0: Model): void;
  remove_hydrogens_residue(_0: GemmiResidue): void;
  trim_to_alanine_chain(_0: Chain): void;
  trim_to_alanine_residue(_0: GemmiResidue): boolean;
  setCifItemLoop(_0: cifItem, _1: cifLoop): void;
  setCifItemFrame(_0: cifItem, _1: cifBlock): void;
  getCifItemLoop(_0: cifItem): cifLoop;
  getCifItemFrame(_0: cifItem): cifBlock;
  getSpaceGroupHMAsString(_0: SpaceGroup): string;
  getNearestImagePBCShiftAsVector(_0: NearestImage): VectorInt;
  getSpaceGroupHallAsString(_0: SpaceGroup): string;
  getSpaceGroupQualifierAsString(_0: SpaceGroup): string;
  getElementNameAsString(_0: Element): string;
  cif_parse_string(_0: cifDocument, _1: EmbindString): void;
  get_atom_info_for_selection(_0: Structure, _1: EmbindString, _2: EmbindString): VectorAtomInfo;
  get_ligand_info_for_structure(_0: Structure): VectorLigandInfo;
  get_sequence_info(_0: Structure, _1: EmbindString): VectorSequenceEntry;
  get_structure_bfactors(_0: Structure): VectorResidueBFactorInfo;
  guess_coord_data_format(_0: EmbindString): number;
  parse_multi_cids(_0: Structure, _1: EmbindString): VectorString;
  get_non_selected_cids(_0: Structure, _1: EmbindString): VectorString;
  parse_mon_lib_list_cif(_0: EmbindString): VectorCompoundInfo;
  setCifItemPair(_0: cifItem, _1: array_string_2): void;
  getCifItemPair(_0: cifItem): array_string_2;
  VectorGemmiFTransform: {
    new(): VectorGemmiFTransform;
  };
  VectorGemmiChemCompAtom: {
    new(): VectorGemmiChemCompAtom;
  };
  VectorInt8_t: {
    new(): VectorInt8_t;
  };
  VectorMiller: {
    new(): VectorMiller;
  };
  DisplayMode: {Standard: DisplayModeValue<0>, AtomIndices: DisplayModeValue<1>, AtomNames: DisplayModeValue<2>};
  DrawingCommandVector: {
    new(): DrawingCommandVector;
  };
  PathElementVector: {
    new(): PathElementVector;
  };
  TextMeasurementCache: {
    new(): TextMeasurementCache;
  };
  Renderer: {
    new(_0: any): Renderer;
    new(_0: any, _1: TextMeasurementCache): Renderer;
  };
  PathElement: {};
  Path: {};
  TextPositioning: {Normal: TextPositioningValue<0>, Sub: TextPositioningValue<1>, Super: TextPositioningValue<2>};
  TextStyle: {
    new(): TextStyle;
  };
  TextSpan: {
    new(): TextSpan;
    new(_0: TextSpanVector): TextSpan;
  };
  TextSpanVector: {
    new(): TextSpanVector;
  };
  Text: {
    new(): Text;
  };
  DrawingCommand: {};
  DeleteTool: {
    new(): DeleteTool;
  };
  ChargeModifier: {
    new(): ChargeModifier;
  };
  GeometryModifier: {
    new(): GeometryModifier;
  };
  FormatTool: {
    new(): FormatTool;
  };
  RemoveHydrogensTool: {
    new(): RemoveHydrogensTool;
  };
  LhasaElement: {C: LhasaElementValue<0>, N: LhasaElementValue<1>, O: LhasaElementValue<2>, S: LhasaElementValue<3>, P: LhasaElementValue<4>, H: LhasaElementValue<5>, F: LhasaElementValue<6>, Cl: LhasaElementValue<7>, Br: LhasaElementValue<8>, I: LhasaElementValue<9>};
  ElementInsertion: {
    new(_0: LhasaElement): ElementInsertion;
  };
  element_insertion_from_symbol(_0: EmbindString): ElementInsertion;
  LhasaStructure: {CycloPropaneRing: LhasaStructureValue<0>, CycloButaneRing: LhasaStructureValue<1>, CycloPentaneRing: LhasaStructureValue<2>, CycloHexaneRing: LhasaStructureValue<3>, BenzeneRing: LhasaStructureValue<4>, CycloHeptaneRing: LhasaStructureValue<5>, CycloOctaneRing: LhasaStructureValue<6>};
  StructureInsertion: {
    new(_0: LhasaStructure): StructureInsertion;
  };
  BondModifierMode: {Single: BondModifierModeValue<0>, Double: BondModifierModeValue<1>, Triple: BondModifierModeValue<2>};
  BondModifier: {
    new(_0: BondModifierMode): BondModifier;
  };
  TransformMode: {Rotation: TransformModeValue<0>, Translation: TransformModeValue<1>};
  TransformTool: {
    new(_0: TransformMode): TransformTool;
  };
  FlipMode: {Horizontal: FlipModeValue<0>, Vertical: FlipModeValue<1>};
  FlipTool: {
    new(_0: FlipMode): FlipTool;
  };
  ActiveTool: {
    new(): ActiveTool;
  };
  make_active_tool(_0: any): ActiveTool;
  ImplWidgetCoreData: {};
  SmilesMap: {
    new(): SmilesMap;
  };
  MoleculeIdVector: {
    new(): MoleculeIdVector;
  };
  Canvas: {
    new(): Canvas;
  };
  append_from_smiles(_0: Canvas, _1: EmbindString): number;
  append_from_pickle_base64(_0: Canvas, _1: EmbindString): number;
}

export type MainModule = WasmModule & typeof RuntimeExports & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
