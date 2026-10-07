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
            // version line at all, so only the webgl-2 directory is held to it.
            if (dir.endsWith("webgl-2") && !exportName.includes("fxaa")) {
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
