project(coot)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_CXX_STANDARD 11)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

set(coot_src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/coot-0.9.6)
add_definitions(-DANALYSE_REFINEMENT_TIMING -DVERSION="0.9.6" -DPACKAGE_VERSION="0.9.6" -DHAVE_CXX_THREAD -DHAVE_BOOST -DHAVE_GSL -DPKGDATADIR="${coot_src}/pixmaps" -DDATADIR="${coot_src}/data")

#  pyrogen, compat, auxil, goograph, src ignored.

add_library(coot STATIC
${coot_src}/analysis/daca.cc
${coot_src}/analysis/kolmogorov.cc
${coot_src}/analysis/stats.cc
${coot_src}/analysis/bfkurt.cc
${coot_src}/analysis/mogul.cc
${coot_src}/analysis/test-mogul.cc
${coot_src}/analysis/b-factor-histogram.cc
${coot_src}/analysis/typed-distances.cc
${coot_src}/analysis/cablam.cc
${coot_src}/density-contour/density-contour-triangles.cc
${coot_src}/density-contour/Vectors.cpp
${coot_src}/density-contour/CIsoSurface.cpp
${coot_src}/density-contour/occlusion.cc
${coot_src}/ccp4mg-utils/ppmutil.cc
${coot_src}/ccp4mg-utils/quat.cc
${coot_src}/ccp4mg-utils/mgtree.cc
${coot_src}/ccp4mg-utils/cartesian.cc
${coot_src}/ccp4mg-utils/geomutil.cc
${coot_src}/ccp4mg-utils/matrix.cc
${coot_src}/skeleton/dm-utils.cc
${coot_src}/skeleton/BuildCas.cc
${coot_src}/skeleton/graphical_skel.cc
${coot_src}/ideal/pepflip.cc
${coot_src}/ideal/parallel-planes.cc
${coot_src}/ideal/simple-restraint.cc
${coot_src}/ideal/mini-rsr.cc
${coot_src}/ideal/ng.cc
${coot_src}/ideal/torsion-bonds.cc
${coot_src}/ideal/chi-squareds.cc
${coot_src}/ideal/trans-peptide.cc
${coot_src}/ideal/model-bond-deltas.cc
${coot_src}/ideal/make-restraints.cc
${coot_src}/ideal/pull-restraint.cc
${coot_src}/ideal/neutron.cc
${coot_src}/ideal/coot-compare-residues.cc
${coot_src}/ideal/link-restraints.cc
${coot_src}/ideal/mods.cc
${coot_src}/ideal/extra-restraints-kk.cc
${coot_src}/ideal/chirals.cc
${coot_src}/ideal/extra-restraints.cc
${coot_src}/ideal/gradients.cc
${coot_src}/ideal/regularize-minimol.cc
${coot_src}/ideal/flanking.cc
${coot_src}/ideal/distortion.cc
${coot_src}/ideal/simple-restraint-kk.cc
${coot_src}/ideal/crankshaft.cc
${coot_src}/ideal/phi-psi.cc
${coot_src}/ideal/lograma.cpp
${coot_src}/ideal/process-dfs-in-range.cc
${coot_src}/ideal/write-png.cc
${coot_src}/ideal/zo-rama.cc
${coot_src}/tw/tw.cc
${coot_src}/utils/radix.cc
${coot_src}/utils/coot-utils.cc
${coot_src}/utils/hsv-rgb.cc
${coot_src}/utils/backward.cpp
${coot_src}/utils/align-utils.cc
${coot_src}/utils/threads.cc
${coot_src}/utils/coot-fasta.cc
${coot_src}/utils/win-compat.cc
${coot_src}/utils/atomic-numbers.cc
${coot_src}/utils/split-indices.cc
${coot_src}/utils/gdk-keysyms.cc
${coot_src}/utils/dodec.cc
${coot_src}/utils/logging.cc
${coot_src}/utils/pir-alignment.cc
${coot_src}/db-main/db-strands.cc
${coot_src}/db-main/testdbmain.cc
${coot_src}/high-res/residue-distortions.cc
${coot_src}/high-res/coot-atom-graph.cc
${coot_src}/high-res/sequence-assignment.cc
${coot_src}/high-res/high-res.cc
${coot_src}/protein_db/protein_db.cpp
${coot_src}/protein_db/protein_db_utils.cpp
${coot_src}/protein_db/rna_db.cpp
${coot_src}/pli/flev-annotations.cc
${coot_src}/pli/protein-ligand-interactions.cc
${coot_src}/pli/pi-stacking.cc
${coot_src}/pli/specs.cc
${coot_src}/coot-utils/merge-atom-selections.cc
${coot_src}/coot-utils/coot-least-squares.cc
${coot_src}/coot-utils/shiftfield.cpp
${coot_src}/coot-utils/stack-and-pair.cc
${coot_src}/coot-utils/spherical-harmonics.cc
${coot_src}/coot-utils/peak-search-from-list.cc
${coot_src}/coot-utils/helix-analysis.cc
${coot_src}/coot-utils/segmap.cc
${coot_src}/coot-utils/lidia-core-functions.cc
${coot_src}/coot-utils/cablam-markup.cc
${coot_src}/coot-utils/fib-sphere.cc
${coot_src}/coot-utils/atom-selection-container.cc
${coot_src}/coot-utils/coot-coord-utils-glyco.cc
${coot_src}/coot-utils/coot-coord-utils.cc
${coot_src}/coot-utils/merge-molecules.cc
${coot_src}/coot-utils/coot-coord-extras.cc
${coot_src}/coot-utils/water-coordination.cc
${coot_src}/coot-utils/bonded-pairs.cc
${coot_src}/coot-utils/c-beta-deviations.cc
${coot_src}/coot-utils/atom-tools.cc
${coot_src}/coot-utils/coot-rama.cc
${coot_src}/coot-utils/secondary-structure-headers.cc
${coot_src}/coot-utils/helix-like.cc
${coot_src}/coot-utils/polar-atoms.cc
${coot_src}/coot-utils/plane-utils.cc
${coot_src}/coot-utils/coot-tree-extras.cc
${coot_src}/coot-utils/coot-map-heavy.cc
${coot_src}/coot-utils/jed-flip.cc
${coot_src}/coot-utils/pepflip-using-difference-map.cc
${coot_src}/coot-utils/atom-overlaps.cc
${coot_src}/coot-utils/bricks.cc
${coot_src}/coot-utils/mutate.cc
${coot_src}/coot-utils/elastic.cc
${coot_src}/coot-utils/coot-map-utils.cc
${coot_src}/coot-utils/coot-h-bonds.cc
${coot_src}/coot-utils/coot-coord-utils-nucleotides.cc
${coot_src}/coot-utils/glyco-torsions.cc
${coot_src}/coot-utils/fast-eigens.cc
${coot_src}/coot-utils/coot-shelx-ins.cc
${coot_src}/coot-utils/contacts-by-bricks.cc
${coot_src}/coot-utils/lsq-improve.cc
${coot_src}/coot-utils/trim.cc
${coot_src}/coot-utils/coot_shiftfield.cpp
${coot_src}/coot-utils/coot-fffear.cc
${coot_src}/coot-utils/coot-coord-lsq.cc
${coot_src}/coot-utils/strand-fragments.cc
${coot_src}/coot-utils/bonded-atoms.cc
${coot_src}/coot-utils/fragment-container.cc
${coot_src}/coot-utils/maps-spherical.cc
${coot_src}/coot-utils/peak-search.cc
${coot_src}/coot-utils/xmap-stats.cc
${coot_src}/coot-utils/sfcalc-genmap.cc
${coot_src}/coot-utils/reduce.cc
${coot_src}/coot-utils/contact-info.cc
${coot_src}/coot-utils/hole.cc
${coot_src}/coot-utils/read-sm-cif.cc
${coot_src}/coords/phenix-geo-bonds.cc
${coot_src}/coords/Bond_lines_ext.cc
${coot_src}/coords/mmdb-crystal.cc
${coot_src}/coords/utils.cc
${coot_src}/coords/phenix-geo.cc
${coot_src}/coords/mmdb.cc
${coot_src}/coords/Cartesian.cc
${coot_src}/coords/loop-path.cc
${coot_src}/coords/coot-close.cc
${coot_src}/coords/cos-sin.cc
${coot_src}/coords/rotamer-markup.cc
${coot_src}/coords/mmdb-extras.cc
${coot_src}/coords/Bond_lines.cc
${coot_src}/geometry/cif-parse-link.cc
${coot_src}/geometry/cif-parse.cc
${coot_src}/geometry/main-chain.cc
${coot_src}/geometry/cif-parse-mon-lib.cc
${coot_src}/geometry/protein-geometry.cc
${coot_src}/geometry/dictionary-residue.cc
${coot_src}/geometry/dict-utils.cc
${coot_src}/geometry/read-sbase.cc
${coot_src}/geometry/hydrophobic.cc
${coot_src}/geometry/energy-lib.cc
${coot_src}/geometry/srs-interface.cc
${coot_src}/geometry/available-comp-id.cc
${coot_src}/geometry/residue-and-atom-specs.cc
${coot_src}/geometry/protein-geometry-mmdb.cc
${coot_src}/geometry/mol-utils.cc
${coot_src}/geometry/dreiding.cc
${coot_src}/geometry/chem_mods.cc
${coot_src}/geometry/link.cc
${coot_src}/geometry/lbg-graph.cc
${coot_src}/geometry/glyco-tools.cc
${coot_src}/geometry/mol-utils-2.cc
${coot_src}/geometry/protein-donor-acceptors.cc
${coot_src}/build/CalphaBuild.cc
${coot_src}/build/testcabuild.cc
${coot_src}/mini-mol/mini-mol-utils.cc
${coot_src}/mini-mol/mini-mol.cc
${coot_src}/mini-mol/atom-quads.cc
${coot_src}/lbg/lbg.cc
${coot_src}/lbg/residue-circles.cc
${coot_src}/lbg/graphics-c-interface-functions-blanks.cc
${coot_src}/lbg/lbg-search.cc
${coot_src}/lbg/lbg-flev.cc
${coot_src}/lbg/lbg-callbacks.cc
${coot_src}/lbg/alerts-list.cc
${coot_src}/lbg/qed-interface.cc
${coot_src}/lbg/lbg-callbacks-outer.cc
${coot_src}/lbg/wmolecule.cc
${coot_src}/lbg/alerts.cc
${coot_src}/lbg/lbg-drag-and-drop.cc
${coot_src}/lbg/qed-properties.cc
${coot_src}/cootilus/nautilus-tools.cpp
${coot_src}/cootilus/cootilus-build.cpp
${coot_src}/cootilus/nucleicacid_db.cpp
${coot_src}/cootilus/nautilus-join.cpp
${coot_src}/cootilus/nautilus-target.cpp
${coot_src}/cootilus/nautilus-ss-find.cpp
${coot_src}/lidia-core/lbg-shared.cc
${coot_src}/lidia-core/cod-types.cc
${coot_src}/lidia-core/cod-atom-types.cc
${coot_src}/lidia-core/chemical-feature-clusters.cc
${coot_src}/lidia-core/bond-record-container-t.cc
${coot_src}/lidia-core/atom-types.cc
${coot_src}/lidia-core/cod-atom-type-t.cc
${coot_src}/lidia-core/lbg-molfile.cc
${coot_src}/lidia-core/lig-build.cc
${coot_src}/lidia-core/rdkit-interface.cc
${coot_src}/lidia-core/get-residue.cc
${coot_src}/lidia-core/bond-table-record-t.cc
${coot_src}/angles/AngleInfo-angle-torsions-autogen.cc
${coot_src}/angles/AngleInfo-theta_2-autogen.cc
${coot_src}/angles/AngleInfo.cc
${coot_src}/ligand/dipole.cc
${coot_src}/ligand/chi-angles.cc
${coot_src}/ligand/trace-2.cc
${coot_src}/ligand/monomer-utils.cc
${coot_src}/ligand/ligand-score-card.cc
${coot_src}/ligand/multi-peptide.cc
${coot_src}/ligand/chi-angles-autogen.cc
${coot_src}/ligand/ligand.cc
${coot_src}/ligand/helix-placement.cc
${coot_src}/ligand/backrub-rotamer.cc
${coot_src}/ligand/dunbrack.cc
${coot_src}/ligand/primitive-chi-angles.cc
${coot_src}/ligand/rotamer-tables.cc
${coot_src}/ligand/side-chain-densities.cc
${coot_src}/ligand/richardson-rotamers.cc
${coot_src}/ligand/ligands-db.cc
${coot_src}/ligand/ligand-extras.cc
${coot_src}/ligand/residue_by_phi_psi.cc
${coot_src}/ligand/base-pairing.cc
${coot_src}/ligand/ideal-rna.cc
${coot_src}/ligand/wiggly-ligand.cc
${coot_src}/ligand/torsion-general.cc
${coot_src}/ligand/joining-residues.cc
${coot_src}/ligand/richardson-rotamer.cc
${coot_src}/ligand/side-chain.cc
${coot_src}/ligand/rigid-body.cc
${coot_src}/ligand/trace.cc
${coot_src}/ligand/smith-waterman.cc
${coot_src}/ligand/tube-finder.cc
${coot_src}/ligand/fast-ss-search.cc
#Missing scored-node.hh
#./ligand/res-tracer.cc
${coot_src}/ligand/rotamer.cc
${coot_src}/cootaneer/buccaneer-sequence.cpp
${coot_src}/cootaneer/cootaneer-sequence.cpp
${coot_src}/cootaneer/buccaneer-lib.cpp
${coot_src}/cootaneer/buccaneer-prot.cpp
${coot_src}/src/coot-nomenclature.cc
${coot_src}/db-main/db-main.cc
${coot_src}/compat/getopt.cc
${coot_src}/compat/getopt1.cc
${coot_src}/src/gl-matrix.cc
)

