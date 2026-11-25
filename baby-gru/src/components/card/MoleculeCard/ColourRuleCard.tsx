import { HexAlphaColorPicker, HexColorInput } from "react-colorful";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { MoorhenIcon } from "@/components/icons";
import type { RGBAColour } from "@/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { hexToRGBA, rgbaToHex } from "@/utils/utils";
import { setShortCutsBlocked } from "../../../store/globalUISlice";
import { moorhen } from "../../../types/moorhen";
import type { ColourRule } from "../../../utils/MoorhenColourRule";
import { MoorhenButton, MoorhenColourPicker, MoorhenPopoverButton, MoorhenSelect } from "../../inputs";

export const NcsColourSwatch = (props: { rule: ColourRule; applyColourChange: () => void; style?: { [key: string]: string } }) => {
    const newNcsHexValueRef = useRef<string>("");
    const ncsCopySelectRef = useRef<null | HTMLSelectElement>(null);

    const [hex, setHex] = useState<string>("#ffffff");
    const [ncsCopyValue, setNcsCopyValue] = useState<string>("");

    const { rule, applyColourChange } = props;

    const applyNcsColourChange = () => {
        const chainNames: string[] = JSON.parse(ncsCopySelectRef.current.value);
        const newRules = rule.multiColourData
            .split("|")
            .map(item => {
                const [chainName] = item.split("^");
                if (chainNames.includes(chainName)) {
                    return `${chainName}^${newNcsHexValueRef.current}`;
                }
                return item;
            })
            .join("|");
        rule.setMultiColourData(newRules);
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
                            const hex = rule.multiColourData
                                .split("|")
                                .find(item => item.includes(chainNames[0]))
                                ?.split("^")[1];
                            setHex(hex);
                        }}
                    >
                        {[...new Set(rule.multiColourData.split("|").map(item => item.split("^")[1]))].map((hex, index) => {
                            const chainNames = JSON.stringify(
                                rule.multiColourData
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
    const [colour, setColour] = useState<RGBAColour>(() => {
        const [r, g, b, a] = hexToRGBA(rule.color);
        return [r, g, b, a / 255];
    });
    // The selection as it is being typed; applied on Enter or when the box loses focus.
    const [cidText, setCidText] = useState<string>(rule.cid);
    const [editCid, setEditCid] = useState<boolean>(false);

    const dispatch = useDispatch();
    // Set by Escape, so the blur that follows drops the text instead of applying it.
    const cancelEdit = useRef<boolean>(false);
    // The box, focused as soon as the pencil opens it.
    const cidInput = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (editCid) cidInput.current?.focus();
    }, [editCid]);

    // Leave the box: apply what was typed (an empty box puts the CID back), or with Escape,
    // drop it. Keyboard shortcuts are blocked only while the box has focus, as MoorhenTextInput does.
    const finishEditing = (apply: boolean) => {
        dispatch(setShortCutsBlocked(false));
        setEditCid(false);
        const cid = cidText.trim();
        if (!apply || !cid || cid === rule.cid) {
            setCidText(rule.cid);
            return;
        }
        setRuleList({ action: "UpdateCid", item: rule, cid });
    };

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

    const handleColourChangeDefault = (color: RGBAColour) => {
        rule.setColor(rgbaToHex(color[0], color[1], color[2], color.length === 4 ? color[3] : 1));
        isDirty.current = true;
        if (!busyRedrawing.current) {
            redrawIfDirty();
        }
        setColour(color);
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                {/* The rule: its number and selection, given what width the controls leave. */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1 1 auto", minWidth: 0 }}>
                    <b style={{ flex: "none" }}>{`#${index + 1}`}</b>
                    {rule.isMultiColourRule ? (
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rule.label}</span>
                    ) : editCid ? (
                        <input
                            type="text"
                            className="moorhen__input moorhen__input-text-box"
                            style={{ flex: "1 1 auto", minWidth: 0, width: "100%" }}
                            value={cidText}
                            placeholder="CID, e.g. //A/10-20"
                            ref={cidInput}
                            onFocus={() => dispatch(setShortCutsBlocked(true))}
                            onChange={event => setCidText(event.target.value)}
                            onBlur={() => {
                                finishEditing(!cancelEdit.current);
                                cancelEdit.current = false;
                            }}
                            onKeyDown={event => {
                                if (event.key === "Enter") event.currentTarget.blur();
                                if (event.key === "Escape") {
                                    cancelEdit.current = true;
                                    event.currentTarget.blur();
                                }
                            }}
                        />
                    ) : (
                        <span title={rule.cid} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rule.cid}
                        </span>
                    )}
                </div>
                {/* The controls, at their own width. */}
                <div style={{ display: "flex", alignItems: "center", flex: "none" }}>
                    {!rule.isMultiColourRule && (
                        <MoorhenButton
                            icon="MatSymEdit"
                            size="medium"
                            type="icon-only"
                            onClick={() => setEditCid(true)}
                            tooltip="Edit the CID"
                            style={{ marginRight: "0.2rem" }}
                        />
                    )}
                    {!rule.isMultiColourRule ? (
                        <MoorhenColourPicker
                            colour={colour}
                            useAlpha
                            setColour={handleColourChangeDefault}
                            style={{ marginRight: "0.2rem" }}
                        />
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
                    ) : rule.propertyType === "RMSF" ? (
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
                        icon="MatSymArrowUpward"
                    ></MoorhenButton>
                    <MoorhenButton
                        size="sm"
                        style={{ margin: "0.1rem" }}
                        onClick={() => {
                            setRuleList({ action: reversedOrder ? "MoveUp" : "MoveDown", item: rule });
                        }}
                        tooltip="Move Down"
                        icon="MatSymArrowDownward"
                    ></MoorhenButton>
                    <MoorhenButton
                        size="sm"
                        style={{ margin: "0.1rem" }}
                        onClick={() => {
                            setRuleList({ action: "Remove", item: rule });
                        }}
                        tooltip="Delete rule"
                        icon="MatSymDelete"
                    ></MoorhenButton>
                </div>
            </div>
        </>
    );
};
