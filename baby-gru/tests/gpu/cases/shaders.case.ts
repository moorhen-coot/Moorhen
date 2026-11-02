/**
 * Every WGSL module Moorhen has, compiled by this browser's compiler (Chrome's Tint, Firefox's
 * naga, Safari's), with the compiler's messages. A module that compiles in one browser can fail
 * in another, so this is worth running in each.
 *
 * Add new shader modules to SOURCES: any exported string whose name ends in _WGSL is picked up.
 */
import * as preview from "../../../src/WebGPUComponents/previewShaders";
import * as mapContour from "../../../src/WebGPUComponents/mapContour/mapContourShaders";
import * as metaballs from "../../../src/WebGPUComponents/metaballs/metaballsShaders";
import * as scan from "../../../src/WebGPUComponents/gpu/gpuScan";
import * as surfaceTextures from "../../../src/WebGPUComponents/surfaceTextures";
import * as effectPasses from "../../../src/WebGPUComponents/effectPasses";
import * as depthPeel from "../../../src/WebGPUComponents/depthPeel";
import * as depthBlur from "../../../src/WebGPUComponents/depthBlur";
import * as anaglyphCombine from "../../../src/WebGPUComponents/anaglyphCombine";
import { defineCase } from "../helpers/browserCase";

const SOURCES: Record<string, Record<string, unknown>> = { preview, mapContour, metaballs, scan, surfaceTextures, effectPasses, depthPeel, depthBlur, anaglyphCombine };

export interface ShaderReport {
    name: string;
    errors: string[];
    warnings: string[];
}

export default defineCase(async (device: GPUDevice): Promise<ShaderReport[]> => {
    const reports: ShaderReport[] = [];
    for (const [group, module] of Object.entries(SOURCES)) {
        for (const [name, code] of Object.entries(module)) {
            if (!name.endsWith("_WGSL") || typeof code !== "string") continue;
            device.pushErrorScope("validation");
            const shader = device.createShaderModule({ label: `${group}.${name}`, code });
            const info = await shader.getCompilationInfo();
            const scoped = await device.popErrorScope();
            const text = (m: GPUCompilationMessage) => `${m.lineNum}:${m.linePos} ${m.message}`;
            const errors = info.messages.filter(m => m.type === "error").map(text);
            if (scoped && errors.length === 0) errors.push(scoped.message);
            reports.push({ name: `${group}.${name}`, errors, warnings: info.messages.filter(m => m.type === "warning").map(text) });
        }
    }
    return reports;
});
