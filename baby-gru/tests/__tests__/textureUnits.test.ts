/**
 * Nobody else may use the shadow map's texture unit.
 *
 * A sampler uniform that is never assigned reads as unit 0, and two samplers of different types
 * sharing one unit - a `sampler2D` and the shadow map's `sampler2DShadow` - fail draw-time
 * validation outright. Every draw in the frame is then discarded and the canvas goes empty, with
 * nothing in the picture to say which unit was at fault.
 *
 * It has happened twice. First by omission: ShadowMap was only assigned a unit inside
 * `if(self.doShadow)`, so with shadows off it defaulted to 0 and nothing drew at all. Then by
 * collision: it was given unit 5, which the depth peel pass reads the opaque layer's depth from -
 * so solid geometry vanished the moment anything was given an opacity below 1, and was perfectly
 * fine the rest of the time. Neither failure looks like a texture bug from the outside.
 *
 * A source scan rather than a render test because the failure is in how the units are *allocated*,
 * which is a property of the file and not of any one frame. It reads drawCore the way a person
 * checking for a clash would: find every unit the renderer names, and make sure the shadow map's
 * is not among them.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

const source = readFileSync(
    join(__dirname, "../../src/WebGLgComponents/mgWebGLParts/drawCore.ts"), "utf8");

/**
 * Every `const NAME = <number>` in the file, following one name to another.
 *
 * The aliasing matters: the units are declared once at the top and taken up by local names at
 * the point of use (`const opaqueDepthUnit = OPAQUE_DEPTH_TEXTURE_UNIT`), so a scan that only
 * understands digits sees no clash where the whole clash is.
 */
function constants(): Map<string, number> {
    const named = new Map<string, number | string>();
    for (const [, name, value] of source.matchAll(
        /const\s+([A-Za-z_$][\w$]*)\s*=\s*(\d+|[A-Za-z_$][\w$]*)\s*;/g)) {
        named.set(name, /^\d+$/.test(value) ? Number(value) : value);
    }

    const resolved = new Map<string, number>();
    for (const [name] of named) {
        let value = named.get(name);
        for (let hops = 0; typeof value === "string" && hops < 8; hops++) value = named.get(value);
        if (typeof value === "number") resolved.set(name, value);
    }
    return resolved;
}

const declaredUnit = (name: string): number => {
    const unit = constants().get(name);
    if (unit === undefined) throw new Error(`${name} is not a numeric constant in drawCore.ts`);
    return unit;
};

/**
 * Every texture unit the file names, with how it was written.
 *
 * Three forms reach a unit: `gl.TEXTURE4` for a fixed one, `gl.TEXTURE0 + something` for a
 * computed one, and `uniform1i(shader.someSampler, n)` for telling a shader where to look.
 */
function unitsNamed(): { unit: number; how: string }[] {
    const known = constants();
    const found: { unit: number; how: string }[] = [];
    const take = (value: string, how: string) => {
        const unit = /^\d+$/.test(value) ? Number(value) : known.get(value);
        if (unit !== undefined) found.push({ unit, how });
    };

    for (const [whole, digits] of source.matchAll(/TEXTURE([0-9]+)\b/g)) take(digits, whole);
    for (const [whole, addend] of source.matchAll(/TEXTURE0\s*\+\s*([A-Za-z_$][\w$]*)/g)) {
        take(addend, `${whole} (= ${known.get(addend)})`);
    }
    for (const [whole, argument] of source.matchAll(
        /uniform1i\(\s*\w+\.\w*(?:[Ss]ampler|[Tt]exture)\w*\s*,\s*(\d+|[A-Za-z_$][\w$]*)\s*\)/g)) {
        take(argument, whole.replace(/\s+/g, " "));
    }

    return found;
}

describe("texture unit allocation in drawCore", () => {
    it("gives the shadow map a unit nothing else names", () => {
        const shadowUnit = declaredUnit("SHADOW_TEXTURE_UNIT");

        const clashes = unitsNamed().filter(
            ({ unit, how }) => unit === shadowUnit && !how.includes("SHADOW_TEXTURE_UNIT"));

        expect(clashes).toEqual([]);
    });

    it("does not leave the shadow map on unit 0, where everything else lives", () => {
        // Unit 0 is bound and rebound twenty-odd times a frame. A shadow sampler parked there is
        // the omission case, and it empties the canvas whenever shadows are switched off.
        expect(declaredUnit("SHADOW_TEXTURE_UNIT")).not.toBe(0);
    });

    it("keeps the two peel units apart from each other", () => {
        expect(declaredUnit("DEPTH_PEEL_TEXTURE_UNIT"))
            .not.toBe(declaredUnit("OPAQUE_DEPTH_TEXTURE_UNIT"));
    });

    it("stays inside the units a fragment shader is guaranteed to have", () => {
        // WebGL2 guarantees MAX_TEXTURE_IMAGE_UNITS >= 16. Anything at or above that is a unit
        // some real hardware does not have.
        for (const name of
            ["SHADOW_TEXTURE_UNIT", "DEPTH_PEEL_TEXTURE_UNIT", "OPAQUE_DEPTH_TEXTURE_UNIT"]) {
            expect(declaredUnit(name)).toBeLessThan(16);
        }
    });
});
