import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState } from "react";
import {
    addObject,
    removeObjectById
} from "../../store/threeDObjectsSlice";

import type {
    Matrix4x4,
    SphereObject,
    CylinderObject,
    ConeObject,
    FrustrumObject,
    FlatSidedFrustrumObject,
    PrismObject,
    PyramidObject,
    CubeObject,
    CuboidObject,
    TetrahedronObject,
    OctahedronObject,
    DodecahedronObject,
    IcosahedronObject,
    FootballObject,
    TorusObject,
    ThreeDObject
} from "../../store/threeDObjectsSlice";

import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { componentToHex, convertRemToPx, convertViewtoPx, getHexForCanvasColourName, hexToRGB, rgbToHex } from "../../utils/utils";
import { MoorhenButton, MoorhenColourPicker, MoorhenSelect, MoorhenTextInput } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

export const Moorhen3DObjects = () => {

    const threeDObjects = useSelector((state: moorhen.State) => state.threeDObjects.objects);

    const [objectNew, setObjectNew] = useState(true);

    const dispatch = useDispatch();

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null);
    const drawModeRef = useRef<null | HTMLSelectElement>(null);

    const IDENTITY_MATRIX: Matrix4x4 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];

    const newSphereObject = (): SphereObject => ({
        uniqueId: uuidv4(),
        type: "sphere",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        radius: 1.0
    })

    const newCylinderObject = (): CylinderObject => ({
        uniqueId: uuidv4(),
        type: "cylinder",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        end: [0, 0, 5],
        radius: 1.0
    });

    const newConeObject = (): ConeObject => ({
        uniqueId: uuidv4(),
        type: "cone",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        top: [0, 0, 5],
        radius: 1.0
    });

    const newFrustrumObject = (): FrustrumObject => ({
        uniqueId: uuidv4(),
        type: "frustrum",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        top: [0, 0, 5],
        bottom_radius: 1.0,
        top_radius: 0.5
    });

    const newFlatSidedFrustrumObject = (): FlatSidedFrustrumObject => ({
        uniqueId: uuidv4(),
        type: "flatfrustrum",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        top: [0, 0, 5],
        bottom_radius: 1.0,
        top_radius: 0.5,
        n_sides: 6
    });

    const newPrismObject = (): PrismObject => ({
        uniqueId: uuidv4(),
        type: "prism",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        end: [0, 0, 5],
        radius: 1.0,
        n_sides: 6
    });

    const newPyramidObject = (): PyramidObject => ({
        uniqueId: uuidv4(),
        type: "pyramid",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        top: [0, 0, 5],
        radius: 1.0,
        n_sides: 4
    });

    const newCubeObject = (): CubeObject => ({
        uniqueId: uuidv4(),
        type: "cube",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newCuboidObject = (): CuboidObject => ({
        uniqueId: uuidv4(),
        type: "cuboid",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scalexyz: [1.0, 1.0, 1.0]
    });

    const newTetrahedronObject = (): TetrahedronObject => ({
        uniqueId: uuidv4(),
        type: "tetrahedron",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newOctahedronObject = (): OctahedronObject => ({
        uniqueId: uuidv4(),
        type: "octahedron",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newDodecahedronObject = (): DodecahedronObject => ({
        uniqueId: uuidv4(),
        type: "dodecahedron",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newIcosahedronObject = (): IcosahedronObject => ({
        uniqueId: uuidv4(),
        type: "icosahedron",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newFootballObject = (): FootballObject => ({
        uniqueId: uuidv4(),
        type: "football",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newTorusObject = (): TorusObject => ({
        uniqueId: uuidv4(),
        type: "torus",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const createNewObject = (type: ThreeDObject["type"]): ThreeDObject => {
        switch (type) {
            case "sphere": return newSphereObject();
            case "cylinder": return newCylinderObject();
            case "cone": return newConeObject();
            case "frustrum": return newFrustrumObject();
            case "flatfrustrum": return newFlatSidedFrustrumObject();
            case "prism": return newPrismObject();
            case "pyramid": return newPyramidObject();
            case "cube": return newCubeObject();
            case "cuboid": return newCuboidObject();
            case "tetrahedron": return newTetrahedronObject();
            case "octahedron": return newOctahedronObject();
            case "dodecahedron": return newDodecahedronObject();
            case "icosahedron": return newIcosahedronObject();
            case "football": return newFootballObject();
            case "torus": return newTorusObject();
        }
    };

    const [theObject, setObject] = useState<ThreeDObject>(newSphereObject());
    const [selectedOption, setSelectedOption] = useState<string>("new");
    const [positionText, setPositionText] = useState<string>("0,0,0");
    const [endPositionText, setEndPositionText] = useState<string>("0,0,1");
    const [selectedAlpha, setSelectedAlpha] = useState<number>(1.0);
    const [sizeText, setSizeText] = useState<string>("1.0");

    const handleDelete = () => {
        dispatch(removeObjectById(theObject.uniqueId));
        setObjectNew(true);
    };

    const checkPositionText = () => {
        let isOk: boolean = false;
        if(positionText.split(",").length!==3) return isOk
        try {
            const [_new_x, _new_y, _new_z] = positionText.split(",").map(a => parseFloat(a));
            if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y) && !Number.isNaN(_new_z) && !(_new_x === undefined) && !(_new_y === undefined) && !(_new_z === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number triplet in text position.", positionText);
            }
        } catch (e) {
            console.log("Not a valid number triplet in text position.");
        }
        return isOk;
    };

    const checkSizeText = () => {
        let isOk: boolean = false;
        try {
            const _new_x = parseFloat(sizeText)
            if (!Number.isNaN(_new_x) && !(_new_x === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number in size.");
            }
        } catch(e) {
            console.log("Not a valid number in size.");
        }
        return isOk;
    }

    const checkPosition2Text = () => {
        let isOk: boolean = false;
        if(endPositionText.split(",").length!==3) return isOk
        try {
            const [_new_x, _new_y, _new_z] = endPositionText.split(",").map(a => parseFloat(a));
            if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y) && !Number.isNaN(_new_z) && !(_new_x === undefined) && !(_new_y === undefined) && !(_new_z === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number triplet in text position.", endPositionText);
            }
        } catch (e) {
            console.log("Not a valid number triplet in text position.");
        }
        return isOk;
    };


    const handleApply = () => {
        if (vectorSelectRef.current.value !== "new") {
            handleDelete();
        }
        dispatch(addObject(theObject))
        setSelectedOption(theObject.uniqueId);
        setObjectNew(false)
    };

    const updateTheObject = (
        {
            x = undefined,
            y = undefined,
            z = undefined,
            x2 = undefined,
            y2 = undefined,
            z2 = undefined,
            colour = undefined,
            size = undefined,
        },
        objectType
    ) => {
        if(objectType!==theObject.type){
            const newObject = createNewObject(objectType)
            if(newObject){
                newObject.uniqueId = theObject.uniqueId
                newObject.colour = colour ?? theObject.colour
                setObject(newObject)
            }
        } else {
            setObject(prev => ({
                ...prev,
                ...(colour && { colour }),
                ...(
                    x !== undefined &&
                    y !== undefined &&
                    z !== undefined &&
                    "origin" in prev && {
                        origin: [
                            Number(x),
                            Number(y),
                            Number(z)
                        ] as [number, number, number]
                    }
                ),
                ...(
                    x2 !== undefined &&
                    y2 !== undefined &&
                    z2 !== undefined &&
                    "top" in prev && {
                        top: [
                            Number(x2),
                            Number(y2),
                            Number(z2)
                        ] as [number, number, number]
                    }
                ),
                ...(
                    x2 !== undefined &&
                    y2 !== undefined &&
                    z2 !== undefined &&
                    "end" in prev && {
                        end: [
                            Number(x2),
                            Number(y2),
                            Number(z2)
                        ] as [number, number, number]
                    }
                ),
                ...(
                    size !== undefined &&
                    "radius" in prev && {
                        radius: Number(size)
                    }
                ),
                ...(
                    size !== undefined &&
                    "scale" in prev && {
                        scale: Number(size)
                    }
                )
            }));
        }
    };

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (evt.target.value === "new") {
            setObjectNew(true);
            setSelectedOption("new");
            setPositionText("0,0,0");
            setObject(newSphereObject());
        } else {
            try {
                const existingObject  = threeDObjects.find(element => element.uniqueId === evt.target.value);
                console.log(existingObject)

                setSelectedOption(existingObject.uniqueId);
                setPositionText(existingObject.origin.join(","));
                if(existingObject.type==="cone"||existingObject.type==="frustrum"||
                  existingObject.type==="flatfrustrum"||existingObject.type==="pyramid")
                    setEndPositionText(existingObject.top.join(","));
                if(existingObject.type==="prism"||existingObject.type==="cylinder")
                    setEndPositionText(existingObject.end.join(","));

                setObject(existingObject);
            } catch (e) {
                console.log("Some problem?");
                console.log(e);
            }
        }
    };

    const handleColorChange = (color: string) => {
        updateTheObject({ colour: color }, theObject.type);
    };

    const headerContent = (
        <MoorhenSelect ref={vectorSelectRef} label="Object"
            onChange={(evt) => {
                setObjectNew(evt.target.value==="new");
                handleObjectChange(evt)}}
            value={selectedOption}>
            <option value="new">New</option>
            {threeDObjects.length > 0 &&
                threeDObjects.map((vec, i) => {
                        return (
                            <option key={i} value={vec.uniqueId}>
                                {vec.uniqueId}
                            </option>
                        );
                })}
        </MoorhenSelect>
    );

    const footer = (
        <>
            <MoorhenStack direction="line">
                {!objectNew && (
                    <MoorhenButton className="m-2" variant="danger" onClick={handleDelete}>
                        Delete
                    </MoorhenButton>
                )}
                <MoorhenButton className="m-2" onClick={handleApply} disabled={!checkPositionText()}>
                    Apply
                </MoorhenButton>
            </MoorhenStack>
        </>
    );

    let existingColour = null;
    if (theObject.colour && theObject.colour !== "gradient") {
        if (theObject.colour.startsWith("#") && theObject.colour.length === 9) {
            existingColour = hexToRGB(getHexForCanvasColourName(theObject.colour.substring(0, 7)));
        } else {
            existingColour = hexToRGB(getHexForCanvasColourName(theObject.colour));
        }
    }

    if (existingColour && existingColour.length === 4 && isNaN(existingColour[3]))
        existingColour[3] = !isNaN(selectedAlpha) ? selectedAlpha : 1.0;
    if (existingColour && existingColour.length === 3) existingColour[3] = !isNaN(selectedAlpha) ? selectedAlpha : 1.0;

    const drawMode = theObject.type

    return (
        <>
            <MoorhenStack direction="column" inputGrid style={{ padding: "1rem" }}>
                {headerContent}
                <MoorhenSelect
                    label="Type"
                    ref={drawModeRef}
                    value={theObject.type}
                    onChange={(evt) => {
                        updateTheObject({}, evt.target.value);
                    }}
                >
                    <option value="sphere">Sphere</option>
                    <option value="cylinder">Cylinder</option>
                    <option value="cone">Cone</option>
                    <option value="frustrum">Frustrum</option>
                    <option value="flatfrustrum">Flat-Sided Frustrum</option>
                    <option value="prism">Prism</option>
                    <option value="pyramid">Pyramid</option>
                    <option value="cube">Cube</option>
                    <option value="cuboid">Cuboid</option>
                    <option value="tetrahedron">Tetrahedron</option>
                    <option value="octahedron">Octahedron</option>
                    <option value="dodecahedron">Dodecahedron</option>
                    <option value="icosahedron">Icosahedron</option>
                    <option value="football">Football</option>
                    <option value="torus">Torus</option>

                </MoorhenSelect>

                {(drawMode === "sphere" || drawMode === "cube" || drawMode === "cuboid"
                || drawMode === "tetrahedron" || drawMode === "octahedron"
                || drawMode === "dodecahedron" || drawMode === "icosahedron"
                || drawMode === "football" || drawMode === "torus"
                ) &&
                    <>
                        <MoorhenTextInput
                            label="Position"
                            text={positionText}
                            onChange={evt => {
                                setPositionText(evt.target.value);
                                if(evt.target.value.split(",").length===3){
                                    const x = evt.target.value.split(",")[0]
                                    const y = evt.target.value.split(",")[1]
                                    const z = evt.target.value.split(",")[2]
                                    updateTheObject({x,y,z},theObject.type)
                                }
                            }}
                            isInvalid={!checkPositionText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "cylinder" || drawMode === "prism")  &&
                    <>
                        <MoorhenTextInput
                            label="Start"
                            text={positionText}
                            onChange={evt => {
                                setPositionText(evt.target.value);
                                if(evt.target.value.split(",").length===3){
                                    const x = evt.target.value.split(",")[0]
                                    const y = evt.target.value.split(",")[1]
                                    const z = evt.target.value.split(",")[2]
                                    updateTheObject({x,y,z},theObject.type)
                                }
                            }}
                            isInvalid={!checkPositionText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "frustrum" || drawMode === "flatfrustrum" || drawMode === "pyramid"|| drawMode === "cone")  &&
                    <>
                        <MoorhenTextInput
                            label="Base position"
                            text={positionText}
                            onChange={evt => {
                                setPositionText(evt.target.value);
                                if(evt.target.value.split(",").length===3){
                                    const x = evt.target.value.split(",")[0]
                                    const y = evt.target.value.split(",")[1]
                                    const z = evt.target.value.split(",")[2]
                                    updateTheObject({x,y,z},theObject.type)
                                }
                            }}
                            isInvalid={!checkPositionText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "cylinder"||drawMode === "prism")  &&
                    <>
                        <MoorhenTextInput
                            label="End"
                            text={endPositionText}
                            onChange={evt => {
                                setEndPositionText(evt.target.value);
                                if(evt.target.value.split(",").length===3){
                                    const x2 = evt.target.value.split(",")[0]
                                    const y2 = evt.target.value.split(",")[1]
                                    const z2 = evt.target.value.split(",")[2]
                                    updateTheObject({x2,y2,z2},theObject.type)
                                }
                            }}
                            isInvalid={!checkPosition2Text()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "cone"||drawMode === "frustrum"||drawMode === "flatfrustrum"||drawMode === "pyramid")  &&
                    <>
                        <MoorhenTextInput
                            label="Top position"
                            text={endPositionText}
                            onChange={evt => {
                                setEndPositionText(evt.target.value);
                                if(evt.target.value.split(",").length===3){
                                    const x2 = evt.target.value.split(",")[0]
                                    const y2 = evt.target.value.split(",")[1]
                                    const z2 = evt.target.value.split(",")[2]
                                    updateTheObject({x2,y2,z2},theObject.type)
                                }
                            }}
                            isInvalid={!checkPosition2Text()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "sphere"||drawMode === "cylinder"||drawMode === "cone")  &&
                    <>
                        <MoorhenTextInput
                            label="Radius"
                            text={sizeText}
                            onChange={evt => {
                                setSizeText(evt.target.value);
                                updateTheObject({size:parseFloat(evt.target.value)},theObject.type)
                            }}
                            isInvalid={!checkSizeText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                <MoorhenStack direction="line">
                    <span>Colour</span>
                    <MoorhenColourPicker
                        colour={existingColour !== null ? existingColour : [1, 0, 0, selectedAlpha]}
                        setColour={color => {
                            setSelectedAlpha(color[3]);
                            handleColorChange(rgbToHex(color[0], color[1], color[2]) + componentToHex(Math.floor(color[3] * 255)));
                        }}
                        useAlpha={true}
                        position="bottom"
                        tooltip="Change colour"
                    />
                    {selectedAlpha < 0.99 && <div>(Opacity {selectedAlpha.toFixed(2)})</div>}
                </MoorhenStack>
            </MoorhenStack>
            {footer}
        </>
    );
};

export const Moorhen2DCanvasObjectsModal = () => {
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const resizeNodeRef = useRef<HTMLDivElement>(null);
    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.OVERLAYS2D}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(25)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="3D objects"
            resizeNodeRef={resizeNodeRef}
            body={<Moorhen3DObjects />}
            footer={null}
        />
    );
};
