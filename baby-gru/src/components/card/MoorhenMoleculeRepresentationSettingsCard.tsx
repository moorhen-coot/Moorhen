import { Slider } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setRequestDrawScene } from "../../store/glRefSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const BondSettingsPanel = (props: {
    bondWidth: number;
    setBondWidth: React.Dispatch<React.SetStateAction<number>>;
    atomRadiusBondRatio: number;
    setAtomRadiusBondRatio: React.Dispatch<React.SetStateAction<number>>;
    showAniso: boolean;
    setShowAniso: React.Dispatch<React.SetStateAction<boolean>>;
    showOrtep: boolean;
    setShowOrtep: React.Dispatch<React.SetStateAction<boolean>>;
    showHs: boolean;
    setShowHs: React.Dispatch<React.SetStateAction<boolean>>;
    bondSmoothness: number;
    setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
}) => {
    const {
        bondWidth,
        setBondWidth,
        atomRadiusBondRatio,
        setAtomRadiusBondRatio,
        bondSmoothness,
        setBondSmoothness,
        showAniso,
        setShowAniso,
        showOrtep,
        setShowOrtep,
        showHs,
        setShowHs,
    } = props;

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
            <MoorhenToggle type="switch" checked={showHs} onChange={() => setShowHs(prev => !prev)} label="Show Hs" />
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

const SurfaceSettingsPanel = (props: {
    surfaceSigma: number;
    setSurfaceSigma: React.Dispatch<React.SetStateAction<number>>;
    surfaceLevel: number;
    setSurfaceLevel: React.Dispatch<React.SetStateAction<number>>;
    surfaceRadius: number;
    setSurfaceRadius: React.Dispatch<React.SetStateAction<number>>;
    surfaceGridScale: number;
    setSurfaceGridScale: React.Dispatch<React.SetStateAction<number>>;
    surfaceBFactor: number;
    setSurfaceBFactor: React.Dispatch<React.SetStateAction<number>>;
}) => {
    const {
        surfaceSigma,
        setSurfaceSigma,
        surfaceLevel,
        setSurfaceLevel,
        surfaceBFactor,
        surfaceRadius,
        setSurfaceRadius,
        surfaceGridScale,
        setSurfaceGridScale,
        setSurfaceBFactor,
    } = props;

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

const SymmetrySettingsPanel = (props: {
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
        <MoorhenStack card>
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

export const RibbonSettingsPanel = (props: {
    ribbonCoilThickness: number;
    setRibbonCoilThickness: React.Dispatch<React.SetStateAction<number>>;
    ribbonHelixWidth: number;
    setRibbonHelixWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonStrandWidth: number;
    setRibbonStrandWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonArrowWidth: number;
    setRibbonArrowWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonDNARNAWidth: number;
    setRibbonDNARNAWidth: React.Dispatch<React.SetStateAction<number>>;
    ribbonAxialSampling: number;
    setRibbonAxialSampling: React.Dispatch<React.SetStateAction<number>>;
    nucleotideRibbonStyle: "DishyBases" | "StickBases";
    setNucleotideRibbonStyle: React.Dispatch<React.SetStateAction<"DishyBases" | "StickBases">>;
    dishStyleAngularSampling: number;
    setDishStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
    ssUsageScheme: number;
    setSsUsageScheme: React.Dispatch<React.SetStateAction<number>>;
}) => {
    const {
        ribbonCoilThickness,
        setRibbonCoilThickness,
        ribbonHelixWidth,
        setRibbonHelixWidth,
        ribbonStrandWidth,
        setRibbonStrandWidth,
        ribbonArrowWidth,
        setRibbonArrowWidth,
        ribbonDNARNAWidth,
        setRibbonDNARNAWidth,
        ribbonAxialSampling,
        setRibbonAxialSampling,
        nucleotideRibbonStyle,
        setNucleotideRibbonStyle,
        dishStyleAngularSampling,
        setDishStyleAngularSampling,
        ssUsageScheme,
        setSsUsageScheme,
    } = props;

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

export const MolSurfSettingsPanel = (props: {
    surfaceStyleProbeRadius: number;
    setSurfaceStyleProbeRadius: React.Dispatch<React.SetStateAction<number>>;
    ballsStyleRadiusMultiplier: number;
    setBallsStyleRadiusMultiplier: React.Dispatch<React.SetStateAction<number>>;
}) => {
    const { surfaceStyleProbeRadius, setSurfaceStyleProbeRadius, ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier } = props;

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

const CylinderSettingsPanel = (props: {
    cylindersStyleAngularSampling: number;
    setCylindersStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
    cylindersStyleCylinderRadius: number;
    setCylindersStyleCylinderRadius: React.Dispatch<React.SetStateAction<number>>;
    cylindersStyleBallRadius: number;
    setCylindersStyleBallRadius: React.Dispatch<React.SetStateAction<number>>;
}) => {
    const {
        cylindersStyleAngularSampling,
        setCylindersStyleAngularSampling,
        cylindersStyleCylinderRadius,
        setCylindersStyleCylinderRadius,
        cylindersStyleBallRadius,
        setCylindersStyleBallRadius,
    } = props;

    return (
        <MoorhenStack card>
            <MoorhenSlider
                sliderTitle="Cylinder Angular Sampling"
                externalValue={cylindersStyleAngularSampling}
                setExternalValue={value => setCylindersStyleAngularSampling(value)}
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
                setExternalValue={value => setCylindersStyleCylinderRadius(value)}
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
                setExternalValue={value => setCylindersStyleBallRadius(value)}
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

export const ResidueEnvironmentSettingsPanel = (props: {
    maxDist: number;
    setMaxDist: React.Dispatch<React.SetStateAction<number>>;
    labelled: boolean;
    setLabelled: React.Dispatch<React.SetStateAction<boolean>>;
    showHBonds: boolean;
    setShowHBonds: React.Dispatch<React.SetStateAction<boolean>>;
    showContacts: boolean;
    setShowContacts: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const { maxDist, setMaxDist, showContacts, setShowContacts, showHBonds, setShowHBonds, labelled, setLabelled } = props;

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

export const MoorhenMoleculeRepresentationSettingsCard = (props: {
    molecule: moorhen.Molecule;
    symmetrySettingsProps: {
        symmetryRadius: number;
        setSymmetryRadius: React.Dispatch<React.SetStateAction<number>>;
    };
    gaussianSettingsProps: {
        surfaceSigma: number;
        setSurfaceSigma: React.Dispatch<React.SetStateAction<number>>;
        surfaceLevel: number;
        setSurfaceLevel: React.Dispatch<React.SetStateAction<number>>;
        surfaceRadius: number;
        setSurfaceRadius: React.Dispatch<React.SetStateAction<number>>;
        surfaceGridScale: number;
        setSurfaceGridScale: React.Dispatch<React.SetStateAction<number>>;
        surfaceBFactor: number;
        setSurfaceBFactor: React.Dispatch<React.SetStateAction<number>>;
    };
    bondSettingsProps: {
        bondWidth: number;
        setBondWidth: React.Dispatch<React.SetStateAction<number>>;
        atomRadiusBondRatio: number;
        setAtomRadiusBondRatio: React.Dispatch<React.SetStateAction<number>>;
        showAniso: boolean;
        setShowAniso: React.Dispatch<React.SetStateAction<boolean>>;
        showOrtep: boolean;
        setShowOrtep: React.Dispatch<React.SetStateAction<boolean>>;
        showHs: boolean;
        setShowHs: React.Dispatch<React.SetStateAction<boolean>>;
        bondSmoothness: number;
        setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
    };
    ribbonSettingsProps: {
        ribbonCoilThickness: number;
        setRibbonCoilThickness: React.Dispatch<React.SetStateAction<number>>;
        ribbonHelixWidth: number;
        setRibbonHelixWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonStrandWidth: number;
        setRibbonStrandWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonArrowWidth: number;
        setRibbonArrowWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonDNARNAWidth: number;
        setRibbonDNARNAWidth: React.Dispatch<React.SetStateAction<number>>;
        ribbonAxialSampling: number;
        setRibbonAxialSampling: React.Dispatch<React.SetStateAction<number>>;
        nucleotideRibbonStyle: "DishyBases" | "StickBases";
        setNucleotideRibbonStyle: React.Dispatch<React.SetStateAction<"DishyBases" | "StickBases">>;
        dishStyleAngularSampling: number;
        setDishStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
        ssUsageScheme: number;
        setSsUsageScheme: React.Dispatch<React.SetStateAction<number>>;
    };
    molSurfSettingsProps: {
        surfaceStyleProbeRadius: number;
        setSurfaceStyleProbeRadius: React.Dispatch<React.SetStateAction<number>>;
        ballsStyleRadiusMultiplier: number;
        setBallsStyleRadiusMultiplier: React.Dispatch<React.SetStateAction<number>>;
    };
    cylinderSettingsProps: {
        cylindersStyleAngularSampling: number;
        setCylindersStyleAngularSampling: React.Dispatch<React.SetStateAction<number>>;
        cylindersStyleCylinderRadius: number;
        setCylindersStyleCylinderRadius: React.Dispatch<React.SetStateAction<number>>;
        cylindersStyleBallRadius: number;
        setCylindersStyleBallRadius: React.Dispatch<React.SetStateAction<number>>;
    };
    residueEnvironmentSettingsProps: {
        maxDist: number;
        setMaxDist: React.Dispatch<React.SetStateAction<number>>;
        labelled: boolean;
        setLabelled: React.Dispatch<React.SetStateAction<boolean>>;
        showHBonds: boolean;
        setShowHBonds: React.Dispatch<React.SetStateAction<boolean>>;
        showContacts: boolean;
        setShowContacts: React.Dispatch<React.SetStateAction<boolean>>;
    };
}) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    return (
        <MoorhenStack direction="vertical" style={{ overflowY: "auto", maxHeight: "80vh" }}>
            <BondSettingsPanel {...props.bondSettingsProps} />
            <SurfaceSettingsPanel {...props.gaussianSettingsProps} />
            <SymmetrySettingsPanel {...props.symmetrySettingsProps} molecule={props.molecule} />
            <ResidueEnvironmentSettingsPanel {...props.residueEnvironmentSettingsProps} />
            <RibbonSettingsPanel {...props.ribbonSettingsProps} />
            <MolSurfSettingsPanel {...props.molSurfSettingsProps} />
            <CylinderSettingsPanel {...props.cylinderSettingsProps} />
        </MoorhenStack>
    );
};
