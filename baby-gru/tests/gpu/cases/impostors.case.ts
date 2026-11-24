/**
 * Spheres and cylinders drawn per pixel (impostors.ts, IMPOSTOR_WGSL) against the same instanced
 * meshes drawn as triangles - finely tessellated (96 segments round), so that the meshes are as good
 * as exact and any difference is the impostors' (or the meshes' antialiased edges):
 *
 * - orthographic and perspective, under a turned camera: the same pixels covered, the same colour;
 * - cut by the front clip plane: the inside showing flat where the mesh's back faces would;
 * - with shadows and ambient occlusion: the same picture near enough, and nothing reported wrong;
 * - capped cylinders (flat ends) look end-on as the capped mesh does;
 * - the plan: the impostors' few triangles counted instead of the meshes'.
 */
import { WebGPUPreviewRenderer } from "../../../src/WebGPUComponents/previewRenderer";
import { type PreviewCameraSource, planPreview } from "../../../src/WebGPUComponents/previewScene";
import { impostorSetting, impostorShape } from "../../../src/WebGPUComponents/impostors";
import type { DisplayBuffer } from "../../../src/WebGLgComponents/displayBuffer";
import { defineCase } from "../helpers/browserCase";

const WIDTH = 320, HEIGHT = 240;
const SEGMENTS = 96;

function camera(over: Partial<PreviewCameraSource> = {}): PreviewCameraSource {
    return {
        myQuat: [0.2, 0.3, 0, Math.sqrt(1 - 0.13)], origin: [0, 0, 0], zoom: 0.18, fogClipOffset: 250,
        gl_clipPlane0: [0, 0, -1, -230], gl_clipPlane1: [0, 0, 1, 270], gl_fog_start: 250, gl_fog_end: 290,
        doPerspectiveProjection: false,
        light_positions: [25, 25, 50, 1], light_colours_ambient: [0.2, 0.2, 0.2, 1], light_colours_diffuse: [0.5, 0.5, 0.5, 1],
        light_colours_specular: [0.5, 0.5, 0.5, 1], specularPower: 32, background_colour: [0, 0, 0, 1],
        ...over,
    };
}

interface Mesh { positions: number[]; normals: number[]; indices: number[] }

/** A unit sphere, normals along the positions. */
function sphereMesh(): Mesh {
    const positions: number[] = [], indices: number[] = [];
    const rings = SEGMENTS / 2;
    for (let i = 0; i <= rings; i++) {
        const theta = (Math.PI * i) / rings;
        for (let j = 0; j <= SEGMENTS; j++) {
            const phi = (2 * Math.PI * j) / SEGMENTS;
            positions.push(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta));
        }
    }
    const row = SEGMENTS + 1;
    for (let i = 0; i < rings; i++) for (let j = 0; j < SEGMENTS; j++) {
        const a = i * row + j, b = a + row;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    return { positions, normals: positions.slice(), indices };
}

/** A unit cylinder along z from 0 to 1, radial normals; with flat caps if asked. */
function cylinderMesh(caps = false, coot = false): Mesh {
    // Coot's template (cylinder.cc) runs to z = -1, its y turned round too.
    const f = coot ? -1 : 1;
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    for (let j = 0; j <= SEGMENTS; j++) {
        const phi = (2 * Math.PI * j) / SEGMENTS, x = Math.cos(phi), y = f * Math.sin(phi);
        positions.push(x, y, 0, x, y, f);
        normals.push(x, y, 0, x, y, 0);
    }
    for (let j = 0; j < SEGMENTS; j++) {
        const a = 2 * j;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    if (caps) {
        for (const [z, nz] of [[0, -f], [f, f]]) {
            const centre = positions.length / 3;
            positions.push(0, 0, z);
            normals.push(0, 0, nz);
            for (let j = 0; j <= SEGMENTS; j++) {
                const phi = (2 * Math.PI * j) / SEGMENTS;
                positions.push(Math.cos(phi), Math.sin(phi), z);
                normals.push(0, 0, nz);
            }
            // Wound counter-clockwise seen from outside (along the cap's normal), as the WebGL view needs
            // to light it as a front face.
            for (let j = 0; j < SEGMENTS; j++) {
                if (nz > 0) indices.push(centre, centre + 1 + j, centre + 2 + j);
                else indices.push(centre, centre + 2 + j, centre + 1 + j);
            }
        }
    }
    return { positions, normals, indices };
}

const normalise = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / l); };
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

