import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { useRef, useState, useEffect, useCallback } from "react";
import * as quat4 from 'gl-matrix/quat';
import * as vec3 from 'gl-matrix/vec3';
import { createQuatFromAngle } from '../../../src/WebGLgComponents/quatUtils';
import { quatToMat4, quat4Inverse } from '../../../src/WebGLgComponents/quatToMat4';
import {
    DEFAULT_WIREFRAME_RADIUS,
    addObject,
    isWireframeableType,
    removeObjectById,
    updateObject
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
    EllipsoidObject,
    PlaneObject,
    DiscObject,
    AnnulusObject,
    ArcObject,
    CapsuleObject,
    HelixObject,
    TetrahedronObject,
    OctahedronObject,
    DodecahedronObject,
    IcosahedronObject,
    FootballObject,
    TruncatedOctahedronObject,
    CuboctahedronObject,
    RhombicDodecahedronObject,
    TorusObject,
    PathObject,
    ThreeDObject
} from "../../store/threeDObjectsSlice";

import { moorhen } from "../../types/moorhen";
import { MOORHEN_ATOM_TAG_KIND, moorhenAtomTagKey, modalKeys } from "../../utils/enums";
import { colourToEmojiSwatch, componentToHex, convertRemToPx, convertViewtoPx, getHexForCanvasColourName, hexToRGB, parseAtomInfoLabel, rgbToHex } from "../../utils/utils";
import { MoorhenToggle, MoorhenButton, MoorhenColourPicker, MoorhenMoleculeSelect, MoorhenSelect, MoorhenTextInput } from "../inputs";
import { smoothPath } from "../../WebGLgComponents/shapeGeometry";
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

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    // The scene's own rotation, pushed to the store live by MGWebGL's onQuatChanged. Both the
    // gizmo and the drag are expressed relative to it, so that this widget agrees with what the
    // main window is showing however the camera is turned.
    const sceneQuat = useSelector((state: moorhen.State) => state.glRef.quat);

    const [objectNew, setObjectNew] = useState(true);

    const dispatch = useDispatch();

    const vectorSelectRef = useRef<null | HTMLSelectElement>(null);
    const drawModeRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);

    const IDENTITY_MATRIX: Matrix4x4 = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];

    const newSphereObject = (): SphereObject => ({
        uniqueId: uuidv4(),
        type: "sphere",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        radius: 1.0
    })

    const newCylinderObject = (): CylinderObject => ({
        uniqueId: uuidv4(),
        type: "cylinder",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        end: [0, 0, 5],
        radius: 1.0
    });

    const newConeObject = (): ConeObject => ({
        uniqueId: uuidv4(),
        type: "cone",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        top: [0, 0, 5],
        radius: 1.0
    });

    const newFrustumObject = (): FrustumObject => ({
        uniqueId: uuidv4(),
        type: "frustum",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        bottom_radius: 1.0,
        top_radius: 0.5,
        height: 5.0
    });

    const newFlatSidedFrustumObject = (): FlatSidedFrustumObject => ({
        uniqueId: uuidv4(),
        type: "flatfrustum",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        bottom_radius: 1.0,
        top_radius: 0.5,
        height: 5.0,
        n_sides: 4
    });

    const newPrismObject = (): PrismObject => ({
        uniqueId: uuidv4(),
        type: "prism",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        radius: 1.0,
        height: 5.0,
        n_sides: 4
    });

    const newPyramidObject = (): PyramidObject => ({
        uniqueId: uuidv4(),
        type: "pyramid",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        radius: 1.0,
        height: 5.0,
        n_sides: 4
    });

    const newCubeObject = (): CubeObject => ({
        uniqueId: uuidv4(),
        type: "cube",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newCuboidObject = (): CuboidObject => ({
        uniqueId: uuidv4(),
        type: "cuboid",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scalexyz: [1.0, 1.0, 1.0]
    });

    const newEllipsoidObject = (): EllipsoidObject => ({
        uniqueId: uuidv4(),
        type: "ellipsoid",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scalexyz: [1.0, 1.0, 1.0]
    });

    const newPlaneObject = (): PlaneObject => ({
        uniqueId: uuidv4(),
        type: "plane",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        // x and y are the side lengths; z is unused, a plane has no thickness
        scalexyz: [5.0, 5.0, 1.0]
    });

    const newDiscObject = (): DiscObject => ({
        uniqueId: uuidv4(),
        type: "disc",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        radius: 2.5
    });

    const newAnnulusObject = (): AnnulusObject => ({
        uniqueId: uuidv4(),
        type: "annulus",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        radius: 2.5,
        inner_radius: 1.5
    });

    const newTetrahedronObject = (): TetrahedronObject => ({
        uniqueId: uuidv4(),
        type: "tetrahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newOctahedronObject = (): OctahedronObject => ({
        uniqueId: uuidv4(),
        type: "octahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newDodecahedronObject = (): DodecahedronObject => ({
        uniqueId: uuidv4(),
        type: "dodecahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newIcosahedronObject = (): IcosahedronObject => ({
        uniqueId: uuidv4(),
        type: "icosahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newFootballObject = (): FootballObject => ({
        uniqueId: uuidv4(),
        type: "football",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newTruncatedOctahedronObject = (): TruncatedOctahedronObject => ({
        uniqueId: uuidv4(),
        type: "truncatedoctahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newCuboctahedronObject = (): CuboctahedronObject => ({
        uniqueId: uuidv4(),
        type: "cuboctahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newRhombicDodecahedronObject = (): RhombicDodecahedronObject => ({
        uniqueId: uuidv4(),
        type: "rhombicdodecahedron",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        scale: 1.0
    });

    const newArcObject = (): ArcObject => ({
        uniqueId: uuidv4(),
        type: "arc",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        major_radius: 2.0,
        minor_radius: 0.2,
        sweep_angle: 90.0
    });

    const newCapsuleObject = (): CapsuleObject => ({
        uniqueId: uuidv4(),
        type: "capsule",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        radius: 1.0,
        height: 5.0
    });

    const newHelixObject = (): HelixObject => ({
        uniqueId: uuidv4(),
        type: "helix",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        major_radius: 2.0,
        minor_radius: 0.3,
        height: 5.0,
        sweep_angle: 720.0
    });

    const newPathObject = (): PathObject => ({
        uniqueId: uuidv4(),
        type: "path",
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        // Two points to begin with, so a new path is something you can see and then edit rather
        // than an invisible object waiting for a generator.
        points: [0, 0, 0, 5, 0, 0],
        run_starts: [0],
        radius: 0.3,
        inner_radius: 0,
        // Hand-built paths highlight point to point; the CA generator raises this when it splines.
        point_stride: 1,
        // Nothing to say about the sections until a generator labels them.
        section_tags: [],
        tag_kind: ""
    });

    const newTorusObject = (): TorusObject => ({
        uniqueId: uuidv4(),
        type: "torus",
        wireframe: false,
        wireframe_radius: DEFAULT_WIREFRAME_RADIUS,
        colour: "#ff0000ff",
        origin: [0, 0, 0],
        orientation: IDENTITY_MATRIX,
        major_radius: 1.0,
        minor_radius: 0.2
    });

    /** Above this many points the rows are hidden: a CA trace is not worth listing by hand. */
    const MAX_EDITABLE_POINTS = 12;

    const [pointTexts, setPointTexts] = useState<string[]>([]);

    /** Trim float noise so a typed 0.3 does not come back as 0.30000000000000004. */
    const formatCoord = (x: number) => String(Number(x.toFixed(4)));

    const pointsToTexts = (points: number[]): string[] =>
        Array.from({ length: Math.floor(points.length / 3) }, (_unused, i) =>
            [0, 1, 2].map(c => formatCoord(points[3 * i + c])).join(",")
        );

    /**
     * Put a path into the store as well as into the dialog.
     *
     * The live-sync effect deliberately ignores an object that is not in the store yet - Apply is
     * what puts it there - but the path controls are explicit actions whose whole point is to be
     * looked at, so they add it themselves rather than drawing nothing until Apply.
     */
    const commitPath = (updated: PathObject) => {
        setObject(updated);
        if (objectNew) {
            dispatch(addObject(updated));
            setObjectNew(false);
            setSelectedOption(updated.uniqueId);
        } else {
            dispatch(updateObject(updated));
        }
    };

    /**
     * Replace the path's points, keeping everything else.
     *
     * The stride goes back to 1: hand-placed points are the sections, whatever a generator may
     * have set when it last filled this path in.
     */
    const setPathPoints = (points: number[], run_starts?: number[]) => {
        if (theObject.type !== "path") return;
        commitPath({
            ...theObject,
            points,
            run_starts: run_starts ?? theObject.run_starts,
            point_stride: 1,
            // Whatever the sections used to stand for, they do not stand for it now.
            section_tags: [],
            tag_kind: ""
        });
    };

    /**
     * The atom that stands for a residue when tracing a backbone, in order of preference.
     *
     * A protein residue is traced through its alpha carbon. A nucleotide has no such thing, so it
     * is traced through the phosphate - the classic backbone trace - falling back to C1' and then
     * C4' for the residue at a 5' end, which has no phosphate to trace through.
     *
     * The element is checked as well as the name because they are not unique: a calcium ion is an
     * atom called CA in a residue called CA, and would otherwise be strung into the protein trace
     * as though it were a residue of it.
     */
    const TRACE_ATOMS: { name: string; element: string; kind: "protein" | "nucleic" }[] = [
        { name: "CA", element: "C", kind: "protein" },
        { name: "P", element: "P", kind: "nucleic" },
        { name: "C1'", element: "C", kind: "nucleic" },
        { name: "C4'", element: "C", kind: "nucleic" },
    ];

    /**
     * Beyond this, consecutive trace atoms are not part of the same run.
     *
     * The step differs by polymer: 3.8 A between alpha carbons, around 6 to 7 between phosphates,
     * so one threshold cannot serve both - 5 A would break a nucleic chain at every residue, and
     * 9 A would step straight over a missing one in a protein.
     *
     * Residue numbering is deliberately not used for the test: a jump in numbering with the atoms
     * still a bond apart is a renumbering rather than a gap, and tracing straight through it is
     * right, while a genuine break shows up as distance whatever the numbers say.
     */
    const BREAK_DISTANCE = { protein: 5.0, nucleic: 9.0 };

    /** Segments each 3.8 A step becomes when splined, giving roughly 1 A between points. */
    const SPLINE_SUBDIVISIONS = 4;

    const [splinePath, setSplinePath] = useState<boolean>(false);

    /**
     * Replace the current path's points with a backbone trace of the selected molecule.
     *
     * A snapshot, not a link: the path keeps the coordinates and knows nothing about where they
     * came from, so refining the molecule afterwards leaves the path where the atoms were. Press
     * the button again to catch up.
     *
     * The points are stored relative to their own centroid, which becomes the object's origin, so
     * the existing position and orientation controls move and turn the whole trace.
     */
    const getPointsFromBackboneTrace = async () => {
        if (theObject.type !== "path") return;
        const molecule = molecules.find(
            mol => mol.molNo === parseInt(moleculeSelectRef.current?.value ?? "")
        );
        if (!molecule) return;

        const atoms = await molecule.gemmiAtomsForCid("/*/*/*/*");

        // One trace atom per residue, rather than a filter on atom name: which atom stands for a
        // residue depends on what kind of residue it is, and that is only decidable once its
        // atoms are seen together.
        const traced: { atom: moorhen.AtomInfo; kind: "protein" | "nucleic" }[] = [];
        let residueAtoms: moorhen.AtomInfo[] = [];
        const takeResidue = () => {
            if (residueAtoms.length === 0) return;
            for (const candidate of TRACE_ATOMS) {
                const atom = residueAtoms.find(
                    item =>
                        item.name.trim() === candidate.name &&
                        item.element.trim().toUpperCase() === candidate.element
                );
                if (atom) {
                    traced.push({ atom, kind: candidate.kind });
                    return;
                }
            }
        };
        atoms.forEach(atom => {
            const previous = residueAtoms[residueAtoms.length - 1];
            if (previous && (previous.chain_id !== atom.chain_id || previous.res_no !== atom.res_no)) {
                takeResidue();
                residueAtoms = [];
            }
            residueAtoms.push(atom);
        });
        takeResidue();

        if (traced.length < 2) return;

        // Kept as atoms rather than as bare coordinates, so that the labels below and the runs
        // themselves come from one traversal and cannot drift apart.
        const runAtoms: moorhen.AtomInfo[][] = [];
        let run: moorhen.AtomInfo[] = [];
        traced.forEach(({ atom, kind }, i) => {
            const previous = i > 0 ? traced[i - 1] : null;
            const broken = previous !== null && (
                atom.chain_id !== previous.atom.chain_id ||
                // A chain that changes polymer part way along is not one run: the step between
                // an alpha carbon and a phosphate means nothing.
                kind !== previous.kind ||
                Math.hypot(
                    atom.x - previous.atom.x, atom.y - previous.atom.y, atom.z - previous.atom.z
                ) > BREAK_DISTANCE[kind]
            );
            if (broken && run.length > 0) {
                runAtoms.push(run);
                run = [];
            }
            run.push(atom);
        });
        if (run.length > 0) runAtoms.push(run);
        const runs = runAtoms.map(atoms => atoms.flatMap(atom => [atom.x, atom.y, atom.z]));

        // Splined run by run, never across a break - a spline through a gap would invent a strand
        // that is not there.
        const shaped = splinePath ? runs.map(r => smoothPath(r, SPLINE_SUBDIVISIONS)) : runs;

        const points: number[] = [];
        const run_starts: number[] = [];
        // One label per section, in the order the geometry will build them: run by run, and
        // within a run one section per original CA step. Splining multiplies the points by
        // SPLINE_SUBDIVISIONS and the stride divides by it again, so the count comes to the same
        // either way - which is the point of carrying the stride at all.
        const section_tags: string[] = [];
        shaped.forEach((r, runIndex) => {
            if (r.length < 6) return;
            run_starts.push(points.length / 3);
            points.push(...r);
            const atoms = runAtoms[runIndex];
            for (let section = 0; section + 1 < atoms.length; section++) {
                const atom = atoms[section];
                section_tags.push(
                    `${moorhenAtomTagKey(molecule.uniqueId, atom.chain_id, atom.res_no)}` +
                    `|${parseAtomInfoLabel(atom)}`
                );
            }
        });
        if (points.length < 6) return;

        const count = points.length / 3;
        const centroid = [0, 1, 2].map(
            c => points.reduce((total, x, i) => (i % 3 === c ? total + x : total), 0) / count
        ) as [number, number, number];

        const updated: PathObject = {
            ...theObject,
            points: points.map((x, i) => x - centroid[i % 3]),
            run_starts,
            origin: centroid,
            // So that a section stays one residue whether or not the trace was splined.
            point_stride: splinePath ? SPLINE_SUBDIVISIONS : 1,
            section_tags,
            tag_kind: MOORHEN_ATOM_TAG_KIND
        };
        commitPath(updated);
        setPositionText(centroid.map(c => c.toFixed(2)).join(","));
    };

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
            case "ellipsoid": return newEllipsoidObject();
            case "plane": return newPlaneObject();
            case "disc": return newDiscObject();
            case "annulus": return newAnnulusObject();
            case "arc": return newArcObject();
            case "capsule": return newCapsuleObject();
            case "helix": return newHelixObject();
            case "tetrahedron": return newTetrahedronObject();
            case "octahedron": return newOctahedronObject();
            case "dodecahedron": return newDodecahedronObject();
            case "icosahedron": return newIcosahedronObject();
            case "football": return newFootballObject();
            case "path": return newPathObject();
            case "truncatedoctahedron": return newTruncatedOctahedronObject();
            case "cuboctahedron": return newCuboctahedronObject();
            case "rhombicdodecahedron": return newRhombicDodecahedronObject();
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
    const [heightText, setHeightText] = useState<string>("5.0");
    const [wireframeRadiusText, setWireframeRadiusText] =
        useState<string>(String(DEFAULT_WIREFRAME_RADIUS));
    const [planeSizeText, setPlaneSizeText] = useState<string>("5,5");
    const [sweepAngleText, setSweepAngleText] = useState<string>("90");
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
        // Take the object's axes into world space, then into camera space, so the gizmo shows the
        // object as the main window sees it rather than as an absolute world orientation. The
        // scene matrix is built the same way mgWebGL builds it for the modelview, so the two agree.
        const theMat = quatToMat4(myQuat);
        const sceneMat = quatToMat4(sceneQuat);
        [rot_x_axis, rot_y_axis, rot_z_axis].forEach(axis => {
            vec3.transformMat4(axis, axis, theMat);
            vec3.transformMat4(axis, axis, sceneMat);
        });
        ctx.save()
        ctx.clearRect(0,0,canvas.width,canvas.height)
        ctx.fillStyle = "#aaaaaa"
        ctx.fillRect(0,0,canvas.width,canvas.height)
        // The canvas y axis points down, the WebGL one points up, so the y component of every
        // projected axis is negated - and only the y component. Negating both components (as the
        // green axis used to) mirrors the axis through the origin rather than flipping the
        // handedness, which is why the gizmo disagreed with the scene.
        const drawAxis = (axis: number[], colour: string) => {
            ctx.save()
            ctx.strokeStyle = colour
            ctx.beginPath();
            ctx.moveTo(canvas.width/2, canvas.height/2);
            ctx.lineTo(canvas.width/2 + 40*axis[0], canvas.height/2 - 40*axis[1])
            ctx.stroke()
            ctx.restore()
        }
        drawAxis(rot_x_axis, "#ff0000")
        drawAxis(rot_y_axis, "#00ff00")
        drawAxis(rot_z_axis, "#0000bb")
        ctx.restore()
    },[myQuat,sceneQuat])

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

    const checkPlaneSizeText = () => {
        let isOk: boolean = false;
        if(planeSizeText.split(",").length!==2) return isOk
        try {
            const [_new_x, _new_y] = planeSizeText.split(",").map(a => parseFloat(a));
            if (!Number.isNaN(_new_x) && !Number.isNaN(_new_y) && !(_new_x === undefined) && !(_new_y === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number pair in plane size text.", planeSizeText);
            }
        } catch (e) {
            console.log("Not a valid number pair in plane size text.");
        }
        return isOk;
    };

    const checkSweepAngleText = () => {
        let isOk: boolean = false;
        try {
            const _new_x = parseFloat(sweepAngleText)
            if (!Number.isNaN(_new_x) && !(_new_x === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number in sweep angle.");
            }
        } catch(e) {
            console.log("Not a valid number in sweep angle.");
        }
        return isOk;
    }

    const checkHeightText = () => {
        let isOk: boolean = false;
        try {
            const _new_x = parseFloat(heightText)
            if (!Number.isNaN(_new_x) && !(_new_x === undefined)) {
                isOk = true;
            } else {
                console.log("Not a valid number in height.");
            }
        } catch(e) {
            console.log("Not a valid number in height.");
        }
        return isOk;
    }

    const checkWireframeRadiusText = () => {
        const value = parseFloat(wireframeRadiusText)
        // Zero or negative would be a tube with no thickness or an inside-out one, so unlike the
        // other sizes here this one has to be strictly positive.
        return !Number.isNaN(value) && value > 0;
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

    /**
     * Live-update the scene while an existing object is being edited, so that changes take effect
     * without pressing Apply.
     *
     * This is deliberately one effect watching theObject rather than a dispatch inside each
     * handler. Every control already edits through setObject, so syncing from the result covers
     * all of them at once - and it cannot read a stale value, which a dispatch inside a handler
     * can: setObject only schedules the change, so anything dispatching straight afterwards sends
     * the object as it was before the edit.
     *
     * A "new" object is left alone. It is not in the store yet, and Apply is what puts it there.
     */
    /**
     * Reseed the point rows whenever the path they belong to changes identity or length.
     *
     * Not on every change to the points: editing a coordinate leaves the count alone, so the row
     * being typed in is left as the user has it, half-finished values and all. Generating a CA
     * trace or adding a point does change the count, and those should refresh the rows.
     */
    const pathPointCount = theObject.type === "path" ? theObject.points.length : -1;
    useEffect(() => {
        if (theObject.type !== "path") return;
        setPointTexts(pointsToTexts(theObject.points));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theObject.uniqueId, pathPointCount]);

    const pendingSync = useRef<number | null>(null);
    useEffect(() => {
        if (objectNew) return;

        // Nothing to push if the store already holds this exact object: true just after selecting
        // one, and again once our own dispatch lands, which is what stops this feeding itself.
        if (threeDObjects.find(obj => obj.uniqueId === theObject.uniqueId) === theObject) return;

        // Coalesce to at most one dispatch per frame. Dragging the rotation canvas fires mousemove
        // far more often than the scene can rebuild its buffers, and every dispatch rebuilds them.
        if (pendingSync.current !== null) cancelAnimationFrame(pendingSync.current);
        pendingSync.current = requestAnimationFrame(() => {
            pendingSync.current = null;
            dispatch(updateObject(theObject));
        });
        return () => {
            if (pendingSync.current !== null) {
                cancelAnimationFrame(pendingSync.current);
                pendingSync.current = null;
            }
        };
    }, [theObject, objectNew, threeDObjects, dispatch]);

    /**
     * Point the shared text boxes at an object's actual values.
     *
     * There is one "size" box, one "size2" box and so on, shared by every shape, so without this
     * they keep whatever the last shape left in them. That is how a path came to show an inner
     * radius of 0.2 while having none: the box was still showing the annulus default, and since
     * nothing had been typed, no change event ever set it on the object.
     */
    const seedTextsFromObject = (obj: ThreeDObject) => {
        setPositionText(obj.origin.join(","));
        if (obj.type === "cone") setEndPositionText(obj.top.join(","));
        if (obj.type === "cylinder") setEndPositionText(obj.end.join(","));
        if ("height" in obj) setHeightText(String(obj.height));
        if ("radius" in obj) setSizeText(String(obj.radius));
        // The polyhedra size themselves through `scale` rather than `radius`.
        if ("scale" in obj) setSizeText(String(obj.scale));
        if ("inner_radius" in obj) setSize2Text(String(obj.inner_radius));
        if ("scalexyz" in obj) setScaleXYZText(obj.scalexyz.join(","));
        if (obj.type === "plane") setPlaneSizeText(obj.scalexyz.slice(0, 2).join(","));
        if ("major_radius" in obj) setSizeText(String(obj.major_radius));
        if ("minor_radius" in obj) setSize2Text(String(obj.minor_radius));
        if ("sweep_angle" in obj) setSweepAngleText(String(obj.sweep_angle));
        setWireframeRadiusText(String(
            ("wireframe_radius" in obj && obj.wireframe_radius !== undefined)
                ? obj.wireframe_radius
                : DEFAULT_WIREFRAME_RADIUS
        ));
        // A frustum's two radii take both boxes, so they come after the single-radius cases.
        if (obj.type === "frustum" || obj.type === "flatfrustum") {
            setSizeText(String(obj.bottom_radius));
            setSize2Text(String(obj.top_radius));
        }
        if (obj.type === "prism" || obj.type === "flatfrustum" || obj.type === "pyramid") {
            setNSidesText(String(obj.n_sides));
        }
    };

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
            height = undefined,
            sweep_angle = undefined,
            wireframe = undefined,
            wireframe_radius = undefined,
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
                // Otherwise the boxes go on showing the previous shape's values, which are then
                // silently not what the new object holds.
                seedTextsFromObject(newObject)
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
                    size2 !== undefined &&
                    "inner_radius" in prev && {
                       inner_radius: Number(size2)
                    }
                ),
                ...(
                    height !== undefined &&
                    "height" in prev && {
                       height: Number(height)
                    }
                ),
                ...(
                    sweep_angle !== undefined &&
                    "sweep_angle" in prev && {
                       sweep_angle: Number(sweep_angle)
                    }
                ),
                ...(
                    wireframe !== undefined &&
                    isWireframeableType(prev.type) && {
                       wireframe: Boolean(wireframe)
                    }
                ),
                ...(
                    wireframe_radius !== undefined &&
                    isWireframeableType(prev.type) && {
                       wireframe_radius: Number(wireframe_radius)
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
            setHeightText("5");
            setPlaneSizeText("5,5");
            setSweepAngleText("90");
            setWireframeRadiusText(String(DEFAULT_WIREFRAME_RADIUS));
            setObject(newSphereObject());
        } else {
            try {
                const existingObject  = threeDObjects.find(element => element.uniqueId === evt.target.value);

                setSelectedOption(existingObject.uniqueId);
                seedTextsFromObject(existingObject);
                if("orientation" in existingObject){
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

        // Rotate about the camera's axes, not the world's. Screen right and screen up are carried
        // back into world space through the inverse of the scene rotation - the same derivation
        // mgWebGL uses for its own `right` and `up` vectors when panning. Using the world axes
        // instead is why a drag only behaved as expected while the scene sat at its unit rotation.
        //
        // The object's orientation itself stays in world space; only the frame the drag is
        // expressed in has changed.
        const invSceneQuat = quat4.create()
        quat4Inverse(sceneQuat, invSceneQuat)
        const invSceneMat = quatToMat4(invSceneQuat)

        const rot_x_axis = vec3.create()
        const rot_y_axis = vec3.create()
        vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
        vec3.set(rot_y_axis, 0.0, 1.0, 0.0);
        vec3.transformMat4(rot_x_axis, rot_x_axis, invSceneMat);
        vec3.transformMat4(rot_y_axis, rot_y_axis, invSceneMat);

        // dx/dy are canvas deltas, so dy is positive when the mouse moves UP the screen. The
        // horizontal drag already reads as a trackball (drag right, the front face swings right);
        // the vertical one needs no extra negation to match, because the canvas y-down convention
        // has already supplied one.
        const xQ = createQuatFromAngle(dy, rot_x_axis);
        const yQ = createQuatFromAngle(dx, rot_y_axis);
        quat4.multiply(xQ, xQ, yQ);
        quat4.multiply(myQuat, myQuat, xQ);

        setQuat(myQuat)
        setXYDown([x,y])

        drawCanvas()
        updateTheRotation({orientation:Array.from(quatToMat4(myQuat))})

    },[mouseHeldDown,xyDown,myQuat,sceneQuat,drawCanvas,updateTheRotation])

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
            {threeDObjects.map(obj => (
                <option key={obj.uniqueId} value={obj.uniqueId}>
                    {colourToEmojiSwatch(obj.colour)}
                    {" "}
                    {String(obj.type).charAt(0).toUpperCase() + String(obj.type).slice(1)}
                    {" "}
                    {obj.origin.map(v => v.toFixed(2)).join(", ")}
                </option>
            ))}
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
                    <option value="ellipsoid">Ellipsoid</option>
                    <option value="plane">Plane</option>
                    <option value="disc">Disc</option>
                    <option value="annulus">Annulus</option>
                    <option value="arc">Arc</option>
                    <option value="capsule">Capsule</option>
                    <option value="helix">Helix</option>
                    <option value="tetrahedron">Tetrahedron</option>
                    <option value="octahedron">Octahedron</option>
                    <option value="dodecahedron">Dodecahedron</option>
                    <option value="icosahedron">Icosahedron</option>
                    <option value="football">Football</option>
                    <option value="truncatedoctahedron">Truncated Octahedron</option>
                    <option value="cuboctahedron">Cuboctahedron</option>
                    <option value="rhombicdodecahedron">Rhombic Dodecahedron</option>
                    <option value="torus">Torus</option>
                    <option value="path">Path</option>

                </MoorhenSelect>

                {(drawMode === "sphere" || drawMode === "cube" || drawMode === "cuboid"
                || drawMode === "tetrahedron" || drawMode === "octahedron"
                || drawMode === "dodecahedron" || drawMode === "icosahedron"
                || drawMode === "football" || drawMode === "torus"
                || drawMode === "truncatedoctahedron" || drawMode === "cuboctahedron"
                || drawMode === "rhombicdodecahedron"
                || drawMode === "ellipsoid" || drawMode === "plane" || drawMode === "disc"
                || drawMode === "annulus" || drawMode === "arc"
                || drawMode === "capsule" || drawMode === "helix"
                || drawMode === "frustum" || drawMode === "flatfrustum"
                || drawMode === "prism" || drawMode === "pyramid"
                || drawMode === "path"
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
                {(drawMode === "path")  &&
                    <>
                        <MoorhenMoleculeSelect
                            ref={moleculeSelectRef}
                            molecules={molecules}
                            style={{ width: "20rem" }}
                        />
                        <MoorhenStack direction="line">
                            <MoorhenToggle
                                label="Spline"
                                checked={splinePath}
                                onChange={() => setSplinePath(!splinePath)}
                            />
                            <MoorhenButton
                                label="Get backbone"
                                onClick={() => { getPointsFromBackboneTrace() }}
                                tooltip="Replace this path's points with a backbone trace of the selected molecule: alpha carbons for protein, phosphates for nucleic acid"
                            />
                        </MoorhenStack>
                        <span>
                            {theObject.type === "path" && theObject.points.length > 0
                                ? `${theObject.points.length / 3} points in ${Math.max(1, theObject.run_starts?.length ?? 1)} run(s)`
                                : "No points yet"}
                        </span>
                        <span/>
                        {theObject.type === "path" && pointTexts.length <= MAX_EDITABLE_POINTS &&
                            pointTexts.map((text, i) => (
                                <MoorhenTextInput
                                    key={`point-${i}`}
                                    label={`Point ${i + 1}`}
                                    text={text}
                                    onChange={evt => {
                                        const next = [...pointTexts];
                                        next[i] = evt.target.value;
                                        setPointTexts(next);
                                        const parts = evt.target.value.split(",").map(parseFloat);
                                        if (parts.length === 3 && parts.every(Number.isFinite)
                                            && theObject.type === "path") {
                                            const points = [...theObject.points];
                                            parts.forEach((value, c) => { points[3 * i + c] = value });
                                            setPathPoints(points);
                                        }
                                    }}
                                    isInvalid={
                                        text.split(",").length !== 3 ||
                                        text.split(",").map(parseFloat).some(v => !Number.isFinite(v))
                                    }
                                    style={{ height: "2rem", margin: "0.3rem" }}
                                />
                            ))
                        }
                        {theObject.type === "path" && pointTexts.length > MAX_EDITABLE_POINTS &&
                        <MoorhenStack direction="line">
                            <span>Too many points to list; clear them to edit by hand.</span>
                            <span></span>
                        </MoorhenStack>
                        }
                        <MoorhenStack direction="line">
                            <MoorhenButton
                                label="Add point"
                                onClick={() => {
                                    if (theObject.type !== "path") return;
                                    const points = [...theObject.points];
                                    const last = points.length - 3;
                                    // Offset along x from the last point, so the new one is
                                    // somewhere visible rather than buried inside its neighbour.
                                    points.push(
                                        (points[last] ?? 0) + 2,
                                        points[last + 1] ?? 0,
                                        points[last + 2] ?? 0
                                    );
                                    setPathPoints(points);
                                }}
                                tooltip="Append a point two units along x from the last"
                            />
                            <MoorhenButton
                                label="Remove last"
                                disabled={theObject.type !== "path" || theObject.points.length <= 6}
                                onClick={() => {
                                    if (theObject.type !== "path") return;
                                    setPathPoints(theObject.points.slice(0, -3));
                                }}
                                tooltip="A path needs two points, so the last pair cannot be removed"
                            />
                            <MoorhenButton
                                label="Clear"
                                onClick={() => setPathPoints([0, 0, 0, 5, 0, 0], [0])}
                                tooltip="Back to two points, discarding any generated trace"
                            />
                        </MoorhenStack>
                        <span/>
                    </>
                }
                {(drawMode === "cylinder")  &&
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
                {(drawMode === "cone")  &&
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
                {(drawMode === "cylinder")  &&
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
                {(drawMode === "cone")  &&
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
                {(drawMode === "plane")  &&
                    <>
                        <MoorhenTextInput
                            label="Size (X,Y)"
                            text={planeSizeText}
                            onChange={evt => {
                                setPlaneSizeText(evt.target.value);
                                if(evt.target.value.split(",").length===2){
                                    const xscale = evt.target.value.split(",")[0]
                                    const yscale = evt.target.value.split(",")[1]
                                    // a plane has no thickness, so z is pinned rather than asked for
                                    updateTheObject({xscale,yscale,zscale:1},theObject.type)
                                }
                            }}
                            isInvalid={!checkPlaneSizeText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "cuboid" || drawMode === "ellipsoid")  &&
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
                {(drawMode === "sphere"||drawMode === "cylinder"||drawMode === "cone"||drawMode === "disc"||drawMode === "annulus"||drawMode === "capsule"||drawMode === "path")  &&
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
                {(drawMode === "pyramid"||drawMode === "prism")  &&
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
                {(drawMode === "torus" || drawMode === "arc" || drawMode === "helix")  &&
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
                {(drawMode === "annulus" || drawMode === "path")  &&
                    <>
                        <MoorhenTextInput
                            label="Inner radius"
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
                {(drawMode === "torus" || drawMode === "arc" || drawMode === "helix")  &&
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
                ||drawMode === "dodecahedron"||drawMode === "icosahedron"||drawMode === "football"
                ||drawMode === "truncatedoctahedron"||drawMode === "cuboctahedron"
                ||drawMode === "rhombicdodecahedron")  &&
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
                {(drawMode === "frustum"||drawMode === "flatfrustum"||drawMode === "prism"||drawMode === "pyramid"||
                  drawMode === "capsule"||drawMode === "helix")  &&
                    <>
                        <MoorhenTextInput
                            label="Height"
                            text={heightText}
                            onChange={evt => {
                                setHeightText(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({height:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkHeightText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "arc" || drawMode === "helix")  &&
                    <>
                        <MoorhenTextInput
                            label="Sweep angle (degrees)"
                            text={sweepAngleText}
                            onChange={evt => {
                                setSweepAngleText(evt.target.value);
                                if(!isNaN(parseFloat(evt.target.value))){
                                    updateTheObject({sweep_angle:parseFloat(evt.target.value)},theObject.type)
                                }
                            }}
                            isInvalid={!checkSweepAngleText()}
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
                {isWireframeableType(drawMode) &&
                    <>
                        <MoorhenToggle
                            label="Wireframe"
                            checked={"wireframe" in theObject && theObject.wireframe === true}
                            onChange={() => {
                                const current = "wireframe" in theObject && theObject.wireframe === true
                                updateTheObject({wireframe: !current},theObject.type)
                            }}
                        />
                        <span/>
                    </>
                }
                {isWireframeableType(drawMode) && "wireframe" in theObject && theObject.wireframe === true &&
                    <>
                        <MoorhenTextInput
                            label="Wire thickness"
                            text={wireframeRadiusText}
                            onChange={evt => {
                                setWireframeRadiusText(evt.target.value);
                                const value = parseFloat(evt.target.value)
                                if(!Number.isNaN(value) && value > 0){
                                    updateTheObject({wireframe_radius: value},theObject.type)
                                }
                            }}
                            isInvalid={!checkWireframeRadiusText()}
                            style={{ height: "2rem", margin: "0.3rem" }}
                        />
                    </>
                }
                {(drawMode === "cube"||drawMode==="cuboid"||drawMode==="tetrahedron"||
                   drawMode==="octahedron"||drawMode==="dodecahedron"||
                   drawMode==="icosahedron"||drawMode==="football"||
                   drawMode==="truncatedoctahedron"||drawMode==="cuboctahedron"||
                   drawMode==="rhombicdodecahedron"||
                   drawMode==="torus"||drawMode==="ellipsoid"||
                   drawMode==="plane"||drawMode==="disc"||drawMode==="annulus"||
                   drawMode==="arc"||drawMode==="capsule"||drawMode==="helix"||
                   drawMode==="frustum"||
                   drawMode==="flatfrustum"||drawMode==="prism"||
                   drawMode==="pyramid"||drawMode==="path")  &&
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
