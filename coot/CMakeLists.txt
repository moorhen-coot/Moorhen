project(coot)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_CXX_STANDARD 11)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

set(coot_src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/coot-1.0)
add_definitions(-DANALYSE_REFINEMENT_TIMING -DVERSION="1.0" -DPACKAGE_VERSION="1.0" -DHAVE_CXX_THREAD -DHAVE_BOOST -DHAVE_GSL -DPKGDATADIR="${coot_src}/pixmaps" -DDATADIR="${coot_src}/data")

#  pyrogen, compat, auxil, goograph, src ignored.

file(GLOB coot_rotamer_data
${coot_src}/rama-data/*.data
)

file(GLOB coot_exception_srcs
${coot_src}/api/molecules_container_modelling.cc
${coot_src}/api/add-terminal-residue.cc
${coot_src}/api/simple-mesh.cc
${coot_src}/api/interfaces.cc
${coot_src}/api/colour-functions.cc
${coot_src}/api/cylinder.cc
${coot_src}/api/coot-colour.cc
${coot_src}/api/coot_molecule.cc
${coot_src}/api/coot_molecule_bonds.cc
${coot_src}/api/add-terminal-residue.cc
${coot_src}/api/molecules_container.cc
${coot_src}/api/oct.cc
${coot_src}/api/prideout-octasphere.cc
${coot_src}/api/rama-plot-phi-psi.cc
${coot_src}/api/coot_molecule_maps.cc
${coot_src}/analysis/daca.cc
${coot_src}/analysis/kolmogorov.cc
${coot_src}/analysis/stats.cc
${coot_src}/analysis/bfkurt.cc
${coot_src}/analysis/mogul.cc
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
#${coot_src}/ideal/mini-rsr.cc
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
#${coot_src}/db-main/testdbmain.cc
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
#${coot_src}/pli/specs.cc
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
${coot_src}/coot-utils/blob-line.cc
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
${coot_src}/coot-utils/slurp-map.cc
${coot_src}/coot-utils/read-sm-cif.cc
${coot_src}/coot-utils/exp-fit.cc
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
#${coot_src}/build/testcabuild.cc
${coot_src}/mini-mol/mini-mol-utils.cc
${coot_src}/mini-mol/mini-mol.cc
${coot_src}/mini-mol/atom-quads.cc
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

add_library(coot STATIC
${coot_exception_srcs}
${coot_src}/ideal/write-png.cc
)

target_include_directories(coot PRIVATE ${coot_src} ${coot_src}/coords ${coot_src}/utils ${coot_src}/src ../include ../example ../checkout/ssm ../checkout/mmdb2 ../checkout/clipper ../checkout/fftw-2.1.5/fftw ../checkout/fftw-2.1.5/rfftw ../checkout/libccp4/ccp4 ../boost)

set_target_properties(coot PROPERTIES COMPILE_FLAGS "-pthread -DHAVE_BOOST -DNODERAWFS -DFFTW_ENABLE_FLOAT -s USE_LIBPNG=1 -s USE_ZLIB=1 -s USE_PTHREADS=1" LINK_FLAGS "-fexceptions -pthread -s USE_LIBPNG=1 -s USE_ZLIB=1 -s USE_PTHREADS=1")

set_source_files_properties(${coot_exception_srcs} PROPERTIES COMPILE_FLAGS "-fexceptions -pthread -DHAVE_BOOST -DNODERAWFS -DFFTW_ENABLE_FLOAT -s USE_LIBPNG=1 -s USE_ZLIB=1 -s USE_PTHREADS=1" )

FILE(WRITE ${CMAKE_BINARY_DIR}/coot/coot_env.js
Module.preRun = [function() {ENV.COOT_DATA_DIR="${coot_src}"}, function() {ENV.COOT_REFMAC_LIB_DIR="${CMAKE_BINARY_DIR}/ccp4_lib"}, function() {ENV.CCP4_LIB="${CMAKE_BINARY_DIR}/ccp4_lib"}]
)

FILE(MAKE_DIRECTORY "data/COOT_BACKUP/")
FILE(MAKE_DIRECTORY "data/coot/data/metal/")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/a")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/c")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/g")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/p")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/h")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/i")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/l")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/m")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/s")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/t")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/v")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/e")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/u")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/d")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/h")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/n")
FILE(MAKE_DIRECTORY "data/ccp4_lib/data/monomers/list")
FILE(COPY ../checkout/monomers/a/ALA.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/a/ASP.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/a/ASN.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/c/CYS.cif DESTINATION data/ccp4_lib/data/monomers/c )
FILE(COPY ../checkout/monomers/g/GLN.cif DESTINATION data/ccp4_lib/data/monomers/g )
FILE(COPY ../checkout/monomers/g/GLY.cif DESTINATION data/ccp4_lib/data/monomers/g )
FILE(COPY ../checkout/monomers/g/GLU.cif DESTINATION data/ccp4_lib/data/monomers/g )
FILE(COPY ../checkout/monomers/p/PHE.cif DESTINATION data/ccp4_lib/data/monomers/p )
FILE(COPY ../checkout/monomers/h/HIS.cif DESTINATION data/ccp4_lib/data/monomers/h )
FILE(COPY ../checkout/monomers/i/ILE.cif DESTINATION data/ccp4_lib/data/monomers/i )
FILE(COPY ../checkout/monomers/l/LYS.cif DESTINATION data/ccp4_lib/data/monomers/l )
FILE(COPY ../checkout/monomers/l/LEU.cif DESTINATION data/ccp4_lib/data/monomers/l )
FILE(COPY ../checkout/monomers/m/MET.cif DESTINATION data/ccp4_lib/data/monomers/m )
FILE(COPY ../checkout/monomers/m/MSE.cif DESTINATION data/ccp4_lib/data/monomers/m )
FILE(COPY ../checkout/monomers/p/PRO.cif DESTINATION data/ccp4_lib/data/monomers/p )
FILE(COPY ../checkout/monomers/a/ARG.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/s/SER.cif DESTINATION data/ccp4_lib/data/monomers/s )
FILE(COPY ../checkout/monomers/t/THR.cif DESTINATION data/ccp4_lib/data/monomers/t )
FILE(COPY ../checkout/monomers/v/VAL.cif DESTINATION data/ccp4_lib/data/monomers/v )
FILE(COPY ../checkout/monomers/t/TRP.cif DESTINATION data/ccp4_lib/data/monomers/t )
FILE(COPY ../checkout/monomers/t/TYR.cif DESTINATION data/ccp4_lib/data/monomers/t )
FILE(COPY ../checkout/monomers/p/PO4.cif DESTINATION data/ccp4_lib/data/monomers/p )
FILE(COPY ../checkout/monomers/s/SO4.cif DESTINATION data/ccp4_lib/data/monomers/s )
FILE(COPY ../checkout/monomers/g/GOL.cif DESTINATION data/ccp4_lib/data/monomers/g )
FILE(COPY ../checkout/monomers/c/CIT.cif DESTINATION data/ccp4_lib/data/monomers/c )
FILE(COPY ../checkout/monomers/e/EDO.cif DESTINATION data/ccp4_lib/data/monomers/e )
FILE(COPY ../checkout/monomers/a/A.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/c/C.cif DESTINATION data/ccp4_lib/data/monomers/c )
FILE(COPY ../checkout/monomers/g/G.cif DESTINATION data/ccp4_lib/data/monomers/g )
FILE(COPY ../checkout/monomers/u/U.cif DESTINATION data/ccp4_lib/data/monomers/u )
FILE(COPY ../checkout/monomers/d/DA.cif DESTINATION data/ccp4_lib/data/monomers/d )
FILE(COPY ../checkout/monomers/d/DC.cif DESTINATION data/ccp4_lib/data/monomers/d )
FILE(COPY ../checkout/monomers/d/DG.cif DESTINATION data/ccp4_lib/data/monomers/d )
FILE(COPY ../checkout/monomers/d/DT.cif DESTINATION data/ccp4_lib/data/monomers/d )
FILE(COPY ../checkout/monomers/h/HOH.cif DESTINATION data/ccp4_lib/data/monomers/h )
FILE(COPY ../checkout/monomers/n/NA.cif DESTINATION data/ccp4_lib/data/monomers/n )
FILE(COPY ../checkout/monomers/ener_lib.cif DESTINATION data/ccp4_lib/data/monomers )
FILE(COPY ../checkout/monomers/list/mon_lib_list.cif DESTINATION data/ccp4_lib/data/monomers/list )
FILE(COPY ${coot_src}/standard-residues.pdb DESTINATION data/coot )
FILE(COPY ${coot_rotamer_data} DESTINATION data/coot/rama-data )
FILE(COPY ${coot_src}/data/metal/metal-N-distance.table DESTINATION data/coot/data/metal )
FILE(COPY ${coot_src}/data/metal/metal-O-distance.table DESTINATION data/coot/data/metal )
FILE(COPY ${coot_src}/data/metal/metal-S-distance.table DESTINATION data/coot/data/metal )

add_executable(dynamic_read_lib ../example/dynamic_read_lib.cc)
target_link_options(dynamic_read_lib PRIVATE  -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(dynamic_read_lib PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(dynamic_read_lib mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(dynamic_read_lib PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(dynamic_read_lib PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

#[[
add_executable(fix-nomenclature ${coot_src}/src/fix-nomenclature.cc)
target_link_options(fix-nomenclature PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(fix-nomenclature PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(fix-nomenclature mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(fix-nomenclature PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(fix-nomenclature PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)
]]

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

add_executable(bfactan ${coot_src}/analysis/bfactan.cc)
target_link_options(bfactan PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(bfactan PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(bfactan mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(bfactan PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(bfactan PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

#[[
add_executable(mini-rsr ${coot_src}/ideal/mini-rsr.cc)
target_link_options(mini-rsr PRIVATE -fexceptions -pthread -sPTHREAD_POOL_SIZE=32 -sPTHREAD_POOL_SIZE_STRICT=32 -sUSE_PTHREADS=1 -sEXIT_RUNTIME=1 -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 -sASSERTIONS=1 --pre-js coot_env.js)
target_link_directories(mini-rsr PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(mini-rsr mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(mini-rsr PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(mini-rsr PUBLIC -fexceptions -pthread -D_MINI_RSR_MAIN_ -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -s USE_PTHREADS=1 -DNODERAWFS)
]]

add_executable(moorhen ../web_example/coot_example.cc)
target_link_options(moorhen PRIVATE -fexceptions -pthread -sPTHREAD_POOL_SIZE=32 -sPTHREAD_POOL_SIZE_STRICT=32 -sUSE_PTHREADS=1 -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createRSRModule -sEXPORTED_RUNTIME_METHODS=['FS','readFile'] --preload-file data  --pre-js coot_env_web.js)
target_link_directories(moorhen PUBLIC ../ssm ../mmdb2 ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4 ../fftw ../rfftw ../ccp4 ../privateer ../rvapi ../gesamt ../ccp4mg ../lib ../boost/stage/lib)
target_link_libraries(moorhen ssm rvapi gesamtlib mmdb2 clipper-minimol clipper-phs clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 privateer clipper-minimol ccp4mg coot gsl gslcblas boost_thread m z idbfs.js)
target_include_directories(moorhen PRIVATE ${coot_src} ${coot_src}/src ../checkout/boost_1_80_0 ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../include)
target_compile_options(moorhen PUBLIC -fexceptions -sUSE_PTHREADS=1 -pthread -DFFTW_ENABLE_FLOAT -D_CCP4_WEB_EXAMPLE_)

#[[
add_executable(mmrrcc ${coot_src}/coot-utils/mmrrcc.cc)
target_link_options(mmrrcc PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(mmrrcc PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(mmrrcc mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(mmrrcc PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(mmrrcc PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(test-chem-feat ${coot_src}/coot-utils/test-chem-feat.cc)
target_link_options(test-chem-feat PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-chem-feat PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-chem-feat mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(test-chem-feat PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(test-chem-feat PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

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

add_executable(cootilus-demo ${coot_src}/cootilus/cootilus-demo.cpp)
target_link_options(cootilus-demo.cpp PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(cootilus-demo.cpp PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(cootilus-demo.cpp mmdb2 ssm clipper-minimol clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(cootilus-demo.cpp PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(cootilus-demo.cpp PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(identify-protein ${coot_src}/ligand/identify-protein.cc)
target_link_options(identify-protein PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(identify-protein PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(identify-protein mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl nodefs.js)
target_include_directories(identify-protein PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(identify-protein PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

add_executable(find-waters ${coot_src}/ligand/find-waters.cc)
target_link_options(find-waters PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(find-waters PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(find-waters mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(find-waters PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(find-waters PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)
]]
#[[
add_executable(density_fit_analysis-test density_fit_analysis-test.cc)
target_link_options(density_fit_analysis-test PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1)
target_link_directories(density_fit_analysis-test PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(density_fit_analysis-test mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(density_fit_analysis-test PRIVATE ${coot_src} ${coot_src}/src ../checkout/boost_1_80_0 ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ../checkout/glm-0.9.9.8)
target_compile_options(density_fit_analysis-test PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)
]]
#[[
add_executable(find-ligand ${coot_src}/ligand/find-ligand.cc)
target_link_options(find-ligand PRIVATE -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(find-ligand PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(find-ligand mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(find-ligand PRIVATE ${coot_src} ${coot_src}/src ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw)
target_compile_options(find-ligand PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

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
]]

add_executable(test-molecules-container ${coot_src}/api/test_molecules_container.cc)
target_link_options(test-molecules-container PRIVATE -sEXIT_RUNTIME=1 -sPTHREAD_POOL_SIZE=32 -sPTHREAD_POOL_SIZE_STRICT=32 -sUSE_PTHREADS=1 -sALLOW_MEMORY_GROWTH=1 -sNODERAWFS=1 --pre-js coot_env.js)
target_link_directories(test-molecules-container PUBLIC ../mmdb2 ../ssm ../ccp4 ../lib ../clipper/cif ../clipper/mmdb ../clipper/core ../clipper/contrib ../clipper/ccp4)
target_link_libraries(test-molecules-container mmdb2 ssm clipper-mmdb clipper-cif clipper-core clipper-contrib clipper-ccp4 fftw rfftw ccp4 coot gsl gslcblas nodefs.js)
target_include_directories(test-molecules-container PRIVATE ${coot_src} ${coot_src}/src ../include ../checkout/boost_1_80_0 ../checkout/clipper/ ../checkout/mmdb2 ../checkout/mmdb2/mmdb2 ../checkout/ssm ../checkout/libccp4/ccp4 ../fftw ../rfftw ${dependency_install_dir}/include ../checkout/glm-0.9.9.8)
target_compile_options(test-molecules-container PUBLIC -DFFTW_ENABLE_FLOAT -D_CCP4_NODE_EXAMPLE_ -DNODERAWFS)

install(TARGETS moorhen DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../react-app/public/wasm)
install(FILES ${CMAKE_CURRENT_BINARY_DIR}/moorhen.wasm
${CMAKE_CURRENT_BINARY_DIR}/moorhen.worker.js
${CMAKE_CURRENT_BINARY_DIR}/moorhen.js
${CMAKE_CURRENT_BINARY_DIR}/moorhen.data
${CMAKE_CURRENT_BINARY_DIR}/coot_env_web.js
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../react-app/public/wasm)

install(FILES ${coot_src}/pixmaps/rama2_all.png
${coot_src}/pixmaps/rama2_gly.png
${coot_src}/pixmaps/rama2_pro.png
${coot_src}/pixmaps/rama2_ileval.png
${coot_src}/pixmaps/rama2_non_gly_pro.png
${coot_src}/pixmaps/rama2_non_gly_pro_pre_pro_ileval.png
${coot_src}/pixmaps/rama2_pre_pro.png
${coot_src}/textures/rama-plot-gly-normal.png
${coot_src}/textures/rama-plot-gly-outlier.png
${coot_src}/textures/rama-plot-other-normal.png
${coot_src}/textures/rama-plot-other-outlier.png
${coot_src}/textures/rama-plot-pro-normal.png
${coot_src}/textures/rama-plot-pro-outlier.png
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../react-app/public)

install(FILES ${CMAKE_CURRENT_BINARY_DIR}/moorhen.wasm
${CMAKE_CURRENT_BINARY_DIR}/moorhen.worker.js
${CMAKE_CURRENT_BINARY_DIR}/moorhen.js
${CMAKE_CURRENT_BINARY_DIR}/moorhen.data
${CMAKE_CURRENT_BINARY_DIR}/coot_env_web.js
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../baby-gru/public/wasm)

install(DIRECTORY 
${coot_src}/pixmaps
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../baby-gru/public)

install(FILES ${coot_src}/pixmaps/rama2_all.png
${coot_src}/textures/rama-plot-gly-normal.png
${coot_src}/textures/rama-plot-gly-outlier.png
${coot_src}/textures/rama-plot-other-normal.png
${coot_src}/textures/rama-plot-other-outlier.png
${coot_src}/textures/rama-plot-pro-normal.png
${coot_src}/textures/rama-plot-pro-outlier.png
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../baby-gru/public/pixmaps/)

install(FILES 
${coot_src}/api/gideondoesntapprove.mtz
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../baby-gru/public/tutorials RENAME moorhen-tutorial-map-number-1.mtz)

install(FILES 
${coot_src}/api/gideondoesntapprove.pdb
DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/../baby-gru/public/tutorials RENAME moorhen-tutorial-structure-number-1.pdb)