target_include_directories(coot PRIVATE ${coot_src} ${coot_src}/coords ${coot_src}/utils ../include ../example ../checkout/ssm ../checkout/mmdb2 ../checkout/clipper ../checkout/fftw-2.1.5/fftw ../checkout/fftw-2.1.5/rfftw ../checkout/libccp4/ccp4)

set_target_properties(coot PROPERTIES COMPILE_FLAGS "-DFFTW_ENABLE_FLOAT -s USE_LIBPNG=1 -s USE_ZLIB=1 -s USE_BOOST_HEADERS=1" LINK_FLAGS "-s USE_LIBPNG=1 -s USE_ZLIB=1 -s USE_BOOST_HEADERS=1")

FILE(WRITE ${CMAKE_BINARY_DIR}/coot/coot_env.js
Module.preRun = [function() {ENV.COOT_DATA_DIR="${coot_src}"}]
)

add_executable(fix-nomenclature ${coot_src}/src/fix-nomenclature.cc)
target_link_options(fix-nomenclature PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(fix-nomenclature PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(fix-nomenclature mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(fix-nomenclature PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(fix-nomenclature PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(rama-data ${coot_src}/auxil/rama/rama-data.cc)
target_link_options(rama-data PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(rama-data PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(rama-data mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(rama-data PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(rama-data PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(rama-doughnut ${coot_src}/auxil/rama/rama-doughnut.cc)
target_link_options(rama-doughnut PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(rama-doughnut PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(rama-doughnut mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(rama-doughnut PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(rama-doughnut PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(catcheck ${coot_src}/auxil/catcheck/catcheck.cc)
target_link_options(catcheck PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(catcheck PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(catcheck mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(catcheck PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(catcheck PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(diff-vec ${coot_src}/auxil/vectors/diff-vec.cc)
target_link_options(diff-vec PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(diff-vec PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(diff-vec mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(diff-vec PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(diff-vec PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(coot-daca ${coot_src}/analysis/coot-daca.cc)
target_link_options(coot-daca PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(coot-daca PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(coot-daca mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(coot-daca PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(coot-daca PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-cablam ${coot_src}/analysis/test-cablam.cc)
target_link_options(test-cablam PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-cablam PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-cablam mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-cablam PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-cablam PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-stats ${coot_src}/analysis/test-stats.cc)
target_link_options(test-stats PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-stats PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-stats mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-stats PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-stats PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(improper-dihedrals ${coot_src}/analysis/improper-dihedrals.cc)
target_link_options(improper-dihedrals PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(improper-dihedrals PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(improper-dihedrals mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(improper-dihedrals PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(improper-dihedrals PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-mogul ${coot_src}/analysis/test-mogul.cc)
target_link_options(test-mogul PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-mogul PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-mogul mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-mogul PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-mogul PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(peptide-projection ${coot_src}/analysis/peptide-projection.cc)
target_link_options(peptide-projection PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(peptide-projection PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(peptide-projection mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(peptide-projection PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(peptide-projection PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(bfactan ${coot_src}/analysis/bfactan.cc)
target_link_options(bfactan PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(bfactan PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(bfactan mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(bfactan PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(bfactan PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-align ${coot_src}/analysis/test-align.cc)
target_link_options(test-align PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-align PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-align mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-align PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-align PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-occlusion ${coot_src}/density-contour/test-occlusion.cc)
target_link_options(test-occlusion PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-occlusion PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-occlusion mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-occlusion PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-occlusion PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(with-geometry ${coot_src}/ideal/with-geometry.cc)
target_link_options(with-geometry PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(with-geometry PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(with-geometry mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(with-geometry PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(with-geometry PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(lv ${coot_src}/ideal/lv.cc)
target_link_options(lv PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(lv PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(lv mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(lv PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(lv PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-rama-plot ${coot_src}/ideal/test-rama-plot.cc)
target_link_options(test-rama-plot PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-rama-plot PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-rama-plot mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl png z nodefs.js)
target_include_directories(test-rama-plot PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-rama-plot PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(crankshaft-test ${coot_src}/ideal/crankshaft-test.cc)
target_link_options(crankshaft-test PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(crankshaft-test PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(crankshaft-test mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(crankshaft-test PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(crankshaft-test PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(logramatest.cpp ${coot_src}/ideal/logramatest.cpp)
target_link_options(logramatest.cpp PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(logramatest.cpp PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(logramatest.cpp mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(logramatest.cpp PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(logramatest.cpp PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-indexing ${coot_src}/ideal/test-indexing.cc)
target_link_options(test-indexing PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-indexing PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-indexing mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-indexing PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-indexing PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(mini-rsr ${coot_src}/ideal/mini-rsr.cc)
target_link_options(mini-rsr PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(mini-rsr PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(mini-rsr mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(mini-rsr PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(mini-rsr PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(tiddly ${coot_src}/tw/tiddly.cc)
target_link_options(tiddly PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(tiddly PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(tiddly mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(tiddly PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(tiddly PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-logging ${coot_src}/utils/test-logging.cc)
target_link_options(test-logging PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-logging PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-logging mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-logging PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-logging PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(train-pepflip ${coot_src}/db-main/train-pepflip.cc)
target_link_options(train-pepflip PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(train-pepflip PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(train-pepflip mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(train-pepflip PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(train-pepflip PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(testdbmain ${coot_src}/db-main/testdbmain.cc)
target_link_options(testdbmain PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(testdbmain PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(testdbmain mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(testdbmain PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(testdbmain PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(trace-high-res ${coot_src}/high-res/trace-high-res.cc)
target_link_options(trace-high-res PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(trace-high-res PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(trace-high-res mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(trace-high-res PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(trace-high-res PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-atom-graph ${coot_src}/high-res/test-atom-graph.cc)
target_link_options(test-atom-graph PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-atom-graph PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-atom-graph mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-atom-graph PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-atom-graph PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-spherical ${coot_src}/coot-utils/test-spherical.cc)
target_link_options(test-spherical PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-spherical PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-spherical mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-spherical PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-spherical PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-cod-atom-types ${coot_src}/coot-utils/test-cod-atom-types.cc)
target_link_options(test-cod-atom-types PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-cod-atom-types PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-cod-atom-types mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-cod-atom-types PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-cod-atom-types PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(dictionary-atom-types ${coot_src}/coot-utils/dictionary-atom-types.cc)
target_link_options(dictionary-atom-types PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(dictionary-atom-types PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(dictionary-atom-types mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(dictionary-atom-types PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(dictionary-atom-types PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-elastic ${coot_src}/coot-utils/test-elastic.cc)
target_link_options(test-elastic PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-elastic PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-elastic mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-elastic PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-elastic PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-convolute ${coot_src}/coot-utils/test-convolute.cc)
target_link_options(test-convolute PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-convolute PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-convolute mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-convolute PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-convolute PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(cod-db-access ${coot_src}/coot-utils/cod-db-access.cc)
target_link_options(cod-db-access PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(cod-db-access PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(cod-db-access mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(cod-db-access PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(cod-db-access PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-5-residue-fragments ${coot_src}/coot-utils/test-5-residue-fragments.cc)
target_link_options(test-5-residue-fragments PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-5-residue-fragments PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-5-residue-fragments mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-5-residue-fragments PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-5-residue-fragments PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-hole ${coot_src}/coot-utils/test-hole.cc)
target_link_options(test-hole PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-hole PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-hole mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-hole PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-hole PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-glyco-torsions ${coot_src}/coot-utils/test-glyco-torsions.cc)
target_link_options(test-glyco-torsions PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-glyco-torsions PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-glyco-torsions mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-glyco-torsions PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-glyco-torsions PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-segmap ${coot_src}/coot-utils/test-segmap.cc)
target_link_options(test-segmap PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-segmap PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-segmap mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-segmap PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-segmap PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-h-bonds ${coot_src}/coot-utils/test-h-bonds.cc)
target_link_options(test-h-bonds PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-h-bonds PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-h-bonds mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-h-bonds PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-h-bonds PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-morph ${coot_src}/coot-utils/test-morph.cc)
target_link_options(test-morph PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-morph PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-morph mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-morph PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-morph PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(mmrrcc ${coot_src}/coot-utils/mmrrcc.cc)
target_link_options(mmrrcc PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(mmrrcc PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(mmrrcc mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(mmrrcc PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(mmrrcc PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-coot-utils ${coot_src}/coot-utils/test-coot-utils.cc)
target_link_options(test-coot-utils PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-coot-utils PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-coot-utils mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-coot-utils PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-coot-utils PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-shelx-reader ${coot_src}/coot-utils/test-shelx-reader.cc)
target_link_options(test-shelx-reader PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-shelx-reader PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-shelx-reader mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-shelx-reader PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-shelx-reader PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(slurp-map ${coot_src}/coot-utils/slurp-map.cc)
target_link_options(slurp-map PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(slurp-map PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(slurp-map mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(slurp-map PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(slurp-map PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-chem-feat ${coot_src}/coot-utils/test-chem-feat.cc)
target_link_options(test-chem-feat PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-chem-feat PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-chem-feat mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-chem-feat PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-chem-feat PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-emma ${coot_src}/coot-utils/test-emma.cc)
target_link_options(test-emma PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-emma PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-emma mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-emma PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../checkout/fftw-2.1.5/fftw ../checkout/fftw-2.1.5/rfftw)
target_compile_options(test-emma PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-coot-probe ${coot_src}/coot-utils/test-coot-probe.cc)
target_link_options(test-coot-probe PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-coot-probe PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-coot-probe mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-coot-probe PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-coot-probe PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-transform ${coot_src}/coords/test-transform.cc)
target_link_options(test-transform PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-transform PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-transform mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-transform PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-transform PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-phenix-geo ${coot_src}/coords/test-phenix-geo.cc)
target_link_options(test-phenix-geo PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-phenix-geo PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-phenix-geo mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-phenix-geo PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-phenix-geo PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(make-shelx-restraints ${coot_src}/geometry/make-shelx-restraints.cc)
target_link_options(make-shelx-restraints PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(make-shelx-restraints PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(make-shelx-restraints mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(make-shelx-restraints PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(make-shelx-restraints PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-ccp4srs ${coot_src}/geometry/test-ccp4srs.cc)
target_link_options(test-ccp4srs PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-ccp4srs PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-ccp4srs mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(test-ccp4srs PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-ccp4srs PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(compare-dictionaries ${coot_src}/geometry/compare-dictionaries.cc)
target_link_options(compare-dictionaries PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(compare-dictionaries PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(compare-dictionaries mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(compare-dictionaries PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(compare-dictionaries PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(dictionary-bond-distributions ${coot_src}/geometry/dictionary-bond-distributions.cc)
target_link_options(dictionary-bond-distributions PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(dictionary-bond-distributions PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(dictionary-bond-distributions mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(dictionary-bond-distributions PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(dictionary-bond-distributions PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(available-comp-id ${coot_src}/geometry/available-comp-id.cc)
target_link_options(available-comp-id PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(available-comp-id PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(available-comp-id mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(available-comp-id PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(available-comp-id PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-read-components ${coot_src}/geometry/test-read-components.cc)
target_link_options(test-read-components PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-read-components PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-read-components mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-read-components PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-read-components PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-geometry ${coot_src}/geometry/test-geometry.cc)
target_link_options(test-geometry PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-geometry PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-geometry mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-geometry PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-geometry PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-srs-standalone ${coot_src}/lbg/test-srs-standalone.cc)
target_link_options(test-srs-standalone PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-srs-standalone PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-srs-standalone mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-srs-standalone PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-srs-standalone PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(lidia-main ${coot_src}/lbg/lidia-main.cc)
target_link_options(lidia-main PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(lidia-main PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(lidia-main mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(lidia-main PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(lidia-main PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(cootilus-demo.cpp ${coot_src}/cootilus/cootilus-demo.cpp)
target_link_options(cootilus-demo.cpp PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(cootilus-demo.cpp PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(cootilus-demo.cpp mmdb2 ssm clipper-minimol clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(cootilus-demo.cpp PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(cootilus-demo.cpp PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(ligand-percentiles ${coot_src}/ligand/ligand-percentiles.cc)
target_link_options(ligand-percentiles PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(ligand-percentiles PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(ligand-percentiles mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(ligand-percentiles PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(ligand-percentiles PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(make-ligands-db ${coot_src}/ligand/make-ligands-db.cc)
target_link_options(make-ligands-db PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(make-ligands-db PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(make-ligands-db mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(make-ligands-db PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(make-ligands-db PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-tube-finder ${coot_src}/ligand/test-tube-finder.cc)
target_link_options(test-tube-finder PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-tube-finder PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-tube-finder mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(test-tube-finder PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-tube-finder PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-fffear-in-coot ${coot_src}/ligand/test-fffear-in-coot.cc)
target_link_options(test-fffear-in-coot PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-fffear-in-coot PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-fffear-in-coot mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(test-fffear-in-coot PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-fffear-in-coot PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(identify-protein ${coot_src}/ligand/identify-protein.cc)
target_link_options(identify-protein PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(identify-protein PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(identify-protein mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(identify-protein PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(identify-protein PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-ligand ${coot_src}/ligand/test-ligand.cc)
target_link_options(test-ligand PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-ligand PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-ligand mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-ligand PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-ligand PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(find-waters ${coot_src}/ligand/find-waters.cc)
target_link_options(find-waters PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(find-waters PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(find-waters mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(find-waters PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(find-waters PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(find-ligand ${coot_src}/ligand/find-ligand.cc)
target_link_options(find-ligand PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(find-ligand PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(find-ligand mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(find-ligand PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(find-ligand PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-trace ${coot_src}/ligand/test-trace.cc)
target_link_options(test-trace PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-trace PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-trace mmdb2 ssm clipper-minimol clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(test-trace PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-trace PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

#add_executable(res-tracer ${coot_src}/ligand/res-tracer.cc)
#target_link_options(res-tracer PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
#target_link_directories(res-tracer PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
#target_link_libraries(res-tracer mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
#target_include_directories(res-tracer PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
#target_compile_options(res-tracer PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-side-chain-densities ${coot_src}/ligand/test-side-chain-densities.cc)
target_link_options(test-side-chain-densities PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-side-chain-densities PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-side-chain-densities mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-side-chain-densities PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-side-chain-densities PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(cootaneer-demo.cpp ${coot_src}/cootaneer/cootaneer-demo.cpp)
target_link_options(cootaneer-demo.cpp PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(cootaneer-demo.cpp PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(cootaneer-demo.cpp mmdb2 ssm clipper-minimol clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(cootaneer-demo.cpp PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(cootaneer-demo.cpp PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(density-score-by-residue-src ${coot_src}/src/density-score-by-residue-src.cc)
target_link_options(density-score-by-residue-src PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(density-score-by-residue-src PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(density-score-by-residue-src mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(density-score-by-residue-src PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(density-score-by-residue-src PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-chol ${coot_src}/src/test-chol.cc)
target_link_options(test-chol PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-chol PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-chol mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(test-chol PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(test-chol PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(align ${coot_src}/src/align.cc ${coot_src}/src/coot-align.cc)
target_link_options(align PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(align PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(align mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(align PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(align PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

