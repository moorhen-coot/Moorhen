/**
 * Every shader source file parses, and exports GLSL rather than wreckage.
 *
 * Shader sources are JavaScript template literals, so a backtick anywhere inside one - including
 * inside a comment, where it is the natural way to quote a line of code - closes the string and
 * turns the rest of the file into nonsense. The module then fails to parse at all.
 *
 * That is worth a test because of how quietly it goes wrong. It slipped through `tsc` on both
 * configs and the entire existing suite, because nothing on those paths imports the shader
 * modules: they are pulled in by the renderer, which no unit test constructs. The first sign was
 * the picture being wrong in a browser.
 *
 * Importing each file is most of the test. If it parses, the backtick is not there.
 */
import { describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

const SHADER_DIRS = ["webgl-2", "webgl-1"].map(d =>
    path.join(__dirname, "..", "..", "src", "WebGLgComponents", d));

/** Every shader module, as [directory, filename] pairs. */
const shaderFiles: [string, string][] = SHADER_DIRS
    .filter(dir => fs.existsSync(dir))
    .flatMap(dir => fs.readdirSync(dir)
        .filter(name => name.endsWith(".js") && !name.startsWith("."))
        .map(name => [dir, name] as [string, string]));

describe("shader sources", () => {
    it("finds the shader files at all, so an empty run cannot pass vacuously", () => {
        expect(shaderFiles.length).toBeGreaterThan(20);
    });

    it.each(shaderFiles)("%s/%s parses and exports usable GLSL", async (dir, name) => {
        // The import is the substance: a stray backtick makes this throw.
        const module = await import(path.join(dir, name));

        const sources = Object.entries(module)
            .filter(([, value]) => typeof value === "string") as [string, string][];
        expect(sources.length).toBeGreaterThan(0);

        for (const [exportName, source] of sources) {
            expect(source.length).toBeGreaterThan(50);

            // An unescaped ${...} in a comment would have been interpolated away, usually to
            // "undefined" sitting in the middle of the shader.
            expect(source).not.toMatch(/undefined/);

            // GL ES 3.0 shaders must declare their version first; the WebGL1 ones have no
            // version line at all, so only the webgl-2 directory is held to it. Not the pieces
            // other shaders are put together from (FXAA, *_snippet), which have none of their own.
            if (dir.endsWith("webgl-2") && !exportName.includes("fxaa") && !exportName.endsWith("_snippet")) {
                expect(source.startsWith("#version 300 es")).toBe(true);
            }

            // Balanced braces: a crude check, but it catches a source truncated part way
            // through, which is the other thing a stray delimiter does.
            const opens = source.split("{").length - 1;
            const closes = source.split("}").length - 1;
            expect(opens).toBe(closes);
        }
    });
});

/**
 * Opaque types that a fragment shader must give a precision before using.
 *
 * GLSL ES 3.00 (4.5.4) gives the fragment language default precisions for `int`, `sampler2D` and
 * `samplerCube` only. Every other sampler - shadow samplers, 3D, array, integer - has none, so
 * declaring one without a `precision` line is a compile error rather than a warning:
 *
 *     ERROR: 0:29: 'sampler2DShadow' : No precision specified
 *
 * That is worth a test because of where it surfaces. `tsc` is happy, the whole unit suite is
 * happy - these are template literals, not code - and the first sign is a blank canvas and a
 * stack ending in `attachShader ... parameter 2 is not of type 'WebGLShader'`, which names the
 * wrong file entirely: the shader that failed to compile returned null, and the error is thrown
 * by whichever program happens to attach it next.
 */
const NEEDS_PRECISION = [
    "sampler2DShadow", "samplerCubeShadow", "sampler2DArrayShadow",
    "sampler3D", "sampler2DArray",
    "isampler2D", "isampler3D", "isamplerCube", "isampler2DArray",
    "usampler2D", "usampler3D", "usamplerCube", "usampler2DArray",
];

describe("fragment shaders declaring an opaque type with no default precision", () => {
    it("give it one", () => {
        const offenders: string[] = [];
        for (const [dir, name] of shaderFiles) {
            const source = fs.readFileSync(path.join(dir, name), "utf8");
            // Vertex shaders default float to highp and are not the case this guards.
            if (!/fragment/.test(name)) continue;
            for (const type of NEEDS_PRECISION) {
                const declares = new RegExp(`uniform\\s+${type}\\b`).test(source);
                const qualifies = new RegExp(`precision\\s+\\w+p\\s+${type}\\s*;`).test(source);
                if (declares && !qualifies) offenders.push(`${name}: ${type}`);
            }
        }
        expect(offenders).toEqual([]);
    });
});

/**
 * A varying has to carry the same precision on both sides of a program.
 *
 * GLSL ES requires the vertex shader's `out` and the fragment shader's `in` to agree, and a
 * mismatch is a *link* error rather than a compile one - so it arrives with no file and no line
 * number, just a program that silently fails to link and whatever the first caller of
 * `attachShader` happens to throw afterwards.
 *
 * ShadowCoord is the one that matters here: it carries a depth compared against a 24-bit depth
 * texture, so it is highp. It was lowp - nominally about eight bits - which desktop drivers
 * quietly promote, which is why it looked fine and would not have on hardware that honours the
 * qualifier. Thirteen declarations had to move together.
 */
describe("varyings shared across shader stages", () => {
    it("declare the same precision wherever they appear", () => {
        // Keyed on type as well as name. `mvMatrix` is a mat4 in most shaders and a mat3 in the
        // side-on-view trio - two different varyings that happen to share a name, each
        // self-consistent, and keying on the name alone reports them as a disagreement.
        const byName = new Map<string, Map<string, string[]>>();
        for (const [dir, name] of shaderFiles) {
            if (!dir.endsWith("webgl-2")) continue; // WebGL1 uses `varying` and its own rules.
            const source = fs.readFileSync(path.join(dir, name), "utf8");
            for (const [, , precision, type, varying] of
                 source.matchAll(/\b(in|out)\s+(lowp|mediump|highp)\s+(\w+)\s+(\w+)\s*;/g)) {
                const key = `${type} ${varying}`;
                if (!byName.has(key)) byName.set(key, new Map());
                const seen = byName.get(key);
                if (!seen.has(precision)) seen.set(precision, []);
                seen.get(precision).push(name);
            }
        }
        // One pre-existing exception, recorded rather than hidden. The side-on-view shaders split
        // into two self-consistent groups - triangle-side-on-view is lowp, twodshapes- and
        // perfect-sphere-side-on-view are mediump - so they link today only because those
        // particular vertex and fragment shaders are never paired. That is a standing trap rather
        // than a present bug, and settling it means knowing which pairings are intended, so it is
        // left alone here and this list is the note to self.
        const known = ["mat3 mvMatrix: mediump vs lowp"];

        const disagreements = [...byName.entries()]
            .filter(([, seen]) => seen.size > 1)
            .map(([varying, seen]) => `${varying}: ${[...seen.keys()].join(" vs ")}`)
            .filter(entry => !known.includes(entry));
        expect(disagreements).toEqual([]);
    });
});
