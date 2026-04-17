#include "gemmi-wrappers-helpers.h"

EMSCRIPTEN_BINDINGS(gemmi_data) {
    class_<gemmi::SmallStructure::Site>("SmallStructureSite")
    .property("label",&gemmi::SmallStructure::Site::label)
    .property("type_symbol",&gemmi::SmallStructure::Site::type_symbol)
    .property("fract",&gemmi::SmallStructure::Site::fract)
    .property("occ",&gemmi::SmallStructure::Site::occ)
    .property("u_iso",&gemmi::SmallStructure::Site::u_iso)
    .property("aniso",&gemmi::SmallStructure::Site::aniso)
    .property("disorder_group",&gemmi::SmallStructure::Site::disorder_group)
    .property("element",&gemmi::SmallStructure::Site::element)
    .property("charge",&gemmi::SmallStructure::Site::charge)
    .function("orth",&gemmi::SmallStructure::Site::orth)
    .function("element_and_charge_symbol",&gemmi::SmallStructure::Site::element_and_charge_symbol)
    ;

    class_<gemmi::SmallStructure::AtomType>("SmallStructureAtomType")
    .property("symbol",&gemmi::SmallStructure::AtomType::symbol)
    .property("element",&gemmi::SmallStructure::AtomType::element)
    .property("charge",&gemmi::SmallStructure::AtomType::charge)
    .property("dispersion_real",&gemmi::SmallStructure::AtomType::dispersion_real)
    .property("dispersion_imag",&gemmi::SmallStructure::AtomType::dispersion_imag)
    ;

    class_<gemmi::SmallStructure>("SmallStructure")
    .property("name",&gemmi::SmallStructure::name)
    .property("cell",&gemmi::SmallStructure::cell)
    .property("spacegroup_hm",&gemmi::SmallStructure::spacegroup_hm)
    .property("sites",&gemmi::SmallStructure::sites)
    .property("atom_types",&gemmi::SmallStructure::atom_types)
    .property("wavelength",&gemmi::SmallStructure::wavelength)
    .function("get_all_unit_cell_sites",&gemmi::SmallStructure::get_all_unit_cell_sites)
    .function("remove_hydrogens",&gemmi::SmallStructure::remove_hydrogens)
    .function("change_occupancies_to_crystallographic",&gemmi::SmallStructure::change_occupancies_to_crystallographic)
    .function("setup_cell_images",&gemmi::SmallStructure::setup_cell_images)
    ;

    class_<std::complex<float>>("complexfloat")
    .constructor<float, float>()
    .constructor<const std::complex<float>&>()
    //.constructor<const std::complex<double>&>()
    //.constructor<const std::complex<long double>&>()
    .function("real",select_overload<float(void)const>(&std::complex<float>::real))
    .function("imag",select_overload<float(void)const>(&std::complex<float>::imag))
    ;

    class_<gemmi::HklValue<std::complex<float>>>("HklValueComplexFloat")
    .property("hkl",&gemmi::HklValue<std::complex<float>>::hkl)// Miller - std::array<int, 3>
    .property("value",&gemmi::HklValue<std::complex<float>>::value)
    ;

    class_<gemmi::AsuData<std::complex<float>>>("AsuDataComplexFloat")
    .property("v",&gemmi::AsuData<std::complex<float>>::v)
    .property("unit_cell_",&gemmi::AsuData<std::complex<float>>::unit_cell_)
    .function("stride",&gemmi::AsuData<std::complex<float>>::stride)
    .function("size",&gemmi::AsuData<std::complex<float>>::size)
    .function("get_hkl",&gemmi::AsuData<std::complex<float>>::get_hkl)
    .function("get_f",&gemmi::AsuData<std::complex<float>>::get_f)
    .function("get_phi",&gemmi::AsuData<std::complex<float>>::get_phi)
    .function("unit_cell",&gemmi::AsuData<std::complex<float>>::unit_cell)
    //.function("spacegroup",&gemmi::AsuData<std::complex<float>>::spacegroup) // SpaceGroup*
    .function("ensure_sorted",&gemmi::AsuData<std::complex<float>>::ensure_sorted)
    .function("ensure_asu",&gemmi::AsuData<std::complex<float>>::ensure_asu)
    ;

    class_<gemmi::ReflnBlock>("ReflnBlock")
    .property("block",&gemmi::ReflnBlock::block)
    .property("entry_id",&gemmi::ReflnBlock::entry_id)
    .property("cell",&gemmi::ReflnBlock::cell)
    .property("wavelength",&gemmi::ReflnBlock::wavelength)
    .function("ok",&gemmi::ReflnBlock::ok)
    .function("check_ok",&gemmi::ReflnBlock::check_ok)
    .function("tag_offset",&gemmi::ReflnBlock::tag_offset)
    .function("use_unmerged",&gemmi::ReflnBlock::use_unmerged)
    .function("is_unmerged",&gemmi::ReflnBlock::is_unmerged)
    .function("column_labels",&gemmi::ReflnBlock::column_labels)
    .function("find_column_index",&gemmi::ReflnBlock::find_column_index)
    .function("get_column_index",&gemmi::ReflnBlock::get_column_index)
    .function("get_hkl_column_indices",&gemmi::ReflnBlock::get_hkl_column_indices)//std::array<size_t,3>
    .function("make_miller_vector",&gemmi::ReflnBlock::make_miller_vector)//std::vector<Miller>
    .function("make_1_d2_vector",&gemmi::ReflnBlock::make_1_d2_vector)
    .function("make_d_vector",&gemmi::ReflnBlock::make_d_vector)
    ;

    class_<gemmi::ReflnDataProxy>("ReflnDataProxy")
    .property("hkl_cols_",&gemmi::ReflnDataProxy::hkl_cols_)//std::array<size_t,3>
    .function("stride",&gemmi::ReflnDataProxy::stride)
    .function("size",&gemmi::ReflnDataProxy::size)
    .function("get_num",&gemmi::ReflnDataProxy::get_num)
    .function("unit_cell",&gemmi::ReflnDataProxy::unit_cell)
    .function("get_hkl",&gemmi::ReflnDataProxy::get_hkl)//Miller
    .function("column_index",&gemmi::ReflnDataProxy::column_index)
    ;

    class_<gemmi::CifToMtz::Entry>("CifToMtzEntry")
    .property("refln_tag",&gemmi::CifToMtz::Entry::refln_tag)
    .property("col_label",&gemmi::CifToMtz::Entry::col_label)
    .property("col_type",&gemmi::CifToMtz::Entry::col_type)
    .property("dataset_id",&gemmi::CifToMtz::Entry::dataset_id)
    //std::vector<std::pair<std::string, float>> code_to_number; - Util method required?
    .function("translate_code_to_number",&gemmi::CifToMtz::Entry::translate_code_to_number)
    ;

    class_<gemmi::CifToMtz>("CifToMtz")
    .property("verbose",&gemmi::CifToMtz::verbose)
    .property("force_unmerged",&gemmi::CifToMtz::force_unmerged)
    .property("title",&gemmi::CifToMtz::title)
    .property("history",&gemmi::CifToMtz::history)
    .property("spec_lines",&gemmi::CifToMtz::spec_lines)
     //Mtz convert_block_to_mtz(const ReflnBlock& rb, std::ostream& out) const {
    ;

    class_<gemmi::Mtz::Dataset>("MtzDataset")
    .property("id",&gemmi::Mtz::Dataset::id)
    .property("project_name",&gemmi::Mtz::Dataset::project_name)
    .property("crystal_name",&gemmi::Mtz::Dataset::crystal_name)
    .property("dataset_name",&gemmi::Mtz::Dataset::dataset_name)
    .property("cell",&gemmi::Mtz::Dataset::cell)
    .property("wavelength",&gemmi::Mtz::Dataset::wavelength)
    ;

    class_<gemmi::Mtz::Column>("MtzColumn")
    .property("dataset_id",&gemmi::Mtz::Column::dataset_id)
    .property("type",&gemmi::Mtz::Column::type)
    .property("label",&gemmi::Mtz::Column::label)
    .property("min_value",&gemmi::Mtz::Column::min_value)
    .property("max_value",&gemmi::Mtz::Column::max_value)
    .property("source",&gemmi::Mtz::Column::source)
    .property("idx",&gemmi::Mtz::Column::idx)
    .function("dataset",select_overload<gemmi::Mtz::Dataset&()>(&gemmi::Mtz::Column::dataset))
    .function("dataset_const",select_overload<const gemmi::Mtz::Dataset&()const>(&gemmi::Mtz::Column::dataset))
    .function("has_data",&gemmi::Mtz::Column::has_data)
    .function("size",&gemmi::Mtz::Column::size)
    .function("stride",&gemmi::Mtz::Column::stride)
    .function("is_integer",&gemmi::Mtz::Column::is_integer)
    ;

    class_<gemmi::Mtz::Batch>("MtzBatch")
    .property("number",&gemmi::Mtz::Batch::number)
    .property("title",&gemmi::Mtz::Batch::title)
    .property("ints",&gemmi::Mtz::Batch::ints)
    .property("floats",&gemmi::Mtz::Batch::floats)
    .property("axes",&gemmi::Mtz::Batch::axes)
    .function("get_cell",&gemmi::Mtz::Batch::get_cell)
    .function("set_cell",&gemmi::Mtz::Batch::set_cell)
    .function("dataset_id",&gemmi::Mtz::Batch::dataset_id)
    .function("set_dataset_id",&gemmi::Mtz::Batch::set_dataset_id)
    .function("wavelength",&gemmi::Mtz::Batch::wavelength)
    .function("set_wavelength",&gemmi::Mtz::Batch::set_wavelength)
    .function("phi_start",&gemmi::Mtz::Batch::phi_start)
    .function("phi_end",&gemmi::Mtz::Batch::phi_end)
    .function("matrix_U",&gemmi::Mtz::Batch::matrix_U)
    ;

    class_<gemmi::Mtz>("Mtz")
    .property("source_path",&gemmi::Mtz::source_path)
    .property("same_byte_order",&gemmi::Mtz::same_byte_order)
    .property("indices_switched_to_original",&gemmi::Mtz::indices_switched_to_original)
    .property("header_offset",&gemmi::Mtz::header_offset)
    .property("version_stamp",&gemmi::Mtz::version_stamp)
    .property("title",&gemmi::Mtz::title)
    .property("nreflections",&gemmi::Mtz::nreflections)
    .property("sort_order",&gemmi::Mtz::sort_order)//std::array<int, 5>
    .property("min_1_d2",&gemmi::Mtz::min_1_d2)
    .property("max_1_d2",&gemmi::Mtz::max_1_d2)
    .property("valm",&gemmi::Mtz::valm)
    .property("title",&gemmi::Mtz::title)
    .property("nsymop",&gemmi::Mtz::nsymop)
    .property("cell",&gemmi::Mtz::cell)
    .property("spacegroup_number",&gemmi::Mtz::spacegroup_number)
    .property("spacegroup_name",&gemmi::Mtz::spacegroup_name)
    .property("symops",&gemmi::Mtz::symops)
    .property("datasets",&gemmi::Mtz::datasets)
    .property("columns",&gemmi::Mtz::columns)
    .property("batches",&gemmi::Mtz::batches)
    .property("history",&gemmi::Mtz::history)
    .property("appended_text",&gemmi::Mtz::appended_text)
    .property("data",&gemmi::Mtz::data)
    .function("add_base",&gemmi::Mtz::add_base)
    .function("resolution_high",&gemmi::Mtz::resolution_high)
    .function("resolution_low",&gemmi::Mtz::resolution_low)
    .function("get_cell",select_overload<gemmi::UnitCell&(int)>(&gemmi::Mtz::get_cell))
    .function("get_cell_const",select_overload<const gemmi::UnitCell&(int)const>(&gemmi::Mtz::get_cell))
    .function("set_cell_for_all",&gemmi::Mtz::set_cell_for_all)
    .function("last_dataset",&gemmi::Mtz::last_dataset)
    .function("dataset",select_overload<gemmi::Mtz::Dataset&(int)>(&gemmi::Mtz::dataset))
    .function("dataset_const",select_overload<const gemmi::Mtz::Dataset&(int)const>(&gemmi::Mtz::dataset))
    .function("count",&gemmi::Mtz::count)
    .function("count_type",&gemmi::Mtz::count_type)
    .function("positions_of_columns_with_type",&gemmi::Mtz::positions_of_columns_with_type)
    .function("has_data",&gemmi::Mtz::has_data)
    .function("is_merged",&gemmi::Mtz::is_merged)
    //.function("extend_min_max_1_d2",&gemmi::Mtz::extend_min_max_1_d2)// Does not compile ... ?
    .function("calculate_min_max_1_d2",&gemmi::Mtz::calculate_min_max_1_d2)//std::array<double,2>
    .function("update_reso",&gemmi::Mtz::update_reso)
    .function("toggle_endianness",&gemmi::Mtz::toggle_endianness)
    .function("setup_spacegroup",&gemmi::Mtz::setup_spacegroup)
    .function("read_file",&gemmi::Mtz::read_file)
    .function("sorted_row_indices",&gemmi::Mtz::sorted_row_indices)
    .function("sort",&gemmi::Mtz::sort)
    .function("get_hkl",&gemmi::Mtz::get_hkl)//Miller
    .function("set_hkl",&gemmi::Mtz::set_hkl)//Miller
    .function("ensure_asu",&gemmi::Mtz::ensure_asu)
    .function("switch_to_original_hkl",&gemmi::Mtz::switch_to_original_hkl)
    .function("switch_to_asu_hkl",&gemmi::Mtz::switch_to_asu_hkl)
    .function("add_dataset",&gemmi::Mtz::add_dataset)
    .function("add_column",&gemmi::Mtz::add_column)
    .function("replace_column",&gemmi::Mtz::replace_column)
    .function("copy_column",&gemmi::Mtz::copy_column)
    .function("remove_column",&gemmi::Mtz::remove_column)
    .function("expand_data_rows",&gemmi::Mtz::expand_data_rows)
    ;

    class_<gemmi::MtzDataProxy>("MtzDataProxy")
    .function("stride",&gemmi::MtzDataProxy::stride)
    .function("size",&gemmi::MtzDataProxy::size)
    .function("get_num",&gemmi::MtzDataProxy::get_num)
    .function("unit_cell",&gemmi::MtzDataProxy::unit_cell)
    .function("get_hkl",&gemmi::MtzDataProxy::get_hkl)//Miller
    .function("column_index",&gemmi::MtzDataProxy::column_index)
    ;

    class_<gemmi::MtzExternalDataProxy, base<gemmi::MtzDataProxy>>("MtzExternalDataProxy")
    .function("size",&gemmi::MtzExternalDataProxy::size)
    .function("get_num",&gemmi::MtzExternalDataProxy::get_num)
    .function("get_hkl",&gemmi::MtzExternalDataProxy::get_hkl)//Miller
    ;

    class_<gemmi::Ccp4Base>("Ccp4Base")
    .property("hstats",&gemmi::Ccp4Base::hstats)
    .property("ccp4_header",&gemmi::Ccp4Base::ccp4_header)
    .property("same_byte_order",&gemmi::Ccp4Base::same_byte_order)
    .function("header_i32",&gemmi::Ccp4Base::header_i32)
    //.function("header_3i32",&gemmi::Ccp4Base::header_i32) std::array<int, 3>
    .function("header_float",&gemmi::Ccp4Base::header_float)
    .function("header_str",&gemmi::Ccp4Base::header_str)
    .function("set_header_i32",&gemmi::Ccp4Base::set_header_i32)
    .function("set_header_3i32",&gemmi::Ccp4Base::set_header_3i32)
    .function("set_header_float",&gemmi::Ccp4Base::set_header_float)
    .function("set_header_str",&gemmi::Ccp4Base::set_header_str)
    //.function("axis_positions",&gemmi::Ccp4Base::axis_positions) std::array<int, 3>
    .function("header_rfloat",&gemmi::Ccp4Base::header_rfloat)
    .function("get_extent",&gemmi::Ccp4Base::get_extent)
    .function("has_skew_transformation",&gemmi::Ccp4Base::has_skew_transformation)
    .function("get_skew_transformation",&gemmi::Ccp4Base::get_skew_transformation)
    ;

    class_<gemmi::Ccp4<float>, base<gemmi::Ccp4Base>>("Ccp4")
    .function("prepare_ccp4_header_except_mode_and_stats",&gemmi::Ccp4<float>::prepare_ccp4_header_except_mode_and_stats)
    .function("update_ccp4_header",&gemmi::Ccp4<float>::update_ccp4_header)
    //.function("mode_for_data",&gemmi::Ccp4<float>::mode_for_data) //static ?
    .function("full_cell",&gemmi::Ccp4<float>::full_cell)
    //.function("read_ccp4_header",&gemmi::Ccp4<float>::read_ccp4_header) template<typename Stream> void read_ccp4_header(Stream& f, const std::string& path
    .function("setup",&gemmi::Ccp4<float>::setup)
    .function("set_extent",&gemmi::Ccp4<float>::set_extent)
    //.function("read_ccp4_stream",&gemmi::Ccp4<float>::read_ccp4_stream) template<typename Stream> void read_ccp4_stream(Stream& f, const std::string& path
    .function("read_ccp4_file",&gemmi::Ccp4<float>::read_ccp4_file)
    //.function("read_ccp4",&gemmi::Ccp4<float>::read_ccp4) template<typename Input> void read_ccp4(Input&& input)
    .function("write_ccp4_map",&gemmi::Ccp4<float>::write_ccp4_map)
    ;

    class_<gemmi::Ccp4<int8_t>, base<gemmi::Ccp4Base>>("Ccp4Int8_t")
    .function("prepare_ccp4_header_except_mode_and_stats",&gemmi::Ccp4<int8_t>::prepare_ccp4_header_except_mode_and_stats)
    .function("update_ccp4_header",&gemmi::Ccp4<int8_t>::update_ccp4_header)
    //.function("mode_for_data",&gemmi::Ccp4<int8_t>::mode_for_data) //static ?
    .function("full_cell",&gemmi::Ccp4<int8_t>::full_cell)
    //.function("read_ccp4_header",&gemmi::Ccp4<int8_t>::read_ccp4_header) template<typename Stream> void read_ccp4_header(Stream& f, const std::string& path
    .function("setup",&gemmi::Ccp4<int8_t>::setup)
    .function("set_extent",&gemmi::Ccp4<int8_t>::set_extent)
    //.function("read_ccp4_stream",&gemmi::Ccp4<int8_t>::read_ccp4_stream) template<typename Stream> void read_ccp4_stream(Stream& f, const std::string& path
    .function("read_ccp4_file",&gemmi::Ccp4<int8_t>::read_ccp4_file)
    //.function("read_ccp4",&gemmi::Ccp4<int8_t>::read_ccp4) template<typename Input> void read_ccp4(Input&& input)
    .function("write_ccp4_map",&gemmi::Ccp4<int8_t>::write_ccp4_map)
    ;

    class_<gemmi::DataStats>("DataStats")
    .property("dmin",&gemmi::DataStats::dmin)
    .property("dmax",&gemmi::DataStats::dmax)
    .property("dmean",&gemmi::DataStats::dmean)
    .property("rms",&gemmi::DataStats::rms)
    .property("nan_count",&gemmi::DataStats::nan_count)
    ;

    class_<gemmi::GridOp>("GridOp")
    .property("scaled_op",&gemmi::GridOp::scaled_op)
    //.function("apply",&gemmi::GridOp::apply) std::array<int, 3>
    ;

    class_<gemmi::GridMeta>("GridMeta")
    .property("unit_cell",&gemmi::GridMeta::unit_cell)
    .property("nu",&gemmi::GridMeta::nu)
    .property("nv",&gemmi::GridMeta::nv)
    .property("nw",&gemmi::GridMeta::nw)
    .property("axis_order",&gemmi::GridMeta::axis_order)
    .function("point_count",&gemmi::GridMeta::point_count)
    .function("get_fractional",&gemmi::GridMeta::get_fractional)
    .function("get_position",&gemmi::GridMeta::get_position)
    .function("get_scaled_ops_except_id",&gemmi::GridMeta::get_scaled_ops_except_id)
    .function("index_q_int",select_overload<size_t(int, int, int)const>(&gemmi::GridMeta::index_q))
    .function("index_q_size_t",select_overload<size_t(size_t, size_t, size_t)const>(&gemmi::GridMeta::index_q))
    .function("index_n",&gemmi::GridMeta::index_n)
    //.function("index_n_ref",&gemmi::GridMeta::index_n_ref) references?
    .function("index_near_zero",&gemmi::GridMeta::index_near_zero)
    ;

    class_<gemmi::GridBase<float>::Point>("GridBasePoint")
    .property("u",&gemmi::GridBase<float>::Point::u)
    .property("v",&gemmi::GridBase<float>::Point::v)
    .property("w",&gemmi::GridBase<float>::Point::w)
    ;

    class_<gemmi::GridBase<int8_t>::Point>("GridBasePointInt8_t")
    .property("u",&gemmi::GridBase<int8_t>::Point::u)
    .property("v",&gemmi::GridBase<int8_t>::Point::v)
    .property("w",&gemmi::GridBase<int8_t>::Point::w)
    ;

    class_<gemmi::GridBase<float>, base<gemmi::GridMeta>>("GridBase")
    .property("data",&gemmi::GridBase<float>::data)
    .function("check_not_empty",&gemmi::GridBase<float>::check_not_empty)
    .function("set_size_without_checking",&gemmi::GridBase<float>::set_size_without_checking)
    .function("get_value_q",&gemmi::GridBase<float>::get_value_q)
    .function("index_to_point",&gemmi::GridBase<float>::index_to_point)
    .function("fill",&gemmi::GridBase<float>::fill)
    ;

    class_<gemmi::GridBase<int8_t>, base<gemmi::GridMeta>>("GridBaseInt8_t")
    .property("data",&gemmi::GridBase<int8_t>::data)
    .function("check_not_empty",&gemmi::GridBase<int8_t>::check_not_empty)
    .function("set_size_without_checking",&gemmi::GridBase<int8_t>::set_size_without_checking)
    .function("get_value_q",&gemmi::GridBase<int8_t>::get_value_q)
    .function("index_to_point",&gemmi::GridBase<int8_t>::index_to_point)
    .function("fill",&gemmi::GridBase<int8_t>::fill)
    ;

    class_<gemmi::Grid<float>, base<gemmi::GridBase<float>>>("Grid")
    .function("calculate_spacing",&gemmi::Grid<float>::calculate_spacing)
    .function("set_size_without_checking",&gemmi::Grid<float>::set_size_without_checking)
    .function("set_size",&gemmi::Grid<float>::set_size)
    .function("set_size_from_spacing",&gemmi::Grid<float>::set_size_from_spacing)
    .function("set_unit_cell",select_overload<void(double, double, double, double, double, double)>(&gemmi::Grid<float>::set_unit_cell))
    .function("index_s",&gemmi::Grid<float>::index_s)
    .function("get_value",&gemmi::Grid<float>::get_value)
    .function("set_value",&gemmi::Grid<float>::set_value)
    .function("get_point",&gemmi::Grid<float>::get_point)
    .function("interpolate_value",select_overload<float(const gemmi::Position&, int)const>(&gemmi::Grid<float>::interpolate_value))
    .function("tricubic_interpolation",select_overload<double(double, double, double)const>(&gemmi::Grid<float>::tricubic_interpolation))
    .function("symmetrize_min",&gemmi::Grid<float>::symmetrize_min)
    .function("symmetrize_max",&gemmi::Grid<float>::symmetrize_max)
    .function("symmetrize_abs_max",&gemmi::Grid<float>::symmetrize_abs_max)
    .function("symmetrize_sum",&gemmi::Grid<float>::symmetrize_sum)
    .function("symmetrize_nondefault",&gemmi::Grid<float>::symmetrize_nondefault)
    .function("normalize",&gemmi::Grid<float>::normalize)
    ;

    class_<gemmi::Grid<int8_t>, base<gemmi::GridBase<int8_t>>>("GridInt8_t")
    // Does this actually ever get instantiated?
    ;

    class_<gemmi::Box<gemmi::Fractional>>("BoxFractional")
    .property("minimum",&gemmi::Box<gemmi::Fractional>::minimum)
    .property("maximum",&gemmi::Box<gemmi::Fractional>::maximum)
    .function("get_size",&gemmi::Box<gemmi::Fractional>::get_size)
    .function("add_margin",&gemmi::Box<gemmi::Fractional>::add_margin)
    ;

    class_<gemmi::Box<gemmi::Position>>("BoxPosition")
    .property("minimum",&gemmi::Box<gemmi::Position>::minimum)
    .property("maximum",&gemmi::Box<gemmi::Position>::maximum)
    .function("get_size",&gemmi::Box<gemmi::Position>::get_size)
    .function("add_margin",&gemmi::Box<gemmi::Position>::add_margin)
    ;

    class_<gemmi::AtomNameElement>("AtomNameElement")
    .property("atom_name",&gemmi::AtomNameElement::atom_name)
    .property("el",&gemmi::AtomNameElement::el)
    ;

    value_object<SequenceEntry>("SequenceEntry")
    .field("type", &SequenceEntry::type)
    .field("name", &SequenceEntry::name)
    .field("chain", &SequenceEntry::chain)
    .field("sequence", &SequenceEntry::sequence)
    ;

    register_vector<SequenceEntry>("VectorSequenceEntry");

    value_object<LigandDictInfo>("LigandDictInfo")
    .field("comp_id", &LigandDictInfo::comp_id)
    .field("dict_contents", &LigandDictInfo::dict_contents)
    ;

    register_vector<LigandDictInfo>("VectorLigandDictInfo");

    value_object<CompoundInfo>("CompoundInfo")
    .field("name", &CompoundInfo::name)
    .field("three_letter_code", &CompoundInfo::three_letter_code)
    ;

    register_vector<CompoundInfo>("VectorCompoundInfo");

    value_object<SequenceResInfo>("SequenceResInfo")
    .field("resNum", &SequenceResInfo::resNum)
    .field("resCode", &SequenceResInfo::resCode)
    .field("cid", &SequenceResInfo::cid)
    ;

    register_vector<SequenceResInfo>("VectorSequenceResInfo");

    value_object<ResidueBFactorInfo>("ResidueBFactorInfo")
    .field("cid", &ResidueBFactorInfo::cid)
    .field("bFactor", &ResidueBFactorInfo::bFactor)
    .field("normalised_bFactor", &ResidueBFactorInfo::normalised_bFactor)
    ;

    register_vector<ResidueBFactorInfo>("VectorResidueBFactorInfo");

    value_object<LigandInfo>("LigandInfo")
    .field("resName", &LigandInfo::resName)
    .field("chainName", &LigandInfo::chainName)
    .field("resNum", &LigandInfo::resNum)
    .field("modelName", &LigandInfo::modelName)
    .field("cid", &LigandInfo::cid)
    ;

    register_vector<LigandInfo>("VectorLigandInfo");

    value_object<AtomInfo>("AtomInfo")
    .field("x", &AtomInfo::x)
    .field("y", &AtomInfo::y)
    .field("z", &AtomInfo::z)
    .field("charge", &AtomInfo::charge)
    .field("element", &AtomInfo::element)
    .field("tempFactor", &AtomInfo::tempFactor)
    .field("serial", &AtomInfo::serial)
    .field("occupancy", &AtomInfo::occupancy)
    .field("name", &AtomInfo::name)
    .field("has_altloc", &AtomInfo::has_altloc)
    .field("alt_loc", &AtomInfo::alt_loc)
    .field("mol_name", &AtomInfo::mol_name)
    .field("chain_id", &AtomInfo::chain_id)
    .field("res_no", &AtomInfo::res_no)
    .field("res_name", &AtomInfo::res_name)
    ;

    register_vector<AtomInfo>("VectorAtomInfo");


    //TODO Wrap some of these gemmi classes
    /*

XdsAscii
Variance
Covariance
Correlation
UnmergedHklMover
MtzExternalDataProxy
Intensities
IsMmCifFile
IsCifFile
IsPdbFile
IsCoordinateFile
IsAnyFile
IsMatchingFile
PdbReadOptions
PdbWriteOptions
ChainNameGenerator
ContactSearch
HklMatch
HklValue
ValueSigma
DensityCalculator
TwoFoldData
SolventMasker
NeighborSearch
ReciprocalGrid
GridConstPoint

UniqProxy
ConstUniqProxy
Binner
CenterOfMass
IT92
C4322
AsuBrick
NodeInfo
FloodFill
Topo
ComplexCorrelation
LinkHunt
ResidueSpan::GroupingProxy
MmcifOutputGroups
Blob
BlobCriteria
from_chars_result
parse_options
span
value128
adjusted_mantissa
parsed_number_string
powers_template
stackvec
bigint
parsed_number_string
util
ExecC2C
ExecHartley
ExecDcst
ExecR2R
Scaling
Gaus
Point
OrbitalCoef
SellingVector;
GruberVector
SellingVector
ExpSum
ExpAnisoSum
GaussianCoef
AlignmentScoring
AlignmentResult
Addends
SpaceGroupAltName
Tables_
ReciprocalAsu
Neutron92
AssemblyMapping
FileStream
MemoryStream
FPhiProxy
BidirIterator
FilterProxy
ConstFilterProxy
SupResult
Ofstream
Ifstream
LevMar
BesselTables_
GlobWalk
    */

    //TODO Here we need to put *lots* of gemmi functions
    function("remove_non_selected_atoms",&remove_non_selected_atoms);
    function("remove_selected_residues",&remove_selected_residues);
    function("count_residues_in_selection",&count_residues_in_selection);
    function("get_pdb_string_from_gemmi_struct",&get_pdb_string_from_gemmi_struct);
    function("get_mmcif_string_from_gemmi_struct",&get_mmcif_string_from_gemmi_struct);
    function("structure_is_ligand",&structure_is_ligand);
    function("read_structure_from_string",&read_structure_from_string);
    function("read_string",&read_string);
    function("is_small_structure",&is_small_structure);
    function("copy_to_assembly_to_new_structure",&copy_to_assembly_to_new_structure);
    function("parse_ligand_dict_info", &parse_ligand_dict_info);
    function("read_structure_file",&gemmi::read_structure_file);
#if (__EMSCRIPTEN_major__ == 3 && __EMSCRIPTEN_minor__ == 1 && __EMSCRIPTEN_tiny__ >= 60) || __EMSCRIPTEN_major__ > 3
    function("read_mtz_file",&gemmi::read_mtz_file,return_value_policy::take_ownership());
#else
    function("read_mtz_file",&gemmi::read_mtz_file);
#endif
    function("get_spacegroup_by_name",&gemmi::get_spacegroup_by_name);
    function("gemmi_setup_entities",&gemmi::setup_entities);

    function("assign_subchains", &gemmi::assign_subchains);
    function("ensure_entities", &gemmi::ensure_entities);
    function("deduplicate_entities", &gemmi::deduplicate_entities);
    function("shorten_chain_names", &gemmi::shorten_chain_names);
    function("split_chains_by_segments", &gemmi::split_chains_by_segments);
    function("check_polymer_type", &gemmi::check_polymer_type);
    function("make_one_letter_sequence", &gemmi::make_one_letter_sequence);
    function("gemmi_add_entity_types",select_overload<void(gemmi::Structure&, bool)>(&gemmi::add_entity_types));
    function("remove_alternative_conformations_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_alternative_conformations));
    function("remove_alternative_conformations_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_alternative_conformations));
    function("remove_alternative_conformations_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::remove_alternative_conformations));
    function("remove_waters_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_waters));
    function("remove_waters_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_waters));
    function("remove_waters_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::remove_waters));
    function("remove_ligands_and_waters_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_ligands_and_waters));
    function("remove_ligands_and_waters_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_ligands_and_waters));
    function("remove_ligands_and_waters_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::remove_ligands_and_waters));
    function("has_hydrogen", select_overload<bool(const gemmi::Model&)>(&gemmi::has_hydrogen));
    function("calculate_mass_model", select_overload<double(const gemmi::Model&)>(&gemmi::calculate_mass));
    function("calculate_mass_chain", select_overload<double(const gemmi::Chain&)>(&gemmi::calculate_mass));
    function("add_residue_chain", select_overload<gemmi::Residue&(gemmi::Chain&, gemmi::Residue, int)>(&add_child));
    function("add_residue_residuespan", select_overload<gemmi::Residue&(gemmi::ResidueSpan&, gemmi::Residue, int)>(&add_item));
    function("remove_hydrogens_structure",select_overload<void(gemmi::Structure&)>(&gemmi::remove_hydrogens));
    function("remove_hydrogens_model",    select_overload<void(gemmi::Model&)>(&gemmi::remove_hydrogens));
    function("remove_hydrogens_residue",    select_overload<void(gemmi::Residue&)>(&gemmi::remove_hydrogens));
    function("trim_to_alanine_chain",    select_overload<void(gemmi::Chain&)>(&gemmi::trim_to_alanine));
    function("trim_to_alanine_residue",    select_overload<bool(gemmi::Residue&)>(&gemmi::trim_to_alanine));

/*
    function("transform_pos_and_adp", transform_pos_and_adp<ResidueSpan>);
    function("add_atom", add_child<Residue, Atom>);
    */

    //Utilities to deal with char*/[]
    function("setCifItemPair",&set_cif_item_pair);
    function("setCifItemLoop",&set_cif_item_loop);
    function("setCifItemFrame",&set_cif_item_frame);
    function("getCifItemPair",&get_cif_item_pair);
    function("getCifItemLoop",&get_cif_item_loop);
    function("getCifItemFrame",&get_cif_item_frame);
    function("getSpaceGroupHMAsString",&get_spacegroup_hm);
    function("getNearestImagePBCShiftAsVector",&get_nearest_image_pbc_shift);
    function("getSpaceGroupHallAsString",&get_spacegroup_hall);
    function("getSpaceGroupQualifierAsString",&get_spacegroup_qualifier);
    function("getElementNameAsString",&get_element_name_as_string);
    function("cif_parse_string",&cif_parse_string);
    function("get_atom_info_for_selection", &get_atom_info_for_selection);
    function("get_ligand_info_for_structure", &get_ligand_info_for_structure);
    function("get_sequence_info", &get_sequence_info);
    function("get_structure_bfactors", &get_structure_bfactors);
    function("guess_coord_data_format", &guess_coord_data_format);
    function("parse_multi_cids", &parse_multi_cids);
    function("get_non_selected_cids", &get_non_selected_cids);
    function("parse_mon_lib_list_cif", &parse_mon_lib_list_cif);

    value_array<std::array<double, 9>>("array_native_double_9")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
        .element(emscripten::index<4>())
        .element(emscripten::index<5>())
        .element(emscripten::index<6>())
        .element(emscripten::index<7>())
        .element(emscripten::index<8>())
    ;

    // Fix unbound types: std::array types used in embind signatures
    // Miller / Op::Tran = std::array<int, 3> — used by Op, Mtz, ReflnBlock, MtzDataProxy, etc.
    value_array<std::array<int, 3>>("array_int_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;

    // std::array<double, 3> — used by SMat33::calculate_eigenvalues(), Op::apply_to_xyz()
    value_array<std::array<double, 3>>("array_double_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;

    // std::array<double, 2> — used by Mtz::calculate_min_max_1_d2()
    value_array<std::array<double, 2>>("array_double_2")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
    ;

    // std::array<int, 5> — used by Mtz.sort_order
    value_array<std::array<int, 5>>("array_int_5")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
        .element(emscripten::index<4>())
    ;

    // std::array<size_t, 3> — used by ReflnBlock::get_hkl_column_indices(), ReflnDataProxy.hkl_cols_
    value_array<std::array<size_t, 3>>("array_size_t_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;

    // std::array<std::string, 2> — gemmi::cif::Pair, used by cifBlock::set_pair etc.
    value_array<std::array<std::string, 2>>("array_string_2")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
    ;

    // Op::Rot = std::array<std::array<int,3>,3> — used by Op.rot, negated_rot(), transposed_rot()
    value_array<std::array<std::array<int, 3>, 3>>("array_array_int_3_3")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
    ;

    // Op::int_seitz() returns std::array<std::array<int,4>,4>
    value_array<std::array<int, 4>>("array_int_4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;
    value_array<std::array<std::array<int, 4>, 4>>("array_array_int_4_4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;

    // Op::float_seitz() returns std::array<std::array<double,4>,4>
    value_array<std::array<double, 4>>("array_double_4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;
    value_array<std::array<std::array<double, 4>, 4>>("array_array_double_4_4")
        .element(emscripten::index<0>())
        .element(emscripten::index<1>())
        .element(emscripten::index<2>())
        .element(emscripten::index<3>())
    ;

    // Fix unbound types: register_vector for types used in embind signatures
    register_vector<gemmi::FTransform>("VectorGemmiFTransform"); // UnitCell.images, get_ncs_transforms()
    register_vector<gemmi::ChemComp::Atom>("VectorGemmiChemCompAtom"); // ChemComp.atoms
    register_vector<int8_t>("VectorInt8_t"); // GridBase<int8_t>.data
    register_vector<std::array<int, 3>>("VectorMiller"); // ReflnBlock::make_miller_vector()
}
