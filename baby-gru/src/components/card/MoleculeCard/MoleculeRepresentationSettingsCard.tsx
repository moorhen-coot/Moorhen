import { Slider } from "@mui/material";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { MoleculeRepresentation } from "@/moorhen";
import { MoorhenMolecule } from "@/utils";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../../inputs";
import { MoorhenStack } from "../../interface-base";

type MoleculeSettingPanelProps =
    | { molecule: MoorhenMolecule; representation?: never }
    | { molecule?: never; representation: MoleculeRepresentation };
export const BondSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;
    const [bondWidth, setBondWidth] = useState<number>(molecule ? molecule.defaultBondOptions.width : representation.bondOptions.width);
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(
        molecule ? molecule.defaultBondOptions.atomRadiusBondRatio : representation.bondOptions.atomRadiusBondRatio
    );
    const [showAniso, setShowAniso] = useState<boolean>(
        molecule ? molecule.defaultBondOptions.showAniso : representation.bondOptions.showAniso
    );
    const [showOrtep, setShowOrtep] = useState<boolean>(
        molecule ? molecule.defaultBondOptions.showOrtep : representation.bondOptions.showOrtep
    );
    const [showHs, setShowHs] = useState<boolean>(molecule ? molecule.defaultBondOptions.showHs : representation.bondOptions.showHs);
    const [bondSmoothness, setBondSmoothness] = useState<number>(
        molecule
            ? molecule.defaultBondOptions.smoothness === 1
                ? 1
                : props.molecule.defaultBondOptions.smoothness === 2
                  ? 50
                  : 100
            : representation.bondOptions.smoothness === 1
              ? 1
              : representation.bondOptions.smoothness === 2
                ? 50
                : 100
    );

    useEffect(() => {
        if ([bondSmoothness, bondWidth, atomRadiusBondRatio, showAniso, showOrtep, showHs].some(item => item === null)) {
            return;
        }

        let representations: MoleculeRepresentation[];
        const bondOptions = {
            width: bondWidth,
            atomRadiusBondRatio: atomRadiusBondRatio,
            showAniso: showAniso,
            showOrtep: showOrtep,
            showHs: true,
            smoothness: bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3,
        };
        if (props.molecule) {
            representations = props.molecule.representations.filter(
                representation =>
                    representation.useDefaultBondOptions &&
                    representation.visible &&
                    ["CBs", "CAs", "ligands"].includes(representation.style)
            );

            props.molecule.defaultBondOptions = bondOptions;
        } else {
            representations = [representation];
            representation.bondOptions = bondOptions;
        }

        representations.forEach(rep => {
            if (rep.visible) {
                rep.redraw();
            }
        });
    }, [bondSmoothness, bondWidth, atomRadiusBondRatio, showAniso, showOrtep, showHs]);

    return (
        <MoorhenStack card>
            <MoorhenSlider
                sliderTitle="Bond width"
                externalValue={bondWidth}
                setExternalValue={value => setBondWidth(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.05}
                maxVal={0.5}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Radius-Bond ratio"
                externalValue={atomRadiusBondRatio}
                setExternalValue={value => setAtomRadiusBondRatio(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={1.0}
                maxVal={3.5}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenToggle type="switch" checked={showAniso} onChange={() => setShowAniso(prev => !prev)} label="Show Thermal ellipsoids" />
            <MoorhenToggle type="switch" checked={showOrtep} onChange={() => setShowOrtep(prev => !prev)} label="Ortep style" />
            {/* <MoorhenToggle type="switch" checked={showHs} onChange={() => setShowHs(prev => !prev)} label="Show Hs" /> */}
            <span>Bond Smoothness</span>
            <Slider
                aria-label="Smoothness"
                style={{ width: "80%", marginLeft: "2rem" }}
                value={bondSmoothness}
                onChange={(evt, value: number) => {
                    setBondSmoothness(value);
                }}
                valueLabelFormat={value => {
                    switch (value) {
                        case 1:
                            return "Coarse";
                        case 50:
                            return "Nice";
                        default:
                            return "Smooth";
                    }
                }}
                getAriaValueText={value => {
                    switch (value) {
                        case 1:
                            return "Coarse";
                        case 50:
                            return "Nice";
                        default:
                            return "Smooth";
                    }
                }}
                step={null}
                valueLabelDisplay="auto"
                marks={[
                    { value: 1, label: "Coarse" },
                    { value: 50, label: "Nice" },
                    { value: 100, label: "Smooth" },
                ]}
            />
        </MoorhenStack>
    );
};

const SurfaceSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;
    const [surfaceSigma, setSurfaceSigma] = useState<number>(
        molecule ? molecule.gaussianSurfaceSettings.sigma : representation.gaussianSurfaceSettings.sigma
    );
    const [surfaceLevel, setSurfaceLevel] = useState<number>(
        molecule ? molecule.gaussianSurfaceSettings.countourLevel : representation.gaussianSurfaceSettings.countourLevel
    );
    const [surfaceRadius, setSurfaceRadius] = useState<number>(
        molecule ? molecule.gaussianSurfaceSettings.boxRadius : representation.gaussianSurfaceSettings.boxRadius
    );
    const [surfaceGridScale, setSurfaceGridScale] = useState<number>(
        molecule ? molecule.gaussianSurfaceSettings.gridScale : representation.gaussianSurfaceSettings.gridScale
    );
    const [surfaceBFactor, setSurfaceBFactor] = useState<number>(
        molecule ? molecule.gaussianSurfaceSettings.bFactor : representation.gaussianSurfaceSettings.bFactor
    );

    useEffect(() => {
        if ([surfaceSigma, surfaceLevel, surfaceRadius, surfaceGridScale, surfaceBFactor].some(item => item === null)) {
            return;
        }

        const gaussianSurfaceSettings = {
            sigma: surfaceSigma,
            countourLevel: surfaceLevel,
            boxRadius: surfaceRadius,
            gridScale: surfaceGridScale,
            bFactor: surfaceBFactor,
        };

        let representations: MoleculeRepresentation[];
        if (props.molecule) {
            representations = props.molecule.representations.filter(
                representation => representation.visible && representation.style === "gaussian"
            );
            molecule.gaussianSurfaceSettings = gaussianSurfaceSettings;
        } else {
            representations = [representation];
            representation.gaussianSurfaceSettings = gaussianSurfaceSettings;
        }

        representations.forEach(rep => {
            if (rep.visible) {
                rep.redraw();
            }
        });
    }, [surfaceSigma, surfaceLevel, surfaceRadius, surfaceGridScale, surfaceBFactor]);

    return (
        <MoorhenStack card>
            <MoorhenSlider
                sliderTitle="Gauss. Surf. Sigma"
                externalValue={surfaceSigma}
                setExternalValue={value => setSurfaceSigma(value)}
                showMinMaxVal={false}
                stepButtons={1}
                minVal={0.01}
                maxVal={10}
                logScale={false}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="Gauss. Surf. Contour Level"
                externalValue={surfaceLevel}
                setExternalValue={value => setSurfaceLevel(value)}
                showMinMaxVal={false}
                stepButtons={1}
                minVal={0.01}
                maxVal={10}
                logScale={false}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="Gauss. Surf. Box Radius"
                externalValue={surfaceRadius}
                setExternalValue={value => setSurfaceRadius(value)}
                showMinMaxVal={false}
                stepButtons={1}
                minVal={0.01}
                maxVal={10}
                logScale={false}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="Gauss. Surf. Grid Scale"
                externalValue={surfaceGridScale}
                setExternalValue={value => setSurfaceGridScale(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={1.5}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Gauss. Surf. B-Factor"
                externalValue={surfaceBFactor}
                setExternalValue={value => setSurfaceBFactor(value)}
                showMinMaxVal={false}
                stepButtons={10}
                minVal={0}
                maxVal={100}
                logScale={false}
                decimalPlaces={0}
            />
        </MoorhenStack>
    );
};

export const SymmetrySettingsPanel = (props: {
    symmetryRadius: number;
    setSymmetryRadius: React.Dispatch<React.SetStateAction<number>>;
    molecule: moorhen.Molecule;
}) => {
    const [symmetryOn, setSymmetryOn] = useState<boolean>(props.molecule.symmetryOn);
    const [biomolOn, setBiomolOn] = useState<boolean>(props.molecule.biomolOn);
    const [showUnitCell, setShowUnitCell] = useState<boolean>(props.molecule.unitCellRepresentation?.visible);
    const dispatch = useDispatch();

    const { symmetryRadius, setSymmetryRadius } = props;

    useEffect(() => {
        if (props.molecule.symmetryOn !== symmetryOn) {
            props.molecule.toggleSymmetry();
        }
    }, [symmetryOn]);

    useEffect(() => {
        if (props.molecule.biomolOn !== biomolOn) {
            props.molecule.toggleBiomolecule();
        }
    }, [biomolOn]);

    useEffect(() => {
        if (showUnitCell) {
            props.molecule.drawUnitCell();
        } else {
            props.molecule.clearBuffersOfStyle("unitCell");
            dispatch(setRequestDrawScene(true));
        }
    }, [showUnitCell]);

    const assemblies = props.molecule.gemmiStructure.assemblies;
    let showAssemblies = false;
    for (let i = 0; i < assemblies.size(); i++) {
        const assembly = assemblies.get(i);
        const generators = assembly.generators;
        const n_gen = generators.size();
        let n_tot_op = 0;
        for (let i_gen = 0; i_gen < n_gen; i_gen++) {
            const gen = generators.get(i_gen);
            const operators = gen.operators;
            const n_op = operators.size();
            n_tot_op += n_op;
            gen.delete();
            operators.delete();
        }
        assembly.delete();
        generators.delete();

        if (n_tot_op === 60) {
            showAssemblies = true;
            break;
        }
    }
    assemblies.delete();

    return (
        <MoorhenStack gap={"0.5rem"} addMargin>
            <MoorhenToggle
                type="switch"
                checked={showUnitCell}
                onChange={() => {
                    setShowUnitCell(!showUnitCell);
                }}
                label="Show unit cell"
            />
            <MoorhenToggle
                type="switch"
                checked={symmetryOn}
                onChange={() => {
                    if (biomolOn && !symmetryOn) setBiomolOn(false);
                    setSymmetryOn(!symmetryOn);
                }}
                label="Show symmetry mates"
            />
            {showAssemblies && (
                <MoorhenToggle
                    type="switch"
                    checked={biomolOn}
                    onChange={() => {
                        if (symmetryOn && !biomolOn) setSymmetryOn(false);
                        setBiomolOn(!biomolOn);
                    }}
                    label="Show biomolecule"
                />
            )}
            <MoorhenSlider
                isDisabled={!symmetryOn}
                sliderTitle="Symmetry Radius"
                externalValue={symmetryRadius}
                setExternalValue={value => setSymmetryRadius(value)}
                showMinMaxVal={false}
                stepButtons={5}
                minVal={0.01}
                maxVal={100}
                logScale={false}
                decimalPlaces={0}
            />
        </MoorhenStack>
    );
};

export const RibbonSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;

    const [ribbonCoilThickness, setRibbonCoilThickness] = useState<number>(
        molecule ? molecule.defaultM2tParams.ribbonStyleCoilThickness : representation.m2tParams.ribbonStyleCoilThickness
    );
    const [ribbonHelixWidth, setRibbonHelixWidth] = useState<number>(
        molecule ? molecule.defaultM2tParams.ribbonStyleHelixWidth : representation.m2tParams.ribbonStyleHelixWidth
    );
    const [ribbonStrandWidth, setRibbonStrandWidth] = useState<number>(
        molecule ? molecule.defaultM2tParams.ribbonStyleStrandWidth : representation.m2tParams.ribbonStyleStrandWidth
    );
    const [ribbonArrowWidth, setRibbonArrowWidth] = useState<number>(
        molecule ? molecule.defaultM2tParams.ribbonStyleArrowWidth : representation.m2tParams.ribbonStyleArrowWidth
    );
    const [ribbonDNARNAWidth, setRibbonDNARNAWidth] = useState<number>(
        molecule ? molecule.defaultM2tParams.ribbonStyleDNARNAWidth : representation.m2tParams.ribbonStyleDNARNAWidth
    );
    const [ribbonAxialSampling, setRibbonAxialSampling] = useState<number>(
        molecule ? molecule.defaultM2tParams.ribbonStyleAxialSampling : representation.m2tParams.ribbonStyleAxialSampling
    );
    const [nucleotideRibbonStyle, setNucleotideRibbonStyle] = useState<"DishyBases" | "StickBases">(
        molecule ? molecule.defaultM2tParams.nucleotideRibbonStyle : representation.m2tParams.nucleotideRibbonStyle
    );
    const [dishStyleAngularSampling, setDishStyleAngularSampling] = useState<number>(
        molecule ? molecule.defaultM2tParams.dishStyleAngularSampling : representation.m2tParams.dishStyleAngularSampling
    );
    const [ssUsageScheme, setSsUsageScheme] = useState<number>(
        molecule ? molecule.defaultM2tParams.ssUsageScheme : representation.m2tParams.ssUsageScheme
    );

    useEffect(() => {
        if (
            [
                nucleotideRibbonStyle,
                ribbonArrowWidth,
                ribbonAxialSampling,
                ribbonCoilThickness,
                ribbonDNARNAWidth,
                ribbonHelixWidth,
                ribbonStrandWidth,
                dishStyleAngularSampling,
            ].some(item => item === null)
        ) {
            return;
        }

        const otherParams = molecule ? { ...molecule.defaultM2tParams } : { ...representation.m2tParams };
        const M2tParams = {
            ...otherParams,
            ribbonStyleArrowWidth: ribbonArrowWidth,
            ribbonStyleAxialSampling: ribbonAxialSampling,
            ribbonStyleCoilThickness: ribbonCoilThickness,
            ribbonStyleDNARNAWidth: ribbonDNARNAWidth,
            ribbonStyleHelixWidth: ribbonHelixWidth,
            ribbonStyleStrandWidth: ribbonStrandWidth,
            nucleotideRibbonStyle: nucleotideRibbonStyle,
            dishStyleAngularSampling: dishStyleAngularSampling,
            ssUsageScheme: ssUsageScheme,
        };

        let representations: MoleculeRepresentation[];
        if (props.molecule) {
            representations = props.molecule.representations.filter(
                representation => representation.useDefaultM2tParams && representation.visible && representation.style === "CRs"
            );

            molecule.defaultM2tParams = M2tParams;
        } else {
            representations = [representation];
            representation.m2tParams = M2tParams;
        }

        representations.forEach(rep => {
            if (rep.visible) {
                rep.redraw();
            }
        });
    }, [
        ribbonArrowWidth,
        ribbonAxialSampling,
        ribbonCoilThickness,
        ribbonDNARNAWidth,
        ribbonHelixWidth,
        ribbonStrandWidth,
        nucleotideRibbonStyle,
        dishStyleAngularSampling,
        ssUsageScheme,
    ]);

    return (
        <MoorhenStack card>
            <MoorhenSlider
                sliderTitle="Ribbon Coil Thickness"
                externalValue={ribbonCoilThickness}
                setExternalValue={value => setRibbonCoilThickness(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={2}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Ribbon Helix Width"
                externalValue={ribbonHelixWidth}
                setExternalValue={value => setRibbonHelixWidth(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Ribbon Strand Width"
                externalValue={ribbonStrandWidth}
                setExternalValue={value => setRibbonStrandWidth(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Ribbon Arrow Width"
                externalValue={ribbonArrowWidth}
                setExternalValue={value => setRibbonArrowWidth(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Ribbon Nucleotides Width"
                externalValue={ribbonDNARNAWidth}
                setExternalValue={value => setRibbonDNARNAWidth(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Ribbon Axial Sampling"
                externalValue={ribbonAxialSampling}
                setExternalValue={value => setRibbonAxialSampling(value)}
                showMinMaxVal={false}
                stepButtons={1}
                minVal={0}
                maxVal={15}
                logScale={false}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="Nucl. Dish Angular Sampling"
                externalValue={dishStyleAngularSampling}
                setExternalValue={value => setDishStyleAngularSampling(value)}
                showMinMaxVal={false}
                stepButtons={1}
                minVal={1}
                maxVal={64}
                logScale={false}
                decimalPlaces={0}
            />

            <MoorhenSelect
                label={"Secondary structure method"}
                value={ssUsageScheme}
                onChange={evt => setSsUsageScheme(parseInt(evt.target.value))}
            >
                <option value={"0"}>Use header</option>
                <option value={"1"}>Do not use header</option>
                <option value={"2"}>Calculate secondary structure</option>
            </MoorhenSelect>
            <MoorhenSelect
                label="Nucleotide ribbon style"
                value={nucleotideRibbonStyle}
                onChange={evt => setNucleotideRibbonStyle(evt.target.value as "DishyBases" | "StickBases")}
            >
                <option value={"StickBases"}>Sticks</option>
                <option value={"DishyBases"}>Dishes</option>
            </MoorhenSelect>
        </MoorhenStack>
    );
};

export const MolSurfSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;
    const [surfaceStyleProbeRadius, setSurfaceStyleProbeRadius] = useState<number>(
        molecule ? molecule.defaultM2tParams.surfaceStyleProbeRadius : representation.m2tParams.surfaceStyleProbeRadius
    );
    const [ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier] = useState<number>(
        molecule ? molecule.defaultM2tParams.ballsStyleRadiusMultiplier : representation.m2tParams.ballsStyleRadiusMultiplier
    );

    useEffect(() => {
        if ([surfaceStyleProbeRadius, ballsStyleRadiusMultiplier].some(item => item === null)) {
            return;
        }

        const otherParams = molecule ? { ...molecule.defaultM2tParams } : { ...representation.m2tParams };
        const M2tParams = {
            ...otherParams,
            surfaceStyleProbeRadius: surfaceStyleProbeRadius,
            ballsStyleRadiusMultiplier: ballsStyleRadiusMultiplier,
        };

        let representations: MoleculeRepresentation[];
        if (props.molecule) {
            representations = props.molecule.representations.filter(
                representation => representation.useDefaultM2tParams && representation.visible && representation.style === "VdWSurface"
            );

            molecule.defaultM2tParams = M2tParams;
        } else {
            representations = [representation];
            representation.m2tParams = M2tParams;
        }
        representations.forEach(rep => {
            if (rep.visible) {
                rep.redraw();
            }
        });
    }, [surfaceStyleProbeRadius, ballsStyleRadiusMultiplier]);

    return (
        <MoorhenStack card>
            <MoorhenSlider
                sliderTitle="Mol. Surf. Probe Radius"
                externalValue={surfaceStyleProbeRadius}
                setExternalValue={value => setSurfaceStyleProbeRadius(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Mol. Surf. Radius Multiplier"
                externalValue={ballsStyleRadiusMultiplier}
                setExternalValue={value => setBallsStyleRadiusMultiplier(value)}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
        </MoorhenStack>
    );
};

const CylinderSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;

    const [cylindersStyleAngularSampling, setCylindersStyleAngularSampling] = useState<number>(
        props.molecule.defaultM2tParams.cylindersStyleAngularSampling
    );
    const [cylindersStyleCylinderRadius, setCylindersStyleCylinderRadius] = useState<number>(
        props.molecule.defaultM2tParams.cylindersStyleCylinderRadius
    );
    const [cylindersStyleBallRadius, setCylindersStyleBallRadius] = useState<number>(
        props.molecule.defaultM2tParams.cylindersStyleBallRadius
    );

    // useEffect(() => {
    //     if ([cylindersStyleAngularSampling, cylindersStyleBallRadius, cylindersStyleCylinderRadius].some(item => item === null)) {
    //         return;
    //     }

    //     const representations = props.molecule.representations.filter(
    //         representation => representation.useDefaultM2tParams && representation.visible && representation.style === "CRs"
    //     );

    //     const needsRedraw =
    //         props.molecule.defaultM2tParams.cylindersStyleAngularSampling !== cylindersStyleAngularSampling ||
    //         props.molecule.defaultM2tParams.cylindersStyleBallRadius !== cylindersStyleBallRadius ||
    //         props.molecule.defaultM2tParams.cylindersStyleCylinderRadius !== cylindersStyleCylinderRadius ||

    //     if (needsRedraw) {
    //         props.molecule.defaultM2tParams = {
    //             ...props.molecule.defaultM2tParams,
    //             cylindersStyleAngularSampling: cylindersStyleAngularSampling,
    //             cylindersStyleBallRadius: cylindersStyleBallRadius,
    //             cylindersStyleCylinderRadius: cylindersStyleCylinderRadius,
    //         };
    //     }

    //     if (isVisible && representations.length > 0 && needsRedraw) {
    //         isDirty.current = true;
    //         if (!busyRedrawing.current) {
    //             redrawMolIfDirty(representations.map(representation => representation.uniqueId));
    //         }
    //     }
    // }, [cylindersStyleAngularSampling, cylindersStyleBallRadius, cylindersStyleCylinderRadius]);

    return (
        <MoorhenStack card>
            <MoorhenSlider
                sliderTitle="Cylinder Angular Sampling"
                externalValue={cylindersStyleAngularSampling}
                setExternalValue={setCylindersStyleAngularSampling}
                showMinMaxVal={false}
                stepButtons={1}
                minVal={0.01}
                maxVal={10}
                logScale={false}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="Cylinder Radius"
                externalValue={cylindersStyleCylinderRadius}
                setExternalValue={setCylindersStyleCylinderRadius}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
            <MoorhenSlider
                sliderTitle="Cylinder Ball Radius"
                externalValue={cylindersStyleBallRadius}
                setExternalValue={setCylindersStyleBallRadius}
                showMinMaxVal={false}
                stepButtons={0.1}
                minVal={0.01}
                maxVal={3}
                logScale={false}
                decimalPlaces={2}
            />
        </MoorhenStack>
    );
};

export const ResidueEnvironmentSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;

    const [maxDist, setMaxDist] = useState<number>(
        molecule ? molecule.defaultResidueEnvironmentOptions.maxDist : representation.residueEnvironmentOptions.maxDist
    );
    const [labelled, setLabelled] = useState<boolean>(
        molecule ? molecule.defaultResidueEnvironmentOptions.labelled : representation.residueEnvironmentOptions.labelled
    );
    const [showHBonds, setShowHBonds] = useState<boolean>(
        molecule ? molecule.defaultResidueEnvironmentOptions.showHBonds : representation.residueEnvironmentOptions.showHBonds
    );
    const [showContacts, setShowContacts] = useState<boolean>(
        molecule ? molecule.defaultResidueEnvironmentOptions.showContacts : representation.residueEnvironmentOptions.showContacts
    );

    // const redrawEnvironment = useCallback(async () => {
    //     if (drawInteractions) {
    //         const [molecule, cid] = await getCentreAtom(molecules, commandCentre, store);
    //         if (molecule?.molNo === props.molecule.molNo) {
    //             props.molecule.clearBuffersOfStyle("environment");
    //             await props.molecule.drawEnvironment(cid);
    //         } else {
    //             props.molecule.clearBuffersOfStyle("environment");
    //         }
    //     } else {
    //         props.molecule.clearBuffersOfStyle("environment");
    //     }
    // }, [drawInteractions, molecules]);

    useEffect(() => {
        if ([maxDist, labelled, showHBonds, showContacts].some(item => item === null)) {
            return;
        }

        let representations: MoleculeRepresentation[];
        const otherSettings = molecule ? { ...molecule.defaultResidueEnvironmentOptions } : { ...representation.residueEnvironmentOptions };
        const residueEnvironmentOptions = {
            ...otherSettings,
            maxDist: maxDist,
            labelled: labelled,
            showHBonds: showHBonds,
            showContacts: showContacts,
        };
        if (props.molecule) {
            representations = props.molecule.representations.filter(
                representation =>
                    representation.useDefaultResidueEnvironmentOptions &&
                    representation.visible &&
                    representation.style === "residue_environment"
            );

            props.molecule.defaultResidueEnvironmentOptions = residueEnvironmentOptions;
        } else {
            representations = [representation];
            representation.residueEnvironmentOptions = residueEnvironmentOptions;
        }
        representations.forEach(rep => {
            if (rep.visible) {
                rep.redraw();
            }
        });
    });

    // useEffect(() => {
    //     const handleMaxEnvDistChange = async () => {
    //         if (maxEnvDist === null) {
    //             return;
    //         }

    //         const representations = props.molecule.representations.filter(
    //             representation =>
    //                 representation.useDefaultResidueEnvironmentOptions &&
    //                 representation.visible &&
    //                 representation.style === "residue_environment"
    //         );

    //         const needsRedraw = props.molecule.defaultResidueEnvironmentOptions.maxDist !== maxEnvDist;

    //         if (needsRedraw) {
    //             props.molecule.defaultResidueEnvironmentOptions = {
    //                 ...props.molecule.defaultResidueEnvironmentOptions,
    //                 maxDist: maxEnvDist,
    //             };
    //         }

    //         if (isVisible && needsRedraw) {
    //             if (props.molecule.adaptativeBondsEnabled) {
    //                 isDirty.current = true;
    //                 if (!busyRedrawing.current) {
    //                     await redrawOriginRepresentations();
    //                 }
    //             }
    //             if (representations.length > 0) {
    //                 isDirty.current = true;
    //                 if (!busyRedrawing.current) {
    //                     await redrawMolIfDirty(representations.map(representation => representation.uniqueId));
    //                 }
    //             }
    //         }
    //     };
    //     handleMaxEnvDistChange();
    // }, [maxEnvDist]);

    return (
        <MoorhenStack card>
            <MoorhenToggle type="switch" checked={labelled} onChange={() => setLabelled(prev => !prev)} label="Show labels" />
            <MoorhenToggle type="switch" checked={showHBonds} onChange={() => setShowHBonds(prev => !prev)} label="Show H bonds" />
            <MoorhenToggle type="switch" checked={showContacts} onChange={() => setShowContacts(prev => !prev)} label="Show contacts" />
            <MoorhenSlider
                sliderTitle="Neighbouring Res. Dist."
                externalValue={maxDist}
                setExternalValue={value => setMaxDist(value)}
                showMinMaxVal={false}
                stepButtons={0.5}
                minVal={1}
                maxVal={15}
                logScale={false}
                decimalPlaces={2}
            />
        </MoorhenStack>
    );
};

export const MoorhenMoleculeRepresentationSettingsCard = (props: { molecule: moorhen.Molecule }) => {
    return (
        <MoorhenStack direction="vertical" style={{ overflowY: "auto", maxHeight: "80vh" }}>
            <BondSettingsPanel molecule={props.molecule} />
            <SurfaceSettingsPanel molecule={props.molecule} />
            {/* <SymmetrySettingsPanel {...props.symmetrySettingsProps} molecule={props.molecule} /> */}
            <ResidueEnvironmentSettingsPanel molecule={props.molecule} />
            <RibbonSettingsPanel molecule={props.molecule} />
            <MolSurfSettingsPanel molecule={props.molecule} />
            {/* <CylinderSettingsPanel molecule={props.molecule}  /> */}
        </MoorhenStack>
    );
};
