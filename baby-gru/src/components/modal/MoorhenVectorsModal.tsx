import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState } from "react";
import { addVector, removeVector } from "../../store/vectorsSlice";
import type { MoorhenVector, VectorsArrowMode, VectorsCoordMode, VectorsDrawMode, VectorsLabelMode } from "../../store/vectorsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenMoleculeSelect, MoorhenPreciseInput, MoorhenSelect, MoorhenTextInput, MoorhenToggle } from "../inputs";
import { MoorhenButton, MoorhenColourPicker } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";
import { MoorhenMenuItemPopover } from "../interface-base/MenuItemPopover";

const MoorhenDeleteVectorMenuItem = (props: {
    item: moorhen.Map | moorhen.Molecule;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList);

    const dispatch = useDispatch();

    const panelContent = (
        <>
            <div style={{ width: "10rem", margin: "0.5rem" }} className="mb-3">
                <span style={{ fontWeight: "bold" }}>Are you sure?</span>
            </div>
        </>
    );

    return (
        <MoorhenMenuItemPopover
            textClassName="text-danger"
            buttonVariant="danger"
            buttonText="Delete"
            popoverPlacement="left"
            popoverContent={panelContent}
            menuItemText={"Delete vector"}
            setPopoverIsShown={props.setPopoverIsShown}
        />
    );
};

