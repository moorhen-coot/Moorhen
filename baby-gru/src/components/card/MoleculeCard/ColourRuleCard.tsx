import { ArrowDownwardOutlined, ArrowUpwardOutlined, DeleteOutlined } from "@mui/icons-material";
import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { useRef, useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { hexToRGB, rgbToHex } from "@/utils/utils";
import { moorhen } from "../../../types/moorhen";
import type { ColourRule } from "../../../utils/MoorhenColourRule";
import { MoorhenButton, MoorhenColourPicker, MoorhenPopoverButton, MoorhenSelect } from "../../inputs";
import { MoorhenStack } from "../../interface-base";

export const NcsColourSwatch = (props: { rule: ColourRule; applyColourChange: () => void; style?: { [key: string]: string } }) => {
    const ncsSwatchRef = useRef(null);
    const newNcsHexValueRef = useRef<string>("");
    const ncsCopySelectRef = useRef<null | HTMLSelectElement>(null);

    const [hex, setHex] = useState<string>("#ffffff");
    const [ncsCopyValue, setNcsCopyValue] = useState<string>("");
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false);

    const { rule, applyColourChange } = props;

    const applyNcsColourChange = () => {
        const chainNames: string[] = JSON.parse(ncsCopySelectRef.current.value);
        const newRules = (rule.args[0] as string)
            .split("|")
            .map(item => {
                const [chainName, hex] = item.split("^");
                if (chainNames.includes(chainName)) {
                    return `${chainName}^${newNcsHexValueRef.current}`;
                }
                return item;
            })
            .join("|");
        rule.args[0] = newRules;
        applyColourChange();
    };

    return (
        <>
            <MoorhenPopoverButton
                popoverPlacement="top"
                icon="MatSymGrain"
                style={{ border: "1px solid var(--moorhen-border)", borderRadius: "0.5rem" }}
            >
                <div
                    style={{
                        padding: "0.5rem",
                        width: "100%",
                        margin: 0,
                        justifyContent: "center",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <MoorhenSelect
                        ref={ncsCopySelectRef}
                        label={"NCS colours"}
                        value={ncsCopyValue}
                        onChange={evt => {
                            setNcsCopyValue(evt.target.value);
                            const chainNames = JSON.parse(evt.target.value);
                            const hex = (rule.args[0] as string)
                                .split("|")
                                .find(item => item.includes(chainNames[0]))
                                ?.split("^")[1];
                            setHex(hex);
                        }}
                    >
                        {[...new Set((rule.args[0] as string).split("|").map(item => item.split("^")[1]))].map((hex, index) => {
                            const chainNames = JSON.stringify(
                                (rule.args[0] as string)
                                    .split("|")
                                    .filter(item => item.includes(hex))
                                    .map(item => item.split("^")[0])
                            );
                            return <option key={chainNames} value={chainNames}>{`Copy no. ${index + 1}`}</option>;
                        })}
                    </MoorhenSelect>
                    <HexAlphaColorPicker
                        color={hex}
                        onChange={(color: string) => {
                            newNcsHexValueRef.current = color;
                            setHex(color);
                        }}
                    />
                    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                        <div className="moorhen-hex-input-decorator">#</div>
                        <HexColorInput
                            className="moorhen-hex-input"
                            color={hex}
                            onChange={hex => {
                                newNcsHexValueRef.current = hex;
                                setHex(hex);
                            }}
                        />
                    </div>
                    <MoorhenButton style={{ marginTop: "0.2rem" }} onClick={applyNcsColourChange}>
                        Apply
                    </MoorhenButton>
                </div>
            </MoorhenPopoverButton>
        </>
    );
};

export const MoorhenColourRuleCard = (props: {
    molecule: moorhen.Molecule;
    index: number;
    rule: ColourRule;
    setRuleList: any;
    reversedOrder: boolean;
}) => {
    const { index, molecule, rule, setRuleList, reversedOrder } = props;

    const busyRedrawing = useRef<boolean>(false);
    const isDirty = useRef<boolean>(false);
    const [colour, setColour] = useState(hexToRGB(rule.color));

    const redrawIfDirty = () => {
        if (isDirty.current) {
            busyRedrawing.current = true;
            isDirty.current = false;
            molecule.redraw().then(() => {
                busyRedrawing.current = false;
                redrawIfDirty();
            });
        }
    };

    const handleColourChangeDefault = (color: [number, number, number]) => {
        console.log(rule.color);
        rule.color = rgbToHex(color[0], color[1], color[2]);
        console.log(rule.color);
        if (!rule.isMultiColourRule) rule.args[1] = rule.color;
        isDirty.current = true;
        if (!busyRedrawing.current) {
            redrawIfDirty();
        }
        setColour(color);
    };

    return (
        <>
            <MoorhenStack align="center" inputGrid>
                <label>
                    <b>{`#${index + 1}. `}</b>
                    <span>{`. ${rule.label}`}</span>
                </label>
                <div style={{ display: "flex", justifyContent: "right", alignItems: "center" }}>
                    {!rule.isMultiColourRule ? (
                        <MoorhenColourPicker colour={colour} onApply={handleColourChangeDefault} style={{ marginRight: "0.2rem" }} />
                    ) : rule.propertyType === "secondary-structure" ? (
                        <MoorhenIcon moorhenSVG="SecondaryStructure" size="medium" />
                    ) : rule.propertyType === "jones-rainbow" ? (
                        <>
                            <div
                                style={{
                                    borderColor: "rgb(255, 0, 0)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(255, 0, 0)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                            <div
                                style={{
                                    borderColor: "rgb(255, 255, 0)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(255, 255, 0)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                            <div
                                style={{
                                    borderColor: "rgb(0, 255, 0)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(0, 255, 0)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                            <div
                                style={{
                                    borderColor: "rgb(0, 0, 255)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(0, 0, 255)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                        </>
                    ) : rule.propertyType === "mol-symm" ? (
                        <NcsColourSwatch
                            rule={rule}
                            applyColourChange={() => {
                                isDirty.current = true;
                                if (!busyRedrawing.current) {
                                    redrawIfDirty();
                                }
                            }}
                        />
                    ) : rule.propertyType === "b-factor" || rule.ruleType === "b-factor-norm" ? (
                        <MoorhenIcon moorhenSVG="temperature" size="medium" />
                    ) : (
                        <>
                            <div
                                style={{
                                    borderColor: "rgb(255, 125, 69)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(255, 125, 69)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                            <div
                                style={{
                                    borderColor: "rgb(255, 219, 19)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(255, 219, 19)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                            <div
                                style={{
                                    borderColor: "rgb(101, 203, 243)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(101, 203, 243)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                            <div
                                style={{
                                    borderColor: "rgb(0, 83, 214)",
                                    borderWidth: "5px",
                                    backgroundColor: "rgb(0, 83, 214)",
                                    height: "20px",
                                    width: "5px",
                                    margin: "0rem",
                                    padding: "0rem",
                                }}
                            />
                        </>
                    )}
                    <MoorhenButton
                        size="sm"
                        style={{ margin: "0.1rem" }}
                        onClick={() => {
                            setRuleList({ action: reversedOrder ? "MoveDown" : "MoveUp", item: rule });
                        }}
                        tooltip="Move Up"
                    >
                        <ArrowUpwardOutlined />
                    </MoorhenButton>
                    <MoorhenButton
                        size="sm"
                        style={{ margin: "0.1rem" }}
                        onClick={() => {
                            setRuleList({ action: reversedOrder ? "MoveUp" : "MoveDown", item: rule });
                        }}
                        tooltip="Move Down"
                    >
                        <ArrowDownwardOutlined />
                    </MoorhenButton>
                    <MoorhenButton
                        size="sm"
                        style={{ margin: "0.1rem" }}
                        onClick={() => {
                            setRuleList({ action: "Remove", item: rule });
                        }}
                        tooltip="Delete rule"
                    >
                        <DeleteOutlined />
                    </MoorhenButton>
                </div>
            </MoorhenStack>
        </>
    );
};
