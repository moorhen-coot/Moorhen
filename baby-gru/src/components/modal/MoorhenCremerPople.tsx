import * as vec3 from 'gl-matrix/vec3';
import * as mat4 from 'gl-matrix/mat4';
import * as quat4 from 'gl-matrix/quat';
import { useEffect, useRef, useCallback, useState } from "react"
import { useDispatch, useSelector, useStore } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { DisplayBuffer } from '../../WebGLgComponents/displayBuffer'
import { buildBuffers, createOtherDataOtherContext } from '../../WebGLgComponents/buildBuffers'
import { quatToMat4, quat4Inverse } from '../../WebGLgComponents/quatToMat4.js';
import { RootState } from '../../store/MoorhenReduxStore';
import { MoorhenStack } from "../interface-base";
import { MoorhenToggle } from "../inputs";
import { getShader, initSideOnShaders, initSideOnShadersInstanced, initSideOnSphereShaders } from '../../WebGLgComponents/mgWebGLShaders'
import { createQuatFromAngle } from '../../WebGLgComponents/quatUtils'
import {
    setDepthBlurDepth,
    setResetClippingFogging,
    setUseOffScreenBuffers,
} from "../../store/sceneSettingsSlice";
import {
    setFogStart,
    setFogEnd,
    setClipStart,
    setClipEnd,
} from "../../store/glRefSlice";
import { triangle_side_on_view_instanced_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-instanced-vertex-shader.js';
import { triangle_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-vertex-shader.js';
import { triangle_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/triangle-side-on-view-fragment-shader.js';
import { twod_side_on_view_vertex_shader_source } from '../../WebGLgComponents/webgl-2/twodshapes-side-on-view-vertex-shader.js';
import { perfect_sphere_side_on_view_fragment_shader_source } from '../../WebGLgComponents/webgl-2/perfect-sphere-side-on-view-fragment-shader.js';

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

interface MGWebGLBuffer {
    itemSize: number;
    numItems: number;
}

interface SideOnProgramSphere extends WebGLProgram {
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
    vertexTextureAttribute: GLint;
    offsetAttribute: GLint;
    sizeAttribute: GLint;
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    mvInvMatrixUniform: WebGLUniformLocation;
}

interface SideOnProgram extends WebGLProgram {
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    screenZ: WebGLUniformLocation;
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
}

interface SideOnProgramInstanced extends WebGLProgram {
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    screenZ: WebGLUniformLocation;
    vertexInstanceOriginAttribute: GLint;
    vertexInstanceSizeAttribute: GLint;
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
    vertexInstanceOrientationAttribute: GLint;
}

const genSphere = (radius) => {

    const X_2_0 = 0.525731112119
    const X_2_1 = 0.000000000000
    const X_2_2 = 0.850650808352
    const X_2_3 = 0.433888564553
    const X_2_4 = 0.259891913008
    const X_2_5 = 0.862668480416
    const X_2_6 = 0.273266528913
    const X_2_7 = 0.961938357784
    const X_2_8 = 0.309016994375
    const X_2_9 = 0.500000000000
    const X_2_10 = 0.809016994375
    const X_2_11 = 0.162459848116
    const X_2_12 = 0.262865556060
    const X_2_13 = 0.951056516295
    const X_2_14 = 1.000000000000
    const X_2_15 = 0.160622035640
    const X_2_16 = 0.702046444776
    const X_2_17 = 0.693780477560
    const X_2_18 = 0.587785252292
    const X_2_19 = 0.425325404176
    const X_2_20 = 0.688190960236

    const icosa_1_col = [
    ]

    const icosa_1_vert = [
      -X_2_0, X_2_2, X_2_1,
      -X_2_3, X_2_5, X_2_4,
      -X_2_6, X_2_7, X_2_1,
      -X_2_8, X_2_10, X_2_9,
      -X_2_11, X_2_13, X_2_12,
      X_2_1, X_2_14, X_2_1,
      X_2_1, X_2_0, X_2_2,
      X_2_15, X_2_17, X_2_16,
      -X_2_15, X_2_17, X_2_16,
      X_2_8, X_2_10, X_2_9,
      X_2_1, X_2_2, X_2_0,
      X_2_0, X_2_2, X_2_1,
      X_2_6, X_2_7, X_2_1,
      X_2_3, X_2_5, X_2_4,
      X_2_11, X_2_13, X_2_12,
      -X_2_17, X_2_16, X_2_15,
      -X_2_10, X_2_9, X_2_8,
      -X_2_18, X_2_20, X_2_19,
      -X_2_2, X_2_1, X_2_0,
      -X_2_16, X_2_15, X_2_17,
      -X_2_5, X_2_4, X_2_3,
      -X_2_9, X_2_8, X_2_10,
      -X_2_20, X_2_19, X_2_18,
      -X_2_4, X_2_3, X_2_5,
      -X_2_19, X_2_18, X_2_20,
      -X_2_16, -X_2_15, X_2_17,
      -X_2_9, -X_2_8, X_2_10,
      -X_2_0, X_2_1, X_2_2,
      X_2_1, -X_2_0, X_2_2,
      X_2_1, -X_2_6, X_2_7,
      -X_2_4, -X_2_3, X_2_5,
      X_2_1, X_2_1, X_2_14,
      -X_2_12, -X_2_11, X_2_13,
      X_2_1, X_2_6, X_2_7,
      -X_2_12, X_2_11, X_2_13,
      X_2_4, X_2_3, X_2_5,
      X_2_12, X_2_11, X_2_13,
      X_2_9, X_2_8, X_2_10,
      X_2_4, -X_2_3, X_2_5,
      X_2_9, -X_2_8, X_2_10,
      X_2_12, -X_2_11, X_2_13,
      X_2_2, X_2_1, X_2_0,
      X_2_16, X_2_15, X_2_17,
      X_2_16, -X_2_15, X_2_17,
      X_2_0, X_2_1, X_2_2,
      X_2_19, X_2_18, X_2_20,
      X_2_5, X_2_4, X_2_3,
      X_2_10, X_2_9, X_2_8,
      X_2_20, X_2_19, X_2_18,
      X_2_17, X_2_16, X_2_15,
      X_2_18, X_2_20, X_2_19,
      X_2_7, X_2_1, X_2_6,
      X_2_14, X_2_1, X_2_1,
      X_2_13, X_2_12, X_2_11,
      X_2_2, X_2_1, -X_2_0,
      X_2_5, X_2_4, -X_2_3,
      X_2_7, X_2_1, -X_2_6,
      X_2_10, X_2_9, -X_2_8,
      X_2_13, X_2_12, -X_2_11,
      X_2_17, X_2_16, -X_2_15,
      X_2_2, X_2_0, X_2_1,
      X_2_5, -X_2_4, X_2_3,
      X_2_10, -X_2_9, X_2_8,
      X_2_13, -X_2_12, X_2_11,
      X_2_0, -X_2_2, X_2_1,
      X_2_17, -X_2_16, -X_2_15,
      X_2_17, -X_2_16, X_2_15,
      X_2_10, -X_2_9, -X_2_8,
      X_2_2, -X_2_0, X_2_1,
      X_2_5, -X_2_4, -X_2_3,
      X_2_13, -X_2_12, -X_2_11,
      X_2_15, -X_2_17, X_2_16,
      X_2_8, -X_2_10, X_2_9,
      X_2_19, -X_2_18, X_2_20,
      X_2_3, -X_2_5, X_2_4,
      X_2_18, -X_2_20, X_2_19,
      X_2_20, -X_2_19, X_2_18,
      -X_2_15, -X_2_17, X_2_16,
      -X_2_8, -X_2_10, X_2_9,
      X_2_1, -X_2_2, X_2_0,
      -X_2_0, -X_2_2, X_2_1,
      -X_2_6, -X_2_7, X_2_1,
      -X_2_3, -X_2_5, X_2_4,
      X_2_1, -X_2_14, X_2_1,
      -X_2_11, -X_2_13, X_2_12,
      X_2_6, -X_2_7, X_2_1,
      X_2_11, -X_2_13, X_2_12,
      -X_2_3, -X_2_5, -X_2_4,
      -X_2_8, -X_2_10, -X_2_9,
      -X_2_11, -X_2_13, -X_2_12,
      X_2_1, -X_2_0, -X_2_2,
      X_2_15, -X_2_17, -X_2_16,
      -X_2_15, -X_2_17, -X_2_16,
      X_2_8, -X_2_10, -X_2_9,
      X_2_1, -X_2_2, -X_2_0,
      X_2_3, -X_2_5, -X_2_4,
      X_2_11, -X_2_13, -X_2_12,
      X_2_4, -X_2_3, -X_2_5,
      X_2_9, -X_2_8, -X_2_10,
      X_2_19, -X_2_18, -X_2_20,
      X_2_16, -X_2_15, -X_2_17,
      X_2_20, -X_2_19, -X_2_18,
      X_2_18, -X_2_20, -X_2_19,
      X_2_1, -X_2_6, -X_2_7,
      X_2_1, X_2_1, -X_2_14,
      X_2_12, -X_2_11, -X_2_13,
      X_2_1, X_2_0, -X_2_2,
      X_2_4, X_2_3, -X_2_5,
      X_2_1, X_2_6, -X_2_7,
      X_2_9, X_2_8, -X_2_10,
      X_2_12, X_2_11, -X_2_13,
      X_2_16, X_2_15, -X_2_17,
      X_2_0, X_2_1, -X_2_2,
      -X_2_4, -X_2_3, -X_2_5,
      -X_2_9, -X_2_8, -X_2_10,
      -X_2_12, -X_2_11, -X_2_13,
      -X_2_2, X_2_1, -X_2_0,
      -X_2_16, X_2_15, -X_2_17,
      -X_2_16, -X_2_15, -X_2_17,
      -X_2_9, X_2_8, -X_2_10,
      -X_2_0, X_2_1, -X_2_2,
      -X_2_4, X_2_3, -X_2_5,
      -X_2_12, X_2_11, -X_2_13,
      -X_2_5, X_2_4, -X_2_3,
      -X_2_10, X_2_9, -X_2_8,
      -X_2_20, X_2_19, -X_2_18,
      -X_2_3, X_2_5, -X_2_4,
      -X_2_17, X_2_16, -X_2_15,
      -X_2_8, X_2_10, -X_2_9,
      -X_2_18, X_2_20, -X_2_19,
      -X_2_15, X_2_17, -X_2_16,
      -X_2_19, X_2_18, -X_2_20,
      -X_2_11, X_2_13, -X_2_12,
      X_2_3, X_2_5, -X_2_4,
      X_2_8, X_2_10, -X_2_9,
      X_2_11, X_2_13, -X_2_12,
      X_2_15, X_2_17, -X_2_16,
      X_2_1, X_2_2, -X_2_0,
      X_2_19, X_2_18, -X_2_20,
      X_2_18, X_2_20, -X_2_19,
      X_2_20, X_2_19, -X_2_18,
      -X_2_7, X_2_1, X_2_6,
      -X_2_13, X_2_12, X_2_11,
      -X_2_14, X_2_1, X_2_1,
      -X_2_2, X_2_0, X_2_1,
      -X_2_7, X_2_1, -X_2_6,
      -X_2_13, X_2_12, -X_2_11,
      -X_2_5, -X_2_4, X_2_3,
      -X_2_13, -X_2_12, X_2_11,
      -X_2_10, -X_2_9, X_2_8,
      -X_2_5, -X_2_4, -X_2_3,
      -X_2_10, -X_2_9, -X_2_8,
      -X_2_13, -X_2_12, -X_2_11,
      -X_2_17, -X_2_16, X_2_15,
      -X_2_17, -X_2_16, -X_2_15,
      -X_2_2, -X_2_0, X_2_1,
      -X_2_20, -X_2_19, X_2_18,
      -X_2_18, -X_2_20, X_2_19,
      -X_2_19, -X_2_18, X_2_20,
      -X_2_19, -X_2_18, -X_2_20,
      -X_2_18, -X_2_20, -X_2_19,
      -X_2_20, -X_2_19, -X_2_18
    ]

    const icosa_1_idxs = [
      0, 1, 2,
      3, 4, 1,
      5, 2, 4,
      1, 4, 2,
      6, 7, 8,
      9, 10, 7,
      3, 8, 10,
      7, 10, 8,
      11, 12, 13,
      5, 14, 12,
      9, 13, 14,
      12, 14, 13,
      3, 10, 4,
      9, 14, 10,
      5, 4, 14,
      10, 14, 4,
      0, 15, 1,
      16, 17, 15,
      3, 1, 17,
      15, 17, 1,
      18, 19, 20,
      21, 22, 19,
      16, 20, 22,
      19, 22, 20,
      6, 8, 23,
      3, 24, 8,
      21, 23, 24,
      8, 24, 23,
      16, 22, 17,
      21, 24, 22,
      3, 17, 24,
      22, 24, 17,
      18, 25, 19,
      26, 27, 25,
      21, 19, 27,
      25, 27, 19,
      28, 29, 30,
      31, 32, 29,
      26, 30, 32,
      29, 32, 30,
      6, 23, 33,
      21, 34, 23,
      31, 33, 34,
      23, 34, 33,
      26, 32, 27,
      31, 34, 32,
      21, 27, 34,
      32, 34, 27,
      6, 33, 35,
      31, 36, 33,
      37, 35, 36,
      33, 36, 35,
      28, 38, 29,
      39, 40, 38,
      31, 29, 40,
      38, 40, 29,
      41, 42, 43,
      37, 44, 42,
      39, 43, 44,
      42, 44, 43,
      31, 40, 36,
      39, 44, 40,
      37, 36, 44,
      40, 44, 36,
      6, 35, 7,
      37, 45, 35,
      9, 7, 45,
      35, 45, 7,
      41, 46, 42,
      47, 48, 46,
      37, 42, 48,
      46, 48, 42,
      11, 13, 49,
      9, 50, 13,
      47, 49, 50,
      13, 50, 49,
      37, 48, 45,
      47, 50, 48,
      9, 45, 50,
      48, 50, 45,
      41, 51, 46,
      52, 53, 51,
      47, 46, 53,
      51, 53, 46,
      54, 55, 56,
      57, 58, 55,
      52, 56, 58,
      55, 58, 56,
      11, 49, 59,
      47, 60, 49,
      57, 59, 60,
      49, 60, 59,
      52, 58, 53,
      57, 60, 58,
      47, 53, 60,
      58, 60, 53,
      41, 61, 51,
      62, 63, 61,
      52, 51, 63,
      61, 63, 51,
      64, 65, 66,
      67, 68, 65,
      62, 66, 68,
      65, 68, 66,
      54, 56, 69,
      52, 70, 56,
      67, 69, 70,
      56, 70, 69,
      62, 68, 63,
      67, 70, 68,
      52, 63, 70,
      68, 70, 63,
      28, 71, 38,
      72, 73, 71,
      39, 38, 73,
      71, 73, 38,
      64, 66, 74,
      62, 75, 66,
      72, 74, 75,
      66, 75, 74,
      41, 43, 61,
      39, 76, 43,
      62, 61, 76,
      43, 76, 61,
      72, 75, 73,
      62, 76, 75,
      39, 73, 76,
      75, 76, 73,
      28, 77, 71,
      78, 79, 77,
      72, 71, 79,
      77, 79, 71,
      80, 81, 82,
      83, 84, 81,
      78, 82, 84,
      81, 84, 82,
      64, 74, 85,
      72, 86, 74,
      83, 85, 86,
      74, 86, 85,
      78, 84, 79,
      83, 86, 84,
      72, 79, 86,
      84, 86, 79,
      80, 87, 81,
      88, 89, 87,
      83, 81, 89,
      87, 89, 81,
      90, 91, 92,
      93, 94, 91,
      88, 92, 94,
      91, 94, 92,
      64, 85, 95,
      83, 96, 85,
      93, 95, 96,
      85, 96, 95,
      88, 94, 89,
      93, 96, 94,
      83, 89, 96,
      94, 96, 89,
      90, 97, 91,
      98, 99, 97,
      93, 91, 99,
      97, 99, 91,
      54, 69, 100,
      67, 101, 69,
      98, 100, 101,
      69, 101, 100,
      64, 95, 65,
      93, 102, 95,
      67, 65, 102,
      95, 102, 65,
      98, 101, 99,
      67, 102, 101,
      93, 99, 102,
      101, 102, 99,
      90, 103, 97,
      104, 105, 103,
      98, 97, 105,
      103, 105, 97,
      106, 107, 108,
      109, 110, 107,
      104, 108, 110,
      107, 110, 108,
      54, 100, 111,
      98, 112, 100,
      109, 111, 112,
      100, 112, 111,
      104, 110, 105,
      109, 112, 110,
      98, 105, 112,
      110, 112, 105,
      90, 113, 103,
      114, 115, 113,
      104, 103, 115,
      113, 115, 103,
      116, 117, 118,
      119, 120, 117,
      114, 118, 120,
      117, 120, 118,
      106, 108, 121,
      104, 122, 108,
      119, 121, 122,
      108, 122, 121,
      114, 120, 115,
      119, 122, 120,
      104, 115, 122,
      120, 122, 115,
      116, 123, 117,
      124, 125, 123,
      119, 117, 125,
      123, 125, 117,
      0, 126, 127,
      128, 129, 126,
      124, 127, 129,
      126, 129, 127,
      106, 121, 130,
      119, 131, 121,
      128, 130, 131,
      121, 131, 130,
      124, 129, 125,
      128, 131, 129,
      119, 125, 131,
      129, 131, 125,
      0, 2, 126,
      5, 132, 2,
      128, 126, 132,
      2, 132, 126,
      11, 133, 12,
      134, 135, 133,
      5, 12, 135,
      133, 135, 12,
      106, 130, 136,
      128, 137, 130,
      134, 136, 137,
      130, 137, 136,
      5, 135, 132,
      134, 137, 135,
      128, 132, 137,
      135, 137, 132,
      106, 136, 107,
      134, 138, 136,
      109, 107, 138,
      136, 138, 107,
      11, 59, 133,
      57, 139, 59,
      134, 133, 139,
      59, 139, 133,
      54, 111, 55,
      109, 140, 111,
      57, 55, 140,
      111, 140, 55,
      134, 139, 138,
      57, 140, 139,
      109, 138, 140,
      139, 140, 138,
      18, 20, 141,
      16, 142, 20,
      143, 141, 142,
      20, 142, 141,
      0, 127, 15,
      124, 144, 127,
      16, 15, 144,
      127, 144, 15,
      116, 145, 123,
      143, 146, 145,
      124, 123, 146,
      145, 146, 123,
      16, 144, 142,
      124, 146, 144,
      143, 142, 146,
      144, 146, 142,
      18, 141, 147,
      143, 148, 141,
      149, 147, 148,
      141, 148, 147,
      116, 150, 145,
      151, 152, 150,
      143, 145, 152,
      150, 152, 145,
      80, 153, 154,
      149, 155, 153,
      151, 154, 155,
      153, 155, 154,
      143, 152, 148,
      151, 155, 152,
      149, 148, 155,
      152, 155, 148,
      18, 147, 25,
      149, 156, 147,
      26, 25, 156,
      147, 156, 25,
      80, 82, 153,
      78, 157, 82,
      149, 153, 157,
      82, 157, 153,
      28, 30, 77,
      26, 158, 30,
      78, 77, 158,
      30, 158, 77,
      149, 157, 156,
      78, 158, 157,
      26, 156, 158,
      157, 158, 156,
      90, 92, 113,
      88, 159, 92,
      114, 113, 159,
      92, 159, 113,
      80, 154, 87,
      151, 160, 154,
      88, 87, 160,
      154, 160, 87,
      116, 118, 150,
      114, 161, 118,
      151, 150, 161,
      118, 161, 150,
      88, 160, 159,
      151, 161, 160,
      114, 159, 161,
      160, 161, 159
    ]

    const sphere_pos = []

    icosa_1_vert.forEach(p => {
        sphere_pos.push(p * radius)
    })

    for(let icol=0; icol<icosa_1_vert.length/3; icol++){
        const r = Math.random()
        const g = Math.random()
        const b = Math.random()
        icosa_1_col.push(r)
        icosa_1_col.push(g)
        icosa_1_col.push(b)
        icosa_1_col.push(1.0)
    }

    const sphere_json = {
        prim_types: [["TRIANGLES"]],
        useIndices: [[true]],
        idx_tri: [[icosa_1_idxs]],
        vert_tri: [[sphere_pos]],
        norm_tri: [[icosa_1_vert]],
        col_tri: [[icosa_1_col]]
    }

    console.log(sphere_json)

    return sphere_json
}

export const MoorhenCremerPople = (props: { stackDirection: "horizontal" | "vertical", width?: number }) => {

    const store = useStore<RootState>()
    const dispatch = useDispatch();
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging);
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers);

    const gl_fog_start = useSelector((state: moorhen.State) => state.glRef.fogStart);
    const gl_fog_end = useSelector((state: moorhen.State) => state.glRef.fogEnd);
    const clipStart = useSelector((state: moorhen.State) => state.glRef.clipStart);
    const clipEnd = useSelector((state: moorhen.State) => state.glRef.clipEnd);

    const [useFog, setUseFog] = useState<boolean>(true);
    const [useClip, setUseClip] = useState<boolean>(true);
    const [backupFogNear, setBackupFogNear] = useState<number>(500.0);
    const [backupFogFar, setBackupFogFar] = useState<number>(500.0);
    const [backupClipNear, setBackupClipNear] = useState<number>(500.0);
    const [backupClipFar, setBackupClipFar] = useState<number>(500.0);

    const fogOffNear = 998.0
    const fogOffFar = 999.0

    const blurLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Depth blur</span>
             <span style={{color: "lightblue", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const clipLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Clip</span>
             <span style={{color: "red", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const fogLabel = <>
             <span style={{display: "inline-block", width:"100px"}}>Fog</span>
             <span style={{color: "yellow", backgroundColor:"#aaaaaa"}}><b>&#x2E3B;</b></span>
         </>

    const plotWidth = props.width ? props.width : 500
    const plotHeight = plotWidth
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRefWebGL = useRef<HTMLCanvasElement>(null)

    const initQuat = quat4.create();//useSelector((state: moorhen.State) => state.glRef.quat)

    const programRef = useRef<null | SideOnProgram>(null);
    const programInstancedRef = useRef<null | SideOnProgramInstanced>(null);
    const sphereProgramRef = useRef<null | SideOnProgramSphere>(null);

    const displayBuffers = store.getState().glRef.displayBuffers
    const storeMolecules = store.getState().molecules.moleculeList
    const originState =  store.getState().glRef.origin

    const [quat, setQuat] = useState<quat4>(initQuat)
    const [zoom, setZoom] = useState<number>(1.0)
    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)
    const [oldXY, setOldXY] = useState<[number,number]>([-1,-1])
    const [moveDist, setMoveDist] = useState<number>(-1)

    const [myBuffers, setMyBuffers] = useState<DisplayBuffer[]>([])

    useEffect(() => {

        if(!canvasRefWebGL)
            return

        if(!canvasRefWebGL.current)
            return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")

        const theBuffers = createOtherDataOtherContext(genSphere(1),gl)
        buildBuffers(theBuffers,store,gl)
        setMyBuffers(theBuffers)

    }, [storeMolecules])

    const drawGL = async (width,height) => {

        if(!canvasRefWebGL)
            return

        if(!canvasRefWebGL.current)
            return

        if(!programInstancedRef.current)
            return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")

        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.5,0.5,0.5,1.0);
        gl.viewport(0, 0, width, height);
        const screenZ = vec3.create();
        vec3.set(screenZ,0,0,1)
        const pMatrix = mat4.create();
        mat4.ortho(pMatrix, -window.devicePixelRatio*zoom, window.devicePixelRatio*zoom, -window.devicePixelRatio*zoom * height/width, window.devicePixelRatio*zoom * height/width, -100.0, 100.0);

        const theMatrix = quatToMat4(quat);

        const mvMatrix = mat4.create();
        mat4.set(mvMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        )
        mat4.multiply(mvMatrix, mvMatrix, theMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// useProgram is not a React hook.
// eslint-disable-next-line
        gl.useProgram(programRef.current);

        gl.uniform3fv(programRef.current.screenZ, screenZ);
        gl.uniformMatrix4fv(programRef.current.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(programRef.current.mvMatrixUniform, false, mvMatrix);

        for(let i = 0; i<16; i++)
            gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(programRef.current.vertexColourAttribute);
        gl.enableVertexAttribArray(programRef.current.vertexPositionAttribute);
        gl.enableVertexAttribArray(programRef.current.vertexNormalAttribute);

        for (const buffer of myBuffers) {
            if(buffer.visible)
            if(!buffer.triangleInstanceOriginBuffer||buffer.triangleInstanceOriginBuffer.length===0){
                for (let j = 0; j < buffer.triangleVertexPositionBuffer.length; j++) {
                    if(buffer.bufferTypes[j]&&buffer.bufferTypes[j]==="TRIANGLES"&&buffer.triangleVertexPositionBuffer[j].numItems>0){
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleColourBuffer[j]);
                        gl.vertexAttribPointer(programRef.current.vertexColourAttribute, buffer.triangleColourBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[j]);
                        gl.vertexAttribPointer(programRef.current.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[j]);
                        gl.vertexAttribPointer(programRef.current.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[j].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[j]);
                        gl.drawElements(gl.TRIANGLES, buffer.triangleVertexIndexBuffer[j].numItems, gl.UNSIGNED_INT, 0);
                    }
                }
            }
        }
    }

    const plotTheData = async () => {

        if(!canvasRef)
            return

        if(!canvasRef.current)
            return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        drawGL(canvas.width,canvas.height)

    }

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

    const handleMouseDown = (evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        setOldXY([x,y])
        setMoveDist(0)

        setMouseHeldDown(true)

    }

    const handleMouseMove = (evt) => {

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)

        if(mouseHeldDown){
            if(!evt.altKey){
                const rot_x_axis = vec3.create()
                const rot_y_axis = vec3.create()
                vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
                vec3.set(rot_y_axis, 0.0, 1.0, 0.0);
                const xQ = createQuatFromAngle(oldXY[1]-y,rot_x_axis);
                const yQ = createQuatFromAngle(oldXY[0]-x,rot_y_axis);
                quat4.multiply(xQ, xQ, yQ);
                const newQuat = quat4.create();
                quat4.multiply(newQuat, quat, xQ);
                setQuat(newQuat)
            } else {
                const factor = 1.0 + (oldXY[1]-y) / 50.0;
                let newZoom = zoom * factor;
                if (newZoom < 0.1) {
                    newZoom = 0.1;
                }
                if (newZoom > 5.0) {
                    newZoom = 5.0;
                }
                setZoom(newZoom)
            }
            const newDist = moveDist + Math.abs(oldXY[0]-y) + Math.abs(oldXY[1]-y)
            setMoveDist(newDist)
        }
        setOldXY([x,y])
    }

    const handleMouseUp =(evt) => {

        setMouseHeldDown(false)

        if(!canvasRef||!canvasRef.current) return

        const [x,y] = getXY(evt)
        if(moveDist<4){
            let p_x = 2.0*zoom*(x/plotWidth-0.5)
            let p_y = 2.0*zoom*(y/plotHeight-0.5)
            if(1.0 - p_x*p_x - p_y*p_y>0.0){
                const p_z = Math.sqrt(1.0 - p_x*p_x - p_y*p_y)
                const invQuat = quat4.create()
                quat4Inverse(quat,invQuat)
                const invMat = quatToMat4(invQuat)
                const p = vec3.create();
                vec3.set(p, p_x, -p_y, p_z);
                vec3.transformMat4(p, p, invMat);
                console.log(p[0],p[1],p[2])
            }
        }

    }

    useEffect(() => {

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

    }, [canvasRef, handleMouseMove,handleMouseUp,handleMouseDown])

    useEffect(() => {

        if(!canvasRefWebGL) return
        if(!canvasRefWebGL.current) return

        const canvasWebGL = canvasRefWebGL.current
        const gl = canvasWebGL.getContext("webgl2")
        const vertexShaderInstanced = getShader(gl, triangle_side_on_view_instanced_vertex_shader_source, "vertex");
        const fragmentShader = getShader(gl, triangle_side_on_view_fragment_shader_source, "fragment");
        programInstancedRef.current = initSideOnShadersInstanced(vertexShaderInstanced,fragmentShader,gl)
        const vertexShader = getShader(gl, triangle_side_on_view_vertex_shader_source, "vertex");
        programRef.current = initSideOnShaders(vertexShader,fragmentShader,gl)
        const sphereVertexShader = getShader(gl, twod_side_on_view_vertex_shader_source, "vertex");
        const sphereFragmentShader = getShader(gl, perfect_sphere_side_on_view_fragment_shader_source, "fragment");
        sphereProgramRef.current = initSideOnSphereShaders(sphereVertexShader,sphereFragmentShader,gl)

        const theBuffers = createOtherDataOtherContext(genSphere(1),gl)
        buildBuffers(theBuffers,store,gl)
        setMyBuffers(theBuffers)

    }, [])

    useEffect(() => {
        plotTheData()
    }, [canvasRef.current,quat,storeMolecules,displayBuffers,zoom])

    return (
        <>
        <MoorhenStack direction={props.stackDirection} card={true}>
            <span style={{ height: "2rem", margin: "0.2rem" }}>Cremer-Pople analysis</span>
            <MoorhenStack gap={1} direction="vertical">
                <div>
                <figure style={{position: "relative", top: 0, left: 0, width: `${plotWidth}px`, height: `${plotHeight}px`, margin: "0px"}}>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRefWebGL}></canvas>
                <canvas style={{position: "absolute", top: 0, left: 0}} height={plotHeight} width={plotWidth} ref={canvasRef}></canvas>
                </figure>
                </div>
            </MoorhenStack>
        </MoorhenStack>
        </>
    );
};