interface Instance { origin: number[]; size: number[]; orientation: number[]; colour: number[] }

const sphere = (centre: number[], radius: number, colour: number[]): Instance =>
    ({ origin: centre, size: [radius, radius, radius], orientation: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], colour });

/** A cylinder from a to b, as Coot places one: origin a, size (r, r, length), z turned along b - a. */
function cylinder(a: number[], b: number[], radius: number, colour: number[], coot = false): Instance {
    // Coot's way: its template runs to z = -1, so z is turned along a - b.
    const d = coot ? [a[0] - b[0], a[1] - b[1], a[2] - b[2]] : [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const length = Math.hypot(d[0], d[1], d[2]);
    const z = normalise(d);
    const x = normalise(cross(z, Math.abs(z[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const y = cross(z, x);
    return { origin: a, size: [radius, radius, length], orientation: [...x, 0, ...y, 0, ...z, 0, 0, 0, 0, 1], colour };
}

function instanced(mesh: Mesh, instances: Instance[], id: string): DisplayBuffer {
    return {
        id, visible: true, alphaMultiplier: 1, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        triangleVertices: [new Float32Array(mesh.positions)], triangleNormals: [new Float32Array(mesh.normals)],
        triangleIndexs: [new Uint32Array(mesh.indices)],
        triangleColours: [new Float32Array(instances.flatMap(i => i.colour))],
        triangleInstanceOrigins: [new Float32Array(instances.flatMap(i => i.origin))],
        triangleInstanceSizes: [new Float32Array(instances.flatMap(i => i.size))],
        triangleInstanceOrientations: [new Float32Array(instances.flatMap(i => i.orientation))],
        supplementary: { instance_use_colors: [true] },
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

/** A plain mesh, not instanced: a square across the scene at z, tilted, opaque or see-through. */
function square(z: number, alpha = 1): DisplayBuffer {
    const corners = [[-6, -5, z - 2], [6, -5, z + 2], [6, 5, z + 2], [-6, 5, z - 2]];
    const n = normalise(cross([12, 0, 4], [0, 10, 0]));
    return {
        id: `square-${alpha}`, visible: true, alphaMultiplier: alpha, dataVersion: 1, bufferTypes: ["TRIANGLES"],
        transparent: alpha < 1,
        triangleVertices: [new Float32Array(corners.flat())], triangleNormals: [new Float32Array([...n, ...n, ...n, ...n])],
        triangleIndexs: [new Uint32Array([0, 1, 2, 0, 2, 3])],
        triangleColours: [new Float32Array([0.9, 0.8, 0.3, alpha].concat(Array(12).fill(0).map((_, i) => [0.9, 0.8, 0.3, alpha][i % 4])))],
        symmetryMatrices: [],
    } as unknown as DisplayBuffer;
}

const RED = [0.9, 0.2, 0.2, 1], BLUE = [0.2, 0.4, 0.9, 1], GREY = [0.6, 0.6, 0.6, 1], GREEN = [0.3, 0.8, 0.3, 1];

/**
 * A small ball-and-stick: atoms, and bonds between them in two colours, a bond along the view too.
 * `big`: the atoms space-filling, overlapping each other and the bonds deep.
 */
function molecule(z = 0, caps = false, coot = false, big = false): DisplayBuffer[] {
    const atoms = [[-4, -1, z], [-1.5, 1, z + 1], [1.5, -1, z - 1], [4, 1, z], [0, 3, z + 2]];
    const colours = [RED, GREY, BLUE, GREY, GREEN];
    const spheres = atoms.map((a, i) => sphere(a, big ? 1.5 + 0.1 * i : 0.55 + 0.1 * i, colours[i]));
    const bonds: Instance[] = [];
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [1, 4]]) {
        const mid = atoms[i].map((v, k) => (v + atoms[j][k]) / 2);
        bonds.push(cylinder(atoms[i], mid, 0.25, colours[i], coot), cylinder(mid, atoms[j], 0.25, colours[j], coot));
    }
    // A loose bond, end on and tilted, away from the atoms: its open ends and sides seen.
    bonds.push(cylinder([-3, -4, z - 2], [-2.6, -3.6, z + 2.5], 0.4, GREEN, coot), cylinder([2, -4, z], [5, -3, z + 1], 0.35, RED, coot));
    return [instanced(sphereMesh(), spheres, "atoms"), instanced(cylinderMesh(caps, coot), bonds, "bonds")];
}

export interface Comparison {
    /** Pixels covered in either picture. */
    covered: number;
    /** Covered in one only (silhouettes, where the mesh's are antialiased). */
    coverageDiffers: number;
    /** Covered in both and more than 24 levels apart. */
    colourDiffers: number;
    /** Covered in both and more than 4 levels apart: that the two pictures were drawn differently at all. */
    anyDiffers: number;
    meanDifference: number;
    /** The impostors in two passes (their depth, then their shading) against one: the same picture. */
    passes?: Comparison;
    /** The passes the impostors took (PreviewFrameReport.impostorPasses), asked for two and for one. */
    taken?: [number, number];
}

function compare(mesh: Uint8ClampedArray, impostor: Uint8ClampedArray): Comparison {
    let covered = 0, coverageDiffers = 0, colourDiffers = 0, anyDiffers = 0, sum = 0, both = 0;
    for (let i = 0; i < mesh.length; i += 4) {
        const a = mesh[i] + mesh[i + 1] + mesh[i + 2] > 0, b = impostor[i] + impostor[i + 1] + impostor[i + 2] > 0;
        if (!a && !b) continue;
        covered++;
        if (a !== b) { coverageDiffers++; continue; }
        const d = Math.max(Math.abs(mesh[i] - impostor[i]), Math.abs(mesh[i + 1] - impostor[i + 1]), Math.abs(mesh[i + 2] - impostor[i + 2]));
        sum += d;
        both++;
        if (d > 24) colourDiffers++;
        if (d > 4) anyDiffers++;
    }
    return { covered, coverageDiffers, colourDiffers, anyDiffers, meanDifference: both ? sum / both : 0 };
}

export interface ImpostorsReport {
    shapes: { sphere: string | null; cylinder: string | null; capped: string | null; coot: string | null; notOne: string | null };
    orthographic: Comparison;
    perspective: Comparison;
    cut: Comparison;
    effects: Comparison;
    capped: Comparison;
    /** Coot's own template, running to z = -1, capped and not, placed as Coot places bonds. */
    coot: Comparison;
    cootCapped: Comparison;
    trianglesAsMeshes: number;
    trianglesAsImpostors: number;
    impostorsPlanned: number;
    rendererErrors: string[];
    /**
     * Two passes against one only (Comparison.passes is the rest's): space-filling atoms, overlapping
     * deep, through an opaque plain mesh; behind a see-through one (peeled); side-by-side stereo
     * (drawViews).
     */
    spacefill: Comparison;
    /** Perspective with the near plane right by the eye and the far one far: depth coarse at the molecule. */
    coarse: Comparison;
    peeled: Comparison;
    stereo: Comparison;
    /** Each comparison's two pictures, as PNG data URLs: for looking at, when a check fails. */
    pictures: Record<string, string>;
}

export default defineCase(async (): Promise<ImpostorsReport> => {
    const rendererErrors: string[] = [];
    const renderer = await WebGPUPreviewRenderer.create(document.createElement("canvas"), message => rendererErrors.push(message));
    const saved = impostorSetting.enabled;
    const pictures: Record<string, string> = {};
    const png = (data: Uint8ClampedArray) => {
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH; canvas.height = HEIGHT;
        canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(data), WIDTH, HEIGHT), 0, 0);
        return canvas.toDataURL("image/png");
    };
    const pair = async (buffers: DisplayBuffer[], cam: PreviewCameraSource, name = "") => {
        impostorSetting.enabled = false;
        const mesh = (await renderer.snapshot(buffers, cam, [], WIDTH, HEIGHT)).data;
        impostorSetting.enabled = true;
        impostorSetting.passes = "two";
        const twoShot = await renderer.snapshot(buffers, cam, [], WIDTH, HEIGHT);
        const impostor = twoShot.data;
        impostorSetting.passes = "one";
        const oneShot = await renderer.snapshot(buffers, cam, [], WIDTH, HEIGHT);
        const onePass = oneShot.data;
        impostorSetting.passes = "two";
        impostorSetting.enabled = false;
        if (name && (globalThis as { __impostorPictures?: boolean }).__impostorPictures !== false) {
            pictures[`${name}-mesh`] = png(mesh);
            pictures[`${name}-impostor`] = png(impostor);
            pictures[`${name}-one-pass`] = png(onePass);
        }
        const taken: [number, number] = [twoShot.report.impostorPasses, oneShot.report.impostorPasses];
        return { ...compare(mesh, impostor), passes: { ...compare(onePass, impostor), taken } };
    };
    // The impostors in two passes, then in one.
    const passes = async (buffers: DisplayBuffer[], cam: PreviewCameraSource, name: string) => {
        impostorSetting.enabled = true;
        impostorSetting.passes = "two";
        const twoShot = await renderer.snapshot(buffers, cam, [], WIDTH, HEIGHT);
        const two = twoShot.data;
        impostorSetting.passes = "one";
        const oneShot = await renderer.snapshot(buffers, cam, [], WIDTH, HEIGHT);
        const one = oneShot.data;
        impostorSetting.passes = "two";
        impostorSetting.enabled = false;
        if ((globalThis as { __impostorPictures?: boolean }).__impostorPictures !== false) {
            pictures[`${name}-impostor`] = png(two);
            pictures[`${name}-one-pass`] = png(one);
        }
        const taken: [number, number] = [twoShot.report.impostorPasses, oneShot.report.impostorPasses];
        return { ...compare(one, two), taken };
    };
    const shapeName = (m: Mesh) => {
        const s = impostorShape(new Float32Array(m.positions), new Float32Array(m.normals));
        return s ? JSON.stringify(s) : null;
    };
    try {
        const scene = molecule();
        impostorSetting.enabled = false;
        const asMeshes = planPreview(scene);
        impostorSetting.enabled = true;
        const asImpostors = planPreview(scene);
        impostorSetting.enabled = false;
        // Not a sphere: one vertex pulled out.
        const box = sphereMesh();
        for (let k = 0; k < 3; k++) box.positions[3 * 200 + k] *= 1.5;
        return {
            shapes: {
                sphere: shapeName(sphereMesh()), cylinder: shapeName(cylinderMesh()), capped: shapeName(cylinderMesh(true)),
                coot: shapeName(cylinderMesh(true, true)), notOne: shapeName(box),
            },
            orthographic: await pair(scene, camera(), "orthographic"),
            perspective: await pair(scene, camera({ doPerspectiveProjection: true }), "perspective"),
            // The front plane is 20 A in front of the centre of view: the molecule moved up to it.
            cut: await pair(molecule(19.6), camera({ myQuat: [0, 0, 0, 1] }), "cut"),
            effects: await pair(scene, camera({ doShadow: true, doSSAO: true, ssaoRadius: 2, ssaoBias: 1 } as Partial<PreviewCameraSource>), "effects"),
            capped: await pair(molecule(0, true), camera({ myQuat: [0, 0.38, 0, Math.sqrt(1 - 0.38 * 0.38)] }), "capped"),
            coot: await pair(molecule(0, false, true), camera(), "coot"),
            cootCapped: await pair(molecule(0, true, true), camera({ myQuat: [0, 0.38, 0, Math.sqrt(1 - 0.38 * 0.38)] }), "coot-capped"),
            spacefill: await passes([...molecule(0, false, true, true), square(0)], camera(), "spacefill"),
            coarse: await passes(molecule(0, false, true, true), camera({
                doPerspectiveProjection: true, gl_clipPlane0: [0, 0, -1, 1000], gl_clipPlane1: [0, 0, 1, 5000], gl_fog_end: 5000,
            }), "coarse"),
            peeled: await passes([...molecule(0, false, true, true), square(1.5, 0.5)], camera(), "peeled"),
            stereo: await passes(molecule(0, false, true, true), camera({
                doSideBySideStereo: true, stereoQuats: [[0.2, 0.25, 0, Math.sqrt(1 - 0.1025)], [0.2, 0.35, 0, Math.sqrt(1 - 0.1625)]],
                stereoViewports: [[0, 0, WIDTH / 2, HEIGHT], [WIDTH / 2, 0, WIDTH / 2, HEIGHT]], canvas: { width: WIDTH, height: HEIGHT },
            } as Partial<PreviewCameraSource>), "stereo"),
            trianglesAsMeshes: asMeshes.triangles,
            trianglesAsImpostors: asImpostors.triangles,
            impostorsPlanned: asImpostors.impostors,
            rendererErrors,
            pictures,
        };
    } finally {
        impostorSetting.enabled = saved;
        impostorSetting.passes = "auto";
        renderer.destroy();
    }
});
