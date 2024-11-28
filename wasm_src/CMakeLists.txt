project(coot)
cmake_minimum_required(VERSION 3.13)

set(CMAKE_CXX_STANDARD 17)

set(CMAKE_EXECUTABLE_SUFFIX ".js")

set(coot_src ${CMAKE_CURRENT_SOURCE_DIR}/../checkout/coot-1.0)

# XDATADIR should be "${install_top_dir}/share/data"
add_definitions(-DHAVE_BOOST_BASED_THREAD_POOL_LIBRARY -DUSE_GEMMI -DCLIPPER_HAS_TOP8000 -DMAKE_ENHANCED_LIGAND_TOOLS -DANALYSE_REFINEMENT_TIMING -DPACKAGE_VERSION="1.0" -DHAVE_CXX_THREAD -DHAVE_BOOST -DHAVE_GSL -DPKGDATADIR="${coot_src}/pixmaps" -DDATADIR="${coot_src}/data" -DXDATADIR="${coot_src}/share/data")

set(coot_rotamer_data
${coot_src}/rama-data/rota500-pro.data
${coot_src}/rama-data/rota500-cys.data
${coot_src}/rama-data/rota500-ser.data
${coot_src}/rama-data/rota500-thr.data
${coot_src}/rama-data/rota500-val.data
${coot_src}/rama-data/rota500-phetyr.data
${coot_src}/rama-data/rota500-asp.data
${coot_src}/rama-data/rota500-trp.data
${coot_src}/rama-data/rota500-ile.data
${coot_src}/rama-data/rota500-leu.data
${coot_src}/rama-data/rota500-his.data
${coot_src}/rama-data/rota500-asn.data
${coot_src}/rama-data/rama500-pro.data
${coot_src}/rama-data/rama500-prepro.data
${coot_src}/rama-data/rama500-general.data
${coot_src}/rama-data/rama500-gly-sym.data
${coot_src}/rama-data/rota500-met.data
${coot_src}/rama-data/rota500-glu.data
${coot_src}/rama-data/rota500-gln.data
)

#These ones do not compile for various reasons - mostly Python
#[[
${coot_src}/pyrogen/cairo-molecule.cc
${coot_src}/pyrogen/restraints-boost.cc
${coot_src}/coot-utils/test-cod-atom-types.cc
${coot_src}/coot-utils/test-cod-atom-types-from-sm-cif.cc
${coot_src}/coot-utils/test-chem-feat.cc
${coot_src}/coords/mmdb.cc
${coot_src}/lbg/lbg.cc
${coot_src}/lbg/test_lbg_functions.cc
${coot_src}/lbg/alerts-list.cc
${coot_src}/lbg/qed-interface.cc
${coot_src}/lbg/lidia-main.cc
${coot_src}/lbg/qed-properties.cc
${coot_src}/src/main.cc
${coot_src}/src/testing.cc
${coot_src}/src/molecule-class-info-maps-2.cc
${coot_src}/src/coot-extended.cc
${coot_src}/src/molecule-class-info-residues.cc
${coot_src}/src/flev.cc
${coot_src}/src/coot-embedded.cc
${coot_src}/src/lbg-interface.cc
${coot_src}/src/c-interface-ligands.cc
${coot_src}/src/graphics-ligand-view.cc
${coot_src}/src/command-line.cc
${coot_src}/src/graphics-ligand-mesh-molecule.cc
${coot_src}/src/c-interface-image.cc
]]

