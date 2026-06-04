import { Autocomplete, MenuItem, TextField, createFilterOptions } from "@mui/material";
import parse from "html-react-parser";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePaths } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenAutoComplete } from "../inputs/autocomplete/AutoComplete";
import { MoorhenMenuItem, MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";

const shortCutMouseActions = {
    open_context_menu: ["circle-right-mouse-click", "two-finger-tap"],
    residue_camera_wiggle: ["mouse-move", "circle-left-mouse-click", "one-finger-move"],
    residue_selection: ["circle-left-mouse-click", "one-finger-tap"],
    measure_distances: ["circle-left-mouse-click", "one-finger-tap"],
    measure_angles: ["circle-left-mouse-click", "one-finger-tap"],
    label_atom: ["circle-left-mouse-click", "one-finger-tap"],
    dist_ang_2d: ["circle-left-mouse-click", "one-finger-tap"],
    center_atom: ["middle-right-mouse-click", "one-finger-tap"],
    set_map_contour: ["middle-right-mouse-click", "mouse-scroll-arrows", "two-finger-scroll"],
    pan_view: ["circle-left-mouse-click", "mouse-move", "one-finger-move"],
    rotate_view: ["circle-left-mouse-click", "mouse-move", "one-finger-move"],
    contour_lvl: ["mouse-scroll-arrows", "two-finger-scroll"],
};

export const MoorhenControlsModal = (props: ModalComponentProps) => {
    const _shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);
    const urlPrefix = usePaths().urlPrefix;

    const [autocompleteOpen, setAutocompleteOpen] = useState<boolean>(false);
    const [svgString, setSvgString] = useState<string | null>(null);
    const [currentKey, setCurrentKey] = useState<string>(null);

    const shortCuts = useMemo(() => {
        const shortCuts: { [key: string]: { modifiers: string[]; keyPress: string; label: string } } = _shortCuts
            ? JSON.parse(_shortCuts as string)
            : null;
        if (shortCuts) {
            shortCuts["pan_view"] = { modifiers: ["shiftKey", "altKey"], keyPress: "", label: "Pan view" };
            shortCuts["rotate_view"] = { modifiers: ["shiftKey"], keyPress: "", label: "Rotate view" };
            shortCuts["open_context_menu"] = { modifiers: [], keyPress: "", label: "Open context menu" };
            shortCuts["contour_lvl"] = { modifiers: ["ctrlKey"], keyPress: "", label: "Change active map contour" };
        }
        return shortCuts;
    }, [_shortCuts]);

    useEffect(() => {
        const fetchSVG = async () => {
            const response = await fetch(`${urlPrefix}/pixmaps/keyboard-blank.svg`);
            if (response.ok) {
                const text = await response.text();
                setSvgString(text);
            }
        };
        fetchSVG();
    }, []);

    const filterOptions = useMemo(
        () =>
            createFilterOptions({
                ignoreCase: true,
                limit: 5,
            }),
        []
    );

    const handleMouseHover = (key: string) => {
        const svg: any = document.querySelector("#moorhen-keyboard-blank-svg");
        if (!svg) {
            return;
        }

        setCurrentKey(key);
        const modifiers = [];
        if (shortCuts[key].modifiers.includes("shiftKey")) modifiers.push("Shift");
        if (shortCuts[key].modifiers.includes("ctrlKey")) modifiers.push("Ctrl");
        if (shortCuts[key].modifiers.includes("metaKey")) modifiers.push("Meta");
        if (shortCuts[key].modifiers.includes("altKey")) modifiers.push("Alt");
        if (shortCuts[key].keyPress === " ") modifiers.push("Space");

        const elementsToHighlight: string[] = [...modifiers, shortCuts[key].keyPress];
        elementsToHighlight.forEach(elementId => {
            const svgElement: SVGElement = svg.getElementById(elementId);
            if (svgElement) {
                svgElement.style.fill = "rgb(230, 43, 43)";}
        });

        if (Object.hasOwn(shortCutMouseActions, key)) {
            shortCutMouseActions[key].forEach((svgId: string) => {
                const svgElement: SVGElement = svg.getElementById(svgId);
                if (svgElement) {
                    svgElement.style.display = "block" 
                }
            });
        }
    };

    const clearMouseHighlights = () => {
        const svg: any = document.querySelector("#moorhen-keyboard-blank-svg");
        if (!svg) {
            return;
        }
        const elementsToClear = Object.keys(shortCuts).reduce((acc, key) => {
            const modifiers = [];
            if (shortCuts[key].modifiers.includes("shiftKey")) modifiers.push("Shift");
            if (shortCuts[key].modifiers.includes("ctrlKey")) modifiers.push("Ctrl");
            if (shortCuts[key].modifiers.includes("metaKey")) modifiers.push("Meta");
            if (shortCuts[key].modifiers.includes("altKey")) modifiers.push("Alt");
            if (shortCuts[key].keyPress === " ") modifiers.push("Space");
            return [...acc, ...modifiers, shortCuts[key].keyPress];
        }, [] as string[]);

        elementsToClear.forEach(elementId => {
            const svgElement: SVGElement = svg.getElementById(elementId);
            if (svgElement) {
                svgElement.style.fill = "#ffffffff";
            }
        });
    };
    

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.SHOW_CONTROLS}
            headerTitle="Moorhen Controls"
            enableResize={false}
            footer={null}
            body={
                <MoorhenStack direction="row" style={{ maxHeight: "40rem" }}>
                    <MoorhenStack direction="column" style={{ overflowY: "scroll" }}>
                        {shortCuts &&
                            Object.keys(shortCuts).map(key => {
                                return (
                                    <div
                                        className="moorhen__stack_card"
                                        key={key}
                                        onMouseEnter={() => {
                                            clearMouseHighlights();
                                            handleMouseHover(key);
                                        }}
                                    >
                                        <span style={{ fontWeight: "bold" }}>{`${shortCuts[key].label}`}</span>
                                    </div>
                                );
                            })}
                    </MoorhenStack>
                    <MoorhenStack direction="column" style={{ width: "80%" }}>
                        <MoorhenAutoComplete
                            setAutocompleteOpen={setAutocompleteOpen}
                            autocompleteOpen={autocompleteOpen}
                            searchItems={Object.keys(shortCuts)?.map(key => ({ key: key, ...shortCuts[key] }))}
                            keys={[{ name: "label", weight: 1 }]}
                            resultsRenderer={result => (
                                <MoorhenMenuItem
                                    key={result.label}
                                    onClick={_evt => {
                                        clearMouseHighlights();
                                        handleMouseHover(result.key);
                                        setAutocompleteOpen(false);
                                    }}
                                >
                                    {result.label}
                                </MoorhenMenuItem>
                            )}
                        />
                        <span style={{ margin: "1rem", fontWeight: "bold" }}>{currentKey ? shortCuts[currentKey].label : ""}</span>
                        <div style={{ display: "flex" }}>{svgString ? parse(svgString) : null}</div>
                    </MoorhenStack>
                </MoorhenStack>
            }
        />
    );
};
