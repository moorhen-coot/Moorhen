import { MoorhenColourPicker, MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../../../../inputs";
import { MoorhenStack } from "../../../../interface-base";
import { NcsColourSwatch } from "../../ColourRuleCard";
import { MoorhenIcon } from "../../../../icons";
import { hexToRGB, rgbToHex } from "../../../../../utils/utils";
import { ColourRule } from "../../../../../utils/MoorhenColourRule";
import { moorhen } from "../../../../../types/moorhen";

interface ColourSettingsSectionProps {
    useDefaultColours: boolean;
    setUseDefaultColours: React.Dispatch<React.SetStateAction<boolean>>;
    applyColourToNonCarbonAtoms: boolean;
    setApplyColourToNonCarbonAtoms: React.Dispatch<React.SetStateAction<boolean>>;
    colourMode: string;
    setColourMode: React.Dispatch<React.SetStateAction<string>>;
    colour: string;
    setColour: React.Dispatch<React.SetStateAction<string>>;
    nonCustomOpacity: number;
    setNonCustomOpacity: (val: number) => void;
    representationStyle: string;
    mode: "add" | "edit";
    molecule: moorhen.Molecule;
    urlPrefix: string;
    representation?: moorhen.MoleculeRepresentation;
    ncsColourRuleRef: React.MutableRefObject<ColourRule | null>;
}

export const ColourSettingsSection = (props: ColourSettingsSectionProps) => {
    const {
        useDefaultColours,
        setUseDefaultColours,
        applyColourToNonCarbonAtoms,
        setApplyColourToNonCarbonAtoms,
        colourMode,
        setColourMode,
        colour,
        setColour,
        nonCustomOpacity,
        setNonCustomOpacity,
        representationStyle,
        mode,
        molecule,
        urlPrefix,
        representation,
        ncsColourRuleRef,
    } = props;

    const handleColourModeChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (evt.target.value === "mol-symm" && !ncsColourRuleRef.current && mode === "edit" && representation?.uniqueId) {
            const rep = molecule.representations.find(item => item.uniqueId === representation.uniqueId);
            if (rep?.colourRules?.length > 0) {
                ncsColourRuleRef.current = rep.colourRules[0];
            }
        }
        setColourMode(evt.target.value);
    };

    const setBufferColour = (r:number, g:number, b:number) => {
        if (representation) {
            representation.setBufferColour(r,g,b);
        }
    }

    const handleOpacityChange = (newVal: number) => {
        setNonCustomOpacity(newVal);
        if (representation) {
            representation.setNonCustomOpacity(newVal);
        }
    };

    const applyNcsColourChange = async () => {
        await molecule.redraw();
    };

    return (
        <>
            {!["allHBonds", "adaptativeBonds"].includes(representationStyle) && (
                <MoorhenToggle
                    type="switch"
                    label="Apply general colour settings"
                    checked={useDefaultColours}
                    onChange={() => setUseDefaultColours(prev => !prev)}
                />
            )}
            {["MetaBalls", "CBs", "VdwSpheres", "ligands"].includes(representationStyle) && !useDefaultColours && (
                <MoorhenToggle
                    type="switch"
                    label="Apply colour to non-carbon atoms also"
                    checked={applyColourToNonCarbonAtoms}
                    onChange={() => setApplyColourToNonCarbonAtoms(prev => !prev)}
                />
            )}
            {!useDefaultColours && (
                <>
                    <MoorhenSelect
                        value={colourMode}
                        onChange={handleColourModeChange}
                    >
                        <>
                            <option value={"custom"} key={"custom"}>
                                User defined colour
                            </option>
                            <option value={"secondary-structure"} key={"secondary-structure"}>
                                Secondary structure
                            </option>
                            <option value={"jones-rainbow"} key={"jones-rainbow"}>
                                Jones' rainbow
                            </option>
                            <option value={"b-factor"} key={"b-factor"}>
                                B-Factor
                            </option>
                            <option value={"b-factor-norm"} key={"b-factor-norm"}>
                                B-Factor (normalised)
                            </option>
                            <option value={"af2-plddt"} key={"af2-plddt"}>
                                AF2 PLDDT
                            </option>
                            <option value={"mol-symm"} key={"mol-symm"}>
                                Mol. Symmetry
                            </option>
                        </>
                        {representationStyle === "MolecularSurface" && (
                            <option value={"electrostatics"} key={"electrostatics"}>
                                Electrostatics
                            </option>
                        )}
                    </MoorhenSelect>
                    <MoorhenStack direction="row" addMargin align="center">
                        {colourMode === "b-factor" || colourMode === "b-factor-norm" ? (
                            <img
                                className="colour-rule-icon"
                                src={`${urlPrefix}/pixmaps/temperature.svg`}
                                alt="b-factor"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "3px",
                                    border: "1px solid #c9c9c9",
                                    padding: 0,
                                }}
                                onClick={() => {}}
                            />
                        ) : colourMode === "secondary-structure" ? (
                            <img
                                className="colour-rule-icon"
                                src={`${urlPrefix}/pixmaps/secondary-structure-grey.svg`}
                                alt="ss2"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "3px",
                                    border: "1px solid #c9c9c9",
                                    padding: 0,
                                }}
                                onClick={() => {}}
                            />
                        ) : colourMode === "electrostatics" ? (
                            <img
                                className="colour-rule-icon"
                                src={`${urlPrefix}/pixmaps/esurf.svg`}
                                alt="Electrostatic surface"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "3px",
                                    border: "1px solid #c9c9c9",
                                    padding: 0,
                                }}
                                onClick={() => {}}
                            />
                        ) : colourMode === "jones-rainbow" ? (
                            <img
                                className="colour-rule-icon"
                                src={`${urlPrefix}/pixmaps/jones_rainbow.svg`}
                                alt="ss2"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "3px",
                                    border: "1px solid #c9c9c9",
                                    padding: 0,
                                }}
                                onClick={() => {}}
                            />
                        ) : colourMode === "mol-symm" ? (
                            mode === "edit" ? (
                                <NcsColourSwatch
                                    style={{
                                        cursor: "pointer",
                                        height: "30px",
                                        width: "30px",
                                        padding: "0px",
                                        borderStyle: "solid",
                                        borderColor: "#ced4da",
                                        borderWidth: "3px",
                                        borderRadius: "8px",
                                    }}
                                    rule={ncsColourRuleRef?.current}
                                    applyColourChange={applyNcsColourChange}
                                />
                            ) : (
                                <MoorhenIcon moorhenSVG="MatSymGrain" size="large" />
                            )
                        ) : colourMode === "custom" ? (
                            <MoorhenColourPicker
                                colour={hexToRGB(colour)}
                                setColour={color => {if(representationStyle==="cavities"){setBufferColour(color[0]/255, color[1]/255, color[2]/255)}; setColour(rgbToHex(color[0], color[1], color[2]))}}
                            />
                        ) : (
                            <img
                                className="colour-rule-icon"
                                src={`${urlPrefix}/pixmaps/alphafold_rainbow.svg`}
                                alt="ss2"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "3px",
                                    border: "1px solid #c9c9c9",
                                    padding: 0,
                                }}
                                onClick={() => {}}
                            />
                        )}
                        <MoorhenSlider
                            minVal={0.0}
                            maxVal={1.0}
                            showButtons={false}
                            decimalPlaces={2}
                            scale="linear"
                            sliderTitle="Opacity"
                            value={nonCustomOpacity}
                            setValue={(newVal: number) => handleOpacityChange(newVal)}
                        />
                    </MoorhenStack>
                </>
            )}
        </>
    );
};