set(coot_exception_srcs
${coot_src}/api/mmcif-tests.cc
${coot_src}/api/molecules-container-gltf.cc
${coot_src}/api/coot-molecule-modelling.cc
${coot_src}/layla/ligand_editor_canvas.cpp
${coot_src}/layla/ligand_editor_canvas/core.cpp
${coot_src}/layla/ligand_editor_canvas/model.cpp
${coot_src}/layla/ligand_editor_canvas/tools.cpp
${coot_src}/layla/ligand_editor_canvas/render.cpp
${coot_src}/layla/utils.cpp
${coot_src}/layla/qed.cpp
${coot_src}/lhasa/lhasa.cpp
${coot_src}/lhasa/glog_replacement.cpp
${coot_src}/lidia-core/svg-molecule.cc
${coot_src}/lidia-core/cod-types.cc
${coot_src}/lidia-core/cod-atom-types.cc
${coot_src}/lidia-core/chemical-feature-clusters.cc
${coot_src}/lidia-core/bond-record-container-t.cc
${coot_src}/lidia-core/atom-types.cc
${coot_src}/lidia-core/cod-atom-type-t.cc
${coot_src}/lidia-core/rdkit-interface.cc
${coot_src}/lidia-core/bond-table-record-t.cc
${coot_src}/utils/base64-encode-decode.cc
${coot_src}/pli/pi-stacking.cc
${coot_src}/coot-utils/cmtz-interface.cc
${coot_src}/coot-utils/lidia-core-functions.cc
${coot_src}/coot-utils/atom-selection-container.cc
${coot_src}/coot-utils/diff-diff-map-peaks.cc
${coot_src}/coot-utils/gltf-export.cc
${coot_src}/coot-utils/texture-as-floats.cc
${coot_src}/src/coot-hydrogens.cc
${coot_src}/src/cfc.cc
${coot_src}/MoleculesToTriangles/CXXSurface/CXXBall.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXChargeTable.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXCircle.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXCircleNode.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXCoord.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXCreator.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXException.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXFFTSolventMap.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXFortranFile.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXNewHood.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXQADSurface.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXQADSurfaceStaticData.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSpace.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSphereElement.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSphereNode.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSphereTriangle.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSphereTriangleEdge.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSurface.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSurfaceMaker.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXSurfaceVertex.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXTorusElement.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXTorusNode.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXTriangle.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXUtils.cpp
${coot_src}/MoleculesToTriangles/CXXSurface/CXXVCN.cpp
#${coot_src}/MoleculesToTriangles/CXXSurface/ElectroSurface.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/AtomPropertyRampColorRule.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/BallsPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/BondsPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/BoxSectionPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/ColorRule.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/ColorScheme.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/CompoundSelection.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/CXXMatrix.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/CylinderPoint.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/CylindersPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/DirectedPositionedEntity.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/DiscreteSegment.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/DishyBase.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/DisplayPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/ElectrostaticColorScheme.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/FlatFanPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Light.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/LinesPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/MolecularRepresentation.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/MolecularRepresentationInstance.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/MyMolecule.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/NRStuff.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/oglPolyhedron.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Polyhedron.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/PositionedEntity.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Quaternion.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Renderer.cpp
# ${coot_src}/MoleculesToTriangles/CXXClasses/RendererGL.cpp
# ${coot_src}/MoleculesToTriangles/CXXClasses/RendererGLSL.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Representation.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/RepresentationInstance.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/RotatedTranslatedScaledEntity.cpp
# ${coot_src}/MoleculesToTriangles/CXXClasses/SceneSetup.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/SecondaryColorScheme.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/SolidColorRule.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/SpherePrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/SticksPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/SurfacePrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Vector2.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/Vector3.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/VertexColorNormalPrimitive.cpp
${coot_src}/MoleculesToTriangles/CXXClasses/lfit.c
${coot_src}/api/molecules-container-maps.cc
${coot_src}/api/instancing.cc
${coot_src}/api/rigid-body-fit.cc
${coot_src}/api/molecules-container-bucca-ml-growing.cc
${coot_src}/api/molecules-container-mmrrcc.cc
${coot_src}/api/molecules-container-superpose.cc
${coot_src}/api/coot-molecule-validation.cc
${coot_src}/api/molecules-container-modelling.cc
${coot_src}/api/add-terminal-residue.cc
${coot_src}/api/interfaces.cc
${coot_src}/api/colour-functions.cc
${coot_src}/api/coot-colour.cc
${coot_src}/api/coot-molecule.cc
${coot_src}/api/coot-molecule-backup.cc
${coot_src}/api/coot-molecule-bonds.cc
${coot_src}/api/coot-molecule-bonds-instanced.cc
${coot_src}/api/coot-molecule-maps.cc
${coot_src}/api/coot-molecule-moltris.cc
${coot_src}/api/coot-molecule-merge-molecules.cc
${coot_src}/api/coot-molecule-refine.cc
${coot_src}/api/coot-molecule-replace-fragment.cc
${coot_src}/api/moorhen-h-bonds.cc
${coot_src}/api/phi-psi-prob.cc
${coot_src}/api/add-terminal-residue.cc
${coot_src}/api/molecules-container-ligand-fitting.cc
${coot_src}/api/molecules-container.cc
${coot_src}/api/rama-plot-phi-psi.cc
${coot_src}/api/coot-molecule-change-chain-id.cc
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
${coot_src}/density-contour/gaussian-surface.cc
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
${coot_src}/utils/colour-holder.cc
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
${coot_src}/utils/setup-syminfo.cc
${coot_src}/db-main/db-strands.cc
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
${coot_src}/pli/sdf-interface.cc
${coot_src}/utils/base64-encode-decode.cc
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
${coot_src}/coot-utils/cylinder.cc
${coot_src}/coot-utils/cylinder-with-rotation-translation.cc
${coot_src}/coot-utils/prideout-octasphere.cc
${coot_src}/coot-utils/oct.cc
${coot_src}/coot-utils/shapes.cc
${coot_src}/coot-utils/simple-mesh.cc
${coot_src}/coot-utils/find-water-baddies.cc
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
${coot_src}/geometry/intercept-3GP.cc
${coot_src}/build/CalphaBuild.cc
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
glycoblocks.cc
${CMAKE_CURRENT_SOURCE_DIR}/../metaballs/metaballs.cc
${CMAKE_CURRENT_SOURCE_DIR}/../metaballs/metaballs-mmdb.cc
)

