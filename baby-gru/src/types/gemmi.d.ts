import { emscriptem } from "./emscriptem"

// Comprehensive gemmi TypeScript declarations.
// Generated from Emscripten embind --emit-tsd output.
// Covers: Structure hierarchy, CIF, MTZ, metadata, symmetry, selection, chemistry.

export namespace gemmi {
    interface CRA extends emscriptem.instance<CRA> {
        chain: Chain
        residue: Residue
        atom: Atom
    }
    interface const_CRA extends emscriptem.instance<const_CRA> {
        chain: Chain
        residue: Residue
        atom: Atom
    }
    interface SeqId extends emscriptem.instance<SeqId> {
        num: number
        icode: emscriptem.instance<string>;
        has_icode: () => boolean;
        str: () => string;
    }
    interface AtomAddress extends emscriptem.instance<AtomAddress> {
        chain_name: emscriptem.instance<string>;
        res_id: emscriptem.instance<string>;
        atom_name: emscriptem.instance<string>;
        altloc: emscriptem.instance<string>;
        str: () => string;
    }
    interface NeighborSearch extends emscriptem.instance<NeighborSearch> {
        populate: (arg0: boolean) => void;
        //find_atoms: (arg0: Position, arg1: string, arg2: number) => emscriptem.vector<Mark>;
        //find_neighbors: (arg0: Atom, arg1: number, ag2: number) =>  emscriptem.vector<Mark>;
    }
    /** Biological assembly with symmetry operators for generating oligomers. */
    interface Assembly extends emscriptem.instance<Assembly> {
      get name(): string;
      set name(value: string);
      author_determined: boolean;
      software_determined: boolean;
      special_kind: SpecialKind;
      oligomeric_count: number;
      get oligomeric_details(): string;
      set oligomeric_details(value: string);
      get software_name(): string;
      set software_name(value: string);
      absa: number;
      ssa: number;
      more: number;
      generators: emscriptem.vector<AssemblyGen>;
    }
    interface AssemblyGen extends emscriptem.instance<AssemblyGen> {
      chains: emscriptem.vector<string>;
      subchains: emscriptem.vector<string>;
      operators: VectorAssemblyOperator;
    }
    interface AssemblyOperator extends emscriptem.instance<AssemblyOperator> {
      get name(): string;
      set name(value: string);
      get type(): string;
      set type(value: string);
      transform: Transform;
    }
    interface AsuDataComplexFloat extends emscriptem.instance<AsuDataComplexFloat> {
      v: emscriptem.vector<HklValueComplexFloat>;
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
    /** An atom with coordinates, element, B-factor, occupancy, altloc. */
    interface Atom extends emscriptem.instance<Atom> {
      get name(): string;
      set name(value: string);
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
      empty_copy(): Atom;
    }
    interface AtomAddress extends emscriptem.instance<AtomAddress> {
      get chain_name(): string;
      set chain_name(value: string);
      res_id: ResidueId;
      get atom_name(): string;
      set atom_name(value: string);
      altloc: number;
      str(): string;
    }
    interface AtomGroup extends ItemGroupAtom {
      name(): string;
      by_altloc(_0: number): Atom;
    }
    interface AtomMod extends emscriptem.instance<AtomMod> {
      func: number;
      get old_id(): string;
      set old_id(value: string);
      get new_id(): string;
      set new_id(value: string);
      el: Element;
      charge: number;
      get chem_type(): string;
      set chem_type(value: string);
    }
    interface AtomNameElement extends emscriptem.instance<AtomNameElement> {
      get atom_name(): string;
      set atom_name(value: string);
      el: El;
    }
    /** Basic refinement stats: resolution, completeness, R-factors. */
    interface BasicRefinementInfo extends emscriptem.instance<BasicRefinementInfo> {
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
    interface BoxFractional extends emscriptem.instance<BoxFractional> {
      minimum: Fractional;
      maximum: Fractional;
      get_size(): Fractional;
      add_margin(_0: number): void;
    }
    interface BoxPosition extends emscriptem.instance<BoxPosition> {
      minimum: Position;
      maximum: Position;
      get_size(): Position;
      add_margin(_0: number): void;
    }
    interface CRA extends emscriptem.instance<CRA> {
    }
    /** CCP4/MRC map file with header and grid data. */
    interface Ccp4 extends Ccp4Base {
      prepare_ccp4_header_except_mode_and_stats(): void;
      update_ccp4_header(_0: number, _1: boolean): void;
      full_cell(): boolean;
      setup(_0: number, _1: MapSetup): void;
      read_ccp4_file(_0: string): void;
      write_ccp4_map(_0: string): void;
      set_extent(_0: BoxFractional): void;
    }
    interface Ccp4Base extends emscriptem.instance<Ccp4Base> {
      ccp4_header: emscriptem.vector<number>;
      same_byte_order: boolean;
      hstats: DataStats;
      header_i32(_0: number): number;
      header_float(_0: number): number;
      header_str(_0: number, _1: number): string;
      set_header_i32(_0: number, _1: number): void;
      set_header_3i32(_0: number, _1: number, _2: number, _3: number): void;
      set_header_float(_0: number, _1: number): void;
      set_header_str(_0: number, _1: string): void;
      header_rfloat(_0: number): number;
      has_skew_transformation(): boolean;
      get_skew_transformation(): Transform;
      get_extent(): BoxFractional;
    }
    /** Polymer or non-polymer chain. Contains residues. */
    interface Chain extends emscriptem.instance<Chain> {
      get name(): string;
      set name(value: string);
      residues: emscriptem.vector<Residue>;
      readonly empty_copy: Chain;
      subchains_const(): emscriptem.vector<ConstResidueSpan>;
      children_const(): emscriptem.vector<Residue>;
      subchains(): emscriptem.vector<ResidueSpan>;
      children(): emscriptem.vector<Residue>;
      whole_const(): ConstResidueSpan;
      get_polymer_const(): ConstResidueSpan;
      get_ligands_const(): ConstResidueSpan;
      get_waters_const(): ConstResidueSpan;
      get_subchain_const(_0: string): ConstResidueSpan;
      whole(): ResidueSpan;
      get_polymer(): ResidueSpan;
      get_ligands(): ResidueSpan;
      get_waters(): ResidueSpan;
      get_subchain(_0: string): ResidueSpan;
      find_residue_group_const(_0: SeqId): ConstResidueGroup;
      find_residue_group(_0: SeqId): ResidueGroup;
      is_first_in_group(_0: Residue): boolean;
    }
    /** Chemical component (monomer library entry) with atoms and restraints. */
    interface ChemComp extends emscriptem.instance<ChemComp> {
      get name(): string;
      set name(value: string);
      get type_or_group(): string;
      set type_or_group(value: string);
      group: ChemCompGroup;
      aliases: emscriptem.vector<ChemCompAliasing>;
      rt: Restraints;
      atoms: emscriptem.vector<ChemCompAtom>;
      get_aliasing(_0: ChemCompGroup): ChemCompAliasing;
      set_group(_0: string): void;
      has_atom(_0: string): boolean;
      get_atom_index(_0: string): number;
      get_atom(_0: string): ChemCompAtom;
      remove_nonmatching_restraints(): void;
      remove_hydrogens(): ChemComp;
    }
    interface ChemCompAliasing extends emscriptem.instance<ChemCompAliasing> {
      group: ChemCompGroup;
    }
    interface ChemCompAtom extends emscriptem.instance<ChemCompAtom> {
      get id(): string;
      set id(value: string);
      el: Element;
      charge: number;
      get chem_type(): string;
      set chem_type(value: string);
      is_hydrogen(): boolean;
    }
    interface ChemLink extends emscriptem.instance<ChemLink> {
      get id(): string;
      set id(value: string);
      get name(): string;
      set name(value: string);
      side1: ChemLinkSide;
      side2: ChemLinkSide;
      rt: Restraints;
      block: cifBlock;
    }
    interface ChemLinkSide extends emscriptem.instance<ChemLinkSide> {
      get comp(): string;
      set comp(value: string);
      get mod(): string;
      set mod(value: string);
      group: ChemCompGroup;
      matches_group(_0: ChemCompGroup): boolean;
      specificity(): number;
    }
    interface ChemMod extends emscriptem.instance<ChemMod> {
      get id(): string;
      set id(value: string);
      get name(): string;
      set name(value: string);
      get comp_id(): string;
      set comp_id(value: string);
      get group_id(): string;
      set group_id(value: string);
      atom_mods: any;
      rt: Restraints;
      block: cifBlock;
      apply_to(_0: ChemComp, _1: ChemCompGroup): void;
    }
    /** Converter from CIF reflection data to MTZ format. */
    interface CifToMtz extends emscriptem.instance<CifToMtz> {
      verbose: boolean;
      force_unmerged: boolean;
      get title(): string;
      set title(value: string);
      history: emscriptem.vector<string>;
      spec_lines: emscriptem.vector<string>;
    }
    interface CifToMtzEntry extends emscriptem.instance<CifToMtzEntry> {
      get refln_tag(): string;
      set refln_tag(value: string);
      get col_label(): string;
      set col_label(value: string);
      col_type: number;
      dataset_id: number;
      translate_code_to_number(_0: string): number;
    }
    interface Connection extends emscriptem.instance<Connection> {
      get name(): string;
      set name(value: string);
      get link_id(): string;
      set link_id(value: string);
      type: ConnectionType;
      asu: Asu;
      reported_distance: number;
      partner1: AtomAddress;
      partner2: AtomAddress;
    }
    interface ConstResidueGroup extends ConstResidueSpan {
      by_resname(_0: string): Residue;
    }
    interface ConstResidueSpan extends SpanConstResidue {
      length(): number;
      subchain_id(): string;
      extract_sequence(): emscriptem.vector<string>;
      extreme_num(_0: boolean, _1: number): OptionalNum;
      find_residue_group(_0: SeqId): ConstResidueGroup;
      label_seq_id_to_auth(_0: OptionalNum): SeqId;
      auth_seq_id_to_label(_0: SeqId): OptionalNum;
    }
    /** Crystallization conditions: pH, method, temperature. */
    interface CrystalInfo extends emscriptem.instance<CrystalInfo> {
      get id(): string;
      set id(value: string);
      get description(): string;
      set description(value: string);
      ph: number;
      get ph_range(): string;
      set ph_range(value: string);
      diffractions: emscriptem.vector<DiffractionInfo>;
    }
    interface DataStats extends emscriptem.instance<DataStats> {
      dmin: number;
      dmax: number;
      dmean: number;
      rms: number;
      nan_count: number;
    }
    /** Diffraction source, detector, beamline, wavelength information. */
    interface DiffractionInfo extends emscriptem.instance<DiffractionInfo> {
      get id(): string;
      set id(value: string);
      temperature: number;
      get source(): string;
      set source(value: string);
      get source_type(): string;
      set source_type(value: string);
      get synchrotron(): string;
      set synchrotron(value: string);
      get beamline(): string;
      set beamline(value: string);
      get wavelengths(): string;
      set wavelengths(value: string);
      get scattering_type(): string;
      set scattering_type(value: string);
      mono_or_laue: number;
      get monochromator(): string;
      set monochromator(value: string);
      get collection_date(): string;
      set collection_date(value: string);
      get optics(): string;
      set optics(value: string);
      get detector(): string;
      set detector(value: string);
      get detector_make(): string;
      set detector_make(value: string);
    }
    /** Chemical element with atomic properties (number, weight, radii). */
    interface Element extends emscriptem.instance<Element> {
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
    interface EnerLib extends emscriptem.instance<EnerLib> {
      read(_0: cifDocument): void;
    }
    interface EnerLibAtom extends emscriptem.instance<EnerLibAtom> {
      element: Element;
      hb_type: number;
      vdw_radius: number;
      vdwh_radius: number;
      ion_radius: number;
      valency: number;
      sp: number;
    }
    interface EnerLibBond extends emscriptem.instance<EnerLibBond> {
      get atom_type_2(): string;
      set atom_type_2(value: string);
      type: BondType;
      length: number;
      value_esd: number;
    }
    /** Molecular entity (polymer, non-polymer, water) with sequence info. */
    interface Entity extends emscriptem.instance<Entity> {
      get name(): string;
      set name(value: string);
      subchains: emscriptem.vector<string>;
      entity_type: EntityType;
      polymer_type: PolymerType;
      sifts_unp_acc: emscriptem.vector<string>;
      full_sequence: emscriptem.vector<string>;
      dbrefs: emscriptem.vector<EntityDbRef>;
    }
    interface EntityDbRef extends emscriptem.instance<EntityDbRef> {
      get db_name(): string;
      set db_name(value: string);
      get accession_code(): string;
      set accession_code(value: string);
      get id_code(): string;
      set id_code(value: string);
      get isoform(): string;
      set isoform(value: string);
      seq_begin: SeqId;
      seq_end: SeqId;
      db_begin: SeqId;
      db_end: SeqId;
      label_seq_begin: OptionalNum;
      label_seq_end: OptionalNum;
    }
    /** Experimental method and conditions. */
    interface ExperimentInfo extends emscriptem.instance<ExperimentInfo> {
      get method(): string;
      set method(value: string);
      number_of_crystals: number;
      unique_reflections: number;
      b_wilson: number;
      shells: emscriptem.vector<ReflectionsInfo>;
      diffraction_ids: emscriptem.vector<string>;
      reflections: ReflectionsInfo;
    }
    interface FTransform extends Transform {
      apply(_0: Fractional): Fractional;
    }
    /** 3D position in fractional coordinates. Has x, y, z. */
    interface Fractional extends Vec3 {
      wrap_to_unit(): Fractional;
      wrap_to_zero(): Fractional;
      round(): Fractional;
      move_toward_zero_by_one(): void;
    }
    /** 3D grid (electron density map). */
    interface Grid extends emscriptem.instance<Grid> {
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
    interface GridMeta extends emscriptem.instance<GridMeta> {
      unit_cell: UnitCell;
      nu: number;
      nv: number;
      nw: number;
      axis_order: AxisOrder;
      point_count(): number;
      get_fractional(_0: number, _1: number, _2: number): Fractional;
      get_position(_0: number, _1: number, _2: number): Position;
      get_scaled_ops_except_id(): emscriptem.vector<GridOp>;
      index_q_int(_0: number, _1: number, _2: number): number;
      index_q_size_t(_0: number, _1: number, _2: number): number;
      index_n(_0: number, _1: number, _2: number): number;
      index_near_zero(_0: number, _1: number, _2: number): number;
    }
    interface GridOp extends emscriptem.instance<GridOp> {
      scaled_op: Op;
    }
    interface GroupOps extends emscriptem.instance<GroupOps> {
      sym_ops: emscriptem.vector<Op>;
      order(): number;
      add_missing_elements(): void;
      add_missing_elements_part2(_0: emscriptem.vector<Op>, _1: number, _2: boolean): void;
      add_inversion(): boolean;
      find_centering(): number;
      is_centrosymmetric(): boolean;
      change_basis_impl(_0: Op, _1: Op): void;
      change_basis_forward(_0: Op): void;
      change_basis_backward(_0: Op): void;
      all_ops_sorted(): emscriptem.vector<Op>;
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
    interface Helix extends emscriptem.instance<Helix> {
      pdb_helix_class: HelixClass;
      length: number;
      start: AtomAddress;
      end: AtomAddress;
      set_helix_class_as_int(_0: number): void;
    }
    interface HklValueComplexFloat extends emscriptem.instance<HklValueComplexFloat> {
      value: complexfloat;
      hkl: array_int_3;
    }
    interface ItemGroupAtom extends emscriptem.instance<ItemGroupAtom> {
      size(): number;
      extent(): number;
      empty(): boolean;
      front(): Atom;
      front_const(): Atom;
      back(): Atom;
      back_const(): Atom;
    }
    interface Mark extends emscriptem.instance<Mark> {
      altloc: number;
      element: Element;
      image_idx: number;
      chain_idx: number;
      residue_idx: number;
      atom_idx: number;
    }
    /** 3x3 matrix with arithmetic and decomposition operations. */
    interface Mat33 extends emscriptem.instance<Mat33> {
      multiplyMat33(_0: Mat33): Mat33;
      transpose(): Mat33;
      trace(): number;
      approx(_0: Mat33, _1: number): boolean;
      determinant(): number;
      inverse(): Mat33;
      is_identity(): boolean;
      column_dot(_0: number, _1: number): number;
      row_copy(_0: number): Vec3;
      column_copy(_0: number): Vec3;
      multiplyVec3(_0: Vec3): Vec3;
      left_multiply(_0: Vec3): Vec3;
      multiply_by_diagonal(_0: Vec3): Mat33;
      as_array(): array_native_double_9;
    }
    /** Structure metadata: refinement stats, experiments, software, crystals. */
    interface Metadata extends emscriptem.instance<Metadata> {
      authors: emscriptem.vector<string>;
      experiments: emscriptem.vector<ExperimentInfo>;
      crystals: emscriptem.vector<CrystalInfo>;
      refinement: emscriptem.vector<RefinementInfo>;
      software: emscriptem.vector<SoftwareItem>;
      get solved_by(): string;
      set solved_by(value: string);
      get starting_model(): string;
      set starting_model(value: string);
      get remark_300_detail(): string;
      set remark_300_detail(value: string);
      has_restr(): boolean;
      has_tls(): boolean;
    }
    /** A single model in a structure. Contains chains. */
    interface Model extends emscriptem.instance<Model> {
      num: number;
      /** Model number (aliased as "name" in embind; gemmi::Model has no string name) */
      name: number;
      chains: emscriptem.vector<Chain>;
      remove_chain(_0: string): void;
      merge_chain_parts(_0: number): void;
      subchains(): emscriptem.vector<ResidueSpan>;
      subchains(): emscriptem.vector<ConstResidueSpan>;
      get_all_residue_names(): emscriptem.vector<string>;
      empty_copy(): Model;
      children(): emscriptem.vector<Chain>;
      children_const(): emscriptem.vector<Chain>;
      get_subchain_const(_0: string): ConstResidueSpan;
      get_subchain(_0: string): ResidueSpan;
      find_residue_group(_0: string, _1: SeqId): ResidueGroup;
      sole_residue(_0: string, _1: SeqId): Residue;
      find_cra(_0: AtomAddress, _1: boolean): CRA;
      find_cra_const(_0: AtomAddress, _1: boolean): const_CRA;
    }
    /** Monomer library for chemical component dictionaries. */
    interface MonLib extends emscriptem.instance<MonLib> {
      get monomer_dir(): string;
      set monomer_dir(value: string);
      ener_lib: EnerLib;
      add_monomer_if_present(_0: cifBlock): void;
      path(_0: string): string;
      read_monomer_doc(_0: cifDocument): void;
      set_monomer_dir(_0: string): void;
      find_ideal_distance(_0: const_CRA, _1: const_CRA): number;
    }
    /** MTZ reflection file. Contains columns, datasets, batches, cell, symmetry. */
    interface Mtz extends emscriptem.instance<Mtz> {
      get source_path(): string;
      set source_path(value: string);
      same_byte_order: boolean;
      indices_switched_to_original: boolean;
      header_offset: bigint;
      get version_stamp(): string;
      set version_stamp(value: string);
      get title(): string;
      set title(value: string);
      nreflections: number;
      min_1_d2: number;
      max_1_d2: number;
      valm: number;
      get title(): string;
      set title(value: string);
      nsymop: number;
      cell: UnitCell;
      spacegroup_number: number;
      get spacegroup_name(): string;
      set spacegroup_name(value: string);
      symops: emscriptem.vector<Op>;
      datasets: emscriptem.vector<MtzDataset>;
      columns: emscriptem.vector<MtzColumn>;
      batches: emscriptem.vector<MtzBatch>;
      history: emscriptem.vector<string>;
      get appended_text(): string;
      set appended_text(value: string);
      data: emscriptem.vector<number>;
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
      count(_0: string): number;
      count_type(_0: number): number;
      positions_of_columns_with_type(_0: number): emscriptem.vector<number>;
      has_data(): boolean;
      is_merged(): boolean;
      update_reso(): void;
      toggle_endianness(): void;
      setup_spacegroup(): void;
      read_file(_0: string): void;
      sorted_row_indices(_0: number): emscriptem.vector<number>;
      sort(_0: number): boolean;
      ensure_asu(_0: boolean): void;
      switch_to_original_hkl(): boolean;
      switch_to_asu_hkl(): boolean;
      add_dataset(_0: string): MtzDataset;
      add_column(_0: string, _1: number, _2: number, _3: number, _4: boolean): MtzColumn;
      replace_column(_0: number, _1: MtzColumn, _2: emscriptem.vector<string>): MtzColumn;
      copy_column(_0: number, _1: MtzColumn, _2: emscriptem.vector<string>): MtzColumn;
      remove_column(_0: number): void;
      expand_data_rows(_0: number, _1: number): void;
      get_hkl(_0: number): array_int_3;
      set_hkl(_0: number, _1: array_int_3): void;
      calculate_min_max_1_d2(): array_double_2;
    }
    /** MTZ batch header for unmerged data. */
    interface MtzBatch extends emscriptem.instance<MtzBatch> {
      number: number;
      get title(): string;
      set title(value: string);
      ints: emscriptem.vector<number>;
      floats: emscriptem.vector<number>;
      axes: emscriptem.vector<string>;
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
    /** A single column in an MTZ file (e.g. FP, SIGFP, FWT, PHWT). */
    interface MtzColumn extends emscriptem.instance<MtzColumn> {
      dataset_id: number;
      type: number;
      get label(): string;
      set label(value: string);
      min_value: number;
      max_value: number;
      get source(): string;
      set source(value: string);
      idx: number;
      dataset(): MtzDataset;
      dataset_const(): MtzDataset;
      has_data(): boolean;
      size(): number;
      stride(): number;
      is_integer(): boolean;
    }
    interface MtzDataProxy extends emscriptem.instance<MtzDataProxy> {
      stride(): number;
      size(): number;
      get_num(_0: number): number;
      unit_cell(): UnitCell;
      column_index(_0: string): number;
      get_hkl(_0: number): array_int_3;
    }
    /** MTZ dataset with project/crystal/dataset names and wavelength. */
    interface MtzDataset extends emscriptem.instance<MtzDataset> {
      id: number;
      get project_name(): string;
      set project_name(value: string);
      get crystal_name(): string;
      set crystal_name(value: string);
      get dataset_name(): string;
      set dataset_name(value: string);
      cell: UnitCell;
      wavelength: number;
    }
    interface MtzExternalDataProxy extends MtzDataProxy {
      size(): number;
      get_num(_0: number): number;
      get_hkl(_0: number): array_int_3;
    }
    interface MutableVectorSpanResidue extends SpanResidue {
      is_beginning(): boolean;
      is_ending(): boolean;
    }
    interface NcsOp extends emscriptem.instance<NcsOp> {
      get id(): string;
      set id(value: string);
      given: boolean;
      tr: Transform;
      apply(_0: Position): Position;
    }
    /** Result of finding the nearest symmetry image of a position. */
    interface NearestImage extends emscriptem.instance<NearestImage> {
      dist_sq: number;
      sym_idx: number;
      dist(): number;
      same_asu(): boolean;
      symmetry_code(_0: boolean): string;
    }
    /** Spatial neighbor search for atoms within a distance cutoff. */
    interface NeighborSearch extends emscriptem.instance<NeighborSearch> {
      radius_specified: number;
      include_h: boolean;
      add_chain(_0: Chain, _1: boolean): void;
      dist(_0: Position, _1: Position): number;
      populate(_0: boolean): NeighborSearch;
    }
    /** Symmetry operation (rotation + translation in fractional coordinates). */
    interface Op extends emscriptem.instance<Op> {
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
    interface OptionalNum extends emscriptem.instance<OptionalNum> {
      value: number;
      has_value(): boolean;
      str(_0: number): string;
    }
    /** 3D position in orthogonal (Angstrom) coordinates. Has x, y, z. */
    interface Position extends Vec3 {
    }
    /** Refinement statistics: R-factors, resolution, reflection counts, TLS. */
    interface RefinementInfo extends BasicRefinementInfo {
      get id(): string;
      set id(value: string);
      get cross_validation_method(): string;
      set cross_validation_method(value: string);
      get rfree_selection_method(): string;
      set rfree_selection_method(value: string);
      bin_count: number;
      bins: emscriptem.vector<BasicRefinementInfo>;
      mean_b: number;
      aniso_b: SMat33double;
      luzzati_error: number;
      dpi_blow_r: number;
      dpi_blow_rfree: number;
      dpi_cruickshank_r: number;
      dpi_cruickshank_rfree: number;
      restr_stats: any;
      tls_groups: emscriptem.vector<TlsGroup>;
      get remarks(): string;
      set remarks(value: string);
    }
    /** Reflection data statistics: resolution, completeness, redundancy. */
    interface ReflectionsInfo extends emscriptem.instance<ReflectionsInfo> {
      resolution_high: number;
      resolution_low: number;
      completeness: number;
      redundancy: number;
      r_merge: number;
      r_sym: number;
      mean_I_over_sigma: number;
    }
    /** Structure factor CIF block for SF-CIF files. */
    interface ReflnBlock extends emscriptem.instance<ReflnBlock> {
      block: cifBlock;
      get entry_id(): string;
      set entry_id(value: string);
      cell: UnitCell;
      wavelength: number;
      ok(): boolean;
      check_ok(): void;
      tag_offset(): number;
      use_unmerged(_0: boolean): void;
      is_unmerged(): boolean;
      column_labels(): emscriptem.vector<string>;
      find_column_index(_0: string): number;
      get_column_index(_0: string): number;
      make_1_d2_vector(): emscriptem.vector<number>;
      make_d_vector(): emscriptem.vector<number>;
      get_hkl_column_indices(): array_size_t_3;
      make_miller_vector(): VectorMiller;
    }
    interface ReflnDataProxy extends emscriptem.instance<ReflnDataProxy> {
      hkl_cols_: array_size_t_3;
      stride(): number;
      size(): number;
      get_num(_0: number): number;
      unit_cell(): UnitCell;
      column_index(_0: string): number;
      get_hkl(_0: number): array_int_3;
    }
    /** A residue (amino acid, nucleotide, ligand, water). Contains atoms. */
    interface Residue extends ResidueId {
      get subchain(): string;
      set subchain(value: string);
      get entity_id(): string;
      set entity_id(value: string);
      label_seq: OptionalNum;
      entity_type: EntityType;
      het_flag: number;
      flag: number;
      atoms: emscriptem.vector<Atom>;
      sifts_unp: SiftsUnpResidue;
      empty_copy(): Residue;
      children(): emscriptem.vector<Atom>;
      children_const(): emscriptem.vector<Atom>;
      same_conformer(_0: Residue): boolean;
      is_water(): boolean;
      sole_atom(_0: string): Atom;
      get(_0: string): AtomGroup;
    }
    interface ResidueGroup extends emscriptem.instance<ResidueGroup> {
      remove_residue(_0: string): void;
      by_resname(_0: string): Residue;
    }
    interface ResidueId extends emscriptem.instance<ResidueId> {
      seqid: SeqId;
      get segment(): string;
      set segment(value: string);
      get name(): string;
      set name(value: string);
      group_key(): SeqId;
      matches(_0: ResidueId): boolean;
      matches_noseg(_0: ResidueId): boolean;
    }
    /** Residue classification: amino acid, nucleotide, water, weight. */
    interface ResidueInfo extends emscriptem.instance<ResidueInfo> {
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
    interface ResidueSpan extends MutableVectorSpanResidue {
      length(): number;
      subchain_id(): string;
      extreme_num(_0: boolean, _1: number): OptionalNum;
      find_residue_group(_0: SeqId): ResidueGroup;
      find_residue_group_const(_0: SeqId): ConstResidueGroup;
      label_seq_id_to_auth(_0: OptionalNum): SeqId;
      auth_seq_id_to_label(_0: SeqId): OptionalNum;
    }
    interface Restr extends emscriptem.instance<Restr> {
      get name(): string;
      set name(value: string);
      count: number;
      weight: number;
      get function(): string;
      set function(value: string);
      dev_ideal: number;
    }
    /** Geometric restraints: bonds, angles, torsions, chirality, planes. */
    interface Restraints extends emscriptem.instance<Restraints> {
      bonds: any;
      angles: any;
      torsions: any;
      chirs: any;
      planes: any;
      empty(): boolean;
      find_shortest_path(_0: RestraintsAtomId, _1: RestraintsAtomId, _2: any): any;
      chiral_abs_volume(_0: RestraintsChirality): number;
      get_or_add_plane(_0: string): RestraintsPlane;
      rename_atom(_0: RestraintsAtomId, _1: string): void;
    }
    interface RestraintsAngle extends emscriptem.instance<RestraintsAngle> {
      id1: RestraintsAtomId;
      id2: RestraintsAtomId;
      id3: RestraintsAtomId;
      radians(): number;
      str(): string;
    }
    interface RestraintsAtomId extends emscriptem.instance<RestraintsAtomId> {
      comp: number;
      get atom(): string;
      set atom(value: string);
    }
    interface RestraintsBond extends emscriptem.instance<RestraintsBond> {
      type: BondType;
      aromatic: boolean;
      value: number;
      esd: number;
      value_nucleus: number;
      esd_nucleus: number;
      id1: RestraintsAtomId;
      id2: RestraintsAtomId;
      str(): string;
      lexicographic_str(): string;
      distance(_0: DistanceOf): number;
    }
    interface RestraintsChirality extends emscriptem.instance<RestraintsChirality> {
      sign: ChiralityType;
      id_ctr: RestraintsAtomId;
      id1: RestraintsAtomId;
      id2: RestraintsAtomId;
      id3: RestraintsAtomId;
      is_wrong(_0: number): boolean;
      str(): string;
      str(): string;
    }
    interface RestraintsPlane extends emscriptem.instance<RestraintsPlane> {
      get label(): string;
      set label(value: string);
      ids: any;
      esd: number;
      str(): string;
    }
    interface RestraintsTorsion extends emscriptem.instance<RestraintsTorsion> {
      value: number;
      esd: number;
      period: number;
      id1: RestraintsAtomId;
      id2: RestraintsAtomId;
      id3: RestraintsAtomId;
      id4: RestraintsAtomId;
    }
    /** CID-based atom selection (e.g. "//A/31-33/*"). */
    interface Selection extends emscriptem.instance<Selection> {
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
      atom_inequalities: emscriptem.vector<SelectionAtomInequality>;
      str(): string;
      matches_structure(_0: Structure): boolean;
      matches_model(_0: Model): boolean;
      matches_chain(_0: Chain): boolean;
      matches_residue(_0: Residue): boolean;
      matches_atom(_0: Atom): boolean;
      matches_cra(_0: CRA): boolean;
      first_in_model(_0: Model): CRA;
      set_residue_flags(_0: string): Selection;
      set_atom_flags(_0: string): Selection;
      remove_selected_residue(_0: Residue): void;
      remove_not_selected_residue(_0: Residue): void;
    }
    interface SelectionAtomInequality extends emscriptem.instance<SelectionAtomInequality> {
      property: number;
      relation: number;
      value: number;
      matches(_0: Atom): boolean;
      str(): string;
    }
    interface SelectionFlagList extends emscriptem.instance<SelectionFlagList> {
      get pattern(): string;
      set pattern(value: string);
      has(_0: number): boolean;
    }
    interface SelectionList extends emscriptem.instance<SelectionList> {
      all: boolean;
      inverted: boolean;
      get list(): string;
      set list(value: string);
      str(): string;
      has(_0: string): boolean;
    }
    interface SelectionSequenceId extends emscriptem.instance<SelectionSequenceId> {
      seqnum: number;
      icode: number;
      empty(): boolean;
      str(): string;
      compare(_0: SeqId): number;
    }
    interface SeqId extends emscriptem.instance<SeqId> {
      num: OptionalNum;
      icode: number;
      has_icode(): number;
      str(): string;
    }
    interface Sheet extends emscriptem.instance<Sheet> {
      get name(): string;
      set name(value: string);
      strands: any;
    }
    interface SiftsUnpResidue extends emscriptem.instance<SiftsUnpResidue> {
      res: number;
      acc_index: number;
      num: number;
    }
    /** Small molecule crystal structure (from CIF). */
    interface SmallStructure extends emscriptem.instance<SmallStructure> {
      get name(): string;
      set name(value: string);
      cell: UnitCell;
      get spacegroup_hm(): string;
      set spacegroup_hm(value: string);
      sites: emscriptem.vector<SmallStructureSite>;
      atom_types: emscriptem.vector<SmallStructureAtomType>;
      wavelength: number;
      get_all_unit_cell_sites(): emscriptem.vector<SmallStructureSite>;
      remove_hydrogens(): void;
      change_occupancies_to_crystallographic(_0: number): void;
      setup_cell_images(): void;
    }
    interface SmallStructureAtomType extends emscriptem.instance<SmallStructureAtomType> {
      get symbol(): string;
      set symbol(value: string);
      element: Element;
      charge: number;
      dispersion_real: number;
      dispersion_imag: number;
    }
    interface SmallStructureSite extends emscriptem.instance<SmallStructureSite> {
      get label(): string;
      set label(value: string);
      get type_symbol(): string;
      set type_symbol(value: string);
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
    interface SoftwareItem extends emscriptem.instance<SoftwareItem> {
      get name(): string;
      set name(value: string);
      get version(): string;
      set version(value: string);
      get date(): string;
      set date(value: string);
      classification: Classification;
    }
    /** Crystallographic space group with symmetry operations. */
    interface SpaceGroup extends emscriptem.instance<SpaceGroup> {
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
    interface SpanConstResidue extends emscriptem.instance<SpanConstResidue> {
      size(): number;
      empty(): boolean;
      children(): SpanConstResidue;
      front(): Residue;
      back(): Residue;
      at(_0: number): Residue;
    }
    interface SpanResidue extends emscriptem.instance<SpanResidue> {
      size(): number;
      set_size(_0: number): void;
      empty(): boolean;
      children(): SpanResidue;
      front(): Residue;
      back(): Residue;
      at(_0: number): Residue;
    }
    interface Strand extends emscriptem.instance<Strand> {
      sense: number;
      get name(): string;
      set name(value: string);
      start: AtomAddress;
      end: AtomAddress;
      hbond_atom2: AtomAddress;
      hbond_atom1: AtomAddress;
    }
    /** Macromolecular structure (PDB/mmCIF). Contains models, cell, metadata, assemblies. */
    interface Structure extends emscriptem.instance<Structure> {
      get name(): string;
      set name(value: string);
      get spacegroup_hm(): string;
      set spacegroup_hm(value: string);
      has_origx: boolean;
      models: emscriptem.vector<Model>;
      ncs: emscriptem.vector<NcsOp>;
      entities: emscriptem.vector<Entity>;
      connections: emscriptem.vector<Connection>;
      helices: emscriptem.vector<Helix>;
      sheets: emscriptem.vector<Sheet>;
      assemblies: emscriptem.vector<Assembly>;
      cell: UnitCell;
      meta: Metadata;
      origx: Transform;
      resolution: number;
      raw_remarks: emscriptem.vector<string>;
      input_format: CoorFormat;
      get_info(_0: string): string;
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
    interface TlsGroup extends emscriptem.instance<TlsGroup> {
      get id(): string;
      set id(value: string);
      selections: emscriptem.vector<TlsGroupSelection>;
      origin: Position;
      T: SMat33double;
      L: SMat33double;
      S: Mat33;
    }
    interface TlsGroupSelection extends emscriptem.instance<TlsGroupSelection> {
      get chain(): string;
      set chain(value: string);
      res_begin: SeqId;
      res_end: SeqId;
      get details(): string;
      set details(value: string);
    }
    /** 3x3 rotation matrix + translation vector. */
    interface Transform extends emscriptem.instance<Transform> {
      mat: Mat33;
      vec: Vec3;
      inverse(): Transform;
      apply(_0: Vec3): Vec3;
      combine(_0: Transform): Transform;
      is_identity(): boolean;
      set_identity(): void;
      approx(_0: Transform, _1: number): boolean;
    }
    /** Crystallographic unit cell with lattice parameters and orthogonalization. */
    interface UnitCell extends UnitCellParameters {
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
      images: emscriptem.vector<FTransform>;
      is_crystal(): boolean;
      approx(_0: UnitCell, _1: number): boolean;
      is_similar(_0: UnitCell, _1: number, _2: number): boolean;
      calculate_properties(): void;
      cos_alpha(): number;
      set(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): void;
      add_ncs_images_to_cs_images(_0: emscriptem.vector<NcsOp>): void;
      volume_per_image(): number;
      calculate_1_d2_double(_0: number, _1: number, _2: number): number;
      reciprocal(): UnitCell;
      calculate_matrix_B(): Mat33;
      primitive_orth_matrix(_0: number): Mat33;
      calculate_u_eq(_0: SMat33double): number;
      metric_tensor(): SMat33double;
      reciprocal_metric_tensor(): SMat33double;
      set_from_vectors(_0: Vec3, _1: Vec3, _2: Vec3): void;
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
      get_ncs_transforms(): emscriptem.vector<FTransform>;
    }
    /** Unit cell lattice parameters: a, b, c, alpha, beta, gamma. */
    interface UnitCellParameters extends emscriptem.instance<UnitCellParameters> {
      a: number;
      b: number;
      c: number;
      alpha: number;
      beta: number;
      gamma: number;
    }
    /** 3D vector with arithmetic operations (dot, cross, length, normalize). */
    interface Vec3 extends emscriptem.instance<Vec3> {
      x: number;
      y: number;
      z: number;
      at(_0: number): number;
      negated(): Vec3;
      dot(_0: Vec3): number;
      cross(_0: Vec3): Vec3;
      length_sq(): number;
      length(): number;
      changed_magnitude(_0: number): Vec3;
      normalized(): Vec3;
      dist_sq(_0: Vec3): number;
      dist(_0: Vec3): number;
      cos_angle(_0: Vec3): number;
      angle(_0: Vec3): number;
      approx(_0: Vec3, _1: number): boolean;
      has_nan(): boolean;
    }
    interface WriteOptions extends emscriptem.instance<WriteOptions> {
      prefer_pairs: boolean;
      compact: boolean;
      misuse_hash: boolean;
      align_pairs: number;
      align_loops: number;
    }
    /** A CIF data block with tag/value pairs and loops. Use find(), find_values(). */
    interface cifBlock extends emscriptem.instance<cifBlock> {
      get name(): string;
      set name(value: string);
      items: any;
      swap(_0: cifBlock): void;
      has_tag(_0: string): boolean;
      has_any_value(_0: string): boolean;
      get_index(_0: string): number;
      set_pair(_0: string, _1: string): void;
      move_item(_0: number, _1: number): void;
      get_mmcif_category_names(): emscriptem.vector<string>;
      has_mmcif_category(_0: string): boolean;
      find_values(_0: string): cifColumn;
      find_loop(_0: string): cifColumn;
      find_with_prefix(_0: string, _1: emscriptem.vector<string>): cifTable;
      find(_0: emscriptem.vector<string>): cifTable;
      find_any(_0: string, _1: emscriptem.vector<string>): cifTable;
      find_or_add(_0: string, _1: emscriptem.vector<string>): cifTable;
      find_mmcif_category(_0: string): cifTable;
      init_loop(_0: string, _1: emscriptem.vector<string>): cifLoop;
      init_mmcif_loop(_0: string, _1: emscriptem.vector<string>): cifLoop;
    }
    /** A single CIF tag values (from find_values or find_loop). */
    interface cifColumn extends emscriptem.instance<cifColumn> {
      length(): number;
      at(_0: number): string;
      at_const(_0: number): string;
      str(_0: number): string;
      col(): number;
    }
    /** Parsed CIF document containing one or more data blocks. */
    interface cifDocument extends emscriptem.instance<cifDocument> {
      get source(): string;
      set source(value: string);
      blocks: any;
      add_new_block(_0: string, _1: number): cifBlock;
      clear(): void;
      sole_block(): cifBlock;
      sole_block_const(): cifBlock;
      write_file(_0: string): void;
      write_file_with_options(_0: string, _1: WriteOptions): void;
      write_file_with_style(_0: string, _1: CifStyle): void;
      as_string(): string;
      as_string_with_options(_0: WriteOptions): string;
      as_string_with_style(_0: CifStyle): string;
    }
    interface cifItem extends emscriptem.instance<cifItem> {
      type: CifItemType;
      line_number: number;
      erase(): void;
      has_prefix(_0: string): boolean;
      set_value(_0: cifItem): void;
    }
    interface cifItemSpan extends emscriptem.instance<cifItemSpan> {
      set_pair(_0: string, _1: string): void;
    }
    interface cifLoop extends emscriptem.instance<cifLoop> {
      tags: emscriptem.vector<string>;
      values: emscriptem.vector<string>;
      find_tag_lc(_0: string): number;
      has_tag(_0: string): boolean;
      width(): number;
      val(_0: number, _1: number): string;
      clear(): void;
      pop_row(): void;
      move_row(_0: number, _1: number): void;
      set_all_values(_0: VectorVectorString): void;
    }
    /** A CIF table (loop) for structured data access by row and column. */
    interface cifTable extends emscriptem.instance<cifTable> {
      positions: emscriptem.vector<number>;
      prefix_length: number;
      ok(): boolean;
      width(): number;
      length(): number;
      size(): number;
      has_column(_0: number): boolean;
      at(_0: number): cifTableRow;
      one(): cifTableRow;
      get_prefix(): string;
      find_row(_0: string): cifTableRow;
      remove_row(_0: number): void;
      remove_rows(_0: number, _1: number): void;
      column_at_pos(_0: number): cifColumn;
      column(_0: number): cifColumn;
      move_row(_0: number, _1: number): void;
      find_column_position(_0: string): number;
      find_column(_0: string): cifColumn;
      erase(): void;
    }
    /** A single row in a CIF table. Use value_at() to access columns. */
    interface cifTableRow extends emscriptem.instance<cifTableRow> {
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
    interface SelectionChainList extends emscriptem.instance<SelectionChainList> {
        str: () => string;
        all: boolean;
    }
    interface SelectionSeqId extends emscriptem.instance<SelectionSeqId> {
        str: () => string;
        empty: () => boolean;
        seqnum: number;
    }
    interface Atom extends emscriptem.instance<Atom> {
        name: string;
        element: emscriptem.instance<string>;
        pos: { x: number, y: number, z: number, delete: () => void };
        altloc: number;
        occ: number;
        charge: number;
        b_iso: number;
        serial: number;
        has_altloc: () => boolean;
    }
    interface ResidueSeqId extends emscriptem.instance<ResidueSeqId> {
        str: () => string;
        num: { value: number };
    }
    interface Residue extends emscriptem.instance<Residue> {
        name: string;
        seqid: ResidueSeqId;
        atoms: emscriptem.vector<Atom>;
    }
    interface Chain extends emscriptem.instance<Chain> {
        residues: emscriptem.vector<Residue>;
        name: string;
        get_ligands: () => emscriptem.vector<Residue>;
        get_polymer_const: () => emscriptem.instance<number>;
        get_ligands_const: () => emscriptem.vector<Residue>;
    }
    interface Model extends emscriptem.instance<Model> {
        name: string;
        chains: emscriptem.vector<Chain>;
        find_cra_const(atomAddress: AtomAddress, ignore_segment: boolean): const_CRA;
    }
    interface UnitCell extends emscriptem.instance<UnitCell> {
        a: number;
        b: number;
        c: number;
        alpha: number;
        beta: number;
        gamma: number;
        orthogonalize: (arg0: emscriptem.instance<Fractional>) => Position;
        set: (a: number, b: number, c: number, alpha: number, beta: number, gamma: number) => void
    }
    interface Mat33 extends emscriptem.instance<Mat33> {
        as_array: () => number[];
        is_identity: () => boolean;
    }
    interface Vec3 extends emscriptem.instance<Vec3> {
        x: number;
        y: number;
        z: number;
    }
    interface Transform extends emscriptem.instance<Transform> {
        mat: Mat33;
        vec: Vec3;
    }
    interface Operator extends emscriptem.instance<Operator> {
        transform: Transform;
    }
    interface Gen extends emscriptem.instance<Gen> {
        chains: emscriptem.vector<string>;
        subchains: emscriptem.vector<string>;
        operators: emscriptem.vector<Operator>;
    }
    interface Assembly extends emscriptem.instance<Assembly> {
        name: string;
        oligomeric_details: string;
        generators: emscriptem.vector<Gen>;
    }
    interface Structure extends emscriptem.instance<Structure> {
        models: emscriptem.vector<Model>;
        cell: UnitCell;
        assemblies: emscriptem.vector<Assembly>;
        first_model: () => Model;
        remove_empty_chains: () => void;
        get_info: (tag: string) => string;
        as_string: () => string;
    }
}
