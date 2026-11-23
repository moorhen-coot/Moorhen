import * as vec3 from 'gl-matrix/vec3';
import { NormalizeVec3, vec3Create } from '../mgMaths.js';
import { gaussianBlurs } from '../gaussianBlurs';
import type { MGWebGL } from '../mgWebGL';

/**
 * Uniform-buffer-object (UBO) setup for the WebGL2 post-processing shaders:
 * the separable Gaussian blur passes and SSAO. These build/upload the coeff
 * and kernel UBOs from the shader-program reflection data. Self-contained: they
 * read the shader programs, `gl`, `WEBGL2` and the SSAO kernel/buffer fields off
 * the MGWebGL instance and (for SSAO) call back through `self.lerp`; those
 * fields and the buffers stay on the instance because the draw pipeline reads
 * them. Only the setup logic moves here. `self` is the live MGWebGL instance
 * (type-only import avoids a runtime cycle).
 */

export function makeBlurBuffers(self: MGWebGL, blurSize) {
    if(self.WEBGL2){
        const blockSize = self.gl.getActiveUniformBlockParameter( self.shaderProgramBlurX, self.shaderProgramBlurX.blurCoeffs, self.gl.UNIFORM_BLOCK_DATA_SIZE);
        //console.log("blur blockSize",blockSize);

        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.blurUBOBuffer);
        self.gl.bufferData(self.gl.UNIFORM_BUFFER, blockSize, self.gl.DYNAMIC_DRAW);//????
        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, null);
        self.gl.bindBufferBase(self.gl.UNIFORM_BUFFER, 0, self.blurUBOBuffer);
        const uboVariableNames = ["row0","row1","row2","row3","row4","row5","row6","row7","row8","nsteps"];
        const uboVariableIndices = self.gl.getUniformIndices( self.shaderProgramBlurX, uboVariableNames);
        const uboVariableOffsets = self.gl.getActiveUniforms( self.shaderProgramBlurX, uboVariableIndices, self.gl.UNIFORM_OFFSET);

        const uboVariableInfo = {};

        uboVariableNames.forEach((name, index) => {
            uboVariableInfo[name] = {
                index: uboVariableIndices[index],
                offset: uboVariableOffsets[index],
            };
        });

        self.gl.useProgram(self.shaderProgramSimpleBlurY);
        let index = self.gl.getUniformBlockIndex(self.shaderProgramSimpleBlurY, "coeffBuffer");
        self.gl.uniformBlockBinding(self.shaderProgramSimpleBlurY, index, 0);

        self.gl.useProgram(self.shaderProgramSimpleBlurX);
        index = self.gl.getUniformBlockIndex(self.shaderProgramSimpleBlurX, "coeffBuffer");
        self.gl.uniformBlockBinding(self.shaderProgramSimpleBlurX, index, 0);

        self.gl.useProgram(self.shaderProgramBlurY);
        index = self.gl.getUniformBlockIndex(self.shaderProgramBlurY, "coeffBuffer");
        self.gl.uniformBlockBinding(self.shaderProgramBlurY, index, 0);

        self.gl.useProgram(self.shaderProgramBlurX);
        index = self.gl.getUniformBlockIndex(self.shaderProgramBlurX, "coeffBuffer");
        self.gl.uniformBlockBinding(self.shaderProgramBlurX, index, 0);

        // This might have to be done every frame if we ever have multiple UBOs.
        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.blurUBOBuffer);
        const bigBlurArray = new Array(36).fill(0);
        for(let iblur=0;iblur<gaussianBlurs[blurSize];iblur++){
            bigBlurArray[iblur] = gaussianBlurs[blurSize][iblur];
        }

        const bigFloatArray = new Float32Array(gaussianBlurs[blurSize]);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row0"].offset, bigFloatArray.subarray( 0, 4), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row1"].offset, bigFloatArray.subarray( 4, 8), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row2"].offset, bigFloatArray.subarray( 8,12), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row3"].offset, bigFloatArray.subarray(12,16), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row4"].offset, bigFloatArray.subarray(16,20), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row5"].offset, bigFloatArray.subarray(20,24), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row6"].offset, bigFloatArray.subarray(24,28), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row7"].offset, bigFloatArray.subarray(28,32), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["row8"].offset, bigFloatArray.subarray(32,36), 0);
        self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["nsteps"].offset, new Int32Array([blurSize]), 0);
        self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, null)
    }

}

/** How many points the occlusion hemisphere is sampled at. Matches `samples[32]` in the shader. */
const SSAO_KERNEL_SIZE = 32;

/**
 * The shortest sample, as a fraction of the occlusion radius.
 *
 * Samples much closer in than this say nothing: at a tenth of a 2 angstrom radius they are asking
 * whether something occludes at 0.2 angstroms, which is below the scale of any feature a surface
 * has, and below the depth buffer's own precision.
 */
const SSAO_MIN_SAMPLE = 0.15;