add_library(coot STATIC
${coot_exception_srcs}
${coot_src}/ideal/write-png.cc
)

set(ENV{EM_PKG_CONFIG_PATH} ${CMAKE_INSTALL_PREFIX}/lib/pkgconfig/)
set(ENV{PKG_CONFIG_PATH} ${CMAKE_INSTALL_PREFIX}/lib/pkgconfig/)
set(ENV{EM_PKG_CONFIG_LIBDIR} ${CMAKE_INSTALL_PREFIX}/lib/)
set(ENV{PKG_CONFIG_LIBDIR} ${CMAKE_INSTALL_PREFIX}/lib/)

include(FindPkgConfig)
pkg_check_modules(DEPS REQUIRED sigc++-3.0 graphene-1.0 jsoncpp igraph)

find_package(RDKit REQUIRED)
find_package(Boost COMPONENTS iostreams thread serialization system REQUIRED)
pkg_check_modules(GSL REQUIRED gsl)
pkg_check_modules(FreeType REQUIRED freetype2)
pkg_check_modules(libpng REQUIRED libpng16)

target_include_directories(coot PRIVATE 
    ${coot_src} 
    ${coot_src}/coords 
    ${coot_src}/ccp4mg-utils 
    ${coot_src}/utils 
    ${coot_src}/src 
    ${CMAKE_INSTALL_PREFIX}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../include 
    ${GSL_INCLUDE_DIRS}
    ${DEPS_INCLUDE_DIRS}
)

set_target_properties(coot PROPERTIES COMPILE_FLAGS "-D__MOORHEN__ -DHAVE_BOOST_BASED_THREAD_POOL_LIBRARY -Wno-deprecated-declarations -Wno-deprecated-builtins -pthread -DHAVE_CXX11=1 -DHAVE_SSMLIB -DHAVE_BOOST -DNODERAWFS -DFFTW_ENABLE_FLOAT" LINK_FLAGS "-pthread -sASSERTIONS=2")

set_source_files_properties(${coot_exception_srcs} PROPERTIES COMPILE_FLAGS "-DHAVE_BOOST_BASED_THREAD_POOL_LIBRARY -pthread -DHAVE_SSMLIB -DHAVE_BOOST -DNODERAWFS -DFFTW_ENABLE_FLOAT" )

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
FILE(MAKE_DIRECTORY "data/privateer_data")
FILE(COPY ../checkout/privateer-wasm/data/linkage_torsions/privateer_torsions_z_score_database.json DESTINATION data/privateer_data )

FILE(COPY ../checkout/libccp4/data/syminfo.lib DESTINATION data/ccp4_lib/data )
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
FILE(COPY ../checkout/monomers/p/PEG.cif DESTINATION data/ccp4_lib/data/monomers/p )
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
FILE(COPY ../checkout/monomers/a/ATP.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/a/ADP.cif DESTINATION data/ccp4_lib/data/monomers/a )
FILE(COPY ../checkout/monomers/ener_lib.cif DESTINATION data/ccp4_lib/data/monomers )
FILE(COPY ../checkout/monomers/list/mon_lib_list.cif DESTINATION data/ccp4_lib/data/monomers/list )
FILE(COPY ${coot_src}/standard-residues.pdb DESTINATION data/coot )
FILE(COPY ${coot_rotamer_data} DESTINATION data/coot/rama-data )
FILE(COPY ${coot_src}/data/metal/metal-N-distance.table DESTINATION data/coot/data/metal )
FILE(COPY ${coot_src}/data/metal/metal-O-distance.table DESTINATION data/coot/data/metal )
FILE(COPY ${coot_src}/data/metal/metal-S-distance.table DESTINATION data/coot/data/metal )
FILE(COPY ${CMAKE_INSTALL_PREFIX}/share/RDKit/Data/BaseFeatures.fdef DESTINATION data/RDKit/Data )

