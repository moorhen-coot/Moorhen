import { Popover } from "@mui/material";
import { Button, Form, FormSelect, Stack } from "react-bootstrap";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { useSelector } from "react-redux";
import { memo, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { ColourRule } from "../../utils/MoorhenColourRule";
import { convertRemToPx, convertViewtoPx, getMultiColourRuleArgs } from "../../utils/utils";
import { MoorhenButton } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { MoorhenStack } from "../interface-base";
import { MoorhenColorSwatch } from "../misc/MoorhenColorSwatch";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "../sequence-viewer";
import { MoorhenColourRuleCard } from "./MoorhenColourRuleCard";

type colourRuleChange = {
    action: "Add" | "Remove" | "Overwrite" | "MoveUp" | "MoveDown" | "Empty";
    item?: ColourRule;
    items?: ColourRule[];
    color?: string;
};

const itemReducer = (oldList: ColourRule[], change: colourRuleChange) => {
    if (change.action === "Add") {
        return [...oldList, change.item];
    } else if (change.action === "Remove") {
        return oldList.filter(item => item.uniqueId !== change.item.uniqueId);
    } else if (change.action === "Empty") {
        return [];
    } else if (change.action === "Overwrite") {
        return [...change.items];
    } else if (change.action === "MoveUp") {
        const itemIndex = oldList.findIndex(item => item.uniqueId === change.item.uniqueId);
        if (itemIndex === 0) {
            return oldList;
        }
        const newList = oldList.slice();
        newList[itemIndex] = oldList[itemIndex - 1];
        newList[itemIndex - 1] = change.item;
        return newList;
    } else if (change.action === "MoveDown") {
        const itemIndex = oldList.findIndex(item => item.uniqueId === change.item.uniqueId);
        if (itemIndex === oldList.length - 1) {
            return oldList;
        }
        const newList = oldList.slice();
        newList[itemIndex] = oldList[itemIndex + 1];
        newList[itemIndex + 1] = change.item;
        return newList;
    } else if (change.action === "UpdateColor") {
        const itemIndex = oldList.findIndex(item => item.uniqueId === change.item.uniqueId);
        if (itemIndex === -1) return oldList;
        // Properly clone the ColourRule instance
        const oldRule = oldList[itemIndex];
        const newRule = Object.create(Object.getPrototypeOf(oldRule));
        Object.assign(newRule, oldRule);
        newRule.color = change.color;
        if (!newRule.isMultiColourRule) newRule.args[1] = change.color;
        const newList = [...oldList];
        newList[itemIndex] = newRule;
        return newList;
    }
};

const initialRuleState: ColourRule[] = [];

export const MoorhenModifyColourRulesCard = memo(
    (props: {
        urlPrefix: string;
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        molecule: moorhen.Molecule;
        showColourRulesToast: boolean;
        setShowColourRulesToast: React.Dispatch<React.SetStateAction<boolean>>;
        anchorEl: React.RefObject<HTMLDivElement>;
    }) => {
        const cidFormRef = useRef<HTMLInputElement>(null);
        const commandCentre = useCommandCentre();

        const [ruleType, setRuleType] = useState<string>("molecule");
        const [colourProperty, setColourProperty] = useState<string>("b-factor");
        const [selectedColour, setSelectedColour] = useState<string>("#808080");
        const [selectedChain, setSelectedChain] = useState<string>(props.molecule.sequences[0]?.chain || "");
        const [residuesSelectionRange, setResidueSelectionRange] = useState<[number, number]>(null);

        const [cid, setCid] = useState<string>(null);
        const [ruleList, setRuleList] = useReducer(itemReducer, initialRuleState, () => {
            return props.molecule.defaultColourRules;
        });

        const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
        const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
        const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

        const handleChainChange = evt => {
            setSelectedChain(evt.target.value);
        };

        const handleResidueCidChange = evt => {
            setCid(evt.target.value);
        };

        const handleColourCircleClick = (color: string) => {
            try {
                setSelectedColour(color);
            } catch (err) {
                console.log("err", err);
            }
        };

        const handleColorChange = (color: string) => {
            try {
                setSelectedColour(color);
            } catch (err) {
                console.log("err", err);
            }
        };

        useEffect(() => {
            const setIntialRules = async () => {
                if (!props.molecule) {
                    return;
                } else if (!props.molecule.defaultColourRules || props.molecule.defaultColourRules.length === 0) {
                    await props.molecule.fetchDefaultColourRules();
                }
                if (props.molecule.defaultColourRules.length > 0) {
                    setRuleList({ action: "Overwrite", items: props.molecule.defaultColourRules });
                }
            };

            setIntialRules();
        }, [props.showColourRulesToast]);

        const applyRules = useCallback(async () => {
            if (props.molecule?.defaultColourRules) {
                if (
                    JSON.stringify(props.molecule.defaultColourRules.map(rule => rule.objectify())) ===
                    JSON.stringify(ruleList.map(rule => rule.objectify()))
                ) {
                    return;
                }
                props.molecule.defaultColourRules = ruleList;
                const representations = props.molecule.representations.filter(representation => representation.useDefaultColourRules);
                for (const representation of representations) {
                    if (representation.visible) {
                        await representation.redraw();
                    } else {
                        representation.deleteBuffers();
                    }
                }
            }
        }, [ruleList, props.molecule]);

        useEffect(() => {
            applyRules();
        }, [applyRules]);

        const createRule = async () => {
            if (!props.molecule) {
                return;
            }

            let newRule: moorhen.ColourRule;
            if (ruleType !== "property") {
                let cidLabel: string;
                switch (ruleType) {
                    case "molecule":
                        cidLabel = "//*";
                        break;
                    case "chain":
                        cidLabel = `//${selectedChain}`;
                        break;
                    case "cid":
                        cidLabel = cid;
                        break;
                    case "residue-range":
                        cidLabel = residuesSelectionRange
                            ? `//${selectedChain}/${residuesSelectionRange[0]}-${residuesSelectionRange[1]}`
                            : null;
                        break;
                    default:
                        console.log("Unrecognised colour rule type...");
                        break;
                }
                if (cidLabel) {
                    newRule = new ColourRule(ruleType, cidLabel, selectedColour, commandCentre, false);
                    newRule.setParentMolecule(props.molecule);
                    newRule.setArgs([cidLabel, selectedColour]);
                } else {
                    console.warn("Invalid CID selection used to create a colour rule");
                }
            } else {
                const ruleArgs = await getMultiColourRuleArgs(props.molecule, colourProperty);
                newRule = new ColourRule(ruleType, "/*/*/*/*", "#ffffff", commandCentre, true);
                newRule.setParentMolecule(props.molecule);
                newRule.setArgs([ruleArgs]);
                newRule.setLabel(
                    `${
                        colourProperty === "secondary-structure"
                            ? "Secondary struct."
                            : colourProperty === "jones-rainbow"
                              ? "Jones-Rainbow"
                              : colourProperty === "mol-symm"
                                ? "Mol. Symm."
                                : colourProperty === "b-factor"
                                  ? "B-factor"
                                  : colourProperty === "b-factor-norm"
                                    ? "B-factor norm."
                                    : colourProperty === "af2-plddt"
                                      ? "PLDDT"
                                      : ""
                    }`
                );
            }

            if (newRule) {
                setRuleList({ action: "Add", item: newRule });
            }
        };

        const selectedSequence = props.molecule.sequences.find(sequence => sequence.chain === selectedChain);

        if (!props.anchorEl) {
            return null;
        }

        const handleResiduesSelection = selection => {
            setResidueSelectionRange(selection.range);
        };

        const swatchCols = [
            "#f44336",
            "#e91e63",
            "#9c27b0",
            "#673ab7",
            "#3f51b5",
            "#2196f3",
            "#03a9f4",
            "#00bcd4",
            "#009688",
            "#4caf50",
            "#8bc34a",
            "#cddc39",
            "#ffeb3b",
            "#ffc107",
            "#ff9800",
            "#ff5722",
            "#795548",
            "#607d8b",
        ];
        return (
            <Popover
                onClose={() => props.setShowColourRulesToast(false)}
                open={props.showColourRulesToast}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: "center", horizontal: "center" }}
                transformOrigin={{ vertical: "center", horizontal: "center" }}
                sx={{
                    "& .MuiPaper-root": {
                        backgroundColor: isDark ? "grey" : "white",
                        borderRadius: "1rem",
                        marginTop: "0.1rem",
                        borderStyle: "solid",
                        borderColor: "grey",
                        borderWidth: "1px",
                    },
                }}
            >
                <MoorhenStack direction="vertical" gap={2} style={{ alignItems: "center", padding: "0.5rem" }}>
                    <MoorhenStack gap={2} direction="horizontal" style={{ margin: 0, padding: 0 }}>
                        <MoorhenStack
                            gap={2}
                            direction="vertical"
                            style={{
                                margin: 0,
                                padding: 0,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                            }}
                        >
                            <Form.Group style={{ width: "100%", margin: 0 }}>
                                <Form.Label>Rule type</Form.Label>
                                <FormSelect size="sm" defaultValue={ruleType} onChange={val => setRuleType(val.target.value)}>
                                    <option value={"molecule"} key={"molecule"}>
                                        By molecule
                                    </option>
                                    <option value={"chain"} key={"chain"}>
                                        By chain
                                    </option>
                                    <option value={"residue-range"} key={"residue-range"}>
                                        By residue range
                                    </option>
                                    <option value={"cid"} key={"cid"}>
                                        By atom selection
                                    </option>
                                    <option value={"property"} key={"property"}>
                                        By property
                                    </option>
                                </FormSelect>
                            </Form.Group>
                            {(ruleType === "chain" || ruleType === "residue-range") && (
                                <MoorhenChainSelect
                                    width="100%"
                                    margin={"0px"}
                                    molecules={molecules}
                                    onChange={handleChainChange}
                                    selectedCoordMolNo={props.molecule.molNo}
                                />
                            )}
                            {ruleType === "cid" && (
                                <MoorhenCidInputForm
                                    allowUseCurrentSelection={true}
                                    margin={"0px"}
                                    width="100%"
                                    onChange={handleResidueCidChange}
                                    ref={cidFormRef}
                                />
                            )}
                            {ruleType === "property" && (
                                <Form.Group style={{ margin: "0px", width: "100%" }}>
                                    <Form.Label>Property</Form.Label>
                                    <FormSelect size="sm" defaultValue={"b-factor"} onChange={val => setColourProperty(val.target.value)}>
                                        <option value={"mol-symm"} key={"mol-symm"}>
                                            Mol. Symmetry
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
                                    </FormSelect>
                                </Form.Group>
                            )}
                            <MoorhenButton onClick={createRule} style={{ margin: "0px", width: "100%" }}>
                                Add rule
                            </MoorhenButton>
                        </MoorhenStack>
                        {ruleType !== "property" && (
                            <MoorhenStack direction="vertical" style={{ display: "flex", justifyContent: "center" }} gap={2}>
                                <div style={{ padding: 0, margin: 0, justifyContent: "center", display: "flex" }}>
                                    <HexAlphaColorPicker color={selectedColour} onChange={handleColorChange} />
                                </div>
                                <div
                                    style={{
                                        padding: "0.5rem",
                                        margin: 0,
                                        justifyContent: "center",
                                        display: "flex",
                                        backgroundColor: "#e3e1e1",
                                        borderRadius: "8px",
                                    }}
                                >
                                    <MoorhenColorSwatch cols={swatchCols} size={13} columns={9} onClick={handleColourCircleClick} />
                                </div>
                                <div style={{ padding: 0, margin: 0, justifyContent: "center", display: "flex" }}>
                                    <div className="moorhen-hex-input-decorator">#</div>
                                    <HexColorInput className="moorhen-hex-input" color={selectedColour} onChange={handleColorChange} />
                                </div>
                            </MoorhenStack>
                        )}
                    </MoorhenStack>
                    {ruleType === "residue-range" && (
                        <div style={{ width: `${convertRemToPx(15) * 2}px`, padding: "0.5rem", textAlign: "center" }}>
                            <MoorhenSequenceViewer
                                sequences={moorhenSequenceToSeqViewer(selectedSequence, props.molecule.name, props.molecule.molNo)}
                                onResiduesSelect={selection => handleResiduesSelection(selection)}
                                maxDisplayHeight={1}
                            />
                        </div>
                    )}
                    <hr style={{ width: "100%" }}></hr>
                    <div
                        className="hide-scrolling"
                        style={{
                            width: "100%",
                            padding: "0.2rem",
                            maxHeight: convertViewtoPx(20, height),
                            overflowY: "auto",
                            textAlign: "center",
                        }}
                    >
                        {ruleList.length === 0
                            ? "No rules created yet"
                            : ruleList.map((rule, index) => (
                                  <MoorhenColourRuleCard
                                      key={index}
                                      molecule={props.molecule}
                                      urlPrefix={props.urlPrefix}
                                      rule={rule}
                                      index={index}
                                      setRuleList={setRuleList}
                                  />
                              ))}
                    </div>
                </MoorhenStack>
            </Popover>
        );
    }
);

MoorhenModifyColourRulesCard.displayName = "Moorhen Colour Rules Card";