/**
 * How the sample lengths are distributed between SSAO_MIN_SAMPLE and the full radius.
 *
 * An exponent above 1 biases the kernel towards the fragment, so close contact is sampled more
 * densely than the far edge of the hemisphere - which is what you want, because contact shading is
 * the part the eye reads as shape. 1.5 keeps that bias while leaving the median at about 0.45 of
 * the radius.
 */
const SSAO_SAMPLE_BIAS = 1.5;

/**
 * How long the i'th occlusion sample is, as a fraction of the radius the user set.
 *
 * Stratified over the kernel, so the 32 samples cover the radius range evenly instead of clustering
 * wherever the random numbers happen to fall. The half-step keeps the first sample off zero.
 *
 * One length scaling, not two. This used to scale by Math.random() as well as by the stratified
 * term, which compounded: the median sample ended up at 0.12 of the radius and 43% of the kernel
 * sat within 0.1 of it. The slider then could not mean what it said - at the 2.0 angstrom default
 * the typical probe reached 0.24 angstroms, so on anything larger than a small ligand the
 * hemisphere never left the surface it started on, and the whole pass did almost nothing.
 *
 * Pure and exported so the distribution can be asserted on directly; it is the part that was wrong,
 * and it is invisible in any screenshot.
 */
export function ssaoSampleLength(i: number, kernelSize: number = SSAO_KERNEL_SIZE): number {
    const t = (i + 0.5) / kernelSize;
    return SSAO_MIN_SAMPLE + (1.0 - SSAO_MIN_SAMPLE) * Math.pow(t, SSAO_SAMPLE_BIAS);
}

export function initializeSSAOBuffers(self: MGWebGL) {
    self.ssaoKernel = [];
    for (let i = 0; i < SSAO_KERNEL_SIZE; ++i) {

        const sample = vec3Create([Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random()]);

        NormalizeVec3(sample);
        vec3.scale(sample,sample,ssaoSampleLength(i));
        self.ssaoKernel.push(sample[0]);
        self.ssaoKernel.push(sample[1]);
        self.ssaoKernel.push(sample[2]);
        self.ssaoKernel.push(1.0);
    }

    const ssaoNoise = [];
    for (let i = 0; i < 16; i++) {
        ssaoNoise.push(Math.random() * 2.0 - 1.0);
        ssaoNoise.push(Math.random() * 2.0 - 1.0);
        ssaoNoise.push(0.0);
    }

    self.ssaoNoiseTexture = self.gl.createTexture();
    self.gl.bindTexture(self.gl.TEXTURE_2D, self.ssaoNoiseTexture);
    console.log("Do texImage2D for noise");
    self.gl.texImage2D(self.gl.TEXTURE_2D, 0, self.gl.RGB32F, 4, 4, 0, self.gl.RGB, self.gl.FLOAT, new Float32Array(ssaoNoise));
    console.log("Done texImage2D for noise");
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MIN_FILTER, self.gl.NEAREST);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_MAG_FILTER, self.gl.NEAREST);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_S, self.gl.REPEAT);
    self.gl.texParameteri(self.gl.TEXTURE_2D, self.gl.TEXTURE_WRAP_T, self.gl.REPEAT);

    self.gl.useProgram(self.shaderProgramSSAO);
    self.ssaoKernelBuffer = self.gl.createBuffer();
    bindSSAOBuffers(self)
}

export function bindSSAOBuffers(self: MGWebGL) {
    const blockSize = self.gl.getActiveUniformBlockParameter( self.shaderProgramSSAO, self.shaderProgramSSAO.samples, self.gl.UNIFORM_BLOCK_DATA_SIZE);
    self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.ssaoKernelBuffer);
    self.gl.bufferData(self.gl.UNIFORM_BUFFER, blockSize, self.gl.DYNAMIC_DRAW);
    self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, null);
    self.gl.bindBufferBase(self.gl.UNIFORM_BUFFER, 0, self.ssaoKernelBuffer);
    const uboVariableNames = [
    "samples"
    ];
    const uboVariableIndices = self.gl.getUniformIndices( self.shaderProgramSSAO, uboVariableNames);
    const uboVariableOffsets = self.gl.getActiveUniforms( self.shaderProgramSSAO, uboVariableIndices, self.gl.UNIFORM_OFFSET);

    const uboVariableInfo = {};

    uboVariableNames.forEach((name, index) => {
        uboVariableInfo[name] = {
            index: uboVariableIndices[index],
            offset: uboVariableOffsets[index],
        };
    });

    self.gl.useProgram(self.shaderProgramSSAO);
    const index = self.gl.getUniformBlockIndex(self.shaderProgramSSAO, "sampleBuffer");
    self.gl.uniformBlockBinding(self.shaderProgramSSAO, index, 0);

    const bigFloatArray = new Float32Array(self.ssaoKernel);
    self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, self.ssaoKernelBuffer);
    self.gl.bindBufferBase(self.gl.UNIFORM_BUFFER, 0, self.ssaoKernelBuffer);
    self.gl.bufferSubData(self.gl.UNIFORM_BUFFER, uboVariableInfo["samples"].offset,  bigFloatArray.subarray( 0, 128), 0);
    self.gl.bindBuffer(self.gl.UNIFORM_BUFFER, null);

}
