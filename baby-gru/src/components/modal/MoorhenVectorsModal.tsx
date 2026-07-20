import { useDispatch, useSelector, useStore } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import { addVector, removeVector } from "../../store/vectorsSlice";
import type { MoorhenVector, VectorsArrowMode, VectorsCoordMode, VectorsDrawMode, VectorsLabelMode } from "../../store/vectorsSlice";
import type { AppDispatch, RootState } from "../../store/MoorhenReduxStore";
import { modalKeys } from "../../utils/enums";
import { cidToSpec } from "../../utils/utils";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenSpinner } from "../icons";
import { MoorhenCidInputForm, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenSelect, MoorhenTextInput, MoorhenToggle } from "../inputs";
import { MoorhenButton, MoorhenColourPicker } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenMenuItemPopover } from "../interface-base/Popovers/MenuItemPopover";
import { MoorhenCidAndMoleculeSelect } from "../inputs/Cid/CidAndMoleculeSelect";

export const MoorhenVectors = () => {

    const vectorsList = useSelector((state: RootState) => state.vectors.vectorsList.filter(x => !x.uniqueId.includes("__TAG")));

    const dispatch = useDispatch();

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null);
    const drawModeRef = useRef<null | HTMLSelectElement>(null);
    const arrowModeRef = useRef<null | HTMLSelectElement>(null);
    const labelModeRef = useRef<null | HTMLSelectElement>(null);
    const labelTextRef = useRef<null | HTMLInputElement>(null);


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
            molFromUniqueId: "",
            molToUniqueId: "",
            uniqueId: uuidv4(),
            vectorColour: { r: 0, g: 0, b: 0 },
            textColour: { r: 0, g: 0, b: 0 },
            radius: 0.07,
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
        console.log("Applied vector", theVector);
    };

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
        molFromUniqueId = undefined,
        molToUniqueId = undefined,
        uniqueId = undefined,
        vectorColour = undefined,
        textColour = undefined,
        radius = undefined,
    }) => {
        setVector(prevVector => {
            const newVector: MoorhenVector = {
                coordsMode: coordsMode !== undefined ? coordsMode : prevVector.coordsMode,
                labelMode: labelMode !== undefined ? labelMode : prevVector.labelMode,
                labelText: labelText !== undefined ? labelText : prevVector.labelText,
                drawMode: drawMode !== undefined ? drawMode : prevVector.drawMode,
                arrowMode: arrowMode !== undefined ? arrowMode : prevVector.arrowMode,
                xFrom: xFrom !== undefined ? xFrom : prevVector.xFrom,
                yFrom: yFrom !== undefined ? yFrom : prevVector.yFrom,
                zFrom: zFrom !== undefined ? zFrom : prevVector.zFrom,
                xTo: xTo !== undefined ? xTo : prevVector.xTo,
                yTo: yTo !== undefined ? yTo : prevVector.yTo,
                zTo: zTo !== undefined ? zTo : prevVector.zTo,
                cidFrom: cidFrom !== undefined ? cidFrom : prevVector.cidFrom,
                cidTo: cidTo !== undefined ? cidTo : prevVector.cidTo,
                molFromUniqueId: molFromUniqueId !== undefined ? molFromUniqueId : prevVector.molFromUniqueId,
                molToUniqueId: molToUniqueId !== undefined ? molToUniqueId : prevVector.molToUniqueId,
                uniqueId: uniqueId !== undefined ? uniqueId : prevVector.uniqueId,
                vectorColour: vectorColour !== undefined ? vectorColour : prevVector.vectorColour,
                textColour: textColour !== undefined ? textColour : prevVector.textColour,
                radius: radius !== undefined ? radius : prevVector.radius,
            };
            return newVector;
        });
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
                    if(existingVector.molFromUniqueId){
                        // const molFromIdx = molecules.filter(x => x.uniqueId === existingVector.molToUniqueId)[0]?.molNo
                        // if(molFromIdx>-1 && fromMoleculeRef !== null && typeof fromMoleculeRef !== "function"){
                        //     fromMoleculeRef.current.value = molFromIdx+""
                        // }
                    }
                    if(existingVector.molToUniqueId){
                        // const molToIdx = molecules.filter(x => x.uniqueId === existingVector.molToUniqueId)[0]?.molNo
                        // if(molToIdx>-1 && toMoleculeRef !== null && typeof toMoleculeRef !== "function"){
                        //     toMoleculeRef.current.value = molToIdx+""
                        // }
                    }
                    if (drawModeRef !== null && typeof drawModeRef !== "function") drawModeRef.current.value = existingVector.drawMode;
                    if (arrowModeRef !== null && typeof arrowModeRef !== "function") arrowModeRef.current.value = existingVector.arrowMode;
                    if (labelModeRef !== null && typeof labelModeRef !== "function") labelModeRef.current.value = existingVector.labelMode;
                    if (cidFromRef !== null && typeof cidFromRef !== "function") cidFromRef.current.value = existingVector.cidFrom;
                    if (cidToRef !== null && typeof cidToRef !== "function") cidToRef.current.value = existingVector.cidTo;
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
        <MoorhenStack direction="line">
            {vectorSelectRef.current && selectedOption !== "new" && (
                <MoorhenButton className="m-2" variant="danger" onClick={handleDelete}>
                    Delete
                </MoorhenButton>
            )}
            <MoorhenButton className="m-2" onClick={handleApply}>
                Apply
            </MoorhenButton>
        </MoorhenStack>
    );

    
    const handleModelChange = (selected: string, isModelTo: boolean) => {
        if (isModelTo) updateVector({ molToUniqueId: selected });
        else updateVector({ molFromUniqueId: selected });
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
                     <MoorhenCidAndMoleculeSelect
                        selectedMoleculeUniqueId={theVector.molFromUniqueId}
                        selectedCid={theVector.cidFrom}
                        setSelectedMoleculeUniqueId={uid => updateVector({ molFromUniqueId: uid })}
                        setSelectedCid={cid => updateVector({ cidFrom: cid })}
                    />
                    
                </MoorhenStack>
            )}
            {theVector.coordsMode === "atoms" && (
                <MoorhenStack card inputGrid>
                    <p>To atom</p>
                    <div />
                    <MoorhenCidAndMoleculeSelect
                        selectedMoleculeUniqueId={theVector.molToUniqueId}
                        selectedCid={theVector.cidTo}
                        setSelectedMoleculeUniqueId={uid => updateVector({ molToUniqueId: uid })}
                        setSelectedCid={cid => updateVector({ cidTo: cid })}
                    />
                    </MoorhenStack>
                </MoorhenStack>
            )}
            {theVector.coordsMode === "points" && (
                <MoorhenStack card gap="0.5rem">
                    <div>From point:</div>
                    <MoorhenStack inputGrid gridWidth={3}>
                        <MoorhenNumberInput
                            value={theVector.xFrom}
                            type="number"
                            label="x:"
                            setValue={val => {
                                try {
                                    updateVector({ xFrom: Number(val) });
                                } catch (e) {}
                            }}
                        />
                        <MoorhenNumberInput
                            value={theVector.yFrom}
                            type="number"
                            label="y:"
                            setValue={val => {
                                try {
                                    updateVector({ yFrom: Number(val) });
                                } catch (e) {}
                            }}
                        />
                        <MoorhenNumberInput
                            value={theVector.zFrom}
                            type="number"
                            label="z:"
                            setValue={val => {
                                try {
                                    updateVector({ zFrom: Number(val) });
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
                        <MoorhenNumberInput
                            value={theVector.xTo}
                            type="number"
                            label="x:"
                            setValue={val => {
                                try {
                                    updateVector({ xTo: Number(val) });
                                } catch (e) {}
                            }}
                        />

                        <MoorhenNumberInput
                            value={theVector.yTo}
                            type="number"
                            label="y:"
                            setValue={val => {
                                try {
                                    updateVector({ yTo: Number(val) });
                                } catch (e) {}
                            }}
                        />

                        <MoorhenNumberInput
                            value={theVector.zTo}
                            type="number"
                            label="z:"
                            setValue={val => {
                                try {
                                    updateVector({ zTo: Number(val) });
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
                <MoorhenNumberInput
                    value={theVector.radius}
                    type="number"
                    label="Vector width:"
                    setValue={val => {
                        try {
                            const dum = Number(val);
                            updateVector({ radius: Number(val) });
                        } catch (e) {}
                    }}
                />
            </MoorhenStack>
        </>
    );

    const setAtomPickerEventListener = async evt => {
        const chosenAtom = cidToSpec(evt.detail.label);
        if(awaitAtomClick===0){
            updateVector({ cidFrom: chosenAtom.cid })
            cidFromRef.current.value = chosenAtom.cid
        } else if(awaitAtomClick===1){
            updateVector({ cidTo: chosenAtom.cid })
            cidToRef.current.value = chosenAtom.cid
        }
        setAwaitAtomClick(-1);
    }

    useEffect(() => {
        if (awaitAtomClick !== -1) {
            document.addEventListener("atomClicked", setAtomPickerEventListener, { once: true });
        }

        return () => {
            if (awaitAtomClick !== -1) {
                document.removeEventListener("atomClicked", setAtomPickerEventListener);
            }
        };
    }, [awaitAtomClick]);

    return (<>
                {bodyContent}
                {footer}
                <Backdrop sx={{ color: "#fff", zIndex: theme => theme.zIndex.drawer + 1 }} open={awaitAtomClick !== -1}>
                    <MoorhenStack gap={2} direction="vertical" style={{ justifyContent: "center", alignItems: "center" }}>
                        <Spinner animation="border" style={{ marginRight: "0.5rem" }} />
                        <span>Click on an atom...</span>
                        <MoorhenButton variant="danger" onClick={() => setAwaitAtomClick(-1)}>
                            Cancel
                        </MoorhenButton>
                    </MoorhenStack>
                </Backdrop>
            </>)
}

export const MoorhenVectorsModal = () => {

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    return (
        <>
            {bodyContent}
            {footer}
        </>
    );
};

export const MoorhenVectorsModal = () => {
    const width = useSelector((state: RootState) => state.sceneSettings.width);
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.VECTORS}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(25)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Vectors"
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenVectors />}
            footer={null}
        />
    );
};
