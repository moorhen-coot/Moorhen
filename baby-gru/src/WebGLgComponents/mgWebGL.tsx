import React from 'react';

import { moorhen } from "../types/moorhen";
import { webGL } from "../types/mgWebGL";

import pako from 'pako';
import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
import * as mat3 from 'gl-matrix/mat3';
//import {vec3,mat4,mat3} from 'gl-matrix/esm';
//import {quat as quat4} from 'gl-matrix/esm';
import { base64decode } from './mgBase64.js';
import  { unProject } from './GLU.js';

//WebGL2 shaders
import { blur_vertex_shader_source as blur_vertex_shader_source_webgl2 } from './webgl-2/blur-vertex-shader.js';
import { overlay_fragment_shader_source as overlay_fragment_shader_source_webgl2 } from './webgl-2/overlay-fragment-shader.js';
import { blur_x_fragment_shader_source as blur_x_fragment_shader_source_webgl2 } from './webgl-2/blur_x-fragment-shader.js';
import { blur_y_fragment_shader_source as blur_y_fragment_shader_source_webgl2 } from './webgl-2/blur_y-fragment-shader.js';
import { lines_fragment_shader_source as lines_fragment_shader_source_webgl2 } from './webgl-2/lines-fragment-shader.js';
import { text_instanced_vertex_shader_source as text_instanced_vertex_shader_source_webgl2 } from './webgl-2/text-vertex-shader.js';
import { lines_vertex_shader_source as lines_vertex_shader_source_webgl2 } from './webgl-2/lines-vertex-shader.js';
import { perfect_sphere_fragment_shader_source as perfect_sphere_fragment_shader_source_webgl2 } from './webgl-2/perfect-sphere-fragment-shader.js';
import { perfect_sphere_outline_fragment_shader_source as perfect_sphere_outline_fragment_shader_source_webgl2 } from './webgl-2/perfect-sphere-outline-fragment-shader.js';
import { pointspheres_fragment_shader_source as pointspheres_fragment_shader_source_webgl2 } from './webgl-2/pointspheres-fragment-shader.js';
import { pointspheres_vertex_shader_source as pointspheres_vertex_shader_source_webgl2 } from './webgl-2/pointspheres-vertex-shader.js';
import { render_framebuffer_fragment_shader_source as render_framebuffer_fragment_shader_source_webgl2 } from './webgl-2/render-framebuffer-fragment-shader.js';

import { shadow_depth_twod_vertex_shader_source as shadow_depth_twod_vertex_shader_source_webgl2 } from './webgl-2/shadow-depth-twodshapes-vertex-shader.js';
import { shadow_depth_perfect_sphere_fragment_shader_source as shadow_depth_perfect_sphere_fragment_shader_source_webgl2 } from './webgl-2/shadow-depth-perfect-sphere-fragment-shader.js';
import { shadow_fragment_shader_source as shadow_fragment_shader_source_webgl2 } from './webgl-2/shadow-depth-fragment-shader.js';
import { flat_colour_fragment_shader_source as flat_colour_fragment_shader_source_webgl2 } from './webgl-2/flat-colour-fragment-shader.js';
import { shadow_vertex_shader_source as shadow_vertex_shader_source_webgl2 } from './webgl-2/shadow-depth-vertex-shader.js';
import { shadow_instanced_vertex_shader_source as shadow_instanced_vertex_shader_source_webgl2 } from './webgl-2/shadow-depth-instanced-vertex-shader.js';

import { text_fragment_shader_source as text_fragment_shader_source_webgl2 } from './webgl-2/text-fragment-shader.js';
import { circles_fragment_shader_source as circles_fragment_shader_source_webgl2 } from './webgl-2/circle-fragment-shader.js';
import { circles_vertex_shader_source as circles_vertex_shader_source_webgl2 } from './webgl-2/circle-vertex-shader.js';
import { thick_lines_vertex_shader_source as thick_lines_vertex_shader_source_webgl2 } from './webgl-2/thick-lines-vertex-shader.js';
import { thick_lines_normal_vertex_shader_source as thick_lines_normal_vertex_shader_source_webgl2 } from './webgl-2/thick-lines-normal-vertex-shader.js';
import { triangle_fragment_shader_source as triangle_fragment_shader_source_webgl2 } from './webgl-2/triangle-fragment-shader.js';
import { triangle_vertex_shader_source as triangle_vertex_shader_source_webgl2 } from './webgl-2/triangle-vertex-shader.js';
import { twod_fragment_shader_source as twod_fragment_shader_source_webgl2 } from './webgl-2/twodshapes-fragment-shader.js';
import { twod_vertex_shader_source as twod_vertex_shader_source_webgl2 } from './webgl-2/twodshapes-vertex-shader.js';
import { triangle_instanced_vertex_shader_source as triangle_instanced_vertex_shader_source_webgl2 } from './webgl-2/triangle-instanced-vertex-shader.js';

//WebGL1 shaders
import { blur_vertex_shader_source as blur_vertex_shader_source_webgl1 } from './webgl-1/blur-vertex-shader.js';
import { overlay_fragment_shader_source as overlay_fragment_shader_source_webgl1 } from './webgl-1/overlay-fragment-shader.js';
import { blur_x_fragment_shader_source as blur_x_fragment_shader_source_webgl1 } from './webgl-1/blur_x-fragment-shader.js';
import { blur_y_fragment_shader_source as blur_y_fragment_shader_source_webgl1 } from './webgl-1/blur_y-fragment-shader.js';
import { lines_fragment_shader_source as lines_fragment_shader_source_webgl1 } from './webgl-1/lines-fragment-shader.js';
import { text_instanced_vertex_shader_source as text_instanced_vertex_shader_source_webgl1 } from './webgl-1/text-vertex-shader.js';
import { lines_vertex_shader_source as lines_vertex_shader_source_webgl1 } from './webgl-1/lines-vertex-shader.js';
import { perfect_sphere_fragment_shader_source as perfect_sphere_fragment_shader_source_webgl1 } from './webgl-1/perfect-sphere-fragment-shader.js';
import { perfect_sphere_outline_fragment_shader_source as perfect_sphere_outline_fragment_shader_source_webgl1 } from './webgl-1/perfect-sphere-outline-fragment-shader.js';
import { pointspheres_fragment_shader_source as pointspheres_fragment_shader_source_webgl1 } from './webgl-1/pointspheres-fragment-shader.js';
import { pointspheres_vertex_shader_source as pointspheres_vertex_shader_source_webgl1 } from './webgl-1/pointspheres-vertex-shader.js';
import { render_framebuffer_fragment_shader_source as render_framebuffer_fragment_shader_source_webgl1 } from './webgl-1/render-framebuffer-fragment-shader.js';

import { shadow_depth_twod_vertex_shader_source as shadow_depth_twod_vertex_shader_source_webgl1 } from './webgl-1/shadow-depth-twodshapes-vertex-shader.js';
import { shadow_depth_perfect_sphere_fragment_shader_source as shadow_depth_perfect_sphere_fragment_shader_source_webgl1 } from './webgl-1/shadow-depth-perfect-sphere-fragment-shader.js';
import { shadow_fragment_shader_source as shadow_fragment_shader_source_webgl1 } from './webgl-1/shadow-depth-fragment-shader.js';
import { flat_colour_fragment_shader_source as flat_colour_fragment_shader_source_webgl1 } from './webgl-1/flat-colour-fragment-shader.js';
import { shadow_vertex_shader_source as shadow_vertex_shader_source_webgl1 } from './webgl-1/shadow-depth-vertex-shader.js';
import { shadow_instanced_vertex_shader_source as shadow_instanced_vertex_shader_source_webgl1 } from './webgl-1/shadow-depth-instanced-vertex-shader.js';

import { text_fragment_shader_source as text_fragment_shader_source_webgl1 } from './webgl-1/text-fragment-shader.js';
import { circles_fragment_shader_source as circles_fragment_shader_source_webgl1 } from './webgl-1/circle-fragment-shader.js';
import { circles_vertex_shader_source as circles_vertex_shader_source_webgl1 } from './webgl-1/circle-vertex-shader.js';
import { thick_lines_vertex_shader_source as thick_lines_vertex_shader_source_webgl1 } from './webgl-1/thick-lines-vertex-shader.js';
import { thick_lines_normal_vertex_shader_source as thick_lines_normal_vertex_shader_source_webgl1 } from './webgl-1/thick-lines-normal-vertex-shader.js';
import { triangle_fragment_shader_source as triangle_fragment_shader_source_webgl1 } from './webgl-1/triangle-fragment-shader.js';
import { triangle_vertex_shader_source as triangle_vertex_shader_source_webgl1 } from './webgl-1/triangle-vertex-shader.js';
import { twod_fragment_shader_source as twod_fragment_shader_source_webgl1 } from './webgl-1/twodshapes-fragment-shader.js';
import { twod_vertex_shader_source as twod_vertex_shader_source_webgl1 } from './webgl-1/twodshapes-vertex-shader.js';
import { triangle_instanced_vertex_shader_source as triangle_instanced_vertex_shader_source_webgl1 } from './webgl-1/triangle-instanced-vertex-shader.js';

import { DistanceBetweenPointAndLine, DihedralAngle } from './mgMaths.js';
import { determineFontHeight } from './fontHeight.js';

import { guid } from '../utils/MoorhenUtils';

import { quatToMat4, quat4Inverse } from './quatToMat4.js';

import { gemmiAtomPairsToCylindersInfo } from '../utils/MoorhenUtils'

const gaussianBlurs = {

 2: [
0.05448868454964294,
0.24420134200323332,
0.4026199468942474,
0.24420134200323332,
0.05448868454964294,
],

 3:[
0.030078323398453437,
0.10498366424605168,
0.22225041895295086,
0.2853751868050879,
0.22225041895295086,
0.10498366424605168,
0.030078323398453437,
],

 4: [
0.016140081106591566,
0.05183016702170681,
0.11925996473789574,
0.19662644060631596,
0.23228669305497984,
0.19662644060631596,
0.11925996473789574,
0.05183016702170681,
0.016140081106591566,
],

 5: [
0.008812229292562285,
0.027143577143479373,
0.06511405659938267,
0.1216490730138096,
0.1769983568313557,
0.20056541423882085,
0.1769983568313557,
0.1216490730138096,
0.06511405659938267,
0.027143577143479373,
0.008812229292562285,
],

 6: [
0.004891408135911675,
0.014694602131161012,
0.03614288911901716,
0.07278284081922605,
0.11999861780063953,
0.16198119113513978,
0.1790169017178094,
0.16198119113513978,
0.11999861780063953,
0.07278284081922605,
0.03614288911901716,
0.014694602131161012,
0.004891408135911675,
],

 7: [
0.002750145966970048,
0.008125337960598875,
0.020320982830189557,
0.04301952098909718,
0.07709106015129823,
0.11693918217367535,
0.15015288211767722,
0.16320177562098706,
0.15015288211767722,
0.11693918217367535,
0.07709106015129823,
0.04301952098909718,
0.020320982830189557,
0.008125337960598875,
0.002750145966970048,
],

 8: [
0.0015615265514066891,
0.0045589506334841,
0.01153820728831374,
0.02531452108704538,
0.04814586850792525,
0.0793791175053478,
0.11345181247665377,
0.14056414060722694,
0.1509717106851926,
0.14056414060722694,
0.11345181247665377,
0.0793791175053478,
0.04814586850792525,
0.02531452108704538,
0.01153820728831374,
0.0045589506334841,
0.0015615265514066891,
],

 9: [
0.0008934464334637008,
0.00258527297620529,
0.006601725818252797,
0.01487721878707626,
0.029586882445032176,
0.051926595820090626,
0.0804254849110849,
0.1099286042137715,
0.13259920767927785,
0.14115112183148976,
0.13259920767927785,
0.1099286042137715,
0.0804254849110849,
0.051926595820090626,
0.029586882445032176,
0.01487721878707626,
0.006601725818252797,
0.00258527297620529,
0.0008934464334637008,
],

 10: [
0.000514318173965989,
0.0014779298609418326,
0.003800325840134266,
0.008744458135685964,
0.018004871605267203,
0.03317357008575297,
0.05469397062544239,
0.08069223628616619,
0.10652930842761864,
0.12584950778634327,
0.1330390063453629,
0.12584950778634327,
0.10652930842761864,
0.08069223628616619,
0.05469397062544239,
0.03317357008575297,
0.018004871605267203,
0.008744458135685964,
0.003800325840134266,
0.0014779298609418326,
0.000514318173965989,
],

 11: [
0.00029753741641435494,
0.0008502581306821063,
0.0021985206614165576,
0.005143761944377495,
0.0108893441216988,
0.02085898326629652,
0.03615389569595394,
0.05670059517290513,
0.08046197459579316,
0.10331522045788179,
0.12003516092298872,
0.1261894952271828,
0.12003516092298872,
0.10331522045788179,
0.08046197459579316,
0.05670059517290513,
0.03615389569595394,
0.02085898326629652,
0.0108893441216988,
0.005143761944377495,
0.0021985206614165576,
0.0008502581306821063,
0.00029753741641435494,
],

 12: [
0.00017283281255291256,
0.0004916559932652597,
0.0012770713476894363,
0.0030289190613905248,
0.006559622681148089,
0.012971456180499582,
0.023421639404489575,
0.038615755080850245,
0.058134033390514095,
0.07991256369758012,
0.10030402366424532,
0.11495829918509438,
0.12030425500136092,
0.11495829918509438,
0.10030402366424532,
0.07991256369758012,
0.058134033390514095,
0.038615755080850245,
0.023421639404489575,
0.012971456180499582,
0.006559622681148089,
0.0030289190613905248,
0.0012770713476894363,
0.0004916559932652597,
0.00017283281255291256,
],

 13: [
0.00010074011726611484,
0.00028549107596181114,
0.0007443743778921748,
0.0017856613045876663,
0.003941082737574938,
0.008002778752096158,
0.014951159051828134,
0.0256990876699816,
0.04064146396498538,
0.059132981146568724,
0.07915876284289895,
0.09749380381625751,
0.11047495297799284,
0.11517532032821627,
0.11047495297799284,
0.09749380381625751,
0.07915876284289895,
0.059132981146568724,
0.04064146396498538,
0.0256990876699816,
0.014951159051828134,
0.008002778752096158,
0.003941082737574938,
0.0017856613045876663,
0.0007443743778921748,
0.00028549107596181114,
0.00010074011726611484,
],

 14: [
0.00005889113363626469,
0.0001663596623597389,
0.0004351498901679815,
0.0010539559461967393,
0.0023637349173615653,
0.004908714971382323,
0.00943907836699285,
0.016806763954144616,
0.027709669222834417,
0.042303014351416326,
0.059800390493679884,
0.07827615009897047,
0.09487409079375761,
0.10647766744976665,
0.11065273749466539,
0.10647766744976665,
0.09487409079375761,
0.07827615009897047,
0.059800390493679884,
0.042303014351416326,
0.027709669222834417,
0.016806763954144616,
0.00943907836699285,
0.004908714971382323,
0.0023637349173615653,
0.0010539559461967393,
0.0004351498901679815,
0.0001663596623597389,
0.00005889113363626469,
],

 15: [
0.00003451388227635904,
0.0000972296701786038,
0.00025502501233190544,
0.0006227958464495138,
0.0014160793944518473,
0.0029978401015794257,
0.005908922471094296,
0.010843939461431973,
0.01852869542939986,
0.02947688358692049,
0.04366135962314767,
0.06021322805008624,
0.07731531523712598,
0.09243109904753559,
0.10288443303553049,
0.10662528030091958,
0.10288443303553049,
0.09243109904753559,
0.07731531523712598,
0.06021322805008624,
0.04366135962314767,
0.02947688358692049,
0.01852869542939986,
0.010843939461431973,
0.005908922471094296,
0.0029978401015794257,
0.0014160793944518473,
0.0006227958464495138,
0.00025502501233190544,
0.0000972296701786038,
0.00003451388227635904,
],

 16: [
0.000020271844607764596,
0.00005697236305223927,
0.0001497897970355774,
0.000368423450808274,
0.0008477334779493776,
0.0018248132977609205,
0.0036747227189941824,
0.006922735621506537,
0.012200509085697045,
0.02011523884295889,
0.03102554857174584,
0.044767287331406475,
0.06042951709558466,
0.07631053579241713,
0.09015024606972856,
0.09963143021362746,
0.10300844885023809,
0.09963143021362746,
0.09015024606972856,
0.07631053579241713,
0.06042951709558466,
0.044767287331406475,
0.03102554857174584,
0.02011523884295889,
0.012200509085697045,
0.006922735621506537,
0.0036747227189941824,
0.0018248132977609205,
0.0008477334779493776,
0.000368423450808274,
0.0001497897970355774,
0.00005697236305223927,
0.000020271844607764596,
]
}

function NormalizeVec3(v) {
    let vin = vec3Create(v);
    vec3.normalize(v, vin);
}

function vec3Cross(v1, v2, out) {
    vec3.cross(out, v1, v2);
}

function vec3Add(v1, v2, out) {
    vec3.add(out, v1, v2);
}

function vec3Subtract(v1, v2, out) {
    vec3.subtract(out, v1, v2);
}

export function vec3Create(v) {
    let theVec = vec3.create();
    vec3.set(theVec, v[0], v[1], v[2], v[3]);
    return theVec;
}

const X_1_0 = 0.525731112119;
const X_1_1 = 0.000000000000;
const X_1_2 = 0.850650808352;
const X_1_3 = 0.309016994375;
const X_1_4 = 0.500000000000;
const X_1_5 = 0.809016994375;
const X_1_6 = 1.000000000000;


const X_2_0 = 0.525731112119;
const X_2_1 = 0.000000000000;
const X_2_2 = 0.850650808352;
const X_2_3 = 0.433888564553;
const X_2_4 = 0.259891913008;
const X_2_5 = 0.862668480416;
const X_2_6 = 0.273266528913;
const X_2_7 = 0.961938357784;
const X_2_8 = 0.309016994375;
const X_2_9 = 0.500000000000;
const X_2_10 = 0.809016994375;
const X_2_11 = 0.162459848116;
const X_2_12 = 0.262865556060;
const X_2_13 = 0.951056516295;
const X_2_14 = 1.000000000000;
const X_2_15 = 0.160622035640;
const X_2_16 = 0.702046444776;
const X_2_17 = 0.693780477560;
const X_2_18 = 0.587785252292;
const X_2_19 = 0.425325404176;
const X_2_20 = 0.688190960236;

export const icosaVertices1 = [
    -X_1_0, X_1_2, X_1_1,
    -X_1_3, X_1_5, X_1_4,
    X_1_1, X_1_6, X_1_1,
    X_1_1, X_1_0, X_1_2,
    X_1_3, X_1_5, X_1_4,
    X_1_0, X_1_2, X_1_1,
    -X_1_5, X_1_4, X_1_3,
    -X_1_2, X_1_1, X_1_0,
    -X_1_4, X_1_3, X_1_5,
    -X_1_4, -X_1_3, X_1_5,
    X_1_1, -X_1_0, X_1_2,
    X_1_1, X_1_1, X_1_6,
    X_1_4, X_1_3, X_1_5,
    X_1_4, -X_1_3, X_1_5,
    X_1_2, X_1_1, X_1_0,
    X_1_5, X_1_4, X_1_3,
    X_1_6, X_1_1, X_1_1,
    X_1_2, X_1_1, -X_1_0,
    X_1_5, X_1_4, -X_1_3,
    X_1_5, -X_1_4, X_1_3,
    X_1_0, -X_1_2, X_1_1,
    X_1_5, -X_1_4, -X_1_3,
    X_1_3, -X_1_5, X_1_4,
    -X_1_3, -X_1_5, X_1_4,
    -X_1_0, -X_1_2, X_1_1,
    X_1_1, -X_1_6, X_1_1,
    -X_1_3, -X_1_5, -X_1_4,
    X_1_1, -X_1_0, -X_1_2,
    X_1_3, -X_1_5, -X_1_4,
    X_1_4, -X_1_3, -X_1_5,
    X_1_1, X_1_1, -X_1_6,
    X_1_1, X_1_0, -X_1_2,
    X_1_4, X_1_3, -X_1_5,
    -X_1_4, -X_1_3, -X_1_5,
    -X_1_2, X_1_1, -X_1_0,
    -X_1_4, X_1_3, -X_1_5,
    -X_1_5, X_1_4, -X_1_3,
    -X_1_3, X_1_5, -X_1_4,
    X_1_3, X_1_5, -X_1_4,
    -X_1_6, X_1_1, X_1_1,
    -X_1_5, -X_1_4, X_1_3,
    -X_1_5, -X_1_4, -X_1_3
];

export const icosaVertices2 = [
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
];

export const icosaIndices1 = [
    0, 1, 2,
    3, 4, 1,
    5, 2, 4,
    1, 4, 2,
    0, 6, 1,
    7, 8, 6,
    3, 1, 8,
    6, 8, 1,
    7, 9, 8,
    10, 11, 9,
    3, 8, 11,
    9, 11, 8,
    3, 11, 12,
    10, 13, 11,
    14, 12, 13,
    11, 13, 12,
    3, 12, 4,
    14, 15, 12,
    5, 4, 15,
    12, 15, 4,
    14, 16, 15,
    17, 18, 16,
    5, 15, 18,
    16, 18, 15,
    14, 19, 16,
    20, 21, 19,
    17, 16, 21,
    19, 21, 16,
    10, 22, 13,
    20, 19, 22,
    14, 13, 19,
    22, 19, 13,
    10, 23, 22,
    24, 25, 23,
    20, 22, 25,
    23, 25, 22,
    24, 26, 25,
    27, 28, 26,
    20, 25, 28,
    26, 28, 25,
    27, 29, 28,
    17, 21, 29,
    20, 28, 21,
    29, 21, 28,
    27, 30, 29,
    31, 32, 30,
    17, 29, 32,
    30, 32, 29,
    27, 33, 30,
    34, 35, 33,
    31, 30, 35,
    33, 35, 30,
    34, 36, 35,
    0, 37, 36,
    31, 35, 37,
    36, 37, 35,
    0, 2, 37,
    5, 38, 2,
    31, 37, 38,
    2, 38, 37,
    31, 38, 32,
    5, 18, 38,
    17, 32, 18,
    38, 18, 32,
    7, 6, 39,
    0, 36, 6,
    34, 39, 36,
    6, 36, 39,
    7, 39, 40,
    34, 41, 39,
    24, 40, 41,
    39, 41, 40,
    7, 40, 9,
    24, 23, 40,
    10, 9, 23,
    40, 23, 9,
    27, 26, 33,
    24, 41, 26,
    34, 33, 41,
    26, 41, 33
];

export const icosaIndices2 = [
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
];

let icosaVertices = icosaVertices2;
let icosaIndices = icosaIndices2;

let icosaNormals = icosaVertices;

export function isDarkBackground(r, g, b, a) {
    const brightness = r * 0.299 + g * 0.587 + b * 0.114
    if (brightness >= 0.5) {
        return false
    }
    return true
}

function handleTextureLoaded(gl, image, texture, text, tex_size, font) {

    // FIXME - For text, need to fathom how to create a quad of appropriate size to draw on, and how to create correct sized canvas for that.
    let acanvas = document.createElement("canvas");

    let nptw;
    let npth;
    if (image) {
        nptw = next_power_of_2(image.width);
        npth = next_power_of_2(image.height);
    } else {
        nptw = 512;
        npth = 256;
    }

    let ctx = acanvas.getContext("2d");

    let scalew = 1.0;
    let scaleh = 1.0;
    if (nptw > 1024) {
        scalew = 1024.0 / nptw;
        nptw = 1024;
    }
    if (npth > 1024) {
        scaleh = 1024.0 / npth;
        npth = 1024;
    }
    acanvas.width = nptw;
    acanvas.height = npth;

    if (image) {
        ctx.scale(scalew, scaleh);
        ctx.drawImage(image, 0, 0);
    } else {
        let fnsize = font.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
        ctx.font = font;
        let textWidth = ctx.measureText(text).width;
        let textHeight = 1.0 * determineFontHeight(font, fnsize);
        nptw = next_power_of_2(Math.floor(textWidth));
        npth = next_power_of_2(Math.floor(textHeight));
        console.log(nptw + " " + npth);
        console.log(ctx.measureText(text));

        acanvas.width = nptw;
        acanvas.height = npth;
        ctx.font = font;
        ctx.fillStyle = "black";
        ctx.fillText(text, acanvas.width / 2 - textWidth / 2, textHeight);
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, acanvas);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    tex_size["width"] = acanvas.width;
    tex_size["height"] = acanvas.height;
}

function initStringTextures(gl, text, tex_size, font) {
    let cubeTexture = gl.createTexture();
    handleTextureLoaded(gl, null, cubeTexture, text, tex_size, font);
    return cubeTexture;
}

function initTextures(gl, fname) {
    let cubeTexture = gl.createTexture();
    let cubeImage = new Image();
    let tex_size = {};

    cubeImage.src = fname;

    cubeImage.onload = function () { handleTextureLoaded(gl, cubeImage, cubeTexture, null, tex_size, null); }

    return cubeTexture;
}

function getOffsetRect(elem) {
    let box = elem.getBoundingClientRect();
    let body = document.body;
    let docElem = document.documentElement;

    let scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    let scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
    let clientTop = docElem.clientTop || body.clientTop || 0;
    let clientLeft = docElem.clientLeft || body.clientLeft || 0;
    let top = box.top + scrollTop - clientTop;
    let left = box.left + scrollLeft - clientLeft;
    return { top: Math.round(top), left: Math.round(left) };
}

function next_power_of_2(v) {
    v -= 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v += 1;
    return v;
}

function getEncodedData(rssentries:any[]) {
    let allBuffers = [];
    for (let i = 0; i < rssentries.length; i++) {
        if (typeof (rssentries[i]) === "string") {
            const b64Data = rssentries[i];
            let strData;
            if (window.atob && window.btoa) {
                strData = atob(b64Data.replace(/\s/g, ''));
            } else {
                strData = base64decode(b64Data.replace(/\s/g, ''));
            }
            //let binData     = new Uint8Array();
            let j;

            let binData = new Uint8Array(strData.length);
            for (j = 0; j < strData.length; j++) {
                binData[j] = strData[j].charCodeAt(0);
            }

            let data = pako.inflate(binData);

            strData = "";

            if (window.TextDecoder) {
                // THIS'LL only work in Firefox 19+, Opera 25+ and Chrome 38+.
                let decoder = new TextDecoder('utf-8');
                strData = decoder.decode(data);
            } else {
                let unpackBufferLength = 60000;
                for (j = 0; j < data.length / unpackBufferLength; j++) {
                    let lower = j * unpackBufferLength;
                    let upper = (j + 1) * unpackBufferLength;
                    if (upper > data.length) {
                        upper = data.length;
                    }
                    // FECK, no slice on Safari!
                    strData += String.fromCharCode.apply(null, data.subarray(lower, upper));
                }
            }

            let thisBuffer;
            try {
                thisBuffer = JSON.parse(strData);
                allBuffers.push(thisBuffer);
            } catch (e) {
                console.log(strData);
            }
        } else {
            allBuffers.push(rssentries[i]);
        }
    }
    return allBuffers;
}

function initGL(canvas) {
    let gl;
    gl = canvas.getContext("webgl2", {stencil: true});
    let WEBGL2 = true;
    if (!gl) {
        gl = canvas.getContext("webgl", {stencil: true});
        WEBGL2 = false;
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    /*
    console.log("Max texture size:",gl.getParameter(gl.MAX_TEXTURE_SIZE))
    console.log("Max cube map texture size:",gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE))
    console.log("Max renderbuffer size:",gl.getParameter(gl.MAX_RENDERBUFFER_SIZE))
    console.log("Max viewport size:",gl.getParameter(gl.MAX_VIEWPORT_DIMS))
    console.log("Max vertex attribs:",gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
    console.log("Max varying vectors:",gl.getParameter(gl.MAX_VARYING_VECTORS))
    console.log("Max vertex uniform vectors:",gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS))
    console.log("Max fragment uniform vectors:",gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS))
    console.log("Max texture image units:",gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS))
    console.log("Max vertex texture image units:",gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS))
    console.log("Max combined texture image units:",gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS))
    */
    return {gl:gl,WEBGL2:WEBGL2};
}

function getShader(gl, str, type) {

    let shader;
    if (type === "fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type === "vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function sortIndicesByProj(a, b) {
    if (a.proj > b.proj)
        return -1;
    if (a.proj < b.proj)
        return 1;
    return 0;
}

function SortThing(proj, id1, id2, id3) {
    this.proj = proj;
    this.id1 = id1;
    this.id2 = id2;
    this.id3 = id3;
}

class TextCanvasTexture {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    ext: any;
    glRef: MGWebGL;
    nBigTextures: number;
    nBigTexturesInt: number;
    refI: Dictionary<number>;
    bigTextureTexOrigins: number[][];
    bigTextureTexOffsets: number[][];
    bigTextureScalings: number[][];
    contextBig: CanvasRenderingContext2D;
    bigTextureCurrentBaseLine: number;
    bigTextureCurrentWidth: number;
    maxCurrentColumnWidth: number;
    bigTextTex: WebGLTexture;
    bigTextureTexOffsetsBuffer: WebGLBuffer;
    bigTextureTextInstanceOriginBuffer: WebGLBuffer;
    bigTextureTextInstanceSizeBuffer: WebGLBuffer;
    bigTextureTextTexCoordBuffer: WebGLBuffer;
    bigTextureTextPositionBuffer: WebGLBuffer;
    bigTextureTextIndexesBuffer: WebGLBuffer;
    textureCache: Dictionary<Dictionary<Dictionary<number[]>>>;

    constructor(glRef,width=1024,height=4096) {
        this.gl = glRef.gl
        this.ext = glRef.ext
        this.glRef = glRef
        this.nBigTextures = 0;
        this.nBigTexturesInt = 0;
        this.refI = {};
        this.bigTextureTexOrigins = []
        this.bigTextureTexOffsets = []
        this.bigTextureScalings   = []
        this.contextBig = document.createElement("canvas").getContext("2d");
        this.contextBig.canvas.width = width;
        this.contextBig.canvas.height = Math.min(height,this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE));
        this.bigTextureCurrentBaseLine = 0;
        this.bigTextureCurrentWidth = 0;
        this.maxCurrentColumnWidth = 0;
        this.contextBig.fillStyle = "#00000000";
        this.contextBig.fillRect(0, 0, this.contextBig.canvas.width, this.contextBig.canvas.height);
        this.bigTextTex = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.bigTextureTexOffsetsBuffer = this.gl.createBuffer();
        this.bigTextureTextInstanceOriginBuffer = this.gl.createBuffer();
        this.bigTextureTextInstanceSizeBuffer = this.gl.createBuffer();
        this.bigTextureTextTexCoordBuffer = this.gl.createBuffer();
        this.bigTextureTextPositionBuffer = this.gl.createBuffer();
        this.bigTextureTextIndexesBuffer = this.gl.createBuffer();
        this.textureCache = {};
    }

    recreateBigTextureBuffers() {
        const bigTextureTexCoords  = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0]
        const bigTexturePositions  = [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0 ]
        const bigTextureIdxs = [0,1,2,0,2,3]

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTexOffsetsBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureTexOffsets.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceOriginBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureTexOrigins.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceSizeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.bigTextureScalings.flat()), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextTexCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(bigTextureTexCoords), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(bigTexturePositions), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.bigTextureTextIndexesBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(bigTextureIdxs), this.gl.STATIC_DRAW);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bigTextureIdxs), this.gl.STATIC_DRAW);
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.contextBig.canvas);

    }

    addImageToBigTexture(t : string, textColour : string, font : string) : number[] {
        this.contextBig.textBaseline = "alphabetic";
        this.contextBig.font = font;
        let textMetric = this.contextBig.measureText(t);
        let actualHeight = textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent + 2;
        this.contextBig.fillStyle = textColour;
        if(!(textColour in this.textureCache)){
            this.textureCache[textColour] = {};
        }
        if(!(font.toLowerCase() in this.textureCache[textColour])){
            this.textureCache[textColour][font.toLowerCase()] = {};
        }
        if(t in this.textureCache[textColour][font.toLowerCase()]){
            return this.textureCache[textColour][font.toLowerCase()][t];
        }
        if(this.bigTextureCurrentBaseLine+actualHeight>this.contextBig.canvas.height){
            this.bigTextureCurrentBaseLine = 0;
            this.bigTextureCurrentWidth += this.maxCurrentColumnWidth;
            this.maxCurrentColumnWidth = 0;
        }
        const x1 = this.bigTextureCurrentWidth / this.contextBig.canvas.width;
        const y1 = (this.bigTextureCurrentBaseLine + 1)/ this.contextBig.canvas.height;
        this.bigTextureCurrentBaseLine += actualHeight;
        const x2 = x1 + textMetric.actualBoundingBoxRight / this.contextBig.canvas.width;
        const y2 = this.bigTextureCurrentBaseLine / this.contextBig.canvas.height;
        this.contextBig.fillText(t, this.bigTextureCurrentWidth, this.bigTextureCurrentBaseLine-textMetric.actualBoundingBoxDescent, textMetric.width);
        if(textMetric.width>this.maxCurrentColumnWidth){
            this.maxCurrentColumnWidth = textMetric.width;
        }
        this.textureCache[textColour][font.toLowerCase()][t] = [x1,y1,x2,y2];
        return [x1,y1,x2,y2]
    }

    clearBigTexture() {
        this.contextBig.fillStyle = "#00000000";
        this.contextBig.clearRect(0, 0, this.contextBig.canvas.width, this.contextBig.canvas.height);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.contextBig.canvas);
        this.nBigTextures = 0
        this.nBigTexturesInt = 0;
        this.refI = {};
        this.textureCache = {};
        this.bigTextureCurrentBaseLine = 0;
        this.bigTextureCurrentWidth = 0;
        this.maxCurrentColumnWidth = 0;
        this.bigTextureTexOrigins = []
        this.bigTextureTexOffsets = []
        this.bigTextureScalings   = []
    }

    removeBigTextureTextImages(textObjects) {
        textObjects.forEach(label => {
            this.removeBigTextureTextImage(label)
        })
        this.recreateBigTextureBuffers();
    }

    removeBigTextureTextImage(textObject) {
        const key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font
        if(key in this.refI) {
            this.bigTextureTexOrigins[this.refI[key]] = [];
            this.bigTextureTexOffsets[this.refI[key]] = [];
            this.bigTextureScalings[this.refI[key]] = [];
            delete this.refI[key];
            this.nBigTextures -= 1;
        }
    }

    addBigTextureTextImage(textObject) {
        const key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font
        const fontSize = parseInt(textObject.font);
        const x = textObject.x;
        const y = textObject.y;
        const z = textObject.z;
        const o = [x,y,z];

        let colour;
        const bright_y = this.glRef.background_colour[0] * 0.299 + this.glRef.background_colour[1] * 0.587 + this.glRef.background_colour[2] * 0.114;
        if(bright_y<0.5)
            colour = "white";
        else
            colour = "black";

        const t = this.addImageToBigTexture(textObject.text,colour,textObject.font);
        const s = [fontSize*this.contextBig.canvas.width / this.contextBig.canvas.height * (t[2]-t[0])/0.25, fontSize*(t[3]-t[1]) /0.25, 1.0];
        this.bigTextureTexOrigins.push(o);
        this.bigTextureTexOffsets.push([t[0], t[2]-t[0], t[1], t[3]-t[1]]);
        this.bigTextureScalings.push(s)
        this.refI[key] = this.nBigTexturesInt;
        this.nBigTextures += 1;
        this.nBigTexturesInt += 1;
    }

}

class DisplayBuffer {
    visible: boolean;
    name_label: string;
    display_class: string;
    transparent: boolean;
    alphaChanged: boolean;
    atoms: {charge: number, tempFactor: number, x: number, y: number, z: number, symbol: string, label:string}[];
    symmetryMatrices: number[];
    triangleVertexRealNormalBuffer: MGWebGLBuffer[];
    triangleVertexNormalBuffer: MGWebGLBuffer[];
    triangleVertexPositionBuffer: MGWebGLBuffer[];
    triangleVertexIndexBuffer: MGWebGLBuffer[];
    triangleVertexTextureBuffer: MGWebGLBuffer[];
    triangleInstanceOriginBuffer: MGWebGLBuffer[];
    triangleInstanceOrientationBuffer: MGWebGLBuffer[];
    triangleInstanceSizeBuffer: MGWebGLBuffer[];
    triangleColourBuffer: number[];
    triangleIndexs: number[];
    triangleVertices: number[];
    triangleInstanceOrigins: number[];
    triangleInstanceSizes: number[];
    triangleInstanceOrientations: number[];
    triangleColours: number[];
    triangleNormals: number[];
    primitiveSizes: number[];
    bufferTypes: string[];
    transformMatrix: number[];
    transformMatrixInteractive: number[];
    transformOriginInteractive: number[];
    symopnums: number[];
    supplementary: any;
    isDirty: boolean;
    textNormalBuffer: MGWebGLBuffer[] | null;
    textPositionBuffer: MGWebGLBuffer[] | null;
    textColourBuffer: MGWebGLBuffer[] | null;
    textTexCoordBuffer: MGWebGLBuffer[] | null;
    textIndexesBuffer: MGWebGLBuffer[] | null;
    clickLinePositionBuffer: MGWebGLBuffer[] | null;
    clickLineColourBuffer: MGWebGLBuffer[] | null;
    clickLineIndexesBuffer: MGWebGLBuffer[] | null;
    textNormals: number[];
    textColours: number[];

    constructor() {
        this.visible = true;
        this.name_label = "";
        this.display_class = "NONE";
        this.transparent = false;
        this.alphaChanged = false;
        this.atoms = [];
        this.symmetryMatrices = [];
        this.clearBuffers();
    }

    clearBuffers() {
        this.triangleVertexRealNormalBuffer = []; // This is going to be for lit lines.
        this.triangleVertexNormalBuffer = [];
        this.triangleVertexPositionBuffer = [];
        this.triangleVertexIndexBuffer = [];
        this.triangleVertexTextureBuffer = [];
        this.triangleInstanceOriginBuffer = [];
        this.triangleInstanceOrientationBuffer = [];
        this.triangleInstanceSizeBuffer = [];
        this.triangleColourBuffer = [];
        this.triangleIndexs = [];
        this.triangleVertices = [];
        this.triangleInstanceOrigins = [];
        this.triangleInstanceSizes = [];
        this.triangleInstanceOrientations = [];
        this.triangleColours = [];
        this.triangleNormals = [];
        this.primitiveSizes = [];
        this.bufferTypes = [];
        this.transformMatrix = null;
        this.transformMatrixInteractive = null;
        this.transformOriginInteractive = [0, 0, 0];
        this.symopnums = [];
        this.supplementary = {};
        this.isDirty = true;
        this.textNormalBuffer = null;
        this.textPositionBuffer = null;
        this.textColourBuffer = null;
        this.textTexCoordBuffer = null;
        this.textIndexesBuffer = null;
        this.clickLinePositionBuffer = null;
        this.clickLineColourBuffer = null;
        this.clickLineIndexesBuffer = null;
        this.textNormals = [];
        this.textColours = [];
        this.atoms = [];
    }

    setTransformMatrix(transformMatrix) {
        this.transformMatrix = transformMatrix;
    }

}

function createQuatFromDXAngle(angle_in, axis) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, Math.sin(angle / 2.0) * axis[0], Math.sin(angle / 2.0) * axis[1], Math.sin(angle / 2.0) * axis[2], Math.cos(angle / 2.0));
    return q;
}

function createXQuatFromDX(angle_in) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, Math.sin(angle / 2.0), 0.0, 0.0, Math.cos(angle / 2.0));
    return q;
}

function createYQuatFromDY(angle_in) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, 0.0, Math.sin(angle / 2.0), 0.0, Math.cos(angle / 2.0));
    return q;
}

function createZQuatFromDX(angle_in) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, 0.0, 0.0, Math.sin(angle / 2.0), Math.cos(angle / 2.0));
    return q;
}

export function getDeviceScale() {
    let deviceScale = 1.0;
    if(window.devicePixelRatio) deviceScale = window.devicePixelRatio
    return deviceScale;
}

//Hmm, I cannot seem to use these for gl (yet)
interface MGWebGLRenderingContext extends WebGLRenderingContext {
    viewportWidth: number;
    viewportHeight: number;
}

interface MGWebGL2RenderingContext extends WebGL2RenderingContext {
    viewportWidth: number;
    viewportHeight: number;
}

interface clickAtom {
    x: number;
    y: number;
    z: number;
    charge: number;
    label: string;
    symbol: string;
    displayBuffer: DisplayBuffer;
    circleData?: ImageData;
}

interface Dictionary<T> {
    [Key: string]: T;
}


interface MGWebGLFrameBuffer extends WebGLFramebuffer {
    width: number;
    height: number;
}

interface MGWebGLBuffer {
    itemSize: number;
    numItems: number;
}

interface MGWebGLShader extends WebGLProgram {
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
    pMatrixUniform: WebGLUniformLocation;
    mvMatrixUniform: WebGLUniformLocation;
    mvInvMatrixUniform: WebGLUniformLocation;
    fog_start: WebGLUniformLocation;
    fog_end: WebGLUniformLocation;
    fogColour: WebGLUniformLocation;
    clipPlane0: WebGLUniformLocation;
    clipPlane1: WebGLUniformLocation;
    clipPlane2: WebGLUniformLocation;
    clipPlane3: WebGLUniformLocation;
    clipPlane4: WebGLUniformLocation;
    clipPlane5: WebGLUniformLocation;
    clipPlane6: WebGLUniformLocation;
    clipPlane7: WebGLUniformLocation;
    nClipPlanes: WebGLUniformLocation;
    light_positions: WebGLUniformLocation;
    light_colours_ambient: WebGLUniformLocation;
    light_colours_specular: WebGLUniformLocation;
    light_colours_diffuse: WebGLUniformLocation;
}

interface ShaderThickLines extends MGWebGLShader {
    screenZ: WebGLUniformLocation;
    offset: WebGLUniformLocation;
    size: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
    ShadowMap: WebGLUniformLocation;
    doShadows: WebGLUniformLocation;
    xPixelOffset: WebGLUniformLocation;
    yPixelOffset: WebGLUniformLocation;
    shadowQuality: WebGLUniformLocation;
    pixelZoom: WebGLUniformLocation;
    specularPower: WebGLUniformLocation;
    textureMatrixUniform: WebGLUniformLocation;
    shinyBack: WebGLUniformLocation;
}

interface ShaderThickLinesNormal extends ShaderThickLines {
    vertexRealNormalAttribute: GLint;
}

interface ShaderTwodShapes extends MGWebGLShader {
    offset: WebGLUniformLocation;
    size: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
}

interface ShaderTextInstanced extends MGWebGLShader {
    offsetAttribute: GLint;
    sizeAttribute: GLint;
    textureOffsetAttribute: GLint;
    pixelZoom: WebGLUniformLocation;
    vertexTextureAttribute: GLint;
    textureMatrixUniform: WebGLUniformLocation;
}

interface ShaderTextBackground extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    pixelZoom: WebGLUniformLocation;
    screenZ: WebGLUniformLocation;
    maxTextureS: WebGLUniformLocation;
}

interface ShaderFrameBuffer extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    blurredTexture: WebGLUniformLocation;
    depthTexture: WebGLUniformLocation;
    focussedTexture: WebGLUniformLocation;
}

interface ShaderPointSpheres extends MGWebGLShader {
    size: WebGLUniformLocation;
    offset: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
    textureMatrixUniform: WebGLUniformLocation;
}

interface ShaderPerfectSpheres extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    offsetAttribute: GLint;
    sizeAttribute: GLint;
    invSymMatrixUniform: WebGLUniformLocation;
    textureMatrixUniform: WebGLUniformLocation;
    xPixelOffset: WebGLUniformLocation;
    yPixelOffset: WebGLUniformLocation;
    ShadowMap: WebGLUniformLocation;
    outlineSize: WebGLUniformLocation;
    shadowQuality: WebGLUniformLocation;
    doShadows: WebGLUniformLocation;
    clipCap: WebGLUniformLocation;
    specularPower: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
}

interface ShaderTriangles extends MGWebGLShader {
    specularPower: WebGLUniformLocation;
    shinyBack: WebGLUniformLocation;
    backColour: WebGLUniformLocation;
    defaultColour: WebGLUniformLocation;
    ShadowMap: WebGLUniformLocation;
    shadowQuality: WebGLUniformLocation;
    doShadows: WebGLUniformLocation;
    cursorPos: WebGLUniformLocation;
    xPixelOffset: WebGLUniformLocation;
    yPixelOffset: WebGLUniformLocation;
    textureMatrixUniform: WebGLUniformLocation;
}

interface ShaderBlurX extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
    depthTexture: WebGLUniformLocation;
    blurSize: WebGLUniformLocation;
    blurDepth: WebGLUniformLocation;
    blurCoeffs: WebGLUniformLocation | null;
}

interface ShaderBlurY extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
    depthTexture: WebGLUniformLocation;
    blurSize: WebGLUniformLocation;
    blurDepth: WebGLUniformLocation;
    blurCoeffs: WebGLUniformLocation | null;
}

interface ShaderCircles extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    up: WebGLUniformLocation;
    right: WebGLUniformLocation;
}

interface ShaderImages extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    size: WebGLUniformLocation;
    offset: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
}

interface ShaderTrianglesInstanced extends ShaderTriangles {
    vertexInstanceOriginAttribute: GLint;
    vertexInstanceSizeAttribute : GLint;
    vertexInstanceOrientationAttribute  : GLint;
    outlineSize  : WebGLUniformLocation;
}

interface ShaderOutLine extends MGWebGLShader {
    outlineSize  : WebGLUniformLocation;
    cursorPos  : WebGLUniformLocation;
    textureMatrixUniform: WebGLUniformLocation;
}

interface ShaderOverlay extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
}

interface MGWebGLPropsInterface {
                    onAtomHovered : (identifier: { buffer: { id: string; }; atom: { label: string; }; }) => void;
                    onKeyPress : (event: KeyboardEvent) =>  boolean | Promise<boolean>;
                    messageChanged : ((d:Dictionary<string>) => void);
                    mouseSensitivityFactor :  number | null;
                    zoomWheelSensitivityFactor :  number | null;
                    keyboardAccelerators : Dictionary<string>;
                    showCrosshairs : boolean | null;
                    showAxes : boolean | null;
                    showFPS : boolean | null;
                    mapLineWidth : number;
                    drawMissingLoops :  boolean | null;
                    drawInteractions :  boolean | null;
                    width? : number;
                    height? : number;
}

export class MGWebGL extends React.Component implements webGL.MGWebGL {

        draggableMolecule: moorhen.Molecule
        activeMolecule: moorhen.Molecule
        specularPower: number;
        atomLabelDepthMode: boolean;
        clipCapPerfectSpheres: boolean;
        useOffScreenBuffers: boolean;
        blurSize: number;
        blurDepth:number;
        myQuat: quat4;
        gl_fog_start: null | number;
        doDrawClickedAtomLines: boolean;
        gl_clipPlane0: null | Float32Array;
        gl_clipPlane1: null | Float32Array;
        fogClipOffset: number;
        zoom: number;
        gl_fog_end: number;
        light_colours_specular: Float32Array;
        light_colours_diffuse: Float32Array;
        light_positions: Float32Array;
        light_colours_ambient: Float32Array;
        background_colour: [number, number, number, number];
        origin: [number, number, number];
        labelledAtoms: clickAtom[][];
        measuredAtoms: clickAtom[][];
        pixel_data: Uint8Array;
        screenshotBuffersReady: boolean;
        save_pixel_data: boolean;
        renderToTexture: boolean;
        showShortCutHelp: string[];
        WEBGL2: boolean;
        doRedraw: boolean;
        circleCanvasInitialized: boolean;
        textCanvasInitialized: boolean;
        currentlyDraggedAtom: null | {atom: {charge: number, tempFactor: number, x: number, y: number, z: number, symbol: string, label:string}, buffer: DisplayBuffer};
        gl_cursorPos: Float32Array;
        textCtx: CanvasRenderingContext2D;
        circleCtx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;
        rttFramebuffer: MGWebGLFrameBuffer;
        doPerspectiveProjection: boolean;
        labelsTextCanvasTexture: TextCanvasTexture;
        currentBufferIdx: number;
        atom_span: number;
        axesColourBuffer: WebGLBuffer;
        axesIndexBuffer: WebGLBuffer;
        axesNormalBuffer: WebGLBuffer;
        axesPositionBuffer: WebGLBuffer;
        axesTextColourBuffer: WebGLBuffer;
        axesTextIndexesBuffer: WebGLBuffer;
        axesTextNormalBuffer: WebGLBuffer;
        axesTextPositionBuffer: WebGLBuffer;
        axesTextTexCoordBuffer: WebGLBuffer;
        backColour: string | number[];
        blurXTexture: WebGLTexture;
        blurYTexture: WebGLTexture;
        calculatingShadowMap: boolean;
        cancelMouseTrack: boolean;
        circleTex: WebGLTexture;
        clipChangedEvent: Event;
        context: CanvasRenderingContext2D;
        diskBuffer: DisplayBuffer;
        diskVertices: number[];
        doShadow: boolean;
        doShadowDepthDebug: boolean;
        doSpin: boolean;
        doStenciling: boolean;
        doneEvents: boolean;
        dx: number;
        dy: number;
        fogChangedEvent: Event;
        fpsText: string;
        framebufferDrawBuffersReady: boolean;
        framebufferDrawIndexesBuffer: WebGLBuffer;
        framebufferDrawPositionBuffer: WebGLBuffer;
        framebufferDrawTexCoordBuffer: WebGLBuffer;
        glTextFont: string;
        gl_clipPlane2: Float32Array;
        gl_clipPlane3: Float32Array;
        gl_clipPlane4: Float32Array;
        gl_clipPlane5: Float32Array;
        gl_clipPlane6: Float32Array;
        gl_clipPlane7: Float32Array;
        gl_nClipPlanes: number;
        hitchometerColourBuffer: WebGLBuffer;
        hitchometerIndexBuffer: WebGLBuffer;
        hitchometerNormalBuffer: WebGLBuffer;
        hitchometerPositionBuffer: WebGLBuffer;
        ids: string[];
        imageBuffer: DisplayBuffer;
        imageVertices: number[];
        init_x: number;
        init_y: number;
        mapLineWidth: number;
        measureCylinderBuffers: DisplayBuffer[];
        measureTextCanvasTexture: TextCanvasTexture;
        mouseDown: boolean;
        mouseDown_x: number;
        mouseDown_y: number;
        mouseDownedAt: number;
        mouseMoved: boolean;
        mouseTrackColourBuffer: WebGLBuffer;
        mouseTrackIndexBuffer: WebGLBuffer;
        mouseTrackNormalBuffer: WebGLBuffer;
        mouseTrackPoints: number[][];
        mouseTrackPositionBuffer: WebGLBuffer;
        moveFactor: number;
        mspfArray: number[];
        mvInvMatrix: Float32Array;
        mvMatrix: Float32Array;
        nAnimationFrames: number;
        nFrames: number;
        nPrevFrames: number;
        offScreenDepthTexture: WebGLTexture;
        offScreenFramebuffer: MGWebGLFrameBuffer;
        offScreenFramebufferBlurX: MGWebGLFrameBuffer;
        offScreenFramebufferBlurY: MGWebGLFrameBuffer;
        offScreenFramebufferColor: MGWebGLFrameBuffer;
        offScreenReady: boolean;
        offScreenRenderbufferColor: WebGLRenderbuffer;
        offScreenRenderbufferDepth: WebGLRenderbuffer;
        offScreenTexture: WebGLTexture;
        pMatrix: Float32Array;
        pmvMatrix: Float32Array;
        prevTime: number;
        radius: number;
        reContourMapOnlyOnMouseUp: boolean;
        ready: boolean;
        renderSilhouettesToTexture: boolean;
        rttFramebufferColor: MGWebGLFrameBuffer;
        rttFramebufferDepth: MGWebGLFrameBuffer;
        rttTexture: WebGLTexture;
        rttTextureDepth: WebGLTexture;
        screenZ: number;
        shaderProgram: ShaderTriangles;
        shaderProgramBlurX: ShaderBlurX;
        shaderProgramBlurY: ShaderBlurY;
        shaderProgramCircles: ShaderCircles;
        shaderProgramImages: ShaderImages;
        shaderProgramInstanced: ShaderTrianglesInstanced;
        shaderProgramInstancedOutline: ShaderTrianglesInstanced;
        shaderProgramInstancedShadow: ShaderTrianglesInstanced;
        shaderProgramLines: MGWebGLShader;
        shaderProgramOutline: ShaderOutLine;
        shaderProgramOverlay: ShaderOverlay;
        shaderProgramPerfectSpheres: ShaderPerfectSpheres;
        shaderProgramPerfectSpheresOutline: ShaderPerfectSpheres;
        shaderProgramPointSpheres: ShaderPointSpheres;
        shaderProgramPointSpheresShadow: ShaderPointSpheres;
        shaderProgramRenderFrameBuffer: ShaderFrameBuffer;
        shaderProgramShadow: MGWebGLShader;
        shaderProgramTextBackground: ShaderTextBackground;
        shaderProgramTextInstanced: ShaderTextInstanced;
        shaderProgramThickLines: ShaderThickLines;
        shaderProgramThickLinesNormal: ShaderThickLinesNormal;
        shaderProgramTwoDShapes: ShaderTwodShapes;
        shaderDepthShadowProgramPerfectSpheres: ShaderPerfectSpheres;
        shinyBack: boolean;
        showAxes: boolean;
        showCrosshairs: boolean;
        showFPS: boolean;
        silhouetteBufferReady: boolean;
        silhouetteDepthTexture: WebGLTexture;
        silhouetteFramebuffer: MGWebGLFrameBuffer;
        silhouetteRenderbufferColor: WebGLRenderbuffer;
        silhouetteRenderbufferDepth: WebGLRenderbuffer;
        silhouetteTexture: WebGLTexture;
        sphereBuffer: DisplayBuffer;
        state:  {width: number, height: number };
        statusChangedEvent: Event;
        stencilPass: boolean;
        stenciling: boolean;
        textHeightScaling: number;
        textTex: WebGLTexture;
        trackMouse: boolean;
        viewChangedEvent: Event;
        props: MGWebGLPropsInterface;
        extraFontCtxs: Dictionary<HTMLCanvasElement>;
        mouseDownButton: number;
        keysDown: Dictionary<number>;

        textLegends: any;
        textureMatrix: mat4;
        displayBuffers: any[];
        gl:  any;
        canvasRef: any;
        depth_texture: any;
        frag_depth_ext: any;
        instanced_ext: any;
        ext: any;
        newTextLabels: any;

    resize(width: number, height: number) : void {
        //TODO We need to be cleverer than this.
        let theWidth = width;
        let theHeight = height; //Keep it square for now

        this.canvas.style.width = Math.floor(theWidth) + "px";
        this.canvas.style.height = Math.floor(theHeight) + "px";
        this.canvas.width = Math.floor(getDeviceScale() * Math.floor(theWidth));
        this.canvas.height = Math.floor(getDeviceScale() * Math.floor(theHeight));

        this.gl.viewportWidth = this.canvas.width;
        this.gl.viewportHeight = this.canvas.height;

        if(this.useOffScreenBuffers&&this.WEBGL2){
            this.recreateOffScreeenBuffers();
        }

        this.silhouetteBufferReady = false;
    }

    constructor(props : MGWebGLPropsInterface) {

        super(props);

        this.props = props;
        const self = this;
        this.glTextFont = "18px Helvetica";
        this.showFPS = false;
        this.nFrames = 0;
        this.nPrevFrames = 0;
        this.prevTime = performance.now();
        this.fpsText = "";
        this.showShortCutHelp = null;
        this.mspfArray = [];
        this.mouseTrackPoints = [];

        setInterval(() => {
            if(!self.context) return;
            const sum = this.mspfArray.reduce((a, b) => a + b, 0);
            const avg = (sum / this.mspfArray.length) || 0;
            const fps = 1.0/avg * 1000;
            self.fpsText = avg.toFixed(2)+" ms/frame (" + (fps).toFixed(0)+" fps)";
            }, 1000);

        //Set to false to use WebGL 1
        this.WEBGL2 = false;
        this.state = { width: this.props.width, height: this.props.height };
        this.canvasRef = React.createRef();
        this.keysDown = {};
        this.atomLabelDepthMode = true;
        this.showCrosshairs = false
        this.trackMouse = false
        this.showAxes = false;
        this.reContourMapOnlyOnMouseUp = true;
        this.mapLineWidth = 1.0

        if (this.props.showAxes !== null) {
            this.showAxes = this.props.showAxes
        }
        if (this.props.showCrosshairs !== null) {
            this.showCrosshairs = this.props.showCrosshairs
        }
        if (this.props.showFPS !== null) {
            this.showFPS = this.props.showFPS
        }
        if (this.props.mapLineWidth !== null) {
            this.mapLineWidth = this.props.mapLineWidth
        }
    }

    render() {
        return <canvas ref={this.canvasRef} height={this.state.width} width={this.state.height} />;
    }

    draw() {

        this.context = this.canvasRef.current.getContext('2d');
        let ctx = this.context;
        let c = this.canvasRef.current;

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, c.width, c.height);
        //this.drawGradient(c.width/2, c.height/2);
    }

    setBlurSize(blurSize) {
        this.blurSize = blurSize;

        if(this.WEBGL2){
            const blockSize = this.gl.getActiveUniformBlockParameter( this.shaderProgramBlurX, this.shaderProgramBlurX.blurCoeffs, this.gl.UNIFORM_BLOCK_DATA_SIZE);

            const uboBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, uboBuffer);
            this.gl.bufferData(this.gl.UNIFORM_BUFFER, blockSize, this.gl.DYNAMIC_DRAW);
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
            this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, uboBuffer);
            const uboVariableNames = ["row0","row1","row2","row3","row4","row5","row6","row7","row8","nsteps"];
            const uboVariableIndices = this.gl.getUniformIndices( this.shaderProgramBlurX, uboVariableNames);
            const uboVariableOffsets = this.gl.getActiveUniforms( this.shaderProgramBlurX, uboVariableIndices, this.gl.UNIFORM_OFFSET);

            const uboVariableInfo = {};

            uboVariableNames.forEach((name, index) => {
                uboVariableInfo[name] = {
                    index: uboVariableIndices[index],
                    offset: uboVariableOffsets[index],
                };
            });

            this.gl.useProgram(this.shaderProgramBlurY);
            let index = this.gl.getUniformBlockIndex(this.shaderProgramBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurY, index, 0);

            this.gl.useProgram(this.shaderProgramBlurX);
            index = this.gl.getUniformBlockIndex(this.shaderProgramBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurX, index, 0);

            // This might have to be done every frame if we ever have multiple UBOs.
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, uboBuffer);
            let bigBlurArray = new Array(36).fill(0)
                for(let iblur=0;iblur<gaussianBlurs[this.blurSize];iblur++){
                    bigBlurArray[iblur] = gaussianBlurs[this.blurSize][iblur];
                }

            const bigFloatArray = new Float32Array(gaussianBlurs[this.blurSize]);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row0"].offset, bigFloatArray.subarray( 0, 4), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row1"].offset, bigFloatArray.subarray( 4, 8), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row2"].offset, bigFloatArray.subarray( 8,12), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row3"].offset, bigFloatArray.subarray(12,16), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row4"].offset, bigFloatArray.subarray(16,20), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row5"].offset, bigFloatArray.subarray(20,24), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row6"].offset, bigFloatArray.subarray(24,28), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row7"].offset, bigFloatArray.subarray(28,32), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["row8"].offset, bigFloatArray.subarray(32,36), 0);
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["nsteps"].offset, new Int32Array([this.blurSize]), 0);
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null)
        }

    }

    startSpinTest() {
        this.doSpin = true;
        requestAnimationFrame(this.doSpinTestFrame.bind(this));
    }

    stopSpinTest() {
        this.doSpin = false;
    }

    doSpinTestFrame() {
        let xQ = createXQuatFromDX(0);
        let yQ = createYQuatFromDY(1);
        quat4.multiply(xQ, xQ, yQ);
        quat4.multiply(this.myQuat, this.myQuat, xQ);
        this.drawScene()
        if(this.doSpin)
            requestAnimationFrame(this.doSpinTestFrame.bind(this));
    }

    setSpinTestState(doSpin) {
        this.doSpin = doSpin;
        if(this.doSpin){
            this.startSpinTest();
        } else {
            this.stopSpinTest();
        }
    }

    setOutlinesOn(doOutline) {
        this.doStenciling = doOutline;
    }

    setShadowsOn(doShadow) {
        this.doShadow = doShadow;
    }

    setShadowDepthDebug(doShadowDebug) {
        /*
        this.doShadowDepthDebug = doShadowDebug;
        this.doShadow = false;
        if(this.doShadowDepthDebug)
            this.doShadow = true;
        if(this.doShadow&&!this.screenshotBuffersReady) this.initTextureFramebuffer();
        */
    }

    componentDidUpdate(oldProps) {
        if (oldProps.width !== this.props.width || oldProps.height !== this.props.height) {
            this.resize(this.props.width, this.props.height)
        }
        if (oldProps.showCrosshairs !== this.props.showCrosshairs){
            this.showCrosshairs = this.props.showCrosshairs
            this.drawScene()
        }
        if (oldProps.showAxes !== this.props.showAxes){
            this.showAxes = this.props.showAxes
            this.drawScene()
        }
        if (oldProps.showFPS !== this.props.showFPS){
            this.showFPS = this.props.showFPS
            this.drawScene()
        }
        if (oldProps.mapLineWidth !== this.props.mapLineWidth){
            this.mapLineWidth = this.props.mapLineWidth
            this.setOrigin(this.origin, true)
            this.drawScene()
        }
    }

    componentDidMount() {
        this.canvas = this.canvasRef.current;
        const self = this;
        this.activeMolecule = null;
        this.draggableMolecule = null;
        this.currentlyDraggedAtom = null;
        /*
        window.addEventListener('resize',
                function(evt){
            self.setState({width:window.innerWidth/3, height:window.innerHeight/3}, ()=> self.resize(window.innerWidth/3, window.innerHeight/3));
                },
                false);
                */
        this.fogClipOffset = 50;
        this.doPerspectiveProjection = false;

        this.shinyBack = true;
        this.backColour = "default";

        this.ready = false;
        this.gl = null;
        this.background_colour = [1.0, 1.0, 1.0, 1];
        this.textTex = null;
        this.origin = [0.0, 0.0, 0.0];
        this.radius = 60.0;
        this.moveFactor = 1.0;
        this.init_x = null;
        this.init_y = null;
        this.mouseDown_x = null;
        this.mouseDown_y = null;
        this.dx = null;
        this.dy = null;
        this.myQuat = null;
        this.mouseDown = null;
        this.mouseMoved = null;
        this.zoom = null;
        this.ext = null;
        this.instanced_ext = null;
        this.frag_depth_ext = null;
        this.gl_fog_start = null;
        this.gl_fog_end = null;
        this.gl_nClipPlanes = null;
        this.shaderProgram = null;
        this.shaderProgramTextBackground = null;
        this.shaderProgramCircles = null;
        this.shaderProgramLines = null;
        this.shaderProgramPointSpheres = null;

        this.mvMatrix = mat4.create();
        this.mvInvMatrix = mat4.create();
        this.screenZ = vec3.create();
        this.pMatrix = mat4.create();

        this.gl_clipPlane0 = null;
        this.gl_clipPlane1 = null;
        this.gl_clipPlane2 = null;
        this.gl_clipPlane3 = null;
        this.gl_clipPlane4 = null;
        this.gl_clipPlane5 = null;
        this.gl_clipPlane6 = null;
        this.gl_clipPlane7 = null;

        this.displayBuffers = [];
        this.currentBufferIdx = -1;

        this.save_pixel_data = false;
        this.renderToTexture = false;

        this.doStenciling = false;

        this.doShadow = false;

        this.doSpin = false;

        //Debugging only
        this.doShadowDepthDebug = false;
        if(this.doShadowDepthDebug)
            this.doShadow = true;

        this.offScreenFramebuffer = null;
        this.useOffScreenBuffers = false;
        this.blurSize = 3;
        this.blurDepth = 0.2;
        this.offScreenReady = false;
        this.framebufferDrawBuffersReady = false;
        this.screenshotBuffersReady = false;

        this.textCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
        this.circleCtx = document.createElement("canvas").getContext("2d");

        this.myQuat = quat4.create();
        quat4.set(this.myQuat, 0, 0, 0, -1);
        //var testmat = quatToMat4(this.myQuat)
        //alert(mat4.str(testmat))
        this.setZoom(1.0)

        this.gl_clipPlane0 = new Float32Array(4);
        this.gl_clipPlane1 = new Float32Array(4);
        this.gl_clipPlane1[0] = 0.0;
        this.gl_clipPlane1[1] = 0.0;
        this.gl_clipPlane1[2] = 1.0;
        this.gl_clipPlane1[3] = 1000.0;
        this.gl_clipPlane0[0] = 0.0;
        this.gl_clipPlane0[1] = 0.0;
        this.gl_clipPlane0[2] = -1.0;
        this.gl_clipPlane0[3] = -0.0;
        this.gl_clipPlane2 = new Float32Array(4);
        this.gl_clipPlane3 = new Float32Array(4);
        this.gl_clipPlane4 = new Float32Array(4);
        this.gl_clipPlane5 = new Float32Array(4);
        this.gl_clipPlane6 = new Float32Array(4);
        this.gl_clipPlane7 = new Float32Array(4);
        this.clipCapPerfectSpheres = false;
        this.labelledAtoms = [];
        this.measuredAtoms = [];
        this.ids = [];

        this.gl_cursorPos = new Float32Array(2);
        this.gl_cursorPos[0] = this.canvas.width / 2.;
        this.gl_cursorPos[1] = this.canvas.height / 2.;

        const glc = initGL(this.canvas);
        this.gl = glc.gl;
        this.WEBGL2 = glc.WEBGL2;

        //self.setState({width:window.innerWidth/3, height:window.innerHeight/3}, ()=> self.resize(window.innerWidth/3, window.innerHeight/3));
        const extensionArray = this.gl.getSupportedExtensions();

        //this.stuartTexture = initTextures(this.gl);

        if (this.WEBGL2) {
            this.ext = true;
            this.frag_depth_ext = true;
            this.instanced_ext = true;
            this.depth_texture = true;
        } else {
            this.ext = this.gl.getExtension("OES_element_index_uint");
            if (!this.ext) {
                alert("No OES_element_index_uint support");
            }
            console.log("##################################################");
            console.log("Got extension");
            console.log(this.ext);
            this.frag_depth_ext = this.gl.getExtension("EXT_frag_depth");
            this.depth_texture = this.gl.getExtension("WEBGL_depth_texture");
            this.instanced_ext = this.gl.getExtension("ANGLE_instanced_arrays");
            if (!this.instanced_ext) {
                alert("No instancing support");
            }
            if (!this.depth_texture) {
                this.depth_texture = this.gl.getExtension("MOZ_WEBGL_depth_texture");
                if (!this.depth_texture) {
                    this.depth_texture = this.gl.getExtension("WEBKIT_WEBGL_depth_texture");
                    if (!this.depth_texture) {
                        alert("No depth texture extension");
                    }
                }
            }
        }

        this.textLegends = [];
        this.newTextLabels = [];
        //this.newTextLabels.push([{font:"20px helvetica",x:0,y:0,z:0,text:"Welcome to Moorhen"}]);

        //this.textLegends.push({font:"40px helvetica",x:0,y:0,text:"So Moorhen is a cool program_œ∑´®¥¨^øπ“‘«æ…¬˚∆˙©ƒ∂ßåΩ≈ç√∫~µ≤≥¡€#¢∞§¶•ªº–≠§±;:|abcdefghijklmnopqrs"});
        //this.textLegends.push({font:"40px times",x:0.25,y:0.25,text:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@£$%^&*()"});
        //this.textLegends.push({font:"20px helvetica",x:0,y:0,text:"Welcome to Moorhen"});

        this.textHeightScaling = 800.;
        if(this.doShadow) this.initTextureFramebuffer(); //This is testing only

        if (!this.frag_depth_ext) {
            console.log("No EXT_frag_depth support");
            console.log("This is supported in most browsers, except IE. And may never be supported in IE.");
            console.log("This extension is supported in Microsoft Edge, so Windows 10 is required for perfect spheres in MS Browser.");
            console.log("Other browers on Windows 7/8/8.1 do have this extension.");
        }
        this.textTex = this.gl.createTexture();
        this.circleTex = this.gl.createTexture();

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.circleTex);
        this.makeCircleCanvas("H", 128, 128, "black");
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.circleCtx.canvas);

        this.gl_nClipPlanes = 0;
        this.gl_fog_start = this.fogClipOffset;
        this.gl_fog_end = 1000.+this.fogClipOffset;
        //this.gl.lineWidth(2.0);
        this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.enable(this.gl.BLEND);

        // Sigh doing the old-fashioned way for IE.
        this.statusChangedEvent = document.createEvent('Event');
        this.statusChangedEvent.initEvent('statusChanged', true, true);

        this.viewChangedEvent = document.createEvent('Event');
        this.viewChangedEvent.initEvent('viewChanged', true, true);

        this.fogChangedEvent = document.createEvent('Event');
        this.fogChangedEvent.initEvent('fogChanged', true, true);

        this.clipChangedEvent = document.createEvent('Event');
        this.clipChangedEvent.initEvent('clipChanged', true, true);

        let vertexShader;
        let fragmentShader;
        let blurVertexShader;
        let overlayFragmentShader;
        let blurXFragmentShader;
        let blurYFragmentShader;
        let lineVertexShader;
        let thickLineVertexShader;
        let thickLineNormalVertexShader;
        let lineFragmentShader;
        let textVertexShader;
        let textVertexShaderInstanced;
        let circlesVertexShader;
        let textFragmentShader;
        let circlesFragmentShader;
        let pointSpheresVertexShader;
        let pointSpheresFragmentShader;
        let twoDShapesFragmentShader;
        let twoDShapesVertexShader;
        let renderFrameBufferFragmentShader;
        let perfectSphereFragmentShader;
        let perfectSphereOutlineFragmentShader;

        let shadowVertexShader; //Depth pass
        let shadowVertexShaderInstanced; //Depth pass
        let shadowFragmentShader; //Depth pass
        let shadowDepthPerfectSphereFragmentShader; //Depth pass
        let shadowDeptTwoDShapesVertexShader; //Depth pass

        this.doRedraw = false;
        setInterval(function () { self.drawSceneIfDirty() }, 16);

        let blur_vertex_shader_source = blur_vertex_shader_source_webgl1;
        let blur_x_fragment_shader_source = blur_x_fragment_shader_source_webgl1;
        let overlay_fragment_shader_source = overlay_fragment_shader_source_webgl1;
        let blur_y_fragment_shader_source = blur_y_fragment_shader_source_webgl1;
        let lines_fragment_shader_source = lines_fragment_shader_source_webgl1;
        let text_instanced_vertex_shader_source = text_instanced_vertex_shader_source_webgl1;
        let lines_vertex_shader_source = lines_vertex_shader_source_webgl1;
        let perfect_sphere_fragment_shader_source = perfect_sphere_fragment_shader_source_webgl1;
        let perfect_sphere_outline_fragment_shader_source = perfect_sphere_outline_fragment_shader_source_webgl1;
        let pointspheres_fragment_shader_source = pointspheres_fragment_shader_source_webgl1;
        let pointspheres_vertex_shader_source = pointspheres_vertex_shader_source_webgl1;
        let render_framebuffer_fragment_shader_source = render_framebuffer_fragment_shader_source_webgl1;
        let shadow_fragment_shader_source = shadow_fragment_shader_source_webgl1;
        let flat_colour_fragment_shader_source = flat_colour_fragment_shader_source_webgl1;
        let shadow_depth_perfect_sphere_fragment_shader_source = shadow_depth_perfect_sphere_fragment_shader_source_webgl1;
        let shadow_depth_twod_vertex_shader_source = shadow_depth_twod_vertex_shader_source_webgl1;
        let shadow_vertex_shader_source = shadow_vertex_shader_source_webgl1;
        let shadow_instanced_vertex_shader_source = shadow_instanced_vertex_shader_source_webgl1;
        let text_fragment_shader_source = text_fragment_shader_source_webgl1;
        let circles_fragment_shader_source = circles_fragment_shader_source_webgl1;
        let circles_vertex_shader_source = circles_vertex_shader_source_webgl1;
        let thick_lines_vertex_shader_source = thick_lines_vertex_shader_source_webgl1;
        let thick_lines_normal_vertex_shader_source = thick_lines_normal_vertex_shader_source_webgl1;
        let triangle_fragment_shader_source = triangle_fragment_shader_source_webgl1;
        let triangle_vertex_shader_source = triangle_vertex_shader_source_webgl1;
        let twod_fragment_shader_source = twod_fragment_shader_source_webgl1;
        let twod_vertex_shader_source = twod_vertex_shader_source_webgl1;
        let triangle_instanced_vertex_shader_source = triangle_instanced_vertex_shader_source_webgl1;

        if(this.WEBGL2){
            blur_vertex_shader_source = blur_vertex_shader_source_webgl2;
            blur_x_fragment_shader_source = blur_x_fragment_shader_source_webgl2;
            overlay_fragment_shader_source = overlay_fragment_shader_source_webgl2;
            blur_y_fragment_shader_source = blur_y_fragment_shader_source_webgl2;
            lines_fragment_shader_source = lines_fragment_shader_source_webgl2;
            text_instanced_vertex_shader_source = text_instanced_vertex_shader_source_webgl2;
            lines_vertex_shader_source = lines_vertex_shader_source_webgl2;
            perfect_sphere_fragment_shader_source = perfect_sphere_fragment_shader_source_webgl2;
            perfect_sphere_outline_fragment_shader_source = perfect_sphere_outline_fragment_shader_source_webgl2;
            pointspheres_fragment_shader_source = pointspheres_fragment_shader_source_webgl2;
            pointspheres_vertex_shader_source = pointspheres_vertex_shader_source_webgl2;
            render_framebuffer_fragment_shader_source = render_framebuffer_fragment_shader_source_webgl2;
            shadow_fragment_shader_source = shadow_fragment_shader_source_webgl2;
            flat_colour_fragment_shader_source = flat_colour_fragment_shader_source_webgl2;
            shadow_depth_perfect_sphere_fragment_shader_source = shadow_depth_perfect_sphere_fragment_shader_source_webgl2;
            shadow_depth_twod_vertex_shader_source = shadow_depth_twod_vertex_shader_source_webgl2;
            shadow_vertex_shader_source = shadow_vertex_shader_source_webgl2;
            shadow_instanced_vertex_shader_source = shadow_instanced_vertex_shader_source_webgl2;
            text_fragment_shader_source = text_fragment_shader_source_webgl2;
            circles_fragment_shader_source = circles_fragment_shader_source_webgl2;
            circles_vertex_shader_source = circles_vertex_shader_source_webgl2;
            thick_lines_vertex_shader_source = thick_lines_vertex_shader_source_webgl2;
            thick_lines_normal_vertex_shader_source = thick_lines_normal_vertex_shader_source_webgl2;
            triangle_fragment_shader_source = triangle_fragment_shader_source_webgl2;
            triangle_vertex_shader_source = triangle_vertex_shader_source_webgl2;
            twod_fragment_shader_source = twod_fragment_shader_source_webgl2;
            twod_vertex_shader_source = twod_vertex_shader_source_webgl2;
            triangle_instanced_vertex_shader_source = triangle_instanced_vertex_shader_source_webgl2;
        }

        vertexShader = getShader(self.gl, triangle_vertex_shader_source, "vertex");
        const vertexShaderInstanced = getShader(self.gl, triangle_instanced_vertex_shader_source, "vertex");
        fragmentShader = getShader(self.gl, triangle_fragment_shader_source, "fragment");
        lineVertexShader = getShader(self.gl, lines_vertex_shader_source, "vertex");
        thickLineVertexShader = getShader(self.gl, thick_lines_vertex_shader_source, "vertex");
        thickLineNormalVertexShader = getShader(self.gl, thick_lines_normal_vertex_shader_source, "vertex");
        blurVertexShader = getShader(self.gl, blur_vertex_shader_source, "vertex");
        blurXFragmentShader = getShader(self.gl, blur_x_fragment_shader_source, "fragment");
        overlayFragmentShader = getShader(self.gl, overlay_fragment_shader_source, "fragment");
        blurYFragmentShader = getShader(self.gl, blur_y_fragment_shader_source, "fragment");
        lineFragmentShader = getShader(self.gl, lines_fragment_shader_source, "fragment");
        textVertexShader = getShader(self.gl, triangle_vertex_shader_source, "vertex");
        textVertexShaderInstanced = getShader(self.gl, text_instanced_vertex_shader_source, "vertex");
        circlesVertexShader = getShader(self.gl, circles_vertex_shader_source, "vertex");
        textFragmentShader = getShader(self.gl, text_fragment_shader_source, "fragment");
        circlesFragmentShader = getShader(self.gl, circles_fragment_shader_source, "fragment");
        pointSpheresVertexShader = getShader(self.gl, pointspheres_vertex_shader_source, "vertex");
        pointSpheresFragmentShader = getShader(self.gl, pointspheres_fragment_shader_source, "fragment");
        twoDShapesVertexShader = getShader(self.gl, twod_vertex_shader_source, "vertex");
        twoDShapesFragmentShader = getShader(self.gl, twod_fragment_shader_source, "fragment");
        renderFrameBufferFragmentShader = getShader(self.gl, render_framebuffer_fragment_shader_source, "fragment");
        const flatColourFragmentShader = getShader(self.gl, flat_colour_fragment_shader_source, "fragment");
        if (self.frag_depth_ext) {
            perfectSphereFragmentShader = getShader(self.gl, perfect_sphere_fragment_shader_source, "fragment");
            perfectSphereOutlineFragmentShader = getShader(self.gl, perfect_sphere_outline_fragment_shader_source, "fragment");
            shadowVertexShader = getShader(self.gl, shadow_vertex_shader_source, "vertex");
            shadowVertexShaderInstanced = getShader(self.gl, shadow_instanced_vertex_shader_source, "vertex");
            shadowFragmentShader = getShader(self.gl, shadow_fragment_shader_source, "fragment");
            self.initShadowShaders(shadowVertexShader, shadowFragmentShader);
            self.initInstancedShadowShaders(shadowVertexShaderInstanced, shadowFragmentShader);
            self.initInstancedOutlineShaders(vertexShaderInstanced, flatColourFragmentShader);
        }

        self.initRenderFrameBufferShaders(blurVertexShader, renderFrameBufferFragmentShader);
        self.initLineShaders(lineVertexShader, lineFragmentShader);
        self.initOverlayShader(blurVertexShader, overlayFragmentShader);
        self.initBlurXShader(blurVertexShader, blurXFragmentShader);
        self.initBlurYShader(blurVertexShader, blurYFragmentShader);
        self.initThickLineShaders(thickLineVertexShader, lineFragmentShader);
        self.initThickLineNormalShaders(thickLineNormalVertexShader, fragmentShader);
        self.initPointSpheresShaders(pointSpheresVertexShader, pointSpheresFragmentShader);
        self.initTwoDShapesShaders(twoDShapesVertexShader, twoDShapesFragmentShader);
        self.initImageShaders(twoDShapesVertexShader, textFragmentShader);
        if (self.frag_depth_ext) {
            self.initPerfectSphereShaders(twoDShapesVertexShader, perfectSphereFragmentShader);
            self.initPerfectSphereOutlineShaders(twoDShapesVertexShader, perfectSphereOutlineFragmentShader);
            shadowDepthPerfectSphereFragmentShader = getShader(self.gl, shadow_depth_perfect_sphere_fragment_shader_source, "fragment");
            shadowDeptTwoDShapesVertexShader = getShader(self.gl, shadow_depth_twod_vertex_shader_source, "vertex");
            self.initDepthShadowPerfectSphereShaders(shadowDepthPerfectSphereFragmentShader, shadowDeptTwoDShapesVertexShader);
        }
        self.initTextBackgroundShaders(textVertexShader, textFragmentShader);
        self.initTextInstancedShaders(textVertexShaderInstanced, textFragmentShader);
        self.gl.disableVertexAttribArray(self.shaderProgramTextBackground.vertexTextureAttribute);
        self.initCirclesShaders(circlesVertexShader, circlesFragmentShader);
        self.gl.disableVertexAttribArray(self.shaderProgramCircles.vertexTextureAttribute);
        self.initShaders(vertexShader, fragmentShader);
        self.initOutlineShaders(vertexShader, flatColourFragmentShader);
        self.initShadersInstanced(vertexShaderInstanced, fragmentShader);

        self.buildBuffers();

        this.measureTextCanvasTexture = new TextCanvasTexture(this,1024,2048);
        this.labelsTextCanvasTexture = new TextCanvasTexture(this,64,2048);

        self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
        self.gl.enable(self.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        self.origin = [0.0, 0.0, 0.0];
        //const shader_version = self.gl.getParameter(self.gl.SHADING_LANGUAGE_VERSION);

        self.mouseDown = false;
        self.mouseDownButton = -1;

        if (this.doneEvents === undefined) {
            self.canvas.addEventListener("mousedown",
                function (evt) {
                    self.doMouseDown(evt, self);
                    evt.stopPropagation();
                },
                false);
                self.canvas.addEventListener("mouseup",
                function (evt) {
                    self.doMouseUp(evt, self);
                },
                false);
            self.canvas.addEventListener("contextmenu",
                function (evt) {
                    self.doRightClick(evt, self);
                    evt.stopPropagation();
                    evt.preventDefault();
                },
                false);
            self.canvas.addEventListener("mousedown",
                function (evt) {
                    if (evt.which === 1) {
                        self.doClick(evt, self);
                        evt.stopPropagation();
                    } else if (evt.which === 2) {
                        evt.stopPropagation();
                    } else {
                        self.doRightClick(evt, self);
                        evt.stopPropagation();
                        evt.preventDefault();
                    }
                },
                false);
            self.canvas.addEventListener("dblclick",
                function (evt) {
                    self.doDoubleClick(evt, self);
                    evt.stopPropagation();
                },
                false);
            self.canvas.addEventListener("mousemove",
                function (evt) {
                    self.doMouseMove(evt, self);
                    evt.stopPropagation();
                },
                false);
            self.canvas.addEventListener("mouseenter",
                function (evt) {
                    document.onkeydown = function (evt2) {
                        self.handleKeyDown(evt2, self);
                    }
                    document.onkeyup = function (evt2) {
                        self.handleKeyUp(evt2, self);
                    }
                },
                false);
            self.canvas.addEventListener("mouseleave",
                function (evt) {
                    document.onkeydown = function (evt2) {
                    }
                },
                false);
            self.canvas.addEventListener("wheel",
                function (evt) {
                    self.doWheel(evt);
                    evt.stopPropagation();
                    evt.preventDefault();
                },
                false);
            self.canvas.addEventListener('touchstart',
                function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const touchobj = e.changedTouches[0];
                    let evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, button: 0 };
                    //alert(e.changedTouches.length)
                    if (e.changedTouches.length === 1) {
                    }
                    else if (e.changedTouches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    self.doMouseDown(evt, self);
                    self.mouseDownedAt = (e.timeStamp)

                }, false)

            self.canvas.addEventListener('touchmove',
                function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const touchobj = e.touches[0]; // reference first touch point for this event
                    let evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, button: 0 };
                    if (e.touches.length === 1) {
                    }
                    else if (e.touches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    self.doMouseMove(evt, self);

                }, false)

            self.canvas.addEventListener('touchend',
                function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var touchobj = e.changedTouches[0]; // reference first touch point for this event
                    var evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, button: 0 };
                    if (e.changedTouches.length === 1) {
                    }
                    else if (e.changedTouches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    var deltaTime = e.timeStamp - self.mouseDownedAt;
                    if (deltaTime < 300) {
                        self.doClick(evt, self);
                        //alert("Doclicking");
                    }
                    self.doMouseUp(evt, self);
                }, false)
        }
        this.doneEvents = true;

        self.gl.viewportWidth = self.canvas.width;
        self.gl.viewportHeight = self.canvas.height;
        self.light_positions = new Float32Array([0.0, 0.0, 60.0, 1.0]);
        self.light_colours_ambient = new Float32Array([0.0, 0.0, 0.0, 1.0]);
        self.light_colours_specular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        self.light_colours_diffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        self.specularPower = 64.0;

        self.setBlurSize(self.blurSize);

        self.drawScene();
        self.ready = true;
        return;

    }

    setActiveMolecule(molecule: moorhen.Molecule) : void {
        this.activeMolecule = molecule;
    }

    appendOtherData(jsondata: any, skipRebuild?: boolean, name?: string) : any {
        //console.log("**************************************************");
        //console.log("appendOtherData");
        //console.log(jsondata);
        //console.log("**************************************************");
        //This can be used to *add* arbitrary triangles to a scene. Not much luck with replacing scene by this, yet.
        //This currently deals with actual numbers rather than the uuencoded stuff we get from server, but it will
        //be changed to handle both.

        //Might also be nice to use this as a test-bed for creating more abstract primitives: circles, squares, stars, etc.

        const self = this;

        var theseBuffers = [];

        for (let idat = 0; idat < jsondata.norm_tri.length; idat++) {
            if(jsondata.prim_types){
                if(jsondata.prim_types[idat].length>0){
                    if(jsondata.prim_types[idat][0]==="TEXTLABELS"){
                        let labels = []
                        for(let ilabel=0;ilabel<jsondata.idx_tri[idat].length;ilabel++){
                            const t = jsondata.label_tri[idat][ilabel];
                            const x = jsondata.vert_tri[idat][ilabel*3];
                            const y = jsondata.vert_tri[idat][ilabel*3+1];
                            const z = jsondata.vert_tri[idat][ilabel*3+2];
                            const label = {font:self.glTextFont,x:x,y:y,z:z,text:t};
                            labels.push(label);
                        }
                        labels.forEach(label => {
                            this.labelsTextCanvasTexture.addBigTextureTextImage({font:label.font,text:label.text,x:label.x,y:label.y,z:label.z})
                        })
                        theseBuffers.push({labels:labels});
                        this.labelsTextCanvasTexture.recreateBigTextureBuffers();
                        this.buildBuffers();
                        continue
                    }
                }
            }

            //self.currentBufferIdx = idat;
            self.currentBufferIdx = self.displayBuffers.length;
            self.displayBuffers.push(new DisplayBuffer());
            theseBuffers.push(self.displayBuffers[self.currentBufferIdx]);

            let rssentries = jsondata.norm_tri[idat];
            const norms = rssentries;
            for (let i = 0; i < norms.length; i++) {
                self.createNormalBuffer(norms[i]);
            }

            if (jsondata.instance_origins) {
                rssentries = jsondata.instance_origins[idat];
                if(rssentries){
                    let instance_origins = rssentries;
                    for (let i = 0; i < instance_origins.length; i++) {
                        self.createInstanceOriginsBuffer(instance_origins[i]);
                    }
                }
            }

            if (jsondata.instance_sizes) {
                rssentries = jsondata.instance_sizes[idat];
                if(rssentries){
                    let instance_sizes = rssentries;
                    for (let i = 0; i < instance_sizes.length; i++) {
                        self.createInstanceSizesBuffer(instance_sizes[i]);
                    }
                }
            }

            if (jsondata.instance_orientations) {
                rssentries = jsondata.instance_orientations[idat];
                if(rssentries){
                    let instance_orientations = rssentries;
                    for (let i = 0; i < instance_orientations.length; i++) {
                        self.createInstanceOrientationsBuffer(instance_orientations[i]);
                    }
                }
            }

            if (jsondata.additional_norm_tri) {
                rssentries = jsondata.additional_norm_tri[idat];
                let add_norms = rssentries;
                for (let i = 0; i < add_norms.length; i++) {
                    self.createRealNormalBuffer(add_norms[i]); //This is dummy data. It will be blatted.
                }
            }

            rssentries = jsondata.vert_tri[idat];
            const tris = rssentries;
            //console.log(rssentries);

            for (let i = 0; i < tris.length; i++) {
                self.createVertexBuffer(tris[i]);
            }

            rssentries = jsondata.idx_tri[idat];
            var idxs = rssentries;
            //console.log(rssentries);

            for (let i = 0; i < idxs.length; i++) {
                for (var j = 0; j < idxs[i].length; j++) {
                }
                self.createIndexBuffer(idxs[i]);
            }

            if (typeof (jsondata.instance_use_colors) !== "undefined") {
                if (typeof (jsondata.instance_use_colors[idat]) !== "undefined") {
                    rssentries = jsondata.instance_use_colors[idat];
                    if(rssentries){
                        for (let i = 0; i < rssentries.length; i++) {
                            self.addSupplementaryInfo(rssentries[i], "instance_use_colors");
                        }
                    }
                }
            }

            if (typeof (jsondata.useIndices) !== "undefined") {
                if (typeof (jsondata.useIndices[idat]) !== "undefined") {
                    rssentries = getEncodedData(jsondata.useIndices[idat]);
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "useIndices");
                    }
                }
            }

            if (typeof (jsondata.radii) !== "undefined") {
                if (typeof (jsondata.radii[idat]) !== "undefined") {
                    rssentries = jsondata.radii[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "radii");
                    }
                }
            }

            if (typeof (jsondata.scale_matrices) !== "undefined") {
                if (typeof (jsondata.scale_matrices[idat]) !== "undefined") {
                    rssentries = jsondata.scale_matrices[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "scale_matrices");
                    }
                }
            }

            if (typeof (jsondata.customSplineNormals) !== "undefined") {
                if (typeof (jsondata.customSplineNormals[idat]) !== "undefined") {
                    rssentries = jsondata.customSplineNormals[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "customSplineNormals");
                    }
                }
            }

            if (typeof (jsondata.spline_accu) !== "undefined") {
                if (typeof (jsondata.spline_accu[idat]) !== "undefined") {
                    rssentries = jsondata.spline_accu[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "spline_accu");
                    }
                }
            }

            if (typeof (jsondata.accu) !== "undefined") {
                if (typeof (jsondata.accu[idat]) !== "undefined") {
                    rssentries = jsondata.accu[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "accu");
                    }
                }
            }

            if (typeof (jsondata.arrow) !== "undefined") {
                if (typeof (jsondata.arrow[idat]) !== "undefined") {
                    rssentries = jsondata.arrow[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "arrow");
                    }
                }
            }

            if (typeof (jsondata.vert_tri_2d) !== "undefined") {
                if (typeof (jsondata.vert_tri_2d[idat]) !== "undefined") {
                    rssentries = jsondata.vert_tri_2d[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "vert_tri_2d");
                    }
                }
            }

            if (typeof (jsondata.font) !== "undefined") {
                if (typeof (jsondata.font[idat]) !== "undefined") {
                    rssentries = jsondata.font[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "font");
                    }
                }
            }

            if (typeof (jsondata.imgsrc) !== "undefined") {
                if (typeof (jsondata.imgsrc[idat]) !== "undefined") {
                    rssentries = jsondata.imgsrc[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "imgsrc");
                    }
                }
            }

            if (typeof (jsondata.sizes) !== "undefined") {
                if (typeof (jsondata.sizes[idat]) !== "undefined") {
                    //rssentries = getEncodedData(jsondata.sizes[idat]);
                    rssentries = jsondata.sizes[idat];
                    for (let i = 0; i < rssentries.length; i++) {
                        self.createSizeBuffer(rssentries[i]);
                    }
                }
            }

            if (typeof (jsondata.vertices2d) !== "undefined") {
                if (typeof (jsondata.vertices2d[idat]) !== "undefined") {
                    rssentries = getEncodedData(jsondata.vertices2d[idat]);
                    for (let i = 0; i < rssentries.length; i++) {
                        self.addSupplementaryInfo(rssentries[i], "vertices2d");
                    }
                }
            }

            rssentries = jsondata.col_tri[idat];
            let colours = rssentries;
            //console.log(rssentries);

            for (let i = 0; i < colours.length; i++) {
                self.createColourBuffer(colours[i]);
            }

            rssentries = jsondata.prim_types[idat];
            //console.log(rssentries);
            for (let i = 0; i < rssentries.length; i++) {
                self.displayBuffers[self.currentBufferIdx].bufferTypes.push(rssentries[i]);
            }

            //console.log(jsondata);
            if (typeof (jsondata.visibility) !== "undefined") {
                if (typeof (jsondata.visibility[idat]) !== "undefined") {
                    const thisVis = jsondata.visibility[idat];
                    self.displayBuffers[self.currentBufferIdx].visible = thisVis;
                }
            } else {
                // Don't know when this can be triggered ...
                const thisVis = true;
                if (!thisVis) {
                    self.displayBuffers[self.currentBufferIdx].visible = false;
                }
            }

            //var thisName = jsondata.names[idat];
            self.displayBuffers[self.currentBufferIdx].name_label = "foo";
            self.displayBuffers[self.currentBufferIdx].id = guid();

            //var atoms = jsondata.atoms[idat];
            if (typeof (jsondata.atoms) !== "undefined") {
                self.displayBuffers[self.currentBufferIdx].atoms = jsondata.atoms[idat][0];
            } else {
                self.displayBuffers[self.currentBufferIdx].atoms = [];
            }

            if(jsondata.clickTol){
                self.displayBuffers[self.currentBufferIdx].clickTol = jsondata.clickTol;
            }
            if(jsondata.doStencil){
                self.displayBuffers[self.currentBufferIdx].doStencil = jsondata.doStencil;
            }

        }

        if (typeof (skipRebuild) !== "undefined" && skipRebuild) {
            return theseBuffers;
        }

        self.buildBuffers();
        self.drawScene();
        return theseBuffers;
    }

    setFog(fog) {
        var self = this;
        self.gl_fog_start = this.fogClipOffset + fog[0];
        self.gl_fog_end = this.fogClipOffset + fog[1];
        self.drawScene();
    }

    setSlab(slab) {
        var self = this;
        self.gl_clipPlane0[3] = -this.fogClipOffset + slab[0] * 0.5 + slab[1];
        self.gl_clipPlane1[3] = this.fogClipOffset + slab[0] * 0.5 - slab[1];
        self.drawScene();
    }

    setQuat(q: quat4) : void {
        this.myQuat = q;
        this.drawScene();
    }

    setTextFont(family: string,size: number) : void {
        if(family && size){
            this.glTextFont = ""+size+"px "+family;
            this.updateLabels();
            this.labelsTextCanvasTexture.clearBigTexture();
            //This forces redrawing of environemnt distances
            const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} });
            document.dispatchEvent(originUpdateEvent);
            this.drawScene();
        }
    }

    setBackground(col: [number, number, number, number]) : void {
        this.background_colour = col;
        this.updateLabels()
        //This forces redrawing of environemnt distances
        const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
        document.dispatchEvent(originUpdateEvent);
        this.drawScene();
    }

    setOrientationFrame(qOld, qNew, iframe) {
        const frac = iframe / this.nAnimationFrames;
        const newQuat = this.quatSlerp(qOld, qNew,frac)
        quat4.set(this.myQuat,newQuat[0],newQuat[1],newQuat[2],newQuat[3])
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.setOrientationFrame.bind(this,qOld, qNew,iframe+1))
        }
    }

    setOrientationAndZoomFrame(qOld, qNew, oldZoom, zoomDelta, iframe) {
        const frac = iframe / this.nAnimationFrames;
        const newQuat = this.quatSlerp(qOld, qNew,frac)
        quat4.set(this.myQuat,newQuat[0],newQuat[1],newQuat[2],newQuat[3])
        this.setZoom(oldZoom + iframe * zoomDelta)
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.setOrientationAndZoomFrame.bind(this,qOld, qNew,oldZoom,zoomDelta,iframe+1))
        }
    }

    setOrientationAndZoomAnimated(q,z) {
        this.nAnimationFrames = 15;
        let oldQuat = quat4.create();
        let oldZoom = this.zoom;
        const zoomDelta = (z - this.zoom) / this.nAnimationFrames
        quat4.set(oldQuat,this.myQuat[0],this.myQuat[1],this.myQuat[2],this.myQuat[3])
        requestAnimationFrame(this.setOrientationAndZoomFrame.bind(this,oldQuat,q,oldZoom,zoomDelta,1))
    }

    setOrientationAnimated(q) {
        this.nAnimationFrames = 15;
        let oldQuat = quat4.create()
        quat4.set(oldQuat,this.myQuat[0],this.myQuat[1],this.myQuat[2],this.myQuat[3])
        requestAnimationFrame(this.setOrientationFrame.bind(this,oldQuat,q,1))
    }

    setOriginOrientationAndZoomFrame(oo,d,qOld, qNew, oldZoom, zoomDelta, iframe) {
        const frac = iframe / this.nAnimationFrames;
        const newQuat = this.quatSlerp(qOld, qNew,frac)
        quat4.set(this.myQuat,newQuat[0],newQuat[1],newQuat[2],newQuat[3])
        this.setZoom(oldZoom + iframe * zoomDelta)
        this.origin = [oo[0]+iframe*d[0],oo[1]+iframe*d[1],oo[2]+iframe*d[2]];
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.setOriginOrientationAndZoomFrame.bind(this,oo,d,qOld,qNew,oldZoom,zoomDelta,iframe+1))
            return
        }
        const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
        document.dispatchEvent(originUpdateEvent);
    }

    setViewAnimated(o,q,z) {
        this.setOriginOrientationAndZoomAnimated(o,q,z)
    }

    setOriginOrientationAndZoomAnimated(o: number[],q: quat4,z: number) : void {
        this.nAnimationFrames = 15;
        const old_x = this.origin[0]
        const old_y = this.origin[1]
        const old_z = this.origin[2]
        const new_x = o[0]
        const new_y = o[1]
        const new_z = o[2]
        const DX = new_x - old_x
        const DY = new_y - old_y
        const DZ = new_z - old_z
        const dx = DX/this.nAnimationFrames
        const dy = DY/this.nAnimationFrames
        const dz = DZ/this.nAnimationFrames
        let oldQuat = quat4.create();
        let oldZoom = this.zoom;
        const zoomDelta = (z - this.zoom) / this.nAnimationFrames
        quat4.set(oldQuat,this.myQuat[0],this.myQuat[1],this.myQuat[2],this.myQuat[3])
        requestAnimationFrame(this.setOriginOrientationAndZoomFrame.bind(this,[old_x,old_y,old_z],[dx,dy,dz],oldQuat,q,oldZoom,zoomDelta,1))
    }

    setOriginAnimated(o: number[], doDrawScene=true) : void {
        this.nAnimationFrames = 15;
        const old_x = this.origin[0]
        const old_y = this.origin[1]
        const old_z = this.origin[2]
        const new_x = o[0]
        const new_y = o[1]
        const new_z = o[2]
        const DX = new_x - old_x
        const DY = new_y - old_y
        const DZ = new_z - old_z
        const dx = DX/this.nAnimationFrames
        const dy = DY/this.nAnimationFrames
        const dz = DZ/this.nAnimationFrames
        requestAnimationFrame(this.drawOriginFrame.bind(this,[old_x,old_y,old_z],[dx,dy,dz],1))
    }

    drawOriginFrame(oo,d,iframe){
        this.origin = [oo[0]+iframe*d[0],oo[1]+iframe*d[1],oo[2]+iframe*d[2]];
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.drawOriginFrame.bind(this,oo,d,iframe+1))
            return
        }
        const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
        document.dispatchEvent(originUpdateEvent);
    }

    setOrigin(o: [number, number, number], doDrawScene=true, dispatchEvent=true) : void {
        this.origin = o;
        //default is to drawScene, unless doDrawScene provided and value is false
        if (doDrawScene) {
            this.drawScene();
        }
        if (dispatchEvent) {
            const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
            document.dispatchEvent(originUpdateEvent);
        }
    }

    setAmbientLightNoUpdate(r:number, g:number, b:number) : void {
        this.light_colours_ambient = new Float32Array([r, g, b, 1.0]);
    }

    setSpecularLightNoUpdate(r:number, g:number, b:number) : void {
        this.light_colours_specular = new Float32Array([r, g, b, 1.0]);
    }

    setSpecularPowerNoUpdate(p) {
        this.specularPower = p;
    }

    setDiffuseLightNoUpdate(r:number, g:number, b:number) : void {
        this.light_colours_diffuse = new Float32Array([r, g, b, 1.0]);
    }

    setLightPositionNoUpdate(x:number, y:number, z:number) : void {
        this.light_positions = new Float32Array([x, y, z, 1.0]);
    }

    setAmbientLight(r:number, g:number, b:number) : void {
        this.light_colours_ambient = new Float32Array([r, g, b, 1.0]);
        this.drawScene();
    }

    setSpecularLight(r:number, g:number, b:number) : void {
        this.light_colours_specular = new Float32Array([r, g, b, 1.0]);
        this.drawScene();
    }

    setSpecularPower(p:number) : void {
        this.specularPower = p;
        this.drawScene();
    }

    setDiffuseLight(r:number, g:number, b:number) : void {
        this.light_colours_diffuse = new Float32Array([r, g, b, 1.0]);
        this.drawScene();
    }

    setLightPosition(x:number, y:number, z:number) : void {
        this.light_positions = new Float32Array([x, y, z, 1.0]);
        this.drawScene();
    }

    setWheelContour(contourFactor:number, drawScene:boolean) {
        var wheelContourChanged = new CustomEvent("wheelContourLevelChanged", {
            "detail": {
                factor: contourFactor,
            }
        });
        document.dispatchEvent(wheelContourChanged);

        if (drawScene) this.drawScene();
    }

    setZoom(z: number, drawScene?: boolean) {
        const oldZoom = this.zoom
        this.zoom = z;
        var zoomChanged = new CustomEvent("zoomChanged", {
            "detail": {
                oldZoom,
                newZoom: z
            }
        });
        document.dispatchEvent(zoomChanged);

        if (drawScene) this.drawScene();
    }

    setShowAxes(a) {
        this.showAxes = a;
        this.drawScene();
    }

    recreateSilhouetteBuffers(){
        if(!this.silhouetteFramebuffer){
            this.silhouetteFramebuffer = this.gl.createFramebuffer();

            this.silhouetteTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.silhouetteDepthTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteDepthTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.silhouetteRenderbufferDepth = this.gl.createRenderbuffer();
            this.silhouetteRenderbufferColor = this.gl.createRenderbuffer();

        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.silhouetteFramebuffer);
        this.silhouetteFramebuffer.width = this.canvas.width;
        this.silhouetteFramebuffer.height = this.canvas.height;

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.silhouetteRenderbufferColor);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.silhouetteRenderbufferColor);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.silhouetteTexture, 0);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteDepthTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.canvas.width, this.canvas.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.silhouetteDepthTexture, 0);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.silhouetteBufferReady = true;

    }

    recreateOffScreeenBuffers(){
        // This defines an off-screeen multisampled framebuffer and an off-screen framebuffer and texture to blit to.
        if(!this.offScreenFramebuffer){
            this.offScreenFramebuffer = this.gl.createFramebuffer();
            this.offScreenFramebufferColor = this.gl.createFramebuffer();
            this.offScreenFramebufferBlurX = this.gl.createFramebuffer();
            this.offScreenFramebufferBlurY = this.gl.createFramebuffer();

            this.blurXTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.blurYTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.offScreenTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.offScreenDepthTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.offScreenRenderbufferDepth = this.gl.createRenderbuffer();
            this.offScreenRenderbufferColor = this.gl.createRenderbuffer();
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
        this.offScreenFramebuffer.width = this.canvas.width;
        this.offScreenFramebuffer.height = this.canvas.height;

        if (this.WEBGL2) {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferDepth);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.offScreenRenderbufferDepth);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES),
                    this.gl.DEPTH_COMPONENT24, this.canvas.width, this.canvas.height);

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES),
                    this.gl.RGBA8, this.canvas.width, this.canvas.height);
        } else {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.canvas.width, this.canvas.height);
        }


        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferColor);
        this.offScreenFramebufferColor.width = this.canvas.width;
        this.offScreenFramebufferColor.height = this.canvas.height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.offScreenTexture, 0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.canvas.width, this.canvas.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.offScreenDepthTexture, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);
        this.offScreenFramebufferBlurX.width = this.canvas.width;
        this.offScreenFramebufferBlurX.height = this.canvas.height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.blurXTexture, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurY);
        this.offScreenFramebufferBlurY.width = this.canvas.width;
        this.offScreenFramebufferBlurY.height = this.canvas.height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.blurYTexture, 0);

        this.offScreenReady = true;

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    initTextureFramebuffer() : void {

        this.rttFramebuffer = this.gl.createFramebuffer();
        this.rttFramebufferColor = this.gl.createFramebuffer();

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);

        this.rttFramebuffer.width = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),4096);
        this.rttFramebuffer.height = this.rttFramebuffer.width;

        this.rttTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.rttFramebuffer.width, this.rttFramebuffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        //this.gl.generateMipmap(this.gl.TEXTURE_2D);


        if (this.WEBGL2) {
            let renderbufferDepth = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbufferDepth);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, renderbufferDepth);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER,
                                    this.gl.getParameter(this.gl.MAX_SAMPLES),
                                    this.gl.DEPTH24_STENCIL8,
                                    this.rttFramebuffer.width,
                                    this.rttFramebuffer.height);
            let renderbuffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, renderbuffer);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER,
                                    this.gl.getParameter(this.gl.MAX_SAMPLES),
                                    this.gl.RGBA8,
                                    this.rttFramebuffer.width,
                                    this.rttFramebuffer.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferColor);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.rttTexture, 0);
        } else {
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.rttTexture, 0);
            let renderbuffer = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbuffer);
            //Sigh. Maybe DEPTH_STENCIL? Is anyone actually stuck on WebGL1?
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.rttFramebuffer.width, this.rttFramebuffer.height);
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.rttFramebufferDepth = null;
        if (this.depth_texture) {
            this.rttFramebufferDepth = this.gl.createFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferDepth);
            this.rttFramebufferDepth.width = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),4096)//1024;
            this.rttFramebufferDepth.height = Math.min(this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE),this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE),4096)//1024;
            this.rttTextureDepth = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            if (this.WEBGL2) {
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
            } else {
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_SHORT, null);
            }
            var renderbufferCol = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbufferCol);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA4, this.rttFramebufferDepth.width, this.rttFramebufferDepth.height);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.rttTextureDepth, 0);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, renderbufferCol);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        this.screenshotBuffersReady = true;

    }


    quatDotProduct(q1,q2){
        return q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    }

    quatSlerp(q1,q2,h) {
        let cosw = this.quatDotProduct(q1,q2);
        if(Math.abs(cosw-1.0)<1e-5) return q1;
        if(cosw>1.0) cosw = 1.0;
        if(cosw<-1.0) cosw = -1.0;
        const omega = Math.acos(cosw);
        const q1Mult = Math.sin((1.0-h)*omega)
        const q2Mult = Math.sin(h*omega)
        let newQuat = quat4.create()
        const newQuat0 = (q1Mult * q1[0] + q2Mult * q2[0]) / Math.sin(omega)
        const newQuat1 = (q1Mult * q1[1] + q2Mult * q2[1]) / Math.sin(omega)
        const newQuat2 = (q1Mult * q1[2] + q2Mult * q2[2]) / Math.sin(omega)
        const newQuat3 = (q1Mult * q1[3] + q2Mult * q2[3]) / Math.sin(omega)
        quat4.set(newQuat,newQuat0,newQuat1,newQuat2,newQuat3)
        return newQuat
    }

    centreOn(idx) {
        var self = this;
        if (self.displayBuffers[idx].atoms.length > 0) {
            var xtot = 0;
            var ytot = 0;
            var ztot = 0;
            for (var j = 0; j < self.displayBuffers[idx].atoms.length; j++) {
                xtot += self.displayBuffers[idx].atoms[j].x;
                ytot += self.displayBuffers[idx].atoms[j].y;
                ztot += self.displayBuffers[idx].atoms[j].z;
            }
            xtot /= self.displayBuffers[idx].atoms.length;
            ytot /= self.displayBuffers[idx].atoms.length;
            ztot /= self.displayBuffers[idx].atoms.length;

            var new_origin = [-xtot, -ytot, -ztot];
            var old_origin = [self.origin[0], self.origin[1], self.origin[2]];

            var myVar = setInterval(function () { myTimer() }, 10);
            var frac = 0;
            function myTimer() {
                var ffrac = 0.01 * frac;
                self.origin = [ffrac * new_origin[0] + (1.0 - ffrac) * old_origin[0], ffrac * new_origin[1] + (1.0 - ffrac) * old_origin[1], ffrac * new_origin[2] + (1.0 - ffrac) * old_origin[2]];
                self.drawScene();
                if (frac > 99) {
                    clearInterval(myVar);
                }
                frac += 1;
            }
        }
    }

    initTextBuffersBuffer(buffer) {
        buffer.textNormalBuffer = this.gl.createBuffer();
        buffer.textPositionBuffer = this.gl.createBuffer();
        buffer.textColourBuffer = this.gl.createBuffer();
        buffer.textTexCoordBuffer = this.gl.createBuffer();
        buffer.textIndexesBuffer = this.gl.createBuffer();

        buffer.clickLinePositionBuffer = this.gl.createBuffer();
        buffer.clickLineColourBuffer = this.gl.createBuffer();
        buffer.clickLineIndexesBuffer = this.gl.createBuffer();
    }

    initTextBuffers() {
        this.displayBuffers[0].textNormalBuffer = this.gl.createBuffer();
        this.displayBuffers[0].textPositionBuffer = this.gl.createBuffer();
        this.displayBuffers[0].textColourBuffer = this.gl.createBuffer();
        this.displayBuffers[0].textTexCoordBuffer = this.gl.createBuffer();
        this.displayBuffers[0].textIndexesBuffer = this.gl.createBuffer();

        this.displayBuffers[0].clickLinePositionBuffer = this.gl.createBuffer();
        this.displayBuffers[0].clickLineColourBuffer = this.gl.createBuffer();
        this.displayBuffers[0].clickLineIndexesBuffer = this.gl.createBuffer();
    }

    set_clip_range(clipStart: number, clipEnd: number, update?: boolean) : void {
        //console.log("Clip "+clipStart+" "+clipEnd);
        if (typeof (this.gl) === 'undefined') {
            return;
        }
        this.gl_clipPlane0[3] = -this.fogClipOffset - clipStart;
        this.gl_clipPlane1[3] = this.fogClipOffset + clipEnd;
        if (update)
            this.drawScene();
    }

    set_fog_range(fogStart: number, fogEnd: number, update?: boolean) : void {
        this.gl_fog_start = fogStart;
        this.gl_fog_end = fogEnd;
        //console.log("Fog "+this.gl_fog_start+" "+this.gl_fog_end);
        if (typeof (this.gl) === 'undefined') {
            return;
        }
        if (update)
            this.drawScene();
    }

    initInstancedOutlineShaders(vertexShaderOutline, fragmentShaderOutline) {
        this.shaderProgramInstancedOutline = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramInstancedOutline, vertexShaderOutline);
        this.gl.attachShader(this.shaderProgramInstancedOutline, fragmentShaderOutline);
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 4, "instancePosition");
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 5, "instanceSize");
        this.gl.bindAttribLocation(this.shaderProgramInstancedOutline, 6, "instanceOrientation");
        this.gl.linkProgram(this.shaderProgramInstancedOutline);

        if (!this.gl.getProgramParameter(this.shaderProgramInstancedOutline, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (shaderProgramInstancedOutline)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramInstancedOutline));
        }

        this.gl.useProgram(this.shaderProgramInstancedOutline);

        this.shaderProgramInstancedOutline.vertexInstanceOriginAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedOutline, "instancePosition");
        this.shaderProgramInstancedOutline.vertexInstanceSizeAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedOutline, "instanceSize");
        this.shaderProgramInstancedOutline.vertexInstanceOrientationAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedOutline, "instanceOrientation");

        this.shaderProgramInstancedOutline.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedOutline, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexNormalAttribute);

        this.shaderProgramInstancedOutline.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedOutline, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexPositionAttribute);

        this.shaderProgramInstancedOutline.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedOutline, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexColourAttribute);

        this.shaderProgramInstancedOutline.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "uPMatrix");
        this.shaderProgramInstancedOutline.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "uMVMatrix");
        this.shaderProgramInstancedOutline.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "uMVINVMatrix");
        this.shaderProgramInstancedOutline.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "TextureMatrix");
        this.shaderProgramInstancedOutline.outlineSize = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "outlineSize");

        this.shaderProgramInstancedOutline.fog_start = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "fog_start");
        this.shaderProgramInstancedOutline.fog_end = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "fog_end");
        this.shaderProgramInstancedOutline.fogColour = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "fogColour");

        this.shaderProgramInstancedOutline.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane0");
        this.shaderProgramInstancedOutline.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane1");
        this.shaderProgramInstancedOutline.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane2");
        this.shaderProgramInstancedOutline.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane3");
        this.shaderProgramInstancedOutline.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane4");
        this.shaderProgramInstancedOutline.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane5");
        this.shaderProgramInstancedOutline.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane6");
        this.shaderProgramInstancedOutline.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "clipPlane7");
        this.shaderProgramInstancedOutline.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramInstancedOutline, "nClipPlanes");

    }

    initInstancedShadowShaders(vertexShaderShadow, fragmentShaderShadow) {
        this.shaderProgramInstancedShadow = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramInstancedShadow, vertexShaderShadow);
        this.gl.attachShader(this.shaderProgramInstancedShadow, fragmentShaderShadow);
        this.gl.bindAttribLocation(this.shaderProgramInstancedShadow, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramInstancedShadow, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramInstancedShadow, 4, "instancePosition");
        this.gl.bindAttribLocation(this.shaderProgramInstancedShadow, 5, "instanceSize");
        this.gl.bindAttribLocation(this.shaderProgramInstancedShadow, 6, "instanceOrientation");
        this.gl.linkProgram(this.shaderProgramInstancedShadow);

        if (!this.gl.getProgramParameter(this.shaderProgramInstancedShadow, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (shaderProgramInstancedShadow)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramInstancedShadow));
        }

        this.gl.useProgram(this.shaderProgramInstancedShadow);

        this.shaderProgramInstancedShadow.vertexInstanceOriginAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedShadow, "instancePosition");
        this.shaderProgramInstancedShadow.vertexInstanceSizeAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedShadow, "instanceSize");
        this.shaderProgramInstancedShadow.vertexInstanceOrientationAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedShadow, "instanceOrientation");

        this.shaderProgramInstancedShadow.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedShadow, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramInstancedShadow.vertexPositionAttribute);

        this.shaderProgramInstancedShadow.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramInstancedShadow, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramInstancedShadow.vertexColourAttribute);

        this.shaderProgramInstancedShadow.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "uPMatrix");
        this.shaderProgramInstancedShadow.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "uMVMatrix");
        this.shaderProgramInstancedShadow.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "uMVINVMatrix");

        this.shaderProgramInstancedShadow.fog_start = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "fog_start");
        this.shaderProgramInstancedShadow.fog_end = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "fog_end");
        this.shaderProgramInstancedShadow.fogColour = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "fogColour");

        this.shaderProgramInstancedShadow.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane0");
        this.shaderProgramInstancedShadow.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane1");
        this.shaderProgramInstancedShadow.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane2");
        this.shaderProgramInstancedShadow.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane3");
        this.shaderProgramInstancedShadow.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane4");
        this.shaderProgramInstancedShadow.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane5");
        this.shaderProgramInstancedShadow.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane6");
        this.shaderProgramInstancedShadow.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "clipPlane7");
        this.shaderProgramInstancedShadow.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramInstancedShadow, "nClipPlanes");

    }

    initShadowShaders(vertexShaderShadow, fragmentShaderShadow) {
        this.shaderProgramShadow = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramShadow, vertexShaderShadow);
        this.gl.attachShader(this.shaderProgramShadow, fragmentShaderShadow);
        this.gl.bindAttribLocation(this.shaderProgramShadow, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramShadow, 1, "aVertexColour");
        this.gl.linkProgram(this.shaderProgramShadow);

        if (!this.gl.getProgramParameter(this.shaderProgramShadow, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initShadowShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramShadow));
        }

        this.gl.useProgram(this.shaderProgramShadow);

        this.shaderProgramShadow.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramShadow, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramShadow.vertexPositionAttribute);

        this.shaderProgramShadow.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramShadow, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramShadow.vertexColourAttribute);

        this.shaderProgramShadow.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramShadow, "uPMatrix");
        this.shaderProgramShadow.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramShadow, "uMVMatrix");
        this.shaderProgramShadow.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramShadow, "uMVINVMatrix");

        this.shaderProgramShadow.fog_start = this.gl.getUniformLocation(this.shaderProgramShadow, "fog_start");
        this.shaderProgramShadow.fog_end = this.gl.getUniformLocation(this.shaderProgramShadow, "fog_end");
        this.shaderProgramShadow.fogColour = this.gl.getUniformLocation(this.shaderProgramShadow, "fogColour");

        this.shaderProgramShadow.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane0");
        this.shaderProgramShadow.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane1");
        this.shaderProgramShadow.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane2");
        this.shaderProgramShadow.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane3");
        this.shaderProgramShadow.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane4");
        this.shaderProgramShadow.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane5");
        this.shaderProgramShadow.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane6");
        this.shaderProgramShadow.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramShadow, "clipPlane7");
        this.shaderProgramShadow.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramShadow, "nClipPlanes");

    }

    initBlurXShader(vertexShaderBlurX, fragmentShaderBlurX) {
        this.shaderProgramBlurX = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramBlurX, vertexShaderBlurX);
        this.gl.attachShader(this.shaderProgramBlurX, fragmentShaderBlurX);
        this.gl.bindAttribLocation(this.shaderProgramBlurX, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramBlurX, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramBlurX);

        if (!this.gl.getProgramParameter(this.shaderProgramBlurX, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initRenderBlurXShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramBlurX));
        }

        this.gl.useProgram(this.shaderProgramBlurX);

        this.shaderProgramBlurX.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramBlurX, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexPositionAttribute);

        this.shaderProgramBlurX.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramBlurX, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexTextureAttribute);

        this.shaderProgramBlurX.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramBlurX, "uPMatrix");
        this.shaderProgramBlurX.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramBlurX, "uMVMatrix");

        this.shaderProgramBlurX.blurSize = this.gl.getUniformLocation(this.shaderProgramBlurX, "blurSize");
        this.shaderProgramBlurX.blurDepth = this.gl.getUniformLocation(this.shaderProgramBlurX, "blurDepth");
        if(this.WEBGL2){
            this.shaderProgramBlurX.blurCoeffs = this.gl.getUniformBlockIndex(this.shaderProgramBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurX, this.shaderProgramBlurX.blurCoeffs, 0);
        }

        this.shaderProgramBlurX.depthTexture = this.gl.getUniformLocation(this.shaderProgramBlurX, "depth");
        this.shaderProgramBlurX.inputTexture = this.gl.getUniformLocation(this.shaderProgramBlurX, "shader0");
    }

    initBlurYShader(vertexShaderBlurY, fragmentShaderBlurY) {
        this.shaderProgramBlurY = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramBlurY, vertexShaderBlurY);
        this.gl.attachShader(this.shaderProgramBlurY, fragmentShaderBlurY);
        this.gl.bindAttribLocation(this.shaderProgramBlurY, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramBlurY, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramBlurY);

        if (!this.gl.getProgramParameter(this.shaderProgramBlurY, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initRenderBlurYShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramBlurY));
        }

        this.gl.useProgram(this.shaderProgramBlurY);

        this.shaderProgramBlurY.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramBlurY, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexPositionAttribute);

        this.shaderProgramBlurY.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramBlurY, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexTextureAttribute);

        this.shaderProgramBlurY.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramBlurY, "uPMatrix");
        this.shaderProgramBlurY.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramBlurY, "uMVMatrix");

        this.shaderProgramBlurY.blurSize = this.gl.getUniformLocation(this.shaderProgramBlurY, "blurSize");
        this.shaderProgramBlurY.blurDepth = this.gl.getUniformLocation(this.shaderProgramBlurY, "blurDepth");
        if(this.WEBGL2){
            this.shaderProgramBlurY.blurCoeffs = this.gl.getUniformBlockIndex(this.shaderProgramBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurY, this.shaderProgramBlurY.blurCoeffs, 0);
        }

        this.shaderProgramBlurY.depthTexture = this.gl.getUniformLocation(this.shaderProgramBlurY, "depth");
        this.shaderProgramBlurY.inputTexture = this.gl.getUniformLocation(this.shaderProgramBlurY, "shader0");
    }

    initOverlayShader(vertexShaderOverlay, fragmentShaderOverlay) {
        this.shaderProgramOverlay = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramOverlay, vertexShaderOverlay);
        this.gl.attachShader(this.shaderProgramOverlay, fragmentShaderOverlay);
        this.gl.bindAttribLocation(this.shaderProgramOverlay, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramOverlay, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramOverlay);

        if (!this.gl.getProgramParameter(this.shaderProgramOverlay, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initRenderOverlayShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramOverlay));
        }

        this.gl.useProgram(this.shaderProgramOverlay);

        this.shaderProgramOverlay.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramOverlay, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramOverlay.vertexPositionAttribute);

        this.shaderProgramOverlay.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramOverlay, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramOverlay.vertexTextureAttribute);

        this.shaderProgramOverlay.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramOverlay, "uPMatrix");
        this.shaderProgramOverlay.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramOverlay, "uMVMatrix");

        this.shaderProgramOverlay.inputTexture = this.gl.getUniformLocation(this.shaderProgramOverlay, "shader0");
    }

    initRenderFrameBufferShaders(vertexShaderRenderFrameBuffer, fragmentShaderRenderFrameBuffer) {
        this.shaderProgramRenderFrameBuffer = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramRenderFrameBuffer, vertexShaderRenderFrameBuffer);
        this.gl.attachShader(this.shaderProgramRenderFrameBuffer, fragmentShaderRenderFrameBuffer);
        this.gl.bindAttribLocation(this.shaderProgramRenderFrameBuffer, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramRenderFrameBuffer, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramRenderFrameBuffer);

        if (!this.gl.getProgramParameter(this.shaderProgramRenderFrameBuffer, this.gl.LINK_STATUS)) {
            //alert("Could not initialise shaders (initRenderFrameBufferShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramRenderFrameBuffer));
        }

        this.gl.useProgram(this.shaderProgramRenderFrameBuffer);

        this.shaderProgramRenderFrameBuffer.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramRenderFrameBuffer, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute);

        this.shaderProgramRenderFrameBuffer.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramRenderFrameBuffer, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

        this.shaderProgramRenderFrameBuffer.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramRenderFrameBuffer, "uPMatrix");
        this.shaderProgramRenderFrameBuffer.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramRenderFrameBuffer, "uMVMatrix");

        this.shaderProgramRenderFrameBuffer.focussedTexture = this.gl.getUniformLocation(this.shaderProgramRenderFrameBuffer, "inFocus");
        this.shaderProgramRenderFrameBuffer.blurredTexture = this.gl.getUniformLocation(this.shaderProgramRenderFrameBuffer, "blurred");
        this.shaderProgramRenderFrameBuffer.depthTexture = this.gl.getUniformLocation(this.shaderProgramRenderFrameBuffer, "depth");

    }

    initCirclesShaders(vertexShader, fragmentShader) {
        this.shaderProgramCircles = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramCircles, vertexShader);
        this.gl.attachShader(this.shaderProgramCircles, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramCircles, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramCircles, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramCircles, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramCircles, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramCircles);

        if (!this.gl.getProgramParameter(this.shaderProgramCircles, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initCirclesShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramCircles));
        }

        this.gl.useProgram(this.shaderProgramCircles);

        this.shaderProgramCircles.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramCircles, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramCircles.vertexNormalAttribute);

        this.shaderProgramCircles.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramCircles, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramCircles.vertexPositionAttribute);

        this.shaderProgramCircles.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramCircles, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramCircles.vertexTextureAttribute);

        this.shaderProgramCircles.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramCircles, "uPMatrix");
        this.shaderProgramCircles.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramCircles, "uMVMatrix");
        this.shaderProgramCircles.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramCircles, "uMVINVMatrix");

        this.shaderProgramCircles.up = this.gl.getUniformLocation(this.shaderProgramCircles, "up");
        this.shaderProgramCircles.right = this.gl.getUniformLocation(this.shaderProgramCircles, "right");

        this.shaderProgramCircles.fog_start = this.gl.getUniformLocation(this.shaderProgramCircles, "fog_start");
        this.shaderProgramCircles.fog_end = this.gl.getUniformLocation(this.shaderProgramCircles, "fog_end");
        this.shaderProgramCircles.fogColour = this.gl.getUniformLocation(this.shaderProgramCircles, "fogColour");

        this.shaderProgramCircles.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane0");
        this.shaderProgramCircles.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane1");
        this.shaderProgramCircles.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane2");
        this.shaderProgramCircles.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane3");
        this.shaderProgramCircles.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane4");
        this.shaderProgramCircles.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane5");
        this.shaderProgramCircles.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane6");
        this.shaderProgramCircles.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramCircles, "clipPlane7");
        this.shaderProgramCircles.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramCircles, "nClipPlanes");
    }

    initTextInstancedShaders(vertexShader, fragmentShader) {

        this.shaderProgramTextInstanced = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramTextInstanced, vertexShader);
        this.gl.attachShader(this.shaderProgramTextInstanced, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 8, "size");
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 9, "offset");
        this.gl.bindAttribLocation(this.shaderProgramTextInstanced, 10, "textureOffsets");
        this.gl.linkProgram(this.shaderProgramTextInstanced);

        if (!this.gl.getProgramParameter(this.shaderProgramTextInstanced, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initTextInstancedShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramTextInstanced));
        }

        this.gl.useProgram(this.shaderProgramTextInstanced);

        this.shaderProgramTextInstanced.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramTextInstanced, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.vertexPositionAttribute);

        this.shaderProgramTextInstanced.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramTextInstanced, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.vertexTextureAttribute);

        this.shaderProgramTextInstanced.offsetAttribute = this.gl.getAttribLocation(this.shaderProgramTextInstanced, "offset");
        this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.offsetAttribute);

        this.shaderProgramTextInstanced.sizeAttribute = this.gl.getAttribLocation(this.shaderProgramTextInstanced, "size");
        this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.sizeAttribute);

        this.shaderProgramTextInstanced.textureOffsetAttribute = this.gl.getAttribLocation(this.shaderProgramTextInstanced, "textureOffsets");
        this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.textureOffsetAttribute);

        this.shaderProgramTextInstanced.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "uPMatrix");
        this.shaderProgramTextInstanced.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "uMVMatrix");
        this.shaderProgramTextInstanced.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "uMVINVMatrix");
        this.shaderProgramTextInstanced.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "TextureMatrix");

        this.shaderProgramTextInstanced.fog_start = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "fog_start");
        this.shaderProgramTextInstanced.fog_end = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "fog_end");

        this.shaderProgramTextInstanced.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane0");
        this.shaderProgramTextInstanced.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane1");
        this.shaderProgramTextInstanced.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane2");
        this.shaderProgramTextInstanced.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane3");
        this.shaderProgramTextInstanced.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane4");
        this.shaderProgramTextInstanced.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane5");
        this.shaderProgramTextInstanced.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane6");
        this.shaderProgramTextInstanced.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "clipPlane7");
        this.shaderProgramTextInstanced.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "nClipPlanes");

        this.shaderProgramTextInstanced.pixelZoom = this.gl.getUniformLocation(this.shaderProgramTextInstanced, "pixelZoom");

    }

    initTextBackgroundShaders(vertexShaderTextBackground, fragmentShaderTextBackground) {

        this.shaderProgramTextBackground = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramTextBackground, vertexShaderTextBackground);
        this.gl.attachShader(this.shaderProgramTextBackground, fragmentShaderTextBackground);
        this.gl.bindAttribLocation(this.shaderProgramTextBackground, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramTextBackground, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramTextBackground, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramTextBackground, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramTextBackground);

        if (!this.gl.getProgramParameter(this.shaderProgramTextBackground, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initTextBackgroundShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramTextBackground));
        }

        this.gl.useProgram(this.shaderProgramTextBackground);

        this.shaderProgramTextBackground.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramTextBackground, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexNormalAttribute);

        this.shaderProgramTextBackground.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramTextBackground, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexPositionAttribute);

        this.shaderProgramTextBackground.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramTextBackground, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexColourAttribute);

        this.shaderProgramTextBackground.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramTextBackground, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);

        this.shaderProgramTextBackground.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextBackground, "uPMatrix");
        this.shaderProgramTextBackground.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextBackground, "uMVMatrix");
        this.shaderProgramTextBackground.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextBackground, "uMVINVMatrix");

        this.shaderProgramTextBackground.fog_start = this.gl.getUniformLocation(this.shaderProgramTextBackground, "fog_start");
        this.shaderProgramTextBackground.fog_end = this.gl.getUniformLocation(this.shaderProgramTextBackground, "fog_end");
        this.shaderProgramTextBackground.fogColour = this.gl.getUniformLocation(this.shaderProgramTextBackground, "fogColour");
        this.shaderProgramTextBackground.maxTextureS = this.gl.getUniformLocation(this.shaderProgramTextBackground, "maxTextureS");
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        this.gl.uniform4fv(this.shaderProgramTextBackground.fogColour, new Float32Array([1.0, 1.0, 1.0, 1.0, 1.0]));

        this.shaderProgramTextBackground.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane0");
        this.shaderProgramTextBackground.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane1");
        this.shaderProgramTextBackground.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane2");
        this.shaderProgramTextBackground.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane3");
        this.shaderProgramTextBackground.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane4");
        this.shaderProgramTextBackground.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane5");
        this.shaderProgramTextBackground.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane6");
        this.shaderProgramTextBackground.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramTextBackground, "clipPlane7");
        this.shaderProgramTextBackground.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramTextBackground, "nClipPlanes");
    }

    initOutlineShaders(vertexShader, fragmentShader) {
        this.shaderProgramOutline = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramOutline, vertexShader);
        this.gl.attachShader(this.shaderProgramOutline, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramOutline, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramOutline, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramOutline, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramOutline, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramOutline);

        if (!this.gl.getProgramParameter(this.shaderProgramOutline, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramOutline));
        }

        this.gl.useProgram(this.shaderProgramOutline);

        this.shaderProgramOutline.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramOutline, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramOutline.vertexNormalAttribute);

        this.shaderProgramOutline.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramOutline, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramOutline.vertexPositionAttribute);

        this.shaderProgramOutline.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramOutline, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramOutline.vertexColourAttribute);

        this.shaderProgramOutline.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramOutline, "uPMatrix");
        this.shaderProgramOutline.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramOutline, "uMVMatrix");
        this.shaderProgramOutline.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramOutline, "uMVINVMatrix");
        this.shaderProgramOutline.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramOutline, "TextureMatrix");
        this.shaderProgramOutline.outlineSize = this.gl.getUniformLocation(this.shaderProgramOutline, "outlineSize");

        this.shaderProgramOutline.fog_start = this.gl.getUniformLocation(this.shaderProgramOutline, "fog_start");
        this.shaderProgramOutline.fog_end = this.gl.getUniformLocation(this.shaderProgramOutline, "fog_end");
        this.shaderProgramOutline.fogColour = this.gl.getUniformLocation(this.shaderProgramOutline, "fogColour");

        this.shaderProgramOutline.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane0");
        this.shaderProgramOutline.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane1");
        this.shaderProgramOutline.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane2");
        this.shaderProgramOutline.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane3");
        this.shaderProgramOutline.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane4");
        this.shaderProgramOutline.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane5");
        this.shaderProgramOutline.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane6");
        this.shaderProgramOutline.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramOutline, "clipPlane7");
        this.shaderProgramOutline.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramOutline, "nClipPlanes");

        this.shaderProgramOutline.cursorPos = this.gl.getUniformLocation(this.shaderProgramOutline, "cursorPos");

    }

    initShaders(vertexShader, fragmentShader) {

        this.shaderProgram = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgram, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgram, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgram, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgram, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgram));
        }

        this.gl.useProgram(this.shaderProgram);

        this.shaderProgram.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

        this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

        this.shaderProgram.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexColourAttribute);

        this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
        this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
        this.shaderProgram.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVINVMatrix");
        this.shaderProgram.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "TextureMatrix");

        this.shaderProgram.fog_start = this.gl.getUniformLocation(this.shaderProgram, "fog_start");
        this.shaderProgram.fog_end = this.gl.getUniformLocation(this.shaderProgram, "fog_end");
        this.shaderProgram.fogColour = this.gl.getUniformLocation(this.shaderProgram, "fogColour");
        this.shaderProgram.ShadowMap = this.gl.getUniformLocation(this.shaderProgram, "ShadowMap");
        this.shaderProgram.xPixelOffset = this.gl.getUniformLocation(this.shaderProgram, "xPixelOffset");
        this.shaderProgram.yPixelOffset = this.gl.getUniformLocation(this.shaderProgram, "yPixelOffset");
        this.shaderProgram.doShadows = this.gl.getUniformLocation(this.shaderProgram, "doShadows");
        this.shaderProgram.shadowQuality = this.gl.getUniformLocation(this.shaderProgram, "shadowQuality");

        this.shaderProgram.clipPlane0 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane0");
        this.shaderProgram.clipPlane1 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane1");
        this.shaderProgram.clipPlane2 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane2");
        this.shaderProgram.clipPlane3 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane3");
        this.shaderProgram.clipPlane4 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane4");
        this.shaderProgram.clipPlane5 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane5");
        this.shaderProgram.clipPlane6 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane6");
        this.shaderProgram.clipPlane7 = this.gl.getUniformLocation(this.shaderProgram, "clipPlane7");
        this.shaderProgram.nClipPlanes = this.gl.getUniformLocation(this.shaderProgram, "nClipPlanes");

        this.shaderProgram.cursorPos = this.gl.getUniformLocation(this.shaderProgram, "cursorPos");

        this.shaderProgram.shinyBack = this.gl.getUniformLocation(this.shaderProgram, "shinyBack");
        this.shaderProgram.defaultColour = this.gl.getUniformLocation(this.shaderProgram, "defaultColour");
        this.shaderProgram.backColour = this.gl.getUniformLocation(this.shaderProgram, "backColour");

        this.shaderProgram.light_positions = this.gl.getUniformLocation(this.shaderProgram, "light_positions");
        this.shaderProgram.light_colours_ambient = this.gl.getUniformLocation(this.shaderProgram, "light_colours_ambient");
        this.shaderProgram.light_colours_specular = this.gl.getUniformLocation(this.shaderProgram, "light_colours_specular");
        this.shaderProgram.light_colours_diffuse = this.gl.getUniformLocation(this.shaderProgram, "light_colours_diffuse");

        this.shaderProgram.specularPower = this.gl.getUniformLocation(this.shaderProgram, "specularPower");
    }

    initShadersInstanced(vertexShader, fragmentShader) {

        this.shaderProgramInstanced = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramInstanced, vertexShader);
        this.gl.attachShader(this.shaderProgramInstanced, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 4, "instancePosition");
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 5, "instanceSize");
        this.gl.bindAttribLocation(this.shaderProgramInstanced, 6, "instanceOrientation");
        this.gl.linkProgram(this.shaderProgramInstanced);

        if (!this.gl.getProgramParameter(this.shaderProgramInstanced, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initShadersInstanced)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramInstanced));
        }

        this.gl.useProgram(this.shaderProgramInstanced);

        this.shaderProgramInstanced.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramInstanced, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexNormalAttribute);

        this.shaderProgramInstanced.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramInstanced, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexPositionAttribute);

        this.shaderProgramInstanced.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramInstanced, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexColourAttribute);

        this.shaderProgramInstanced.vertexInstanceOriginAttribute = this.gl.getAttribLocation(this.shaderProgramInstanced, "instancePosition");
        this.shaderProgramInstanced.vertexInstanceSizeAttribute = this.gl.getAttribLocation(this.shaderProgramInstanced, "instanceSize");
        this.shaderProgramInstanced.vertexInstanceOrientationAttribute = this.gl.getAttribLocation(this.shaderProgramInstanced, "instanceOrientation");

        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexColourAttribute);

        this.shaderProgramInstanced.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstanced, "uPMatrix");
        this.shaderProgramInstanced.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstanced, "uMVMatrix");
        this.shaderProgramInstanced.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstanced, "uMVINVMatrix");
        this.shaderProgramInstanced.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramInstanced, "TextureMatrix");
        this.shaderProgramInstanced.outlineSize = this.gl.getUniformLocation(this.shaderProgramInstanced, "outlineSize");

        this.shaderProgramInstanced.fog_start = this.gl.getUniformLocation(this.shaderProgramInstanced, "fog_start");
        this.shaderProgramInstanced.fog_end = this.gl.getUniformLocation(this.shaderProgramInstanced, "fog_end");
        this.shaderProgramInstanced.fogColour = this.gl.getUniformLocation(this.shaderProgramInstanced, "fogColour");
        this.shaderProgramInstanced.ShadowMap = this.gl.getUniformLocation(this.shaderProgramInstanced, "ShadowMap");
        this.shaderProgramInstanced.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramInstanced, "xPixelOffset");
        this.shaderProgramInstanced.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramInstanced, "yPixelOffset");
        this.shaderProgramInstanced.doShadows = this.gl.getUniformLocation(this.shaderProgramInstanced, "doShadows");
        this.shaderProgramInstanced.shadowQuality = this.gl.getUniformLocation(this.shaderProgramInstanced, "shadowQuality");

        this.shaderProgramInstanced.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane0");
        this.shaderProgramInstanced.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane1");
        this.shaderProgramInstanced.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane2");
        this.shaderProgramInstanced.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane3");
        this.shaderProgramInstanced.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane4");
        this.shaderProgramInstanced.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane5");
        this.shaderProgramInstanced.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane6");
        this.shaderProgramInstanced.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramInstanced, "clipPlane7");
        this.shaderProgramInstanced.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramInstanced, "nClipPlanes");

        this.shaderProgramInstanced.cursorPos = this.gl.getUniformLocation(this.shaderProgramInstanced, "cursorPos");

        this.shaderProgramInstanced.shinyBack = this.gl.getUniformLocation(this.shaderProgramInstanced, "shinyBack");
        this.shaderProgramInstanced.defaultColour = this.gl.getUniformLocation(this.shaderProgramInstanced, "defaultColour");
        this.shaderProgramInstanced.backColour = this.gl.getUniformLocation(this.shaderProgramInstanced, "backColour");

        this.shaderProgramInstanced.light_positions = this.gl.getUniformLocation(this.shaderProgramInstanced, "light_positions");
        this.shaderProgramInstanced.light_colours_ambient = this.gl.getUniformLocation(this.shaderProgramInstanced, "light_colours_ambient");
        this.shaderProgramInstanced.light_colours_specular = this.gl.getUniformLocation(this.shaderProgramInstanced, "light_colours_specular");
        this.shaderProgramInstanced.light_colours_diffuse = this.gl.getUniformLocation(this.shaderProgramInstanced, "light_colours_diffuse");

        this.shaderProgramInstanced.specularPower = this.gl.getUniformLocation(this.shaderProgramInstanced, "specularPower");
    }

    initThickLineNormalShaders(vertexShader, fragmentShader) {

        this.shaderProgramThickLinesNormal = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramThickLinesNormal, vertexShader);
        this.gl.attachShader(this.shaderProgramThickLinesNormal, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 7, "aVertexRealNormal");
        this.gl.linkProgram(this.shaderProgramThickLinesNormal);

        if (!this.gl.getProgramParameter(this.shaderProgramThickLinesNormal, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initThickLineNormalShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramThickLinesNormal));
        }

        this.gl.useProgram(this.shaderProgramThickLinesNormal);

        this.shaderProgramThickLinesNormal.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramThickLinesNormal, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexPositionAttribute);

        this.shaderProgramThickLinesNormal.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramThickLinesNormal, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexColourAttribute);

        this.shaderProgramThickLinesNormal.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramThickLinesNormal, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexNormalAttribute);

        this.shaderProgramThickLinesNormal.vertexRealNormalAttribute = this.gl.getAttribLocation(this.shaderProgramThickLinesNormal, "aVertexRealNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexRealNormalAttribute);

        this.shaderProgramThickLinesNormal.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "uPMatrix");
        this.shaderProgramThickLinesNormal.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "uMVMatrix");
        this.shaderProgramThickLinesNormal.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "uMVINVMatrix");
        this.shaderProgramThickLinesNormal.screenZ = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "screenZ");
        this.shaderProgramThickLinesNormal.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "TextureMatrix");

        this.shaderProgramThickLinesNormal.fog_start = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "fog_start");
        this.shaderProgramThickLinesNormal.fog_end = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "fog_end");
        this.shaderProgramThickLinesNormal.fogColour = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "fogColour");
        this.shaderProgramThickLinesNormal.ShadowMap = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "ShadowMap");
        this.shaderProgramThickLinesNormal.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "xPixelOffset");
        this.shaderProgramThickLinesNormal.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "yPixelOffset");
        this.shaderProgramThickLinesNormal.doShadows = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "doShadows");
        this.shaderProgramThickLinesNormal.shadowQuality = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "shadowQuality");
        this.shaderProgramThickLinesNormal.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane0");
        this.shaderProgramThickLinesNormal.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane1");
        this.shaderProgramThickLinesNormal.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane2");
        this.shaderProgramThickLinesNormal.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane3");
        this.shaderProgramThickLinesNormal.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane4");
        this.shaderProgramThickLinesNormal.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane5");
        this.shaderProgramThickLinesNormal.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane6");
        this.shaderProgramThickLinesNormal.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "clipPlane7");
        this.shaderProgramThickLinesNormal.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "nClipPlanes");

        this.shaderProgramThickLinesNormal.pixelZoom = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "pixelZoom");

        this.shaderProgramThickLinesNormal.light_positions = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "light_positions");
        this.shaderProgramThickLinesNormal.light_colours_ambient = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "light_colours_ambient");
        this.shaderProgramThickLinesNormal.light_colours_specular = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "light_colours_specular");
        this.shaderProgramThickLinesNormal.light_colours_diffuse = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "light_colours_diffuse");

        this.shaderProgramThickLinesNormal.specularPower = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "specularPower");

    }

    initThickLineShaders(vertexShader, fragmentShader) {

        this.shaderProgramThickLines = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramThickLines, vertexShader);
        this.gl.attachShader(this.shaderProgramThickLines, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramThickLines, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramThickLines, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramThickLines, 2, "aVertexNormal");
        this.gl.linkProgram(this.shaderProgramThickLines);

        if (!this.gl.getProgramParameter(this.shaderProgramThickLines, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initThickLineShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramThickLines));
        }

        this.gl.useProgram(this.shaderProgramThickLines);

        this.shaderProgramThickLines.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramThickLines, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);

        this.shaderProgramThickLines.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramThickLines, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.shaderProgramThickLines.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramThickLines, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);

        this.shaderProgramThickLines.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramThickLines, "uPMatrix");
        this.shaderProgramThickLines.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramThickLines, "uMVMatrix");
        this.shaderProgramThickLines.screenZ = this.gl.getUniformLocation(this.shaderProgramThickLines, "screenZ");

        this.shaderProgramThickLines.fog_start = this.gl.getUniformLocation(this.shaderProgramThickLines, "fog_start");
        this.shaderProgramThickLines.fog_end = this.gl.getUniformLocation(this.shaderProgramThickLines, "fog_end");
        this.shaderProgramThickLines.fogColour = this.gl.getUniformLocation(this.shaderProgramThickLines, "fogColour");
        this.shaderProgramThickLines.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane0");
        this.shaderProgramThickLines.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane1");
        this.shaderProgramThickLines.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane2");
        this.shaderProgramThickLines.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane3");
        this.shaderProgramThickLines.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane4");
        this.shaderProgramThickLines.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane5");
        this.shaderProgramThickLines.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane6");
        this.shaderProgramThickLines.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramThickLines, "clipPlane7");
        this.shaderProgramThickLines.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramThickLines, "nClipPlanes");

        this.shaderProgramThickLines.pixelZoom = this.gl.getUniformLocation(this.shaderProgramThickLines, "pixelZoom");
    }

    initLineShaders(vertexShader, fragmentShader) {

        this.shaderProgramLines = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramLines, vertexShader);
        this.gl.attachShader(this.shaderProgramLines, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramLines, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramLines, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramLines, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramLines, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramLines);

        if (!this.gl.getProgramParameter(this.shaderProgramLines, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initLineShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramLines));
        }

        this.gl.useProgram(this.shaderProgramLines);

        this.shaderProgramLines.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramLines, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramLines.vertexPositionAttribute);

        this.shaderProgramLines.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramLines, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramLines.vertexColourAttribute);

        //this.shaderProgramLines.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramLines, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramLines.vertexNormalAttribute);

        this.shaderProgramLines.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramLines, "uPMatrix");
        this.shaderProgramLines.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramLines, "uMVMatrix");
        this.shaderProgramLines.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramLines, "uMVINVMatrix");

        this.shaderProgramLines.fog_start = this.gl.getUniformLocation(this.shaderProgramLines, "fog_start");
        this.shaderProgramLines.fog_end = this.gl.getUniformLocation(this.shaderProgramLines, "fog_end");
        this.shaderProgramLines.fogColour = this.gl.getUniformLocation(this.shaderProgramLines, "fogColour");
        this.shaderProgramLines.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane0");
        this.shaderProgramLines.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane1");
        this.shaderProgramLines.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane2");
        this.shaderProgramLines.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane3");
        this.shaderProgramLines.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane4");
        this.shaderProgramLines.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane5");
        this.shaderProgramLines.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane6");
        this.shaderProgramLines.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramLines, "clipPlane7");
        this.shaderProgramLines.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramLines, "nClipPlanes");

    }

    initDepthShadowPerfectSphereShaders(vertexShader, fragmentShader) {
        this.shaderDepthShadowProgramPerfectSpheres = this.gl.createProgram();
        this.gl.attachShader(this.shaderDepthShadowProgramPerfectSpheres, vertexShader);
        this.gl.attachShader(this.shaderDepthShadowProgramPerfectSpheres, fragmentShader);
        this.gl.bindAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, 8, "size");
        this.gl.bindAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, 9, "offset");
        this.gl.linkProgram(this.shaderDepthShadowProgramPerfectSpheres);

        if (!this.gl.getProgramParameter(this.shaderDepthShadowProgramPerfectSpheres, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initDepthShadowPerfectSphereShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderDepthShadowProgramPerfectSpheres));
        }

        this.gl.useProgram(this.shaderDepthShadowProgramPerfectSpheres);

        this.shaderDepthShadowProgramPerfectSpheres.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.vertexPositionAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.vertexColourAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.vertexColourAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.vertexTextureAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.offsetAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "offset");
        this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.offsetAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.sizeAttribute= this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "size");
        this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.sizeAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.pMatrixUniform = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "uPMatrix");
        this.shaderDepthShadowProgramPerfectSpheres.mvMatrixUniform = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "uMVMatrix");
        this.shaderDepthShadowProgramPerfectSpheres.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "uMVINVMatrix");
        this.shaderDepthShadowProgramPerfectSpheres.invSymMatrixUniform = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "uINVSymmMatrix");

        this.shaderDepthShadowProgramPerfectSpheres.fog_start = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "fog_start");
        this.shaderDepthShadowProgramPerfectSpheres.fog_end = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "fog_end");
        this.shaderDepthShadowProgramPerfectSpheres.fogColour = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "fogColour");

        this.shaderDepthShadowProgramPerfectSpheres.clipPlane0 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane0");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane1 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane1");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane2 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane2");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane3 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane3");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane4 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane4");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane5 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane5");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane6 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane6");
        this.shaderDepthShadowProgramPerfectSpheres.clipPlane7 = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "clipPlane7");
        this.shaderDepthShadowProgramPerfectSpheres.nClipPlanes = this.gl.getUniformLocation(this.shaderDepthShadowProgramPerfectSpheres, "nClipPlanes");
    }

    initPerfectSphereOutlineShaders(vertexShader, fragmentShader) {
        this.shaderProgramPerfectSpheresOutline = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramPerfectSpheresOutline, vertexShader);
        this.gl.attachShader(this.shaderProgramPerfectSpheresOutline, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheresOutline, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheresOutline, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheresOutline, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheresOutline, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheresOutline, 8, "size");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheresOutline, 9, "offset");
        this.gl.linkProgram(this.shaderProgramPerfectSpheresOutline);

        if (!this.gl.getProgramParameter(this.shaderProgramPerfectSpheresOutline, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initPerfectSphereShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramPerfectSpheresOutline));
        }

        this.gl.useProgram(this.shaderProgramPerfectSpheresOutline);

        this.shaderProgramPerfectSpheresOutline.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexPositionAttribute);

        this.shaderProgramPerfectSpheresOutline.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexNormalAttribute);

        this.shaderProgramPerfectSpheresOutline.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexColourAttribute);

        this.shaderProgramPerfectSpheresOutline.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexTextureAttribute);

        this.shaderProgramPerfectSpheresOutline.offsetAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "offset");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.offsetAttribute);

        this.shaderProgramPerfectSpheresOutline.sizeAttribute= this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "size");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.sizeAttribute);

        this.shaderProgramPerfectSpheresOutline.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "uPMatrix");
        this.shaderProgramPerfectSpheresOutline.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "uMVMatrix");
        this.shaderProgramPerfectSpheresOutline.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "uMVINVMatrix");
        this.shaderProgramPerfectSpheresOutline.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "TextureMatrix");
        this.shaderProgramPerfectSpheresOutline.invSymMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "uINVSymmMatrix");
        this.shaderProgramPerfectSpheresOutline.outlineSize = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "outlineSize");

        this.shaderProgramPerfectSpheresOutline.fog_start = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "fog_start");
        this.shaderProgramPerfectSpheresOutline.fog_end = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "fog_end");
        this.shaderProgramPerfectSpheresOutline.fogColour = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "fogColour");

        this.shaderProgramPerfectSpheresOutline.scaleMatrix = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "scaleMatrix");

        this.shaderProgramPerfectSpheresOutline.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane0");
        this.shaderProgramPerfectSpheresOutline.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane1");
        this.shaderProgramPerfectSpheresOutline.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane2");
        this.shaderProgramPerfectSpheresOutline.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane3");
        this.shaderProgramPerfectSpheresOutline.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane4");
        this.shaderProgramPerfectSpheresOutline.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane5");
        this.shaderProgramPerfectSpheresOutline.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane6");
        this.shaderProgramPerfectSpheresOutline.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "clipPlane7");
        this.shaderProgramPerfectSpheresOutline.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramPerfectSpheresOutline, "nClipPlanes");
    }

    initPerfectSphereShaders(vertexShader, fragmentShader) {
        this.shaderProgramPerfectSpheres = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramPerfectSpheres, vertexShader);
        this.gl.attachShader(this.shaderProgramPerfectSpheres, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheres, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheres, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheres, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheres, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheres, 8, "size");
        this.gl.bindAttribLocation(this.shaderProgramPerfectSpheres, 9, "offset");
        this.gl.linkProgram(this.shaderProgramPerfectSpheres);

        if (!this.gl.getProgramParameter(this.shaderProgramPerfectSpheres, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initPerfectSphereShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramPerfectSpheres));
        }

        this.gl.useProgram(this.shaderProgramPerfectSpheres);

        this.shaderProgramPerfectSpheres.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexPositionAttribute);

        this.shaderProgramPerfectSpheres.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexNormalAttribute);

        this.shaderProgramPerfectSpheres.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexColourAttribute);

        this.shaderProgramPerfectSpheres.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexTextureAttribute);

        this.shaderProgramPerfectSpheres.offsetAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "offset");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.offsetAttribute);

        this.shaderProgramPerfectSpheres.sizeAttribute= this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "size");
        this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.sizeAttribute);

        this.shaderProgramPerfectSpheres.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "uPMatrix");
        this.shaderProgramPerfectSpheres.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "uMVMatrix");
        this.shaderProgramPerfectSpheres.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "uMVINVMatrix");
        this.shaderProgramPerfectSpheres.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "TextureMatrix");
        this.shaderProgramPerfectSpheres.invSymMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "uINVSymmMatrix");
        this.shaderProgramPerfectSpheres.outlineSize = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "outlineSize");

        this.shaderProgramPerfectSpheres.fog_start = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "fog_start");
        this.shaderProgramPerfectSpheres.fog_end = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "fog_end");
        this.shaderProgramPerfectSpheres.fogColour = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "fogColour");
        this.shaderProgramPerfectSpheres.ShadowMap = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "ShadowMap");
        this.shaderProgramPerfectSpheres.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "xPixelOffset");
        this.shaderProgramPerfectSpheres.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "yPixelOffset");
        this.shaderProgramPerfectSpheres.doShadows = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "doShadows");
        this.shaderProgramPerfectSpheres.shadowQuality = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "shadowQuality");

        this.shaderProgramPerfectSpheres.scaleMatrix = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "scaleMatrix");

        this.shaderProgramPerfectSpheres.light_positions = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "light_positions");
        this.shaderProgramPerfectSpheres.light_colours_ambient = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "light_colours_ambient");
        this.shaderProgramPerfectSpheres.light_colours_specular = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "light_colours_specular");
        this.shaderProgramPerfectSpheres.light_colours_diffuse = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "light_colours_diffuse");

        this.shaderProgramPerfectSpheres.specularPower = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "specularPower");

        this.shaderProgramPerfectSpheres.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane0");
        this.shaderProgramPerfectSpheres.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane1");
        this.shaderProgramPerfectSpheres.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane2");
        this.shaderProgramPerfectSpheres.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane3");
        this.shaderProgramPerfectSpheres.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane4");
        this.shaderProgramPerfectSpheres.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane5");
        this.shaderProgramPerfectSpheres.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane6");
        this.shaderProgramPerfectSpheres.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipPlane7");
        this.shaderProgramPerfectSpheres.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "nClipPlanes");
        this.shaderProgramPerfectSpheres.clipCap = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "clipCap");
    }

    initImageShaders(vertexShader, fragmentShader) {
        this.shaderProgramImages = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramImages, vertexShader);
        this.gl.attachShader(this.shaderProgramImages, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramImages, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramImages, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramImages, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramImages, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramImages);

        if (!this.gl.getProgramParameter(this.shaderProgramImages, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initImageShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramImages));
        }

        this.gl.useProgram(this.shaderProgramImages);

        this.shaderProgramImages.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramImages, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexPositionAttribute);

        this.shaderProgramImages.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramImages, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexNormalAttribute);

        this.shaderProgramImages.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramImages, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexColourAttribute);

        this.shaderProgramImages.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramImages, "aVertexTexture");

        this.shaderProgramImages.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramImages, "uPMatrix");
        this.shaderProgramImages.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramImages, "uMVMatrix");
        this.shaderProgramImages.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramImages, "uMVINVMatrix");

        this.shaderProgramImages.fog_start = this.gl.getUniformLocation(this.shaderProgramImages, "fog_start");
        this.shaderProgramImages.fog_end = this.gl.getUniformLocation(this.shaderProgramImages, "fog_end");
        this.shaderProgramImages.fogColour = this.gl.getUniformLocation(this.shaderProgramImages, "fogColour");

        this.shaderProgramImages.offset = this.gl.getUniformLocation(this.shaderProgramImages, "offset");
        this.shaderProgramImages.size = this.gl.getUniformLocation(this.shaderProgramImages, "size");
        this.shaderProgramImages.scaleMatrix = this.gl.getUniformLocation(this.shaderProgramImages, "scaleMatrix");

    }

    initTwoDShapesShaders(vertexShader, fragmentShader) {
        this.shaderProgramTwoDShapes = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramTwoDShapes, vertexShader);
        this.gl.attachShader(this.shaderProgramTwoDShapes, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramTwoDShapes, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramTwoDShapes, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramTwoDShapes, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramTwoDShapes, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramTwoDShapes);

        if (!this.gl.getProgramParameter(this.shaderProgramTwoDShapes, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initTwoDShapesShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramTwoDShapes));
        }

        this.gl.useProgram(this.shaderProgramTwoDShapes);

        this.shaderProgramTwoDShapes.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramTwoDShapes, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexPositionAttribute);

        this.shaderProgramTwoDShapes.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramTwoDShapes, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexNormalAttribute);

        this.shaderProgramTwoDShapes.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramTwoDShapes, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexColourAttribute);

        this.shaderProgramTwoDShapes.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "uPMatrix");
        this.shaderProgramTwoDShapes.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "uMVMatrix");
        this.shaderProgramTwoDShapes.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "uMVINVMatrix");

        this.shaderProgramTwoDShapes.fog_start = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "fog_start");
        this.shaderProgramTwoDShapes.fog_end = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "fog_end");
        this.shaderProgramTwoDShapes.fogColour = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "fogColour");

        this.shaderProgramTwoDShapes.offset = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "offset");
        this.shaderProgramTwoDShapes.size = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "size");
        this.shaderProgramTwoDShapes.scaleMatrix = this.gl.getUniformLocation(this.shaderProgramTwoDShapes, "scaleMatrix");

    }


    initPointSpheresShadowShaders(vertexShader, fragmentShader) {

        this.shaderProgramPointSpheresShadow = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramPointSpheresShadow, vertexShader);
        this.gl.attachShader(this.shaderProgramPointSpheresShadow, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramPointSpheresShadow, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramPointSpheresShadow, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramPointSpheresShadow, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramPointSpheresShadow, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramPointSpheresShadow);

        if (!this.gl.getProgramParameter(this.shaderProgramPointSpheresShadow, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initPointSpheresShadowShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramPointSpheresShadow));
        }

        this.gl.useProgram(this.shaderProgramPointSpheresShadow);

        this.shaderProgramPointSpheresShadow.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheresShadow, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramPointSpheresShadow.vertexPositionAttribute);

        this.shaderProgramPointSpheresShadow.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheresShadow, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramPointSpheresShadow.vertexNormalAttribute);

        this.shaderProgramPointSpheresShadow.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheresShadow, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramPointSpheresShadow.vertexColourAttribute);

        this.shaderProgramPointSpheresShadow.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "uPMatrix");
        this.shaderProgramPointSpheresShadow.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "uMVMatrix");
        this.shaderProgramPointSpheresShadow.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "uMVINVMatrix");
        this.shaderProgramPointSpheresShadow.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "TextureMatrix");

        this.shaderProgramPointSpheresShadow.fog_start = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "fog_start");
        this.shaderProgramPointSpheresShadow.fog_end = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "fog_end");
        this.shaderProgramPointSpheresShadow.fogColour = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "fogColour");

        this.shaderProgramPointSpheresShadow.offset = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "offset");
        this.shaderProgramPointSpheresShadow.size = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "size");
        this.shaderProgramPointSpheresShadow.scaleMatrix = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "scaleMatrix");

        this.shaderProgramPointSpheresShadow.light_positions = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "light_positions");
        this.shaderProgramPointSpheresShadow.light_colours_ambient = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "light_colours_ambient");
        this.shaderProgramPointSpheresShadow.light_colours_specular = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "light_colours_specular");
        this.shaderProgramPointSpheresShadow.light_colours_diffuse = this.gl.getUniformLocation(this.shaderProgramPointSpheresShadow, "light_colours_diffuse");

    }

    initPointSpheresShaders(vertexShader, fragmentShader) {

        this.shaderProgramPointSpheres = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramPointSpheres, vertexShader);
        this.gl.attachShader(this.shaderProgramPointSpheres, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramPointSpheres, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramPointSpheres, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramPointSpheres, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramPointSpheres, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramPointSpheres);

        if (!this.gl.getProgramParameter(this.shaderProgramPointSpheres, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initPointSpheresShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramPointSpheres));
        }

        this.gl.useProgram(this.shaderProgramPointSpheres);

        this.shaderProgramPointSpheres.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheres, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramPointSpheres.vertexPositionAttribute);

        this.shaderProgramPointSpheres.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheres, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramPointSpheres.vertexNormalAttribute);

        this.shaderProgramPointSpheres.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheres, "aVertexColour");
        this.gl.enableVertexAttribArray(this.shaderProgramPointSpheres.vertexColourAttribute);

        this.shaderProgramPointSpheres.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "uPMatrix");
        this.shaderProgramPointSpheres.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "uMVMatrix");
        this.shaderProgramPointSpheres.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "uMVINVMatrix");

        this.shaderProgramPointSpheres.fog_start = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "fog_start");
        this.shaderProgramPointSpheres.fog_end = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "fog_end");
        this.shaderProgramPointSpheres.fogColour = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "fogColour");

        this.shaderProgramPointSpheres.offset = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "offset");
        this.shaderProgramPointSpheres.size = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "size");
        this.shaderProgramPointSpheres.scaleMatrix = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "scaleMatrix");

        this.shaderProgramPointSpheres.light_positions = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "light_positions");
        this.shaderProgramPointSpheres.light_colours_ambient = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "light_colours_ambient");
        this.shaderProgramPointSpheres.light_colours_specular = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "light_colours_specular");
        this.shaderProgramPointSpheres.light_colours_diffuse = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "light_colours_diffuse");

        this.shaderProgramPointSpheres.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane0");
        this.shaderProgramPointSpheres.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane1");
        this.shaderProgramPointSpheres.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane2");
        this.shaderProgramPointSpheres.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane3");
        this.shaderProgramPointSpheres.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane4");
        this.shaderProgramPointSpheres.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane5");
        this.shaderProgramPointSpheres.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane6");
        this.shaderProgramPointSpheres.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "clipPlane7");
        this.shaderProgramPointSpheres.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramPointSpheres, "nClipPlanes");
    }

    setLightUniforms(program) {
        this.gl.uniform4fv(program.light_positions, this.light_positions);
        this.gl.uniform4fv(program.light_colours_ambient, this.light_colours_ambient);
        this.gl.uniform4fv(program.light_colours_specular, this.light_colours_specular);
        this.gl.uniform4fv(program.light_colours_diffuse, this.light_colours_diffuse);
        if(program.specularPower) this.gl.uniform1f(program.specularPower, this.specularPower);
    }

    setMatrixUniforms(program) {
        this.gl.uniformMatrix4fv(program.pMatrixUniform, false, this.pMatrix);
        this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);
        this.gl.uniform1f(program.fog_start, this.gl_fog_start);
        this.gl.uniform1f(program.fog_end, this.gl_fog_end);
        this.gl.uniform1i(program.nClipPlanes, this.gl_nClipPlanes);
        if(this.calculatingShadowMap&&typeof(this.atom_span)!=="undefined"){
            const offy = -this.atom_span+(this.fogClipOffset+this.gl_clipPlane0[3])
            this.gl.uniform4fv(program.clipPlane0, [0, 0, -1, offy]);
        }else{
            this.gl.uniform4fv(program.clipPlane0, this.gl_clipPlane0);
        }
        this.gl.uniform4fv(program.clipPlane1, this.gl_clipPlane1);
        this.gl.uniform4fv(program.clipPlane2, this.gl_clipPlane2);
        this.gl.uniform4fv(program.clipPlane3, this.gl_clipPlane3);
        this.gl.uniform4fv(program.clipPlane4, this.gl_clipPlane4);
        this.gl.uniform4fv(program.clipPlane5, this.gl_clipPlane5);
        this.gl.uniform4fv(program.clipPlane6, this.gl_clipPlane6);
        this.gl.uniform4fv(program.clipPlane7, this.gl_clipPlane7);
        this.gl.uniform4fv(program.fogColour, new Float32Array(this.background_colour));
        if (program.hasOwnProperty("cursorPos")) {
            this.gl.uniform2fv(program.cursorPos, this.gl_cursorPos);
        }
    }

    buildBuffers() : void {

        let xaxis = vec3Create([1.0, 0.0, 0.0]);
        let yaxis = vec3Create([0.0, 1.0, 0.0]);
        let zaxis = vec3Create([0.0, 0.0, 1.0]);
        let Q = vec3.create();
        let R = vec3.create();

        // FIXME - These need to be global preferences or properties of primitive.
        // spline_accu = 4 is OK for 5kcr on QtWebKit, 8 runs out of memory.
        let accuStep = 20;

        const thisdisplayBufferslength = this.displayBuffers.length;
        //console.log(thisdisplayBufferslength+" buffers to build");

        for (let idx = 0; idx < thisdisplayBufferslength; idx++) {
            if (!this.displayBuffers[idx].isDirty) {
                continue;
            }
            for (let j = 0; j < this.displayBuffers[idx].triangleVertexIndexBuffer.length; j++) {
                this.displayBuffers[idx].isDirty = false;
                if (this.displayBuffers[idx].bufferTypes[j] === "POINTS_SPHERES" || this.displayBuffers[idx].bufferTypes[j] === "SPHEROIDS") {
                    if (typeof (this.sphereBuffer) === "undefined") {
                        this.sphereBuffer = new DisplayBuffer();
                        this.sphereBuffer.triangleVertexNormalBuffer.push(this.gl.createBuffer());
                        this.sphereBuffer.triangleVertexPositionBuffer.push(this.gl.createBuffer());
                        this.sphereBuffer.triangleVertexIndexBuffer.push(this.gl.createBuffer());
                        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.sphereBuffer.triangleVertexIndexBuffer[0]);
                        this.sphereBuffer.triangleVertexIndexBuffer[0].itemSize = 1;
                        this.sphereBuffer.triangleVertexIndexBuffer[0].numItems = icosaIndices.length;
                        if (this.ext) {
                            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(icosaIndices), this.gl.STATIC_DRAW);
                        } else {
                            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(icosaIndices), this.gl.STATIC_DRAW);
                        }
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer.triangleVertexNormalBuffer[0]);
                        this.sphereBuffer.triangleVertexNormalBuffer[0].itemSize = 3;
                        this.sphereBuffer.triangleVertexNormalBuffer[0].numItems = icosaNormals.length / 3;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(icosaNormals), this.gl.STATIC_DRAW);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer.triangleVertexPositionBuffer[0]);
                        this.sphereBuffer.triangleVertexPositionBuffer[0].itemSize = 3;
                        this.sphereBuffer.triangleVertexPositionBuffer[0].numItems = icosaVertices.length / 3;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(icosaVertices), this.gl.STATIC_DRAW);
                    }
                } else if (this.displayBuffers[idx].bufferTypes[j] === "PERFECT_SPHERES" || this.displayBuffers[idx].bufferTypes[j] === "IMAGES" || this.displayBuffers[idx].bufferTypes[j] === "TEXT") {
                    if (typeof (this.imageBuffer) === "undefined") {
                        let diskIndices = [];
                        let diskNormals = [];
                        this.imageVertices = [];
                        accuStep = 90;
                        let diskIdx = 0;
                        this.imageVertices.push(0.0);
                        this.imageVertices.push(0.0);
                        this.imageVertices.push(0.0);
                        diskNormals.push(0.0);
                        diskNormals.push(0.0);
                        diskNormals.push(-1.0);
                        diskIndices.push(diskIdx++);
                        for (let theta = 45; theta <= 405; theta += accuStep) {
                            let theta1 = Math.PI * (theta) / 180.0;
                            let x1 = Math.cos(theta1);
                            let y1 = Math.sin(theta1);
                            this.imageVertices.push(x1);
                            this.imageVertices.push(-y1);
                            this.imageVertices.push(0.0);
                            diskNormals.push(0.0);
                            diskNormals.push(0.0);
                            diskNormals.push(-1.0);
                            diskIndices.push(diskIdx++);
                        }
                        this.imageBuffer = new DisplayBuffer();
                        this.imageBuffer.triangleVertexNormalBuffer.push(this.gl.createBuffer());
                        this.imageBuffer.triangleVertexPositionBuffer.push(this.gl.createBuffer());
                        this.imageBuffer.triangleVertexIndexBuffer.push(this.gl.createBuffer());
                        this.imageBuffer.triangleVertexTextureBuffer.push(this.gl.createBuffer());
                        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.imageBuffer.triangleVertexIndexBuffer[0]);
                        this.imageBuffer.triangleVertexIndexBuffer[0].itemSize = 1;
                        this.imageBuffer.triangleVertexIndexBuffer[0].numItems = diskIndices.length;
                        if (this.ext) {
                            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(diskIndices), this.gl.STATIC_DRAW);
                        } else {
                            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(diskIndices), this.gl.STATIC_DRAW);
                        }
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexNormalBuffer[0]);
                        this.imageBuffer.triangleVertexNormalBuffer[0].itemSize = 3;
                        this.imageBuffer.triangleVertexNormalBuffer[0].numItems = diskNormals.length / 3;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(diskNormals), this.gl.STATIC_DRAW);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexPositionBuffer[0]);
                        this.imageBuffer.triangleVertexPositionBuffer[0].itemSize = 3;
                        this.imageBuffer.triangleVertexPositionBuffer[0].numItems = this.imageVertices.length / 3;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.imageVertices), this.gl.DYNAMIC_DRAW);

                        let imageTextures = [0.5, 0.5, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0];
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexTextureBuffer[0]);
                        this.imageBuffer.triangleVertexTextureBuffer[0].itemSize = 2;
                        this.imageBuffer.triangleVertexTextureBuffer[0].numItems = imageTextures.length / 2;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(imageTextures), this.gl.STATIC_DRAW);
                    }
                    if(this.displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                        this.displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize = 3;
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleInstanceOrigins[j]), this.gl.STATIC_DRAW);
                    }
                    if(this.displayBuffers[idx].triangleInstanceSizeBuffer[j]){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleInstanceSizes[j]), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize = 3;
                    }
                    if(this.displayBuffers[idx].triangleColourBuffer[j]){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleColours[j]), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                    }

                } else if (this.displayBuffers[idx].bufferTypes[j] === "POINTS") {
                    if (typeof (this.diskBuffer) === "undefined") {
                        let diskIndices = [];
                        let diskNormals = [];
                        this.diskVertices = [];
                        accuStep = 10;
                        let diskIdx = 0;
                        this.diskVertices.push(0.0);
                        this.diskVertices.push(0.0);
                        this.diskVertices.push(0.0);
                        diskNormals.push(0.0);
                        diskNormals.push(0.0);
                        diskNormals.push(-1.0);
                        diskIndices.push(diskIdx++);
                        for (let theta = 0; theta <= 360; theta += accuStep) {
                            let theta1 = Math.PI * (theta) / 180.0;
                            let y1 = Math.cos(theta1);
                            let x1 = Math.sin(theta1);
                            this.diskVertices.push(x1);
                            this.diskVertices.push(y1);
                            this.diskVertices.push(0.0);
                            diskNormals.push(0.0);
                            diskNormals.push(0.0);
                            diskNormals.push(-1.0);
                            diskIndices.push(diskIdx++);
                        }
                        this.diskBuffer = new DisplayBuffer();
                        this.diskBuffer.triangleVertexNormalBuffer.push(this.gl.createBuffer());
                        this.diskBuffer.triangleVertexPositionBuffer.push(this.gl.createBuffer());
                        this.diskBuffer.triangleVertexIndexBuffer.push(this.gl.createBuffer());
                        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.diskBuffer.triangleVertexIndexBuffer[0]);
                        this.diskBuffer.triangleVertexIndexBuffer[0].itemSize = 1;
                        this.diskBuffer.triangleVertexIndexBuffer[0].numItems = diskIndices.length;
                        if (this.ext) {
                            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(diskIndices), this.gl.STATIC_DRAW);
                        } else {
                            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(diskIndices), this.gl.STATIC_DRAW);
                        }
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diskBuffer.triangleVertexNormalBuffer[0]);
                        this.diskBuffer.triangleVertexNormalBuffer[0].itemSize = 3;
                        this.diskBuffer.triangleVertexNormalBuffer[0].numItems = diskNormals.length / 3;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(diskNormals), this.gl.STATIC_DRAW);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diskBuffer.triangleVertexPositionBuffer[0]);
                        this.diskBuffer.triangleVertexPositionBuffer[0].itemSize = 3;
                        this.diskBuffer.triangleVertexPositionBuffer[0].numItems = this.diskVertices.length / 3;
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.diskVertices), this.gl.DYNAMIC_DRAW);
                    }
                } else if (this.displayBuffers[idx].bufferTypes[j] === "CIRCLES2") {
                    console.log("Not implemented, do nothing yet ...");
                    console.log(this.displayBuffers[idx]);
                    let circ_idx = 0;
                    let triangleNormals = [];
                    let triangleVertices = [];
                    for (let k = 0; k < this.displayBuffers[idx].triangleVertices[j].length; k += 3, circ_idx++) {
                        let x = this.displayBuffers[idx].triangleVertices[j][k];
                        let y = this.displayBuffers[idx].triangleVertices[j][k + 1];
                        let z = this.displayBuffers[idx].triangleVertices[j][k + 2];
                        let tSizeX = 0.5; //FIXME - Depends on size
                        let tSizeY = 0.5; //FIXME - Depends on size
                        let up = [0, 1, 0];
                        let right = [1, 0, 0];
                        //FIXME - Aargh! Cannot do this need up and right to be uniform in shader ...
                        triangleVertices.push(x - tSizeY * up[0] - tSizeX * right[0]); triangleVertices.push(y - tSizeY * up[1] - tSizeX * right[1]); triangleVertices.push(z - tSizeY * up[2] - tSizeX * right[2]);
                        triangleVertices.push(x - tSizeY * up[0] + tSizeX * right[0]); triangleVertices.push(y - tSizeY * up[1] + tSizeX * right[1]); triangleVertices.push(z - tSizeY * up[2] + tSizeX * right[2]);
                        triangleVertices.push(x + tSizeY * up[0] + tSizeX * right[0]); triangleVertices.push(y + tSizeY * up[1] + tSizeX * right[1]); triangleVertices.push(z + tSizeY * up[2] + tSizeX * right[2]);

                        triangleVertices.push(x - tSizeY * up[0] - tSizeX * right[0]); triangleVertices.push(y - tSizeY * up[1] - tSizeX * right[1]); triangleVertices.push(z - tSizeY * up[2] - tSizeX * right[2]);
                        triangleVertices.push(x + tSizeY * up[0] + tSizeX * right[0]); triangleVertices.push(y + tSizeY * up[1] + tSizeX * right[1]); triangleVertices.push(z + tSizeY * up[2] + tSizeX * right[2]);
                        triangleVertices.push(x + tSizeY * up[0] - tSizeX * right[0]); triangleVertices.push(y + tSizeY * up[1] - tSizeX * right[1]); triangleVertices.push(z + tSizeY * up[2] - tSizeX * right[2]);

                        triangleNormals.push(0.0); triangleNormals.push(0.0); triangleNormals.push(1.0);
                        triangleNormals.push(0.0); triangleNormals.push(0.0); triangleNormals.push(1.0);
                        triangleNormals.push(0.0); triangleNormals.push(0.0); triangleNormals.push(1.0);
                        triangleNormals.push(0.0); triangleNormals.push(0.0); triangleNormals.push(1.0);
                        triangleNormals.push(0.0); triangleNormals.push(0.0); triangleNormals.push(1.0);
                        triangleNormals.push(0.0); triangleNormals.push(0.0); triangleNormals.push(1.0);

                    }
                } else if (this.displayBuffers[idx].bufferTypes[j] === "CIRCLES") {
                    let PIBY2 = Math.PI * 2;
                    let triangleIndexs = [];
                    let triangleVertices = [];
                    let triangleColours = [];
                    let torusIdx = 0;
                    let icol = 0;
                    let tor_idx = 0;
                    for (let k = 0; k < this.displayBuffers[idx].triangleVertices[j].length; k += 3, icol += 4, tor_idx++) {
                        let torusOrigin = vec3Create([this.displayBuffers[idx].triangleVertices[j][k], this.displayBuffers[idx].triangleVertices[j][k + 1], this.displayBuffers[idx].triangleVertices[j][k + 2]]);
                        let torusNormal = vec3Create([this.displayBuffers[idx].triangleNormals[j][k], this.displayBuffers[idx].triangleNormals[j][k + 1], this.displayBuffers[idx].triangleNormals[j][k + 2]]);
                        let torusColour = [this.displayBuffers[idx].triangleColours[j][icol], this.displayBuffers[idx].triangleColours[j][icol + 1], this.displayBuffers[idx].triangleColours[j][icol + 2], this.displayBuffers[idx].triangleColours[j][icol + 3]];
                        NormalizeVec3(torusNormal);
                        vec3Cross(xaxis, torusNormal, Q);
                        if (vec3.length(Q) > 1e-5) {
                            NormalizeVec3(Q);
                            vec3Cross(torusNormal, Q, R);
                        } else {
                            vec3Cross(yaxis, torusNormal, Q);
                            if (vec3.length(Q) > 1e-5) {
                                NormalizeVec3(Q);
                                vec3Cross(torusNormal, Q, R);
                            } else {
                                vec3Cross(zaxis, torusNormal, Q);
                                if (vec3.length(Q) > 1e-5) {
                                    NormalizeVec3(Q);
                                    vec3Cross(torusNormal, Q, R);
                                }
                            }
                        }
                        let mat = mat4.create();
                        mat4.set(mat, R[0], R[1], R[2], 0.0, Q[0], Q[1], Q[2], 0.0, torusNormal[0], torusNormal[1], torusNormal[2], 0.0, 0.0, 0.0, 0.0, 1.0);
                        let nsectors = 180;
                        let startAngle = 0.0;
                        let sweepAngle = 360.0;
                        let sa;
                        let ea;
                        if (sweepAngle > 0) {
                            sa = startAngle;
                            ea = startAngle + sweepAngle;
                        } else {
                            sa = startAngle + sweepAngle;
                            ea = startAngle;
                        }
                        let iloop = 0;
                        let radius = this.displayBuffers[idx].supplementary["radii"][j][tor_idx];
                        let majorRadius = radius;
                        for (let jtor = sa; jtor < ea; jtor = jtor + 360 / nsectors, iloop++) {
                            let phi = 1.0 * jtor / 360.0 * PIBY2;
                            let phi2 = 1.0 * (jtor + 360.0 / nsectors) / 360.0 * PIBY2;
                            if (sweepAngle > 0 && jtor + 360.0 / nsectors > startAngle + sweepAngle) phi2 = 1.0 * (startAngle + sweepAngle) / 360.0 * PIBY2;
                            if (sweepAngle < 0 && jtor + 360.0 / nsectors > startAngle) phi2 = 1.0 * (startAngle) / 360.0 * PIBY2;

                            let x = (majorRadius) * Math.cos(phi);
                            let y = (majorRadius) * Math.sin(phi);
                            let z = 0.0;

                            let x2 = (majorRadius) * Math.cos(phi2);
                            let y2 = (majorRadius) * Math.sin(phi2);
                            let z2 = 0.0;

                            let p1 = vec3Create([x, y, z]);
                            let p2 = vec3Create([x2, y2, z2]);

                            vec3.transformMat4(p1, p1, mat);
                            vec3.transformMat4(p2, p2, mat);

                            x = p1[0]; y = p1[1]; z = p1[2];
                            x2 = p2[0]; y2 = p2[1]; z2 = p2[2];

                            triangleVertices.push(torusOrigin[0] + x2); triangleVertices.push(torusOrigin[1] + y2); triangleVertices.push(torusOrigin[2] + z2);
                            triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                            triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                            triangleIndexs.push(torusIdx++);
                            triangleIndexs.push(torusIdx++);
                        }
                    }

                    // Try thick lines
                    let size = 1.0;
                    let thickLines = this.linesToThickLines(triangleVertices, triangleColours, size);
                    let Normals_new = thickLines["normals"];
                    let Vertices_new = thickLines["vertices"];
                    let Colours_new = thickLines["colours"];
                    let Indexs_new = thickLines["indices"];
                    //console.log("Buffering "+Normals_new.length/3+" normals");
                    //console.log("Buffering "+Vertices_new.length/3+" vertices");
                    //console.log("Buffering "+Colours_new.length/4+" colours");
                    //console.log("Buffering "+Indexs_new.length+" indices");
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(Indexs_new), this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Indexs_new), this.gl.STATIC_DRAW);
                    }
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Normals_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Vertices_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Colours_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;
                    this.displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;

                } else if (this.displayBuffers[idx].bufferTypes[j] === "TORUSES") {
                    let PIBY2 = Math.PI * 2;
                    let primitiveSizes = this.displayBuffers[idx].primitiveSizes[j];
                    let triangleIndexs = [];
                    let triangleNormals = [];
                    let triangleVertices = [];
                    let triangleColours = [];
                    let torusIdx = 0;
                    let icol = 0;
                    let tor_idx = 0;
                    for (let k = 0; k < this.displayBuffers[idx].triangleVertices[j].length; k += 3, icol += 4, tor_idx++) {
                        let torusOrigin = vec3Create([this.displayBuffers[idx].triangleVertices[j][k], this.displayBuffers[idx].triangleVertices[j][k + 1], this.displayBuffers[idx].triangleVertices[j][k + 2]]);
                        let torusNormal = vec3Create([this.displayBuffers[idx].triangleNormals[j][k], this.displayBuffers[idx].triangleNormals[j][k + 1], this.displayBuffers[idx].triangleNormals[j][k + 2]]);
                        let torusColour = [this.displayBuffers[idx].triangleColours[j][icol], this.displayBuffers[idx].triangleColours[j][icol + 1], this.displayBuffers[idx].triangleColours[j][icol + 2], this.displayBuffers[idx].triangleColours[j][icol + 3]];
                        NormalizeVec3(torusNormal);
                        vec3Cross(xaxis, torusNormal, Q);
                        if (vec3.length(Q) > 1e-5) {
                            NormalizeVec3(Q);
                            vec3Cross(torusNormal, Q, R);
                        } else {
                            vec3Cross(yaxis, torusNormal, Q);
                            if (vec3.length(Q) > 1e-5) {
                                NormalizeVec3(Q);
                                vec3Cross(torusNormal, Q, R);
                            } else {
                                vec3Cross(zaxis, torusNormal, Q);
                                if (vec3.length(Q) > 1e-5) {
                                    NormalizeVec3(Q);
                                    vec3Cross(torusNormal, Q, R);
                                }
                            }
                        }
                        let mat = mat4.create();
                        mat4.set(mat, R[0], R[1], R[2], 0.0, Q[0], Q[1], Q[2], 0.0, torusNormal[0], torusNormal[1], torusNormal[2], 0.0, 0.0, 0.0, 0.0, 1.0);
                        let nsectors = 36;
                        let startAngle = 0.0;
                        let sweepAngle = 360.0;
                        let sa;
                        let ea;
                        if (sweepAngle > 0) {
                            sa = startAngle;
                            ea = startAngle + sweepAngle;
                        } else {
                            sa = startAngle + sweepAngle;
                            ea = startAngle;
                        }
                        var iloop = 0;
                        var radius = this.displayBuffers[idx].supplementary["radii"][j][tor_idx];
                        var majorRadius = radius;
                        var minorRadius = primitiveSizes[tor_idx];
                        for (var jtor = sa; jtor < ea; jtor = jtor + 360 / nsectors, iloop++) {
                            var phi = 1.0 * jtor / 360.0 * PIBY2;
                            var phi2 = 1.0 * (jtor + 360.0 / nsectors) / 360.0 * PIBY2;
                            if (sweepAngle > 0 && jtor + 360.0 / nsectors > startAngle + sweepAngle) phi2 = 1.0 * (startAngle + sweepAngle) / 360.0 * PIBY2;
                            if (sweepAngle < 0 && jtor + 360.0 / nsectors > startAngle) phi2 = 1.0 * (startAngle) / 360.0 * PIBY2;
                            for (var itor = 0; itor <= 360; itor = itor + 360 / nsectors) {
                                var theta = 1.0 * itor / 360.0 * PIBY2;
                                var theta2 = (1.0 * itor + 360.0 / nsectors) / 360.0 * PIBY2;

                                var x = (majorRadius + minorRadius * Math.cos(theta)) * Math.cos(phi);
                                var y = (majorRadius + minorRadius * Math.cos(theta)) * Math.sin(phi);
                                var z = minorRadius * Math.sin(theta);
                                var norm_x = Math.cos(theta) * Math.cos(phi);
                                var norm_y = Math.cos(theta) * Math.sin(phi);
                                var norm_z = Math.sin(theta);

                                var x2 = (majorRadius + minorRadius * Math.cos(theta)) * Math.cos(phi2);
                                var y2 = (majorRadius + minorRadius * Math.cos(theta)) * Math.sin(phi2);
                                var z2 = minorRadius * Math.sin(theta);
                                var norm_x2 = Math.cos(theta) * Math.cos(phi2);
                                var norm_y2 = Math.cos(theta) * Math.sin(phi2);
                                var norm_z2 = Math.sin(theta);

                                var x3 = (majorRadius + minorRadius * Math.cos(theta2)) * Math.cos(phi);
                                var y3 = (majorRadius + minorRadius * Math.cos(theta2)) * Math.sin(phi);
                                var z3 = minorRadius * Math.sin(theta2);
                                var norm_x3 = Math.cos(theta2) * Math.cos(phi);
                                var norm_y3 = Math.cos(theta2) * Math.sin(phi);
                                var norm_z3 = Math.sin(theta2);

                                var x4 = (majorRadius + minorRadius * Math.cos(theta2)) * Math.cos(phi2);
                                var y4 = (majorRadius + minorRadius * Math.cos(theta2)) * Math.sin(phi2);
                                var z4 = minorRadius * Math.sin(theta2);
                                var norm_x4 = Math.cos(theta2) * Math.cos(phi2);
                                var norm_y4 = Math.cos(theta2) * Math.sin(phi2);
                                var norm_z4 = Math.sin(theta2);

                                var p1 = vec3Create([x, y, z]);
                                var p2 = vec3Create([x2, y2, z2]);
                                var p3 = vec3Create([x3, y3, z3]);
                                var p4 = vec3Create([x4, y4, z4]);

                                var n1 = vec3Create([norm_x, norm_y, norm_z]);
                                var n2 = vec3Create([norm_x2, norm_y2, norm_z2]);
                                var n3 = vec3Create([norm_x3, norm_y3, norm_z3]);
                                var n4 = vec3Create([norm_x4, norm_y4, norm_z4]);

                                vec3.transformMat4(p1, p1, mat);
                                vec3.transformMat4(p2, p2, mat);
                                vec3.transformMat4(p3, p3, mat);
                                vec3.transformMat4(p4, p4, mat);
                                vec3.transformMat4(n1, n1, mat);
                                vec3.transformMat4(n2, n2, mat);
                                vec3.transformMat4(n3, n3, mat);
                                vec3.transformMat4(n4, n4, mat);

                                x = p1[0]; y = p1[1]; z = p1[2];
                                x2 = p2[0]; y2 = p2[1]; z2 = p2[2];
                                x3 = p3[0]; y3 = p3[1]; z3 = p3[2];
                                x4 = p4[0]; y4 = p4[1]; z4 = p4[2];
                                norm_x = n1[0]; norm_y = n1[1]; norm_z = n1[2];
                                norm_x2 = n2[0]; norm_y2 = n2[1]; norm_z2 = n2[2];
                                norm_x3 = n3[0]; norm_y3 = n3[1]; norm_z3 = n3[2];
                                norm_x4 = n4[0]; norm_y4 = n4[1]; norm_z4 = n4[2];

                                triangleVertices.push(torusOrigin[0] + x2); triangleVertices.push(torusOrigin[1] + y2); triangleVertices.push(torusOrigin[2] + z2);
                                triangleVertices.push(torusOrigin[0] + x); triangleVertices.push(torusOrigin[1] + y); triangleVertices.push(torusOrigin[2] + z);
                                triangleVertices.push(torusOrigin[0] + x3); triangleVertices.push(torusOrigin[1] + y3); triangleVertices.push(torusOrigin[2] + z3);
                                triangleNormals.push(norm_x2); triangleNormals.push(norm_y2); triangleNormals.push(norm_z2);
                                triangleNormals.push(norm_x); triangleNormals.push(norm_y); triangleNormals.push(norm_z);
                                triangleNormals.push(norm_x3); triangleNormals.push(norm_y3); triangleNormals.push(norm_z3);
                                triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                                triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                                triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                                triangleIndexs.push(torusIdx++);
                                triangleIndexs.push(torusIdx++);
                                triangleIndexs.push(torusIdx++);

                                triangleVertices.push(torusOrigin[0] + x4); triangleVertices.push(torusOrigin[1] + y4); triangleVertices.push(torusOrigin[2] + z4);
                                triangleVertices.push(torusOrigin[0] + x2); triangleVertices.push(torusOrigin[1] + y2); triangleVertices.push(torusOrigin[2] + z2);
                                triangleVertices.push(torusOrigin[0] + x3); triangleVertices.push(torusOrigin[1] + y3); triangleVertices.push(torusOrigin[2] + z3);
                                triangleNormals.push(norm_x4); triangleNormals.push(norm_y4); triangleNormals.push(norm_z4);
                                triangleNormals.push(norm_x2); triangleNormals.push(norm_y2); triangleNormals.push(norm_z2);
                                triangleNormals.push(norm_x3); triangleNormals.push(norm_y3); triangleNormals.push(norm_z3);
                                triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                                triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                                triangleColours.push(torusColour[0]); triangleColours.push(torusColour[1]); triangleColours.push(torusColour[2]); triangleColours.push(torusColour[3]);
                                triangleIndexs.push(torusIdx++);
                                triangleIndexs.push(torusIdx++);
                                triangleIndexs.push(torusIdx++);
                            }
                        }
                    }

                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(triangleIndexs), this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleIndexs), this.gl.STATIC_DRAW);
                    }

                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = triangleNormals.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = triangleNormals.length / 3;
                    this.displayBuffers[idx].triangleColourBuffer[j].numItems = triangleColours.length / 4;
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = triangleIndexs.length;

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(triangleNormals), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(triangleVertices), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(triangleColours), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;

                } else if (this.displayBuffers[idx].bufferTypes[j] === "NORMALLINES") {
                    console.log("Treating normal lines specially");
                    var size = this.mapLineWidth;//1.0;
                    const useIndices = this.displayBuffers[idx].supplementary["useIndices"];
                    let thickLines;
                    if (useIndices) {
                        thickLines = this.linesToThickLinesWithIndicesAndNormals(this.displayBuffers[idx].triangleVertices[j], this.displayBuffers[idx].triangleNormals[j], this.displayBuffers[idx].triangleColours[j], this.displayBuffers[idx].triangleIndexs[j], size);
                    } else {
                        return;
                    }
                    var Normals_new = thickLines["normals"];
                    var RealNormals_new = thickLines["realNormals"];
                    var Vertices_new = thickLines["vertices"];
                    var Colours_new = thickLines["colours"];
                    var Indexs_new = thickLines["indices"];
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(Indexs_new), this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Indexs_new), this.gl.STATIC_DRAW);
                    }
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexRealNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(RealNormals_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexRealNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Normals_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Vertices_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Colours_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexRealNormalBuffer[j].numItems = RealNormals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;
                    this.displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;

                } else if (this.displayBuffers[idx].bufferTypes[j] === "LINES") {
                    let size = this.mapLineWidth;
                    const useIndices = this.displayBuffers[idx].supplementary["useIndices"];
                    let thickLines;
                    if (useIndices) {
                        thickLines = this.linesToThickLinesWithIndices(this.displayBuffers[idx].triangleVertices[j], this.displayBuffers[idx].triangleColours[j], this.displayBuffers[idx].triangleIndexs[j], size);
                    } else {
                        thickLines = this.linesToThickLines(this.displayBuffers[idx].triangleVertices[j], this.displayBuffers[idx].triangleColours[j], size);
                    }
                    let Normals_new = thickLines["normals"];
                    let Vertices_new = thickLines["vertices"];
                    let Colours_new = thickLines["colours"];
                    let Indexs_new = thickLines["indices"];
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(Indexs_new), this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Indexs_new), this.gl.STATIC_DRAW);
                    }
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Normals_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Vertices_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Colours_new), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;
                    this.displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;

                } else {
                    //console.log("This buffer type is "+this.displayBuffers[idx].bufferTypes[j]);
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.displayBuffers[idx].triangleIndexs[j]), this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.displayBuffers[idx].triangleIndexs[j]), this.gl.STATIC_DRAW);
                    }
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    if (this.displayBuffers[idx].bufferTypes[j] !== "NORMALLINES" && this.displayBuffers[idx].bufferTypes[j] !== "LINES" && this.displayBuffers[idx].bufferTypes[j] !== "LINE_LOOP" && this.displayBuffers[idx].bufferTypes[j] !== "LINE_STRIP" && this.displayBuffers[idx].bufferTypes[j] !== "POINTS" && this.displayBuffers[idx].bufferTypes[j] !== "POINTS_SPHERES" && this.displayBuffers[idx].bufferTypes[j] !== "CAPCYLINDERS" && this.displayBuffers[idx].bufferTypes[j] !== "SPHEROIDS" && this.displayBuffers[idx].bufferTypes[j] !== "TORUSES" && this.displayBuffers[idx].bufferTypes[j] !== "CIRCLES") {
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleNormals[j]), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    }
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleVertices[j]), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleColours[j]), this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                    if(this.displayBuffers[idx].triangleInstanceSizeBuffer[j]){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleInstanceSizes[j]), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize = 3;
                    }
                    if(this.displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleInstanceOrigins[j]), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize = 3;
                    }
                    if(this.displayBuffers[idx].triangleInstanceOrientationBuffer[j]){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceOrientationBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleInstanceOrientations[j]), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleInstanceOrientationBuffer[j].itemSize = 16;
                    }
                }
            }
        }
        //console.log("Time to build buffers: "+(new Date().getTime()-start));
    }


    drawTransformMatrixInteractive(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:MGWebGLShader, vertexType:number, bufferIdx:number, specialDrawBuffer?:number) {

        this.setupModelViewTransformMatrixInteractive(transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);

        this.drawBuffer(buffer,shader,bufferIdx,vertexType,specialDrawBuffer);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
    }

    applySymmetryMatrix(theShader,symmetryMatrix,tempMVMatrix,tempMVInvMatrix){
        let symt = mat4.create();
        let invsymt = mat4.create();
        mat4.set(symt,
                symmetryMatrix[0], symmetryMatrix[1], symmetryMatrix[2], symmetryMatrix[3],
                symmetryMatrix[4], symmetryMatrix[5], symmetryMatrix[6], symmetryMatrix[7],
                symmetryMatrix[8], symmetryMatrix[9], symmetryMatrix[10], symmetryMatrix[11],
                symmetryMatrix[12], symmetryMatrix[13], symmetryMatrix[14], symmetryMatrix[15]);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.invert(invsymt, symt);
        invsymt[12] = 0.0;
        invsymt[13] = 0.0;
        invsymt[14] = 0.0;
        this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, tempMVMatrix);
        this.gl.uniformMatrix4fv(theShader.invSymMatrixUniform, false, invsymt);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);// All else
        this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
        let screenZ = vec3.create();
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(theShader.screenZ, screenZ);
    }

    drawBuffer(theBuffer:any,theShaderIn:MGWebGLShader|ShaderTrianglesInstanced,j:number,vertexType:number,specialDrawBuffer?:any) : void {

        const bright_y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;

        let drawBuffer;
        if (specialDrawBuffer) {
            drawBuffer = specialDrawBuffer;
        } else {
            drawBuffer = theBuffer.triangleVertexIndexBuffer[j];
        }

        if (this.ext) {
            const theShader = theShaderIn as ShaderTrianglesInstanced;
            if(theBuffer.triangleInstanceOriginBuffer[j]){
                this.gl.enableVertexAttribArray(theShader.vertexInstanceOriginAttribute);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleInstanceOriginBuffer[j]);
                this.gl.vertexAttribPointer(theShader.vertexInstanceOriginAttribute, theBuffer.triangleInstanceOriginBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                if (this.WEBGL2) {
                    this.gl.vertexAttribDivisor(theShader.vertexInstanceOriginAttribute, 1);
                } else {
                    this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOriginAttribute, 1);
                }
                if(theBuffer.triangleInstanceSizeBuffer[j]){
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceSizeAttribute);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleInstanceSizeBuffer[j]);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceSizeAttribute, theBuffer.triangleInstanceSizeBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                    if (this.WEBGL2) {
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceSizeAttribute, 1);
                    } else {
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceSizeAttribute, 1);
                    }
                }
                if(theBuffer.triangleInstanceOrientationBuffer[j]){
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute);
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+1);
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+2);
                    this.gl.enableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+3);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleInstanceOrientationBuffer[j]);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute, 4, this.gl.FLOAT, false, 64, 0);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+1, 4, this.gl.FLOAT, false, 64, 16);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+2, 4, this.gl.FLOAT, false, 64, 32);
                    this.gl.vertexAttribPointer(theShader.vertexInstanceOrientationAttribute+3, 4, this.gl.FLOAT, false, 64, 48);
                    if (this.WEBGL2) {
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute, 1);
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+1, 1);
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+2, 1);
                        this.gl.vertexAttribDivisor(theShader.vertexInstanceOrientationAttribute+3, 1);
                    } else {
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute, 1);
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+1, 1);
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+2, 1);
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexInstanceOrientationAttribute+3, 1);
                    }
                }
                if(theBuffer.supplementary["instance_use_colors"]){
                    this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.triangleColourBuffer[j]);
                    this.gl.vertexAttribPointer(theShader.vertexColourAttribute, theBuffer.triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                    if(theBuffer.supplementary["instance_use_colors"][j]){
                        if (this.WEBGL2) {
                            this.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 1);
                        } else {
                            this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 1);
                        }
                    }
                    if(this.stencilPass){
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        if(bright_y<0.5)
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                        else
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                    }
                }
                if (this.WEBGL2) {
                    this.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                } else {
                    this.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                }
                if(theBuffer.symmetryMatrices.length>0){
                    /*this.gl.uniform4fv(theShader.light_colours_diffuse,
                            new Float32Array([Math.max(this.light_colours_diffuse[0]-.4,0.2),
                                Math.max(this.light_colours_diffuse[1]-.4,0.2),
                                Math.max(this.light_colours_diffuse[2]-.4,0.2), 1.0]));
                    this.gl.uniform4fv(theShader.light_colours_specular, new Float32Array([0.0,0.0,0.0,1.0]));
                    //this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    //this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 0.0, 0.0, 1.0);
                    */
                    let tempMVMatrix = mat4.create();
                    let tempMVInvMatrix = mat4.create();
                    for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                        this.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                        if (this.WEBGL2) {
                            this.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                        } else {
                            this.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                        }

                    }
                    this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, this.mvMatrix);// All else
                    this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                    this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                }
                if(theShader.light_colours_diffuse) this.gl.uniform4fv(theShader.light_colours_diffuse, this.light_colours_diffuse);
                if(theShader.light_colours_specular) this.gl.uniform4fv(theShader.light_colours_specular, this.light_colours_specular);
                if(theShader.specularPower) this.gl.uniform1f(theShader.specularPower, this.specularPower);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOriginAttribute);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceSizeAttribute);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+1);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+2);
                this.gl.disableVertexAttribArray(theShader.vertexInstanceOrientationAttribute+3);
                if (this.WEBGL2) {
                    this.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 0);
                } else {
                    this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 0);
                }
            } else {
                const theShader = theShaderIn as MGWebGLShader;
                if(theBuffer.symmetryMatrices.length>0){
                    let tempMVMatrix = mat4.create();
                    let tempMVInvMatrix = mat4.create();
                    for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                        this.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                        if (this.WEBGL2) {
                            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
                        }

                    }
                    this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, this.mvMatrix);// All else
                    this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                    this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                }
                this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
            }
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
    }

    setupModelViewTransformMatrixInteractive(transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer) {

        let screenZ = vec3.create();
        let tempMVMatrix = mat4.create();
        let tempMVInvMatrix = mat4.create();
        let symt = mat4.create();
        mat4.set(symt,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        //mat4.transpose(symt,symt_t);

        mat4.translate(this.mvMatrix, this.mvMatrix, [transformOrigin[0] - this.origin[0], transformOrigin[1] - this.origin[1], transformOrigin[2] - this.origin[2]]);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.translate(this.mvMatrix, this.mvMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);
        mat4.translate(tempMVMatrix, tempMVMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);

    }

    drawTransformMatrix(transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number, specialDrawBuffer?:any) : void {
        var triangleVertexIndexBuffer = buffer.triangleVertexIndexBuffer;

        var drawBuffer;
        if (specialDrawBuffer) {
            drawBuffer = specialDrawBuffer;
        } else {
            drawBuffer = triangleVertexIndexBuffer[bufferIdx];
        }

        var screenZ = vec3.create();
        var tempMVMatrix = mat4.create();
        var tempMVInvMatrix = mat4.create();
        var symt_t = mat4.create();
        var symt = mat4.create();
        mat4.set(symt_t,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        mat4.transpose(symt, symt_t);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, tempMVInvMatrix);// All else
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);
        if (this.ext) {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else

    }

    drawTransformMatrixInteractivePMV(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
        var triangleVertexIndexBuffer = buffer.triangleVertexIndexBuffer;

        var drawBuffer = triangleVertexIndexBuffer[bufferIdx];

        var pmvMatrix = mat4.create();
        var screenZ = vec3.create();
        var tempMVMatrix = mat4.create();
        var tempMVInvMatrix = mat4.create();
        var symt = mat4.create();
        mat4.set(symt,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        //mat4.transpose(symt,symt_t);

        mat4.translate(this.mvMatrix, this.mvMatrix, [transformOrigin[0] - this.origin[0], transformOrigin[1] - this.origin[1], transformOrigin[2] - this.origin[2]]);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.translate(this.mvMatrix, this.mvMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);
        mat4.translate(tempMVMatrix, tempMVMatrix, [-transformOrigin[0] + this.origin[0], -transformOrigin[1] + this.origin[1], -transformOrigin[2] + this.origin[2]]);
        mat4.multiply(pmvMatrix, this.pMatrix, tempMVMatrix); // Lines

        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);

        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);
        if (this.ext) {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, this.pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix); // Lines
        this.gl.uniform3fv(shader.screenZ, this.screenZ); // Lines

    }

    drawTransformMatrixPMV(transformMatrix:number[], buffer:any, shader:any, vertexType:number, bufferIdx:number) {
        var triangleVertexIndexBuffer = buffer.triangleVertexIndexBuffer;

        var drawBuffer = triangleVertexIndexBuffer[bufferIdx];

        var pmvMatrix = mat4.create();
        var screenZ = vec3.create();
        var tempMVMatrix = mat4.create();
        var tempMVInvMatrix = mat4.create();
        var symt_t = mat4.create();
        var symt = mat4.create();
        mat4.set(symt_t,
            transformMatrix[0],
            transformMatrix[1],
            transformMatrix[2],
            transformMatrix[3],
            transformMatrix[4],
            transformMatrix[5],
            transformMatrix[6],
            transformMatrix[7],
            transformMatrix[8],
            transformMatrix[9],
            transformMatrix[10],
            transformMatrix[11],
            transformMatrix[12],
            transformMatrix[13],
            transformMatrix[14],
            transformMatrix[15],
        );
        mat4.transpose(symt, symt_t);
        mat4.multiply(tempMVMatrix, this.mvMatrix, symt);
        mat4.multiply(pmvMatrix, this.pMatrix, tempMVMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, tempMVMatrix);
        tempMVMatrix[12] = 0.0;
        tempMVMatrix[13] = 0.0;
        tempMVMatrix[14] = 0.0;
        mat4.invert(tempMVInvMatrix, tempMVMatrix);
        screenZ[0] = 0.0;
        screenZ[1] = 0.0;
        screenZ[2] = 1.0;
        vec3.transformMat4(screenZ, screenZ, tempMVInvMatrix);
        this.gl.uniform3fv(shader.screenZ, screenZ);
        if (this.ext) {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, this.pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix); // Lines
        this.gl.uniform3fv(shader.screenZ, this.screenZ); // Lines

    }

    GLrender(calculatingShadowMap) {

        //console.log("GLrender",calculatingShadowMap);

        //const theVector = this.calculate3DVectorFrom2DVector([20,20]);
        //console.log(theVector[0],theVector[1],theVector[2]);

        //this.mouseDown = false; ???
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;


        if (calculatingShadowMap) {
            if(!this.offScreenReady)
                this.recreateOffScreeenBuffers();
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            const width_ratio = this.gl.viewportWidth / this.rttFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.rttFramebuffer.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferDepth);
            this.gl.viewport(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio);
        } else if(this.renderSilhouettesToTexture) {
            if(!this.silhouetteBufferReady)
                this.recreateSilhouetteBuffers();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.silhouetteFramebuffer);
            let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        } else if(this.renderToTexture) {
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(this.gl.LESS);
            this.gl.viewport(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height);
            let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            if(this.useOffScreenBuffers&&this.WEBGL2){
                if(!this.offScreenReady)
                    this.recreateOffScreeenBuffers();
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
                let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
            }
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        if(this.renderSilhouettesToTexture) {
            this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0);
        } else {
            this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        }
        if(this.doStenciling){
            if(!this.stenciling){
                this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            }
        } else {
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }

        mat4.identity(this.mvMatrix);

        var oldQuat = quat4.clone(this.myQuat);
        var newQuat = quat4.clone(this.myQuat);

        if (calculatingShadowMap) {
            //FIXME - This needs to depend on molecule.
            var shadowExtent = 170.0; // ??
            let min_x =  1e5;
            let max_x = -1e5;
            let min_y =  1e5;
            let max_y = -1e5;
            let min_z =  1e5;
            let max_z = -1e5;

            this.displayBuffers.forEach(buffer => {
                buffer.atoms.forEach(atom => {
                    if(atom.x>max_x) max_x = atom.x;
                    if(atom.x<min_x) min_x = atom.x;
                    if(atom.y>max_y) max_y = atom.y;
                    if(atom.y<min_y) min_y = atom.y;
                    if(atom.z>max_z) max_z = atom.z;
                    if(atom.z<min_z) min_z = atom.z;
                })
            })
            let atom_span = Math.sqrt((max_x - min_x) * (max_x - min_x) + (max_y - min_y) * (max_y - min_y) +(max_z - min_z) * (max_z - min_z));
            atom_span = Math.min(1000.0,atom_span);
            this.atom_span = atom_span;

            mat4.ortho(this.pMatrix, -24 * ratio / this.zoom, 24 * ratio / this.zoom, -24 / this.zoom, 24 / this.zoom, 0.1, shadowExtent);//??
            mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, -atom_span]);

            var rotX = quat4.create();
            quat4.set(rotX, 0, 0, 0, -1);
            var zprime = vec3Create([this.light_positions[0], this.light_positions[1], this.light_positions[2]]);
            NormalizeVec3(zprime);
            var zorig = vec3Create([0.0, 0.0, 1.0]);
            var dp = vec3.dot(zprime, zorig);
            if ((1.0 - dp) > 1e-6) {
                var axis = vec3.create();
                vec3Cross(zprime, zorig, axis);
                NormalizeVec3(axis);
                var angle = -Math.acos(dp);
                var dval3 = Math.cos(angle / 2.0);
                var dval0 = axis[0] * Math.sin(angle / 2.0);
                var dval1 = axis[1] * Math.sin(angle / 2.0);
                var dval2 = axis[2] * Math.sin(angle / 2.0);
                rotX = quat4.create();
                quat4.set(rotX, dval0, dval1, dval2, dval3);
                quat4.multiply(newQuat, newQuat, rotX);
            }
            this.gl.disable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.FRONT);
        } else {
            this.gl.disable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.BACK);
            //mat4.perspective(45, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 10000.0, this.pMatrix);
            if(this.renderToTexture){
                if(this.doPerspectiveProjection){
                    if(this.gl.viewportWidth > this.gl.viewportHeight){
                        mat4.perspective(this.pMatrix, 1.0*ratio, 1.0, 0.1, 100.0);
                    } else {
                        mat4.perspective(this.pMatrix, 1.0, 1.0, 0.1, 100.0);
                    }
                } else {
                    if(this.gl.viewportWidth > this.gl.viewportHeight){
                        mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
                    } else {
                        mat4.ortho(this.pMatrix, -24, 24 , -24, 24, 0.1, 1000.0);
                    }
                }
            } else {
                if(this.doPerspectiveProjection){
                    mat4.perspective(this.pMatrix, 1.0, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0);
                } else {
                    mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
                }
            }

            mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, -this.fogClipOffset]);

        }

        this.myQuat = quat4.clone(newQuat);
        var theMatrix = quatToMat4(this.myQuat);
        mat4.multiply(this.mvMatrix, this.mvMatrix, theMatrix);

        mat4.identity(this.mvInvMatrix);

        var invQuat = quat4.create();
        quat4Inverse(this.myQuat, invQuat);

        var invMat = quatToMat4(invQuat);
        this.mvInvMatrix = invMat;

        var right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        var up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);
        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);

        this.screenZ[0] = 0.0;
        this.screenZ[1] = 0.0;
        this.screenZ[2] = 1.0;

        vec3.transformMat4(this.screenZ, this.screenZ, invMat);

        this.gl.useProgram(this.shaderProgram);
        if (this.backColour === "default") {
            this.gl.uniform1i(this.shaderProgram.defaultColour, true);
        } else {
            this.gl.uniform1i(this.shaderProgram.defaultColour, false);
            this.gl.uniform4fv(this.shaderProgram.backColour, new Float32Array(this.backColour as number[]));
        }
        this.gl.uniform1i(this.shaderProgram.shinyBack, this.shinyBack);

        this.gl.useProgram(this.shaderProgramInstanced);
        if (this.backColour === "default") {
            this.gl.uniform1i(this.shaderProgramInstanced.defaultColour, true);
        } else {
            this.gl.uniform1i(this.shaderProgramInstanced.defaultColour, false);
            this.gl.uniform4fv(this.shaderProgramInstanced.backColour, new Float32Array(this.backColour as number[]));
        }
        this.gl.uniform1i(this.shaderProgramInstanced.shinyBack, this.shinyBack);

        mat4.scale(this.pMatrix, this.pMatrix, [1. / this.zoom, 1. / this.zoom, 1.0]);
        mat4.translate(this.mvMatrix, this.mvMatrix, this.origin);

        this.pmvMatrix = mat4.create();
        mat4.multiply(this.pmvMatrix, this.pMatrix, this.mvMatrix);

        this.gl.useProgram(this.shaderProgram);
        this.setMatrixUniforms(this.shaderProgram);
        this.setLightUniforms(this.shaderProgram);

        this.gl.useProgram(this.shaderProgramOutline);
        this.setMatrixUniforms(this.shaderProgramOutline);
        this.setLightUniforms(this.shaderProgramOutline);

        this.gl.useProgram(this.shaderProgramInstanced);
        this.setMatrixUniforms(this.shaderProgramInstanced);
        this.setLightUniforms(this.shaderProgramInstanced);

        this.gl.useProgram(this.shaderProgramInstancedOutline);
        this.setMatrixUniforms(this.shaderProgramInstancedOutline);
        this.setLightUniforms(this.shaderProgramInstancedOutline);

        this.gl.useProgram(this.shaderProgramInstancedShadow);
        this.setMatrixUniforms(this.shaderProgramInstancedShadow);
        this.setLightUniforms(this.shaderProgramInstancedShadow);

        this.gl.useProgram(this.shaderProgramShadow);
        this.setMatrixUniforms(this.shaderProgramShadow);
        this.setLightUniforms(this.shaderProgramShadow);

        this.gl.useProgram(this.shaderProgramLines);
        this.setMatrixUniforms(this.shaderProgramLines);

        this.gl.useProgram(this.shaderProgramPointSpheres);
        this.setMatrixUniforms(this.shaderProgramPointSpheres);
        this.setLightUniforms(this.shaderProgramPointSpheres);

        this.gl.useProgram(this.shaderProgram);
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramOutline);
        this.gl.enableVertexAttribArray(this.shaderProgramOutline.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramInstancedOutline);
        this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramInstanced);
        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexNormalAttribute);

        this.drawTriangles(calculatingShadowMap, invMat);

        if(!calculatingShadowMap){
            this.drawImagesAndText(invMat);
            this.drawTransparent(theMatrix);
            this.drawDistancesAndLabels(up, right);
            this.drawTextLabels(up, right);
            this.drawCircles(up, right);
        }

        this.myQuat = quat4.clone(oldQuat);

        return invMat;

    }

    drawScene() : void {

        //console.log("drawScene");

        var oldMouseDown = this.mouseDown;

        if (this.doShadow) {
            this.calculatingShadowMap = true;
            this.GLrender(true);
            this.calculatingShadowMap = false;

            //FIXME - This is all following mgfbo.cc
            this.textureMatrix = mat4.create();
            mat4.identity(this.textureMatrix);
            mat4.translate(this.textureMatrix, this.textureMatrix, [0.5, 0.5, 0.5]);
            mat4.scale(this.textureMatrix, this.textureMatrix, [0.5, 0.5, 0.5]);
            mat4.multiply(this.textureMatrix, this.textureMatrix, this.pMatrix);
            mat4.multiply(this.textureMatrix, this.textureMatrix, this.mvMatrix);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        this.stencilPass = false;

        let invMat;

        this.renderSilhouettesToTexture = false;

        if(this.doStenciling){
            //Framebuffer way
            this.renderSilhouettesToTexture = true;
            this.stenciling = false;
            invMat = this.GLrender(false);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.stenciling = true;
            invMat = this.GLrender(false);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.renderSilhouettesToTexture = false;
            this.stenciling = false;
            invMat = this.GLrender(false);

            this.gl.useProgram(this.shaderProgramOverlay);
            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramOverlay.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramOverlay.vertexPositionAttribute);

            this.gl.uniform1i(this.shaderProgramOverlay.inputTexture,0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.silhouetteTexture);

            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

            let paintMvMatrix = mat4.create();
            let paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

            this.gl.uniformMatrix4fv(this.shaderProgramOverlay.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramOverlay.mvMatrixUniform, false, paintMvMatrix);

            this.bindFramebufferDrawBuffers();

            this.gl.depthFunc(this.gl.ALWAYS);
            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }
            this.gl.bindTexture(this.gl.TEXTURE_2D, null)
            this.gl.depthFunc(this.gl.LESS);

            //Stencil way
            /*
            this.stenciling = false;
            this.gl.stencilMask(0x00);
            this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
            this.gl.disable(this.gl.STENCIL_TEST);
            this.gl.enable(this.gl.DEPTH_TEST);
            invMat = this.GLrender(false);

            this.stenciling = true;
            this.gl.stencilMask(0xFF);
            this.gl.clearStencil(0);
            this.gl.clear(this.gl.STENCIL_BUFFER_BIT);
            this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
            this.gl.enable(this.gl.STENCIL_TEST);
            this.gl.stencilFunc(this.gl.ALWAYS, 1, 0xFF);
            this.gl.stencilOp(this.gl.KEEP, this.gl.KEEP, this.gl.REPLACE);
            this.gl.enable(this.gl.DEPTH_TEST);
            invMat = this.GLrender(false);
            this.gl.stencilFunc(this.gl.NOTEQUAL, 1, 0xFF);
            this.gl.stencilOp(this.gl.KEEP, this.gl.KEEP, this.gl.REPLACE);
            this.stencilPass = true;
            this.gl.disable(this.gl.DEPTH_TEST);
            invMat = this.GLrender(false);
            */
        } else {
            this.gl.stencilMask(0x00);
            this.gl.disable(this.gl.STENCIL_TEST);
            this.gl.enable(this.gl.DEPTH_TEST);
            invMat = this.GLrender(false);
        }

        //console.log(this.mvMatrix);
        //console.log(this.mvInvMatrix);
        //console.log(this.pMatrix);
        //console.log(this.screenZ);
        //console.log(invMat);

        if (this.showFPS) {
            this.drawFPSMeter();
        }

        if (this.showAxes) {
            this.drawAxes(invMat);
        }
        if (this.showCrosshairs) {
            this.drawCrosshairs(invMat);
        }

        this.drawTextOverlays(invMat);

        if(this.trackMouse&&!this.renderToTexture){
            this.drawMouseTrack();
        }

        this.mouseDown = oldMouseDown;

        //this.div.dispatchEvent(this.viewChangedEvent);

        if(this.doShadowDepthDebug&&this.doShadow){
            this.gl.clearColor(1.0,1.0,0.0,1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            let paintMvMatrix = mat4.create();
            let paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            this.gl.useProgram(this.shaderProgramRenderFrameBuffer);

            this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.focussedTexture,0);
            this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.blurredTexture,1);
            this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.depthTexture,2);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);

            this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

            this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

            this.bindFramebufferDrawBuffers();

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }

            this.gl.disableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

            return;
        }

        if (this.save_pixel_data) {
            console.log("Saving pixel data");
            let pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
            this.gl.readPixels(0, 0, this.canvas.width, this.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.pixel_data = pixels;
        }
        if(this.renderToTexture) {
            console.log("SCREENSHOT")
            const width_ratio = this.gl.viewportWidth / this.rttFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.rttFramebuffer.height;
            if (this.WEBGL2) {
                this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebuffer);
                this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.rttFramebufferColor);
                this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
                this.gl.blitFramebuffer(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height,
                        0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height,
                        this.gl.COLOR_BUFFER_BIT, this.gl.LINEAR);

                this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebufferColor);
            }
            let pixels = new Uint8Array(this.gl.viewportWidth / width_ratio * this.gl.viewportHeight / height_ratio * 4);
            this.gl.readPixels(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.pixel_data = pixels;
        }

        if(this.showFPS){
            this.nFrames += 1;
            const thisTime = performance.now();
            const mspf = thisTime - this.prevTime;
            this.mspfArray.push(mspf);
            if(this.mspfArray.length>200) this.mspfArray.shift();
            this.prevTime = thisTime;
        }

        if (!this.useOffScreenBuffers||!this.WEBGL2) {
            return;
        }

        if(!this.offScreenReady) return;

        const currentBinding = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);

        // This is testing depth buffer.

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // This is small example of how we can do more rendering passes
        //this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer2);

        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        this.gl.clearColor(1.0,1.0,0.0,1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        //this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);

        //this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);

        if (!this.useOffScreenBuffers){
            return;
        }

        this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.offScreenFramebuffer);
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.offScreenFramebufferColor);
        //let canRead = (this.gl.checkFramebufferStatus(this.gl.READ_FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        //let canWrite = (this.gl.checkFramebufferStatus(this.gl.DRAW_FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
        this.gl.blitFramebuffer(0, 0, this.offScreenFramebuffer.width, this.offScreenFramebuffer.height,
                0, 0, this.offScreenFramebufferColor.width, this.offScreenFramebufferColor.height,
                this.gl.COLOR_BUFFER_BIT, this.gl.LINEAR);
        this.gl.blitFramebuffer(0, 0, this.offScreenFramebuffer.width, this.offScreenFramebuffer.height,
                0, 0, this.offScreenFramebufferColor.width, this.offScreenFramebufferColor.height,
                this.gl.DEPTH_BUFFER_BIT, this.gl.NEAREST);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);

        let paintMvMatrix = mat4.create();
        let paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        /*
          * In focus     - this.offScreenFramebufferBlurX
          * Out of focus - this.blurYTexture
          * Depth        - this.offScreenDepthTexture
        */

        //This is an example of chaining framebuffer shader effects.
        const doBlur = true;
        if(doBlur){
            const blurSizeX = this.blurSize/this.gl.viewportWidth;
            const blurSizeY = this.blurSize/this.gl.viewportHeight;

            this.gl.useProgram(this.shaderProgramBlurX);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexPositionAttribute);

            this.gl.uniform1i(this.shaderProgramBlurX.inputTexture,0);
            this.gl.uniform1i(this.shaderProgramBlurX.depthTexture,1);

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

            this.gl.uniformMatrix4fv(this.shaderProgramBlurX.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramBlurX.mvMatrixUniform, false, paintMvMatrix);

            this.gl.uniform1f(this.shaderProgramBlurX.blurDepth,this.blurDepth);
            this.gl.uniform1f(this.shaderProgramBlurX.blurSize,blurSizeX);

            this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            this.bindFramebufferDrawBuffers();

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }

            this.gl.useProgram(this.shaderProgramBlurY);
            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexPositionAttribute);

            this.gl.uniform1i(this.shaderProgramBlurY.inputTexture,0);
            this.gl.uniform1i(this.shaderProgramBlurY.depthTexture,1);

            this.gl.enableVertexAttribArray(this.shaderProgramBlurY.vertexTextureAttribute);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurY);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

            this.gl.uniformMatrix4fv(this.shaderProgramBlurY.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramBlurY.mvMatrixUniform, false, paintMvMatrix);

            this.gl.uniform1f(this.shaderProgramBlurY.blurDepth,this.blurDepth);
            this.gl.uniform1f(this.shaderProgramBlurY.blurSize,blurSizeY);

            this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            this.bindFramebufferDrawBuffers();

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture)
        }

        this.gl.useProgram(this.shaderProgramRenderFrameBuffer);

        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.focussedTexture,0)
        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.blurredTexture,1)
        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.depthTexture,2)

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute);

        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

        this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.disableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    bindFramebufferDrawBuffers() {
        if(!this.framebufferDrawBuffersReady) {
            const textTexCoords = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
                  0.0, 0.0, 1.0, 1.0, 0.0, 1.0];
            const textVertices = [
                -1.0, - 1.0, -200,
                1.0, - 1.0, -200,
                1.0,  1.0, -200,
                -1.0,  - 1.0, -200,
                1.0, 1.0, -200,
                -1.0,  1.0, -200];
            const textIndexs = [0, 2, 1, 3, 4, 5];

            this.framebufferDrawPositionBuffer = this.gl.createBuffer();
            this.framebufferDrawTexCoordBuffer = this.gl.createBuffer();
            this.framebufferDrawIndexesBuffer = this.gl.createBuffer();

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.framebufferDrawIndexesBuffer);
            if (this.ext) {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(textIndexs), this.gl.STATIC_DRAW);
            } else {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(textIndexs), this.gl.STATIC_DRAW);
            }

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawTexCoordBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textTexCoords), this.gl.STATIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawPositionBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textVertices), this.gl.DYNAMIC_DRAW);
            this.framebufferDrawBuffersReady = true;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawTexCoordBuffer);
        this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.framebufferDrawPositionBuffer);
        this.gl.vertexAttribPointer(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.framebufferDrawIndexesBuffer);
    }

    drawTriangles(calculatingShadowMap, invMat) {

        let symmetries = [];
        let symms = [];
        const bright_y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;

        for (let idx = 0; idx < this.displayBuffers.length; idx++) {

            if (!this.displayBuffers[idx].visible) {
                continue;
            }
            if(this.doStenciling){
                if(this.stencilPass&&!this.displayBuffers[idx].doStencil){
                    continue;
                }
                if(this.stenciling&&!this.displayBuffers[idx].doStencil){
                    continue;
                }
                if (!this.stenciling&&this.displayBuffers[idx].doStencil){
                    continue;
                }
            }

            let bufferTypes = this.displayBuffers[idx].bufferTypes;

            let triangleVertexNormalBuffer = this.displayBuffers[idx].triangleVertexNormalBuffer;
            let triangleVertexRealNormalBuffer = this.displayBuffers[idx].triangleVertexRealNormalBuffer;
            let triangleVertexPositionBuffer = this.displayBuffers[idx].triangleVertexPositionBuffer;
            let triangleVertexIndexBuffer = this.displayBuffers[idx].triangleVertexIndexBuffer;
            let triangleColourBuffer = this.displayBuffers[idx].triangleColourBuffer;

            let triangleVertices = this.displayBuffers[idx].triangleVertices;
            let triangleColours = this.displayBuffers[idx].triangleColours;

            let primitiveSizes = this.displayBuffers[idx].primitiveSizes;

            // FIXME - This is still way too slow, since there can be *lots* of displayBuffers per molecule.
            //       - recalculating same symmetry for all of them is insane.
            //       - And should only be done when origin changes!
            let symmetry = null;
            if (this.displayBuffers[idx].symmetry) {
                symmetry = symmetries[idx];
            }

            //console.log("Drawing object "+idx+" it has "+triangleVertexIndexBuffer.length+" parts");

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] === "NORMALLINES" || bufferTypes[j] === "LINES" || bufferTypes[j] === "LINE_LOOP" || bufferTypes[j] === "LINE_STRIP" || bufferTypes[j] === "DIAMONDS" || bufferTypes[j] === "TEXT" || bufferTypes[j] === "IMAGES" || bufferTypes[j] === "SQUARES" || bufferTypes[j] === "PENTAGONS" || bufferTypes[j] === "HEXAGONS" || bufferTypes[j] === "POINTS" || bufferTypes[j] === "SPHEROIDS" || bufferTypes[j] === "POINTS_SPHERES" || bufferTypes[j].substring(0, "CUSTOM_2D_SHAPE_".length) === "CUSTOM_2D_SHAPE_" || bufferTypes[j] === "PERFECT_SPHERES") {
                    continue;
                }
                if (this.displayBuffers[idx].transparent) {
                    //console.log("Not doing normal drawing way ....");
                    continue;
                }

                let theShader;
                let scaleZ = false;
                if(this.displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                    theShader = this.shaderProgramInstanced;
                    if (calculatingShadowMap)
                        theShader = this.shaderProgramInstancedShadow;
                    if(this.stencilPass)
                        theShader = this.shaderProgramInstancedOutline;
                } else {
                    theShader = this.shaderProgram;
                    if (calculatingShadowMap)
                        theShader = this.shaderProgramShadow;
                    if(this.stencilPass){
                        theShader = this.shaderProgramOutline;
                        scaleZ = true;
                    }
                }
                this.gl.useProgram(theShader);
                this.gl.uniform1i(theShader.doShadows, false);
                if(this.doShadow&&!calculatingShadowMap){
                    this.gl.uniform1i(theShader.ShadowMap, 0);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
                    this.gl.uniform1f(theShader.xPixelOffset, 1.0/this.rttFramebufferDepth.width);
                    this.gl.uniform1f(theShader.yPixelOffset, 1.0/this.rttFramebufferDepth.height);
                    this.gl.uniformMatrix4fv(theShader.textureMatrixUniform, false, this.textureMatrix);
                    this.gl.uniform1i(theShader.doShadows, true);
                    if(this.mouseDown)
                        this.gl.uniform1i(theShader.shadowQuality, 0);
                    else
                        this.gl.uniform1i(theShader.shadowQuality, 1);
                }


                for(let i = 0; i<16; i++)
                    this.gl.disableVertexAttribArray(i);

                if(typeof(theShader.vertexNormalAttribute!=="undefined") && theShader.vertexNormalAttribute!==null&&theShader.vertexNormalAttribute>-1){
                    if(!calculatingShadowMap){
                        this.gl.enableVertexAttribArray(theShader.vertexNormalAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                        this.gl.vertexAttribPointer(theShader.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                    }
                }

                this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(theShader.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if(this.stencilPass){
                    this.gl.disable(this.gl.DEPTH_TEST);
                    this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                    if(bright_y<0.5)
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                    else
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                    let outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    if(scaleZ)
                        vec3.set(outlineSize, 0.1, 0.1, 0.1);
                    this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                } else {
                    let outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.0, 0.0, 0.0);
                    this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                    this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                    this.gl.vertexAttribPointer(theShader.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                }

                if (bufferTypes[j] === "TRIANGLES" || bufferTypes[j] === "CAPCYLINDERS" || this.displayBuffers[idx].bufferTypes[j] === "TORUSES") {
                    if (this.displayBuffers[idx].transformMatrix) {
                        this.drawTransformMatrix(this.displayBuffers[idx].transformMatrix, this.displayBuffers[idx], theShader, this.gl.TRIANGLES, j);
                    } else if (this.displayBuffers[idx].transformMatrixInteractive) {
                        //And this is based on time...
                        const t = Date.now()
                        const tdiff = (Math.round(t/1000) - t/1000)
                        let sfrac;
                        if(tdiff<0){
                            sfrac = Math.sin(Math.PI+tdiff*Math.PI)
                        } else {
                            sfrac = Math.sin(tdiff*Math.PI)
                        }
                        this.gl.uniform4fv(theShader.light_colours_ambient, [sfrac,sfrac,sfrac,1.0]);
                        this.drawTransformMatrixInteractive(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, this.displayBuffers[idx], theShader, this.gl.TRIANGLES, j);
                        this.gl.uniform4fv(theShader.light_colours_ambient, this.light_colours_ambient);
                    } else {
                        if(this.stencilPass && scaleZ){
                            let outlineSize = vec3.create();
                            for(let i=0;i<10;i++){
                                vec3.set(outlineSize, 0.01*i, 0.01*i, 0.01*i);
                                this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                                this.drawBuffer(this.displayBuffers[idx],theShader,j,this.gl.TRIANGLES);
                            }
                        } else {
                            this.drawBuffer(this.displayBuffers[idx],theShader,j,this.gl.TRIANGLES);
                        }
                    }
                } else if (bufferTypes[j] === "TRIANGLE_STRIP") {
                    if (this.displayBuffers[idx].transformMatrix) {
                        this.drawTransformMatrix(this.displayBuffers[idx].transformMatrix, this.displayBuffers[idx], this.shaderProgram, this.gl.TRIANGLE_STRIP, j);
                    } else if (this.displayBuffers[idx].transformMatrixInteractive) {
                        this.drawTransformMatrixInteractive(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, this.displayBuffers[idx], this.shaderProgram, this.gl.TRIANGLE_STRIP, j);
                    } else {
                        if (this.ext) {
                            this.gl.drawElements(this.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                }
            }


            //shaderProgramPerfectSpheres
            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            if (this.frag_depth_ext) {
                let invsymt = mat4.create();
                let program = this.shaderProgramPerfectSpheres;
                if (calculatingShadowMap) {
                    program = this.shaderDepthShadowProgramPerfectSpheres;
                }
                if(this.stencilPass){
                    program = this.shaderProgramPerfectSpheresOutline;
                }

                mat4.set(invsymt,
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
                );
                this.gl.useProgram(program);
                this.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt);
                this.setMatrixUniforms(program);
                this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                this.gl.enableVertexAttribArray(program.vertexPositionAttribute);
                if (!calculatingShadowMap) {
                    this.setLightUniforms(program);
                    this.gl.uniform1i(program.clipCap,this.clipCapPerfectSpheres);
                    this.gl.enableVertexAttribArray(program.vertexNormalAttribute);
                }
                this.gl.enableVertexAttribArray(program.vertexTextureAttribute);
                this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                this.gl.enableVertexAttribArray(program.offsetAttribute);
                this.gl.enableVertexAttribArray(program.sizeAttribute);
                this.gl.uniform1i(program.doShadows, false);
                if(this.doShadow&&!calculatingShadowMap){
                    this.gl.uniform1i(program.ShadowMap, 0);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
                    this.gl.uniform1f(program.xPixelOffset, 1.0/this.rttFramebufferDepth.width);
                    this.gl.uniform1f(program.yPixelOffset, 1.0/this.rttFramebufferDepth.height);
                    this.gl.uniformMatrix4fv(program.textureMatrixUniform, false, this.textureMatrix);
                    this.gl.uniform1i(program.doShadows, true);
                    if(this.mouseDown)
                        this.gl.uniform1i(program.shadowQuality, 0);
                    else
                        this.gl.uniform1i(program.shadowQuality, 1);
                }

                if(this.stencilPass){
                    this.gl.disable(this.gl.DEPTH_TEST);
                    let outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    this.gl.uniform3fv(program.outlineSize, outlineSize);
                } else {
                    let outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.0, 0.0, 0.0);
                    this.gl.uniform3fv(program.outlineSize, outlineSize);
                }

                for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                    if (bufferTypes[j] === "PERFECT_SPHERES") {
                        let buffer = this.imageBuffer;

                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexTextureBuffer[0]);
                        this.gl.vertexAttribPointer(program.vertexTextureAttribute, buffer.triangleVertexTextureBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);

                        if(program.vertexNormalAttribute){
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                            this.gl.vertexAttribPointer(program.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                        }

                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                        this.gl.vertexAttribPointer(program.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);

                        //pos,normal, texture, index in "buffer"
                        //Instanced colour
                        //Instanced size
                        //Instanced offset
                        if (this.displayBuffers[idx].transformMatrixInteractive) {
                            const t = Date.now();
                            const tdiff = (Math.round(t/1000) - t/1000);
                            let sfrac;
                            if(tdiff<0){
                                sfrac = Math.sin(Math.PI+tdiff*Math.PI);
                            } else {
                                sfrac = Math.sin(tdiff*Math.PI);
                            }
                            this.gl.uniform4fv(program.light_colours_ambient, [sfrac,sfrac,sfrac,1.0]);
                            //FIXME - Looks like several unused arguments in this function.
                            this.setupModelViewTransformMatrixInteractive(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, null, program, null, null, null);
                            let invsymt2 = mat4.create();
                            mat4.invert(invsymt2, this.displayBuffers[idx].transformMatrixInteractive);
                            invsymt2[12] = 0.0;
                            invsymt2[13] = 0.0;
                            invsymt2[14] = 0.0;
                            this.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt2);
                        }
                        this.gl.enableVertexAttribArray(program.offsetAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        this.gl.vertexAttribPointer(program.offsetAttribute, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        this.gl.enableVertexAttribArray(program.sizeAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        this.gl.vertexAttribPointer(program.sizeAttribute, this.displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                        this.gl.vertexAttribPointer(program.vertexColourAttribute, this.displayBuffers[idx].triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        if(this.stencilPass){
                            this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                            if(bright_y<0.5)
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                            else
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                        }
                        if (this.WEBGL2) {
                            this.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                            this.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                            this.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            this.gl.drawElementsInstanced(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            this.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                            this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                            this.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                        } else {
                            this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                            this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                        }
                        if (this.displayBuffers[idx].transformMatrixInteractive) {
                            this.gl.uniform4fv(program.light_colours_ambient, this.light_colours_ambient);
                            this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);
                            this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                            this.gl.uniformMatrix4fv(program.invSymMatrixUniform, false, invsymt);
                        }
                        if(this.displayBuffers[idx].symmetryMatrices.length>0){
                            let tempMVMatrix = mat4.create();
                            let tempMVInvMatrix = mat4.create();
                            if (this.WEBGL2) {
                                this.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                                this.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            } else {
                                this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            }
                            for (let isym = 0; isym < this.displayBuffers[idx].symmetryMatrices.length; isym++) {

                                this.applySymmetryMatrix(program,this.displayBuffers[idx].symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                                    if (this.WEBGL2) {
                                        this.gl.drawElementsInstanced(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    } else {
                                        this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    }

                            }
                            if (this.WEBGL2) {
                                this.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                this.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                            } else {
                                this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                            }
                            this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);// All else
                            this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);// All else

                        }
                    }
                }

                this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                this.gl.disableVertexAttribArray(program.vertexTextureAttribute);
            }

            if(this.stencilPass){
                continue;
            }

            if (calculatingShadowMap)
                continue; //Nothing else implemented
            //Cylinders here

            //vertex attribute settings are likely wrong from here on...

            let sphereProgram = this.shaderProgramPointSpheres;

            this.gl.useProgram(sphereProgram);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            this.gl.enableVertexAttribArray(sphereProgram.vertexPositionAttribute);
            this.gl.enableVertexAttribArray(sphereProgram.vertexNormalAttribute);

            let scaleMatrices = this.displayBuffers[idx].supplementary["scale_matrices"];
            this.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                let theseScaleMatrices = [];
                if (bufferTypes[j] !== "SPHEROIDS" && bufferTypes[j] !== "POINTS_SPHERES") {
                    continue;
                }
                let buffer;
                let radMult;
                if (bufferTypes[j] === "POINTS_SPHERES" || bufferTypes[j] === "SPHEROIDS") {
                    buffer = this.sphereBuffer;
                    radMult = 1.0;
                    if (bufferTypes[j] === "SPHEROIDS") {
                        theseScaleMatrices = scaleMatrices[j];
                    }
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                this.gl.vertexAttribPointer(sphereProgram.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                this.gl.vertexAttribPointer(sphereProgram.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                let isphere;

                // FIXME - The scaling will be a property of each object. e.g. B/U factors.
                //       - Perhaps we should have different shaders for scaled objects?
                let scaleMatrix = mat3.clone([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]);
                this.gl.uniformMatrix3fv(sphereProgram.scaleMatrix, false, scaleMatrix);

                let theOffSet = new Float32Array(3);
                if (theseScaleMatrices.length === triangleVertices[j].length / 3) {
                    for (isphere = 0; isphere < triangleVertices[j].length / 3; isphere++) {
                        scaleMatrix = mat3.clone(theseScaleMatrices[isphere]);
                        this.gl.uniformMatrix3fv(sphereProgram.scaleMatrix, false, scaleMatrix);
                        theOffSet[0] = triangleVertices[j][isphere * 3];
                        theOffSet[1] = triangleVertices[j][isphere * 3 + 1];
                        theOffSet[2] = triangleVertices[j][isphere * 3 + 2];
                        this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, triangleColours[j][isphere * 4], triangleColours[j][isphere * 4 + 1], triangleColours[j][isphere * 4 + 2], triangleColours[j][isphere * 4 + 3]);
                        this.gl.uniform3fv(sphereProgram.offset, theOffSet);
                        this.gl.uniform1f(sphereProgram.size, primitiveSizes[j][isphere] * radMult);
                        if (this.displayBuffers[idx].transformMatrix) {
                            this.drawTransformMatrix(this.displayBuffers[idx].transformMatrix, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else if (this.displayBuffers[idx].transformMatrixInteractive) {
                            this.drawTransformMatrixInteractive(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else {
                            if (this.ext) {
                                this.gl.drawElements(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0);
                            } else {
                                this.gl.drawElements(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                            }
                        }
                    }
                } else {
                    for (isphere = 0; isphere < triangleVertices[j].length / 3; isphere++) {
                        theOffSet[0] = triangleVertices[j][isphere * 3];
                        theOffSet[1] = triangleVertices[j][isphere * 3 + 1];
                        theOffSet[2] = triangleVertices[j][isphere * 3 + 2];
                        this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, triangleColours[j][isphere * 4], triangleColours[j][isphere * 4 + 1], triangleColours[j][isphere * 4 + 2], triangleColours[j][isphere * 4 + 3]);
                        this.gl.uniform3fv(sphereProgram.offset, theOffSet);
                        this.gl.uniform1f(sphereProgram.size, primitiveSizes[j][isphere] * radMult);
                        if (this.displayBuffers[idx].transformMatrix) {
                            this.drawTransformMatrix(this.displayBuffers[idx].transformMatrix, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else if (this.displayBuffers[idx].transformMatrixInteractive) {
                            this.drawTransformMatrixInteractive(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, buffer, sphereProgram, this.gl.TRIANGLES, j);
                        } else {
                            if (this.ext) {
                                this.gl.drawElements(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0);
                            } else {
                                this.gl.drawElements(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                            }
                        }
                    }
                }
            }
            this.gl.enableVertexAttribArray(sphereProgram.vertexColourAttribute);

            this.gl.useProgram(this.shaderProgramTwoDShapes);
            this.setMatrixUniforms(this.shaderProgramTwoDShapes);
            this.gl.disableVertexAttribArray(this.shaderProgramTwoDShapes.vertexColourAttribute);
            this.gl.vertexAttrib4f(this.shaderProgramTwoDShapes.vertexColourAttribute, 1.0, 1.0, 0.0, 1.0);
            let diskVertices = [];
            if (typeof (this.diskVertices) !== "undefined") {
                for (let iv = 0; iv < this.diskVertices.length; iv += 3) {
                    let vold = vec3Create([this.diskVertices[iv], this.diskVertices[iv + 1], this.diskVertices[iv + 2]]);
                    let vnew = vec3.create();
                    vec3.transformMat4(vnew, vold, invMat);
                    diskVertices[iv] = vnew[0];
                    diskVertices[iv + 1] = vnew[1];
                    diskVertices[iv + 2] = vnew[2];
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.diskBuffer.triangleVertexPositionBuffer[0]);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(diskVertices), this.gl.DYNAMIC_DRAW);
            }
            let imageVertices = [];
            if (typeof (this.imageVertices) !== "undefined") {
                for (let iv = 0; iv < this.imageVertices.length; iv += 3) {
                    let vold = vec3Create([this.imageVertices[iv], this.imageVertices[iv + 1], this.imageVertices[iv + 2]]);
                    let vnew = vec3.create();
                    vec3.transformMat4(vnew, vold, invMat);
                    imageVertices[iv] = vnew[0];
                    imageVertices[iv + 1] = vnew[1];
                    imageVertices[iv + 2] = vnew[2];
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexPositionBuffer[0]);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(imageVertices), this.gl.DYNAMIC_DRAW);
            }
            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] === "POINTS") {
                    const buffer = this.diskBuffer;
                    let scaleImage = true;
                    if (typeof (this.gl, this.displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        let tempMVMatrix = mat4.create();
                        mat4.set(tempMVMatrix, this.mvMatrix[0], this.mvMatrix[1], this.mvMatrix[2], this.mvMatrix[3], this.mvMatrix[4], this.mvMatrix[5], this.mvMatrix[6], this.mvMatrix[7], this.mvMatrix[8], this.mvMatrix[9], this.mvMatrix[10], this.mvMatrix[11], (-24.0 + this.displayBuffers[idx].supplementary["vert_tri_2d"][0][0] * 48.0) * this.zoom, (-24.0 + this.displayBuffers[idx].supplementary["vert_tri_2d"][0][1] * 48.0) * this.zoom, -this.fogClipOffset, 1.0);
                        this.gl.uniformMatrix4fv(this.shaderProgramTwoDShapes.mvMatrixUniform, false, tempMVMatrix);
                        scaleImage = false;
                    }

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramTwoDShapes.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramTwoDShapes.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                    // FIXME - And loop here
                    let theOffSet = new Float32Array(3);
                    for (let ishape = 0; ishape < triangleVertices[j].length / 3; ishape++) {
                        theOffSet[0] = triangleVertices[j][ishape * 3];
                        theOffSet[1] = triangleVertices[j][ishape * 3 + 1];
                        theOffSet[2] = triangleVertices[j][ishape * 3 + 2];
                        this.gl.uniform3fv(this.shaderProgramTwoDShapes.offset, theOffSet);
                        if (scaleImage) {
                            this.gl.uniform1f(this.shaderProgramTwoDShapes.size, primitiveSizes[j][ishape]);
                        } else {
                            this.gl.uniform1f(this.shaderProgramTwoDShapes.size, primitiveSizes[j][ishape] * this.zoom);
                        }

                        this.gl.vertexAttrib4f(this.shaderProgramTwoDShapes.vertexColourAttribute, triangleColours[j][ishape * 4], triangleColours[j][ishape * 4 + 1], triangleColours[j][ishape * 4 + 2], triangleColours[j][ishape * 4 + 3]);

                        if (this.ext) {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                    if (typeof (this.gl, this.displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        this.setMatrixUniforms(this.shaderProgramTwoDShapes);
                    }
                }
            }

            this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexColourAttribute);

            this.gl.useProgram(this.shaderProgramLines);
            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "LINE_LOOP" && bufferTypes[j] !== "LINE_STRIP") {
                    continue;
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramLines.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);
                //this.gl.disableVertexAttribArray(2)
                if (bufferTypes[j] === "LINES") {
                    //console.log("Try to draw "+triangleVertexIndexBuffer[j].numItems+" lines, "+triangleColourBuffer[j].numItems+" colours, "+triangleVertexPositionBuffer[j].numItems+" vertices.");
                    if (this.ext) {
                        this.gl.drawElements(this.gl.LINES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.LINES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
                if (bufferTypes[j] === "LINE_STRIP") {
                    //console.log("Try to draw "+triangleVertexIndexBuffer[j].numItems+" lines, "+triangleColourBuffer[j].numItems+" colours, "+triangleVertexPositionBuffer[j].numItems+" vertices.");
                    if (this.ext) {
                        this.gl.drawElements(this.gl.LINE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.LINE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            this.gl.useProgram(this.shaderProgramThickLinesNormal);
            this.gl.uniform1i(this.shaderProgramThickLinesNormal.shinyBack, true);
            this.setLightUniforms(this.shaderProgramThickLinesNormal);
            this.gl.uniform3fv(this.shaderProgramThickLinesNormal.screenZ, this.screenZ);
            this.gl.enableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexNormalAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexRealNormalAttribute);
            this.setMatrixUniforms(this.shaderProgramThickLinesNormal);
            this.gl.uniformMatrix4fv(this.shaderProgramThickLinesNormal.pMatrixUniform, false, this.pmvMatrix);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "NORMALLINES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (this.displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (this.displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (this.displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    this.gl.uniform1f(this.shaderProgramThickLinesNormal.pixelZoom, this.displayBuffers[idx].primitiveSizes[j][0] * 0.04 * this.zoom);
                } else {
                    this.gl.uniform1f(this.shaderProgramThickLinesNormal.pixelZoom, 1.0 * 0.04 * this.zoom);
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLinesNormal.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexRealNormalBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLinesNormal.vertexRealNormalAttribute, triangleVertexRealNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLinesNormal.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLinesNormal.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (this.displayBuffers[idx].transformMatrix) {
                    this.drawTransformMatrixPMV(this.displayBuffers[idx].transformMatrix, this.displayBuffers[idx], this.shaderProgramThickLinesNormal, this.gl.TRIANGLES, j);
                } else {
                    if (this.ext) {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            this.gl.disableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexRealNormalAttribute);

            this.gl.useProgram(this.shaderProgramThickLines);
            this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, this.screenZ);
            this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
            this.setMatrixUniforms(this.shaderProgramThickLines);
            this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, this.pmvMatrix);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "LINES" && bufferTypes[j] !== "CIRCLES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (this.displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (this.displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (this.displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, this.displayBuffers[idx].primitiveSizes[j][0] * 0.04 * this.zoom);
                } else {
                    this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 1.0 * 0.04 * this.zoom);
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (this.displayBuffers[idx].transformMatrix) {
                    this.drawTransformMatrixPMV(this.displayBuffers[idx].transformMatrix, this.displayBuffers[idx], this.shaderProgramThickLines, this.gl.TRIANGLES, j);
                } else if (this.displayBuffers[idx].transformMatrixInteractive) {
                    this.drawTransformMatrixInteractivePMV(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, this.displayBuffers[idx], this.shaderProgramThickLines, this.gl.TRIANGLES, j);
                } else {
                    if (this.ext) {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
        }
    }

    drawTransparent(theMatrix) {

        for (let idx = 0; idx < this.displayBuffers.length; idx++) {

            if (!this.displayBuffers[idx].visible) {
                continue;
            }

            let triangleVertexIndexBuffer = this.displayBuffers[idx].triangleVertexIndexBuffer;

            let triangleIndexs = this.displayBuffers[idx].triangleIndexs;
            let triangleVertices = this.displayBuffers[idx].triangleVertices;
            let triangleColours = this.displayBuffers[idx].triangleColours;
            let triangleNormals = this.displayBuffers[idx].triangleNormals;

            let bufferTypes = this.displayBuffers[idx].bufferTypes;

            if (this.displayBuffers[idx].transparent) {
                //console.log(idx+" is transparent ;-) "+bufferTypes[0]);

                if (bufferTypes[0] === "TRIANGLES") {
                    if (typeof this.displayBuffers[idx].allVertices === "undefined"||this.displayBuffers[idx].alphaChanged) {
                        this.displayBuffers[idx].allVertices = [];
                        this.displayBuffers[idx].allNormals = [];
                        this.displayBuffers[idx].allColours = [];
                        this.displayBuffers[idx].allIndexs = [];
                        this.displayBuffers[idx].allTriangleVertexNormalBuffer = this.gl.createBuffer();
                        this.displayBuffers[idx].allTriangleVertexPositionBuffer = this.gl.createBuffer();
                        this.displayBuffers[idx].allTriangleVertexColourBuffer = this.gl.createBuffer();
                        this.displayBuffers[idx].allIndexsBuffer = this.gl.createBuffer();
                        let bufferOffset = 0;
                        //console.log("Concatenating "+triangleVertexIndexBuffer.length+" buffers...");
                        for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                            //console.log("Concatenating "+triangleVertices[j].length/3+" triangles");
                            this.displayBuffers[idx].allVertices = this.displayBuffers[idx].allVertices.concat(triangleVertices[j]);
                            //console.log("Concatenating "+triangleNormals[j].length/3+" normals");
                            this.displayBuffers[idx].allNormals = this.displayBuffers[idx].allNormals.concat(triangleNormals[j]);
                            //console.log("total this.displayBuffers[idx].allNormals.length: "+this.displayBuffers[idx].allNormals.length);
                            //console.log("Concatenating "+triangleColours[j].length/4+" colours");
                            this.displayBuffers[idx].allColours = this.displayBuffers[idx].allColours.concat(triangleColours[j]);
                            //console.log("Pushing "+triangleIndexs[j].length+" indices");
                            for (let i = 0; i < triangleIndexs[j].length; i++) {
                                this.displayBuffers[idx].allIndexs.push(triangleIndexs[j][i] + bufferOffset);
                            }
                            bufferOffset += triangleVertices[j].length / 3;
                        }
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].allTriangleVertexNormalBuffer);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].allNormals), this.gl.STATIC_DRAW);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].allTriangleVertexPositionBuffer);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].allVertices), this.gl.STATIC_DRAW);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].allTriangleVertexColourBuffer);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].allColours), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].alphaChanged = false;
                    }
                    let sortThings = [];
                    //console.log("Big thing is of size "+this.displayBuffers[idx].allIndexs.length);
                    for (let j = 0; j < this.displayBuffers[idx].allIndexs.length; j += 3) {
                        let x1 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j]];
                        let y1 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j] + 1];
                        let z1 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j] + 2];
                        let x2 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j + 1]];
                        let y2 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j + 1] + 1];
                        let z2 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j + 1] + 2];
                        let x3 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j + 2]];
                        let y3 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j + 2] + 1];
                        let z3 = this.displayBuffers[idx].allVertices[3 * this.displayBuffers[idx].allIndexs[j + 2] + 2];
                        let mid_x = (x1 + x2 + x3) / 3.0;
                        let mid_y = (y1 + y2 + y3) / 3.0;
                        let mid_z = (z1 + z2 + z3) / 3.0;
                        //let proj = mid_z; // FIXME - Need to calculate a projection along camera z-axis.
                        let projP = vec3Create([mid_x, mid_y, mid_z]);
                        vec3.transformMat4(projP, projP, theMatrix);
                        sortThings.push(new SortThing(projP[2], this.displayBuffers[idx].allIndexs[j], this.displayBuffers[idx].allIndexs[j + 1], this.displayBuffers[idx].allIndexs[j + 2]));
                    }
                    sortThings.sort(sortIndicesByProj);
                    let allIndexs = [];
                    let maxInd = 0;
                    for (let j = 0; j < sortThings.length; j++) {
                        allIndexs.push(sortThings[j].id1);
                        allIndexs.push(sortThings[j].id2);
                        allIndexs.push(sortThings[j].id3);
                        if (sortThings[j].id1 > maxInd) maxInd = sortThings[j].id1;
                        if (sortThings[j].id2 > maxInd) maxInd = sortThings[j].id2;
                        if (sortThings[j].id3 > maxInd) maxInd = sortThings[j].id3;
                    }
                    //console.log("maxInd: "+maxInd);
                    //console.log("this.displayBuffers[idx].allNormals.length: "+this.displayBuffers[idx].allNormals.length/3);
                    //console.log("this.displayBuffers[idx].allVertices.length: "+this.displayBuffers[idx].allVertices.length/3);
                    //console.log("this.displayBuffers[idx].allColours.length: "+this.displayBuffers[idx].allColours.length/3);
                    this.gl.useProgram(this.shaderProgram);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].allTriangleVertexNormalBuffer);
                    this.gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].allTriangleVertexPositionBuffer);
                    this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].allTriangleVertexColourBuffer);
                    this.gl.vertexAttribPointer(this.shaderProgram.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].allIndexsBuffer);
                    // FIXME - hmm, one is /3, the other is not ....
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(allIndexs), this.gl.STATIC_DRAW);
                        this.gl.drawElements(this.gl.TRIANGLES, allIndexs.length, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(allIndexs), this.gl.STATIC_DRAW);
                        this.gl.drawElements(this.gl.TRIANGLES, allIndexs.length / 3, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
        }
    }

    drawImagesAndText(invMat) {
        // Now the "see-through" primitives: images and text.
        for (let idx = 0; idx < this.displayBuffers.length; idx++) {

            if (!this.displayBuffers[idx].visible) {
                continue;
            }

            const bufferTypes = this.displayBuffers[idx].bufferTypes;

            const triangleVertexIndexBuffer = this.displayBuffers[idx].triangleVertexIndexBuffer;

            const triangleVertices = this.displayBuffers[idx].triangleVertices;
            const triangleColours = this.displayBuffers[idx].triangleColours;

            const primitiveSizes = this.displayBuffers[idx].primitiveSizes;

            this.gl.useProgram(this.shaderProgramImages);
            this.gl.depthFunc(this.gl.ALWAYS);
            this.setMatrixUniforms(this.shaderProgramImages);

            this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexTextureAttribute);
            this.gl.disableVertexAttribArray(this.shaderProgramImages.vertexColourAttribute);
            this.gl.vertexAttrib4f(this.shaderProgramImages.vertexColourAttribute, 1.0, 1.0, 0.0, 1.0);

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] === "IMAGES") {
                    let buffer;
                    buffer = this.imageBuffer;

                    if (!(this.displayBuffers[idx].texture)) {
                        this.displayBuffers[idx].texture = initTextures(this.gl, this.displayBuffers[idx].supplementary["imgsrc"][0]);
                    }
                    let scaleImage = true;
                    if (typeof (this.gl, this.displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        let tempMVMatrix = mat4.create();
                        mat4.set(tempMVMatrix, this.mvMatrix[0], this.mvMatrix[1], this.mvMatrix[2], this.mvMatrix[3], this.mvMatrix[4], this.mvMatrix[5], this.mvMatrix[6], this.mvMatrix[7], this.mvMatrix[8], this.mvMatrix[9], this.mvMatrix[10], this.mvMatrix[11], (-24.0 + this.displayBuffers[idx].supplementary["vert_tri_2d"][0][0] * 48.0) * this.zoom, (-24.0 + this.displayBuffers[idx].supplementary["vert_tri_2d"][0][1] * 48.0) * this.zoom, -this.fogClipOffset, 1.0);
                        this.gl.uniformMatrix4fv(this.shaderProgramImages.mvMatrixUniform, false, tempMVMatrix);
                        scaleImage = false;
                    }

                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.displayBuffers[idx].texture);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexTextureBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramImages.vertexTextureAttribute, buffer.triangleVertexTextureBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramImages.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramImages.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                    // FIXME - And loop here
                    let theOffSet = new Float32Array(3);
                    for (let ishape = 0; ishape < triangleVertices[j].length / 3; ishape++) {
                        theOffSet[0] = triangleVertices[j][ishape * 3];
                        theOffSet[1] = triangleVertices[j][ishape * 3 + 1];
                        theOffSet[2] = triangleVertices[j][ishape * 3 + 2];
                        this.gl.uniform3fv(this.shaderProgramImages.offset, theOffSet);
                        if (scaleImage) {
                            this.gl.uniform1f(this.shaderProgramImages.size, primitiveSizes[j][ishape]);
                        } else {
                            this.gl.uniform1f(this.shaderProgramImages.size, primitiveSizes[j][ishape] * this.zoom);
                        }

                        this.gl.vertexAttrib4f(this.shaderProgramImages.vertexColourAttribute, triangleColours[j][ishape * 4], triangleColours[j][ishape * 4 + 1], triangleColours[j][ishape * 4 + 2], triangleColours[j][ishape * 4 + 3]);

                        if (this.ext) {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                    if (typeof (this.gl, this.displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        this.setMatrixUniforms(this.shaderProgramImages);
                    }
                }
            }

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] === "TEXT") {
                    let buffer;
                    buffer = this.imageBuffer;

                    const font = this.displayBuffers[idx].supplementary["font"][0][0];
                    const fnsize = font.match(/^\d+|\d+\b|\d+(?=\w)/g)[0];
                    if (!(this.displayBuffers[idx].texture)) {
                        //this.displayBuffers[idx].texture = initStringTextures(this.gl,"Hello World !!!!");
                        console.log(this.displayBuffers[idx].supplementary["imgsrc"][0][0]);
                        let tex_size = {};
                        console.log(font);
                        this.displayBuffers[idx].texture = initStringTextures(this.gl, this.displayBuffers[idx].supplementary["imgsrc"][0][0], tex_size, font);
                        console.log(tex_size);
                        this.displayBuffers[idx].tex_size = tex_size;
                    }
                    let imageVertices = [];
                    for (let iv = 0; iv < this.imageVertices.length; iv += 3) {
                        let vold = vec3Create([this.imageVertices[iv] * this.displayBuffers[idx].tex_size["width"] / this.displayBuffers[idx].tex_size["height"], this.imageVertices[iv + 1], this.imageVertices[iv + 2]]);
                        let vnew = vec3.create();
                        vec3.transformMat4(vnew, vold, invMat);
                        imageVertices[iv] = vnew[0];
                        imageVertices[iv + 1] = vnew[1];
                        imageVertices[iv + 2] = vnew[2];
                    }
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.imageBuffer.triangleVertexPositionBuffer[0]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(imageVertices), this.gl.DYNAMIC_DRAW);
                    let scaleImage = false;
                    if (typeof (this.gl, this.displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        let tempMVMatrix = mat4.create();
                        mat4.set(tempMVMatrix, this.mvMatrix[0], this.mvMatrix[1], this.mvMatrix[2], this.mvMatrix[3], this.mvMatrix[4], this.mvMatrix[5], this.mvMatrix[6], this.mvMatrix[7], this.mvMatrix[8], this.mvMatrix[9], this.mvMatrix[10], this.mvMatrix[11], (-24.0 + this.displayBuffers[idx].supplementary["vert_tri_2d"][0][0] * 48.0) * this.zoom, (-24.0 + this.displayBuffers[idx].supplementary["vert_tri_2d"][0][1] * 48.0) * this.zoom, -this.fogClipOffset, 1.0);
                        this.gl.uniformMatrix4fv(this.shaderProgramImages.mvMatrixUniform, false, tempMVMatrix);
                        scaleImage = false;
                    }

                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.displayBuffers[idx].texture);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexTextureBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramImages.vertexTextureAttribute, buffer.triangleVertexTextureBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexNormalBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramImages.vertexNormalAttribute, buffer.triangleVertexNormalBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexPositionBuffer[0]);
                    this.gl.vertexAttribPointer(this.shaderProgramImages.vertexPositionAttribute, buffer.triangleVertexPositionBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer.triangleVertexIndexBuffer[0]);
                    // FIXME - And loop here ?!?
                    let theOffSet = new Float32Array(3);
                    for (let ishape = 0; ishape < triangleVertices[j].length / 3; ishape++) {
                        theOffSet[0] = triangleVertices[j][ishape * 3];
                        theOffSet[1] = triangleVertices[j][ishape * 3 + 1];
                        theOffSet[2] = triangleVertices[j][ishape * 3 + 2];
                        this.gl.uniform3fv(this.shaderProgramImages.offset, theOffSet);
                        if (scaleImage) {
                            this.gl.uniform1f(this.shaderProgramImages.size, primitiveSizes[j][ishape]);
                        } else {
                            this.gl.uniform1f(this.shaderProgramImages.size, primitiveSizes[j][ishape] * this.zoom * fnsize / this.canvas.height * 48 * getDeviceScale());
                        }

                        this.gl.vertexAttrib4f(this.shaderProgramImages.vertexColourAttribute, triangleColours[j][ishape * 4], triangleColours[j][ishape * 4 + 1], triangleColours[j][ishape * 4 + 2], triangleColours[j][ishape * 4 + 3]);

                        if (this.ext) {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                    if (typeof (this.gl, this.displayBuffers[idx].supplementary["vert_tri_2d"]) !== "undefined") {
                        this.setMatrixUniforms(this.shaderProgramImages);
                    }
                }
            }

            this.gl.disableVertexAttribArray(this.shaderProgramImages.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexColourAttribute);
            this.gl.depthFunc(this.gl.LESS);

        }
    }

    clearTextPositionBuffers() {
        if(this.displayBuffers && this.displayBuffers[0])
            delete this.displayBuffers[0].textPositionBuffer;
    }

    drawTextLabels(up, right) {
        // Labels, angles, etc. should be instanced by texture coords, positions using contextBig

        // make sure we can render it even if it's not a power of 2
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        return

    }

    isWebGL2() {
        return this.WEBGL2;
    }

    drawDistancesAndLabels(up, right) {

        // Labels, angles, etc. instanced by texture coords, positions using contextBig

        this.gl.useProgram(this.shaderProgramTextInstanced);
        this.setMatrixUniforms(this.shaderProgramTextInstanced);

        if (this.atomLabelDepthMode) {
            //If we want to fog them
            this.gl.depthFunc(this.gl.LESS);
        } else {
            //If we want them to be on top
            this.gl.depthFunc(this.gl.ALWAYS);
            this.gl.uniform1f(this.shaderProgramTextInstanced.fog_start, 1000.0);
            this.gl.uniform1f(this.shaderProgramTextInstanced.fog_end, 1000.0);
        }

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        [this.measureTextCanvasTexture,this.labelsTextCanvasTexture].forEach((canvasTexture) => {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, canvasTexture.bigTextTex);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

            this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.vertexTextureAttribute);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, canvasTexture.bigTextureTextTexCoordBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramTextInstanced.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.vertexPositionAttribute);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, canvasTexture.bigTextureTextPositionBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramTextInstanced.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.offsetAttribute);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, canvasTexture.bigTextureTextInstanceOriginBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramTextInstanced.offsetAttribute, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.sizeAttribute);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, canvasTexture.bigTextureTextInstanceSizeBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramTextInstanced.sizeAttribute, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.enableVertexAttribArray(this.shaderProgramTextInstanced.textureOffsetAttribute);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, canvasTexture.bigTextureTexOffsetsBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramTextInstanced.textureOffsetAttribute, 4, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, canvasTexture.bigTextureTextIndexesBuffer);

            this.gl.uniform1f(this.shaderProgramTextInstanced.pixelZoom,this.zoom*canvasTexture.contextBig.canvas.height/this.canvas.height)

            if (this.WEBGL2) {
                this.gl.vertexAttribDivisor(this.shaderProgramTextInstanced.sizeAttribute, 1);
                this.gl.vertexAttribDivisor(this.shaderProgramTextInstanced.offsetAttribute, 1);
                this.gl.vertexAttribDivisor(this.shaderProgramTextInstanced.textureOffsetAttribute, 1);
                this.gl.drawElementsInstanced(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0, canvasTexture.nBigTextures);
                this.gl.vertexAttribDivisor(this.shaderProgramTextInstanced.sizeAttribute, 0);
                this.gl.vertexAttribDivisor(this.shaderProgramTextInstanced.offsetAttribute, 0);
                this.gl.vertexAttribDivisor(this.shaderProgramTextInstanced.textureOffsetAttribute, 0);
            } else {
                this.instanced_ext.vertexAttribDivisorANGLE(this.shaderProgramTextInstanced.sizeAttribute, 1);
                this.instanced_ext.vertexAttribDivisorANGLE(this.shaderProgramTextInstanced.offsetAttribute, 1);
                this.instanced_ext.vertexAttribDivisorANGLE(this.shaderProgramTextInstanced.textureOffsetAttribute, 1);
                this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0, canvasTexture.nBigTextures);
                this.instanced_ext.vertexAttribDivisorANGLE(this.shaderProgramTextInstanced.sizeAttribute, 0);
                this.instanced_ext.vertexAttribDivisorANGLE(this.shaderProgramTextInstanced.offsetAttribute, 0);
                this.instanced_ext.vertexAttribDivisorANGLE(this.shaderProgramTextInstanced.textureOffsetAttribute, 0);
            }
        })

        this.gl.depthFunc(this.gl.LESS);

    }

    drawAtomLabels(up, right, labelledAtoms, textColour, textTextureDirty) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
        for (let iat = 0; iat < labelledAtoms.length; iat++) {
            for (let jat = 0; jat < labelledAtoms[iat].length; jat++) {

                const theAtom = labelledAtoms[iat][jat];
                const theBuffer = theAtom.displayBuffer;

                if (this.displayBuffers.indexOf(theBuffer) > -1 && theBuffer.atoms.length > 0 && !theBuffer.textPositionBuffer) {
                    this.initTextBuffersBuffer(theBuffer);
                    theBuffer.textIndexs = [];
                    theBuffer.textTexCoords = [];
                    theBuffer.textTexCoords = theBuffer.textTexCoords.concat([0, 1, 1, 1, 1, 0]);
                    theBuffer.textTexCoords = theBuffer.textTexCoords.concat([0, 1, 1, 0, 0, 0]);
                    theBuffer.textIndexs = theBuffer.textIndexs.concat([0, 1, 2]);
                    theBuffer.textIndexs = theBuffer.textIndexs.concat([3, 4, 5]);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textTexCoordBuffer);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(theBuffer.textTexCoords), this.gl.STATIC_DRAW);
                    this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, theBuffer.textIndexesBuffer);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(theBuffer.textIndexs), this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(theBuffer.textIndexs), this.gl.STATIC_DRAW);
                    }
                    this.makeTextCanvas("Fluffy", 512, 32, textColour);
                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.textCtx.canvas);

                    theBuffer.textNormals = [];
                    theBuffer.textColours = [];
                    theBuffer.textNormals = theBuffer.textNormals.concat([0, 0, 1, 0, 0, 1, 0, 0, 1]);
                    theBuffer.textNormals = theBuffer.textNormals.concat([0, 0, 1, 0, 0, 1, 0, 0, 1]);
                    theBuffer.textColours = theBuffer.textColours.concat([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
                    theBuffer.textColours = theBuffer.textColours.concat([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textNormalBuffer);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(theBuffer.textNormals), this.gl.STATIC_DRAW);
                    this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textColourBuffer);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(theBuffer.textColours), this.gl.STATIC_DRAW);
                    this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);
                }
            }
        }

        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.setMatrixUniforms(this.shaderProgramTextBackground);

        if (this.atomLabelDepthMode) {
            //If we want to fog them
            this.gl.depthFunc(this.gl.LESS);
            this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, this.gl_fog_start);
            this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, this.gl_fog_end);
        } else {
            //If we want them to be on top
            this.gl.depthFunc(this.gl.ALWAYS);
            this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
            this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        }
        this.gl.uniform4fv(this.shaderProgramTextBackground.fogColour, new Float32Array(this.background_colour));

        for (let iat = 0; iat < labelledAtoms.length; iat++) {
            for (let jat = 0; jat < labelledAtoms[iat].length; jat++) {

                const theAtom = labelledAtoms[iat][jat];
                const theBuffer = theAtom.displayBuffer;
                if (theBuffer.textNormals.length === 0 || theBuffer.atoms.length === 0)
                    continue;

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textTexCoordBuffer);
                this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textNormalBuffer);
                this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textColourBuffer);
                this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, theBuffer.textPositionBuffer);
                this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, theBuffer.textIndexesBuffer);

                theBuffer.textVertices = [];

                if (textTextureDirty || typeof (labelledAtoms[iat][jat].imgData) === "undefined") {
                    const ret = this.makeTextCanvas(labelledAtoms[iat][jat].label, 512, 32, textColour);
                    const maxTextureS = ret[0];
                    labelledAtoms[iat][jat].imgData = this.textCtx.getImageData(0, 0, 512, 32);
                    labelledAtoms[iat][jat].maxImgTextureS = maxTextureS;
                }
                this.gl.uniform1f(this.shaderProgramTextBackground.maxTextureS, labelledAtoms[iat][jat].maxImgTextureS);
                this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, labelledAtoms[iat][jat].imgData);

                let x = labelledAtoms[iat][jat].x;
                let y = labelledAtoms[iat][jat].y;
                let z = labelledAtoms[iat][jat].z;
                let tSizeX = 2.0 * this.textCtx.canvas.width / this.textCtx.canvas.height * this.zoom;
                let tSizeY = 2.0 * this.zoom;
                theBuffer.textVertices = theBuffer.textVertices.concat([x, y, z, x + tSizeX * right[0], y + tSizeX * right[1], z + tSizeX * right[2], x + tSizeY * up[0] + tSizeX * right[0], y + tSizeY * up[1] + tSizeX * right[1], z + tSizeY * up[2] + tSizeX * right[2]]);
                theBuffer.textVertices = theBuffer.textVertices.concat([x, y, z, x + tSizeY * up[0] + tSizeX * right[0], y + tSizeY * up[1] + tSizeX * right[1], z + tSizeY * up[2] + tSizeX * right[2], x + tSizeY * up[0], y + tSizeY * up[1], z + tSizeY * up[2]]);

                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(theBuffer.textVertices), this.gl.DYNAMIC_DRAW);

                if (this.ext) {
                    this.gl.drawElements(this.gl.TRIANGLES, theBuffer.textIndexs.length, this.gl.UNSIGNED_INT, 0);
                } else {
                    this.gl.drawElements(this.gl.TRIANGLES, theBuffer.textIndexs.length, this.gl.UNSIGNED_SHORT, 0);
                }
            }
        }
    }

    drawCircles(up, right) {
        this.gl.useProgram(this.shaderProgramCircles);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.circleTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.uniform3fv(this.shaderProgramCircles.up, up);
        this.gl.uniform3fv(this.shaderProgramCircles.right, right);

        //TODO
        // Use the right coords and colours and not do this for clicked atoms!
        // Big texture
        // I think this below is for debugging, but I have forgotten ...
        if (false && this.labelledAtoms.length > 0) {

            this.gl.enableVertexAttribArray(this.shaderProgramCircles.vertexTextureAttribute);
            this.setMatrixUniforms(this.shaderProgramCircles);

            this.gl.depthFunc(this.gl.ALWAYS);

            //FIXME - class/displayobject members
            let circlesVertexBuffer = this.gl.createBuffer();
            let circlesNormalBuffer = this.gl.createBuffer();
            let circlesTextureBuffer = this.gl.createBuffer();
            let circlesIndexesBuffer = this.gl.createBuffer();

            circlesVertexBuffer.itemSize = 3;
            circlesNormalBuffer.itemSize = 3;
            circlesTextureBuffer.itemSize = 2;

            let circlesVertices = [];
            let circlesNormals = [];
            let circlesTextures = [];
            let circlesIndexes = [];
            let idx = 0;

            for (let iat = 0; iat < this.labelledAtoms.length; iat++) {
                //FIXME - Obviously not wanting to use clicked atom data ...
                for (let jat = 0; jat < this.labelledAtoms[iat].length; jat++) {
                    this.displayBuffers[0].textVertices = [];

                    if (!this.labelledAtoms[iat][jat].circleData) {
                        let element = this.labelledAtoms[iat][jat].symbol;
                        console.log(element);
                        this.makeCircleCanvas(element, 128, 128, "black");
                        this.labelledAtoms[iat][jat].circleData = this.circleCtx.getImageData(0, 0, 128, 128);
                    }
                    //console.log(this.labelledAtoms[iat][jat].circleData);
                    this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.labelledAtoms[iat][jat].circleData);

                    let x = this.labelledAtoms[iat][jat].x;
                    let y = this.labelledAtoms[iat][jat].y;
                    let z = this.labelledAtoms[iat][jat].z;
                    let tSizeX = 0.5;
                    let tSizeY = 0.5;

                    circlesVertices = circlesVertices.concat([x, y, z, x, y, z, x, y, z])
                    circlesVertices = circlesVertices.concat([x, y, z, x, y, z, x, y, z])

                    //This is were our +/- x,y offsets go.
                    circlesNormals = circlesNormals.concat([-1.0 * tSizeX, -1.0 * tSizeY, 0, 1.0 * tSizeX, -1.0 * tSizeY, 0, 1.0 * tSizeX, 1.0 * tSizeY, 0]);
                    circlesNormals = circlesNormals.concat([-1.0 * tSizeX, -1.0 * tSizeY, 0, 1.0 * tSizeX, 1.0 * tSizeY, 0, -1.0 * tSizeX, 1.0 * tSizeY, 0]);

                    //FIXME - Bummer, forgot that I need to a "big" texture and that texture coords must cross reference that.
                    circlesTextures = circlesTextures.concat([0.0, 0.0, 1.0, 0.0, 1.0, 1.0]);
                    circlesTextures = circlesTextures.concat([0.0, 0.0, 1.0, 1.0, 0.0, 1.0]);

                    circlesIndexes.push(idx++);
                    circlesIndexes.push(idx++);
                    circlesIndexes.push(idx++);
                    circlesIndexes.push(idx++);
                    circlesIndexes.push(idx++);
                    circlesIndexes.push(idx++);

                }
            }

            circlesTextureBuffer.numItems = circlesTextures.length / 2;
            circlesNormalBuffer.numItems = circlesNormals.length / 3;
            circlesVertexBuffer.numItems = circlesVertices.length / 3;
            circlesIndexesBuffer.numItems = circlesIndexes.length;

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, circlesTextureBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramCircles.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(circlesTextures), this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, circlesNormalBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramCircles.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(circlesNormals), this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, circlesVertexBuffer);
            this.gl.vertexAttribPointer(this.shaderProgramCircles.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(circlesVertices), this.gl.DYNAMIC_DRAW);

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, circlesIndexesBuffer);

            if (this.ext) {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(circlesIndexes), this.gl.DYNAMIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, circlesIndexes.length, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circlesIndexes), this.gl.DYNAMIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, circlesIndexes.length, this.gl.UNSIGNED_SHORT, 0);
            }

            //console.log(circlesTextures);
            //console.log(circlesNormals);
            //console.log(circlesVertices);
            //console.log(circlesIndexes);

            this.gl.disableVertexAttribArray(this.shaderProgramCircles.vertexTextureAttribute);
            this.gl.depthFunc(this.gl.LESS);

        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
    }

    getFrontAndBackPos(event: KeyboardEvent) : [number[], number[], number, number]  {
        const self = this;
        let x = this.gl_cursorPos[0];
        let y = this.canvas.height - this.gl_cursorPos[1];
        x *= getDeviceScale();
        y *= getDeviceScale();

        //document.getElementById("info").innerHTML="Click: "+event.x+" "+event.y;
        let invQuat = quat4.create();
        quat4Inverse(self.myQuat, invQuat);
        const theMatrix = quatToMat4(invQuat);
        const ratio = 1.0 * self.gl.viewportWidth / self.gl.viewportHeight;
        const minX = (-24. * ratio * self.zoom);
        const maxX = (24. * ratio * self.zoom);
        const minY = (-24. * self.zoom);
        const maxY = (24. * self.zoom);
        const fracX = 1.0 * x / self.gl.viewportWidth;
        const fracY = 1.0 * (y) / self.gl.viewportHeight;
        const theX = minX + fracX * (maxX - minX);
        const theY = maxY - fracY * (maxY - minY);
        //let frontPos = vec3Create([theX,theY,-1000.0]);
        //let backPos  = vec3Create([theX,theY,1000.0]);
        //MN Changed to improve picking
        let frontPos = vec3Create([theX, theY, -this.gl_clipPlane0[3] - this.fogClipOffset]);
        let backPos = vec3Create([theX, theY, this.gl_clipPlane1[3] - this.fogClipOffset]);
        vec3.transformMat4(frontPos, frontPos, theMatrix);
        vec3.transformMat4(backPos, backPos, theMatrix);
        vec3.subtract(frontPos, frontPos, self.origin);
        vec3.subtract(backPos, backPos, self.origin);
        return [frontPos, backPos, x, y];
    }

    doRightClick(event, self) {
        if (self.activeMolecule === null) {

            const [minidx,minj,mindist] = self.getAtomFomMouseXY(event,self);
            let rightClick = new CustomEvent("rightClick", {
            "detail": {
                atom: minidx > -1 ? self.displayBuffers[minidx].atoms[minj] : null,
                buffer: minidx > -1 ? self.displayBuffers[minidx] : null,
                coords: "",
                pageX: event.pageX,
                pageY: event.pageY
            }
            });
            document.dispatchEvent(rightClick);
        }
    }

    doClick(event, self) {
        if (this.activeMolecule == null) {
            document.body.click()
        }

        if (!self.mouseMoved) {
            let updateLabels = false
            //console.log(npass+" "+npass0+" "+npass1+" "+ntest);
            const [minidx,minj,mindist] = self.getAtomFomMouseXY(event,self);
            if (minidx > -1) {
                let theAtom : clickAtom = {
                   x: self.displayBuffers[minidx].atoms[minj].x,
                   y: self.displayBuffers[minidx].atoms[minj].y,
                   z: self.displayBuffers[minidx].atoms[minj].z,
                   charge: self.displayBuffers[minidx].atoms[minj].charge,
                   label: self.displayBuffers[minidx].atoms[minj].label,
                   symbol: self.displayBuffers[minidx].atoms[minj].symbol,
                   displayBuffer: self.displayBuffers[minidx]
                };
                let atx = theAtom.x;
                let aty = theAtom.y;
                let atz = theAtom.z;
                let label = theAtom.label;
                let tempFactorLabel = "";
                if (self.displayBuffers[minidx].atoms[minj].tempFactor) {
                    tempFactorLabel = ", B: " + self.displayBuffers[minidx].atoms[minj].tempFactor;
                }
                this.props.messageChanged({ message: label + ", xyz:(" + atx + " " + aty + " " + atz + ")" + tempFactorLabel });

                let atomClicked = new CustomEvent("atomClicked", {
                    "detail": {
                        atom: self.displayBuffers[minidx].atoms[minj],
                        buffer: self.displayBuffers[minidx]
                    }
                });
                document.dispatchEvent(atomClicked);
                if (this.draggableMolecule != null && this.draggableMolecule.representations.length > 0 && this.draggableMolecule.buffersInclude(self.displayBuffers[minidx])) {
                    this.currentlyDraggedAtom = { atom: self.displayBuffers[minidx].atoms[minj], buffer: self.displayBuffers[minidx] }
                }
                if (self.keysDown['label_atom']) {
                    updateLabels = true
                    if (self.labelledAtoms.length === 0 || (self.labelledAtoms[self.labelledAtoms.length - 1].length > 1)) {
                        self.labelledAtoms.push([]);
                        self.labelledAtoms[self.labelledAtoms.length - 1].push(theAtom);
                    } else {
                        self.labelledAtoms[self.labelledAtoms.length - 1].push(theAtom);
                    }
                } else if (self.keysDown['measure_distances']) {
                    updateLabels = true
                    if (self.measuredAtoms.length === 0 || (self.measuredAtoms[self.measuredAtoms.length - 1].length > 1 && !self.keysDown['measure_angles'])) {
                        self.measuredAtoms.push([]);
                        self.measuredAtoms[self.measuredAtoms.length - 1].push(theAtom);
                    } else {
                        self.measuredAtoms[self.measuredAtoms.length - 1].push(theAtom);
                    }
                }
            }
            if(updateLabels) self.updateLabels()
        }

        self.drawScene();
    }

    updateLabels(){
        const self = this;
        self.clearMeasureCylinderBuffers()
        let atomPairs = []
        self.measuredAtoms.forEach(bump => {
            if(bump.length>1){
                for(let ib=1;ib<bump.length;ib++){
                    const first = bump[ib];
                    const second = bump[ib-1];
                    const firstAtomInfo = {
                        pos: [first.x, first.y, first.z],
                        x: first.x,
                        y: first.y,
                        z: first.z,
                    }

                    const secondAtomInfo = {
                        pos: [second.x, second.y, second.z],
                        x: second.x,
                        y: second.y,
                        z: second.z,
                    }

                    const pair = [firstAtomInfo, secondAtomInfo]
                    atomPairs.push(pair)

                    let v1 = vec3Create([first.x, first.y, first.z]);
                    let v2 = vec3Create([second.x, second.y, second.z]);

                    let v1diffv2 = vec3.create();
                    vec3Subtract(v1, v2, v1diffv2);
                    let linesize = vec3.length(v1diffv2).toFixed(3);
                    let mid = vec3.create();
                    vec3Add(v1, v2, mid);
                    mid[0] *= 0.5;
                    mid[1] *= 0.5;
                    mid[2] *= 0.5;
                    self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:linesize,x:mid[0],y:mid[1],z:mid[2]})
                    if(bump.length>2&&ib>1){
                        const third = bump[ib-2];
                        let v3 = vec3Create([third.x, third.y, third.z]);
                        let v2diffv3 = vec3.create();
                        vec3Subtract(v2, v3, v2diffv3);
                        NormalizeVec3(v2diffv3);
                        let v2diffv1 = vec3.create();
                        vec3Subtract(v2, v1, v2diffv1);
                        NormalizeVec3(v2diffv1);

                        let v12plusv23 = vec3.create();
                        vec3Add(v2diffv3, v2diffv1, v12plusv23);
                        NormalizeVec3(v12plusv23);
                        v12plusv23[0] *= -.5
                        v12plusv23[1] *= -.5
                        v12plusv23[2] *= -.5

                        let angle = (Math.acos(vec3.dot(v2diffv1, v2diffv3)) * 180.0 / Math.PI).toFixed(1)+"˚";
                        self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:angle,x:second.x+v12plusv23[0],y:second.y+v12plusv23[1],z:second.z+v12plusv23[2]})

                        if(bump.length>3&&ib>2){
                            const fourth = bump[ib-3];
                            let v4 = vec3Create([fourth.x, fourth.y, fourth.z]);
                            let dihedral = (DihedralAngle(v1, v2, v3, v4) * 180.0 / Math.PI).toFixed(1)+"˚"
                            let cross = vec3.create();
                            vec3Cross(v2diffv1, v2diffv3,cross)
                            NormalizeVec3(cross);
                            let dihedralOffset = vec3.create();
                            vec3Cross(v2diffv3, cross, dihedralOffset)
                            dihedralOffset[0] *= .25
                            dihedralOffset[1] *= .25
                            dihedralOffset[2] *= .25
                            let mid23 = vec3.create();
                            vec3Add(v2, v3, mid23);
                            mid23[0] *= 0.5;
                            mid23[1] *= 0.5;
                            mid23[2] *= 0.5;
                            self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:dihedral,x:mid23[0]+dihedralOffset[0],y:mid23[1]+dihedralOffset[1],z:mid23[2]+dihedralOffset[2]})
                        }
                    }

                }
            }
        })
        const atomColours = {}
        const colour = [1.0,0.0,0.0,1.0]
        atomPairs.forEach(atom => { atomColours[`${atom[0].serial}`] = colour; atomColours[`${atom[1].serial}`] = colour })
        let objects = [
            gemmiAtomPairsToCylindersInfo(atomPairs, 0.07, atomColours, false, 0.01, 1000.)
        ]
        objects.filter(object => typeof object !== 'undefined' && object !== null).forEach(object => {
            const a = self.appendOtherData(object, true);
            self.measureCylinderBuffers = self.measureCylinderBuffers.concat(a)
        })
        self.measuredAtoms.forEach(atoms => {
            atoms.forEach(atom => {
                self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:atom.label,x:atom.x,y:atom.y,z:atom.z})
            })
        })

        self.labelledAtoms.forEach(atoms => {
            atoms.forEach(atom => {
                self.measureTextCanvasTexture.addBigTextureTextImage({font:self.glTextFont,text:atom.label,x:atom.x,y:atom.y,z:atom.z})
            })
        })

        self.measureTextCanvasTexture.recreateBigTextureBuffers();
        self.buildBuffers();
    }

    clearMeasureCylinderBuffers() : void {
        if(this.measureCylinderBuffers){
            this.measureCylinderBuffers.forEach((buffer) => {
                if("clearBuffers" in buffer){
                    buffer.clearBuffers()
                    this.displayBuffers.filter(glBuffer => glBuffer !== buffer)
                }
            })
        }
        this.measureCylinderBuffers = []
        this.measureTextCanvasTexture.clearBigTexture()
    }

    getAtomFomMouseXY(event, self) {
        let x;
        let y;
        let e = event;
        if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        }
        else {
            x = e.clientX;
            y = e.clientY;
        }

        let c = this.canvasRef.current;
        let offset = getOffsetRect(c);

        x -= offset.left;
        y -= offset.top;
        x *= getDeviceScale();
        y *= getDeviceScale();

        const viewportArray = [
            0, 0, this.gl.viewportWidth, this.gl.viewportHeight
        ];

        // The results of the operation will be stored in this array.
        let modelPointArrayResultsFront = [];
        let modelPointArrayResultsBack = [];

        //FIXME - This is hackery
        let factor = 999.9;
        if(this.doPerspectiveProjection){
            factor = 99.9;
        }
        let success = unProject(
                x, this.gl.viewportHeight-y, -(this.gl_clipPlane0[3]-this.fogClipOffset)/factor,
                this.mvMatrix as unknown as number[], this.pMatrix as unknown as number[],
                viewportArray, modelPointArrayResultsFront);

        success = unProject(
                x, this.gl.viewportHeight-y, -(this.gl_clipPlane1[3]-this.fogClipOffset)/factor,
                this.mvMatrix as unknown as number[], this.pMatrix as unknown as number[],
                viewportArray, modelPointArrayResultsBack);

        let mindist = 100000.;
        let minidx = -1;
        let minj = -1;
        //FIXME - This needs to depend on whether spheres, surface are drawn

        for (let idx = 0; idx < self.displayBuffers.length; idx++) {
            let clickTol = 3.65 * this.zoom;
            if (!self.displayBuffers[idx].visible) {
                continue;
            }
            if(self.displayBuffers[idx].clickTol){
                clickTol = self.displayBuffers[idx].clickTol;
            }
            for (let j = 0; j < self.displayBuffers[idx].atoms.length; j++) {

                let atx = self.displayBuffers[idx].atoms[j].x;
                let aty = self.displayBuffers[idx].atoms[j].y;
                let atz = self.displayBuffers[idx].atoms[j].z;
                let p = vec3Create([atx, aty, atz]);

                let dpl = DistanceBetweenPointAndLine(modelPointArrayResultsFront, modelPointArrayResultsBack, p);

                let atPosTrans = vec3Create([0, 0, 0]);
                vec3.transformMat4(atPosTrans, p, this.mvMatrix);
                let azDot = this.gl_clipPlane0[3]-atPosTrans[2];
                let bzDot = this.gl_clipPlane1[3]+atPosTrans[2];

                if (
                        dpl[0] < clickTol //* targetFactor //clickTol modified to reflect proximity to rptation origin
                        && dpl[0] < mindist //closest click seen
                        && azDot > 0 //Beyond near clipping plane
                        && bzDot > 0 //In front of far clipping plan
                   ) {
                    minidx = idx;
                    minj = j;
                    mindist = dpl[0];
                }
            }
        }

        return [minidx,minj,mindist];

    }

    doHover(event, self) {
        const [minidx,minj,mindist] = self.getAtomFomMouseXY(event,self);
        if (minidx > -1) {
            let theAtom : clickAtom = {
               x: self.displayBuffers[minidx].atoms[minj].x,
               y: self.displayBuffers[minidx].atoms[minj].y,
               z: self.displayBuffers[minidx].atoms[minj].z,
               charge: self.displayBuffers[minidx].atoms[minj].charge,
               label: self.displayBuffers[minidx].atoms[minj].label,
               symbol: self.displayBuffers[minidx].atoms[minj].symbol,
               displayBuffer: self.displayBuffers[minidx]
            };
            let atx = theAtom.x;
            let aty = theAtom.y;
            let atz = theAtom.z;
            let label = theAtom.label;
            let tempFactorLabel = "";
            if (self.displayBuffers[minidx].atoms[minj].tempFactor) {
                tempFactorLabel = ", B: " + self.displayBuffers[minidx].atoms[minj].tempFactor;
            }
            this.props.messageChanged({ message: label + ", xyz:(" + atx + " " + aty + " " + atz + ")" + tempFactorLabel });

            if (this.props.onAtomHovered) {
                this.props.onAtomHovered({ atom: self.displayBuffers[minidx].atoms[minj], buffer: self.displayBuffers[minidx] });
            }
        }
        else {
            if (this.props.onAtomHovered) {
                this.props.onAtomHovered(null)
            }
        }
        self.drawScene();
    }

    doWheel(event) {
        const self = this
        let factor;
        if (event.deltaY > 0) {
            factor = 1. + 1 / (50.0 - self.props.zoomWheelSensitivityFactor * 5);
        } else {
            factor = 1. - 1 / (50.0 - self.props.zoomWheelSensitivityFactor * 5);
        }

        if (self.keysDown['set_map_contour']) {
            this.setWheelContour(factor, true)
        } else {
            let newZoom = this.zoom * factor;
            if (newZoom < .01) {
                newZoom = 0.01;
            }
            this.setZoom(newZoom, true)
        }

    }

    linesToThickLinesWithIndicesAndNormals(axesVertices, axesNormals, axesColours, axesIndices, size) {
        return this.linesToThickLinesWithIndices(axesVertices, axesColours, axesIndices, size, axesNormals)
    }

    linesToThickLinesWithIndices(axesVertices: number[], axesColours: number[], axesIndices: number[], size: number, axesNormals_old? : number) {
        let axesNormals = [];
        let axesNormals_new = [];
        let axesVertices_new = [];
        let axesColours_new = [];
        let axesIndexs_new = [];
        let axesIdx_new = 0;

        for (let idx = 0; idx < axesIndices.length; idx += 2) {

            const il = 3 * axesIndices[idx];
            const il2 = 3 * axesIndices[idx + 1];

            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);

            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);

            axesColours_new.push(axesColours[4 * il2 / 3]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 1]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 2]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 3]);

            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);

            axesColours_new.push(axesColours[4 * il2 / 3]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 1]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 2]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 3]);

            axesColours_new.push(axesColours[4 * il2 / 3]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 1]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 2]);
            axesColours_new.push(axesColours[4 * il2 / 3 + 3]);

            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);

            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);

            axesVertices_new.push(axesVertices[il2]);
            axesVertices_new.push(axesVertices[il2 + 1]);
            axesVertices_new.push(axesVertices[il2 + 2]);

            if (axesNormals_old) {
                axesNormals_new.push(axesNormals_old[il]);
                axesNormals_new.push(axesNormals_old[il + 1]);
                axesNormals_new.push(axesNormals_old[il + 2]);

                axesNormals_new.push(axesNormals_old[il]);
                axesNormals_new.push(axesNormals_old[il + 1]);
                axesNormals_new.push(axesNormals_old[il + 2]);

                axesNormals_new.push(axesNormals_old[il2]);
                axesNormals_new.push(axesNormals_old[il2 + 1]);
                axesNormals_new.push(axesNormals_old[il2 + 2]);
            }

            axesNormals.push(axesVertices[il2] - axesVertices[il]);
            axesNormals.push(axesVertices[il2 + 1] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il2 + 2] - axesVertices[il + 2]);

            let d = Math.sqrt(axesNormals[axesNormals.length - 1 - 2] * axesNormals[axesNormals.length - 1 - 2] + axesNormals[axesNormals.length - 1 - 1] * axesNormals[axesNormals.length - 1 - 1] + axesNormals[axesNormals.length - 1 - 0] * axesNormals[axesNormals.length - 1 - 0]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }

            axesNormals.push(-(axesVertices[il2] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il2 + 1] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il2 + 2] - axesVertices[il + 2]));

            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }

            axesNormals.push(-(axesVertices[il2] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il2 + 1] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il2 + 2] - axesVertices[il + 2]));

            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);

            axesVertices_new.push(axesVertices[il2]);
            axesVertices_new.push(axesVertices[il2 + 1]);
            axesVertices_new.push(axesVertices[il2 + 2]);

            axesVertices_new.push(axesVertices[il2]);
            axesVertices_new.push(axesVertices[il2 + 1]);
            axesVertices_new.push(axesVertices[il2 + 2]);

            if (axesNormals_old) {
                axesNormals_new.push(axesNormals_old[il]);
                axesNormals_new.push(axesNormals_old[il + 1]);
                axesNormals_new.push(axesNormals_old[il + 2]);

                axesNormals_new.push(axesNormals_old[il2]);
                axesNormals_new.push(axesNormals_old[il2 + 1]);
                axesNormals_new.push(axesNormals_old[il2 + 2]);

                axesNormals_new.push(axesNormals_old[il2]);
                axesNormals_new.push(axesNormals_old[il2 + 1]);
                axesNormals_new.push(axesNormals_old[il2 + 2]);
            }

            axesNormals.push(axesVertices[il2] - axesVertices[il]);
            axesNormals.push(axesVertices[il2 + 1] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il2 + 2] - axesVertices[il + 2]);

            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }

            axesNormals.push(axesVertices[il2] - axesVertices[il]);
            axesNormals.push(axesVertices[il2 + 1] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il2 + 2] - axesVertices[il + 2]);

            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }

            axesNormals.push(-(axesVertices[il2] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il2 + 1] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il2 + 2] - axesVertices[il + 2]));

            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            let axesIdx_old = axesIdx_new;
            axesIndexs_new.push(axesIdx_old);
            axesIndexs_new.push(axesIdx_old+2);
            axesIndexs_new.push(axesIdx_old+1);
            axesIndexs_new.push(axesIdx_old+3);
            axesIndexs_new.push(axesIdx_old+4);
            axesIndexs_new.push(axesIdx_old+5);
            axesIdx_new += 6;
            /*
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            */
        }

        let ret = {};
        ret["vertices"] = axesVertices_new;
        ret["indices"] = axesIndexs_new;
        ret["normals"] = axesNormals;
        ret["colours"] = axesColours_new;
        ret["realNormals"] = axesNormals_new;
        return ret;

    }

    linesToThickLines(axesVertices, axesColours, size) {
        let axesNormals = [];
        let axesVertices_new = [];
        let axesColours_new = [];
        let axesIndexs_new = [];
        let axesIdx_new = 0;

        for (let il = 0; il < axesVertices.length; il += 6) {
            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);
            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 4]);
            axesColours_new.push(axesColours[4 * il / 3 + 5]);
            axesColours_new.push(axesColours[4 * il / 3 + 6]);
            axesColours_new.push(axesColours[4 * il / 3 + 7]);
            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 4]);
            axesColours_new.push(axesColours[4 * il / 3 + 5]);
            axesColours_new.push(axesColours[4 * il / 3 + 6]);
            axesColours_new.push(axesColours[4 * il / 3 + 7]);
            axesColours_new.push(axesColours[4 * il / 3 + 4]);
            axesColours_new.push(axesColours[4 * il / 3 + 5]);
            axesColours_new.push(axesColours[4 * il / 3 + 6]);
            axesColours_new.push(axesColours[4 * il / 3 + 7]);

            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);
            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);
            axesVertices_new.push(axesVertices[il + 3]);
            axesVertices_new.push(axesVertices[il + 4]);
            axesVertices_new.push(axesVertices[il + 5]);
            axesNormals.push(axesVertices[il + 3] - axesVertices[il]);
            axesNormals.push(axesVertices[il + 4] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il + 5] - axesVertices[il + 2]);
            let d = Math.sqrt(axesNormals[axesNormals.length - 1 - 2] * axesNormals[axesNormals.length - 1 - 2] + axesNormals[axesNormals.length - 1 - 1] * axesNormals[axesNormals.length - 1 - 1] + axesNormals[axesNormals.length - 1 - 0] * axesNormals[axesNormals.length - 1 - 0]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }

            axesNormals.push(-(axesVertices[il + 3] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il + 4] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il + 5] - axesVertices[il + 2]));
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesNormals.push(-(axesVertices[il + 3] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il + 4] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il + 5] - axesVertices[il + 2]));
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);
            axesVertices_new.push(axesVertices[il + 3]);
            axesVertices_new.push(axesVertices[il + 4]);
            axesVertices_new.push(axesVertices[il + 5]);
            axesVertices_new.push(axesVertices[il + 3]);
            axesVertices_new.push(axesVertices[il + 4]);
            axesVertices_new.push(axesVertices[il + 5]);
            axesNormals.push(axesVertices[il + 3] - axesVertices[il]);
            axesNormals.push(axesVertices[il + 4] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il + 5] - axesVertices[il + 2]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesNormals.push(axesVertices[il + 3] - axesVertices[il]);
            axesNormals.push(axesVertices[il + 4] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il + 5] - axesVertices[il + 2]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesNormals.push(-(axesVertices[il + 3] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il + 4] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il + 5] - axesVertices[il + 2]));
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
        }

        let ret = {};
        ret["vertices"] = axesVertices_new;
        ret["indices"] = axesIndexs_new;
        ret["normals"] = axesNormals;
        ret["colours"] = axesColours_new;
        return ret;

    }


    drawCrosshairs(invMat) {

        this.gl.depthFunc(this.gl.ALWAYS);
        this.gl.useProgram(this.shaderProgramTextBackground);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        let axesOffset = vec3.create();
        vec3.set(axesOffset, 0, 0, 0);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])
        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, this.pmvMatrix);
        this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, this.screenZ);
        this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 0.04 * this.zoom);

        if (typeof (this.axesPositionBuffer) === "undefined") {
            this.axesPositionBuffer = this.gl.createBuffer();
            this.axesColourBuffer = this.gl.createBuffer();
            this.axesIndexBuffer = this.gl.createBuffer();
            this.axesNormalBuffer = this.gl.createBuffer();
            this.axesTextNormalBuffer = this.gl.createBuffer();
            this.axesTextColourBuffer = this.gl.createBuffer();
            this.axesTextPositionBuffer = this.gl.createBuffer();
            this.axesTextTexCoordBuffer = this.gl.createBuffer();
            this.axesTextIndexesBuffer = this.gl.createBuffer();
        }
        const renderArrays = {
            axesVertices: [],
            axesColours: [],
            axesIdx: []
        }
        const addSegment = (renderArrays, point1, point2, colour1, colour2) => {
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point1)
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point2)
            renderArrays.axesColours = renderArrays.axesColours.concat([...colour1, ...colour2])
        }

        let hairColour = [0., 0., 0., 1.];
        let y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            hairColour = [1., 1., 1., 1.];
        }

        // Actual axes
        let cross_hair_scale_factor = 0.3;
        let horizontalHairStart = vec3.create();
        vec3.set(horizontalHairStart, -cross_hair_scale_factor * this.zoom, 0.0, 0.0);
        vec3.transformMat4(horizontalHairStart, horizontalHairStart, invMat);
        let horizontalHairEnd = vec3.create();
        vec3.set(horizontalHairEnd, cross_hair_scale_factor * this.zoom, 0.0, 0.0);
        vec3.transformMat4(horizontalHairEnd, horizontalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + horizontalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + horizontalHairEnd[iCoord]),
            hairColour, hairColour
        )

        let verticalHairStart = vec3.create();
        vec3.set(verticalHairStart, 0.0, -cross_hair_scale_factor * this.zoom, 0.0);
        vec3.transformMat4(verticalHairStart, verticalHairStart, invMat);
        let verticalHairEnd = vec3.create();
        vec3.set(verticalHairEnd, 0.0, cross_hair_scale_factor * this.zoom, 0.0);
        vec3.transformMat4(verticalHairEnd, verticalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + verticalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + verticalHairEnd[iCoord]),
            hairColour, hairColour
        )

        let size = 1.0;
        const thickLines = this.linesToThickLines(renderArrays.axesVertices, renderArrays.axesColours, size);
        let axesNormals = thickLines["normals"];
        let axesVertices_new = thickLines["vertices"];
        let axesColours_new = thickLines["colours"];
        let axesIndexs_new = thickLines["indices"];

        //console.log("thickLines",thickLines);
        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesVertices_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesColours_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.axesIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.depthFunc(this.gl.LESS)

    }

    drawMouseTrack() {

        const c = this.canvasRef.current;
        const offset = getOffsetRect(c);

        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
        const frac_x = (getDeviceScale()*(this.init_x-offset.left)/this.gl.viewportWidth-0.5)  * 48.;
        const frac_y = -(getDeviceScale()*(this.init_y-offset.top)/this.gl.viewportHeight-0.5) * 48;

        this.gl.depthFunc(this.gl.ALWAYS);

        this.gl.useProgram(this.shaderProgram);
        this.setMatrixUniforms(this.shaderProgram);
        this.gl.uniform1f(this.shaderProgram.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgram.fog_end, 1000.0);
        this.gl.uniform4fv(this.shaderProgram.clipPlane0, [0, 0, -1, 1000]);
        this.gl.uniform4fv(this.shaderProgram.clipPlane1, [0, 0, 1, 1000]);
        const pmvMatrix = mat4.create();
        const tempMVMatrix = mat4.create();
        mat4.set(tempMVMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -50.0, 1.0,
        )
        const tempInvMVMatrix = mat4.create();
        mat4.set(tempInvMVMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        )
        let pMatrix = mat4.create();
        mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
        mat4.multiply(pmvMatrix, pMatrix, tempMVMatrix); // Lines
        this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pmvMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, tempInvMVMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgram.mvInvMatrixUniform, false, tempInvMVMatrix);

        this.mouseTrackPoints.push([frac_x,frac_y,performance.now()]);
        if(this.mouseTrackPoints.length>120) this.mouseTrackPoints.shift();

        let mouseTrackVertices = [];
        let mouseTrackColours = [];
        let mouseTrackNormals = [];
        let mouseTrackIndexs = [];

        let i = 0;
        let currentIdx = 0;
        this.mouseTrackPoints.forEach(point => {
            const this_x = point[0];
            const this_y = point[1];
            const timeStamp = point[2];
            const ifrac = i / this.mouseTrackPoints.length;
            if((performance.now()-timeStamp)<200){
            mouseTrackVertices = mouseTrackVertices.concat([
                this_x-ifrac/ratio, this_y-ifrac, 0.0,
                this_x+ifrac/ratio, this_y-ifrac, 0.0,
                this_x+ifrac/ratio, this_y+ifrac, 0.0,
                this_x-ifrac/ratio, this_y+ifrac, 0.0,
            ]);
            mouseTrackColours = mouseTrackColours.concat([
                1, 0, 0, 1,
                1, 0, 0, 1,
                1, 0, 0, 1,
                1, 0, 0, 1,
            ]);
            mouseTrackNormals = mouseTrackNormals.concat([
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
            ]);
            mouseTrackIndexs = mouseTrackIndexs.concat([
               currentIdx, currentIdx+1, currentIdx+2,
               currentIdx, currentIdx+2, currentIdx+3,
            ])
               currentIdx += 4;
            }
            i += 1;
        })

        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgram.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexColourAttribute);

        if (typeof (this.mouseTrackPositionBuffer) === "undefined") {
            this.mouseTrackPositionBuffer = this.gl.createBuffer();
            this.mouseTrackColourBuffer = this.gl.createBuffer();
            this.mouseTrackIndexBuffer = this.gl.createBuffer();
            this.mouseTrackNormalBuffer = this.gl.createBuffer();
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mouseTrackNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mouseTrackNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mouseTrackPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mouseTrackVertices), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mouseTrackColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(mouseTrackColours), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.mouseTrackIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mouseTrackIndexs), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, mouseTrackIndexs.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mouseTrackIndexs), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, mouseTrackIndexs.length, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.depthFunc(this.gl.LESS)
    }

    drawFPSMeter() {

        this.gl.depthFunc(this.gl.ALWAYS);

        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_end, 1000.0);
        this.gl.uniform4fv(this.shaderProgramThickLines.clipPlane0, [0, 0, -1, 1000]);
        this.gl.uniform4fv(this.shaderProgramThickLines.clipPlane1, [0, 0, 1, 1000]);
        const pmvMatrix = mat4.create();
        const tempMVMatrix = mat4.create();
        mat4.set(tempMVMatrix,
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -50.0, 1.0,
        )
        let pMatrix = mat4.create();
        mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
        mat4.multiply(pmvMatrix, pMatrix, tempMVMatrix); // Lines
        this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);
        this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 0.04);

        if (typeof (this.hitchometerPositionBuffer) === "undefined") {
            this.hitchometerPositionBuffer = this.gl.createBuffer();
            this.hitchometerColourBuffer = this.gl.createBuffer();
            this.hitchometerIndexBuffer = this.gl.createBuffer();
            this.hitchometerNormalBuffer = this.gl.createBuffer();
        }

        let size = 1.0;

        const screenZ = vec3.create()
        vec3.set(screenZ,0,0,1)

        this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, screenZ);

        const hitchometerColours = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
        const hitchometerVertices = [
            -22.9, -11.4, 0.0,
            -12.7, -11.4, 0.0,
            -22.9, -21.6, 0.0,
            -12.7, -21.6, 0.0,
            -22.9, -11.4, 0.0,
            -22.9, -21.6, 0.0,
            -12.7, -11.4, 0.0,
            -12.7, -21.6, 0.0,

        ];

        for(let i=0; i<this.mspfArray.length;i++){
            let mspf = this.mspfArray[i];
            if(mspf>200.0) mspf = 200.0;

            const l = mspf / 200.0 * 10.0;
            const x = -22.8 + i/20.;
            const y1 = -21.5;
            const y2 = -21.5 + l;
            const z = 0.0;
            hitchometerVertices.push(x,y1,z,x,y2,z);
            if(mspf<17){
                hitchometerColours.push(0.2, 0.8, 0.2, 1.0);
                hitchometerColours.push(0.2, 0.8, 0.2, 1.0);
            } else if(mspf<24) {
                hitchometerColours.push(0.7, 0.7, 0.3, 1.0);
                hitchometerColours.push(0.7, 0.7, 0.3, 1.0);
            } else if(mspf<50) {
                hitchometerColours.push(0.8, 0.4, 0.3, 1.0);
                hitchometerColours.push(0.8, 0.4, 0.3, 1.0);
            } else {
                hitchometerColours.push(0.8, 0.2, 0.2, 1.0);
                hitchometerColours.push(0.8, 0.2, 0.2, 1.0);
            }
        }

        const thickLines = this.linesToThickLines(hitchometerVertices, hitchometerColours, size);
        let hitchometerNormals = thickLines["normals"];
        let hitchometerVertices_new = thickLines["vertices"];
        let hitchometerColours_new = thickLines["colours"];
        let hitchometerIndexs_new = thickLines["indices"];

        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hitchometerNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hitchometerNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hitchometerPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hitchometerVertices_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.hitchometerColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(hitchometerColours_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.hitchometerIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(hitchometerIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, hitchometerIndexs_new.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(hitchometerIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, hitchometerIndexs_new.length, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.depthFunc(this.gl.LESS)
    }

    drawAxes(invMat) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
        this.gl.depthFunc(this.gl.ALWAYS);
        this.gl.useProgram(this.shaderProgramTextBackground);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        let axesOffset = vec3.create();
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
        //if(this.renderToTexture) ratio = 1.0;
        vec3.set(axesOffset, 20*ratio, 18, 0);
        vec3.transformMat4(axesOffset, axesOffset, invMat);
        let right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        let up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);
        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])
        //console.log("offset",xoff,yoff,zoff);
        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);

        let pmvMatrix = mat4.create();
        let pMatrix = mat4.create();
        if(this.renderToTexture){
            if(this.gl.viewportWidth > this.gl.viewportHeight){
                mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
            } else {
                mat4.ortho(pMatrix, -24, 24, -24, 24, 0.1, 1000.0);
            }
        } else {
            mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
        }
        mat4.scale(pMatrix, pMatrix, [1. / this.zoom, 1. / this.zoom, 1.0]);
        mat4.multiply(pmvMatrix, pMatrix, this.mvMatrix);

        this.gl.uniformMatrix4fv(this.shaderProgramThickLines.pMatrixUniform, false, pmvMatrix);

        this.gl.uniform3fv(this.shaderProgramThickLines.screenZ, this.screenZ);
        this.gl.uniform1f(this.shaderProgramThickLines.pixelZoom, 0.04 * this.zoom);

        if (typeof (this.axesPositionBuffer) === "undefined") {
            this.axesPositionBuffer = this.gl.createBuffer();
            this.axesColourBuffer = this.gl.createBuffer();
            this.axesIndexBuffer = this.gl.createBuffer();
            this.axesNormalBuffer = this.gl.createBuffer();
            this.axesTextNormalBuffer = this.gl.createBuffer();
            this.axesTextColourBuffer = this.gl.createBuffer();
            this.axesTextPositionBuffer = this.gl.createBuffer();
            this.axesTextTexCoordBuffer = this.gl.createBuffer();
            this.axesTextIndexesBuffer = this.gl.createBuffer();
        }
        const renderArrays = {
            axesVertices: [],
            axesColours: [],
            axesIdx: []
        }
        const addSegment = (renderArrays, point1, point2, colour1, colour2) => {
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point1)
            renderArrays.axesIdx.push(renderArrays.axesVertices.length)
            renderArrays.axesVertices = renderArrays.axesVertices.concat(point2)
            renderArrays.axesColours = renderArrays.axesColours.concat([...colour1, ...colour2])
        }

        // Actual axes
        let xyz1 = [0.0, 0.0, 0.0];
        let xyz2 = [this.zoom * 3.0, 0., 0.];

        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [1., 0., 0., 1.],
            [1., 0., 0., 1.],
        )

        xyz1 = [0.0, 0.0, 0.0];
        xyz2 = [0.0, this.zoom * 3.0, 0.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [0., 1., 0., 1.],
            [0., 1., 0., 1.],
        )

        xyz1 = [0.0, 0.0, 0.0];
        xyz2 = [0.0, 0.0, this.zoom * 3.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [0., 0., 1., 1.],
            [0., 0., 1., 1.],
        )

        //Arrow heads
        xyz1 = [2.0 * this.zoom, 0.5 * this.zoom, 0.0]
        xyz2 = [this.zoom * 3.0, 0.0, 0.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [1., 0., 0., 1.],
            [1., 0., 0., 1.],
        )

        xyz1 = [2.0 * this.zoom, -0.5 * this.zoom, 0.0]
        xyz2 = [this.zoom * 3.0, 0.0, 0.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [1., 0., 0., 1.],
            [1., 0., 0., 1.],
        )

        xyz1 = [0.0, 2.0 * this.zoom, 0.5 * this.zoom]
        xyz2 = [0.0, this.zoom * 3.0, 0.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [0., 1., 0., 1.],
            [0., 1., 0., 1.],
        )

        xyz1 = [0.0, 2.0 * this.zoom, -0.5 * this.zoom]
        xyz2 = [0.0, this.zoom * 3.0, 0.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [0., 1., 0., 1.],
            [0., 1., 0., 1.],
        )

        xyz1 = [0.5 * this.zoom, 0.0, 2.0 * this.zoom]
        xyz2 = [0.0, 0.0, this.zoom * 3.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [0., 0., 1., 1.],
            [0., 0., 1., 1.],
        )

        xyz1 = [-0.5 * this.zoom, 0.0, 2.0 * this.zoom]
        xyz2 = [0.0, 0.0, this.zoom * 3.0]
        addSegment(renderArrays,
            xyz1.map((coord, iCoord) => coord + xyzOff[iCoord]),
            xyz2.map((coord, iCoord) => coord + xyzOff[iCoord]),
            [0., 0., 1., 1.],
            [0., 0., 1., 1.],
        )
        //console.log("axesVertices",axesVertices);
        //console.log("zoom",this.zoom);

        let size = 1.5;
        let thickLines = this.linesToThickLines(renderArrays.axesVertices, renderArrays.axesColours, size);
        let axesNormals = thickLines["normals"];
        let axesVertices_new = thickLines["vertices"];
        let axesColours_new = thickLines["colours"];
        let axesIndexs_new = thickLines["indices"];

        //console.log("thickLines",thickLines);
        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<7; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesNormals), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesPositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesVertices_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesColours_new), this.gl.DYNAMIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.axesIndexBuffer);
        if (this.ext) {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(axesIndexs_new), this.gl.DYNAMIC_DRAW);
            this.gl.drawElements(this.gl.TRIANGLES, axesIndexs_new.length, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.useProgram(this.shaderProgramTextBackground);

        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.setMatrixUniforms(this.shaderProgramTextBackground);
        this.gl.uniformMatrix4fv(this.shaderProgramTextBackground.pMatrixUniform, false, pMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1]), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextTexCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

        let textColour = "black";
        const y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            textColour = "white";
        }

        const drawStringAt = (string, colour, location, up, right) => {
            const [base_x, base_y, base_z] = location
            this.makeTextCanvas(string, 512, 32, colour);
            const tSizeX = 2.0 * this.textCtx.canvas.width / this.textCtx.canvas.height * this.zoom;
            const tSizeY = 2.0 * this.zoom;
            const data = this.textCtx.getImageData(0, 0, 512, 32);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
            let textPositions = [base_x, base_y, base_z, base_x + tSizeX * right[0], base_y + tSizeX * right[1], base_z + tSizeX * right[2], base_x + tSizeY * up[0] + tSizeX * right[0], base_y + tSizeY * up[1] + tSizeX * right[1], base_z + tSizeY * up[2] + tSizeX * right[2]];
            textPositions = textPositions.concat([base_x, base_y, base_z, base_x + tSizeY * up[0] + tSizeX * right[0], base_y + tSizeY * up[1] + tSizeX * right[1], base_z + tSizeY * up[2] + tSizeX * right[2], base_x + tSizeY * up[0], base_y + tSizeY * up[1], base_z + tSizeY * up[2]]);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextPositionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textPositions), this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.axesTextIndexesBuffer);
            if (this.ext) {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array([0, 1, 2, 3, 4, 5]), this.gl.STATIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 3, 4, 5]), this.gl.STATIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        let base_x = xyzOff[0] + 3.0 * this.zoom;
        let base_y = xyzOff[1];
        let base_z = xyzOff[2];
        drawStringAt("x", textColour, [base_x, base_y, base_z], up, right)
        base_x = xyzOff[0];
        base_y = xyzOff[1] + 3.0 * this.zoom;
        base_z = xyzOff[2];
        drawStringAt("y", textColour, [base_x, base_y, base_z], up, right)
        base_x = xyzOff[0];
        base_y = xyzOff[1];
        base_z = xyzOff[2] + 3.0 * this.zoom;
        drawStringAt("z", textColour, [base_x, base_y, base_z], up, right)

        this.gl.disableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.gl.depthFunc(this.gl.LESS)

    }

    drawTextOverlays(invMat) {
        this.gl.depthFunc(this.gl.ALWAYS);
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
        if(this.renderToTexture) ratio = 1.0;
        let right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        let up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);
        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);

        if (typeof (this.axesPositionBuffer) === "undefined") {
            this.axesPositionBuffer = this.gl.createBuffer();
            this.axesColourBuffer = this.gl.createBuffer();
            this.axesIndexBuffer = this.gl.createBuffer();
            this.axesNormalBuffer = this.gl.createBuffer();
            this.axesTextNormalBuffer = this.gl.createBuffer();
            this.axesTextColourBuffer = this.gl.createBuffer();
            this.axesTextPositionBuffer = this.gl.createBuffer();
            this.axesTextTexCoordBuffer = this.gl.createBuffer();
            this.axesTextIndexesBuffer = this.gl.createBuffer();
        }
        this.gl.depthFunc(this.gl.ALWAYS);

        this.gl.useProgram(this.shaderProgramTextBackground);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        this.setMatrixUniforms(this.shaderProgramTextBackground);
        this.gl.uniformMatrix4fv(this.shaderProgramTextBackground.pMatrixUniform, false, this.pmvMatrix);
        this.gl.uniform3fv(this.shaderProgramTextBackground.screenZ, this.screenZ);
        this.gl.uniform1f(this.shaderProgramTextBackground.pixelZoom, 0.04 * this.zoom);

        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexColourAttribute);

        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.setMatrixUniforms(this.shaderProgramTextBackground);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexNormalAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextColourBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1]), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexColourAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextTexCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0, 1, 1.0, 1, 1.0, 0, 0, 1, 1.0, 0, 0, 0]), this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

        let textColour = "black";
        const y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            textColour = "white";
        }

        const drawStringAt = (string, colour, location, up, right, font) => {
            const [base_x, base_y, base_z] = location
//FIXME - Be cleverer, return bigger texture if need be and do not create this.textCtx.canvas as a side effect. Return it!
            const [maxS,ctx] = this.makeTextCanvas(string, 512, 32, colour, font);
            const tSizeX = this.textHeightScaling/this.gl.viewportHeight * ctx.canvas.height/32 * 2.0 * ctx.canvas.width / ctx.canvas.height * this.zoom;
            const tSizeY = this.textHeightScaling/this.gl.viewportHeight * ctx.canvas.height/32 * 2.0 * this.zoom;
            const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
            let textPositions = [base_x, base_y, base_z, base_x + tSizeX * right[0], base_y + tSizeX * right[1], base_z + tSizeX * right[2], base_x + tSizeY * up[0] + tSizeX * right[0], base_y + tSizeY * up[1] + tSizeX * right[1], base_z + tSizeY * up[2] + tSizeX * right[2]];
            textPositions = textPositions.concat([base_x, base_y, base_z, base_x + tSizeY * up[0] + tSizeX * right[0], base_y + tSizeY * up[1] + tSizeX * right[1], base_z + tSizeY * up[2] + tSizeX * right[2], base_x + tSizeY * up[0], base_y + tSizeY * up[1], base_z + tSizeY * up[2]]);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesTextPositionBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textPositions), this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(this.shaderProgramTextBackground.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.axesTextIndexesBuffer);
            if (this.ext) {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array([0, 1, 2, 3, 4, 5]), this.gl.STATIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 3, 4, 5]), this.gl.STATIC_DRAW);
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }
        }


        const drawString = (s, xpos, ypos, zpos, font, threeD) => {
            if(font) this.textCtx.font = font;
            let axesOffset = vec3.create();
            vec3.set(axesOffset, xpos,ypos, 0);
            vec3.transformMat4(axesOffset, axesOffset, invMat);

            const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord]);
            let base_x = xyzOff[0];
            let base_y = xyzOff[1];
            let base_z = xyzOff[2];

            if(threeD){
                base_x = xpos;
                base_y = ypos;
                base_z = zpos;
            }

            const textMetric = this.textCtx.measureText(s);
            if(textMetric.width >=512){
                const drawMultiStringAt = (s, colour, up, right, xpos, ypos, zpos, font, threeD) => {
                    let axesOffset2 = vec3.create();
                    vec3.set(axesOffset2, xpos, ypos, 0);
                    vec3.transformMat4(axesOffset2, axesOffset2, invMat);
                    let xyzOff2 = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset2[iCoord]);
                    let base_x = xyzOff2[0];
                    let base_y = xyzOff2[1];
                    let base_z = xyzOff2[2];
                    if(threeD){
                        base_x = xpos;
                        base_y = ypos;
                        base_z = zpos;
                    }
                    const textMetric = this.textCtx.measureText(s);
                    if(textMetric.width <512){
                        drawStringAt(s, colour, [base_x, base_y, base_z], up, right, font)
                            return;
                    }
                    for(let ichomp=0;ichomp<s.length;ichomp++){
                        const s2 = s.substr(0,ichomp);
                        let textMetricSub = this.textCtx.measureText(s2);
                        if(textMetricSub.width >512){
                            textMetricSub = this.textCtx.measureText(s2.substr(0,s2.length-1));
                            drawStringAt(s2, colour, [base_x, base_y, base_z], up, right, font);
                            //FIXME Why a 1.5 fudge factor ... ?
                            xpos += this.textHeightScaling/this.gl.viewportHeight * 512 / 24. *1.5 ;//textMetricSub.width /24. *1.5;
                            const snew = s.substr(ichomp);
                            drawMultiStringAt(snew, colour, up, right, xpos, ypos, zpos, font, threeD);
                            break;
                        }
                    }
                }
                drawMultiStringAt(s, textColour, up, right, xpos, ypos, zpos, font, threeD);
            } else {
                drawStringAt(s, textColour, [base_x, base_y, base_z], up, right, font)
            }
        }

        this.textLegends.forEach(label => {
                let xpos = label.x * 48.0 -24.*ratio;
                let ypos = label.y * 48.0 -24.;
                drawString(label.text,xpos,ypos, 0.0, label.font, false);
        });
        if(this.showFPS) drawString(this.fpsText, -23.5*ratio, -23.5, 0.0, "20px helvetica", false);
        if(this.showShortCutHelp) {
            const fontSize = this.gl.viewportHeight * 0.02
            const font = `${fontSize > 20 ? 20 : fontSize}px helvetica`
            this.showShortCutHelp.forEach((shortcut, index) => {
                const xpos = -23.5 * ratio
                const ypos = -21.5 + index
                drawString(shortcut, xpos, ypos, 0.0, font, false)
            });
        }
        //Draw Hbond, etc. text.
        this.newTextLabels.forEach(tlabel => {
            tlabel.forEach(label => {
                drawString(label.text, label.x,label.y,label.z, "30px helvetica", true);
            })
        })

        this.gl.disableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.gl.depthFunc(this.gl.LESS)
    }

    doMouseUp(event, self) {
        const event_x = event.pageX;
        const event_y = event.pageY;
        self.init_y = event.pageY;
        this.currentlyDraggedAtom = null
        if (self.keysDown['center_atom'] || event.which===2) {
            if(Math.abs(event_x-self.mouseDown_x)<5 && Math.abs(event_y-self.mouseDown_y)<5){
                if(self.displayBuffers.length>0){
                    const [minidx,minj,mindist] = self.getAtomFomMouseXY(event,self);
                    if(self.displayBuffers[minidx] && self.displayBuffers[minidx].atoms) {
                        let atx = self.displayBuffers[minidx].atoms[minj].x;
                        let aty = self.displayBuffers[minidx].atoms[minj].y;
                        let atz = self.displayBuffers[minidx].atoms[minj].z;
                        self.setOriginAnimated([-atx, -aty, -atz], true);
                    }
                }
            } else if (this.reContourMapOnlyOnMouseUp) {
                const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
                document.dispatchEvent(originUpdateEvent);
            }
        } else if (event.altKey && event.shiftKey && this.reContourMapOnlyOnMouseUp) {
            const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
            document.dispatchEvent(originUpdateEvent);
        }
        self.mouseDown = false;
        self.doHover(event,self);
    }

    drawSceneDirty() {
        this.doRedraw = true;
    }

    drawSceneIfDirty() {
        const activeMoleculeMotion = (this.activeMolecule != null) && (this.activeMolecule.representations.length > 0) ;
        if (this.activeMolecule) {
            if (this.activeMolecule.representations) {
                const dispObjs: moorhen.DisplayObject[][] = this.activeMolecule.representations.filter(item => item.style !== 'transformation').map(item => item.buffers)
                for (const value of dispObjs) {
                    for (let ibuf = 0; ibuf < value.length; ibuf++) {
                        if(!value[ibuf].transformMatrixInteractive){
                           value[ibuf].transformMatrixInteractive = [
                           1.0, 0.0, 0.0, 0.0,
                           0.0, 1.0, 0.0, 0.0,
                           0.0, 0.0, 1.0, 0.0,
                           0.0, 0.0, 0.0, 1.0,
                           ];
                        }
                        if(!value[ibuf].transformOriginInteractive){
                           value[ibuf].transformOriginInteractive = [0.0,0.0,0.0];
                        }
                    }
                }
            }
        }
        if (this.doRedraw||activeMoleculeMotion) {
            this.doRedraw = false;
            this.drawScene();
        }
    }

    reContourMaps() : void {
    }

    doMiddleClick(evt, self) {
        const goToAtomEvent = new CustomEvent("goToAtomMiddleClick");
        document.dispatchEvent(goToAtomEvent);
    }

    doDoubleClick(event, self) {
        const frontAndBack = self.getFrontAndBackPos(event);
        const goToBlobEvent = new CustomEvent("goToBlobDoubleClick", {
            "detail": {
                back: [frontAndBack[0][0], frontAndBack[0][1], frontAndBack[0][2]],
                front: [frontAndBack[1][0], frontAndBack[1][1], frontAndBack[1][2]],
                windowX: frontAndBack[2],
                windowY: frontAndBack[3],
                key: 'G'
            }
        });
        document.dispatchEvent(goToBlobEvent);
    }

    setDraggableMolecule(molecule: moorhen.Molecule): void {
        this.draggableMolecule = molecule
    }

    mouseMoveAnimateTrack(force,count){
        if(count===0||(this.cancelMouseTrack&&!force)){
            return;
        }
        this.drawScene()
        this.cancelMouseTrack = false;
        requestAnimationFrame(this.mouseMoveAnimateTrack.bind(this,false,count-1));
    }

    calculate3DVectorFrom2DVector(inp) {
        const [dx,dy] = inp;
        const theVector = vec3.create();
        vec3.set(theVector, dx, dy, 0.0);
        const invQuat = quat4.create();
        quat4Inverse(this.myQuat, invQuat);
        const invMat = quatToMat4(invQuat);
        vec3.transformMat4(theVector, theVector, invMat);
        vec3.scale(theVector, theVector, this.zoom*getDeviceScale() * 48. / this.canvas.height);
        return theVector;
    }

    doMouseMove(event, self) {;
        const activeMoleculeMotion = (this.activeMolecule != null) && (this.activeMolecule.representations.length > 0) && !self.keysDown['residue_camera_wiggle'];

        const centreOfMass = function (atoms) {
            let totX = 0.0;
            let totY = 0.0;
            let totZ = 0.0;
            if (atoms.length > 0) {
                for (let iat = 0; iat < atoms.length; iat++) {
                    totX += atoms[iat].x;
                    totY += atoms[iat].y;
                    totZ += atoms[iat].z;
                }
                totX /= atoms.length;
                totY /= atoms.length;
                totZ /= atoms.length;
            }
            return [totX, totY, totZ];
        }

        self.mouseMoved = true;

        self.cancelMouseTrack = true;
        if(this.trackMouse)
            requestAnimationFrame(self.mouseMoveAnimateTrack.bind(self,true,20))

        if (true) {
            let x;
            let y;
            let e = event;
            if (e.pageX || e.pageY) {
                x = e.pageX;
                y = e.pageY;
            }
            else {
                x = e.clientX;
                y = e.clientY;
            }

            let c = this.canvasRef.current;
            let offset = getOffsetRect(c);

            x -= offset.left;
            y -= offset.top;

            this.gl_cursorPos[0] = x;
            this.gl_cursorPos[1] = this.canvas.height - y;
            self.drawSceneDirty();
        }
        if (!self.mouseDown) {
            self.init_x = event.pageX;
            self.init_y = event.pageY;
            self.doHover(event, self);
            return;
        }
        self.dx = (event.pageX - self.init_x) * self.props.mouseSensitivityFactor;
        self.dy = (event.pageY - self.init_y) * self.props.mouseSensitivityFactor;
        self.init_x = event.pageX;
        self.init_y = event.pageY;

        let moveFactor = getDeviceScale() * 400. / this.canvas.height * self.moveFactor / self.props.mouseSensitivityFactor;

        if ((event.altKey && event.shiftKey) || (self.mouseDownButton === 1)) {
            let invQuat = quat4.create();
            quat4Inverse(self.myQuat, invQuat);
            let theMatrix = quatToMat4(invQuat);
            let xshift = vec3.create();
            vec3.set(xshift, moveFactor * self.dx, 0, 0);
            let yshift = vec3.create();
            vec3.set(yshift, 0, moveFactor * self.dy, 0);
            vec3.transformMat4(xshift, xshift, theMatrix);
            vec3.transformMat4(yshift, yshift, theMatrix);

            if (!activeMoleculeMotion) {
                const newOrigin = self.origin.map((coord, coordIndex) => {
                    return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
                })
                self.setOrigin(newOrigin, false, !this.reContourMapOnlyOnMouseUp)
            } else {
                const newOrigin = this.activeMolecule.displayObjectsTransformation.origin.map((coord, coordIndex) => {
                    return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
                })
                const newOriginSet : [number,number,number] = [ newOrigin[0], newOrigin[1], newOrigin[2]];
                this.activeMolecule.displayObjectsTransformation.origin = newOriginSet;
                if (!this.activeMolecule.displayObjectsTransformation.quat) {
                    this.activeMolecule.displayObjectsTransformation.quat = quat4.create();
                    quat4.set(this.activeMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
                }
                const theMatrix = quatToMat4(this.activeMolecule.displayObjectsTransformation.quat);
                theMatrix[12] = this.activeMolecule.displayObjectsTransformation.origin[0];
                theMatrix[13] = this.activeMolecule.displayObjectsTransformation.origin[1];
                theMatrix[14] = this.activeMolecule.displayObjectsTransformation.origin[2];
                for (const representation of this.activeMolecule.representations) {
                    const value = representation.buffers
                    for (let ibuf = 0; ibuf < value.length; ibuf++) {
                        value[ibuf].transformMatrixInteractive = theMatrix;
                    }
                }
            }
            self.drawSceneDirty();
            return;
        }

        if (event.altKey) {
            let factor = 1. - self.dy / 50.;
            let newZoom = self.zoom * factor;
            if (newZoom < .01) {
                newZoom = 0.01;
            }
            self.setZoom(newZoom)
            self.drawSceneDirty();
            return;
        }

        if (event.shiftKey) {

            const c = this.canvasRef.current;
            const offset = getOffsetRect(c);
            const frac_x = 2.0*(getDeviceScale()*(event.pageX-offset.left)/this.gl.viewportWidth-0.5);
            const frac_y = -2.0*(getDeviceScale()*(event.pageY-offset.top)/this.gl.viewportHeight-0.5);
            const zQ = createZQuatFromDX(frac_x*self.dy+frac_y*self.dx);
            quat4.multiply(self.myQuat, self.myQuat, zQ);

        } else if (event.buttons === 1) {
            //console.log("mouse move",self.dx,self.dy);
            let xQ = createXQuatFromDX(-self.dy);
            let yQ = createYQuatFromDY(-self.dx);
            //console.log(xQ);
            //console.log(yQ);
            quat4.multiply(xQ, xQ, yQ);
            if (this.currentlyDraggedAtom) {

                // ###############
                // FILO: COPY PASTED FROM ABOVE
                let invQuat = quat4.create();
                quat4Inverse(self.myQuat, invQuat);
                let theMatrix = quatToMat4(invQuat);
                let xshift = vec3.create();
                vec3.set(xshift, moveFactor * self.dx, 0, 0);
                let yshift = vec3.create();
                vec3.set(yshift, 0, moveFactor * self.dy, 0);
                vec3.transformMat4(xshift, xshift, theMatrix);
                vec3.transformMat4(yshift, yshift, theMatrix);

                const newOrigin = this.draggableMolecule.displayObjectsTransformation.origin.map((coord, coordIndex) => {
                    return coord + (self.zoom * xshift[coordIndex] / 8.) - (self.zoom * yshift[coordIndex] / 8.)
                })
                const newOriginSet : [number,number,number] = [ newOrigin[0], newOrigin[1], newOrigin[2]];
                this.draggableMolecule.displayObjectsTransformation.origin = newOriginSet;
                if (!this.draggableMolecule.displayObjectsTransformation.quat) {
                    this.draggableMolecule.displayObjectsTransformation.quat = quat4.create();
                    quat4.set(this.draggableMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
                }
                theMatrix = quatToMat4(this.draggableMolecule.displayObjectsTransformation.quat);
                theMatrix[12] = this.draggableMolecule.displayObjectsTransformation.origin[0];
                theMatrix[13] = this.draggableMolecule.displayObjectsTransformation.origin[1];
                theMatrix[14] = this.draggableMolecule.displayObjectsTransformation.origin[2];

                // ###############

                const draggedAtomEvent = new CustomEvent("atomDragged", { detail: {atom: this.currentlyDraggedAtom} });
                document.dispatchEvent(draggedAtomEvent);
                return

            } else if (!activeMoleculeMotion) {
                quat4.multiply(self.myQuat, self.myQuat, xQ);
            } else {
                // ###############
                //TODO - Move all this somewhere else ...

                let invQuat = quat4.create();
                quat4Inverse(this.myQuat, invQuat);
                const invMat = quatToMat4(invQuat);
                let x_rot = vec3.create();
                let y_rot = vec3.create();
                vec3.set(x_rot, 1.0, 0.0, 0.0);
                vec3.set(y_rot, 0.0, 1.0, 0.0);
                vec3.transformMat4(x_rot, x_rot, invMat);
                vec3.transformMat4(y_rot, y_rot, invMat);

                let xQp = createQuatFromDXAngle(-self.dy, x_rot);
                let yQp = createQuatFromDXAngle(-self.dx, y_rot);
                quat4.multiply(xQp, xQp, yQp);

                if (!this.activeMolecule.displayObjectsTransformation.quat) {
                    this.activeMolecule.displayObjectsTransformation.quat = quat4.create();
                    quat4.set(this.activeMolecule.displayObjectsTransformation.quat, 0, 0, 0, -1);
                }
                quat4.multiply(this.activeMolecule.displayObjectsTransformation.quat, this.activeMolecule.displayObjectsTransformation.quat, xQp);
                const theMatrix = quatToMat4(this.activeMolecule.displayObjectsTransformation.quat);
                theMatrix[12] = this.activeMolecule.displayObjectsTransformation.origin[0];
                theMatrix[13] = this.activeMolecule.displayObjectsTransformation.origin[1];
                theMatrix[14] = this.activeMolecule.displayObjectsTransformation.origin[2];
                //Just consider one origin.
                let diff = [0, 0, 0];

                
                const dispObjs: moorhen.DisplayObject[][]  = this.activeMolecule.representations.filter(item => item.style !== 'transformation').map(item => item.buffers)
                for (const value of dispObjs) {
                    if (value.length > 0) {
                        const com = centreOfMass(value[0].atoms);
                        const diff : [number,number,number] = [com[0] + this.origin[0], com[1] + this.origin[1], com[2] + this.origin[2]];
                        this.activeMolecule.displayObjectsTransformation.centre = diff;
                        break;
                    }
                }
                for (const value of dispObjs) {
                    for (let ibuf = 0; ibuf < value.length; ibuf++) {
                        value[ibuf].transformMatrixInteractive = theMatrix;
                        value[ibuf].transformOriginInteractive = diff;
                    }
                }
                // ###############
            }
        }

        self.drawSceneDirty();
    }

    doMouseDown(event, self) {
        self.init_x = event.pageX;
        self.init_y = event.pageY;
        self.mouseDown_x = event.pageX;
        self.mouseDown_y = event.pageY;
        self.mouseDown = true;
        self.mouseDownButton = event.button;
        self.mouseMoved = false;
    }

    handleKeyUp(event, self) {
        for (const key of Object.keys(self.props.keyboardAccelerators)) {
            if (event.key && self.props.keyboardAccelerators[key].keyPress === event.key.toLowerCase() && self.props.keyboardAccelerators[key]) {
                self.keysDown[key] = false;
            }
        }
    }

    handleKeyDown(event, self) {
        for (const key of Object.keys(self.props.keyboardAccelerators)) {
            if (event.key && self.props.keyboardAccelerators[key].keyPress === event.key.toLowerCase() && self.props.keyboardAccelerators[key].modifiers.every(modifier => event[modifier])) {
                self.keysDown[key] = true;
            }
        }

        /**
         * No longer necessary but leaving it here in case we want to handle something
         * not taken care of upstairs
        */

        let doContinue = true
        if (this.props.onKeyPress) {
            doContinue = this.props.onKeyPress(event) as boolean
        }

        if (!doContinue) return
    }

    makeCircleCanvas(text, width, height, circleColour) {
        this.circleCanvasInitialized = false;
        if (!this.circleCanvasInitialized) {
            this.circleCtx.canvas.width = width;
            this.circleCtx.canvas.height = height;
            this.circleCtx.font = "80px helvetica";
            this.circleCtx.textAlign = "left";
            this.circleCtx.textBaseline = "middle";
            this.circleCanvasInitialized = true;
        }
        this.circleCtx.fillStyle = "red";
        this.circleCtx.clearRect(0, 0, this.circleCtx.canvas.width, this.circleCtx.canvas.height);
        this.circleCtx.fillRect(0, 0, this.circleCtx.canvas.width, this.circleCtx.canvas.height);
        this.circleCtx.fillStyle = circleColour;
        this.circleCtx.strokeStyle = circleColour;
        this.circleCtx.lineWidth = width / 10;
        this.circleCtx.arc(width / 2, height / 2, width / 2 - width / 20 - 1, 0, 2 * Math.PI);
        this.circleCtx.stroke();
        var tm = this.circleCtx.measureText(text);
        this.circleCtx.fillText(text, width / 2 - tm.width / 2, height / 2 + 30);
    }

    // Puts text in center of canvas.
    makeTextCanvas(text:string, width:number, height:number, textColour:string, font?:string)  : [number,CanvasRenderingContext2D] {
        if(font){
            let theCtx;
            if(this.extraFontCtxs && (font in this.extraFontCtxs)){
                theCtx = this.extraFontCtxs[font];
            } else {
                theCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
            }
            theCtx.canvas.width = width;
            theCtx.canvas.height = height;
            theCtx.textBaseline = "alphabetic";
            theCtx.font = font;
            let textMetric = theCtx.measureText("Mgq!^(){}|'\"~`√∫");
            let actualHeight = textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent;
            let loop = 0;
            while(actualHeight>theCtx.canvas.height&&loop<3){
                theCtx.canvas.height *= 2;
                theCtx.font = font;
                textMetric = theCtx.measureText("M");
                actualHeight = textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent;
                loop += 1;
            }
            theCtx.textAlign = "left";
            theCtx.fillStyle = "#00000000";
            theCtx.fillRect(0, 0, theCtx.canvas.width, theCtx.canvas.height);
            theCtx.fillStyle = textColour;
            theCtx.fillText(text, 0, theCtx.canvas.height / 2,theCtx.canvas.width);
            if(!this.extraFontCtxs)
                this.extraFontCtxs = {};
            this.extraFontCtxs[font] = theCtx;
            textMetric = theCtx.measureText(text);
            return [textMetric.actualBoundingBoxRight / width,theCtx];
        }
        this.textCanvasInitialized = false;
        if (!this.textCanvasInitialized) {
            this.textCtx.canvas.width = width;
            this.textCtx.canvas.height = height;
            this.textCtx.font = "20px helvetica";
            this.textCtx.textAlign = "left";
            this.textCtx.textBaseline = "middle";
            this.textCanvasInitialized = true;
        }
        this.textCtx.fillStyle = "#00000000";
        this.textCtx.fillRect(0, 0, this.textCtx.canvas.width, this.textCtx.canvas.height);
        this.textCtx.fillStyle = textColour;
        this.textCtx.fillText(text, 0, height / 2,this.textCtx.canvas.width);
        const textMetric = this.textCtx.measureText(text);
        //Return the maximum width in fractional box coordinates
        return [textMetric.actualBoundingBoxRight / width,this.textCtx];
    }

    createInstanceOriginsBuffer(tri) {
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer.length - 1].numItems = 0;
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOrigins.push([]);
        for (var j = 0; j < tri.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleInstanceOrigins[this.displayBuffers[this.currentBufferIdx].triangleInstanceOrigins.length - 1].push(parseFloat(tri[j]));
            this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer.length - 1].numItems++;
        }
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceOriginBuffer.length - 1].numItems /= 3;
    }

    createInstanceOrientationsBuffer(tri) {
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer.length - 1].numItems = 0;
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientations.push([]);
        for (var j = 0; j < tri.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientations[this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientations.length - 1].push(parseFloat(tri[j]));
            this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer.length - 1].numItems++;
        }
        this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceOrientationBuffer.length - 1].numItems /= 16;
    }

    createInstanceSizesBuffer(tri) {
        this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer.length - 1].numItems = 0;
        this.displayBuffers[this.currentBufferIdx].triangleInstanceSizes.push([]);
        for (var j = 0; j < tri.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleInstanceSizes[this.displayBuffers[this.currentBufferIdx].triangleInstanceSizes.length - 1].push(parseFloat(tri[j]));
            this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer.length - 1].numItems++;
        }
        this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer[this.displayBuffers[this.currentBufferIdx].triangleInstanceSizeBuffer.length - 1].numItems /= 3;
    }

    createVertexBuffer(tri) {
        this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer.length - 1].numItems = 0;
        this.displayBuffers[this.currentBufferIdx].triangleVertices.push([]);
        for (var j = 0; j < tri.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleVertices[this.displayBuffers[this.currentBufferIdx].triangleVertices.length - 1].push(parseFloat(tri[j]));
            this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer.length - 1].numItems++;
        }
        this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexPositionBuffer.length - 1].numItems /= 3;
    }

    createRealNormalBuffer(norm) { //Where "Real" is open to intepretation ...
        this.displayBuffers[this.currentBufferIdx].triangleVertexRealNormalBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleVertexRealNormalBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexRealNormalBuffer.length - 1].numItems = 0;
    }

    createNormalBuffer(norm) {
        this.displayBuffers[this.currentBufferIdx].triangleNormals.push([]);
        this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer.length - 1].numItems = 0;
        for (var j = 0; j < norm.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleNormals[this.displayBuffers[this.currentBufferIdx].triangleNormals.length - 1].push(parseFloat(norm[j]));
            this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer.length - 1].numItems++;
        }
        this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexNormalBuffer.length - 1].numItems /= 3;
    }

    createColourBuffer(colour) {
        this.displayBuffers[this.currentBufferIdx].triangleColourBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleColourBuffer[this.displayBuffers[this.currentBufferIdx].triangleColourBuffer.length - 1].numItems = 0;
        this.displayBuffers[this.currentBufferIdx].triangleColours.push([]);
        if (Math.abs(parseFloat(colour[3])) < 0.99) {
            //console.log("This is transparent");
            this.displayBuffers[this.currentBufferIdx].transparent = true;
        }
        for (var j = 0; j < colour.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleColours[this.displayBuffers[this.currentBufferIdx].triangleColours.length - 1].push(parseFloat(colour[j]));
            this.displayBuffers[this.currentBufferIdx].triangleColourBuffer[this.displayBuffers[this.currentBufferIdx].triangleColourBuffer.length - 1].numItems++;
        }
        this.displayBuffers[this.currentBufferIdx].triangleColourBuffer[this.displayBuffers[this.currentBufferIdx].triangleColourBuffer.length - 1].numItems /= 4;
    }

    addSupplementaryInfo(info, name) {
        if (typeof (this.displayBuffers[this.currentBufferIdx].supplementary[name]) === "undefined") {
            this.displayBuffers[this.currentBufferIdx].supplementary[name] = [info];
        } else {
            this.displayBuffers[this.currentBufferIdx].supplementary[name].push(info);
        }
    }

    createIndexBuffer(idx) {
        this.displayBuffers[this.currentBufferIdx].triangleVertexIndexBuffer.push(this.gl.createBuffer());
        this.displayBuffers[this.currentBufferIdx].triangleVertexIndexBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexIndexBuffer.length - 1].numItems = 0;
        this.displayBuffers[this.currentBufferIdx].triangleIndexs.push([]);
        for (var j = 0; j < idx.length; j++) {
            this.displayBuffers[this.currentBufferIdx].triangleIndexs[this.displayBuffers[this.currentBufferIdx].triangleIndexs.length - 1].push(parseFloat(idx[j]));
            this.displayBuffers[this.currentBufferIdx].triangleVertexIndexBuffer[this.displayBuffers[this.currentBufferIdx].triangleVertexIndexBuffer.length - 1].numItems++;
        }
    }

    createSizeBuffer(idx) {
        this.displayBuffers[this.currentBufferIdx].primitiveSizes.push([]);
        for (var j = 0; j < idx.length; j++) {
            this.displayBuffers[this.currentBufferIdx].primitiveSizes[this.displayBuffers[this.currentBufferIdx].primitiveSizes.length - 1].push(parseFloat(idx[j]));
        }
    }
}