export const MoorhenVectorsModal = () => {
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const vectorsList = useSelector((state: moorhen.State) => state.vectors.vectorsList);

    const dispatch = useDispatch();

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null);
    const drawModeRef = useRef<null | HTMLSelectElement>(null);
    const arrowModeRef = useRef<null | HTMLSelectElement>(null);
    const labelModeRef = useRef<null | HTMLSelectElement>(null);
    const labelTextRef = useRef<null | HTMLInputElement>(null);
    const cidFromRef = useRef<null | HTMLInputElement>(null);
    const cidToRef = useRef<null | HTMLInputElement>(null);

    const newVector = () => {
        const aVector: MoorhenVector = {
            coordsMode: "atoms",
            labelMode: "none",
            labelText: "vector label",
            drawMode: "cylinder",
            arrowMode: "none",
            xFrom: 0.0,
            yFrom: 0.0,
            zFrom: 0.0,
            xTo: 0.0,
            yTo: 0.0,
            zTo: 0.0,
            cidFrom: "",
            cidTo: "",
            molNoFrom: 0,
            molNoTo: 0,
            uniqueId: uuidv4(),
            vectorColour: { r: 0, g: 0, b: 0 },
            textColour: { r: 0, g: 0, b: 0 },
        };
        return aVector;
    };

    interface RGBColour {
        r: number;
        g: number;
        b: number;
    }

    const [theVector, setVector] = useState<MoorhenVector>(newVector());
    const [selectedOption, setSelectedOption] = useState<string>("new");
    const [coordsModeButtonState, setCoordsModeButtonState] = useState<string>("atoms");
    const [vectorColour, setVectorColour] = useState({ r: 0, g: 0, b: 0 });

    const handleDelete = () => {
        dispatch(removeVector(theVector));
        setSelectedOption("new");
    };

    const handleApply = () => {
        if (vectorSelectRef.current.value !== "new") {
            dispatch(removeVector(theVector));
        }
        dispatch(addVector(theVector));
        setSelectedOption(theVector.uniqueId);
    };

    const handleVectorChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (vectorSelectRef !== null && typeof vectorSelectRef !== "function") {
            vectorSelectRef.current.value = evt.target.value;
            if (vectorSelectRef.current.value === "new") {
                setSelectedOption("new");
                updateVector(newVector());
                if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = "cylinder";
                if (arrowModeRef !== null && typeof arrowModeRef !== "function") arrowModeRef.current.value = "none";
                if (labelModeRef !== null && typeof labelModeRef !== "function") labelModeRef.current.value = "none";
                setCoordsModeButtonState("atoms");
            } else {
                try {
                    const existingVector = vectorsList.find(element => element.uniqueId === evt.target.value);
                    updateVector(existingVector);
                    setSelectedOption(existingVector.uniqueId);
                    if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = existingVector.drawMode;
                    if (arrowModeRef !== null && typeof arrowModeRef !== "function") arrowModeRef.current.value = existingVector.arrowMode;
                    if (labelModeRef !== null && typeof labelModeRef !== "function") labelModeRef.current.value = existingVector.labelMode;
                    setCoordsModeButtonState(existingVector.coordsMode);
                } catch (e) {}
            }
        }
    };

    const handleColorChange = (color: { r: number; g: number; b: number }) => {
        setVectorColour(color);
        updateVector({ vectorColour: color });
    };

    const headerContent = (
        <MoorhenStack inputGrid>
            <MoorhenSelect ref={vectorSelectRef} label="Choose Vector" onChange={handleVectorChange}>
                <option selected={selectedOption === "new"} value="new">
                    New vector
                </option>
                {vectorsList.length > 0 &&
                    vectorsList.map((vec, i) => {
                        if (vec.coordsMode === "points") {
                            return (
                                <option selected={selectedOption === vec.uniqueId} key={i} value={vec.uniqueId}>
                                    {vec.xFrom.toFixed(2) +
                                        " " +
                                        vec.yFrom.toFixed(2) +
                                        " " +
                                        vec.zFrom.toFixed(2) +
                                        " <--> " +
                                        vec.xTo.toFixed(2) +
                                        " " +
                                        vec.yTo.toFixed(2) +
                                        " " +
                                        vec.zTo.toFixed(2)}
                                </option>
                            );
                        } else if (vec.coordsMode === "atoms") {
                            return (
                                <option selected={selectedOption === vec.uniqueId} key={i} value={vec.uniqueId}>
                                    {vec.cidFrom + " <--> " + vec.cidTo}
                                </option>
                            );
                        } else {
                            return (
                                <option selected={selectedOption === vec.uniqueId} key={i} value={vec.uniqueId}>
                                    {vec.cidFrom + " <--> " + vec.xTo.toFixed(2) + " " + vec.yTo.toFixed(2) + " " + vec.zTo.toFixed(2)}
                                </option>
                            );
                        }
                    })}
            </MoorhenSelect>
        </MoorhenStack>
    );

    const footer = (
        <>
            {vectorSelectRef.current && selectedOption !== "new" && (
                <MoorhenButton className="m-2" variant="danger" onClick={handleDelete}>
                    Delete
                </MoorhenButton>
            )}
            <MoorhenButton className="m-2" onClick={handleApply}>
                Apply
            </MoorhenButton>
        </>
    );

    const updateVector = ({
        coordsMode = undefined,
        labelMode = undefined,
        labelText = undefined,
        drawMode = undefined,
        arrowMode = undefined,
        xFrom = undefined,
        yFrom = undefined,
        zFrom = undefined,
        xTo = undefined,
        yTo = undefined,
        zTo = undefined,
        cidFrom = undefined,
        cidTo = undefined,
        molNoFrom = undefined,
        molNoTo = undefined,
        uniqueId = undefined,
        vectorColour = undefined,
        textColour = undefined,
    }) => {
        const newVector: MoorhenVector = {
            coordsMode: coordsMode !== undefined ? coordsMode : theVector.coordsMode,
            labelMode: labelMode !== undefined ? labelMode : theVector.labelMode,
            labelText: labelText !== undefined ? labelText : theVector.labelText,
            drawMode: drawMode !== undefined ? drawMode : theVector.drawMode,
            arrowMode: arrowMode !== undefined ? arrowMode : theVector.arrowMode,
            xFrom: xFrom !== undefined ? xFrom : theVector.xFrom,
            yFrom: yFrom !== undefined ? yFrom : theVector.yFrom,
            zFrom: zFrom !== undefined ? zFrom : theVector.zFrom,
            xTo: xTo !== undefined ? xTo : theVector.xTo,
            yTo: yTo !== undefined ? yTo : theVector.yTo,
            zTo: zTo !== undefined ? zTo : theVector.zTo,
            cidFrom: cidFrom !== undefined ? cidFrom : theVector.cidFrom,
            cidTo: cidTo !== undefined ? cidTo : theVector.cidTo,
            molNoFrom: molNoFrom !== undefined ? molNoFrom : theVector.molNoFrom,
            molNoTo: molNoTo !== undefined ? molNoTo : theVector.molNoTo,
            uniqueId: uniqueId !== undefined ? uniqueId : theVector.uniqueId,
            vectorColour: vectorColour !== undefined ? vectorColour : theVector.vectorColour,
            textColour: textColour !== undefined ? textColour : theVector.textColour,
        };
        setVector(newVector);
    };

    const handleModelChange = (selected: number, isModelTo: boolean) => {
        if (isModelTo) updateVector({ molNoTo: selected });
        else updateVector({ molNoFrom: selected });
    };

    const handleModeChange = (event, type) => {
        setCoordsModeButtonState(type);
        updateVector({ coordsMode: type as VectorsCoordMode });
    };

    const bodyContent = (
        <>
            <MoorhenStack card>
                {headerContent}
                Between
                <MoorhenToggle
                    inline
                    label="Atoms"
                    name="vectortypegroup"
                    type="radio"
                    checked={coordsModeButtonState === "atoms"}
                    onChange={e => {
                        handleModeChange(e, "atoms");
                    }}
                />
                <MoorhenToggle
                    inline
                    label="Points"
                    name="vectortypegroup"
                    type="radio"
                    checked={coordsModeButtonState === "points"}
                    onChange={e => {
                        handleModeChange(e, "points");
                    }}
                />
                <MoorhenToggle
                    inline
                    label="An atom and a point"
                    name="vectortypegroup"
                    type="radio"
                    checked={coordsModeButtonState === "atompoint"}
                    onChange={e => {
                        handleModeChange(e, "atompoint");
                    }}
                />
            </MoorhenStack>
            {(theVector.coordsMode === "atoms" || theVector.coordsMode === "atompoint") && (
                <MoorhenStack card inputGrid>
                    <p>From atom</p>
                    <div />
                    <MoorhenMoleculeSelect label="Molecule" onSelect={sel => handleModelChange(sel, false)} />
                    <MoorhenTextInput
                        style={{ height: "2rem" }}
                        ref={cidFromRef}
                        label="Selection"
                        text={theVector.cidFrom}
                        onChange={evt => {
                            updateVector({ cidFrom: evt.target.value });
                        }}
                    />
                </MoorhenStack>
            )}
            {theVector.coordsMode === "atoms" && (
                <MoorhenStack card inputGrid>
                    <p>To atom</p>
                    <div />
                    <MoorhenMoleculeSelect
                        label="Molecule"
                        style={{ height: "3rem", margin: "0rem" }}
                        onSelect={sel => handleModelChange(sel, true)}
                    />
                    <MoorhenTextInput
                        ref={cidToRef}
                        text={theVector.cidTo}
                        label="Selection"
                        onChange={evt => {
                            updateVector({ cidTo: evt.target.value });
                        }}
                    />
                </MoorhenStack>
            )}
            {theVector.coordsMode === "points" && (
                <MoorhenStack card gap="0.5rem">
                    <div>From point:</div>
                    <MoorhenStack inputGrid gridWidth={3}>
                        <MoorhenPreciseInput
                            value={theVector.xFrom}
                            type="number"
                            label="x:"
                            onChange={evt => {
                                try {
                                    const dum = Number(evt.target.value);
                                    updateVector({ xFrom: Number(evt.target.value) });
                                } catch (e) {}
                            }}
                        />
                        <MoorhenPreciseInput
                            value={theVector.yFrom}
                            type="number"
                            label="y:"
                            onChange={evt => {
                                try {
                                    const dum = Number(evt.target.value);
                                    updateVector({ yFrom: Number(evt.target.value) });
                                } catch (e) {}
                            }}
                        />
                        <MoorhenPreciseInput
                            value={theVector.zFrom}
                            type="number"
                            label="z:"
                            onChange={evt => {
                                try {
                                    const dum = Number(evt.target.value);
                                    updateVector({ zFrom: Number(evt.target.value) });
                                } catch (e) {}
                            }}
                        />
                    </MoorhenStack>
                </MoorhenStack>
            )}
            {(theVector.coordsMode === "points" || theVector.coordsMode === "atompoint") && (
                <MoorhenStack card>
                    <div>To point</div>
                    <MoorhenStack inputGrid gridWidth={3}>
                        <MoorhenPreciseInput
                            value={theVector.xTo}
                            type="number"
                            label="x:"
                            onChange={evt => {
                                try {
                                    const dum = Number(evt.target.value);
                                    updateVector({ xTo: Number(evt.target.value) });
                                } catch (e) {}
                            }}
                        />

                        <MoorhenPreciseInput
                            value={theVector.yTo}
                            type="number"
                            label="y:"
                            onChange={evt => {
                                try {
                                    const dum = Number(evt.target.value);
                                    updateVector({ yTo: Number(evt.target.value) });
                                } catch (e) {}
                            }}
                        />

                        <MoorhenPreciseInput
                            value={theVector.zTo}
                            type="number"
                            label="z:"
                            onChange={evt => {
                                try {
                                    const dum = Number(evt.target.value);
                                    updateVector({ zTo: Number(evt.target.value) });
                                } catch (e) {}
                            }}
                        />
                    </MoorhenStack>
                </MoorhenStack>
            )}
            <MoorhenStack inputGrid card>
                <MoorhenSelect
                    label="Draw Mode"
                    ref={drawModeRef}
                    defaultValue="cylinder"
                    onChange={evt => {
                        if (drawModeRef !== null && typeof drawModeRef !== "function") {
                            drawModeRef.current.value = evt.target.value;
                            updateVector({ drawMode: evt.target.value as VectorsDrawMode });
                        }
                    }}
                >
                    <option value="cylinder">Cylinder</option>
                    <option value="dashedcylinder">Dashed cylinder</option>
                </MoorhenSelect>

                <MoorhenSelect
                    label="Arrow mode"
                    ref={arrowModeRef}
                    defaultValue="none"
                    onChange={evt => {
                        if (arrowModeRef !== null && typeof arrowModeRef !== "function") {
                            arrowModeRef.current.value = evt.target.value;
                            updateVector({ arrowMode: evt.target.value as VectorsArrowMode });
                        }
                    }}
                >
                    <option value="none">None</option>
                    <option value="end">End</option>
                    <option value="start">Start</option>
                    <option value="both">Both</option>
                </MoorhenSelect>

                <label>Vector colour</label>
                <MoorhenColourPicker
                    colour={[theVector.vectorColour.r, theVector.vectorColour.g, theVector.vectorColour.b]}
                    setColour={color => {
                        handleColorChange({ r: color[0], g: color[1], b: color[2] });
                    }}
                    position="bottom"
                    tooltip="Change vector colour"
                />
                <MoorhenSelect
                    ref={labelModeRef}
                    label="Label mode"
                    defaultValue="none"
                    onChange={evt => {
                        if (labelModeRef !== null && typeof labelModeRef !== "function") {
                            labelModeRef.current.value = evt.target.value;
                            updateVector({ labelMode: evt.target.value as VectorsLabelMode });
                        }
                    }}
                >
                    <option value="none">None</option>
                    <option value="end">End</option>
                    <option value="start">Start</option>
                    <option value="middle">Middle</option>
                </MoorhenSelect>
                {theVector.labelMode !== "none" && (
                    <MoorhenTextInput
                        label="Label text"
                        ref={labelTextRef}
                        text={theVector.labelText}
                        onChange={evt => {
                            updateVector({ labelText: evt.target.value });
                        }}
                    />
                )}
            </MoorhenStack>
        </>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.VECTORS}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(37)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Vectors"
            resizeNodeRef={resizeNodeRef}
            body={bodyContent}
            footer={footer}
        />
    );
};
