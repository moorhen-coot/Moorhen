import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState, useEffect, useCallback } from "react";
import * as quat4 from 'gl-matrix/quat';
import * as vec3 from 'gl-matrix/vec3';
import { createQuatFromAngle } from '../../../src/WebGLgComponents/quatUtils';
import { quatToMat4 } from '../../../src/WebGLgComponents/quatToMat4';
import {
    addObject,
    removeObjectById
} from "../../store/threeDObjectsSlice";

import type {
    Matrix4x4,
    SphereObject,
    CylinderObject,
    ConeObject,
    FrustumObject,
    FlatSidedFrustumObject,
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

const getOffsetRect = (elem: HTMLCanvasElement) => {
    const box = elem.getBoundingClientRect()
    const body = document.body
    const docElem = document.documentElement

    const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
    const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft
    const clientTop = docElem.clientTop || body.clientTop || 0
    const clientLeft = docElem.clientLeft || body.clientLeft || 0
    const top  = box.top +  scrollTop - clientTop
    const left = box.left + scrollLeft - clientLeft

    return { top: Math.round(top), left: Math.round(left) }
}

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

    const newFrustumObject = (): FrustumObject => ({
        uniqueId: uuidv4(),
        type: "frustum",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        top: [0, 0, 5],
        bottom_radius: 1.0,
        top_radius: 0.5
    });

    const newFlatSidedFrustumObject = (): FlatSidedFrustumObject => ({
        uniqueId: uuidv4(),
        type: "flatfrustum",
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
        major_radius: 1.0,
        minor_radius: 0.2
    });

    const createNewObject = (type: ThreeDObject["type"]): ThreeDObject => {
        switch (type) {
            case "sphere": return newSphereObject();
            case "cylinder": return newCylinderObject();
            case "cone": return newConeObject();
            case "frustum": return newFrustumObject();
            case "flatfrustum": return newFlatSidedFrustumObject();
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
    const [scaleXYZText, setScaleXYZText] = useState<string>("1,1,1");
    const [selectedAlpha, setSelectedAlpha] = useState<number>(1.0);
    const [sizeText, setSizeText] = useState<string>("1.0");
    const [size2Text, setSize2Text] = useState<string>("0.2");
    const [nSidesText, setNSidesText] = useState<string>("4");
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)
    const [xyDown, setXYDown] = useState<[number,number]>([-100,-100])
    const q = quat4.create()
    quat4.set(q, 0, 0, 0, -1);
    const [myQuat, setQuat] = useState<quat4>(q)

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const handleDelete = () => {
        dispatch(removeObjectById(theObject.uniqueId));
        setObjectNew(true);
    };

    const getXY = (evt) => {
        if(!canvasRef||!canvasRef.current) return

        const canvas = canvasRef.current
        const offset = getOffsetRect(canvas)
        let x: number
        let y: number

        if (evt.pageX || evt.pageY) {
            x = evt.pageX
            y = evt.pageY
        } else {
            x = evt.clientX
            y = evt.clientY
        }
        x -= offset.left
        y -= offset.top

        return [x,y]
    }

    const drawCanvas = useCallback(() => {
        if(!canvasRef)
            return

        if(!canvasRef.current)
            return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const rot_x_axis = vec3.create()
        const rot_y_axis = vec3.create()
        const rot_z_axis = vec3.create()
        vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
        vec3.set(rot_y_axis, 0.0, 1.0, 0.0);
        vec3.set(rot_z_axis, 0.0, 0.0, 1.0);
        const theMat = quatToMat4(myQuat);
        vec3.transformMat4(rot_x_axis, rot_x_axis, theMat);
        vec3.transformMat4(rot_y_axis, rot_y_axis, theMat);
        vec3.transformMat4(rot_z_axis, rot_z_axis, theMat);
        ctx.save()
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "#aaaaaa"
        ctx.fillRect(0,0,canvas.width,canvas.height)
        ctx.save()
        ctx.strokeStyle = "#ff0000"
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height/2);
        ctx.lineTo(canvas.width/2+40*rot_x_axis[0], canvas.height/2+40*rot_x_axis[1])
        ctx.stroke()
        ctx.restore()
        ctx.save()
        ctx.strokeStyle = "#00ff00"
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height/2);
        ctx.lineTo(canvas.width/2-40*rot_y_axis[0], canvas.height/2-40*rot_y_axis[1])
        ctx.stroke()
        ctx.restore()
        ctx.save()
        ctx.strokeStyle = "#0000bb"
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height/2);
        ctx.lineTo(canvas.width/2+40*rot_z_axis[0], canvas.height/2+40*rot_z_axis[1])
        ctx.stroke()
        ctx.restore()
        ctx.restore()
    },[myQuat])

    const checkPositionText = () => {
        let isOk: boolean = false;
        if(positionText.split(",").length!==3) return isOk
        try {
            const [_new_x, _new_y, _new_z] = positionText.split(",").map(a => parseFloat(a));
            if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y) && !Number.isNaN(_new_z) && !(_new_x === undefined) && !(_new_y === undefined) && !(_new_z === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number triplet in position text.", positionText);
            }
        } catch (e) {
            console.log("Not a valid number triplet in position text.");
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

    const checkNSidesText = () => {
        let isOk: boolean = false;
        try {
            const _new_x = parseFloat(nSidesText)
            if (!Number.isNaN(_new_x) && !(_new_x === undefined) && Number.isInteger(_new_x)) {
                isOk = true;
            } else {
                console.log("Not a valid number in n_sides.");
            }
        } catch(e) {
            console.log("Not a valid number in n_sides.");
        }
        return isOk;
    }

    const checkSize2Text = () => {
        let isOk: boolean = false;
        try {
            const _new_x = parseFloat(size2Text)
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
                console.log("Not a valid number triplet in end position text.", endPositionText);
            }
        } catch (e) {
            console.log("Not a valid number triplet in end position text.");
        }
        return isOk;
    };
    const checkXYZScaleText = () => {
        let isOk: boolean = false;
        if(scaleXYZText.split(",").length!==3) return isOk
        try {
            const [_new_x, _new_y, _new_z] = scaleXYZText.split(",").map(a => parseFloat(a));
            if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y) && !Number.isNaN(_new_z) && !(_new_x === undefined) && !(_new_y === undefined) && !(_new_z === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number triplet in scale text.", scaleXYZText);
            }
        } catch (e) {
            console.log("Not a valid number triplet in scale text.");
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

    const updateTheRotation = useCallback((
        {
            orientation = undefined
        }
    ) => {
        setObject(prev => {
            return {
            ...prev,
            ...(orientation && { orientation }),
            };
        });
    },[])

    const updateTheObject = (
        {
            x = undefined,
            y = undefined,
            z = undefined,
            x2 = undefined,
            y2 = undefined,
            z2 = undefined,
            xscale = undefined,
            yscale = undefined,
            zscale = undefined,
            colour = undefined,
            size = undefined,
            size2 = undefined,
            n_sides = undefined,
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
                    xscale !== undefined &&
                    yscale !== undefined &&
                    zscale !== undefined &&
                    "scalexyz" in prev && {
                        scalexyz: [
                            Number(xscale),
                            Number(yscale),
                            Number(zscale)
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
                    "bottom_radius" in prev && {
                        bottom_radius: Number(size)
                    }
                ),
                ...(
                    size !== undefined &&
                    "scale" in prev && {
                        scale: Number(size)
                    }
                ),
                ...(
                    size !== undefined &&
                    "major_radius" in prev && {
                        major_radius: Number(size)
                    }
                ),
                ...(
                    size2 !== undefined &&
                    "minor_radius" in prev && {
                       minor_radius: Number(size2)
                    }
                ),
                ...(
                    size2 !== undefined &&
                    "top_radius" in prev && {
                       top_radius: Number(size2)
                    }
                ),
                ...(
                    n_sides !== undefined &&
                    "n_sides" in prev && {
                       n_sides: Number(n_sides)
                    }
                ),
            }));
        }
    };

    const handleObjectChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        if (evt.target.value === "new") {
            setObjectNew(true);
            setSelectedOption("new");
            setPositionText("0,0,0");
            setEndPositionText("0,0,1");
            setScaleXYZText("1,1,1");
            setNSidesText("4");
            setSizeText("1");
            setSize2Text("0.2");
            setObject(newSphereObject());
        } else {
            try {
                const existingObject  = threeDObjects.find(element => element.uniqueId === evt.target.value);
                console.log(existingObject)

                setSelectedOption(existingObject.uniqueId);
                setPositionText(existingObject.origin.join(","));
                if(existingObject.type==="cone"||existingObject.type==="frustum"||
                  existingObject.type==="flatfrustum"||existingObject.type==="pyramid")
                    setEndPositionText(existingObject.top.join(","));
                if(existingObject.type==="prism"||existingObject.type==="cylinder")
                    setEndPositionText(existingObject.end.join(","));
                if(existingObject.type==="cuboid")
                    setScaleXYZText(existingObject.scalexyz.join(","));
                if(existingObject.type==="torus"){
                    setSizeText(String(existingObject.major_radius))
                    setSize2Text(String(existingObject.minor_radius))
                }
                if(existingObject.type==="frustum"||existingObject.type==="flatfrustum"){
                    setSizeText(String(existingObject.bottom_radius))
                    setSize2Text(String(existingObject.top_radius))
                }
                if(existingObject.type==="prism"||existingObject.type==="flatfrustum"||existingObject.type==="pyramid"){
                    setNSidesText(String(existingObject.n_sides))
                }
                if(existingObject.type==="cube"||existingObject.type==="cuboid"||existingObject.type==="tetrahedron"||
                   existingObject.type==="octahedron"||existingObject.type==="dodecahedron"||
                   existingObject.type==="icosahedron"||existingObject.type==="football"||
                   existingObject.type==="torus"
                    ){
                    console.log(existingObject.orientation)
                    const m4 = existingObject.orientation
                    const m3 = [
                       m4[0], m4[1], m4[2],
                       m4[4], m4[5], m4[6],
                       m4[8], m4[9], m4[10]
                    ];
                    const q = quat4.create()
                    quat4.fromMat3(q, m3);
                    //The fact that I have to do this is slightly worrying.
                    q[0] = -q[0]; q[1] = -q[1]; q[2] = -q[2]
                    console.log(...q)
                    setQuat(q)
                }
                if("scale" in existingObject)
                    setSizeText(String(existingObject.scale))
                if("radius" in existingObject)
                    setSizeText(String(existingObject.radius))

                setObject(existingObject);
            } catch (e) {
                console.log("Some problem?");
                console.log(e);
            }
        }
    };

    const handleMouseMove = useCallback((evt) => {
        if(!mouseHeldDown) return
        const [x,y] = getXY(evt)
        const [dx,dy]= [xyDown[0]-x,xyDown[1]-y]

        const rot_x_axis = vec3.create()
        const rot_y_axis = vec3.create()
        vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
        vec3.set(rot_y_axis, 0.0, 1.0, 0.0);

        const xQ = createQuatFromAngle(-dy, rot_x_axis);
        const yQ = createQuatFromAngle(dx, rot_y_axis);
        quat4.multiply(xQ, xQ, yQ);
        quat4.multiply(myQuat, myQuat, xQ);

        setQuat(myQuat)
        setXYDown([x,y])

        drawCanvas()
        updateTheRotation({orientation:Array.from(quatToMat4(myQuat))})

    },[mouseHeldDown,xyDown,myQuat,drawCanvas,updateTheRotation])

    const handleMouseDown = useCallback((evt) => {
        const [x,y] = getXY(evt)
        setXYDown([x,y])
        setMouseHeldDown(true)
    },[])

    const handleMouseUp = useCallback((evt) => {
        setMouseHeldDown(false)
        const [x,y] = getXY(evt)
        setXYDown([x,y])
    },[])

    useEffect(() => {
        drawCanvas()
    }, [canvasRef,theObject.type,drawCanvas])

    useEffect(() => {

        if(!canvasRef)
            return

        if(!canvasRef.current)
            return

        canvasRef.current.addEventListener("mousemove", handleMouseMove , false)
        canvasRef.current.addEventListener("mousedown", handleMouseDown , false)
        canvasRef.current.addEventListener("mouseup", handleMouseUp , false)

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove)
                canvasRef.current.removeEventListener("mousedown", handleMouseDown)
                canvasRef.current.removeEventListener("mouseup", handleMouseUp)
            }
        }

    }, [theObject.type,canvasRef,handleMouseMove,handleMouseUp,handleMouseDown])

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
                    <option value="frustum">Frustum</option>
                    <option value="flatfrustum">Flat-Sided Frustum</option>
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
                {(drawMode === "frustum" || drawMode === "flatfrustum" || drawMode === "pyramid"|| drawMode === "cone")  &&
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
                {(drawMode === "cone"||drawMode === "frustum"||drawMode === "flatfrustum"||drawMode === "pyramid")  &&
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
                {(drawMode === "cuboid")  &&
                    <>
                        <MoorhenTextInput
                            label="Scales (XYZ)"
                            text={scaleXYZText}
                            onChange={evt => {
                                setScaleXYZText(evt.target.value);
                                if(evt.target.value.split(",").length===3){
                                    const xscale = evt.target.value.split(",")[0]
                                    const yscale = evt.target.value.split(",")[1]
                                    const zscale = evt.target.value.split(",")[2]
                                    updateTheObject({xscale,yscale,zscale},theObject.type)
                                }
                            }}
                            isInvalid={!checkXYZScaleText()}
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
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({size:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSizeText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "frustum"||drawMode === "flatfrustum")  &&
                    <>
                        <MoorhenTextInput
                            label="Bottom size"
                            text={sizeText}
                            onChange={evt => {
                                setSizeText(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({size:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSizeText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                        <MoorhenTextInput
                            label="Top size"
                            text={size2Text}
                            onChange={evt => {
                                setSize2Text(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({size2:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSize2Text()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "torus")  &&
                    <>
                        <MoorhenTextInput
                            label="Major radius"
                            text={sizeText}
                            onChange={evt => {
                                setSizeText(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({size:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSizeText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "torus")  &&
                    <>
                        <MoorhenTextInput
                            label="Minor radius"
                            text={size2Text}
                            onChange={evt => {
                                setSize2Text(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({size2:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSize2Text()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "tetrahedron"||drawMode === "cube"||drawMode === "octahedron"
                ||drawMode === "dodecahedron"||drawMode === "icosahedron"||drawMode === "football")  &&
                    <>
                        <MoorhenTextInput
                            label="Size"
                            text={sizeText}
                            onChange={evt => {
                                setSizeText(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({size:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSizeText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "prism"||drawMode === "pyramid"||drawMode === "flatfrustum")  &&
                    <>
                        <MoorhenTextInput
                            label="Number of sides"
                            text={nSidesText}
                            onChange={evt => {
                                setNSidesText(evt.target.value);
                                if(!isNaN(parseInt(evt.target.value))){
                                    updateTheObject({n_sides:parseInt(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkNSidesText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "cube"||drawMode==="cuboid"||drawMode==="tetrahedron"||
                   drawMode==="octahedron"||drawMode==="dodecahedron"||
                   drawMode==="icosahedron"||drawMode==="football"||
                   drawMode==="torus")  &&
                    <>
                        <span>Orientation</span>
                        <canvas ref={canvasRef} width={120} height={120}></canvas>
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