add_executable(moorhen untar.c moorhen-wrappers.cc ../wasm_src_frontend/headers.cc gemmi-wrappers.cc small_molecule_to_cif.cc smilestopdb.cc ${coot_src}/lhasa/embind.cpp)
if(${MEMORY64} MATCHES "1")
target_link_options(moorhen PRIVATE -sASSERTIONS=2 -pthread -sPTHREAD_POOL_SIZE=32 -sPTHREAD_POOL_SIZE_STRICT=32 -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=4096MB -sMAXIMUM_MEMORY=8192MB --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createCoot64Module -sEXPORTED_RUNTIME_METHODS=['FS'] --pre-js ${CMAKE_CURRENT_SOURCE_DIR}/coot_env_web.js)
set_target_properties(moorhen PROPERTIES OUTPUT_NAME moorhen64)
target_link_directories(moorhen PUBLIC 
    ${CMAKE_INSTALL_PREFIX}/install64/lib
)
else()
target_link_options(moorhen PRIVATE -sASSERTIONS=2 -pthread -sPTHREAD_POOL_SIZE=32 -sPTHREAD_POOL_SIZE_STRICT=32 -sALLOW_MEMORY_GROWTH=1 --bind -sFORCE_FILESYSTEM=1 -sMODULARIZE=1 -sEXPORT_NAME=createCootModule -sEXPORTED_RUNTIME_METHODS=['FS'] --pre-js ${CMAKE_CURRENT_SOURCE_DIR}/coot_env_web.js)
target_link_directories(moorhen PUBLIC 
    ${CMAKE_INSTALL_PREFIX}/install/lib
)
endif()


target_link_libraries(moorhen 
    ssm
    mmdb2
    clipper-minimol
    clipper-phs
    clipper-mmdb
    clipper-cif
    clipper-core
    clipper-contrib
    clipper-ccp4
    clipper-gemmi
    ccp4
    gemmi_cpp
    privateer
    slicendice_cpp
    fftw
    rfftw
    fftw3f
    coot
    ${GSL_LIBRARIES}
    ${DEPS_LIBRARIES}
    RDKit::MolDraw2D
    RDKit::ForceFieldHelpers
    RDKit::Descriptors
    RDKit::ForceField
    RDKit::SubstructMatch
    RDKit::Optimizer
    RDKit::DistGeomHelpers
    RDKit::DistGeometry
    RDKit::ChemReactions
    RDKit::Alignment
    RDKit::EigenSolvers
    RDKit::Depictor
    RDKit::coordgen
    RDKit::MolChemicalFeatures
    RDKit::PartialCharges
    RDKit::FileParsers
    RDKit::RDGeometryLib
    RDKit::GraphMol
    RDKit::DetermineBonds
    RDKit::ShapeHelpers
    RDKit::Fingerprints
    RDKit::MolAlign
    RDKit::MolTransforms
    RDKit::ChemTransforms
    RDKit::SmilesParse
    RDKit::FilterCatalog
    RDKit::Catalogs
    RDKit::Subgraphs
    RDKit::RDGeneral
    RDKit::DataStructs
    RDKit::GenericGroups
    Boost::thread
    Boost::serialization
    freetype
    png16
    m
    z
    idbfs.js
)

target_include_directories(moorhen PRIVATE 
    ${coot_src}
    ${coot_src}/ccp4mg-utils
    ${coot_src}/src
    ${CMAKE_INSTALL_PREFIX}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../include 
    ${CMAKE_CURRENT_SOURCE_DIR}/../wasm_src_frontend
    ${DEPS_INCLUDE_DIRS}
)

target_compile_options(moorhen PUBLIC -DGEMMI_WRITE_IMPLEMENTATION -Wno-deprecated-builtins -Wno-deprecated-declarations -pthread -DFFTW_ENABLE_FLOAT -D_CCP4_WEB_EXAMPLE_)

if(${MEMORY64} MATCHES "1")
    set(MOORHEN_MODULE_SUFFIX "64")
else()
    set(MOORHEN_MODULE_SUFFIX "")
endif()

add_custom_target(create_tar ALL COMMAND
    ${CMAKE_COMMAND} -E tar "cfvz" "data.tar.gz" ${CMAKE_CURRENT_BINARY_DIR}/data)
add_dependencies(create_tar moorhen)

install(FILES ${CMAKE_CURRENT_BINARY_DIR}/data.tar.gz DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../baby-gru/public/baby-gru)

install(FILES ${CMAKE_CURRENT_BINARY_DIR}/moorhen${MOORHEN_MODULE_SUFFIX}.wasm
${CMAKE_CURRENT_BINARY_DIR}/moorhen${MOORHEN_MODULE_SUFFIX}.js
${CMAKE_CURRENT_SOURCE_DIR}/coot_env_web.js
DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../baby-gru/public)

install(FILES ${CMAKE_CURRENT_BINARY_DIR}/moorhen${MOORHEN_MODULE_SUFFIX}.wasm
${CMAKE_CURRENT_BINARY_DIR}/moorhen${MOORHEN_MODULE_SUFFIX}.js
${CMAKE_CURRENT_SOURCE_DIR}/coot_env_web.js
DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../moorhen_tests)
