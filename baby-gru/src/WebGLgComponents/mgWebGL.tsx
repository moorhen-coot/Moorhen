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
import { depth_peel_accum_vertex_shader_source as depth_peel_accum_vertex_shader_source_webgl2 } from './webgl-2/depth-peel-accum-vertex-shader.js';
import { depth_peel_accum_fragment_shader_source as depth_peel_accum_fragment_shader_source_webgl2 } from './webgl-2/depth-peel-accum-fragment-shader.js';

import { blur_x_simple_fragment_shader_source as blur_x_simple_fragment_shader_source_webgl2 } from './webgl-2/blur_x_simple-fragment-shader.js';
import { blur_y_simple_fragment_shader_source as blur_y_simple_fragment_shader_source_webgl2 } from './webgl-2/blur_y_simple-fragment-shader.js';
import { blur_vertex_shader_source as blur_vertex_shader_source_webgl2 } from './webgl-2/blur-vertex-shader.js';
import { overlay_fragment_shader_source as overlay_fragment_shader_source_webgl2 } from './webgl-2/overlay-fragment-shader.js';
import { ssao_fragment_shader_source as ssao_fragment_shader_source_webgl2 } from './webgl-2/ssao-fragment-shader.js';
import { edge_detect_fragment_shader_source as edge_detect_fragment_shader_source_webgl2 } from './webgl-2/edge-detect-fragment-shader.js';
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
import { fxaa_shader_source as fxaa_shader_source_webgl2 } from './webgl-2/fxaa.js';
import { fxaa_shader_source as fxaa_shader_source_webgl1 } from './webgl-1/fxaa.js';
import { triangle_vertex_shader_source as triangle_vertex_shader_source_webgl2 } from './webgl-2/triangle-vertex-shader.js';
import { twod_fragment_shader_source as twod_fragment_shader_source_webgl2 } from './webgl-2/twodshapes-fragment-shader.js';
import { twod_vertex_shader_source as twod_vertex_shader_source_webgl2 } from './webgl-2/twodshapes-vertex-shader.js';
import { triangle_instanced_vertex_shader_source as triangle_instanced_vertex_shader_source_webgl2 } from './webgl-2/triangle-instanced-vertex-shader.js';
import { triangle_gbuffer_fragment_shader_source as triangle_gbuffer_fragment_shader_source_webgl2 } from './webgl-2/triangle-gbuffer-fragment-shader.js';
import { triangle_gbuffer_vertex_shader_source as triangle_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/triangle-gbuffer-vertex-shader.js';
import { triangle_instanced_gbuffer_vertex_shader_source as triangle_instanced_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/triangle-instanced-gbuffer-vertex-shader.js';
import { twod_gbuffer_vertex_shader_source as twod_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/twodshapes-gbuffer-vertex-shader.js';
import { perfect_sphere_gbuffer_fragment_shader_source as perfect_sphere_gbuffer_fragment_shader_source_webgl2 } from './webgl-2/perfect-sphere-gbuffer-fragment-shader.js';
import { thick_lines_normal_gbuffer_vertex_shader_source as thick_lines_normal_gbuffer_vertex_shader_source_webgl2 } from './webgl-2/thick-lines-normal-gbuffer-vertex-shader.js';

import { triangle_texture_vertex_shader_source as triangle_texture_vertex_shader_source } from './webgl-2/triangle-texture-vertex-shader.js';
import { triangle_texture_fragment_shader_source as triangle_texture_fragment_shader_source } from './webgl-2/triangle-texture-fragment-shader.js';

//WebGL1 shaders
import { depth_peel_accum_vertex_shader_source as depth_peel_accum_vertex_shader_source_webgl1 } from './webgl-1/depth-peel-accum-vertex-shader.js';
import { depth_peel_accum_fragment_shader_source as depth_peel_accum_fragment_shader_source_webgl1 } from './webgl-1/depth-peel-accum-fragment-shader.js';
import { blur_vertex_shader_source as blur_vertex_shader_source_webgl1 } from './webgl-1/blur-vertex-shader.js';
import { overlay_fragment_shader_source as overlay_fragment_shader_source_webgl1 } from './webgl-1/overlay-fragment-shader.js';
import { ssao_fragment_shader_source as ssao_fragment_shader_source_webgl1 } from './webgl-1/ssao-fragment-shader.js';
import { edge_detect_fragment_shader_source as edge_detect_fragment_shader_source_webgl1 } from './webgl-1/edge-detect-fragment-shader.js';
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
import { triangle_gbuffer_fragment_shader_source as triangle_gbuffer_fragment_shader_source_webgl1 } from './webgl-1/triangle-gbuffer-fragment-shader.js';
import { triangle_gbuffer_vertex_shader_source as triangle_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/triangle-gbuffer-vertex-shader.js';
import { triangle_instanced_gbuffer_vertex_shader_source as triangle_instanced_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/triangle-instanced-gbuffer-vertex-shader.js';
import { twod_gbuffer_vertex_shader_source as twod_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/twodshapes-gbuffer-vertex-shader.js';
import { perfect_sphere_gbuffer_fragment_shader_source as perfect_sphere_gbuffer_fragment_shader_source_webgl1 } from './webgl-1/perfect-sphere-gbuffer-fragment-shader.js';
import { thick_lines_normal_gbuffer_vertex_shader_source as thick_lines_normal_gbuffer_vertex_shader_source_webgl1 } from './webgl-1/thick-lines-normal-gbuffer-vertex-shader.js';

import { DistanceBetweenPointAndLine, DihedralAngle, NormalizeVec3, vec3Cross, vec3Add, vec3Subtract, vec3Create  } from './mgMaths.js';
import { determineFontHeight } from './fontHeight.js';

import { parseAtomInfoLabel, guid } from '../utils/utils';

import { quatToMat4, quat4Inverse } from './quatToMat4.js';

import { gemmiAtomPairsToCylindersInfo } from '../utils/utils'

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
        alert("Could not initialise WebGL, sorry... Make sure harware acceleration is enabled in your browser settings.");
    }
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    if(WEBGL2){
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
        console.log("MAX_ELEMENTS_INDICES:",gl.getParameter(gl.MAX_ELEMENTS_INDICES))
        console.log("MAX_ELEMENT_INDEX:",gl.getParameter(gl.MAX_ELEMENT_INDEX))
        console.log("MAX_VERTEX_ATTRIBS:",gl.getParameter(gl.MAX_VERTEX_ATTRIBS))
    }
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
        console.trace()
        console.log(type)
        console.log(str)
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

class TexturedShape {
    width: number;
    height: number;
    x_size: number;
    y_size: number;
    z_position: number;
    image_texture: WebGLTexture;
    color_ramp_texture: WebGLTexture;
    idxBuffer = WebGLBuffer;
    vertexBuffer = WebGLBuffer;
    texCoordBuffer = WebGLBuffer;
    gl: WebGL2RenderingContext;
    constructor(textureInfo,gl,uuid) {
        this.width = textureInfo.width;
        this.height = textureInfo.height;
        this.x_size = textureInfo.x_size;
        this.y_size = textureInfo.y_size;
        this.z_position = textureInfo.z_position;
        this.image_texture = gl.createTexture();
        //TODO - Populate the image texture ...
        gl.bindTexture(gl.TEXTURE_2D, this.image_texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, textureInfo.image_data);
        //TODO - Populate the color ramp texture with a default black to white.
        this.color_ramp_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.color_ramp_texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        const colour_ramp_cp = [
            [0.0, 0.0, 0.0, 1.0],
            [1.0, 1.0, 1.0, 1.0],
        ];
        let ramp_accu = 256;
        let colour_ramp_values = [];
        for(let i=0;i<ramp_accu;i++){
            const frac = i/ramp_accu;
            const frac2 = 1.0-frac;
            const r = frac * colour_ramp_cp[1][0] + frac2 *  colour_ramp_cp[0][0];
            const g = frac * colour_ramp_cp[1][1] + frac2 *  colour_ramp_cp[0][1];
            const b = frac * colour_ramp_cp[1][2] + frac2 *  colour_ramp_cp[0][2];
            const a = frac * colour_ramp_cp[1][3] + frac2 *  colour_ramp_cp[0][3];
            colour_ramp_values.push(r);
            colour_ramp_values.push(g);
            colour_ramp_values.push(b);
            colour_ramp_values.push(a);
        }

        this.gl = gl;
        this.setColourRamp(colour_ramp_values)

        this.idxBuffer = gl.createBuffer();
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        const vertices = new Float32Array([
            0,                      0,this.z_position,
            this.x_size,           0,this.z_position,
            this.x_size,this.y_size,this.z_position,
            0,                      0,this.z_position,
            this.x_size,this.y_size,this.z_position,
            0,           this.y_size,this.z_position,
        ])
        const texCoords = new Float32Array([
            0,0, 1,0, 1,1, 0,0, 1,1, 0,1,
        ])
        const idxs = new Uint32Array([0, 1, 2, 3, 4, 5]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxs, gl.STATIC_DRAW);
    }
    getOrigin() {
        return [-this.x_size/2,-this.y_size/2,-this.z_position];
    }
    setColourRamp(colour_ramp_values,interp=false) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.color_ramp_texture);
        let colour_ramp_values_interp;
        if(interp){
            colour_ramp_values_interp = [];
            const nsteps = 256/(colour_ramp_values.length-1);
            for(let icol=0;icol<colour_ramp_values.length-1;icol++){
                for(let istep=0;istep<nsteps;istep++){
                    const frac = istep/nsteps
                        const frac2 = 1.0 - frac
                        const r = frac*colour_ramp_values[icol+1][0] + frac2*colour_ramp_values[icol][0]
                        const g = frac*colour_ramp_values[icol+1][1] + frac2*colour_ramp_values[icol][1]
                        const b = frac*colour_ramp_values[icol+1][2] + frac2*colour_ramp_values[icol][2]
                        const a = frac*colour_ramp_values[icol+1][3] + frac2*colour_ramp_values[icol][3]
                        const col = [r,g,b,a]
                        colour_ramp_values_interp.push(...col)
                }
            }
        } else {
            colour_ramp_values_interp = colour_ramp_values.flat();
        }
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, colour_ramp_values_interp.length/4, 1, 0, this.gl.RGBA, this.gl.FLOAT, new Float32Array(colour_ramp_values_interp));
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }
}

class TextCanvasTexture {
    gl: WebGL2RenderingContext;
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

    draw() {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.bigTextTex);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

        this.gl.enableVertexAttribArray(this.glRef.shaderProgramTextInstanced.vertexTextureAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextTexCoordBuffer);
        this.gl.vertexAttribPointer(this.glRef.shaderProgramTextInstanced.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.glRef.shaderProgramTextInstanced.vertexPositionAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextPositionBuffer);
        this.gl.vertexAttribPointer(this.glRef.shaderProgramTextInstanced.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.glRef.shaderProgramTextInstanced.offsetAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceOriginBuffer);
        this.gl.vertexAttribPointer(this.glRef.shaderProgramTextInstanced.offsetAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.glRef.shaderProgramTextInstanced.sizeAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTextInstanceSizeBuffer);
        this.gl.vertexAttribPointer(this.glRef.shaderProgramTextInstanced.sizeAttribute, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.glRef.shaderProgramTextInstanced.textureOffsetAttribute);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.bigTextureTexOffsetsBuffer);
        this.gl.vertexAttribPointer(this.glRef.shaderProgramTextInstanced.textureOffsetAttribute, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.bigTextureTextIndexesBuffer);

        this.gl.uniform1f(this.glRef.shaderProgramTextInstanced.pixelZoom,this.glRef.zoom*this.contextBig.canvas.height/this.glRef.canvas.height);

        if (this.glRef.WEBGL2) {
            this.gl.vertexAttribDivisor(this.glRef.shaderProgramTextInstanced.sizeAttribute, 1);
            this.gl.vertexAttribDivisor(this.glRef.shaderProgramTextInstanced.offsetAttribute, 1);
            this.gl.vertexAttribDivisor(this.glRef.shaderProgramTextInstanced.textureOffsetAttribute, 1);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0, this.nBigTextures);
            this.gl.vertexAttribDivisor(this.glRef.shaderProgramTextInstanced.sizeAttribute, 0);
            this.gl.vertexAttribDivisor(this.glRef.shaderProgramTextInstanced.offsetAttribute, 0);
            this.gl.vertexAttribDivisor(this.glRef.shaderProgramTextInstanced.textureOffsetAttribute, 0);
        }
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

    removeBigTextureTextImages(textObjects,uuid=null) {
        textObjects.forEach(label => {
            this.removeBigTextureTextImage(label,uuid)
        })
        this.recreateBigTextureBuffers();
    }

    removeBigTextureTextImage(textObject,uuid=null) {
        let key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font
        if(uuid) key += "-"+uuid;
        if(key in this.refI) {
            this.bigTextureTexOrigins[this.refI[key]] = [];
            this.bigTextureTexOffsets[this.refI[key]] = [];
            this.bigTextureScalings[this.refI[key]] = [];
            delete this.refI[key];
            this.nBigTextures -= 1;
        }
    }

    addBigTextureTextImage(textObject,uuid=null) {
        let key = textObject.text+"_"+textObject.x+"_"+textObject.y+"_"+textObject.z+"_"+textObject.font
        if(uuid) key += "-"+uuid;

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
    atoms: {chain_id: string, has_altloc: boolean, mol_name: string, serial: number, res_no:string, res_name:string, name: string, charge: number, tempFactor: number, x: number, y: number, z: number, element: string}[];
    symmetryAtoms: {chain_id: string, has_altloc: boolean, mol_name: string, serial: number, res_no:string, res_name:string, name: string, charge: number, tempFactor: number, pos: vec3, element: string}[][];
    symmetryMatrices: number[];
    changeColourWithSymmetry: boolean;
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
    customColour: [number,number,number,number] | null;
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
    isHoverBuffer: boolean;
    id: string;
    multiViewGroup: number;

    constructor() {
        this.visible = true;
        this.name_label = "";
        this.display_class = "NONE";
        this.transparent = false;
        this.alphaChanged = false;
        this.atoms = [];
        this.symmetryMatrices = [];
        this.clearBuffers();
        this.symmetryAtoms = []
        this.changeColourWithSymmetry = true;
        this.isHoverBuffer = false;
        this.id = "";
    }

    setCustomColour(col) {
        this.customColour = col;
        if(col[3]<0.99)
            this.transparent = true
        else
            this.transparent = false
    }

    updateSymmetryAtoms() {
        this.symmetryAtoms = []
        this.symmetryMatrices.forEach(mat =>{
                let symt = mat4.create();
                mat4.set(symt,
                        mat[0], mat[1], mat[2], mat[3],
                        mat[4], mat[5], mat[6], mat[7],
                        mat[8], mat[9], mat[10], mat[11],
                        mat[12], mat[13], mat[14], mat[15]);
                let theseSymmAtoms = []
                for (let j = 0; j < this.atoms.length; j++) {
                    let atx = this.atoms[j].x;
                    let aty = this.atoms[j].y;
                    let atz = this.atoms[j].z;
                    let p = vec3Create([atx, aty, atz]);
                    let atPosTrans = vec3Create([0, 0, 0]);
                    vec3.transformMat4(atPosTrans, p, symt);
                    let symmAt = {
                        charge: this.atoms[j].charge,
                        tempFactor: this.atoms[j].tempFactor,
                        element: this.atoms[j].element,
                        name:this.atoms[j].name,
                        res_name:this.atoms[j].res_name,
                        res_no:this.atoms[j].res_no,
                        mol_name:this.atoms[j].mol_name,
                        serial:this.atoms[j].serial,
                        has_altloc:this.atoms[j].has_altloc,
                        chain_id:this.atoms[j].chain_id,
                        pos: atPosTrans
                    }
                    theseSymmAtoms.push(symmAt)
                }
                this.symmetryAtoms.push(theseSymmAtoms)
        })
    }

    clearBuffers() {
        this.triangleVertexRealNormalBuffer = []; // This is for lit lines.
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
        this.customColour = null;
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

function createQuatFromAngle(angle_in,axis) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, Math.sin(angle / 2.0)*axis[0], Math.sin(angle / 2.0)*axis[1], Math.sin(angle / 2.0)*axis[2], Math.cos(angle / 2.0));
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

interface MGWebGLShaderDepthPeelAccum extends WebGLProgram {
    vertexPositionAttribute: GLint;
    vertexTextureAttribute: GLint;
    pMatrixUniform: WebGLUniformLocation;
    peelNumber: WebGLUniformLocation;
    depthPeelSamplers: WebGLUniformLocation;
    colorPeelSamplers: WebGLUniformLocation;
    xSSAOScaling: WebGLUniformLocation;
    ySSAOScaling: WebGLUniformLocation;
}

interface MGWebGLTextureQuadShader extends WebGLProgram {
    vertexPositionAttribute: GLint;
    vertexTextureAttribute: GLint;
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
    valueMap: WebGLUniformLocation;
    colorMap: WebGLUniformLocation;
}

interface MGWebGLShader extends WebGLProgram {
    vertexPositionAttribute: GLint;
    vertexNormalAttribute: GLint;
    vertexColourAttribute: GLint;
    vertexTextureAttribute: GLint;
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
    peelNumber: WebGLUniformLocation;
    depthPeelSamplers: WebGLUniformLocation;
}

interface ShaderThickLines extends MGWebGLShader {
    screenZ: WebGLUniformLocation;
    offset: WebGLUniformLocation;
    size: WebGLUniformLocation;
    scaleMatrix: WebGLUniformLocation;
    ShadowMap: WebGLUniformLocation;
    SSAOMap: WebGLUniformLocation;
    edgeDetectMap: WebGLUniformLocation;
    doShadows: WebGLUniformLocation;
    doSSAO: WebGLUniformLocation;
    doEdgeDetect: WebGLUniformLocation;
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
    xSSAOScaling: WebGLUniformLocation; //Perhaps in parent? Perhaps more of parent here?
    ySSAOScaling: WebGLUniformLocation; // ditto
    occludeDiffuse: WebGLUniformLocation;
    doPerspective: WebGLUniformLocation;
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
    blurDepth: WebGLUniformLocation;
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
    xSSAOScaling: WebGLUniformLocation;
    ySSAOScaling: WebGLUniformLocation;
    ShadowMap: WebGLUniformLocation;
    SSAOMap: WebGLUniformLocation;
    edgeDetectMap: WebGLUniformLocation;
    outlineSize: WebGLUniformLocation;
    shadowQuality: WebGLUniformLocation;
    doShadows: WebGLUniformLocation;
    doSSAO: WebGLUniformLocation;
    doEdgeDetect: WebGLUniformLocation;
    occludeDiffuse: WebGLUniformLocation;
    doPerspective: WebGLUniformLocation;
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
    SSAOMap: WebGLUniformLocation;
    edgeDetectMap: WebGLUniformLocation;
    shadowQuality: WebGLUniformLocation;
    doShadows: WebGLUniformLocation;
    doSSAO: WebGLUniformLocation;
    doEdgeDetect: WebGLUniformLocation;
    cursorPos: WebGLUniformLocation;
    xPixelOffset: WebGLUniformLocation;
    yPixelOffset: WebGLUniformLocation;
    xSSAOScaling: WebGLUniformLocation;
    ySSAOScaling: WebGLUniformLocation;
    occludeDiffuse: WebGLUniformLocation;
    doPerspective: WebGLUniformLocation;
    textureMatrixUniform: WebGLUniformLocation;
    screenZ: WebGLUniformLocation;
}

interface ShaderGBuffersTriangles extends MGWebGLShader {
}

interface ShaderGBuffersThickLinesNormal extends ShaderThickLinesNormal {
}

interface ShaderBlurX extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
    depthTexture: WebGLUniformLocation;
    blurSize: WebGLUniformLocation;
    blurDepth: WebGLUniformLocation;
    blurCoeffs: WebGLUniformLocation | null;
}

interface ShaderSimpleBlurX extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
    blurSize: WebGLUniformLocation;
    blurCoeffs: WebGLUniformLocation | null;
}

interface ShaderSSAO extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    gPositionTexture: WebGLUniformLocation;
    gNormalTexture: WebGLUniformLocation;
    texNoiseTexture: WebGLUniformLocation;
    zoom: WebGLUniformLocation | null;
    depthBufferSize: WebGLUniformLocation | null;
    samples: WebGLUniformLocation | null;
    radius: WebGLUniformLocation | null;
    bias: WebGLUniformLocation | null;
    depthFactor: WebGLUniformLocation | null;
}

interface ShaderEdgeDetect extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    gPositionTexture: WebGLUniformLocation;
    gNormalTexture: WebGLUniformLocation;
    depthBufferSize: WebGLUniformLocation | null;
    depthThreshold: WebGLUniformLocation | null;
    normalThreshold: WebGLUniformLocation | null;
    scaleDepth: WebGLUniformLocation | null;
    scaleNormal: WebGLUniformLocation | null;
    xPixelOffset: WebGLUniformLocation | null;
    yPixelOffset: WebGLUniformLocation | null;
    depthFactor: WebGLUniformLocation | null;
    zoom: WebGLUniformLocation | null;
}

interface ShaderBlurY extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
    depthTexture: WebGLUniformLocation;
    blurSize: WebGLUniformLocation;
    blurDepth: WebGLUniformLocation;
    blurCoeffs: WebGLUniformLocation | null;
}

interface ShaderSimpleBlurY extends MGWebGLShader {
    vertexTextureAttribute: GLint;
    inputTexture: WebGLUniformLocation;
    blurSize: WebGLUniformLocation;
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

interface ShaderGBuffersPerfectSpheres extends ShaderPerfectSpheres {
}

interface ShaderGBuffersTrianglesInstanced extends ShaderGBuffersTriangles {
    vertexInstanceOriginAttribute: GLint;
    vertexInstanceSizeAttribute : GLint;
    vertexInstanceOrientationAttribute  : GLint;
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
                    reContourMapOnlyOnMouseUp: boolean | null;
                    onAtomHovered : (identifier: { buffer: { id: string; }; atom: moorhen.AtomInfo; }) => void;
                    onKeyPress : (event: KeyboardEvent) =>  boolean | Promise<boolean>;
                    messageChanged : ((d:Dictionary<string>) => void);
                    mouseSensitivityFactor :  number | null;
                    zoomWheelSensitivityFactor :  number | null;
                    keyboardAccelerators : Dictionary<string>;
                    showCrosshairs : boolean | null;
                    showScaleBar : boolean | null;
                    showAxes : boolean | null;
                    showFPS : boolean | null;
                    mapLineWidth : number;
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
        drawEnvBOcc: boolean;
        environmentRadius: number;
        environmentAtoms: clickAtom[][];
        labelledAtoms: clickAtom[][];
        measuredAtoms: clickAtom[][];
        pixel_data: Uint8Array;
        screenshotBuffersReady: boolean;
        edgeDetectFramebufferSize : number;
        gBuffersFramebufferSize : number;
        save_pixel_data: boolean;
        renderToTexture: boolean;
        transparentScreenshotBackground: boolean;
        doDepthPeelPass: boolean;
        showShortCutHelp: string[];
        WEBGL2: boolean;
        doRedraw: boolean;
        circleCanvasInitialized: boolean;
        textCanvasInitialized: boolean;
        currentlyDraggedAtom: null | {atom: moorhen.AtomInfo; buffer: DisplayBuffer};
        gl_cursorPos: Float32Array;
        textCtx: CanvasRenderingContext2D;
        circleCtx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;
        rttFramebuffer: MGWebGLFrameBuffer;
        doPerspectiveProjection: boolean;
        labelsTextCanvasTexture: TextCanvasTexture;
        texturedShapes: any[];
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
        simpleBlurXTexture: WebGLTexture;
        simpleBlurYTexture: WebGLTexture;
        calculatingShadowMap: boolean;
        cancelMouseTrack: boolean;
        circleTex: WebGLTexture;
        clipChangedEvent: Event;
        context2d: CanvasRenderingContext2D;
        diskBuffer: DisplayBuffer;
        diskVertices: number[];
        doShadow: boolean;
        doSSAO: boolean;
        doEdgeDetect: boolean;
        depthThreshold: number;
        normalThreshold: number;
        scaleDepth: number;
        scaleNormal: number;
        xPixelOffset: number;
        yPixelOffset: number;
        occludeDiffuse: boolean;
        doOrderIndependentTransparency: boolean;
        doPeel: boolean;
        doShadowDepthDebug: boolean;
        doSpin: boolean;
        doStenciling: boolean;
        doMultiView: boolean;
        multiViewRowsColumns: number[];
        specifyMultiViewRowsColumns: boolean;
        threeWayViewOrder: string;
        doThreeWayView: boolean;
        doSideBySideStereo: boolean;
        doCrossEyedStereo: boolean;
        doAnaglyphStereo: boolean;
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
        measureText2DCanvasTexture: TextCanvasTexture;
        mouseDown: boolean;
        measurePointsArray: any[];
        measureHit: any;
        measureButton: number;
        measureDownPos: any;
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
        pointsArray: number[];
        mvInvMatrix: Float32Array;
        mvMatrix: Float32Array;
        nAnimationFrames: number;
        nFrames: number;
        nPrevFrames: number;
        offScreenDepthTexture: WebGLTexture;
        offScreenFramebuffer: MGWebGLFrameBuffer;
        depthPeelFramebuffers: MGWebGLFrameBuffer[];
        depthPeelColorTextures: WebGLTexture[];
        depthPeelDepthTextures: WebGLTexture[];
        ssaoFramebuffer: MGWebGLFrameBuffer;
        edgeDetectFramebuffer: MGWebGLFrameBuffer;
        gFramebuffer: MGWebGLFrameBuffer;
        gBufferRenderbufferNormal: WebGLRenderbuffer;
        gBufferRenderbufferPosition: WebGLRenderbuffer;
        gBufferPositionTexture: WebGLTexture;
        gBufferDepthTexture: WebGLTexture;
        gBufferNormalTexture: WebGLTexture;
        ssaoTexture: WebGLTexture;
        edgeDetectTexture: WebGLTexture;
        ssaoRadius: number;
        ssaoBias: number;
        offScreenFramebufferBlurX: MGWebGLFrameBuffer;
        offScreenFramebufferBlurY: MGWebGLFrameBuffer;
        offScreenFramebufferSimpleBlurX: MGWebGLFrameBuffer;
        offScreenFramebufferSimpleBlurY: MGWebGLFrameBuffer;
        offScreenFramebufferColor: MGWebGLFrameBuffer;
        offScreenReady: boolean;
        offScreenRenderbufferColor: WebGLRenderbuffer;
        offScreenRenderbufferDepth: WebGLRenderbuffer;
        depthPeelRenderbufferColor: WebGLRenderbuffer[];
        depthPeelRenderbufferDepth: WebGLRenderbuffer[];
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
        rttDepthTexture: WebGLTexture;
        rttTextureDepth: WebGLTexture;
        screenZ: number;
        shaderProgramTextured: MGWebGLTextureQuadShader;
        shaderProgramDepthPeelAccum: MGWebGLShaderDepthPeelAccum;
        shaderProgram: ShaderTriangles;
        shaderProgramGBuffers: ShaderGBuffersTriangles;
        shaderProgramGBuffersInstanced: ShaderGBuffersTrianglesInstanced;
        shaderProgramGBuffersPerfectSpheres: ShaderGBuffersPerfectSpheres;
        shaderProgramGBuffersThickLinesNormal: ShaderGBuffersThickLinesNormal;
        shaderProgramSSAO: ShaderSSAO;
        shaderProgramEdgeDetect: ShaderEdgeDetect;
        shaderProgramBlurX: ShaderBlurX;
        shaderProgramBlurY: ShaderBlurY;
        shaderProgramSimpleBlurX: ShaderSimpleBlurX;
        shaderProgramSimpleBlurY: ShaderSimpleBlurY;
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
        showScaleBar: boolean;
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
        ssaoNoiseTexture: WebGLTexture;
        blurUBOBuffer: WebGLBuffer;
        ssaoKernelBuffer: WebGLBuffer;
        ssaoKernel: number[];
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
        drawBuffersExt: any;
        instanced_ext: any;
        ext: any;
        newTextLabels: any;
        drawingGBuffers: boolean;
        axesTexture: any;
        max_elements_indices: number;
        hoverSize: number;
        currentViewport: number[];
        currentAnaglyphColor: number[];
        threeWayViewports: number[][];
        stereoViewports: number[][];
        threeWayQuats: quat4[];
        stereoQuats: quat4[];
        multiWayViewports: number[][];
        multiViewOrigins: number[][];
        multiWayQuats: quat4[];
        multiWayRatio: number;
        currentMultiViewGroup: number;

    setupStereoTransformations() : void {

        this.stereoViewports = []
        this.stereoQuats = []
        this.stereoViewports.push([0, 0, this.gl.viewportWidth/2, this.gl.viewportHeight])
        this.stereoViewports.push([this.gl.viewportWidth/2, 0, this.gl.viewportWidth/2, this.gl.viewportHeight])
        const yaxis = vec3.create();
        vec3.set(yaxis, 0.0, -1.0, 0.0)

        const angle = 3./180.*Math.PI;

        const dval3_p = Math.cos(angle / 2.0);
        const dval0_y_p = yaxis[0] * Math.sin(angle / 2.0);
        const dval1_y_p = yaxis[1] * Math.sin(angle / 2.0);
        const dval2_y_p = yaxis[2] * Math.sin(angle / 2.0);

        const dval3_m = Math.cos(-angle / 2.0);
        const dval0_y_m = yaxis[0] * Math.sin(-angle / 2.0);
        const dval1_y_m = yaxis[1] * Math.sin(-angle / 2.0);
        const dval2_y_m = yaxis[2] * Math.sin(-angle / 2.0);

        const rotY_p = quat4.create();
        const rotY_m = quat4.create();

        quat4.set(rotY_p, dval0_y_p, dval1_y_p, dval2_y_p, dval3_p);
        quat4.set(rotY_m, dval0_y_m, dval1_y_m, dval2_y_m, dval3_m);

        this.stereoQuats.push(rotY_p)
        this.stereoQuats.push(rotY_m)

    }

    setupMultiWayTransformations(nmols:number) : void {

        const get_grid = (n,method="NEARSQUARE") => {
            const f = Math.floor(Math.sqrt(n))
            const c = Math.ceil(Math.sqrt(n))

            if(method==="NEARSQUARE"){
                if(f*c >= n)
                    return [f,c]
                else
                    return [c,c]
            }

            let shapes = []

            for(let i=1;i<=n;i++){
                for(let j=1;j<=n;j++){
                    if(i*j >= n && i*j <= c*c && Math.abs(i-j)<=f){
                        if(i*j - n < n){
                            let rem = i*j - n
                            if(rem != i && rem != j){
                                shapes.push([i,j,rem])
                                break
                            }
                        }
                    }
                }
            }

            if(shapes.length===0){
                if(f*c >= n)
                    return [f,c]
                else
                    return [c,c]
            }

            let the_shape = shapes[0]
            let minrem = n+1

            shapes.forEach( (s) => {
                if(s[2] < minrem){
                    the_shape = s
                    minrem = s[2]
                } else if(s[2] == minrem && Math.abs(s[0]-s[1]) < Math.abs(the_shape[0]-the_shape[1])){
                    the_shape = s
                }
            })

            return [the_shape[0],the_shape[1]]
        }

        let wh : number[] = get_grid(nmols)
        if(this.specifyMultiViewRowsColumns){
           wh = this.multiViewRowsColumns
        }

        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
        this.multiWayViewports = []
        this.multiWayQuats = []

        const rotZ = quat4.create();
        quat4.set(rotZ, 0, 0, 0, -1);

        for(let i=0;i<wh[1];i++){
            for(let j=0;j<wh[0];j++){
                const frac_i = i/wh[1]
                const frac_j = j/wh[0]
                this.multiWayViewports.push([frac_i*this.gl.viewportWidth,frac_j*this.gl.viewportHeight, this.gl.viewportWidth/wh[1], this.gl.viewportHeight/wh[0]])
                this.multiWayQuats.push(rotZ)
            }
        }
        this.multiWayRatio = wh[0]/wh[1]
        this.currentMultiViewGroup = 0

    }

    setupThreeWayTransformations() : void {

        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
        this.threeWayViewports = []
        this.threeWayQuats = []

        const BL = [0, 0, this.gl.viewportWidth/2, this.gl.viewportHeight/2]
        const BR = [this.gl.viewportWidth/2, 0, this.gl.viewportWidth/2, this.gl.viewportHeight/2]
        const TR = [this.gl.viewportWidth/2, this.gl.viewportHeight/2,this.gl.viewportWidth/2, this.gl.viewportHeight/2]
        const TL = [0, this.gl.viewportHeight/2,this.gl.viewportWidth/2, this.gl.viewportHeight/2]

        if(this.threeWayViewOrder&&this.threeWayViewOrder.length===4){
            if(this.threeWayViewOrder.indexOf(" ")===0){
                this.threeWayViewports.push(BL)
                this.threeWayViewports.push(BR)
                this.threeWayViewports.push(TR)
            } else if(this.threeWayViewOrder.indexOf(" ")===1){
                this.threeWayViewports.push(BL)
                this.threeWayViewports.push(BR)
                this.threeWayViewports.push(TL)
            } else if(this.threeWayViewOrder.indexOf(" ")===2){
                this.threeWayViewports.push(BR)
                this.threeWayViewports.push(TL)
                this.threeWayViewports.push(TR)
            } else if(this.threeWayViewOrder.indexOf(" ")===3){
                this.threeWayViewports.push(BL)
                this.threeWayViewports.push(TL)
                this.threeWayViewports.push(TR)
            }
        } else {
            this.threeWayViewports.push(BL)
            this.threeWayViewports.push(TL)
            this.threeWayViewports.push(TR)
        }

        const xaxis = vec3.create();
        vec3.set(xaxis, 1.0, 0.0, 0.0)
        const yaxis = vec3.create();
        vec3.set(yaxis, 0.0, -1.0, 0.0)

        const zaxis = vec3.create();
        vec3.set(zaxis, 0.0, 0.0, 1.0)

        const angle = -Math.PI/2.;

        const dval3 = Math.cos(angle / 2.0);

        const dval0_x = xaxis[0] * Math.sin(angle / 2.0);
        const dval1_x = xaxis[1] * Math.sin(angle / 2.0);
        const dval2_x = xaxis[2] * Math.sin(angle / 2.0);

        const dval0_y = yaxis[0] * Math.sin(angle / 2.0);
        const dval1_y = yaxis[1] * Math.sin(angle / 2.0);
        const dval2_y = yaxis[2] * Math.sin(angle / 2.0);

        const dval0_z_p = zaxis[0] * Math.sin(angle / 2.0);
        const dval1_z_p = zaxis[1] * Math.sin(angle / 2.0);
        const dval2_z_p = zaxis[2] * Math.sin(angle / 2.0);
        const dval3_z_p = Math.cos(angle / 2.0);

        const dval0_z_m = zaxis[0] * Math.sin(-angle / 2.0);
        const dval1_z_m = zaxis[1] * Math.sin(-angle / 2.0);
        const dval2_z_m = zaxis[2] * Math.sin(-angle / 2.0);
        const dval3_z_m = Math.cos(-angle / 2.0);

        const yForward = quat4.create();
        const xForward = quat4.create();
        const zForward = quat4.create();
        const zPlus = quat4.create();
        const zMinus = quat4.create();

        quat4.set(zForward, 0, 0, 0, -1);
        quat4.set(yForward, dval0_x, dval1_x, dval2_x, dval3);
        quat4.set(xForward, dval0_y, dval1_y, dval2_y, dval3);

        quat4.set(zPlus, dval0_z_p, dval1_z_p, dval2_z_p, dval3_z_p);
        quat4.set(zMinus, dval0_z_m, dval1_z_m, dval2_z_m, dval3_z_p);

        quat4.multiply(xForward, xForward, zMinus);
        quat4.multiply(yForward, yForward, zPlus);

        if(this.threeWayViewOrder&&this.threeWayViewOrder.length===4){

            const top = this.threeWayViewOrder.substring(0,2)
            const bottom = this.threeWayViewOrder.substring(2,4)

            for(let c of bottom.trim()) {
                if(c==="X")
                    this.threeWayQuats.push(xForward)
                if(c==="Y")
                    this.threeWayQuats.push(yForward)
                if(c==="Z")
                    this.threeWayQuats.push(zForward)
            }
            for(let c of top.trim()) {
                if(c==="X")
                    this.threeWayQuats.push(xForward)
                if(c==="Y")
                    this.threeWayQuats.push(yForward)
                if(c==="Z")
                    this.threeWayQuats.push(zForward)
            }
        } else {
            this.threeWayQuats.push(yForward)
            this.threeWayQuats.push(zForward)
            this.threeWayQuats.push(xForward)
        }

    }

    resize(width: number, height: number) : void {

        let theWidth = width;
        let theHeight = height; //Keep it square for now

        this.canvas.style.width = Math.floor(theWidth) + "px";
        this.canvas.style.height = Math.floor(theHeight) + "px";
        this.canvas.width = Math.floor(getDeviceScale() * Math.floor(theWidth));
        this.canvas.height = Math.floor(getDeviceScale() * Math.floor(theHeight));

        this.gl.viewportWidth = this.canvas.width;
        this.gl.viewportHeight = this.canvas.height;

        this.setupThreeWayTransformations()
        this.setupStereoTransformations()
        this.multiWayViewports = []

        if(this.useOffScreenBuffers&&this.WEBGL2){
            this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
        }
        if(this.edgeDetectFramebuffer){
            this.gl.deleteFramebuffer(this.edgeDetectFramebuffer);
            this.edgeDetectFramebuffer = null;

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
        this.pointsArray = [];
        this.mouseTrackPoints = [];
        this.hoverSize = 0.27;
        this.depthPeelFramebuffers = [];
        this.depthPeelColorTextures = [];
        this.depthPeelDepthTextures = [];
        this.depthPeelRenderbufferDepth = [];
        this.depthPeelRenderbufferColor = [];
        this.currentViewport = [0,0, 400,400];
        this.currentAnaglyphColor = [1.0,0.0,0.0,1.0]

        setInterval(() => {
            if(!self.gl) return;
            const sum = this.mspfArray.reduce((a, b) => a + b, 0);
            const avg = (sum / this.mspfArray.length) || 0;
            const fps = 1.0/avg * 1000;
            self.fpsText = avg.toFixed(2)+" ms/frame (" + (fps).toFixed(0)+" fps) ["+this.canvas.width+" x "+this.canvas.height+"]";
            }, 1000);

        //Set to false to use WebGL 1
        this.WEBGL2 = false;
        this.state = { width: this.props.width, height: this.props.height };
        this.canvasRef = React.createRef();
        this.keysDown = {};
        this.atomLabelDepthMode = false;
        this.showScaleBar = false
        this.showCrosshairs = false
        this.trackMouse = false
        this.showAxes = false;
        this.reContourMapOnlyOnMouseUp = true;
        this.mapLineWidth = 1.0

        if (this.props.reContourMapOnlyOnMouseUp !== null) {
            this.reContourMapOnlyOnMouseUp = this.props.reContourMapOnlyOnMouseUp
        }
        if (this.props.showAxes !== null) {
            this.showAxes = this.props.showAxes
        }
        if (this.props.showScaleBar !== null) {
            this.showScaleBar = this.props.showScaleBar
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
    }

    setSSAORadius(radius) {
        this.ssaoRadius = radius;
    }

    setSSAOBias(bias) {
        this.ssaoBias = bias;
    }

    setBlurSize(blurSize) {
        this.blurSize = blurSize;

        if(this.WEBGL2){
            const blockSize = this.gl.getActiveUniformBlockParameter( this.shaderProgramBlurX, this.shaderProgramBlurX.blurCoeffs, this.gl.UNIFORM_BLOCK_DATA_SIZE);
            //console.log("blur blockSize",blockSize);

            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
            this.gl.bufferData(this.gl.UNIFORM_BUFFER, blockSize, this.gl.DYNAMIC_DRAW);//????
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
            this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.blurUBOBuffer);
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

            this.gl.useProgram(this.shaderProgramSimpleBlurY);
            let index = this.gl.getUniformBlockIndex(this.shaderProgramSimpleBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSimpleBlurY, index, 0);

            this.gl.useProgram(this.shaderProgramSimpleBlurX);
            index = this.gl.getUniformBlockIndex(this.shaderProgramSimpleBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSimpleBlurX, index, 0);

            this.gl.useProgram(this.shaderProgramBlurY);
            index = this.gl.getUniformBlockIndex(this.shaderProgramBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurY, index, 0);

            this.gl.useProgram(this.shaderProgramBlurX);
            index = this.gl.getUniformBlockIndex(this.shaderProgramBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramBlurX, index, 0);

            // This might have to be done every frame if we ever have multiple UBOs.
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
            let bigBlurArray = new Array(36).fill(0);
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

    setDrawEnvBOcc(drawEnvBOcc) {
        this.drawEnvBOcc = drawEnvBOcc;
        if(!drawEnvBOcc){
            this.environmentAtoms = []
            this.updateLabels()
        }
    }

    setSpinTestState(doSpin) {
        this.doSpin = doSpin;
        if(this.doSpin){
            this.startSpinTest();
        } else {
            this.stopSpinTest();
        }
    }

    setDoTransparentScreenshotBackground(transparentScreenshotBackground) {
        this.transparentScreenshotBackground = transparentScreenshotBackground;
    }

    setDoAnaglyphStereo(doAnaglyphStereo) {
        this.doAnaglyphStereo = doAnaglyphStereo;
    }

    setDoCrossEyedStereo(doCrossEyedStereo) {
        this.doCrossEyedStereo = doCrossEyedStereo;
    }

    setDoSideBySideStereo(doSideBySideStereo) {
        this.doSideBySideStereo = doSideBySideStereo;
    }

    setDoMultiView(doMultiView) {
        this.doMultiView = doMultiView;
    }

    setThreeWayViewOrder(threeWayViewOrder: string){
        this.threeWayViewOrder = threeWayViewOrder
    }

    setSpecifyMultiViewRowsColumns(specifyMultiViewRowsColumns: boolean){
        this.specifyMultiViewRowsColumns = specifyMultiViewRowsColumns
        this.multiWayViewports = []
    }

    setMultiViewRowsColumns(multiViewRowsColumns: number[]){
        this.multiViewRowsColumns = multiViewRowsColumns
        this.multiWayViewports = []
    }

    setDoThreeWayView(doThreeWayView) {
        this.doThreeWayView = doThreeWayView;
    }

    setDoOrderIndependentTransparency(doOrderIndependentTransparency) {
        this.doOrderIndependentTransparency = doOrderIndependentTransparency;
    }

    setOutlinesOn(doOutline) {
        this.doStenciling = doOutline;
    }

    setShadowsOn(doShadow) {
        this.doShadow = doShadow;
    }

    setSSAOOn(doSSAO) {
        this.doSSAO = doSSAO;
    }

    setEdgeDetectDepthThreshold(depthThreshold) {
        this.depthThreshold = depthThreshold;
    }

    setEdgeDetectNormalThreshold(normalThreshold) {
        this.normalThreshold = normalThreshold;
    }

    setEdgeDetectDepthScale(depthScale) {
        this.scaleDepth = depthScale;
    }

    setEdgeDetectNormalScale(normalScale) {
        this.scaleNormal = normalScale;
    }

    setEdgeDetectOn(doEdgeDetect) {
        this.doEdgeDetect = doEdgeDetect;
    }

    setOccludeDiffuse(doOccludeDiffuse) {
        this.occludeDiffuse = doOccludeDiffuse;
    }

    setShadowDepthDebug(doShadowDebug) {
    }

    componentDidUpdate(oldProps) {
        if (oldProps.width !== this.props.width || oldProps.height !== this.props.height) {
            this.resize(this.props.width, this.props.height)
        }
        if (oldProps.showScaleBar !== this.props.showScaleBar){
            this.showScaleBar = this.props.showScaleBar
            this.drawScene()
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
        if (oldProps.reContourMapOnlyOnMouseUp !== this.props.reContourMapOnlyOnMouseUp) {
            this.reContourMapOnlyOnMouseUp = this.props.reContourMapOnlyOnMouseUp
        }
    }

    lerp(a, b, f) {
        return a + f * (b - a);
    }

    initializeSSAOBuffers() {
        this.ssaoKernel = [];
        for (let i = 0; i < 16; ++i) {

            let sample = vec3Create([Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random()]);

            NormalizeVec3(sample);
            vec3.scale(sample,sample,Math.random());
            let scale = i / 16.0;

            // scale samples s.t. they're more aligned to center of kernel
            scale = this.lerp(0.1, 1.0, scale * scale);
            vec3.scale(sample,sample,scale);
            this.ssaoKernel.push(sample[0]);
            this.ssaoKernel.push(sample[1]);
            this.ssaoKernel.push(sample[2]);
            this.ssaoKernel.push(1.0);
        }
        //console.log(this.ssaoKernel);
        //console.log(this.ssaoKernel.length);

        let ssaoNoise = [];
        for (let i = 0; i < 16; i++) {
            ssaoNoise.push(Math.random() * 2.0 - 1.0);
            ssaoNoise.push(Math.random() * 2.0 - 1.0);
            ssaoNoise.push(0.0);
        }
        //console.log(ssaoNoise);

        this.ssaoNoiseTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoNoiseTexture);
        console.log("Do texImage2D for noise");
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB32F, 4, 4, 0, this.gl.RGB, this.gl.FLOAT, new Float32Array(ssaoNoise));
        console.log("Done texImage2D for noise");
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);

        this.gl.useProgram(this.shaderProgramSSAO);
        this.ssaoKernelBuffer = this.gl.createBuffer();
        this.bindSSAOBuffers()
    }

    bindSSAOBuffers() {
        const blockSize = this.gl.getActiveUniformBlockParameter( this.shaderProgramSSAO, this.shaderProgramSSAO.samples, this.gl.UNIFORM_BLOCK_DATA_SIZE);
        //console.log("############################################################");
        //console.log("ssao blockSize",blockSize);
        //console.log(this.gl.getParameter(this.gl.MAX_UNIFORM_BUFFER_BINDINGS))
        //console.log(this.gl.getParameter(this.gl.MAX_UNIFORM_BLOCK_SIZE))
        //console.log("############################################################");
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ssaoKernelBuffer);
        this.gl.bufferData(this.gl.UNIFORM_BUFFER, blockSize, this.gl.DYNAMIC_DRAW);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.ssaoKernelBuffer);
        const uboVariableNames = [
        "samples"
        ];
        const uboVariableIndices = this.gl.getUniformIndices( this.shaderProgramSSAO, uboVariableNames);
        const uboVariableOffsets = this.gl.getActiveUniforms( this.shaderProgramSSAO, uboVariableIndices, this.gl.UNIFORM_OFFSET);

        const uboVariableInfo = {};

        uboVariableNames.forEach((name, index) => {
            uboVariableInfo[name] = {
                index: uboVariableIndices[index],
                offset: uboVariableOffsets[index],
            };
        });

        this.gl.useProgram(this.shaderProgramSSAO);
        let index = this.gl.getUniformBlockIndex(this.shaderProgramSSAO, "sampleBuffer");
        this.gl.uniformBlockBinding(this.shaderProgramSSAO, index, 0);

        const bigFloatArray = new Float32Array(this.ssaoKernel);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ssaoKernelBuffer);
        this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.ssaoKernelBuffer);
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, uboVariableInfo["samples"].offset,  bigFloatArray.subarray( 0, 64), 0);
        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

    }

    componentDidMount() {
        this.canvas = this.canvasRef.current;
        const self = this;
        this.activeMolecule = null;
        this.draggableMolecule = null;
        this.currentlyDraggedAtom = null;
        this.fogClipOffset = 250;
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
        this.measurePointsArray = [];
        this.measureHit = null;
        this.measureButton = -1;
        this.measureDownPos = {x:-1,y:-1};
        this.mouseMoved = null;
        this.zoom = null;
        this.ext = null;
        this.drawBuffersExt = null;
        this.instanced_ext = null;
        this.frag_depth_ext = null;
        this.gl_fog_start = null;
        this.gl_fog_end = null;
        this.gl_nClipPlanes = null;
        this.shaderProgram = null;
        this.shaderProgramGBuffers = null;
        this.shaderProgramGBuffersInstanced = null;
        this.shaderProgramGBuffersPerfectSpheres = null;
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
        this.doDepthPeelPass = false;

        this.transparentScreenshotBackground = false;

        this.doStenciling = false;

        this.doShadow = false;
        this.doSSAO = false;
        this.doEdgeDetect = false;
        this.occludeDiffuse = false;

        /*
            Suitable(?) Edge detect settings:
            Ribbons, Gaussian, VdW, Rama balls, Dodos, glycoblocks, H-Bonds:
               Depth scale:         2
               Normal scale:        1
               Depth threshold:   1.4
               Normal threshoold: 0.5
            Bonds:
               Depth scale:         2
               Normal scale:        0
               Depth threshold:   1.0
               Normal threshoold: N/A
            Spheres:
               Depth scale:         2
               Normal scale:        2 (or 0 depending on desired effect)
               Depth threshold:   1.4
               Normal threshoold: 0.5
        */
        this.depthThreshold = 1.4;
        this.normalThreshold = 0.5;
        this.scaleDepth = 2.0;
        this.scaleNormal = 1.0;
        this.xPixelOffset = 1.0 / 1024.0;
        this.yPixelOffset = 1.0 / 1024.0;

        this.doSpin = false;

        this.doThreeWayView = false;
        this.doSideBySideStereo = false;
        this.doMultiView = false;
        this.doCrossEyedStereo = false;
        this.doAnaglyphStereo = false;

        this.specifyMultiViewRowsColumns = false;
        this.threeWayViewOrder = "";
        this.multiViewRowsColumns = [1,1];

        this.doOrderIndependentTransparency = true;//Request OIT user/state setting
        this.doPeel = false;//Requested and required - above set and there are transparent objects.

        //Debugging only
        this.doShadowDepthDebug = false;
        if(this.doShadowDepthDebug)
            this.doShadow = true;

        this.drawingGBuffers = false;
        this.offScreenFramebuffer = null;
        this.offScreenFramebufferSimpleBlurX = null;
        this.offScreenFramebufferSimpleBlurY = null;
        this.ssaoFramebuffer = null;
        this.edgeDetectFramebuffer = null;
        this.gFramebuffer = null;
        this.useOffScreenBuffers = false; //This means "doDepthBlur" and is historically named.
        this.blurSize = 3;
        this.blurDepth = 0.2;
        this.offScreenReady = false;
        this.framebufferDrawBuffersReady = false;
        this.screenshotBuffersReady = false;

        this.edgeDetectFramebufferSize = 2048;
        this.gBuffersFramebufferSize = 1024;

        this.textCtx = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
        this.circleCtx = document.createElement("canvas").getContext("2d");

        this.myQuat = quat4.create();
        quat4.set(this.myQuat, 0, 0, 0, -1);
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
        this.drawEnvBOcc = false;
        this.environmentRadius = 8.0;
        this.environmentAtoms = [];
        this.labelledAtoms = [];
        this.measuredAtoms = [];
        this.ids = [];

        this.gl_cursorPos = new Float32Array(2);
        this.gl_cursorPos[0] = this.canvas.width / 2.;
        this.gl_cursorPos[1] = this.canvas.height / 2.;


        this.gl_nClipPlanes = 0;
        this.gl_fog_start = this.fogClipOffset;
        this.gl_fog_end = 1000.+this.fogClipOffset;

        self.origin = [0.0, 0.0, 0.0];

        self.mouseDown = false;
        self.mouseDownButton = -1;

        const glc = initGL(this.canvas);
        this.gl = glc.gl;
        this.WEBGL2 = glc.WEBGL2;
        this.currentViewport = [0,0, this.gl.viewportWidth, this.gl.viewportWidth];
        this.currentAnaglyphColor = [1.0,0.0,0.0,1.0]
        if(this.WEBGL2){
            this.max_elements_indices = this.gl.getParameter(this.gl.MAX_ELEMENTS_INDICES)
        } else {
            this.max_elements_indices = 65535;
        }

        this.setupThreeWayTransformations()
        this.setupStereoTransformations()

        this.blurUBOBuffer = this.gl.createBuffer();
        this.axesTexture = {black:{},white:{}};

        const extensionArray = this.gl.getSupportedExtensions();

        if (this.doneEvents === undefined) {
            self.canvas.addEventListener("mousedown",
                function (evt) {
                    if (self.keysDown['dist_ang_2d']) {
                        self.doMouseDownMeasure(evt, self);
                    } else {
                        self.doMouseDown(evt, self);
                    }
                    evt.stopPropagation();
                },
                false);
                self.canvas.addEventListener("mouseup",
                function (evt) {
                    if (self.keysDown['dist_ang_2d']) {
                        self.doMouseUpMeasure(evt, self);
                    } else {
                        self.doMouseUp(evt, self);
                    }
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
            console.log("addEventListener");
            self.canvas.addEventListener("mousemove",
                function (evt) {
                    if (self.keysDown['dist_ang_2d']) {
                        self.doMouseMoveMeasure(evt, self);
                    } else {
                        self.doMouseMove(evt, self);
                    }
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
                    e.stopPropagation();
                    e.preventDefault();
                    // Create a timeout that will check if the user is holding down on the same spot to open the context menu
                    setTimeout(() => {
                        if (self.mouseDown && !self.mouseMoved) {
                            self.doRightClick(evt, self);
                        }
                    }, 1000)
                }, false)

            self.canvas.addEventListener('touchmove',
                function (e) {
                    const touchobj = e.touches[0]; // reference first touch point for this event
                    let evt = { pageX: touchobj.pageX, pageY: touchobj.pageY, shiftKey: false, altKey: false, buttons: 1 };
                    if (e.touches.length === 1) {
                    }
                    else if (e.touches.length === 2) {
                        evt.shiftKey = true;
                        evt.altKey = true;
                    }
                    self.doMouseMove(evt, self);
                    e.stopPropagation();
                    e.preventDefault();
                }, false)

            self.canvas.addEventListener('touchend',
                function (e) {
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
                    }
                    self.doMouseUp(evt, self);
                    e.stopPropagation();
                    e.preventDefault();
                }, false)
        }
        this.doneEvents = true;

        self.light_positions = new Float32Array([0.0, 0.0, 60.0, 1.0]);
        self.light_colours_ambient = new Float32Array([0.0, 0.0, 0.0, 1.0]);
        self.light_colours_specular = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        self.light_colours_diffuse = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        self.specularPower = 64.0;

        this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        if (this.WEBGL2) {
            console.log("WebGL2")
            this.ext = true;
            this.frag_depth_ext = true;
            this.instanced_ext = true;
            this.depth_texture = true;
            const color_buffer_float_ext = this.gl.getExtension("EXT_color_buffer_float");
            if(!color_buffer_float_ext){
                alert("No WebGL extension EXT_color_buffer_float! Some or all rendering may not work properly");
            } else {
                console.log("color_buffer_float_ext?",color_buffer_float_ext)
            }
        } else {
            this.ext = this.gl.getExtension("OES_element_index_uint");
            if (!this.ext) {
                alert("No OES_element_index_uint support");
            }
            console.log("##################################################");
            console.log("Got extension");
            console.log(this.ext);
            const color_buffer_float_ext = this.gl.getExtension("WEBGL_color_buffer_float");
            if(!color_buffer_float_ext){
                console.log("No WEBGL_color_buffer_float! Some or all rendering may not work properly");
            } else {
                console.log("color_buffer_float_ext?",color_buffer_float_ext)
            }
            this.frag_depth_ext = this.gl.getExtension("EXT_frag_depth");
            this.depth_texture = this.gl.getExtension("WEBGL_depth_texture");
            this.instanced_ext = this.gl.getExtension("ANGLE_instanced_arrays");
            this.drawBuffersExt = this.gl.getExtension("WEBGL_draw_buffers");
            if (!this.instanced_ext) {
                alert("No instancing support");
            }
            if (!this.drawBuffersExt) {
                alert("No WEBGL_draw_buffers support");
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

        setInterval(function () { self.drawSceneIfDirty() }, 16);
        this.initializeShaders();

        this.textLegends = [];
        this.newTextLabels = [];

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

        this.ssaoRadius = 0.4;
        this.ssaoBias = 1.0;
        if(this.WEBGL2) this.initializeSSAOBuffers();

        self.buildBuffers();

        this.measureText2DCanvasTexture = new TextCanvasTexture(this,768,2048);
        this.measureTextCanvasTexture = new TextCanvasTexture(this,1024,2048);
        this.labelsTextCanvasTexture = new TextCanvasTexture(this,128,2048);
        this.texturedShapes = [];

        self.gl.clearColor(self.background_colour[0], self.background_colour[1], self.background_colour[2], self.background_colour[3]);
        self.gl.enable(self.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        self.origin = [0.0, 0.0, 0.0];
        //const shader_version = self.gl.getParameter(self.gl.SHADING_LANGUAGE_VERSION);

        self.mouseDown = false;
        self.mouseDownButton = -1;

        self.setBlurSize(self.blurSize);
        self.drawScene();
        self.ready = true;

        this.multiWayViewports = []
    }

    initializeShaders() : void {
        let vertexShader;
        let fragmentShader;
        let gBufferVertexShader;
        let gBufferInstancedVertexShader;
        let gBufferFragmentShader;
        let gBufferTwodVertexShader;
        let gBufferThickLineNormalVertexShader;
        let gBufferPerfectSphereFragmentShader;
        let blurVertexShader;
        let ssaoFragmentShader;
        let edgeDetectFragmentShader;
        let overlayFragmentShader;
        let blurXFragmentShader;
        let blurYFragmentShader;
        let simpleBlurXFragmentShader;
        let simpleBlurYFragmentShader;
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

        let ssao_fragment_shader_source = ssao_fragment_shader_source_webgl1;
        let edge_detect_fragment_shader_source = edge_detect_fragment_shader_source_webgl1;
        let blur_vertex_shader_source = blur_vertex_shader_source_webgl1;
        let blur_x_fragment_shader_source = blur_x_fragment_shader_source_webgl1;
        //I'm giving up on WebGL1 now ...
        let blur_x_simple_fragment_shader_source = blur_x_fragment_shader_source_webgl1;
        let blur_y_simple_fragment_shader_source = blur_y_fragment_shader_source_webgl1;
        let overlay_fragment_shader_source = overlay_fragment_shader_source_webgl1;
        let blur_y_fragment_shader_source = blur_y_fragment_shader_source_webgl1;
        let lines_fragment_shader_source = lines_fragment_shader_source_webgl1;
        let text_instanced_vertex_shader_source = text_instanced_vertex_shader_source_webgl1;
        let lines_vertex_shader_source = lines_vertex_shader_source_webgl1;
        let perfect_sphere_fragment_shader_source = perfect_sphere_fragment_shader_source_webgl1+fxaa_shader_source_webgl1;
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
        let triangle_fragment_shader_source = triangle_fragment_shader_source_webgl1+fxaa_shader_source_webgl1;
        let triangle_vertex_shader_source = triangle_vertex_shader_source_webgl1;
        let twod_fragment_shader_source = twod_fragment_shader_source_webgl1;
        let twod_vertex_shader_source = twod_vertex_shader_source_webgl1;
        let triangle_instanced_vertex_shader_source = triangle_instanced_vertex_shader_source_webgl1;
        let triangle_gbuffer_fragment_shader_source = triangle_gbuffer_fragment_shader_source_webgl1;
        let triangle_gbuffer_vertex_shader_source = triangle_gbuffer_vertex_shader_source_webgl1;
        let triangle_instanced_gbuffer_vertex_shader_source = triangle_instanced_gbuffer_vertex_shader_source_webgl1;
        let perfect_sphere_gbuffer_fragment_shader_source = perfect_sphere_gbuffer_fragment_shader_source_webgl1;
        let twod_gbuffer_vertex_shader_source = twod_gbuffer_vertex_shader_source_webgl1;
        let thick_lines_normal_gbuffer_vertex_shader_source = thick_lines_normal_gbuffer_vertex_shader_source_webgl1;
        let depth_peel_accum_vertex_shader_source = depth_peel_accum_vertex_shader_source_webgl1;
        let depth_peel_accum_fragment_shader_source = depth_peel_accum_fragment_shader_source_webgl1;

        if(this.WEBGL2){
            ssao_fragment_shader_source = ssao_fragment_shader_source_webgl2;
            edge_detect_fragment_shader_source = edge_detect_fragment_shader_source_webgl2;
            blur_vertex_shader_source = blur_vertex_shader_source_webgl2;
            blur_x_fragment_shader_source = blur_x_fragment_shader_source_webgl2;
            blur_x_simple_fragment_shader_source = blur_x_simple_fragment_shader_source_webgl2;
            blur_y_simple_fragment_shader_source = blur_y_simple_fragment_shader_source_webgl2;
            overlay_fragment_shader_source = overlay_fragment_shader_source_webgl2;
            blur_y_fragment_shader_source = blur_y_fragment_shader_source_webgl2;
            lines_fragment_shader_source = lines_fragment_shader_source_webgl2;
            text_instanced_vertex_shader_source = text_instanced_vertex_shader_source_webgl2;
            lines_vertex_shader_source = lines_vertex_shader_source_webgl2;
            perfect_sphere_fragment_shader_source = perfect_sphere_fragment_shader_source_webgl2+fxaa_shader_source_webgl2;
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
            triangle_fragment_shader_source = triangle_fragment_shader_source_webgl2+fxaa_shader_source_webgl2;
            triangle_vertex_shader_source = triangle_vertex_shader_source_webgl2;
            twod_fragment_shader_source = twod_fragment_shader_source_webgl2;
            twod_vertex_shader_source = twod_vertex_shader_source_webgl2;
            triangle_instanced_vertex_shader_source = triangle_instanced_vertex_shader_source_webgl2;
            triangle_gbuffer_fragment_shader_source = triangle_gbuffer_fragment_shader_source_webgl2;
            triangle_gbuffer_vertex_shader_source = triangle_gbuffer_vertex_shader_source_webgl2;
            triangle_instanced_gbuffer_vertex_shader_source = triangle_instanced_gbuffer_vertex_shader_source_webgl2;
            perfect_sphere_gbuffer_fragment_shader_source = perfect_sphere_gbuffer_fragment_shader_source_webgl2;
            twod_gbuffer_vertex_shader_source = twod_gbuffer_vertex_shader_source_webgl2;
            thick_lines_normal_gbuffer_vertex_shader_source = thick_lines_normal_gbuffer_vertex_shader_source_webgl2;
            depth_peel_accum_vertex_shader_source = depth_peel_accum_vertex_shader_source_webgl2;
            depth_peel_accum_fragment_shader_source = depth_peel_accum_fragment_shader_source_webgl2+fxaa_shader_source_webgl2;
        }

        vertexShader = getShader(this.gl, triangle_vertex_shader_source, "vertex");
        const vertexShaderInstanced = getShader(this.gl, triangle_instanced_vertex_shader_source, "vertex");
        fragmentShader = getShader(this.gl, triangle_fragment_shader_source, "fragment");
        gBufferFragmentShader = getShader(this.gl, triangle_gbuffer_fragment_shader_source, "fragment");
        gBufferInstancedVertexShader = getShader(this.gl, triangle_instanced_gbuffer_vertex_shader_source, "vertex");
        gBufferTwodVertexShader = getShader(this.gl, twod_gbuffer_vertex_shader_source, "vertex");
        gBufferThickLineNormalVertexShader = getShader(this.gl, thick_lines_normal_gbuffer_vertex_shader_source, "vertex");
        gBufferPerfectSphereFragmentShader = getShader(this.gl, perfect_sphere_gbuffer_fragment_shader_source, "fragment");
        gBufferVertexShader = getShader(this.gl, triangle_gbuffer_vertex_shader_source, "vertex");
        this.initGBufferShaders(gBufferVertexShader, gBufferFragmentShader);
        lineVertexShader = getShader(this.gl, lines_vertex_shader_source, "vertex");
        thickLineVertexShader = getShader(this.gl, thick_lines_vertex_shader_source, "vertex");
        thickLineNormalVertexShader = getShader(this.gl, thick_lines_normal_vertex_shader_source, "vertex");
        blurVertexShader = getShader(this.gl, blur_vertex_shader_source, "vertex");
        edgeDetectFragmentShader = getShader(this.gl, edge_detect_fragment_shader_source, "fragment");
        ssaoFragmentShader = getShader(this.gl, ssao_fragment_shader_source, "fragment");
        blurXFragmentShader = getShader(this.gl, blur_x_fragment_shader_source, "fragment");
        overlayFragmentShader = getShader(this.gl, overlay_fragment_shader_source, "fragment");
        blurYFragmentShader = getShader(this.gl, blur_y_fragment_shader_source, "fragment");
        simpleBlurXFragmentShader = getShader(this.gl, blur_x_simple_fragment_shader_source, "fragment");
        simpleBlurYFragmentShader = getShader(this.gl, blur_y_simple_fragment_shader_source, "fragment");
        lineFragmentShader = getShader(this.gl, lines_fragment_shader_source, "fragment");
        textVertexShader = getShader(this.gl, triangle_vertex_shader_source, "vertex");
        textVertexShaderInstanced = getShader(this.gl, text_instanced_vertex_shader_source, "vertex");
        circlesVertexShader = getShader(this.gl, circles_vertex_shader_source, "vertex");
        textFragmentShader = getShader(this.gl, text_fragment_shader_source, "fragment");
        circlesFragmentShader = getShader(this.gl, circles_fragment_shader_source, "fragment");
        pointSpheresVertexShader = getShader(this.gl, pointspheres_vertex_shader_source, "vertex");
        pointSpheresFragmentShader = getShader(this.gl, pointspheres_fragment_shader_source, "fragment");
        twoDShapesVertexShader = getShader(this.gl, twod_vertex_shader_source, "vertex");
        twoDShapesFragmentShader = getShader(this.gl, twod_fragment_shader_source, "fragment");
        renderFrameBufferFragmentShader = getShader(this.gl, render_framebuffer_fragment_shader_source, "fragment");
        const flatColourFragmentShader = getShader(this.gl, flat_colour_fragment_shader_source, "fragment");
        if (this.frag_depth_ext) {
            perfectSphereFragmentShader = getShader(this.gl, perfect_sphere_fragment_shader_source, "fragment");
            perfectSphereOutlineFragmentShader = getShader(this.gl, perfect_sphere_outline_fragment_shader_source, "fragment");
            shadowVertexShader = getShader(this.gl, shadow_vertex_shader_source, "vertex");
            shadowVertexShaderInstanced = getShader(this.gl, shadow_instanced_vertex_shader_source, "vertex");
            shadowFragmentShader = getShader(this.gl, shadow_fragment_shader_source, "fragment");
            this.initShadowShaders(shadowVertexShader, shadowFragmentShader);
            this.initInstancedShadowShaders(shadowVertexShaderInstanced, shadowFragmentShader);
            this.initInstancedOutlineShaders(vertexShaderInstanced, flatColourFragmentShader);
        }

        this.initRenderFrameBufferShaders(blurVertexShader, renderFrameBufferFragmentShader);
        this.initLineShaders(lineVertexShader, lineFragmentShader);
        this.initOverlayShader(blurVertexShader, overlayFragmentShader);
        this.initBlurXShader(blurVertexShader, blurXFragmentShader);
        this.initSSAOShader(blurVertexShader, ssaoFragmentShader);
        this.initEdgeDetectShader(blurVertexShader, edgeDetectFragmentShader);
        this.initBlurYShader(blurVertexShader, blurYFragmentShader);
        this.initSimpleBlurXShader(blurVertexShader, simpleBlurXFragmentShader);
        this.initSimpleBlurYShader(blurVertexShader, simpleBlurYFragmentShader);
        this.initThickLineShaders(thickLineVertexShader, lineFragmentShader);
        this.initThickLineNormalShaders(thickLineNormalVertexShader, fragmentShader);
        this.initPointSpheresShaders(pointSpheresVertexShader, pointSpheresFragmentShader);
        this.initTwoDShapesShaders(twoDShapesVertexShader, twoDShapesFragmentShader);
        this.initImageShaders(twoDShapesVertexShader, textFragmentShader);
        if (this.frag_depth_ext) {
            this.initPerfectSphereShaders(twoDShapesVertexShader, perfectSphereFragmentShader);
            this.initPerfectSphereOutlineShaders(twoDShapesVertexShader, perfectSphereOutlineFragmentShader);
            shadowDepthPerfectSphereFragmentShader = getShader(this.gl, shadow_depth_perfect_sphere_fragment_shader_source, "fragment");
            shadowDeptTwoDShapesVertexShader = getShader(this.gl, shadow_depth_twod_vertex_shader_source, "vertex");
            this.initDepthShadowPerfectSphereShaders(shadowDepthPerfectSphereFragmentShader, shadowDeptTwoDShapesVertexShader);
        }
        this.initTextBackgroundShaders(textVertexShader, textFragmentShader);
        this.initTextInstancedShaders(textVertexShaderInstanced, textFragmentShader);
        this.gl.disableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.initCirclesShaders(circlesVertexShader, circlesFragmentShader);
        this.gl.disableVertexAttribArray(this.shaderProgramCircles.vertexTextureAttribute);
        this.initShaders(vertexShader, fragmentShader);
        this.initOutlineShaders(vertexShader, flatColourFragmentShader);
        this.initShadersInstanced(vertexShaderInstanced, fragmentShader);
        this.initGBufferShadersInstanced(gBufferInstancedVertexShader, gBufferFragmentShader);
        this.initGBufferShadersPerfectSphere(gBufferTwodVertexShader, gBufferPerfectSphereFragmentShader);
        this.initGBufferThickLineNormalShaders(gBufferThickLineNormalVertexShader, gBufferFragmentShader);
        if(this.WEBGL2){
            const vertexShaderTextured = getShader(this.gl, triangle_texture_vertex_shader_source, "vertex");
            const fragmentShaderTextured = getShader(this.gl, triangle_texture_fragment_shader_source, "fragment");
            this.initShadersTextured(vertexShaderTextured, fragmentShaderTextured);
        }
        const vertexShaderDepthPeelAccum = getShader(this.gl, depth_peel_accum_vertex_shader_source, "vertex");
        const fragmentShaderDepthPeelAccum = getShader(this.gl, depth_peel_accum_fragment_shader_source, "fragment");
        this.initShadersDepthPeelAccum(vertexShaderDepthPeelAccum, fragmentShaderDepthPeelAccum);
    }

    setActiveMolecule(molecule: moorhen.Molecule) : void {
        console.log("**************************************************")
        console.log("**************************************************")
        console.log("setActiveMolecule",molecule)
        console.log("**************************************************")
        console.log("**************************************************")
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

        if(jsondata.image_data){
            if(jsondata.width && jsondata.height && jsondata.x_size && jsondata.y_size){
                const uuid =  guid();
                const texturedShape = new TexturedShape(jsondata,this.gl,uuid);
                this.texturedShapes.push(texturedShape)
                theseBuffers.push({texturedShapes:texturedShape,uuid:uuid});
            }
            console.log("Probably textureAsFloatsJS, ignore for now!");
            if (typeof (skipRebuild) !== "undefined" && skipRebuild) {
                return theseBuffers;
            }
            self.buildBuffers();
            self.drawScene();
            return theseBuffers;
        }
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
                        const uuid =  guid();
                        labels.forEach(label => {
                            this.labelsTextCanvasTexture.addBigTextureTextImage({font:label.font,text:label.text,x:label.x,y:label.y,z:label.z},uuid)
                        })
                        theseBuffers.push({labels:labels,uuid:uuid});
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

        theseBuffers.forEach(buffer => {
            if("bufferTypes" in buffer){
                for(let ibuf=0;ibuf<buffer.bufferTypes.length;ibuf++){
                    if(buffer.bufferTypes[ibuf]==="PERFECT_SPHERES"&&!jsondata.clickTol){
                        buffer.clickTol = 2.0 * buffer.triangleInstanceSizes[ibuf][0] + 0.45;
                    }
                }
            }
        })

        if(jsondata.isHoverBuffer){
            self.displayBuffers[self.currentBufferIdx].isHoverBuffer = jsondata.isHoverBuffer;
            let maxSize = 0.27;
            for (let idx = 0; idx < this.displayBuffers.length; idx++) {
                if (this.displayBuffers[idx].atoms.length > 0) {
                    for(let ibuf2=0;ibuf2<this.displayBuffers[idx].bufferTypes.length;ibuf2++){
                        if(this.displayBuffers[idx].bufferTypes[ibuf2]==="PERFECT_SPHERES"){
                            if(this.displayBuffers[idx].triangleInstanceSizes[ibuf2][0]>0.27&&!this.displayBuffers[idx].isHoverBuffer&&this.displayBuffers[idx].visible){
                                let nhits = 0
                                theseBuffers[0].atoms.forEach(bufatom => {
                                    this.displayBuffers[idx].atoms.forEach(atom => {
                                        if(Math.abs(bufatom.x-atom.x)<1e-4&&Math.abs(bufatom.y-atom.y)<1e-4&&Math.abs(bufatom.z-atom.z)<1e-4){
                                            nhits++;
                                        }
                                    })
                                })
                                if(theseBuffers[0].atoms.length===nhits){
                                    maxSize = Math.max(this.displayBuffers[idx].triangleInstanceSizes[ibuf2][0],maxSize);
                                }
                            }
                        }
                    }
                }
            }
            this.hoverSize = maxSize;
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
            this.drawScene();
        }
    }

    setBackground(col: [number, number, number, number]) : void {
        this.background_colour = col;
        this.updateLabels()
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

    handleOriginUpdated(doDispatch: boolean) {
        if(doDispatch){
            const originUpdateEvent = new CustomEvent("originUpdate", { detail: {origin: this.origin} })
            document.dispatchEvent(originUpdateEvent);
        }
        if(this.drawEnvBOcc) {
            let near_atoms = []
            this.displayBuffers.forEach(buffer => {
                if (buffer.visible) {
                    buffer.atoms.forEach(atom => {
                        const ax = atom.x
                        const ay = atom.y
                        const az = atom.z
                        const ox = -this.origin[0]
                        const oy = -this.origin[1]
                        const oz = -this.origin[2]
                        if(Math.abs(ax-ox)<this.environmentRadius && Math.abs(ay-oy)<this.environmentRadius && Math.abs(az-oz)<this.environmentRadius){
                            const distsq = (ax-ox)*(ax-ox) + (ay-oy)*(ay-oy) + (az-oz)*(az-oz)
                            if(distsq<this.environmentRadius*this.environmentRadius) near_atoms.push(atom)
                        }
                    })
                }
            })
            this.environmentAtoms = []
            const spacing = " ".repeat(400)
            near_atoms.forEach(atom => {
                const atomLabel = parseAtomInfoLabel(atom);
                if (this.environmentAtoms.length === 0 || (this.environmentAtoms[this.environmentAtoms.length - 1].length > 1)) {
                    this.environmentAtoms.push([]);
                }
                // The spacing + ")" adjusts the height/baseline so that they are same as click atom labels.
                atom.label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + spacing + ")"
                //atom.label = atom.tempFactor.toFixed(2) + " " + atom.occupancy.toFixed(2) + " " + atomLabel
                this.environmentAtoms[this.environmentAtoms.length - 1].push(atom)
            })
            this.updateLabels()
        }
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
        this.handleOriginUpdated(true)
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

    calculateOriginDelta(newOrigin: [number, number, number], oldOrigin: [number, number, number], nFrames: number): [number, number, number] {
        const [old_x, old_y, old_z] = oldOrigin
        const [new_x, new_y, new_z] = newOrigin
        const DX = (new_x - old_x) / nFrames
        const DY = (new_y - old_y) / nFrames
        const DZ = (new_z - old_z) / nFrames
        return [ DX, DY, DZ ]
    }

    setOriginAndZoomAnimated(newOrigin: [number, number, number], newZoom: number) {
        this.nAnimationFrames = 15
        const deltaOrigin = this.calculateOriginDelta(newOrigin, this.origin, this.nAnimationFrames)
        const deltaZoom = (newZoom - this.zoom) / this.nAnimationFrames
        requestAnimationFrame(this.drawOriginAndZoomFrame.bind(this, this.origin, this.zoom, deltaOrigin, deltaZoom, 1))
    }

    drawOriginAndZoomFrame(oldOrigin: [number, number, number], oldZoom: number, deltaOrigin: [number, number, number], deltaZoom: number, iframe: number) {
        const [ DX, DY, DZ ] = deltaOrigin
        const [ X, Y, Z ] = oldOrigin
        this.origin = [ X + iframe * DX , Y + iframe * DY, Z + iframe * DZ ]
        this.zoom = oldZoom + deltaZoom * iframe
        this.drawScene()
        if (iframe < this.nAnimationFrames) {
            requestAnimationFrame(this.drawOriginAndZoomFrame.bind(this, oldOrigin, oldZoom, deltaOrigin, deltaZoom, iframe + 1))
        } else {
            const zoomChanged = new CustomEvent("zoomChanged", { detail: { oldZoom, newZoom: this.zoom } })
            document.dispatchEvent(zoomChanged)
            this.handleOriginUpdated(true)
        }
    }

    setOriginAnimated(oldOrigin: number[]) : void {
        const [ DX, DY, DZ ] = this.calculateOriginDelta(oldOrigin as [number, number, number], this.origin, 1)
        const distance = Math.sqrt(DX**2 + DY**2 + DZ**2)
        const nFrames = Math.floor(distance / 1.5)
        this.nAnimationFrames = nFrames > 15 ? 15 : nFrames < 5 ? 5 : nFrames
        const dx = DX/this.nAnimationFrames
        const dy = DY/this.nAnimationFrames
        const dz = DZ/this.nAnimationFrames
        requestAnimationFrame(this.drawOriginFrame.bind(this, [...this.origin], [dx, dy, dz], 1))
    }

    drawOriginFrame(oo,d,iframe){
        this.origin = [oo[0]+iframe*d[0],oo[1]+iframe*d[1],oo[2]+iframe*d[2]];
        this.drawScene()
        if(iframe<this.nAnimationFrames){
            requestAnimationFrame(this.drawOriginFrame.bind(this,oo,d,iframe+1))
        } else {
            this.handleOriginUpdated(true)
        }
    }

    setOrigin(o: [number, number, number], doDrawScene=true, dispatchEvent=true) : void {
        this.origin = o;
        //default is to drawScene, unless doDrawScene provided and value is false
        if (doDrawScene) {
            this.drawScene();
        }
        this.handleOriginUpdated(dispatchEvent)
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
        const wheelContourChanged = new CustomEvent("wheelContourLevelChanged", {
            "detail": {
                factor: contourFactor,
            }
        });
        document.dispatchEvent(wheelContourChanged);

        if (drawScene) this.drawScene();
    }

    drawZoomFrame(oldZoom: number, newZoom: number, iframe: number) {
        const deltaZoom = (newZoom - oldZoom) / this.nAnimationFrames
        const currentZoom = oldZoom + deltaZoom * iframe
        this.zoom = currentZoom
        this.drawScene()
        if (iframe < this.nAnimationFrames) {
            const fieldDepthFront = 8
            const fieldDepthBack = 21
            this.set_fog_range(this.fogClipOffset - (this.zoom * fieldDepthFront), this.fogClipOffset + (this.zoom * fieldDepthBack))
            this.set_clip_range(0 - (this.zoom * fieldDepthFront), 0 + (this.zoom * fieldDepthBack))
            requestAnimationFrame(this.drawZoomFrame.bind(this, oldZoom, newZoom, iframe + 1))
        } else {
            const zoomChanged = new CustomEvent("zoomChanged", {
                "detail": {
                    oldZoom,
                    newZoom
                }
            });
            document.dispatchEvent(zoomChanged);
        }
    }

    setZoomAnimated(newZoom: number) {
        const oldZoom = this.zoom
        this.nAnimationFrames = 15
        requestAnimationFrame(this.drawZoomFrame.bind(this, oldZoom, newZoom, 1))
    }

    setZoom(z: number, drawScene?: boolean) {
        const oldZoom = this.zoom
        this.zoom = z;
        const zoomChanged = new CustomEvent("zoomChanged", {
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

    createEdgeDetectFramebufferBuffer(width : number,height : number){

        if(!this.edgeDetectFramebuffer){
            this.edgeDetectFramebuffer = this.gl.createFramebuffer();

            this.edgeDetectTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            const edgeDetectRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.edgeDetectFramebuffer);
            this.edgeDetectFramebuffer.width = width;
            this.edgeDetectFramebuffer.height = height;

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, edgeDetectRenderbuffer);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.edgeDetectTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            //console.log("EdgeDetect framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));
        }

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    createGBuffers(width : number,height : number){
        if(!this.gFramebuffer){
            this.gFramebuffer = this.gl.createFramebuffer();
            this.gBufferDepthTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferDepthTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.gBufferPositionTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.gBufferNormalTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            //FIXME - Sizes?
            const gBufferRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gFramebuffer.width = width;
            this.gFramebuffer.height = height;

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, gBufferRenderbuffer);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, gBufferRenderbuffer);
            if (this.WEBGL2) {
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT32F, width, height);
            } else {
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
            }
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferDepthTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT32F, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.FLOAT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.gBufferDepthTexture, 0);

            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, gBufferRenderbuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA32F, width, height);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.gBufferPositionTexture, 0);

            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.RENDERBUFFER, gBufferRenderbuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA32F, width, height);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT1, this.gl.TEXTURE_2D, this.gBufferNormalTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            console.log("G-buffer framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));

        }
    }

    createSSAOFramebufferBuffer(){

        if(!this.ssaoFramebuffer){
            this.ssaoFramebuffer = this.gl.createFramebuffer();

            this.ssaoTexture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoTexture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            //FIXME - Sizes?
            const ssaoRenderbuffer = this.gl.createRenderbuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.ssaoFramebuffer);
            this.ssaoFramebuffer.width = 1024;
            this.ssaoFramebuffer.height = 1024;

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, ssaoRenderbuffer);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.ssaoTexture, 0);

            const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            console.log("SSAO",typeof(status))
            console.log("SSAO",typeof(this.gl.FRAMEBUFFER_COMPLETE))
            console.log("SSAO framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));
        }

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    createSimpleBlurOffScreeenBuffers(){

        this.offScreenFramebufferSimpleBlurX = this.gl.createFramebuffer();
        this.offScreenFramebufferSimpleBlurY = this.gl.createFramebuffer();

        this.simpleBlurXTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurXTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.simpleBlurYTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurX);
        this.offScreenFramebufferSimpleBlurX.width = 1024;
        this.offScreenFramebufferSimpleBlurX.height = 1024;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurXTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.simpleBlurXTexture, 0);

        let status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        console.log("offScreenFramebufferSimpleBlurX framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurY);
        this.offScreenFramebufferSimpleBlurY.width = 1024;
        this.offScreenFramebufferSimpleBlurY.height = 1024;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1024, 1024, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.simpleBlurYTexture, 0);

        status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        console.log("offScreenFramebufferSimpleBlurY framebuffer OK?",(status===this.gl.FRAMEBUFFER_COMPLETE));

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    recreateDepthPeelBuffers(width,height){
        //Defines 4 off-screeen multisampled framebuffers and corresponding textures.
        //Requires depth_texture
        //FIXME - Should be called after resize event
        if(this.depth_texture){
            if(this.depthPeelFramebuffers.length===0&&width>0&&height>0){
                console.log("Make depth peel buffers of size",width,height)
                for(let i=0;i<4;i++){
                    this.depthPeelFramebuffers[i] = this.gl.createFramebuffer();
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.depthPeelFramebuffers[i]);

                    this.depthPeelColorTextures[i] = this.gl.createTexture();
                    this.depthPeelDepthTextures[i] = this.gl.createTexture();
                    this.depthPeelRenderbufferDepth[i] = this.gl.createRenderbuffer();
                    this.depthPeelRenderbufferColor[i] = this.gl.createRenderbuffer();

                    this.depthPeelFramebuffers[i].width = width;
                    this.depthPeelFramebuffers[i].height = height;

                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelColorTextures[i]);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

                    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthPeelRenderbufferColor[i]);
                    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, this.depthPeelRenderbufferColor[i]);
                    if (this.WEBGL2) {
                        //FIXME - multismapling isn't actually working - need to blit to another buffer ...
                        this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES), this.gl.RGBA32F, width, height);
                        //this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA32F, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, width, height, 0, this.gl.RGBA, this.gl.FLOAT, null);
                    } else {
                        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.RGBA4, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                    }
                    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.depthPeelColorTextures[i], 0);

                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[i]);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

                    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthPeelRenderbufferDepth[i]);
                    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.depthPeelRenderbufferDepth[i]);
                    if (this.WEBGL2) {
                        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT32F, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT32F, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.FLOAT, null);
                    } else {
                        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
                        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
                    }
                    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.depthPeelDepthTextures[i], 0);

                    let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
                    console.log("Depth-peel buffer",i,"completeness",canRead);
                    if(!canRead){
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT){
                            console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT){
                            console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS){
                            console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_UNSUPPORTED){
                            console.log("FRAMEBUFFER_UNSUPPORTED");
                        }
                        if(this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE){
                            console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE");
                        }
                    }

                    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
                    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

                }
            }
        }
    }

    recreateOffScreeenBuffers(width,height){
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
        this.offScreenFramebuffer.width = width;
        this.offScreenFramebuffer.height = height;

        if (this.WEBGL2) {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferDepth);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.offScreenRenderbufferDepth);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES),
                    this.gl.DEPTH_COMPONENT24, width, height);

            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER, this.gl.getParameter(this.gl.MAX_SAMPLES),
                    this.gl.RGBA8, width, height);
        } else {
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.offScreenRenderbufferColor);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
        }


        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferColor);
        this.offScreenFramebufferColor.width = width;
        this.offScreenFramebufferColor.height = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.offScreenTexture, 0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, width, height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.offScreenDepthTexture, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);
        this.offScreenFramebufferBlurX.width = width;
        this.offScreenFramebufferBlurX.height = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurXTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.blurXTexture, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurY);
        this.offScreenFramebufferBlurY.width = width;
        this.offScreenFramebufferBlurY.height = height;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
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

        this.rttDepthTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        if (this.WEBGL2) {
            let renderbufferDepth = this.gl.createRenderbuffer();
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbufferDepth);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbufferDepth);
            this.gl.renderbufferStorageMultisample(this.gl.RENDERBUFFER,
                                    this.gl.getParameter(this.gl.MAX_SAMPLES),
                                    this.gl.DEPTH_COMPONENT24,
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
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.DEPTH_COMPONENT24, this.rttFramebuffer.width, this.rttFramebuffer.height, 0, this.gl.DEPTH_COMPONENT, this.gl.UNSIGNED_INT, null);
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.rttDepthTexture, 0);
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
        //this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexNormalAttribute);

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

    initEdgeDetectShader(vertexShaderEdgeDetect, fragmentShaderEdgeDetect) {
        console.log("**************************************************")
        console.log("**************************************************")
        console.log("initEdgeDetectShader")
        console.log("**************************************************")
        console.log("**************************************************")
        this.shaderProgramEdgeDetect = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramEdgeDetect, vertexShaderEdgeDetect);
        this.gl.attachShader(this.shaderProgramEdgeDetect, fragmentShaderEdgeDetect);
        this.gl.bindAttribLocation(this.shaderProgramEdgeDetect, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramEdgeDetect, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramEdgeDetect);
        if (!this.gl.getProgramParameter(this.shaderProgramEdgeDetect, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initEdgeDetectShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramEdgeDetect));
        }

        this.gl.useProgram(this.shaderProgramEdgeDetect);

        this.shaderProgramEdgeDetect.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramEdgeDetect, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramEdgeDetect.vertexPositionAttribute);

        this.shaderProgramEdgeDetect.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramEdgeDetect, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramEdgeDetect.vertexTextureAttribute);

        this.shaderProgramEdgeDetect.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "uPMatrix");
        this.shaderProgramEdgeDetect.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "uMVMatrix");

        this.shaderProgramEdgeDetect.gPositionTexture = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "gPosition");
        this.shaderProgramEdgeDetect.gNormalTexture = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "gNormal");

        this.shaderProgramEdgeDetect.zoom = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "zoom");
        this.shaderProgramEdgeDetect.depthBufferSize = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "depthBufferSize");

        this.shaderProgramEdgeDetect.depthThreshold = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "depthThreshold");
        this.shaderProgramEdgeDetect.normalThreshold = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "normalThreshold");
        this.shaderProgramEdgeDetect.scaleDepth = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "scaleDepth");
        this.shaderProgramEdgeDetect.scaleNormal = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "scaleNormal");
        this.shaderProgramEdgeDetect.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "xPixelOffset");
        this.shaderProgramEdgeDetect.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "yPixelOffset");
        this.shaderProgramEdgeDetect.depthFactor = this.gl.getUniformLocation(this.shaderProgramEdgeDetect, "depthFactor");
    }

    initSSAOShader(vertexShaderSSAO, fragmentShaderSSAO) {
        console.log("**************************************************")
        console.log("**************************************************")
        console.log("initSSAOShader")
        console.log("**************************************************")
        console.log("**************************************************")
        this.shaderProgramSSAO = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramSSAO, vertexShaderSSAO);
        this.gl.attachShader(this.shaderProgramSSAO, fragmentShaderSSAO);
        this.gl.bindAttribLocation(this.shaderProgramSSAO, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramSSAO, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramSSAO);
        if (!this.gl.getProgramParameter(this.shaderProgramSSAO, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initSSAOShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramSSAO));
        }

        this.gl.useProgram(this.shaderProgramSSAO);

        this.shaderProgramSSAO.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramSSAO, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramSSAO.vertexPositionAttribute);

        this.shaderProgramSSAO.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramSSAO, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramSSAO.vertexTextureAttribute);

        this.shaderProgramSSAO.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramSSAO, "uPMatrix");
        this.shaderProgramSSAO.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramSSAO, "uMVMatrix");

        if(this.WEBGL2){
            this.shaderProgramSSAO.samples = this.gl.getUniformBlockIndex(this.shaderProgramSSAO, "sampleBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSSAO, this.shaderProgramSSAO.samples, 0);
        }

        this.shaderProgramSSAO.gPositionTexture = this.gl.getUniformLocation(this.shaderProgramSSAO, "gPosition");
        this.shaderProgramSSAO.gNormalTexture = this.gl.getUniformLocation(this.shaderProgramSSAO, "gNormal");
        this.shaderProgramSSAO.texNoiseTexture = this.gl.getUniformLocation(this.shaderProgramSSAO, "texNoise");
        this.shaderProgramSSAO.zoom = this.gl.getUniformLocation(this.shaderProgramSSAO, "zoom");
        this.shaderProgramSSAO.radius = this.gl.getUniformLocation(this.shaderProgramSSAO, "radius");
        this.shaderProgramSSAO.bias = this.gl.getUniformLocation(this.shaderProgramSSAO, "bias");
        this.shaderProgramSSAO.depthFactor = this.gl.getUniformLocation(this.shaderProgramSSAO, "depthFactor");
        this.shaderProgramSSAO.depthBufferSize = this.gl.getUniformLocation(this.shaderProgramSSAO, "depthBufferSize");
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

    initSimpleBlurXShader(vertexShaderBlurX, fragmentShaderBlurX) {
        this.shaderProgramSimpleBlurX = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramSimpleBlurX, vertexShaderBlurX);
        this.gl.attachShader(this.shaderProgramSimpleBlurX, fragmentShaderBlurX);
        this.gl.bindAttribLocation(this.shaderProgramSimpleBlurX, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramSimpleBlurX, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramSimpleBlurX);

        if (!this.gl.getProgramParameter(this.shaderProgramSimpleBlurX, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initRenderBlurXShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramSimpleBlurX));
        }

        this.gl.useProgram(this.shaderProgramSimpleBlurX);

        this.shaderProgramSimpleBlurX.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramSimpleBlurX, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurX.vertexPositionAttribute);

        this.shaderProgramSimpleBlurX.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramSimpleBlurX, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurX.vertexTextureAttribute);

        this.shaderProgramSimpleBlurX.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramSimpleBlurX, "uPMatrix");
        this.shaderProgramSimpleBlurX.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramSimpleBlurX, "uMVMatrix");

        this.shaderProgramSimpleBlurX.blurSize = this.gl.getUniformLocation(this.shaderProgramSimpleBlurX, "blurSize");
        if(this.WEBGL2){
            this.shaderProgramSimpleBlurX.blurCoeffs = this.gl.getUniformBlockIndex(this.shaderProgramSimpleBlurX, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSimpleBlurX, this.shaderProgramSimpleBlurX.blurCoeffs, 0);
        }

        this.shaderProgramSimpleBlurX.inputTexture = this.gl.getUniformLocation(this.shaderProgramSimpleBlurX, "shader0");
    }

    initSimpleBlurYShader(vertexShaderBlurY, fragmentShaderBlurY) {
        this.shaderProgramSimpleBlurY = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramSimpleBlurY, vertexShaderBlurY);
        this.gl.attachShader(this.shaderProgramSimpleBlurY, fragmentShaderBlurY);
        this.gl.bindAttribLocation(this.shaderProgramSimpleBlurY, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramSimpleBlurY, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramSimpleBlurY);

        if (!this.gl.getProgramParameter(this.shaderProgramSimpleBlurY, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initRenderBlurYShader)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramSimpleBlurY));
        }

        this.gl.useProgram(this.shaderProgramSimpleBlurY);

        this.shaderProgramSimpleBlurY.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramSimpleBlurY, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexPositionAttribute);

        this.shaderProgramSimpleBlurY.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramSimpleBlurY, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexTextureAttribute);

        this.shaderProgramSimpleBlurY.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramSimpleBlurY, "uPMatrix");
        this.shaderProgramSimpleBlurY.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramSimpleBlurY, "uMVMatrix");

        this.shaderProgramSimpleBlurY.blurSize = this.gl.getUniformLocation(this.shaderProgramSimpleBlurY, "blurSize");
        if(this.WEBGL2){
            this.shaderProgramSimpleBlurY.blurCoeffs = this.gl.getUniformBlockIndex(this.shaderProgramSimpleBlurY, "coeffBuffer");
            this.gl.uniformBlockBinding(this.shaderProgramSimpleBlurY, this.shaderProgramSimpleBlurY.blurCoeffs, 0);
        }

        this.shaderProgramSimpleBlurY.inputTexture = this.gl.getUniformLocation(this.shaderProgramSimpleBlurY, "shader0");
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
        this.shaderProgramRenderFrameBuffer.blurDepth = this.gl.getUniformLocation(this.shaderProgramRenderFrameBuffer, "blurDepth");

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
        //this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexColourAttribute);

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
        this.gl.uniform4fv(this.shaderProgramTextBackground.fogColour, new Float32Array([1.0, 1.0, 1.0, 1.0]));

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
            alert("Could not initialise shaders (initOutlineShaders)");
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

    initGBufferShadersPerfectSphere(vertexShader, fragmentShader) {
        this.shaderProgramGBuffersPerfectSpheres = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramGBuffersPerfectSpheres, vertexShader);
        this.gl.attachShader(this.shaderProgramGBuffersPerfectSpheres, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramGBuffersPerfectSpheres, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersPerfectSpheres, 3, "aVertexTexture");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersPerfectSpheres, 8, "size");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersPerfectSpheres, 9, "offset");
        this.gl.linkProgram(this.shaderProgramGBuffersPerfectSpheres);

        if (!this.gl.getProgramParameter(this.shaderProgramGBuffersPerfectSpheres, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initGBufferShadersPerfectSphere)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramGBuffersPerfectSpheres));
        }

        this.gl.useProgram(this.shaderProgramGBuffersPerfectSpheres);

        this.shaderProgramGBuffersPerfectSpheres.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersPerfectSpheres, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersPerfectSpheres.vertexPositionAttribute);

        this.shaderProgramGBuffersPerfectSpheres.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersPerfectSpheres, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersPerfectSpheres.vertexTextureAttribute);

        this.shaderProgramGBuffersPerfectSpheres.offsetAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersPerfectSpheres, "offset");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersPerfectSpheres.offsetAttribute);

        this.shaderProgramGBuffersPerfectSpheres.sizeAttribute= this.gl.getAttribLocation(this.shaderProgramGBuffersPerfectSpheres, "size");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersPerfectSpheres.sizeAttribute);

        this.shaderProgramGBuffersPerfectSpheres.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "uPMatrix");
        this.shaderProgramGBuffersPerfectSpheres.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "uMVMatrix");
        this.shaderProgramGBuffersPerfectSpheres.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "uMVINVMatrix");
        this.shaderProgramGBuffersPerfectSpheres.invSymMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "uINVSymmMatrix");

        this.shaderProgramGBuffersPerfectSpheres.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane0");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane1");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane2");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane3");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane4");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane5");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane6");
        this.shaderProgramGBuffersPerfectSpheres.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipPlane7");
        this.shaderProgramGBuffersPerfectSpheres.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "nClipPlanes");
        this.shaderProgramGBuffersPerfectSpheres.clipCap = this.gl.getUniformLocation(this.shaderProgramGBuffersPerfectSpheres, "clipCap");
    }

    initGBufferShadersInstanced(vertexShader, fragmentShader) {

        this.shaderProgramGBuffersInstanced = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramGBuffersInstanced, vertexShader);
        this.gl.attachShader(this.shaderProgramGBuffersInstanced, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramGBuffersInstanced, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersInstanced, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersInstanced, 2, "aVertexNormal");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersInstanced, 4, "instancePosition");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersInstanced, 5, "instanceSize");
        this.gl.bindAttribLocation(this.shaderProgramGBuffersInstanced, 6, "instanceOrientation");
        this.gl.linkProgram(this.shaderProgramGBuffersInstanced);

        if (!this.gl.getProgramParameter(this.shaderProgramGBuffersInstanced, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initGBufferShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramGBuffersInstanced));
        }

        this.shaderProgramGBuffersInstanced.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersInstanced, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersInstanced.vertexNormalAttribute);

        this.shaderProgramGBuffersInstanced.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersInstanced, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersInstanced.vertexPositionAttribute);

        this.shaderProgramGBuffersInstanced.vertexColourAttribute = -1;

        this.shaderProgramGBuffersInstanced.vertexInstanceOriginAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersInstanced, "instancePosition");
        this.shaderProgramGBuffersInstanced.vertexInstanceSizeAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersInstanced, "instanceSize");
        this.shaderProgramGBuffersInstanced.vertexInstanceOrientationAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersInstanced, "instanceOrientation");

        this.shaderProgramGBuffersInstanced.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "uPMatrix");
        this.shaderProgramGBuffersInstanced.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "uMVMatrix");
        this.shaderProgramGBuffersInstanced.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "uMVINVMatrix");

        this.shaderProgramGBuffersInstanced.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane0");
        this.shaderProgramGBuffersInstanced.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane1");
        this.shaderProgramGBuffersInstanced.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane2");
        this.shaderProgramGBuffersInstanced.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane3");
        this.shaderProgramGBuffersInstanced.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane4");
        this.shaderProgramGBuffersInstanced.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane5");
        this.shaderProgramGBuffersInstanced.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane6");
        this.shaderProgramGBuffersInstanced.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "clipPlane7");
        this.shaderProgramGBuffersInstanced.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramGBuffersInstanced, "nClipPlanes");

    }

    initGBufferShaders(vertexShader, fragmentShader) {
        this.shaderProgramGBuffers = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramGBuffers, vertexShader);
        this.gl.attachShader(this.shaderProgramGBuffers, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramGBuffers, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramGBuffers, 1, "aVertexColour");
        this.gl.bindAttribLocation(this.shaderProgramGBuffers, 2, "aVertexNormal");
        this.gl.linkProgram(this.shaderProgramGBuffers);

        if (!this.gl.getProgramParameter(this.shaderProgramGBuffers, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initGBufferShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramGBuffers));
        }

        this.shaderProgramGBuffers.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffers, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffers.vertexNormalAttribute);

        this.shaderProgramGBuffers.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffers, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffers.vertexPositionAttribute);

        this.shaderProgramGBuffers.vertexColourAttribute = -1;

        this.shaderProgramGBuffers.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffers, "uPMatrix");
        this.shaderProgramGBuffers.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffers, "uMVMatrix");
        this.shaderProgramGBuffers.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffers, "uMVINVMatrix");

        this.shaderProgramGBuffers.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane0");
        this.shaderProgramGBuffers.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane1");
        this.shaderProgramGBuffers.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane2");
        this.shaderProgramGBuffers.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane3");
        this.shaderProgramGBuffers.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane4");
        this.shaderProgramGBuffers.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane5");
        this.shaderProgramGBuffers.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane6");
        this.shaderProgramGBuffers.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramGBuffers, "clipPlane7");
        this.shaderProgramGBuffers.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramGBuffers, "nClipPlanes");

    }

    initShadersDepthPeelAccum(vertexShader, fragmentShader) {

        this.shaderProgramDepthPeelAccum = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramDepthPeelAccum, vertexShader);
        this.gl.attachShader(this.shaderProgramDepthPeelAccum, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramDepthPeelAccum, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramDepthPeelAccum, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramDepthPeelAccum);

        if (!this.gl.getProgramParameter(this.shaderProgramDepthPeelAccum, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initShadersDepthPeelAccum)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramDepthPeelAccum));
        }

        this.gl.useProgram(this.shaderProgramDepthPeelAccum);

        this.shaderProgramDepthPeelAccum.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramDepthPeelAccum, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramDepthPeelAccum.vertexPositionAttribute);

        this.shaderProgramDepthPeelAccum.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramDepthPeelAccum, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramDepthPeelAccum.vertexTextureAttribute);

        this.shaderProgramDepthPeelAccum.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramDepthPeelAccum, "uPMatrix");
        this.shaderProgramDepthPeelAccum.peelNumber = this.gl.getUniformLocation(this.shaderProgramDepthPeelAccum, "peelNumber");
        this.shaderProgramDepthPeelAccum.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgramDepthPeelAccum, "depthPeelSamplers");
        this.shaderProgramDepthPeelAccum.xSSAOScaling = this.gl.getUniformLocation(this.shaderProgramDepthPeelAccum, "xSSAOScaling");
        this.shaderProgramDepthPeelAccum.ySSAOScaling = this.gl.getUniformLocation(this.shaderProgramDepthPeelAccum, "ySSAOScaling");
        this.shaderProgramDepthPeelAccum.colorPeelSamplers = this.gl.getUniformLocation(this.shaderProgramDepthPeelAccum, "colorPeelSamplers");

    }

    initShadersTextured(vertexShader, fragmentShader) {

        this.shaderProgramTextured = this.gl.createProgram();

        this.gl.attachShader(this.shaderProgramTextured, vertexShader);
        this.gl.attachShader(this.shaderProgramTextured, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramTextured, 0, "aVertexPosition");
        this.gl.bindAttribLocation(this.shaderProgramTextured, 3, "aVertexTexture");
        this.gl.linkProgram(this.shaderProgramTextured);

        if (!this.gl.getProgramParameter(this.shaderProgramTextured, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initShadersTextured)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramTextured));
        }

        this.gl.useProgram(this.shaderProgramTextured);

        this.shaderProgramTextured.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramTextured, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramTextured.vertexPositionAttribute);

        this.shaderProgramTextured.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramTextured, "aVertexTexture");
        this.gl.enableVertexAttribArray(this.shaderProgramTextured.vertexTextureAttribute);

        this.shaderProgramTextured.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextured, "uPMatrix");
        this.shaderProgramTextured.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextured, "uMVMatrix");
        this.shaderProgramTextured.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramTextured, "uMVINVMatrix");

        this.shaderProgramTextured.fog_start = this.gl.getUniformLocation(this.shaderProgramTextured, "fog_start");
        this.shaderProgramTextured.fog_end = this.gl.getUniformLocation(this.shaderProgramTextured, "fog_end");
        this.shaderProgramTextured.fogColour = this.gl.getUniformLocation(this.shaderProgramTextured, "fogColour");

        this.shaderProgramTextured.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane0");
        this.shaderProgramTextured.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane1");
        this.shaderProgramTextured.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane2");
        this.shaderProgramTextured.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane3");
        this.shaderProgramTextured.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane4");
        this.shaderProgramTextured.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane5");
        this.shaderProgramTextured.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane6");
        this.shaderProgramTextured.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramTextured, "clipPlane7");
        this.shaderProgramTextured.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramTextured, "nClipPlanes");

        this.shaderProgramTextured.valueMap = this.gl.getUniformLocation(this.shaderProgramTextured, "valueMap");
        this.shaderProgramTextured.colorMap = this.gl.getUniformLocation(this.shaderProgramTextured, "colorMap");
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

        this.shaderProgram.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexTexture");
        if(this.shaderProgram.vertexTextureAttribute>1) this.gl.enableVertexAttribArray(this.shaderProgram.vertexTextureAttribute);

        this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
        this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
        this.shaderProgram.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVINVMatrix");
        this.shaderProgram.textureMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "TextureMatrix");

        this.shaderProgram.fog_start = this.gl.getUniformLocation(this.shaderProgram, "fog_start");
        this.shaderProgram.fog_end = this.gl.getUniformLocation(this.shaderProgram, "fog_end");
        this.shaderProgram.fogColour = this.gl.getUniformLocation(this.shaderProgram, "fogColour");
        this.shaderProgram.ShadowMap = this.gl.getUniformLocation(this.shaderProgram, "ShadowMap");
        this.shaderProgram.SSAOMap = this.gl.getUniformLocation(this.shaderProgram, "SSAOMap");
        this.shaderProgram.edgeDetectMap = this.gl.getUniformLocation(this.shaderProgram, "edgeDetectMap");
        this.shaderProgram.xPixelOffset = this.gl.getUniformLocation(this.shaderProgram, "xPixelOffset");
        this.shaderProgram.yPixelOffset = this.gl.getUniformLocation(this.shaderProgram, "yPixelOffset");
        this.shaderProgram.xSSAOScaling = this.gl.getUniformLocation(this.shaderProgram, "xSSAOScaling");
        this.shaderProgram.ySSAOScaling = this.gl.getUniformLocation(this.shaderProgram, "ySSAOScaling");
        this.shaderProgram.doShadows = this.gl.getUniformLocation(this.shaderProgram, "doShadows");
        this.shaderProgram.doSSAO = this.gl.getUniformLocation(this.shaderProgram, "doSSAO");
        this.shaderProgram.doEdgeDetect = this.gl.getUniformLocation(this.shaderProgram, "doEdgeDetect");
        this.shaderProgram.occludeDiffuse = this.gl.getUniformLocation(this.shaderProgram, "occludeDiffuse");
        this.shaderProgram.doPerspective = this.gl.getUniformLocation(this.shaderProgram, "doPerspective");
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
        this.shaderProgram.screenZ = this.gl.getUniformLocation(this.shaderProgram, "screenZFrag");

        this.shaderProgram.peelNumber = this.gl.getUniformLocation(this.shaderProgram, "peelNumber");
        this.shaderProgram.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgram, "depthPeelSamplers");
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

        this.shaderProgramInstanced.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexTexture");
        if(this.shaderProgramInstanced.vertexTextureAttribute>1) this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexTextureAttribute);

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
        this.shaderProgramInstanced.SSAOMap = this.gl.getUniformLocation(this.shaderProgramInstanced, "SSAOMap");
        this.shaderProgramInstanced.edgeDetectMap = this.gl.getUniformLocation(this.shaderProgramInstanced, "edgeDetectMap");
        this.shaderProgramInstanced.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramInstanced, "xPixelOffset");
        this.shaderProgramInstanced.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramInstanced, "yPixelOffset");
        this.shaderProgramInstanced.xSSAOScaling = this.gl.getUniformLocation(this.shaderProgramInstanced, "xSSAOScaling");
        this.shaderProgramInstanced.ySSAOScaling = this.gl.getUniformLocation(this.shaderProgramInstanced, "ySSAOScaling");
        this.shaderProgramInstanced.doShadows = this.gl.getUniformLocation(this.shaderProgramInstanced, "doShadows");
        this.shaderProgramInstanced.doSSAO = this.gl.getUniformLocation(this.shaderProgramInstanced, "doSSAO");
        this.shaderProgramInstanced.doEdgeDetect = this.gl.getUniformLocation(this.shaderProgramInstanced, "doEdgeDetect");
        this.shaderProgramInstanced.occludeDiffuse = this.gl.getUniformLocation(this.shaderProgramInstanced, "occludeDiffuse");
        this.shaderProgramInstanced.doPerspective = this.gl.getUniformLocation(this.shaderProgramInstanced, "doPerspective");
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
        this.shaderProgramInstanced.screenZ = this.gl.getUniformLocation(this.shaderProgramInstanced, "screenZFrag");

        this.shaderProgramInstanced.peelNumber = this.gl.getUniformLocation(this.shaderProgramInstanced, "peelNumber");
        this.shaderProgramInstanced.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgramInstanced, "depthPeelSamplers");
    }

    initGBufferThickLineNormalShaders(vertexShader, fragmentShader) {
        //initGBufferThickLineNormalShaders
        this.shaderProgramGBuffersThickLinesNormal = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramGBuffersThickLinesNormal, vertexShader);
        this.gl.attachShader(this.shaderProgramGBuffersThickLinesNormal, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramGBuffersThickLinesNormal, 0, "aVertexPosition");
        //this.gl.bindAttribLocation(this.shaderProgramGBuffersThickLinesNormal, 1, "aVertexColour");
        //this.gl.bindAttribLocation(this.shaderProgramGBuffersThickLinesNormal, 2, "aVertexNormal");
        //this.gl.bindAttribLocation(this.shaderProgramGBuffersThickLinesNormal, 8, "aVertexRealNormal");//4,5,6,7 Give wrong normals. Why?
        this.gl.linkProgram(this.shaderProgramGBuffersThickLinesNormal);

        if (!this.gl.getProgramParameter(this.shaderProgramGBuffersThickLinesNormal, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders (initGBufferThickLineNormalShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramGBuffersThickLinesNormal));
        }

        this.gl.useProgram(this.shaderProgramGBuffersThickLinesNormal);

        this.shaderProgramGBuffersThickLinesNormal.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersThickLinesNormal, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersThickLinesNormal.vertexPositionAttribute);

        this.shaderProgramGBuffersThickLinesNormal.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersThickLinesNormal, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramGBuffersThickLinesNormal.vertexNormalAttribute);

        this.shaderProgramGBuffersThickLinesNormal.vertexRealNormalAttribute = this.gl.getAttribLocation(this.shaderProgramGBuffersThickLinesNormal, "aVertexRealNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramGBuffersThickLinesNormal.vertexRealNormalAttribute);

        this.shaderProgramGBuffersThickLinesNormal.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "uPMatrix");
        this.shaderProgramGBuffersThickLinesNormal.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "uMVMatrix");
        this.shaderProgramGBuffersThickLinesNormal.mvInvMatrixUniform = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "uMVINVMatrix");
        this.shaderProgramGBuffersThickLinesNormal.screenZ = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "screenZ");

        this.shaderProgramGBuffersThickLinesNormal.clipPlane0 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane0");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane1 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane1");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane2 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane2");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane3 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane3");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane4 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane4");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane5 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane5");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane6 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane6");
        this.shaderProgramGBuffersThickLinesNormal.clipPlane7 = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "clipPlane7");
        this.shaderProgramGBuffersThickLinesNormal.nClipPlanes = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "nClipPlanes");

        this.shaderProgramGBuffersThickLinesNormal.pixelZoom = this.gl.getUniformLocation(this.shaderProgramGBuffersThickLinesNormal, "pixelZoom");

    }

    initThickLineNormalShaders(vertexShader, fragmentShader) {

        this.shaderProgramThickLinesNormal = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgramThickLinesNormal, vertexShader);
        this.gl.attachShader(this.shaderProgramThickLinesNormal, fragmentShader);
        this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 0, "aVertexPosition");
        //this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 1, "aVertexColour");
        //this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 2, "aVertexNormal");
        //this.gl.bindAttribLocation(this.shaderProgramThickLinesNormal, 8, "aVertexRealNormal");//4,5,6,7 Give wrong normals. Why?
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
        this.shaderProgramThickLinesNormal.SSAOMap = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "SSAOMap");
        this.shaderProgramThickLinesNormal.edgeDetectMap = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "edgeDetectMap");
        this.shaderProgramThickLinesNormal.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "xPixelOffset");
        this.shaderProgramThickLinesNormal.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "yPixelOffset");
        this.shaderProgramThickLinesNormal.doShadows = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "doShadows");
        this.shaderProgramThickLinesNormal.doSSAO = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "doSSAO");
        this.shaderProgramThickLinesNormal.doEdgeDetect = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "doEdgeDetect");
        this.shaderProgramThickLinesNormal.xSSAOScaling = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "xSSAOScaling");
        this.shaderProgramThickLinesNormal.ySSAOScaling = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "ySSAOScaling");
        this.shaderProgramThickLinesNormal.occludeDiffuse = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "occludeDiffuse");
        this.shaderProgramThickLinesNormal.doPerspective = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "doPerspective");
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

        this.shaderProgramThickLinesNormal.peelNumber = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "peelNumber");
        this.shaderProgramThickLinesNormal.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgramThickLinesNormal, "depthPeelSamplers");

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

        this.shaderProgramThickLines.peelNumber = this.gl.getUniformLocation(this.shaderProgramThickLines, "peelNumber");
        this.shaderProgramThickLines.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgramThickLines, "depthPeelSamplers");
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

        this.shaderProgramLines.vertexNormalAttribute = -1;

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

        this.shaderProgramLines.peelNumber = this.gl.getUniformLocation(this.shaderProgramLines, "peelNumber");
        this.shaderProgramLines.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgramLines, "depthPeelSamplers");

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
        //this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.vertexPositionAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.vertexColourAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.vertexColourAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "aVertexTexture");
        //this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.vertexTextureAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.offsetAttribute = this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "offset");
        //this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.offsetAttribute);

        this.shaderDepthShadowProgramPerfectSpheres.sizeAttribute= this.gl.getAttribLocation(this.shaderDepthShadowProgramPerfectSpheres, "size");
        //this.gl.enableVertexAttribArray(this.shaderDepthShadowProgramPerfectSpheres.sizeAttribute);

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
            alert("Could not initialise shaders (initPerfectSphereOutlineShaders)");
            console.log(this.gl.getProgramInfoLog(this.shaderProgramPerfectSpheresOutline));
        }

        this.gl.useProgram(this.shaderProgramPerfectSpheresOutline);

        this.shaderProgramPerfectSpheresOutline.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexPosition");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexPositionAttribute);

        this.shaderProgramPerfectSpheresOutline.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexNormalAttribute);

        this.shaderProgramPerfectSpheresOutline.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexColourAttribute);

        this.shaderProgramPerfectSpheresOutline.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "aVertexTexture");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.vertexTextureAttribute);

        this.shaderProgramPerfectSpheresOutline.offsetAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "offset");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.offsetAttribute);

        this.shaderProgramPerfectSpheresOutline.sizeAttribute= this.gl.getAttribLocation(this.shaderProgramPerfectSpheresOutline, "size");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheresOutline.sizeAttribute);

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
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexPositionAttribute);

        this.shaderProgramPerfectSpheres.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexNormalAttribute);

        this.shaderProgramPerfectSpheres.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexColourAttribute);

        this.shaderProgramPerfectSpheres.vertexTextureAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "aVertexTexture");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.vertexTextureAttribute);

        this.shaderProgramPerfectSpheres.offsetAttribute = this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "offset");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.offsetAttribute);

        this.shaderProgramPerfectSpheres.sizeAttribute= this.gl.getAttribLocation(this.shaderProgramPerfectSpheres, "size");
        //this.gl.enableVertexAttribArray(this.shaderProgramPerfectSpheres.sizeAttribute);

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
        this.shaderProgramPerfectSpheres.SSAOMap = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "SSAOMap");
        this.shaderProgramPerfectSpheres.edgeDetectMap = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "edgeDetectMap");
        this.shaderProgramPerfectSpheres.xPixelOffset = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "xPixelOffset");
        this.shaderProgramPerfectSpheres.yPixelOffset = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "yPixelOffset");
        this.shaderProgramPerfectSpheres.xSSAOScaling = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "xSSAOScaling");
        this.shaderProgramPerfectSpheres.ySSAOScaling = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "ySSAOScaling");
        this.shaderProgramPerfectSpheres.doShadows = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "doShadows");
        this.shaderProgramPerfectSpheres.doSSAO = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "doSSAO");
        this.shaderProgramPerfectSpheres.doEdgeDetect = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "doEdgeDetect");
        this.shaderProgramPerfectSpheres.occludeDiffuse = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "occludeDiffuse");
        this.shaderProgramPerfectSpheres.doPerspective = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "doPerspective");
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

        this.shaderProgramPerfectSpheres.peelNumber = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "peelNumber");
        this.shaderProgramPerfectSpheres.depthPeelSamplers = this.gl.getUniformLocation(this.shaderProgramPerfectSpheres, "depthPeelSamplers");
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
        //this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexPositionAttribute);

        this.shaderProgramImages.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramImages, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexNormalAttribute);

        this.shaderProgramImages.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramImages, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexColourAttribute);

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
        //this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexPositionAttribute);

        this.shaderProgramTwoDShapes.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramTwoDShapes, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexNormalAttribute);

        this.shaderProgramTwoDShapes.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramTwoDShapes, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderProgramTwoDShapes.vertexColourAttribute);

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
        //this.gl.enableVertexAttribArray(this.shaderProgramPointSpheresShadow.vertexPositionAttribute);

        this.shaderProgramPointSpheresShadow.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheresShadow, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramPointSpheresShadow.vertexNormalAttribute);

        this.shaderProgramPointSpheresShadow.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheresShadow, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderProgramPointSpheresShadow.vertexColourAttribute);

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
        //this.gl.enableVertexAttribArray(this.shaderProgramPointSpheres.vertexPositionAttribute);

        this.shaderProgramPointSpheres.vertexNormalAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheres, "aVertexNormal");
        //this.gl.enableVertexAttribArray(this.shaderProgramPointSpheres.vertexNormalAttribute);

        this.shaderProgramPointSpheres.vertexColourAttribute = this.gl.getAttribLocation(this.shaderProgramPointSpheres, "aVertexColour");
        //this.gl.enableVertexAttribArray(this.shaderProgramPointSpheres.vertexColourAttribute);

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
    setLightUniforms(program,transform=true) {
        if(transform) {
            let light_position = vec3.create();
            vec3.transformMat4(light_position, this.light_positions, this.mvInvMatrix);
            NormalizeVec3(light_position);
            this.gl.uniform4fv(program.light_positions, new Float32Array([light_position[0],light_position[1],light_position[2],1.0]));
        } else {
            this.gl.uniform4fv(program.light_positions, this.light_positions);
        }
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
        const print_timing = false

        const tbb1 = performance.now()
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
                    if(!this.displayBuffers[idx].customColour || this.displayBuffers[idx].customColour.length!==4){
                        if(this.displayBuffers[idx].triangleColourBuffer[j]){
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.displayBuffers[idx].triangleColours[j]), this.gl.STATIC_DRAW);
                            this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        }
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
                    if(!this.displayBuffers[idx].customColour || this.displayBuffers[idx].customColour.length!==4){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(Colours_new), this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        this.displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;
                    }

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;

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
                    const size = this.mapLineWidth;//1.0;
                    const useIndices = this.displayBuffers[idx].supplementary["useIndices"];
                    let thickLines;
                    const t1 = performance.now()
                    let doColour = false;
                    if(!this.displayBuffers[idx].customColour || this.displayBuffers[idx].customColour.length!==4){
                        doColour = true;
                    }
                    if (useIndices) {
                        thickLines = this.linesToThickLinesWithIndicesAndNormals(this.displayBuffers[idx].triangleVertices[j], this.displayBuffers[idx].triangleNormals[j], this.displayBuffers[idx].triangleColours[j], this.displayBuffers[idx].triangleIndexs[j], size, doColour);
                    } else {
                        console.log("************************************************************");
                        console.log("************************************************************");
                        console.log("RETURNING BECAUSE NO INDICES");
                        console.log("************************************************************");
                        console.log("************************************************************");
                        return;
                    }
                    const t2 = performance.now()
                    if(print_timing) console.log("linesToThickLines",t2-t1)
                    const Normals_new = thickLines["normals"];
                    const RealNormals_new = thickLines["realNormals"];
                    const Vertices_new = thickLines["vertices"];
                    const Colours_new = thickLines["colours"];
                    const Indexs_new = thickLines["indices"];
                    const tsa = performance.now()
                    const RealNormals_new_array =  RealNormals_new
                    const Normals_new_array =  Normals_new
                    const Vertices_new_array =  Vertices_new
                    const Colours_new_array =  Colours_new
                    const Indexs_new_array = Indexs_new
                    const tea = performance.now()
                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, Indexs_new_array, this.gl.DYNAMIC_DRAW);
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexRealNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, RealNormals_new_array, this.gl.DYNAMIC_DRAW);
                    this.displayBuffers[idx].triangleVertexRealNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, Normals_new_array, this.gl.DYNAMIC_DRAW);
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, Vertices_new_array, this.gl.DYNAMIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    if(doColour){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, Colours_new_array, this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        this.displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;
                    }
                    const teb = performance.now()
                    if(print_timing) console.log("make typed arrays",tea-tsa)
                    if(print_timing) console.log("buffer arrays",teb-tea)

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexRealNormalBuffer[j].numItems = RealNormals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;
                    const t3 = performance.now()
                    if(print_timing) console.log("buffering",t3-t2,j)

                } else if (this.displayBuffers[idx].bufferTypes[j] === "LINES") {
                    let size = this.mapLineWidth;
                    const useIndices = this.displayBuffers[idx].supplementary["useIndices"][0];
                    let thickLines;

                    let doColour = false;
                    if(!this.displayBuffers[idx].customColour || this.displayBuffers[idx].customColour.length!==4){
                        doColour = true;
                    }

                    const t1 = performance.now()
                    if (useIndices) {
                        thickLines = this.linesToThickLinesWithIndices(this.displayBuffers[idx].triangleVertices[j], this.displayBuffers[idx].triangleColours[j], this.displayBuffers[idx].triangleIndexs[j], size, null, doColour);
                    } else {
                        thickLines = this.linesToThickLines(this.displayBuffers[idx].triangleVertices[j], this.displayBuffers[idx].triangleColours[j], size);
                    }
                    const t2 = performance.now()
                    if(print_timing) console.log("linesToThickLines",t2-t1)

                    let Normals_new = thickLines["normals"];
                    let Vertices_new = thickLines["vertices"];
                    let Colours_new = thickLines["colours"];
                    let Indexs_new = thickLines["indices"];

                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, Indexs_new, this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, Normals_new, this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, Vertices_new, this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    if(doColour){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, Colours_new, this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        this.displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;
                    }

                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;

                } else {

                    let triangleNormals
                    let triangleColours
                    let triangleVertices
                    let triangleIndexs

                    let doColour = false;
                    if(!this.displayBuffers[idx].customColour || this.displayBuffers[idx].customColour.length!==4){
                        doColour = true;
                    }
                    //console.log("DEBUG: buildBuffers normals", this.displayBuffers[idx].triangleNormals[j])
                    //console.log("DEBUG: buildBuffers colours", this.displayBuffers[idx].triangleColours[j])
                    //console.log("DEBUG: buildBuffers positions", this.displayBuffers[idx].triangleVertices[j])
                    //console.log("DEBUG: buildBuffers indices", this.displayBuffers[idx].triangleIndexs[j])
                    //console.log("DEBUG: buildBuffers doColour", doColour,this.displayBuffers[idx].customColour)

                    if(ArrayBuffer.isView(this.displayBuffers[idx].triangleNormals[j])){
                        triangleNormals = this.displayBuffers[idx].triangleNormals[j]
                    } else {
                        triangleNormals = new Float32Array(this.displayBuffers[idx].triangleNormals[j])
                    }
                    if(ArrayBuffer.isView(this.displayBuffers[idx].triangleVertices[j])){
                        triangleVertices = this.displayBuffers[idx].triangleVertices[j]
                    } else {
                        triangleVertices = new Float32Array(this.displayBuffers[idx].triangleVertices[j])
                    }
                    if(ArrayBuffer.isView(this.displayBuffers[idx].triangleColours[j])){
                        triangleColours = this.displayBuffers[idx].triangleColours[j]
                    } else if(doColour) {
                        triangleColours = new Float32Array(this.displayBuffers[idx].triangleColours[j])
                    }
                    if(ArrayBuffer.isView(this.displayBuffers[idx].triangleIndexs[j])){
                        triangleIndexs = this.displayBuffers[idx].triangleIndexs[j]
                    } else {
                        triangleIndexs = new Uint32Array(this.displayBuffers[idx].triangleIndexs[j])
                    }

                    this.displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = triangleNormals.length / 3;
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = triangleVertices.length / 3;
                    this.displayBuffers[idx].triangleColourBuffer[j].numItems = this.displayBuffers[idx].triangleColours[j].length / 4;
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = triangleIndexs.length;

                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (this.ext) {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, triangleIndexs, this.gl.STATIC_DRAW);
                    } else {
                        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.displayBuffers[idx].triangleIndexs[j]), this.gl.STATIC_DRAW);
                    }
                    this.displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    if (this.displayBuffers[idx].bufferTypes[j] !== "NORMALLINES" && this.displayBuffers[idx].bufferTypes[j] !== "LINES" && this.displayBuffers[idx].bufferTypes[j] !== "LINE_LOOP" && this.displayBuffers[idx].bufferTypes[j] !== "LINE_STRIP" && this.displayBuffers[idx].bufferTypes[j] !== "POINTS" && this.displayBuffers[idx].bufferTypes[j] !== "POINTS_SPHERES" && this.displayBuffers[idx].bufferTypes[j] !== "CAPCYLINDERS" && this.displayBuffers[idx].bufferTypes[j] !== "SPHEROIDS" && this.displayBuffers[idx].bufferTypes[j] !== "TORUSES" && this.displayBuffers[idx].bufferTypes[j] !== "CIRCLES") {
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexNormalBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangleNormals, this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    }
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, triangleVertices, this.gl.STATIC_DRAW);
                    this.displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    if(doColour){
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangleColours, this.gl.STATIC_DRAW);
                        this.displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                    }
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
            const tl = performance.now()
            if(print_timing) console.log("Time at end of loop",tl-tbb1);
        }
        //console.log("Time to build buffers: "+(new Date().getTime()-start));

        const tbb2 = performance.now()
        if(print_timing) console.log("Time in buidBuffers",tbb2-tbb1)
    }

    drawTransformMatrixInteractive(transformMatrix:number[], transformOrigin:number[], buffer:any, shader:MGWebGLShader, vertexType:number, bufferIdx:number, specialDrawBuffer?:number) {

        this.setupModelViewTransformMatrixInteractive(transformMatrix, transformOrigin, buffer, shader, vertexType, bufferIdx, specialDrawBuffer);

        this.drawBuffer(buffer,shader,bufferIdx,vertexType,specialDrawBuffer);

        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix);
        this.gl.uniformMatrix4fv(shader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
    }

    applySymmetryMatrix(theShader,symmetryMatrix,tempMVMatrix,tempMVInvMatrix,doTransform=true){
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

        if(doTransform){
            let light_position = vec3.create();
            vec3.transformMat4(light_position, this.light_positions, tempMVInvMatrix);
            NormalizeVec3(light_position);
            this.gl.uniform4fv(theShader.light_positions, new Float32Array([light_position[0],light_position[1],light_position[2],1.0]));
        }

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
                    if(theShader.vertexColourAttribute>-1){
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
                    if(this.doAnaglyphStereo) {
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        this.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                    }
                    this.gl.drawElementsInstanced(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                } else {
                    this.instanced_ext.drawElementsInstancedANGLE(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0, theBuffer.triangleInstanceOriginBuffer[j].numItems);
                }
                if(theBuffer.symmetryMatrices.length>0){
                    if(theShader.vertexColourAttribute>-1&&theBuffer.changeColourWithSymmetry){
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        if(bright_y>0.5)
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                        else
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                    }

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
                    this.setLightUniforms(theShader);
                    this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, this.mvMatrix);// All else
                    this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                    if(theShader.vertexColourAttribute>-1) this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
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
                if(theShader.vertexColourAttribute>-1){
                    if (this.WEBGL2) {
                        this.gl.vertexAttribDivisor(theShader.vertexColourAttribute, 0);
                    } else {
                        this.instanced_ext.vertexAttribDivisorANGLE(theShader.vertexColourAttribute, 0);
                    }
                }
            } else {
                const theShader = theShaderIn as MGWebGLShader;
                if (this.WEBGL2) {
                    if(this.doAnaglyphStereo) {
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        this.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                        this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                    }
                    this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
                } else {
                    this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
                }
                if(theBuffer.symmetryMatrices.length>0){
                    if(theShader.vertexColourAttribute>-1&&theBuffer.changeColourWithSymmetry){
                        this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                        if(bright_y>0.5)
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                        else
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                    }
                    let tempMVMatrix = mat4.create();
                    let tempMVInvMatrix = mat4.create();
                    for (let isym = 0; isym < theBuffer.symmetryMatrices.length; isym++) {

                        this.applySymmetryMatrix(theShader,theBuffer.symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix)
                        if (this.WEBGL2) {
                            if(this.doAnaglyphStereo) {
                                this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                                this.gl.vertexAttribDivisor(theShader.vertexColourAttribute,0);
                                this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                            }
                            this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
                        } else {
                            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_INT, 0);
                        }

                    }
                    this.setLightUniforms(theShader);
                    this.gl.uniformMatrix4fv(theShader.mvMatrixUniform, false, this.mvMatrix);// All else
                    this.gl.uniformMatrix4fv(theShader.mvInvMatrixUniform, false, this.mvInvMatrix);// All else
                    if(theShader.vertexColourAttribute>-1) this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                }
            }
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
    }

    drawMaxElementsUInt(vertexType, numItems) {

        if(numItems<this.max_elements_indices){
            this.gl.drawElements(vertexType, numItems, this.gl.UNSIGNED_INT, 0);
        } else {
            let inum=0;
            for( ; inum <  numItems / this.max_elements_indices-1; inum++){
                this.gl.drawElements(vertexType, this.max_elements_indices, this.gl.UNSIGNED_INT, inum*this.max_elements_indices*4);
            }
            if((numItems % this.max_elements_indices)>0){
                this.gl.drawElements(vertexType, numItems % this.max_elements_indices, this.gl.UNSIGNED_INT, inum*this.max_elements_indices*4);
            }
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
            this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
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
            this.drawMaxElementsUInt(vertexType, drawBuffer.numItems);
        } else {
            this.gl.drawElements(vertexType, drawBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
        }
        this.gl.uniformMatrix4fv(shader.pMatrixUniform, false, this.pmvMatrix); // Lines
        this.gl.uniformMatrix4fv(shader.mvMatrixUniform, false, this.mvMatrix); // Lines
        this.gl.uniform3fv(shader.screenZ, this.screenZ); // Lines

    }

    GLrender(calculatingShadowMap,doClear=true,ratioMult=1.0) {
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult;

        let fb_scale = 1.0

        if (calculatingShadowMap) {
            if(!this.offScreenReady)
                this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            const width_ratio = this.gl.viewportWidth / this.rttFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.rttFramebuffer.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebufferDepth);
            this.gl.viewport(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio);
        } else if(this.drawingGBuffers) {
            const width_ratio = this.gl.viewportWidth / this.gFramebuffer.width;
            const height_ratio = this.gl.viewportHeight / this.gFramebuffer.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gl.viewport(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio);
        } else if(this.renderSilhouettesToTexture) {
            if(!this.silhouetteBufferReady)
                this.recreateSilhouetteBuffers();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.silhouetteFramebuffer);
            let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        } else if(this.doDepthPeelPass) {
            this.gl.viewport(0, 0, this.depthPeelFramebuffers[0].width, this.depthPeelFramebuffers[0].height);
        } else if(this.renderToTexture) {
            if(!this.screenshotBuffersReady)
                this.initTextureFramebuffer();
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(this.gl.LESS);
            let viewport_start_x = Math.trunc(this.currentViewport[0] * this.rttFramebuffer.width  / this.gl.viewportWidth)
            let viewport_start_y = Math.trunc(this.currentViewport[1] * this.rttFramebuffer.height / this.gl.viewportHeight)
            let viewport_width =   Math.trunc(this.currentViewport[2] * this.rttFramebuffer.width  / this.gl.viewportWidth)
            let viewport_height =  Math.trunc(this.currentViewport[3] * this.rttFramebuffer.height / this.gl.viewportHeight)
            this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
            if(this.gl.viewportWidth>this.gl.viewportHeight){
                fb_scale = this.gl.viewportWidth/this.gl.viewportHeight
                const hp = this.gl.viewportHeight/this.gl.viewportWidth * this.rttFramebuffer.width
                const b = 0.5*(this.rttFramebuffer.height - hp)
                const vh = this.currentViewport[3] * this.rttFramebuffer.width  / this.gl.viewportWidth
                const bp = this.currentViewport[1] * this.rttFramebuffer.width  / this.gl.viewportWidth
                viewport_height = vh
                viewport_start_y = bp + b
            } else {
                fb_scale = this.gl.viewportWidth/this.gl.viewportHeight
                const wp = this.gl.viewportWidth/this.gl.viewportHeight * this.rttFramebuffer.height
                const b = 0.5*(this.rttFramebuffer.width - wp)
                const vw = this.currentViewport[2] * this.rttFramebuffer.width  / this.gl.viewportHeight
                const bp = this.currentViewport[0] * this.rttFramebuffer.width  / this.gl.viewportHeight
                console.log(wp,b,viewport_height,vw)
                viewport_width = vw
                viewport_start_x =  bp + b
            }
            this.gl.viewport(viewport_start_x,viewport_start_y,viewport_width,viewport_height);
            } else {
                this.gl.viewport(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height);
            }
            let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            if(this.useOffScreenBuffers&&this.WEBGL2){
                if(!this.offScreenReady)
                    this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
                let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
            }
            this.gl.viewport(this.currentViewport[0], this.currentViewport[1], this.currentViewport[2], this.currentViewport[3]);
        }

        if(this.renderSilhouettesToTexture||this.drawingGBuffers||(this.renderToTexture&&this.transparentScreenshotBackground)) {
            this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0);
        } else {
            this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        }
        if(this.doStenciling){
            if(!this.stenciling){
                this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            }
        } else {
            if(doClear) this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }

        mat4.identity(this.mvMatrix);

        const oldQuat = quat4.clone(this.myQuat);
        const newQuat = quat4.clone(this.myQuat);

        if (calculatingShadowMap) {

            let min_x =  1e5;
            let max_x = -1e5;
            let min_y =  1e5;
            let max_y = -1e5;
            let min_z =  1e5;
            let max_z = -1e5;

            this.displayBuffers.forEach(buffer => {
                if (buffer.visible) {
                    buffer.atoms.forEach(atom => {
                        if(atom.x>max_x) max_x = atom.x;
                        if(atom.x<min_x) min_x = atom.x;
                        if(atom.y>max_y) max_y = atom.y;
                        if(atom.y<min_y) min_y = atom.y;
                        if(atom.z>max_z) max_z = atom.z;
                        if(atom.z<min_z) min_z = atom.z;
                    })
                }
            })
            let atom_span = Math.sqrt((max_x - min_x) * (max_x - min_x) + (max_y - min_y) * (max_y - min_y) +(max_z - min_z) * (max_z - min_z));
            atom_span = Math.min(1000.0,atom_span);
            this.atom_span = atom_span;
            const shadowExtent = Math.max(170.0,atom_span); // 170. ??

            //The extent (atom_span) should probably be scaled to viewable area - lets see if we can calculate that.
            //But, the angle of the light is important ...

            let d = Math.min(48*this.zoom,atom_span)

            let rotX = quat4.create();
            quat4.set(rotX, 0, 0, 0, -1);
            const zprime = vec3Create([this.light_positions[0], this.light_positions[1], this.light_positions[2]]);
            NormalizeVec3(zprime);
            const zorig = vec3Create([0.0, 0.0, 1.0]);
            const dp = vec3.dot(zprime, zorig);
            let tanA = 0.0;
            if ((1.0 - dp) > 1e-6) {
                const axis = vec3.create();
                vec3Cross(zprime, zorig, axis);
                NormalizeVec3(axis);
                const angle = -Math.acos(dp);
                const dval3 = Math.cos(angle / 2.0);
                const dval0 = axis[0] * Math.sin(angle / 2.0);
                const dval1 = axis[1] * Math.sin(angle / 2.0);
                const dval2 = axis[2] * Math.sin(angle / 2.0);
                rotX = quat4.create();
                quat4.set(rotX, dval0, dval1, dval2, dval3);
                quat4.multiply(newQuat, newQuat, rotX);
                tanA = Math.tan(angle)
            }

            let excess = Math.abs(shadowExtent*tanA);
            if(this.doPerspectiveProjection){
                excess += 150; // ?? It works.
            }
            d += excess;

            mat4.ortho(this.pMatrix, -d * ratio, d * ratio, -d, d, 0.1, 1000.);
            mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, -atom_span]);

            this.gl.disable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.FRONT);
        } else {
            this.gl.disable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.BACK);
            if(this.renderToTexture){
                //FIXME - drawingGBuffers stanza?
                if(this.doPerspectiveProjection){
                    //FIXME - with  multiviews
                    mat4.perspective(this.pMatrix, 1.0, 1.0, 100., 1270.0);
                } else {
                    const f = this.gl_clipPlane0[3]+this.fogClipOffset;
                    const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
                    if(this.currentViewport[2] > this.currentViewport[3]){
                        if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
                            mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                        } else {
                            mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, -f, b);
                        }
                    } else {
                        mat4.ortho(this.pMatrix, -24*ratioMult*fb_scale, 24*ratioMult*fb_scale, -24, 24, -f, b);
                    }
                }
            } else {
                if(this.doPerspectiveProjection){
                    mat4.perspective(this.pMatrix, 1.0, this.gl.viewportWidth / this.gl.viewportHeight, 100., 1270.0);
                } else {
                    const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
                    const f = this.gl_clipPlane0[3]+this.fogClipOffset;
                    mat4.ortho(this.pMatrix, -24 * ratio, 24 * ratio, -24, 24, -f, b);
                }
            }

            mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, -this.fogClipOffset]);

        }

        this.myQuat = quat4.clone(newQuat);
        const theMatrix = quatToMat4(this.myQuat);

        mat4.multiply(this.mvMatrix, this.mvMatrix, theMatrix);

        mat4.identity(this.mvInvMatrix);

        const invQuat = quat4.create();
        quat4Inverse(this.myQuat, invQuat);

        const invMat = quatToMat4(invQuat);
        this.mvInvMatrix = invMat;

        const right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        const up = vec3.create();
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

        if(this.doPerspectiveProjection){
            //FIXME - What is the justificatio of 5.7? (Approximately tan(acos(48./270.)), but not quite close enough)....
            let perspMult = 1.0;
            if(this.renderToTexture){
                if(this.gl.viewportWidth > this.gl.viewportHeight){
                    perspMult = 1.0 / ratio;
                }
            }
            mat4.scale(this.pMatrix, this.pMatrix, [perspMult * 5.7 / this.zoom, perspMult * 5.7 / this.zoom, 1.0]);
        } else {
            mat4.scale(this.pMatrix, this.pMatrix, [1. / this.zoom, 1. / this.zoom, 1.0]);
        }
        mat4.translate(this.mvMatrix, this.mvMatrix, this.origin);

        this.pmvMatrix = mat4.create();
        mat4.multiply(this.pmvMatrix, this.pMatrix, this.mvMatrix);

        this.gl.useProgram(this.shaderProgramGBuffers);
        this.setMatrixUniforms(this.shaderProgramGBuffers);

        this.gl.useProgram(this.shaderProgramGBuffersInstanced);
        this.setMatrixUniforms(this.shaderProgramGBuffersInstanced);

        this.gl.useProgram(this.shaderProgramGBuffersPerfectSpheres);
        this.setMatrixUniforms(this.shaderProgramGBuffersPerfectSpheres);

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

        this.gl.useProgram(this.shaderProgramGBuffers);
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffers.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramGBuffersInstanced);
        this.gl.enableVertexAttribArray(this.shaderProgramGBuffersInstanced.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramOutline);
        this.gl.enableVertexAttribArray(this.shaderProgramOutline.vertexNormalAttribute);

        //this.gl.useProgram(this.shaderProgramInstancedOutline);
        //this.gl.enableVertexAttribArray(this.shaderProgramInstancedOutline.vertexNormalAttribute);

        this.gl.useProgram(this.shaderProgramInstanced);
        this.gl.enableVertexAttribArray(this.shaderProgramInstanced.vertexNormalAttribute);

        if(this.doDepthPeelPass||(this.drawingGBuffers&&this.doPerspectiveProjection)){
            this.gl.disable(this.gl.BLEND);
        } else {
            this.gl.enable(this.gl.BLEND);
        }

        if(this.drawingGBuffers){
            this.drawTriangles(calculatingShadowMap, invMat);
            return;
        }

        this.drawTriangles(calculatingShadowMap, invMat);

        if(!calculatingShadowMap){
            this.drawImagesAndText(invMat);
            if(!this.doPeel)
                this.drawTransparent(theMatrix);
            this.drawDistancesAndLabels(up, right);
            this.drawTextLabels(up, right);
            if(this.WEBGL2){
                this.drawTexturedShapes(theMatrix);
            }
            //this.drawCircles(up, right);
        }

        this.myQuat = quat4.clone(oldQuat);

        return invMat;

    }

    drawScene() : void {

        const theShaders = [
            this.shaderProgram,
            this.shaderProgramInstanced,
            this.shaderProgramThickLinesNormal,
            /*
            this.shaderProgramThickLines,
            this.shaderProgramLines,
            */
            this.shaderProgramPerfectSpheres
        ];

        theShaders.forEach(shader => {
            this.gl.useProgram(shader);
            this.gl.uniform1i(shader.peelNumber,-1);
        })

        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
        const oldMouseDown = this.mouseDown;

        if ((this.doEdgeDetect||this.doSSAO)&&this.WEBGL2) {
            if(this.renderToTexture) {
                this.gBuffersFramebufferSize = 4096;
                if(this.gFramebuffer){
                    this.gl.deleteFramebuffer(this.gFramebuffer);
                    this.gFramebuffer = null;
                }
                this.createGBuffers(this.gBuffersFramebufferSize,this.gBuffersFramebufferSize);
            }
            if(!this.gFramebuffer) this.createGBuffers(this.gBuffersFramebufferSize,this.gBuffersFramebufferSize);
            //console.log("Do G-buffer pass for gPosition and gNormal)")
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.gFramebuffer);
            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0,this.gl.COLOR_ATTACHMENT1]);

            // Need triangle and perfect sphere gBuffer shaders
            this.drawingGBuffers = true;
            this.gl.enable(this.gl.DEPTH_TEST);
            this.GLrender(false);
            this.drawingGBuffers = false;

            this.gl.drawBuffers([this.gl.COLOR_ATTACHMENT0]);
        }

        const f = this.gl_clipPlane0[3]+this.fogClipOffset;
        const b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);

        this.doPeel = false;
        if(this.doOrderIndependentTransparency){
            for (let idx = 0; idx < this.displayBuffers.length && !this.doPeel; idx++) {
                if (this.displayBuffers[idx].visible) {
                    let triangleVertexIndexBuffer = this.displayBuffers[idx].triangleVertexIndexBuffer;
                    for (let j = 0; j < triangleVertexIndexBuffer.length&& !this.doPeel; j++) {
                        if (this.displayBuffers[idx].transparent&&!this.displayBuffers[idx].isHoverBuffer) {
                            this.doPeel = true;
                        }
                    }
                }
            }
        }

        if (this.doEdgeDetect&&this.WEBGL2) {

            const ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;

            if(this.renderToTexture) {
                this.edgeDetectFramebufferSize = 4096;
                if(this.edgeDetectFramebuffer){
                    this.gl.deleteFramebuffer(this.edgeDetectFramebuffer);
                    this.edgeDetectFramebuffer = null;
                }
                this.createGBuffers(this.gBuffersFramebufferSize,this.gBuffersFramebufferSize);
                if(!this.edgeDetectFramebuffer) this.createEdgeDetectFramebufferBuffer(4096,4096);
            } else {
                if(!this.edgeDetectFramebuffer){
                    if(ratio>1.0)
                        this.createEdgeDetectFramebufferBuffer(this.edgeDetectFramebufferSize,this.edgeDetectFramebufferSize/ratio);
                    else
                        this.createEdgeDetectFramebufferBuffer(this.edgeDetectFramebufferSize*ratio,this.edgeDetectFramebufferSize);
                }
            }

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.edgeDetectFramebuffer);

            this.gl.useProgram(this.shaderProgramEdgeDetect);
            this.gl.uniform1i(this.shaderProgramEdgeDetect.gPositionTexture,0);
            this.gl.uniform1i(this.shaderProgramEdgeDetect.gNormalTexture,1);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.zoom,this.zoom);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.depthBufferSize,(f+b)*2.);

            this.gl.uniform1f(this.shaderProgramEdgeDetect.depthThreshold,this.depthThreshold);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.normalThreshold,this.normalThreshold);
            if(this.renderToTexture){
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleDepth,this.scaleDepth*4096./this.gl.viewportWidth*.5);
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleNormal,this.scaleNormal*4096./this.gl.viewportWidth*.5);
            } else {
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleDepth,this.scaleDepth/ratio);
                this.gl.uniform1f(this.shaderProgramEdgeDetect.scaleNormal,this.scaleNormal);
            }
            this.gl.uniform1f(this.shaderProgramEdgeDetect.xPixelOffset, 1.0/this.edgeDetectFramebuffer.width/this.zoom/ratio);
            this.gl.uniform1f(this.shaderProgramEdgeDetect.yPixelOffset, 1.0/this.edgeDetectFramebuffer.height/this.zoom/ratio);
            if(this.doPerspectiveProjection){
                this.gl.uniform1f(this.shaderProgramEdgeDetect.depthFactor, 1.0/80.0);
            } else {
                this.gl.uniform1f(this.shaderProgramEdgeDetect.depthFactor, 1.0);
            }

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramEdgeDetect.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramEdgeDetect.vertexPositionAttribute);
            //FIXME - Size
            if(this.renderToTexture) {
                this.gl.viewport(0, 0, this.edgeDetectFramebufferSize, this.edgeDetectFramebufferSize);
            } else {
                if(ratio>1.0)
                    this.gl.viewport(0, 0, this.edgeDetectFramebufferSize, this.edgeDetectFramebufferSize/ratio);
                else
                    this.gl.viewport(0, 0, this.edgeDetectFramebufferSize*ratio, this.edgeDetectFramebufferSize);
            }

            let paintMvMatrix = mat4.create();
            let paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            this.gl.uniformMatrix4fv(this.shaderProgramEdgeDetect.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramEdgeDetect.mvMatrixUniform, false, paintMvMatrix);

            this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            this.bindFramebufferDrawBuffers();

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }
        }

        if (this.doSSAO&&this.WEBGL2) {
            if(!this.ssaoFramebuffer) this.createSSAOFramebufferBuffer();
            if(!this.offScreenFramebufferSimpleBlurX) this.createSimpleBlurOffScreeenBuffers();

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.ssaoFramebuffer);
            this.gl.useProgram(this.shaderProgramSSAO);
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ssaoKernelBuffer);
            this.gl.uniform1i(this.shaderProgramSSAO.gPositionTexture,0);
            this.gl.uniform1i(this.shaderProgramSSAO.gNormalTexture,1);
            this.gl.uniform1i(this.shaderProgramSSAO.texNoiseTexture,2);

            this.gl.uniform1f(this.shaderProgramSSAO.depthBufferSize,b+f);
            if(this.doPerspectiveProjection){
                this.gl.uniform1f(this.shaderProgramSSAO.depthFactor,1.0/80.);
                this.gl.uniform1f(this.shaderProgramSSAO.radius,this.ssaoRadius*2.0);
            } else {
                this.gl.uniform1f(this.shaderProgramSSAO.depthFactor,1.0);
                this.gl.uniform1f(this.shaderProgramSSAO.radius,this.ssaoRadius);
            }

            this.gl.uniform1f(this.shaderProgramSSAO.bias,this.ssaoBias);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferPositionTexture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.gBufferNormalTexture);
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoNoiseTexture);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);
            this.gl.enableVertexAttribArray(this.shaderProgramSSAO.vertexTextureAttribute);
            this.gl.enableVertexAttribArray(this.shaderProgramSSAO.vertexPositionAttribute);
            //FIXME - Size
            this.gl.viewport(0, 0, 1024, 1024);

            let paintMvMatrix = mat4.create();
            let paintPMatrix = mat4.create();
            mat4.identity(paintMvMatrix);
            if(this.doPerspectiveProjection){
                mat4.ortho(paintPMatrix, -2.85 , 2.85 , -2.85, 2.85, 0.1, 1000.0);
            } else {
                mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);
            }
            this.gl.uniformMatrix4fv(this.shaderProgramSSAO.pMatrixUniform, false, paintPMatrix);
            this.gl.uniformMatrix4fv(this.shaderProgramSSAO.mvMatrixUniform, false, paintMvMatrix);

            this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
            this.bindFramebufferDrawBuffers();

            this.bindSSAOBuffers()

            if (this.ext) {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
            } else {
                this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
            }

            // Now blur ....

            this.textureBlur(this.offScreenFramebufferSimpleBlurX.width,this.offScreenFramebufferSimpleBlurX.height,this.ssaoTexture);

        }

        if((this.doEdgeDetect||this.doSSAO)&&this.WEBGL2) {
            //Back to normal
            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

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

        } else {
            this.gl.stencilMask(0x00);
            this.gl.disable(this.gl.STENCIL_TEST);
            this.gl.enable(this.gl.DEPTH_TEST);
            if(!this.doPeel){
                if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){

                    let multiViewGroupsKeys = []
                    const multiViewOrigins = []
                    const origQuat = quat4.clone(this.myQuat);
                    const origOrigin = this.origin

                    let quats
                    let viewports
                    let ratioMult = 1.0

                    if(this.doThreeWayView){
                        quats = this.threeWayQuats
                        viewports = this.threeWayViewports
                    } else if(this.doMultiView) {

                        let multiViewGroups = {}
                        for (let idx = 0; idx < this.displayBuffers.length; idx++) {
                            if(this.displayBuffers[idx].origin&&this.displayBuffers[idx].origin.length===3){
                                if(Object.hasOwn(this.displayBuffers[idx], "isHoverBuffer")&&!this.displayBuffers[idx].isHoverBuffer){
                                    if(!(this.displayBuffers[idx].multiViewGroup in multiViewGroups)){
                                        multiViewGroups[this.displayBuffers[idx].multiViewGroup] = this.displayBuffers[idx].multiViewGroup
                                        multiViewOrigins.push(this.displayBuffers[idx].origin)
                                    }
                                }
                            }
                        }
                        this.multiViewOrigins = multiViewOrigins
                        multiViewGroupsKeys = Object.keys(multiViewGroups)
                        if(this.multiWayViewports.length!==multiViewGroupsKeys.length&&multiViewGroupsKeys.length>0){
                            this.setupMultiWayTransformations(multiViewGroupsKeys.length)
                        }

                        quats = this.multiWayQuats
                        viewports = this.multiWayViewports
                        ratioMult = this.multiWayRatio
                    } else if(this.doSideBySideStereo) {
                        quats = this.stereoQuats
                        viewports = this.stereoViewports
                        ratioMult = 0.5
                    } else {
                        quats = this.stereoQuats.toReversed()
                        viewports = this.stereoViewports
                        ratioMult = 0.5
                    }

                    for(let i=0;i<viewports.length;i++){

                        if(this.doMultiView){
                            if(multiViewGroupsKeys.length>0){
                                this.currentMultiViewGroup = parseInt(multiViewGroupsKeys[i])
                                if(i<multiViewOrigins.length&& multiViewOrigins[i]&& multiViewOrigins[i].length===3)
                                    this.origin = multiViewOrigins[i]
                            } else {
                                continue
                            }
                        }

                        const newXQuat = quat4.clone(origQuat);
                        quat4.multiply(newXQuat, newXQuat, quats[i]);
                        this.myQuat = newXQuat
                        this.currentViewport = viewports[i]

                        const doClear = i===0 ? true : false
                        invMat = this.GLrender(false,doClear,ratioMult);
                        if (this.showAxes) {
                            this.drawAxes(invMat,ratioMult);
                        }
                        if (this.showCrosshairs) {
                            this.drawCrosshairs(invMat,ratioMult);
                        }
                        if (this.showScaleBar) {
                            this.drawScaleBar(invMat,ratioMult);
                        }
                        if(invMat&&i==0) this.drawTextOverlays(invMat,ratioMult, Math.sqrt(this.gl.viewportHeight /this.currentViewport[3]));
                        if (this.showFPS&&i==0) {
                            this.drawFPSMeter();
                        }
                    }
                    this.myQuat = origQuat
                    if(this.doMultiView&&multiViewGroupsKeys.length===0){
                        this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
                        invMat = this.GLrender(false);
                    }
                    this.origin = origOrigin
                } else {
                    this.currentViewport = [0, 0, this.gl.viewportWidth, this.gl.viewportHeight]
                    invMat = this.GLrender(false);
                }
            }
            if(this.doAnaglyphStereo){
                const origQuat = quat4.clone(this.myQuat);
                const quats = this.stereoQuats

                for(let i=0;i<quats.length;i++){
                    const newXQuat = quat4.clone(origQuat);
                    quat4.multiply(newXQuat, newXQuat, quats[i]);
                    this.myQuat = newXQuat
                    this.currentAnaglyphColor = i===0 ? [1.0,0.0,0.0,1.0] : [0.0,1.0,0.0,1.0]
                    const doClear = i===0 ? true : false
                    invMat = this.GLrender(false,doClear);
                }
                this.myQuat = origQuat
            }
        }

        if(this.doPeel){//Do depth peel
            if(this.renderToTexture) {
                console.log("Delete the normal peel buffers")
                for(let i=0;i<this.depthPeelFramebuffers.length;i++){
                    this.gl.deleteFramebuffer(this.depthPeelFramebuffers[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferDepth[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferColor[i]);
                    this.gl.deleteTexture(this.depthPeelColorTextures[i]);
                    this.gl.deleteTexture(this.depthPeelDepthTextures[i]);
                }
                this.depthPeelFramebuffers = [];
                this.recreateDepthPeelBuffers(4096,4096);
            } else {
                this.recreateDepthPeelBuffers(2048,2048);
            }

            this.gl.clear(this.gl.DEPTH_BUFFER_BIT|this.gl.COLOR_BUFFER_BIT);
            const ratio = 1.0

            if(this.depthPeelFramebuffers.length>0&&this.depthPeelFramebuffers[0].width>0&&this.depthPeelFramebuffers[0].height>0){

                this.gl.enable(this.gl.DEPTH_TEST);
                const depthPeelSampler0 = 3;

                theShaders.forEach(shader => {
                        this.gl.useProgram(shader);
                        this.gl.uniform1f(shader.xSSAOScaling, 1.0/this.depthPeelFramebuffers[0].width );
                        this.gl.uniform1f(shader.ySSAOScaling, 1.0/this.depthPeelFramebuffers[0].height );
                        this.gl.uniform1i(shader.depthPeelSamplers, depthPeelSampler0);
                        })
                this.doDepthPeelPass = true;
                this.gl.disable(this.gl.BLEND);
                this.gl.enable(this.gl.DEPTH_TEST);
                for(let ipeel=0;ipeel<4;ipeel++){
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.depthPeelFramebuffers[ipeel]);
                    this.gl.activeTexture(this.gl.TEXTURE0+depthPeelSampler0);
                    if(ipeel>0){
                        this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[ipeel-1]);
                    } else {
                        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
                    }
                    theShaders.forEach(shader => {
                            this.gl.useProgram(shader);
                            this.gl.uniform1i(shader.peelNumber,ipeel);
                            })
                    invMat = this.GLrender(false);
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
                }

                this.doDepthPeelPass = false;
                theShaders.forEach(shader => {
                        this.gl.useProgram(shader);
                        this.gl.uniform1i(shader.peelNumber,-1);
                        })

                // And now accumulate onto one fullscreen quad

                const theShader = this.shaderProgramDepthPeelAccum;
                this.gl.useProgram(theShader);
                for(let i = 0; i<16; i++)
                    this.gl.disableVertexAttribArray(i);
                this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                this.gl.enableVertexAttribArray(theShader.vertexTextureAttribute);
                this.bindFramebufferDrawBuffers();

                let paintPMatrix = mat4.create();
                if(this.renderToTexture) {
                    console.log("Binding rttFramebuffer in depth peel accumulate");
                    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
                    this.gl.viewport(0, 0, this.rttFramebuffer.width, this.rttFramebuffer.height);
                    this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                    this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                } else {
                    if(this.useOffScreenBuffers&&this.WEBGL2){
                        if(!this.offScreenReady)
                            this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
                        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebuffer);
                        let canRead = (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE);
                    }
                    this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
                    this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.gl.viewportWidth );
                    this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.gl.viewportHeight );
                }
                mat4.ortho(paintPMatrix, -1.0/ratio , 1.0/ratio , -1.0, 1.0, 0.1, 1000.0);
                this.gl.uniformMatrix4fv(theShader.pMatrixUniform, false, paintPMatrix);

                this.gl.enable(this.gl.BLEND);
                this.gl.disable(this.gl.DEPTH_TEST);
                if(this.renderToTexture&&this.transparentScreenshotBackground) {
                    this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0);
                } else{
                    this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
                }
                this.gl.clear(this.gl.DEPTH_BUFFER_BIT|this.gl.COLOR_BUFFER_BIT)
                this.gl.uniform1i(theShader.depthPeelSamplers, 0);
                this.gl.uniform1i(theShader.colorPeelSamplers, 1);
                for(let ipeel=3;ipeel>=0;ipeel--){
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[ipeel]);
                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelColorTextures[ipeel]);
                    this.gl.uniform1i(theShader.peelNumber,ipeel);
                    if (this.ext) {
                        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            if(this.renderToTexture) {
                console.log("Delete screenshot peel buffers")
                for(let i=0;i<this.depthPeelFramebuffers.length;i++){
                    this.gl.deleteFramebuffer(this.depthPeelFramebuffers[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferDepth[i]);
                    this.gl.deleteRenderbuffer(this.depthPeelRenderbufferColor[i]);
                    this.gl.deleteTexture(this.depthPeelColorTextures[i]);
                    this.gl.deleteTexture(this.depthPeelDepthTextures[i]);
                }
                this.depthPeelFramebuffers = [];
            }
        }

        //console.log(this.mvMatrix);
        //console.log(this.mvInvMatrix);
        //console.log(this.pMatrix);
        //console.log(this.screenZ);
        //console.log(invMat);

        if(!this.doMultiView&&!this.doThreeWayView&&!this.doSideBySideStereo&&!this.doCrossEyedStereo){

            if (this.showFPS) {
                this.drawFPSMeter();
            }

            if(!(this.useOffScreenBuffers&&this.offScreenReady)){
                if (this.showAxes) {
                    this.drawAxes(invMat);
                }
            }

            if (this.showCrosshairs) {
                this.drawCrosshairs(invMat);
            }

            if(!(this.useOffScreenBuffers&&this.offScreenReady)){
                if (this.showScaleBar) {
                    this.drawScaleBar(invMat);
                }
            }

            if(!(this.useOffScreenBuffers&&this.offScreenReady)){
                this.drawLineMeasures(invMat);
                this.drawTextOverlays(invMat);
            }
        }

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

        if(this.renderToTexture&&!this.useOffScreenBuffers) {
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

        if(this.useOffScreenBuffers&&this.offScreenReady){
            this.depthBlur(invMat);
        }

        if(this.showFPS){
            this.nFrames += 1;
            const thisTime = performance.now();
            const mspf = thisTime - this.prevTime;
            this.mspfArray.push(mspf);
            if(this.mspfArray.length>200) this.mspfArray.shift();
            this.prevTime = thisTime;
        }

        if(this.renderToTexture) {
            this.edgeDetectFramebufferSize = 2048;
            this.gBuffersFramebufferSize = 1024;
            if(this.edgeDetectFramebuffer){
                this.gl.deleteFramebuffer(this.edgeDetectFramebuffer);
                this.edgeDetectFramebuffer = null;
            }
            if(this.gFramebuffer){
                this.gl.deleteFramebuffer(this.gFramebuffer);
                this.gFramebuffer = null;
            }
        }
    }

    depthBlur(invMat) {

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        //Hmm - Why these 3 lines?
        //this.gl.clearColor(this.background_colour[0], this.background_colour[1], this.background_colour[2], this.background_colour[3]);
        //this.gl.clearColor(1.0,1.0,0.0,1.0);
        //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let paintMvMatrix = mat4.create();
        let paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        let srcWidth;
        let srcHeight;
        let dstWidth;
        let dstHeight;
        if(this.renderToTexture) {
            this.recreateOffScreeenBuffers(this.rttFramebuffer.width,this.rttFramebuffer.height);
            // FIXME - This cannnot work with current framebuffers, textures, etc.
            console.log("Need to combine depthBlur and screenshot ...");
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebuffer);
            this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.rttFramebufferColor);
            srcWidth = this.rttFramebuffer.width;
            srcHeight = this.rttFramebuffer.height;
            dstWidth = srcWidth;
            dstHeight = srcHeight;
        } else {
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.offScreenFramebuffer);
            this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.offScreenFramebufferColor);
            srcWidth = this.offScreenFramebuffer.width;
            srcHeight = this.offScreenFramebuffer.height;
            dstWidth = this.offScreenFramebufferColor.width;
            dstHeight = this.offScreenFramebufferColor.height;
        }

        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
        this.gl.clearBufferfi(this.gl.DEPTH_STENCIL, 0, 0.0, 0);

        this.gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, this.gl.COLOR_BUFFER_BIT, this.gl.LINEAR);
        this.gl.blitFramebuffer(0, 0, srcWidth, srcHeight, 0, 0, dstWidth, dstHeight, this.gl.DEPTH_BUFFER_BIT, this.gl.NEAREST);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


        /*
         * In focus     - this.offScreenFramebufferBlurX
         * Out of focus - this.blurYTexture
         * Depth        - this.offScreenDepthTexture
         */

        //This is an example of chaining framebuffer shader effects.
        //FIXME - Scale to deal with different sized Framebuffers ...
        const blurSizeX = this.blurSize/this.gl.viewportWidth;
        let blurSizeY = this.blurSize/this.gl.viewportHeight;
        if(this.renderToTexture)
            blurSizeY *= this.gl.viewportHeight/dstHeight;

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
        this.gl.useProgram(this.shaderProgramBlurX);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramBlurX.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramBlurX.inputTexture,0);
        this.gl.uniform1i(this.shaderProgramBlurX.depthTexture,1);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferBlurX);

        this.gl.activeTexture(this.gl.TEXTURE0);
        if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        }
        this.gl.activeTexture(this.gl.TEXTURE1);
        if(this.doPeel){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[0]);
        } else if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        }
        if(this.renderToTexture) {
            this.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        this.gl.uniformMatrix4fv(this.shaderProgramBlurX.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramBlurX.mvMatrixUniform, false, paintMvMatrix);

        let f = -(this.gl_clipPlane0[3]+this.fogClipOffset);
        let b = Math.min(this.gl_clipPlane1[3],this.gl_fog_end);
        if(this.doPerspectiveProjection){
            f = 100.
            b = 270.
        }
        //console.log("In blur",f,b,this.blurDepth)
        const absDepth = this.blurDepth * (1000. - -1000.) - 1000.;
        let fracDepth = (absDepth-f)/(b - f);
        fracDepth = this.blurDepth * 1000. / (b-f) - f/(b-f) - this.fogClipOffset/(b-f);
        console.log(fracDepth);
        //console.log(this.blurDepth,fracDepth,b-f,b+f,b,f);
        if(fracDepth > 1.0) fracDepth = 1.0;
        if(fracDepth < 0.0) fracDepth = 0.0;

        this.gl.uniform1f(this.shaderProgramBlurX.blurDepth,fracDepth);
        this.gl.uniform1f(this.shaderProgramBlurX.blurSize,blurSizeX);

        if(this.renderToTexture&&this.transparentScreenshotBackground){
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0]);
        } else {
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 1.0]);
        }
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
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
        if(this.doPeel){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[0]);
        } else if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        }
        if(this.renderToTexture) {
            this.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        this.gl.uniformMatrix4fv(this.shaderProgramBlurY.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramBlurY.mvMatrixUniform, false, paintMvMatrix);

        this.gl.uniform1f(this.shaderProgramBlurY.blurDepth,fracDepth);
        this.gl.uniform1f(this.shaderProgramBlurY.blurSize,blurSizeY);

        if(this.renderToTexture&&this.transparentScreenshotBackground){
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 0.0]);
        } else {
            this.gl.clearBufferfv(this.gl.COLOR, 0, [this.background_colour[0], this.background_colour[1], this.background_colour[2], 1.0]);
        }
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        if(this.renderToTexture) {
            //Do something different from below ....
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.rttFramebuffer);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        this.gl.useProgram(this.shaderProgramRenderFrameBuffer);
        this.gl.uniform1f(this.shaderProgramRenderFrameBuffer.blurDepth,fracDepth);

        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.focussedTexture,0);
        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.blurredTexture,1);
        this.gl.uniform1i(this.shaderProgramRenderFrameBuffer.depthTexture,2);

        this.gl.activeTexture(this.gl.TEXTURE0);
        if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenTexture);
        }

        this.gl.activeTexture(this.gl.TEXTURE1);
        if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.blurYTexture);
        }

        this.gl.activeTexture(this.gl.TEXTURE2);
        if(this.doPeel){
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthPeelDepthTextures[0]);
        } else if(this.renderToTexture) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttDepthTexture);
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.offScreenDepthTexture);
        }

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexPositionAttribute);

        if(this.renderToTexture) {
            this.gl.viewport(0, 0, srcWidth, srcHeight);
        } else {
            this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        }

        this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramRenderFrameBuffer.mvMatrixUniform, false, paintMvMatrix);

        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        if (this.showAxes) {
            this.drawAxes(invMat)
        }

        if (this.showScaleBar) {
            this.drawScaleBar(invMat);
        }
        this.drawLineMeasures(invMat);
        this.drawTextOverlays(invMat);

        if(this.renderToTexture) {
            console.log("SCREENSHOT MkII !");

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
            this.gl.bindFramebuffer(this.gl.READ_FRAMEBUFFER, this.rttFramebufferColor);
            let pixels = new Uint8Array(this.gl.viewportWidth / width_ratio * this.gl.viewportHeight / height_ratio * 4);
            this.gl.readPixels(0, 0, this.gl.viewportWidth / width_ratio, this.gl.viewportHeight / height_ratio, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.pixel_data = pixels;
            this.recreateOffScreeenBuffers(this.canvas.width,this.canvas.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }

        this.gl.disableVertexAttribArray(this.shaderProgramRenderFrameBuffer.vertexTextureAttribute);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    }

    textureBlur(width,height,inputTexture) {

        let paintMvMatrix = mat4.create();
        let paintPMatrix = mat4.create();
        mat4.identity(paintMvMatrix);
        mat4.ortho(paintPMatrix, -1 , 1 , -1, 1, 0.1, 1000.0);

        const blurSizeX = this.blurSize/width;
        const blurSizeY = this.blurSize/height;

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
        this.gl.useProgram(this.shaderProgramSimpleBlurX);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurX.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurX.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramSimpleBlurX.inputTexture,0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurX);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inputTexture);
        this.gl.viewport(0, 0, width, height);

        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurX.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurX.mvMatrixUniform, false, paintMvMatrix);

        this.gl.uniform1f(this.shaderProgramSimpleBlurX.blurSize,blurSizeX);

        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.blurUBOBuffer);
        //FIXME - UG!
        this.setBlurSize(this.blurSize);
        this.gl.useProgram(this.shaderProgramSimpleBlurY);
        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexTextureAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexPositionAttribute);

        this.gl.uniform1i(this.shaderProgramSimpleBlurY.inputTexture,0);

        this.gl.enableVertexAttribArray(this.shaderProgramSimpleBlurY.vertexTextureAttribute);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.offScreenFramebufferSimpleBlurY);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurXTexture);
        this.gl.viewport(0, 0, width, height);

        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurY.pMatrixUniform, false, paintPMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgramSimpleBlurY.mvMatrixUniform, false, paintMvMatrix);

        this.gl.uniform1f(this.shaderProgramSimpleBlurY.blurSize,blurSizeY);

        this.gl.clearBufferfv(this.gl.COLOR, 0, [1.0, 0.0, 1.0, 1.0]);
        this.bindFramebufferDrawBuffers();

        if (this.ext) {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        } else {
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // And now our FB texture is blurred
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

        if(this.doShadow&&!calculatingShadowMap&&!this.drawingGBuffers){
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
        }

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

            if(this.doMultiView&&this.displayBuffers[idx].origin&&this.displayBuffers[idx].origin.length===3){
                if(Object.hasOwn(this.displayBuffers[idx], "isHoverBuffer")&&!this.displayBuffers[idx].isHoverBuffer){
                    if(this.displayBuffers[idx].multiViewGroup!==this.currentMultiViewGroup){
                        continue
                    }
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

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (this.displayBuffers[idx].transparent&&!this.drawingGBuffers) {
                    //console.log("Not doing normal drawing way ....");
                    if(!this.doPeel)
                        continue;
                }
                let theShader;
                let scaleZ = false;

                if(this.displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                    if(this.drawingGBuffers){
                        theShader = this.shaderProgramGBuffersInstanced;
                    } else {
                        theShader = this.shaderProgramInstanced;
                        if (calculatingShadowMap)
                            theShader = this.shaderProgramInstancedShadow;
                        if(this.stencilPass)
                            theShader = this.shaderProgramInstancedOutline;
                    }
                } else {
                    if(this.drawingGBuffers){
                        theShader = this.shaderProgramGBuffers;
                    } else {
                        theShader = this.shaderProgram;
                        if (calculatingShadowMap)
                            theShader = this.shaderProgramShadow;
                        if(this.stencilPass){
                            theShader = this.shaderProgramOutline;
                            scaleZ = true;
                        }
                    }
                }

                this.gl.useProgram(theShader);
                this.gl.uniform1i(theShader.doShadows, false);
                if(this.doShadow&&!calculatingShadowMap&&!this.drawingGBuffers){
                    this.gl.uniform1i(theShader.ShadowMap, 0);
                    this.gl.uniform1f(theShader.xPixelOffset, 1.0/this.rttFramebufferDepth.width);
                    this.gl.uniform1f(theShader.yPixelOffset, 1.0/this.rttFramebufferDepth.height);
                    this.gl.uniformMatrix4fv(theShader.textureMatrixUniform, false, this.textureMatrix);
                    this.gl.uniform1i(theShader.doShadows, true);
                    if(this.renderToTexture)
                        this.gl.uniform1i(theShader.shadowQuality, 1);
                    else
                        this.gl.uniform1i(theShader.shadowQuality, 0);
                }
                if(theShader.doSSAO!=null) this.gl.uniform1i(theShader.doSSAO, this.doSSAO);
                if(theShader.doEdgeDetect!=null) this.gl.uniform1i(theShader.doEdgeDetect, this.doEdgeDetect);
                if(theShader.occludeDiffuse!=null) this.gl.uniform1i(theShader.occludeDiffuse, this.occludeDiffuse);
                if(theShader.doPerspective!=null) this.gl.uniform1i(theShader.doPerspective, this.doPerspectiveProjection);
                if(this.WEBGL2&&theShader.doEdgeDetect&&!this.drawingGBuffers){
                    this.gl.uniform1i(theShader.edgeDetectMap, 2);
                    this.gl.activeTexture(this.gl.TEXTURE2);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                }
                if(this.WEBGL2&&theShader.doSSAO&&!this.drawingGBuffers){
                    //SSAO after double blur
                    this.gl.uniform1i(theShader.SSAOMap, 1);
                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    if(!this.doDepthPeelPass){
                        if(this.renderToTexture){
                            this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                            this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                        } else {
                            this.gl.uniform1f(theShader.xSSAOScaling, 1.0/this.gl.viewportWidth );
                            this.gl.uniform1f(theShader.ySSAOScaling, 1.0/this.gl.viewportHeight );
                        }
                    }
                }

                for(let i = 0; i<16; i++)
                    this.gl.disableVertexAttribArray(i);

                if(typeof(theShader.vertexNormalAttribute!=="undefined") && theShader.vertexNormalAttribute!==null&&theShader.vertexNormalAttribute>-1){
                    if(!calculatingShadowMap){

                        this.gl.enableVertexAttribArray(theShader.vertexNormalAttribute);
                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                        if (bufferTypes[j] !== "PERFECT_SPHERES") this.gl.vertexAttribPointer(theShader.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                    }
                }

                this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                if (bufferTypes[j] !== "PERFECT_SPHERES") this.gl.vertexAttribPointer(theShader.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
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
                    if(theShader.vertexColourAttribute>-1){
                        let outlineSize = vec3.create();
                        vec3.set(outlineSize, 0.0, 0.0, 0.0);
                        this.gl.uniform3fv(theShader.outlineSize, outlineSize);
                        if(this.displayBuffers[idx].customColour&&this.displayBuffers[idx].customColour.length==4){
                            this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.displayBuffers[idx].customColour)
                        } else {
                            this.gl.enableVertexAttribArray(theShader.vertexColourAttribute);
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                            this.gl.vertexAttribPointer(theShader.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        }
                    }
                }
                if (bufferTypes[j] === "TRIANGLES") {
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
                        this.gl.uniform3fv(theShader.screenZ, this.screenZ);
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
                        if(this.doAnaglyphStereo) {
                            this.gl.disableVertexAttribArray(theShader.vertexColourAttribute);
                            this.gl.vertexAttrib4f(theShader.vertexColourAttribute, ...this.currentAnaglyphColor)
                        }
                            this.gl.drawElements(this.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_INT, 0);
                        } else {
                            this.gl.drawElements(this.gl.TRIANGLE_STRIP, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                        }
                    }
                }
            }

            //shaderProgramPerfectSpheres
            //FIXME - broken with gbuffers
            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            if (this.frag_depth_ext) {
                let invsymt = mat4.create();
                let program = this.shaderProgramPerfectSpheres;
                if (calculatingShadowMap) {
                    program = this.shaderDepthShadowProgramPerfectSpheres;
                }
                if(this.drawingGBuffers){
                    program = this.shaderProgramGBuffersPerfectSpheres;
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
                    this.setLightUniforms(program,false);
                    if(program.clipCap!=null) this.gl.uniform1i(program.clipCap,this.clipCapPerfectSpheres);
                    if(program.vertexNormalAttribute!=null&&program.vertexNormalAttribute>-1) this.gl.enableVertexAttribArray(program.vertexNormalAttribute);
                }
                if(program.vertexTextureAttribute!=null) this.gl.enableVertexAttribArray(program.vertexTextureAttribute);
                if(program.vertexColourAttribute!=null) this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                if(program.offsetAttribute!=null) this.gl.enableVertexAttribArray(program.offsetAttribute);
                if(program.sizeAttribute!=null) this.gl.enableVertexAttribArray(program.sizeAttribute);
                if(program.doShadows!=null) this.gl.uniform1i(program.doShadows, false);
                if(this.doShadow&&!calculatingShadowMap&&!this.drawingGBuffers){
                    this.gl.uniform1i(program.ShadowMap, 0);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.rttTextureDepth);
                    this.gl.uniform1f(program.xPixelOffset, 1.0/this.rttFramebufferDepth.width);
                    this.gl.uniform1f(program.yPixelOffset, 1.0/this.rttFramebufferDepth.height);
                    this.gl.uniformMatrix4fv(program.textureMatrixUniform, false, this.textureMatrix);
                    this.gl.uniform1i(program.doShadows, true);
                    if(this.renderToTexture)
                        this.gl.uniform1i(program.shadowQuality, 1);
                    else
                        this.gl.uniform1i(program.shadowQuality, 0);
                }
                if(program.doSSAO!=null) this.gl.uniform1i(program.doSSAO, this.doSSAO);
                if(program.doEdgeDetect!=null) this.gl.uniform1i(program.doEdgeDetect, this.doEdgeDetect);
                if(program.occludeDiffuse!=null) this.gl.uniform1i(program.occludeDiffuse, this.occludeDiffuse);
                if(program.doPerspective!=null) this.gl.uniform1i(program.doPerspective, this.doPerspectiveProjection);
                if(this.WEBGL2&&program.doEdgeDetect&&!this.drawingGBuffers){
                    this.gl.uniform1i(program.edgeDetectMap, 2);
                    this.gl.activeTexture(this.gl.TEXTURE2);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.edgeDetectTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                }
                if(this.WEBGL2&&program.doSSAO&&!this.drawingGBuffers){
                    this.gl.uniform1i(program.SSAOMap, 1);
                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                    this.gl.activeTexture(this.gl.TEXTURE0);
                    if(!this.doDepthPeelPass){
                        if(this.renderToTexture){
                            this.gl.uniform1f(program.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                            this.gl.uniform1f(program.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                        } else {
                            this.gl.uniform1f(program.xSSAOScaling, 1.0/this.gl.viewportWidth );
                            this.gl.uniform1f(program.ySSAOScaling, 1.0/this.gl.viewportHeight );
                        }
                    }
                }

                if(this.stencilPass){
                    this.gl.disable(this.gl.DEPTH_TEST);
                    let outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.1, 0.1, 0.0);
                    this.gl.uniform3fv(program.outlineSize, outlineSize);
                } else {
                    let outlineSize = vec3.create();
                    vec3.set(outlineSize, 0.0, 0.0, 0.0);
                    if(program.outlineSize!=null) this.gl.uniform3fv(program.outlineSize, outlineSize);
                }

                for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                    if (bufferTypes[j] === "PERFECT_SPHERES") {

                        let buffer = this.imageBuffer;

                        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.triangleVertexTextureBuffer[0]);
                        this.gl.vertexAttribPointer(program.vertexTextureAttribute, buffer.triangleVertexTextureBuffer[0].itemSize, this.gl.FLOAT, false, 0, 0);

                        if(program.vertexNormalAttribute!=null&&program.vertexNormalAttribute>-1){
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
                        if(program.vertexColourAttribute!=null&&program.vertexColourAttribute>-1){
                            this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.displayBuffers[idx].triangleColourBuffer[j]);
                            this.gl.vertexAttribPointer(program.vertexColourAttribute, this.displayBuffers[idx].triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                        }
                        if(this.stencilPass){
                            this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                            if(bright_y<0.5)
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, 1.0, 1.0, 1.0, 1.0);
                            else
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.0, 0.0, 0.0, 1.0);
                        }
                        if (this.WEBGL2) {
                            if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                            this.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                            this.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            if(this.displayBuffers[idx].isHoverBuffer&&this.hoverSize>0.27){
                                this.gl.disableVertexAttribArray(program.sizeAttribute);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                const hoverSize = this.hoverSize + 0.4;
                                this.gl.vertexAttrib3f(program.sizeAttribute, hoverSize, hoverSize, hoverSize, 1.0);
                            }
                            if(this.doAnaglyphStereo) {
                                this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                this.gl.vertexAttribDivisor(program.vertexColourAttribute,0);
                                this.gl.vertexAttrib4f(program.vertexColourAttribute, ...this.currentAnaglyphColor)
                            }
                            this.gl.drawElementsInstanced(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                            if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                            this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                            this.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                        } else {
                            if(program.vertexColourAttribute!=null) this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
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
                            if(program.vertexColourAttribute>-1&&this.displayBuffers[idx].changeColourWithSymmetry){
                                this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                if(bright_y>0.5)
                                    this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.3, 0.3, 0.3, 1.0);
                                else
                                    this.gl.vertexAttrib4f(program.vertexColourAttribute, 0.5, 0.5, 0.5, 1.0);
                            }

                            let tempMVMatrix = mat4.create();
                            let tempMVInvMatrix = mat4.create();
                            if (this.WEBGL2) {
                                if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 1);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 1);
                                this.gl.vertexAttribDivisor(program.offsetAttribute, 1);
                            } else {
                                if(program.vertexColourAttribute!=null) this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 1);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 1);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 1);
                            }
                            for (let isym = 0; isym < this.displayBuffers[idx].symmetryMatrices.length; isym++) {

                                this.applySymmetryMatrix(program,this.displayBuffers[idx].symmetryMatrices[isym],tempMVMatrix,tempMVInvMatrix,false)
                                    if (this.WEBGL2) {
                                        if(this.doAnaglyphStereo) {
                                            this.gl.disableVertexAttribArray(program.vertexColourAttribute);
                                            this.gl.vertexAttribDivisor(program.vertexColourAttribute,0);
                                            this.gl.vertexAttrib4f(program.vertexColourAttribute, ...this.currentAnaglyphColor)
                                        }
                                        this.gl.drawElementsInstanced(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    } else {
                                        this.instanced_ext.drawElementsInstancedANGLE(this.gl.TRIANGLE_FAN, buffer.triangleVertexIndexBuffer[0].numItems, this.gl.UNSIGNED_INT, 0, this.displayBuffers[idx].triangleInstanceOriginBuffer[j].numItems);
                                    }

                            }
                            if (this.WEBGL2) {
                                if(program.vertexColourAttribute!=null) this.gl.vertexAttribDivisor(program.vertexColourAttribute, 0);
                                this.gl.vertexAttribDivisor(program.sizeAttribute, 0);
                                this.gl.vertexAttribDivisor(program.offsetAttribute, 0);
                            } else {
                                if(program.vertexColourAttribute!=null) this.instanced_ext.vertexAttribDivisorANGLE(program.vertexColourAttribute, 0);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.sizeAttribute, 0);
                                this.instanced_ext.vertexAttribDivisorANGLE(program.offsetAttribute, 0);
                            }
                            this.gl.uniformMatrix4fv(program.mvMatrixUniform, false, this.mvMatrix);// All else
                            this.gl.uniformMatrix4fv(program.mvInvMatrixUniform, false, this.mvInvMatrix);// All else

                            this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                        }
                    }
                }

                if(program.vertexColourAttribute!=null) this.gl.enableVertexAttribArray(program.vertexColourAttribute);
                this.gl.disableVertexAttribArray(program.vertexTextureAttribute);
            }

            let shaderProgramThickLinesNormal = this.shaderProgramThickLinesNormal;
            if(this.drawingGBuffers){
                shaderProgramThickLinesNormal = this.shaderProgramGBuffersThickLinesNormal;
            } else {
                shaderProgramThickLinesNormal = this.shaderProgramThickLinesNormal;
            }

            this.gl.useProgram(shaderProgramThickLinesNormal);

            for(let i = 0; i<16; i++)
                this.gl.disableVertexAttribArray(i);

            this.gl.uniform1i(shaderProgramThickLinesNormal.shinyBack, true);
            this.setLightUniforms(shaderProgramThickLinesNormal);
            this.gl.uniform3fv(shaderProgramThickLinesNormal.screenZ, this.screenZ);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexPositionAttribute);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexColourAttribute);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexNormalAttribute);
            this.gl.enableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);
            this.setMatrixUniforms(shaderProgramThickLinesNormal);
            this.gl.uniformMatrix4fv(shaderProgramThickLinesNormal.pMatrixUniform, false, this.pmvMatrix);

            // I do not think this is useful yet as I do not think that lines contribute to occlusion buffer.
            if(this.WEBGL2&&shaderProgramThickLinesNormal.doSSAO&&!this.drawingGBuffers){
                this.gl.uniform1i(shaderProgramThickLinesNormal.SSAOMap, 1);
                this.gl.activeTexture(this.gl.TEXTURE1);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                this.gl.activeTexture(this.gl.TEXTURE0);
                if(!this.doDepthPeelPass){
                    if(this.renderToTexture){
                        this.gl.uniform1f(shaderProgramThickLinesNormal.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                        this.gl.uniform1f(shaderProgramThickLinesNormal.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                    } else {
                        this.gl.uniform1f(shaderProgramThickLinesNormal.xSSAOScaling, 1.0/this.gl.viewportWidth );
                        this.gl.uniform1f(shaderProgramThickLinesNormal.ySSAOScaling, 1.0/this.gl.viewportHeight );
                    }
                }
                if(shaderProgramThickLinesNormal.doSSAO!=null){
                    if(shaderProgramThickLinesNormal.doSSAO!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.doSSAO, this.doSSAO);
                    if(shaderProgramThickLinesNormal.occludeDiffuse!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.occludeDiffuse, this.occludeDiffuse);
                    if(shaderProgramThickLinesNormal.doPerspective!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.doPerspective, this.doPerspectiveProjection);
                }
                //Arguably this should be zero?
                if(shaderProgramThickLinesNormal.doEdgeDetect!=null) this.gl.uniform1i(shaderProgramThickLinesNormal.doEdgeDetect, this.doEdgeDetect);
            }

            for (let j = 0; j < triangleVertexIndexBuffer.length; j++) {
                if (bufferTypes[j] !== "NORMALLINES") {
                    continue;
                }
                // FIXME ? We assume all are the same size. Anything else is a little tricky for now.
                if (typeof (this.displayBuffers[idx].primitiveSizes) !== "undefined" && typeof (this.displayBuffers[idx].primitiveSizes[j]) !== "undefined" && typeof (this.displayBuffers[idx].primitiveSizes[j][0]) !== "undefined") {
                    this.gl.uniform1f(shaderProgramThickLinesNormal.pixelZoom, this.displayBuffers[idx].primitiveSizes[j][0] * 0.04 * this.zoom);
                } else {
                    this.gl.uniform1f(shaderProgramThickLinesNormal.pixelZoom, 1.0 * 0.04 * this.zoom);
                }
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexNormalBuffer[j]);
                this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexNormalAttribute, triangleVertexNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexRealNormalBuffer[j]);
                this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexRealNormalAttribute, triangleVertexRealNormalBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleVertexPositionBuffer[j]);
                this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexPositionAttribute, triangleVertexPositionBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                if(this.displayBuffers[idx].customColour&&this.displayBuffers[idx].customColour.length==4){
                    this.gl.disableVertexAttribArray(this.shaderProgramThickLinesNormal.vertexColourAttribute);
                    this.gl.vertexAttrib4f(this.shaderProgramThickLinesNormal.vertexColourAttribute, ...this.displayBuffers[idx].customColour)
                } else {
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, triangleColourBuffer[j]);
                    this.gl.vertexAttribPointer(shaderProgramThickLinesNormal.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                }
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (this.displayBuffers[idx].transformMatrix) {
                    this.drawTransformMatrixPMV(this.displayBuffers[idx].transformMatrix, this.displayBuffers[idx], shaderProgramThickLinesNormal, this.gl.TRIANGLES, j);
                } else {
                    if (this.ext) {
                        this.drawMaxElementsUInt(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }

            this.gl.disableVertexAttribArray(shaderProgramThickLinesNormal.vertexRealNormalAttribute);

            if(this.drawingGBuffers){
                //FIXME - Don't skip on thick lines.
                //console.log("Skip most stuff!");
                continue;
            }

            if(this.stencilPass){
                continue;
            }

            if (calculatingShadowMap)
                continue; //Nothing else implemented
            //Cylinders here

            //vertex attribute settings are likely wrong from here on... (REALLY - I HOPE NOT! SJM 26/10/2023)

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
                                if(this.doAnaglyphStereo) {
                                    this.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);
                                    this.gl.vertexAttribDivisor(sphereProgram.vertexColourAttribute,0);
                                    this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, ...this.currentAnaglyphColor)
                                }
                                this.drawMaxElementsUInt(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems);
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
                                if(this.doAnaglyphStereo) {
                                    this.gl.disableVertexAttribArray(sphereProgram.vertexColourAttribute);
                                    this.gl.vertexAttribDivisor(sphereProgram.vertexColourAttribute,0);
                                    this.gl.vertexAttrib4f(sphereProgram.vertexColourAttribute, ...this.currentAnaglyphColor)
                                }
                                this.drawMaxElementsUInt(this.gl.TRIANGLES, buffer.triangleVertexIndexBuffer[0].numItems);
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
                if(this.displayBuffers[idx].customColour&&this.displayBuffers[idx].customColour.length==4){
                    this.gl.disableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);
                    this.gl.vertexAttrib4f(this.shaderProgramThickLines.vertexColourAttribute, ...this.displayBuffers[idx].customColour)
                } else {
                    this.gl.enableVertexAttribArray(this.shaderProgramThickLines.vertexColourAttribute);
                    this.gl.vertexAttribPointer(this.shaderProgramThickLines.vertexColourAttribute, triangleColourBuffer[j].itemSize, this.gl.FLOAT, false, 0, 0);
                }
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, triangleVertexIndexBuffer[j]);

                if (this.displayBuffers[idx].transformMatrix) {
                    this.drawTransformMatrixPMV(this.displayBuffers[idx].transformMatrix, this.displayBuffers[idx], this.shaderProgramThickLines, this.gl.TRIANGLES, j);
                } else if (this.displayBuffers[idx].transformMatrixInteractive) {
                    this.drawTransformMatrixInteractivePMV(this.displayBuffers[idx].transformMatrixInteractive, this.displayBuffers[idx].transformOriginInteractive, this.displayBuffers[idx], this.shaderProgramThickLines, this.gl.TRIANGLES, j);
                } else {
                    if (this.ext) {
                        this.drawMaxElementsUInt(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems);
                    } else {
                        this.gl.drawElements(this.gl.TRIANGLES, triangleVertexIndexBuffer[j].numItems, this.gl.UNSIGNED_SHORT, 0);
                    }
                }
            }
        }
    }

    drawTransparent(theMatrix) {

        if(this.drawingGBuffers) return;

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

                    if(this.WEBGL2&&this.shaderProgram.doSSAO){
                        this.gl.uniform1i(this.shaderProgram.SSAOMap, 1);
                        this.gl.activeTexture(this.gl.TEXTURE1);
                        this.gl.bindTexture(this.gl.TEXTURE_2D, this.simpleBlurYTexture);
                        this.gl.activeTexture(this.gl.TEXTURE0);
                        if(!this.doDepthPeelPass){
                            if(this.renderToTexture){
                                this.gl.uniform1f(this.shaderProgram.xSSAOScaling, 1.0/this.rttFramebuffer.width );
                                this.gl.uniform1f(this.shaderProgram.ySSAOScaling, 1.0/this.rttFramebuffer.height );
                            } else {
                                this.gl.uniform1f(this.shaderProgram.xSSAOScaling, 1.0/this.gl.viewportWidth );
                                this.gl.uniform1f(this.shaderProgram.ySSAOScaling, 1.0/this.gl.viewportHeight );
                            }
                        }
                    }

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
                        this.drawMaxElementsUInt(this.gl.TRIANGLES, allIndexs.length);
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
            //this.gl.disableVertexAttribArray(this.shaderProgramImages.vertexColourAttribute);
            //this.gl.vertexAttrib4f(this.shaderProgramImages.vertexColourAttribute, 1.0, 1.0, 0.0, 1.0);

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
            //this.gl.enableVertexAttribArray(this.shaderProgramImages.vertexColourAttribute);
            this.gl.depthFunc(this.gl.LESS);

        }
    }

    clearTextPositionBuffers() {
        if(this.displayBuffers && this.displayBuffers[0])
            delete this.displayBuffers[0].textPositionBuffer;
    }

    drawTexturedShapes(invMat) {
        const theShader = this.shaderProgramTextured;
        this.gl.useProgram(theShader);
        this.setMatrixUniforms(theShader);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.enableVertexAttribArray(theShader.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(theShader.vertexTextureAttribute);

        //this.gl.vertexAttrib4f(theShader.vertexColourAttribute, 1.0, 0.3, 0.4, 1.0);
        //this.gl.vertexAttrib3f(theShader.vertexNormalAttribute, 0.0, 0.0, 1.0);

        this.texturedShapes.forEach(shape => {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, shape.vertexBuffer);
            this.gl.vertexAttribPointer(theShader.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, shape.texCoordBuffer);
            this.gl.vertexAttribPointer(theShader.vertexTextureAttribute, 2, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, shape.idxBuffer);
            this.gl.uniform1i(theShader.valueMap, 0);
            this.gl.uniform1i(theShader.colorMap, 1);
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, shape.image_texture);
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, shape.color_ramp_texture);
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_INT, 0);
        })
        this.gl.activeTexture(this.gl.TEXTURE0);
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
            canvasTexture.draw();
        })

        this.gl.depthFunc(this.gl.LESS);

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

            const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
            let rightClick: moorhen.AtomRightClickEvent = new CustomEvent("rightClick", {
            "detail": {
                atom: minidx > -1 ? self.displayBuffers[minidx].atoms[minj] : null,
                buffer: minidx > -1 ? self.displayBuffers[minidx] : null,
                coords: "",
                pageX: event.pageX,
                pageY: event.pageY,
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
            const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
            if (minidx > -1) {
                const atomLabel = parseAtomInfoLabel(self.displayBuffers[minidx].atoms[minj]);
                let theAtom : clickAtom = {
                   ...self.displayBuffers[minidx].atoms[minj],
                   label: atomLabel,
                   displayBuffer: self.displayBuffers[minidx]
                };
                let atomClicked: moorhen.AtomClickedEvent = new CustomEvent("atomClicked", {
                    "detail": {
                        atom: self.displayBuffers[minidx].atoms[minj],
                        buffer: self.displayBuffers[minidx],
                        isResidueSelection: self.keysDown['residue_selection']
                    }
                });
                document.dispatchEvent(atomClicked);
                if (this.draggableMolecule != null && this.draggableMolecule.representations.length > 0 && this.draggableMolecule.buffersInclude(self.displayBuffers[minidx])) {
                    this.currentlyDraggedAtom = { atom: self.displayBuffers[minidx].atoms[minj], buffer: self.displayBuffers[minidx] }
                }
                if (self.keysDown['label_atom']) {
                    if(self.drawEnvBOcc) {
                        theAtom.label = self.displayBuffers[minidx].atoms[minj].tempFactor.toFixed(2) + " " + self.displayBuffers[minidx].atoms[minj].occupancy.toFixed(2) + " " + atomLabel
                    }
                    updateLabels = true
                    if (self.labelledAtoms.length === 0 || (self.labelledAtoms[self.labelledAtoms.length - 1].length > 1)) {
                        self.labelledAtoms.push([]);
                    }
                    self.labelledAtoms[self.labelledAtoms.length - 1].push(theAtom);
                } else if (self.keysDown['measure_distances']) {
                    updateLabels = true
                    if (self.measuredAtoms.length === 0) {
                        self.measuredAtoms.push([]);
                    }
                    self.measuredAtoms[self.measuredAtoms.length - 1].push(theAtom);
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

        self.environmentAtoms.forEach(atoms => {
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
                    this.displayBuffers = this.displayBuffers.filter(glBuffer => glBuffer.id !== buffer.id)
                }
            })
        }
        this.measureCylinderBuffers = []
        this.measureTextCanvasTexture.clearBigTexture()
    }

    getThreeWayMatrixAndViewPort(x,yp,quats,viewports){
        const newQuat = quat4.clone(this.myQuat);
        let mvMatrix = []
        let viewportArray = []
        let theQuat = null
        for(let i=0;i<viewports.length;i++){
            if(x>=viewports[i][0]&&x<(viewports[i][0]+viewports[i][2])&&
               yp>=viewports[i][1]&&yp<(viewports[i][1]+viewports[i][3])){
                viewportArray = viewports[i]
                const theMatrix = mat4.create()
                mat4.translate(theMatrix, theMatrix, [0, 0, -this.fogClipOffset]);
                quat4.multiply(newQuat, newQuat, quats[i]);
                const theRotMatrix = quatToMat4(newQuat);
                mat4.multiply(theMatrix, theMatrix, theRotMatrix);
                if(this.doMultiView&&i<=this.multiViewOrigins.length&&this.multiViewOrigins.length>0)
                    mat4.translate(theMatrix, theMatrix, this.multiViewOrigins[i])
                else
                    mat4.translate(theMatrix, theMatrix, this.origin)
                mvMatrix = theMatrix
                theQuat = quats[i]
            }
        }
       return {"mat":mvMatrix,"viewport":viewportArray,quat:theQuat}
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

        let viewportArray = [
            0, 0, this.gl.viewportWidth, this.gl.viewportHeight
        ];
        let mvMatrix = mat4.clone(this.mvMatrix)

        const yp = this.canvas.height - y

        if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
            let viewports
            let quats

            if(this.doThreeWayView){
                quats = this.threeWayQuats
                viewports = this.threeWayViewports
            } else if(this.doMultiView) {
                quats = this.multiWayQuats
                viewports = this.multiWayViewports
            } else if(this.doSideBySideStereo) {
                quats = this.stereoQuats
                viewports = this.stereoViewports
            } else {
                quats = this.stereoQuats.toReversed()
                viewports = this.stereoViewports
            }

            const mVPQ = this.getThreeWayMatrixAndViewPort(x,yp,quats,viewports)
            if(mVPQ.mat.length>0&& mVPQ.viewport.length>0) {
                mvMatrix = mVPQ.mat
                viewportArray = mVPQ.viewport
            }
        }

        // The results of the operation will be stored in this array.
        let modelPointArrayResultsFront = [];
        let modelPointArrayResultsBack = [];

        //FIXME - This is hackery
        let factor = 999.9;
        if(this.doPerspectiveProjection){
            factor = 99.9;
        }
        let success = unProject(
                x, yp, -(this.gl_clipPlane0[3]-this.fogClipOffset)/factor,
                mvMatrix as unknown as number[], this.pMatrix as unknown as number[],
                viewportArray, modelPointArrayResultsFront);

        success = unProject(
                x, yp, -(this.gl_clipPlane1[3]-this.fogClipOffset)/factor,
                mvMatrix as unknown as number[], this.pMatrix as unknown as number[],
                viewportArray, modelPointArrayResultsBack);

        let mindist = 100000.;
        let minx = 100000.;
        let miny = 100000.;
        let minz = 100000.;
        let minidx = -1;
        let minj = -1;
        //FIXME - This needs to depend on whether spheres, surface are drawn

        let minsym = -1;

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
                vec3.transformMat4(atPosTrans, p, mvMatrix);
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
            let isym = 0;
            this.displayBuffers[idx].symmetryAtoms.forEach(symmats => {
                let j = 0;
                symmats.forEach(symmat => {
                    const p = symmat.pos;
                    const dpl = DistanceBetweenPointAndLine(modelPointArrayResultsFront, modelPointArrayResultsBack, p);
                    let atPosTrans = vec3Create([0, 0, 0]);
                    vec3.transformMat4(atPosTrans, p, mvMatrix);
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
                    minsym = isym;
                    minx = p[0];
                    miny = p[1];
                    minz = p[2];
                    }
                    j++;
                })
                isym++;
            })
        }

        return [minidx,minj,mindist,minsym,minx,miny,minz];

    }

    doHover(event, self) {
        if (this.props.onAtomHovered) {
            const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
            if (minidx > -1) {
                this.props.onAtomHovered({ atom: self.displayBuffers[minidx].atoms[minj], buffer: self.displayBuffers[minidx] });
            }
            else {
                this.props.onAtomHovered(null)
            }
            self.drawScene();
        }
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

    linesToThickLinesWithIndicesAndNormals(axesVertices, axesNormals, axesColours, axesIndices, size, doColour) {
        return this.linesToThickLinesWithIndices(axesVertices, axesColours, axesIndices, size, axesNormals, doColour)
    }

    linesToThickLinesWithIndices(axesVertices: number[], axesColours: number[], axesIndices: number[], size: number, axesNormals_old? : number[], doColour=false) {

        //FIXME - This could all be pushed upstairs into the C++ -> JS mesh conversions
        const print_timing = false;
        const index_length = axesIndices.length;

        const t1 = performance.now()
        let axesNormals = new Float32Array(index_length * 9);
        let axesNormals_new;
        if (axesNormals_old) {
            axesNormals_new = new Float32Array(index_length * 9);
        }
        let axesVertices_new = new Float32Array(index_length * 9);
        let axesColours_new;
        let axesIndexs_new;
        if (this.ext) {
             axesIndexs_new =  new Uint32Array(index_length * 3)
        } else {
             axesIndexs_new =  new Uint16Array(index_length * 3)
        }
        const t2 = performance.now()
        if(print_timing) console.log("create buffer in linesToThickLines",t2-t1)

        if(doColour){
            axesColours_new = new Float32Array(index_length * 12);
            for (let idx = 0; idx < index_length; idx += 2) {

                const il = 3 * axesIndices[idx];
                const idx12 = idx*12;
                const il43 = il*4/3;

                const r = axesColours[il43]
                const g = axesColours[il43 + 1]
                const b = axesColours[il43 + 2]
                const a = axesColours[il43 + 3]

                axesColours_new[idx12]     = r
                axesColours_new[idx12 + 1] = g
                axesColours_new[idx12 + 2] = b
                axesColours_new[idx12 + 3] = a

                axesColours_new[idx12 + 4] = r
                axesColours_new[idx12 + 5] = g
                axesColours_new[idx12 + 6] = b
                axesColours_new[idx12 + 7] = a

                axesColours_new[idx12 + 8]  = r
                axesColours_new[idx12 + 9]  = g
                axesColours_new[idx12 + 10] = b
                axesColours_new[idx12 + 11] = a

                axesColours_new[idx12 + 12] = r
                axesColours_new[idx12 + 13] = g
                axesColours_new[idx12 + 14] = b
                axesColours_new[idx12 + 15] = a

                axesColours_new[idx12 + 16] = r
                axesColours_new[idx12 + 17] = g
                axesColours_new[idx12 + 18] = b
                axesColours_new[idx12 + 19] = a

                axesColours_new[idx12 + 20] = r
                axesColours_new[idx12 + 21] = g
                axesColours_new[idx12 + 22] = b
                axesColours_new[idx12 + 23] = a

            }
        }

        const t3 = performance.now()
        if(print_timing) console.log("do colours in linesToThickLines",t3-t2)

        for (let idx = 0; idx < index_length; idx += 2) {

            const il = 3 * axesIndices[idx];
            const il2 = 3 * axesIndices[idx + 1];

            const idx9 = idx*9;

            const x = axesVertices[il]
            const y = axesVertices[il+1]
            const z = axesVertices[il+2]

            const x2 = axesVertices[il2]
            const y2 = axesVertices[il2+1]
            const z2 = axesVertices[il2+2]

            axesVertices_new[idx9]     = x
            axesVertices_new[idx9 + 1] = y
            axesVertices_new[idx9 + 2] = z

            axesVertices_new[idx9 + 3] = x
            axesVertices_new[idx9 + 4] = y
            axesVertices_new[idx9 + 5] = z

            axesVertices_new[idx9 + 6] = x2
            axesVertices_new[idx9 + 7] = y2
            axesVertices_new[idx9 + 8] = z2

            axesVertices_new[idx9 + 9]  = x
            axesVertices_new[idx9 + 10] = y
            axesVertices_new[idx9 + 11] = z

            axesVertices_new[idx9 + 12] = x2
            axesVertices_new[idx9 + 13] = y2
            axesVertices_new[idx9 + 14] = z2

            axesVertices_new[idx9 + 15] = x2
            axesVertices_new[idx9 + 16] = y2
            axesVertices_new[idx9 + 17] = z2

            if (axesNormals_old) {
                const nx = axesNormals_old[il]
                const ny = axesNormals_old[il+1]
                const nz = axesNormals_old[il+2]

                const nx2 = axesNormals_old[il2]
                const ny2 = axesNormals_old[il2+1]
                const nz2 = axesNormals_old[il2+2]

                axesNormals_new[idx9]     = nx
                axesNormals_new[idx9 + 1] = ny
                axesNormals_new[idx9 + 2] = nz

                axesNormals_new[idx9 + 3] = nx
                axesNormals_new[idx9 + 4] = ny
                axesNormals_new[idx9 + 5] = nz

                axesNormals_new[idx9 + 6] = nx2
                axesNormals_new[idx9 + 7] = ny2
                axesNormals_new[idx9 + 8] = nz2

                axesNormals_new[idx9 + 9]  = nx
                axesNormals_new[idx9 + 10] = ny
                axesNormals_new[idx9 + 11] = nz

                axesNormals_new[idx9 + 12] = nx2
                axesNormals_new[idx9 + 13] = ny2
                axesNormals_new[idx9 + 14] = nz2

                axesNormals_new[idx9 + 15] = nx2
                axesNormals_new[idx9 + 16] = ny2
                axesNormals_new[idx9 + 17] = nz2

            }

            let dx = x2 - x
            let dy = y2 - y
            let dz = z2 - z

            let d = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (d > 1e-8) {
                dx *= size/d
                dy *= size/d
                dz *= size/d
            }

            axesNormals[idx9]     = dx
            axesNormals[idx9 + 1] = dy
            axesNormals[idx9 + 2] = dz

            axesNormals[idx9 + 3] = -dx
            axesNormals[idx9 + 4] = -dy
            axesNormals[idx9 + 5] = -dz

            axesNormals[idx9 + 6] = -dx
            axesNormals[idx9 + 7] = -dy
            axesNormals[idx9 + 8] = -dz

            axesNormals[idx9 + 9]  = dx
            axesNormals[idx9 + 10] = dy
            axesNormals[idx9 + 11] = dz

            axesNormals[idx9 + 12] = dx
            axesNormals[idx9 + 13] = dy
            axesNormals[idx9 + 14] = dz

            axesNormals[idx9 + 15] = -dx
            axesNormals[idx9 + 16] = -dy
            axesNormals[idx9 + 17] = -dz

        }

        const t4 = performance.now()
        if(print_timing) console.log("do main loop in linesToThickLines",t4-t3)

        let axesIdx_new = 0;
        for (let idx = 0; idx < index_length; idx += 2) {
            let axesIdx_old = axesIdx_new;
            const idx3 = idx*3;
            axesIndexs_new[idx3]     = axesIdx_old;
            axesIndexs_new[idx3 +1 ] = axesIdx_old+2;
            axesIndexs_new[idx3 +2 ] = axesIdx_old+1;
            axesIndexs_new[idx3 +3 ] = axesIdx_old+3;
            axesIndexs_new[idx3 +4 ] = axesIdx_old+4;
            axesIndexs_new[idx3 +5 ] = axesIdx_old+5;
            axesIdx_new += 6;
        }

        const t5 = performance.now()
        if(print_timing) console.log("do index loop in linesToThickLines",t5-t4)

        let ret = {};
        ret["vertices"] = axesVertices_new;
        ret["indices"] = axesIndexs_new;
        ret["normals"] = axesNormals;
        ret["colours"] = axesColours_new;
        ret["realNormals"] = axesNormals_new;

        const t6 = performance.now()
        if(print_timing) console.log("make object in linesToThickLines",t6-t5)

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

    drawLineMeasures(invMat) {
        if(this.measurePointsArray.length<1) return;

        this.gl.depthFunc(this.gl.ALWAYS);
        //Begin copy/paste from crosshairs
        let axesOffset = vec3.create();
        vec3.set(axesOffset, 0, 0, 0);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])

        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        let pmvMatrix = mat4.create();
        let pMatrix = mat4.create();
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;

        let mat_width = 48;
        let mat_height = 48;
        if(this.renderToTexture){
            if(this.gl.viewportWidth > this.gl.viewportHeight){
                let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
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

        let hairColour = [0., 0., 0., 1.];
        let y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            hairColour = [1., 1., 1., 1.];
        }

        let lineStart = vec3.create();
        let lineEnd = vec3.create();

        let lastPoint = null;

        const addLine = (x1,y1,x2,y2) => {
            vec3.set(lineStart, x1 * this.zoom * ratio, y1 * this.zoom, 0.0);
            vec3.transformMat4(lineStart, lineStart, invMat);
            vec3.set(lineEnd,   x2 * this.zoom * ratio, y2 * this.zoom, 0.0);
            vec3.transformMat4(lineEnd, lineEnd, invMat);
            addSegment(renderArrays,
                xyzOff.map((coord, iCoord) => coord + lineStart[iCoord]),
                xyzOff.map((coord, iCoord) => coord + lineEnd[iCoord]),
                hairColour, hairColour
            )
        }

        this.measurePointsArray.forEach(point => {

            const x2 =  point.x;
            const y2 = -point.y;

            addLine(x2-.3/ratio,  y2-.3, x2+.3/ratio, y2-.3);
            addLine(x2-.3/ratio,  y2+.3, x2+.3/ratio, y2+.3);
            addLine(x2-.25/ratio, y2-.3, x2-.25/ratio, y2+.3);
            addLine(x2+.25/ratio, y2-.3, x2+.25/ratio, y2+.3);

            if(lastPoint){
                const x1 =  lastPoint.x;
                const y1 = -lastPoint.y;
                addLine(x1,y1,x2,y2);
            }
            lastPoint = point;
        })

        let size = 1.5;
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

    drawScaleBar(invMat,ratioMult=1.0) {
        this.gl.depthFunc(this.gl.ALWAYS);

        //Begin copy/paste from crosshairs
        let axesOffset = vec3.create();
        vec3.set(axesOffset, 0, 0, 0);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])

        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        let pmvMatrix = mat4.create();
        let pMatrix = mat4.create();
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult

        if(this.renderToTexture){
            if(this.gl.viewportWidth > this.gl.viewportHeight){
                let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
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

        let hairColour = [0., 0., 0., 1.];
        let y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            hairColour = [1., 1., 1., 1.];
        }
        //End copy/paste from crosshairs

        //Begin *almost* copy/paste from crosshairs
        // Actual axes

        const scale_fac = 10*this.zoom* this.gl.viewportWidth / this.gl.viewportHeight
        const scale_pow = Math.pow(10,Math.floor(Math.log(scale_fac)/Math.log(10)))
        let scale_length_fac = scale_pow / scale_fac

        if(scale_length_fac<0.5) scale_length_fac *=2
        if(scale_length_fac<0.5) scale_length_fac *=2.5

        let horizontalHairStart = vec3.create();
        let horizontalHairEnd = vec3.create();

        const scale_start_x = 18 - 10 * scale_length_fac

        vec3.set(horizontalHairStart, scale_start_x * this.zoom * ratio, -22.0 * this.zoom, 0.0);
        vec3.transformMat4(horizontalHairStart, horizontalHairStart, invMat);
        vec3.set(horizontalHairEnd, 18 * this.zoom * ratio, -22.0 * this.zoom, 0.0);
        vec3.transformMat4(horizontalHairEnd, horizontalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + horizontalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + horizontalHairEnd[iCoord]),
            hairColour, hairColour
        )

        vec3.set(horizontalHairStart, scale_start_x * this.zoom * ratio, -22.5 * this.zoom, 0.0);
        vec3.transformMat4(horizontalHairStart, horizontalHairStart, invMat);
        vec3.set(horizontalHairEnd, scale_start_x * this.zoom * ratio, -21.5 * this.zoom, 0.0);
        vec3.transformMat4(horizontalHairEnd, horizontalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + horizontalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + horizontalHairEnd[iCoord]),
            hairColour, hairColour
        )

        vec3.set(horizontalHairStart, 18 * this.zoom * ratio, -22.5 * this.zoom, 0.0);
        vec3.transformMat4(horizontalHairStart, horizontalHairStart, invMat);
        vec3.set(horizontalHairEnd, 18 * this.zoom * ratio, -21.5 * this.zoom, 0.0);
        vec3.transformMat4(horizontalHairEnd, horizontalHairEnd, invMat);

        addSegment(renderArrays,
            xyzOff.map((coord, iCoord) => coord + horizontalHairStart[iCoord]),
            xyzOff.map((coord, iCoord) => coord + horizontalHairEnd[iCoord]),
            hairColour, hairColour
        )

        let size = 1.5;
        const thickLines = this.linesToThickLines(renderArrays.axesVertices, renderArrays.axesColours, size);
        let axesNormals = thickLines["normals"];
        let axesVertices_new = thickLines["vertices"];
        let axesColours_new = thickLines["colours"];
        let axesIndexs_new = thickLines["indices"];

        //console.log("thickLines",thickLines);
        this.gl.depthFunc(this.gl.ALWAYS);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.uniform1f(this.shaderProgramThickLines.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_end, 1000.0);
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
        //End *almost* copy/paste from crosshairs

        this.gl.depthFunc(this.gl.LESS)
    }

    drawCrosshairs(invMat,ratioMult=1.0) {

        this.gl.depthFunc(this.gl.ALWAYS);
        this.gl.useProgram(this.shaderProgramTextBackground);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        let axesOffset = vec3.create();
        vec3.set(axesOffset, 0, 0, 0);
        const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord])
        this.gl.useProgram(this.shaderProgramThickLines);
        this.setMatrixUniforms(this.shaderProgramThickLines);
        let pmvMatrix = mat4.create();
        let pMatrix = mat4.create();
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult
        if(this.renderToTexture){
            if(this.gl.viewportWidth > this.gl.viewportHeight){
                let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight;
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

        let hairColour = [0., 0., 0., 0.5];
        let y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            hairColour = [1., 1., 1., 0.5];
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

        this.gl.uniform1f(this.shaderProgramThickLines.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_end, 1000.0);
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

    drawAxes(invMat,ratioMult=1.0) {

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTex);
        this.gl.depthFunc(this.gl.ALWAYS);
        let axesOffset = vec3.create();
        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult;
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
               if(this.doMultiView||this.doThreeWayView||this.doSideBySideStereo||this.doCrossEyedStereo){
                   mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24, 24, 0.1, 1000.0);
               } else {
                    mat4.ortho(pMatrix, -24 * ratio, 24 * ratio, -24 * ratio, 24 * ratio, 0.1, 1000.0);
               }
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

        let size = 1.5;
        let thickLines = this.linesToThickLines(renderArrays.axesVertices, renderArrays.axesColours, size);
        let axesNormals = thickLines["normals"];
        let axesVertices_new = thickLines["vertices"];
        let axesColours_new = thickLines["colours"];
        let axesIndexs_new = thickLines["indices"];

        //console.log("thickLines",thickLines);
        this.gl.depthFunc(this.gl.ALWAYS);

        this.gl.uniform4fv(this.shaderProgramThickLines.clipPlane0, [0, 0, -1, 1000]);
        this.gl.uniform4fv(this.shaderProgramThickLines.clipPlane1, [0, 0, 1, 1000]);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramThickLines.fog_end, 1000.0);
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

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);

        this.gl.useProgram(this.shaderProgramTextBackground);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);
        this.gl.uniform3fv(this.shaderProgramTextBackground.screenZ, this.screenZ);
        this.gl.uniform1f(this.shaderProgramTextBackground.pixelZoom, 0.04 * this.zoom);

        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexNormalAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexPositionAttribute);
        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexColourAttribute);

        this.gl.enableVertexAttribArray(this.shaderProgramTextBackground.vertexTextureAttribute);
        this.setMatrixUniforms(this.shaderProgramTextBackground);
        this.gl.uniformMatrix4fv(this.shaderProgramTextBackground.pMatrixUniform, false, pMatrix);
        this.gl.uniform4fv(this.shaderProgramTextBackground.clipPlane0, [0, 0, -1, 1000]);
        this.gl.uniform4fv(this.shaderProgramTextBackground.clipPlane1, [0, 0, 1, 1000]);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextBackground.fog_end, 1000.0);

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

            if(!this.axesTexture[colour][string]){
                const [maxS,ctx] = this.makeTextCanvas(string, 64, 32, colour, "20px Arial");
                const data = ctx.getImageData(0, 0, 64, 32);
                this.axesTexture[colour][string] = data;
            }

            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.axesTexture[colour][string]);
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.axesTexture[colour][string]);
            const tSizeX = 2.0 * this.textCtx.canvas.width / this.textCtx.canvas.height * this.zoom;
            const tSizeY = 2.0 * this.zoom;

            const [base_x, base_y, base_z] = location
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
                //this.gl.bindTexture(this.gl.TEXTURE_2D, null);
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

    drawTextOverlays(invMat,ratioMult=1.0,font_scale=1.0) {

        let ratio = 1.0 * this.gl.viewportWidth / this.gl.viewportHeight * ratioMult

        let textColour = "black";
        const y = this.background_colour[0] * 0.299 + this.background_colour[1] * 0.587 + this.background_colour[2] * 0.114;
        if (y < 0.5) {
            textColour = "white";
        }

        this.measureText2DCanvasTexture.clearBigTexture()

        const drawString = (s, xpos, ypos, zpos, font, threeD) => {
            if(font) this.textCtx.font = font;
            let axesOffset = vec3.create();
            vec3.set(axesOffset, xpos,ypos, 0);
            vec3.transformMat4(axesOffset, axesOffset, invMat);

            const xyzOff = this.origin.map((coord, iCoord) => -coord + this.zoom * axesOffset[iCoord]);
            let base_x = xyzOff[0];
            let base_y = xyzOff[1];
            let base_z = xyzOff[2];

            this.measureText2DCanvasTexture.addBigTextureTextImage({font:font,text:s,x:base_x,y:base_y,z:base_z})

        }

        this.textLegends.forEach(label => {
                let xpos = label.x * 48.0 -24.*ratio;
                let ypos = label.y * 48.0 -24.;
                drawString(label.text,xpos,ypos, 0.0, label.font, false);
        });

        if(this.showFPS) drawString(this.fpsText, -23.5*ratio, -23.5, 0.0, (20 * font_scale).toFixed(0)+"px helvetica", false);

        const scale_fac = 10.0*this.zoom* this.gl.viewportWidth / this.gl.viewportHeight;
        let scale_pow = Math.pow(10,Math.floor(Math.log(scale_fac)/Math.log(10)))
        let scale_length_fac = scale_pow / scale_fac;
        if(scale_length_fac<0.5) scale_pow *=2;
        if(scale_length_fac*2<0.5) scale_pow *=2.5;

        let scale_bar_text_x = 18.5 * this.gl.viewportWidth / this.gl.viewportHeight;
        if(this.showScaleBar){
            if(scale_pow>1.1){
                drawString(Math.floor(scale_pow)+"Å", scale_bar_text_x, -22.5, 0.0, "22px helvetica", false);
            } else {
                drawString(scale_pow.toFixed(1)+"Å", scale_bar_text_x, -22.5, 0.0, "22px helvetica", false);
            }
        }

        let lastPoint = null;
        let lastLastPoint = null;

        if(!this.doMultiView&&!this.doThreeWayView&&!this.doCrossEyedStereo&&!this.doSideBySideStereo){

            this.measurePointsArray.forEach(point => {
                if(lastPoint){
                    const dist = Math.sqrt(this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(point.x-lastPoint.x) * this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(point.x-lastPoint.x) + this.zoom*(point.y-lastPoint.y) * this.zoom*(point.y-lastPoint.y));
                    const mid_point = {x:(point.x+lastPoint.x)/2,y:(point.y+lastPoint.y)/2}
                    drawString(dist.toFixed(1)+"Å", mid_point.x*ratio, -mid_point.y, 0.0, "22px helvetica", false);
                    if(lastLastPoint){
                        let l1 = {x:(point.x-lastPoint.x),y:(point.y-lastPoint.y)}
                        l1.x /= dist / this.zoom;
                        l1.y /= dist / this.zoom;
                        const dist2 = Math.sqrt(this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(lastLastPoint.x-lastPoint.x) * this.zoom* this.gl.viewportWidth / this.gl.viewportHeight*(lastLastPoint.x-lastPoint.x) + this.zoom*(lastLastPoint.y-lastPoint.y) * this.zoom*(lastLastPoint.y-lastPoint.y));
                        let l2 = {x:(lastLastPoint.x-lastPoint.x),y:(lastLastPoint.y-lastPoint.y)}
                        l2.x /= dist2 / this.zoom;
                        l2.y /= dist2 / this.zoom;
                        const l1_dot_l2 = this.gl.viewportWidth / this.gl.viewportHeight*this.gl.viewportWidth / this.gl.viewportHeight*l1.x*l2.x + l1.y*l2.y;
                        const angle = Math.acos(l1_dot_l2) / Math.PI * 180.;
                        const angle_t = angle.toFixed(1)+"º";
                        drawString(angle_t, lastPoint.x*ratio, -lastPoint.y, 0.0, "22px helvetica", false);
                    }
                    lastLastPoint = lastPoint;
                }
                lastPoint = point;
            })
        }

        if(this.showShortCutHelp) {
            const fontSize = this.gl.viewportHeight * 0.018
            const font = `${fontSize > 16 ? 16 : fontSize}px helvetica`
            this.showShortCutHelp.forEach((shortcut, index) => {
                const xpos = -23.5 * ratio
                const ypos = -21.5 + index
                drawString(shortcut, xpos, ypos, 0.0, font, false)
            });
        }

        //Do we ever have any newTextLabels?
        //Draw Hbond, etc. text.
        this.newTextLabels.forEach(tlabel => {
            tlabel.forEach(label => {
                drawString(label.text, label.x,label.y,label.z, "30px helvetica", true);
            })
        })

        this.measureText2DCanvasTexture.recreateBigTextureBuffers();

        this.gl.useProgram(this.shaderProgramTextInstanced);
        this.setMatrixUniforms(this.shaderProgramTextInstanced);

        //If we want them to be on top
        this.gl.depthFunc(this.gl.ALWAYS);
        this.gl.uniform1f(this.shaderProgramTextInstanced.fog_start, 1000.0);
        this.gl.uniform1f(this.shaderProgramTextInstanced.fog_end, 1000.0);

        for(let i = 0; i<16; i++)
            this.gl.disableVertexAttribArray(i);


        this.measureText2DCanvasTexture.draw();

        this.gl.depthFunc(this.gl.LESS)
    }

    canvasPointToGLPoint(point) {
        let mat_width = 48;
        let mat_height = 48;
        const x = ((point.x/this.gl.viewportWidth  * getDeviceScale())-0.5)*mat_width;
        const y = ((point.y/this.gl.viewportHeight * getDeviceScale())-0.5)*mat_height;
        return {x:x,y:y};
    }

    getMouseXYGL(evt,canvas){
        let x;
        let y;
        let e = evt;
        if (e.pageX || e.pageY) {
            x = e.pageX;
            y = e.pageY;
        }
        else {
            x = e.clientX;
            y = e.clientY;
        }

        let offset = getOffsetRect(canvas);

        x -= offset.left;
        y -= offset.top;

        return this.canvasPointToGLPoint({x:x,y:y});
    }

    doMouseUpMeasure(evt, self) {

        const measure_click_tol = 1.0;

        const xy = self.getMouseXYGL(evt,self.canvas);
        const dist_du_sq = (self.measureDownPos.x-xy.x) * (self.measureDownPos.x-xy.x) + (self.measureDownPos.y-xy.y) * (self.measureDownPos.y-xy.y)

        if(dist_du_sq>2&&!self.measureHit)
            return;

        let i =0;
        const is_close = self.measurePointsArray.some(point => {
            const dist_sq = (point.x-xy.x) * (point.x-xy.x) + (point.y-xy.y) * (point.y-xy.y)
            if(dist_sq<measure_click_tol){
                self.measureHit = point;
                return true;
            }
            i++;
        })

        if(!is_close&&!evt.altKey)
            self.measurePointsArray.push(xy);

        if(evt.altKey&&is_close){
            const index = self.measurePointsArray.indexOf(self.measureHit);
            if (index > -1) {
                self.measurePointsArray.splice(index, 1);
            }
        }

        self.measureHit = null;
        self.measureButton = -1;
        this.drawScene();

    }

    doMouseDownMeasure(evt, self) {

        if(this.doThreeWayView||this.doCrossEyedStereo||this.doSideBySideStereo){
            return
        }

        const measure_click_tol = 1.0;

        const xy = self.getMouseXYGL(evt,self.canvas);
        let i = 0;
        self.measureHit = null;
        const is_close = self.measurePointsArray.some(point => {
            const dist_sq = (point.x-xy.x) * (point.x-xy.x) + (point.y-xy.y) * (point.y-xy.y);
            if(dist_sq<measure_click_tol){
                self.measureHit = point;
                return true;
            }
            i++;
        })

        self.measureButton = evt.button;
        self.measureDownPos.x = xy.x;
        self.measureDownPos.y = xy.y;

    }

    doMouseMoveMeasure(evt, self) {
        if(self.measureButton>-1&&self.measureHit){
            const xy = self.getMouseXYGL(evt,self.canvas);
            self.measureHit.x = xy.x;
            self.measureHit.y = xy.y;
            this.drawScene();
        }
    }

    doMouseUp(event, self) {
        const event_x = event.pageX;
        const event_y = event.pageY;
        self.init_y = event.pageY;
        this.currentlyDraggedAtom = null
        if (self.keysDown['center_atom'] || event.which===2) {
            if(Math.abs(event_x-self.mouseDown_x)<5 && Math.abs(event_y-self.mouseDown_y)<5){
                if(self.displayBuffers.length>0){
                    const [minidx,minj,mindist,minsym,minx,miny,minz] = self.getAtomFomMouseXY(event,self);
                    if(self.displayBuffers[minidx] && self.displayBuffers[minidx].atoms) {
                        let atx = self.displayBuffers[minidx].atoms[minj].x;
                        let aty = self.displayBuffers[minidx].atoms[minj].y;
                        let atz = self.displayBuffers[minidx].atoms[minj].z;
                        if(minsym>-1){
                            self.setOriginAnimated([-minx, -miny, -minz], true);
                        } else {
                            self.setOriginAnimated([-atx, -aty, -atz], true);
                        }
                    }
                }
            } else if (this.reContourMapOnlyOnMouseUp) {
                this.handleOriginUpdated(true)
            }
        } else if (event.altKey && event.shiftKey && this.reContourMapOnlyOnMouseUp) {
            this.handleOriginUpdated(true)
        }
        self.mouseDown = false;
        self.doHover(event,self);
    }

    drawSceneDirty() {
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
        //What is this method for?
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

    doMouseMove(event, self) {
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
            x *= getDeviceScale();
            y *= getDeviceScale();

            this.gl_cursorPos[0] = x;
            this.gl_cursorPos[1] = this.canvas.height - y;
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
            self.drawScene();
            return;
        }

        if (event.altKey) {
            let factor = 1. - self.dy / 50.;
            let newZoom = self.zoom * factor;
            if (newZoom < .01) {
                newZoom = 0.01;
            }
            self.setZoom(newZoom)
            self.drawScene();
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

            const rot_x_axis = vec3.create()
            const rot_y_axis = vec3.create()
            vec3.set(rot_x_axis, 1.0, 0.0, 0.0);
            vec3.set(rot_y_axis, 0.0, 1.0, 0.0);

            if(this.doThreeWayView&&this.threeWayViewports.length>0){
                const quats = this.threeWayQuats
                const viewports = this.threeWayViewports
                const mVPQ = this.getThreeWayMatrixAndViewPort(this.gl_cursorPos[0],this.gl_cursorPos[1],quats,viewports)
                if(mVPQ.quat) {
                    const theRotMatrix = quatToMat4(mVPQ.quat);
                    mat4.invert(theRotMatrix,theRotMatrix)
                    vec3.transformMat4(rot_x_axis, rot_x_axis, theRotMatrix);
                    vec3.transformMat4(rot_y_axis, rot_y_axis, theRotMatrix);
                }
            }

            let xQ = createQuatFromAngle(-self.dy,rot_x_axis);
            let yQ = createQuatFromAngle(-self.dx,rot_y_axis);
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

                const draggedAtomEvent: moorhen.AtomDraggedEvent = new CustomEvent("atomDragged", { detail: this.currentlyDraggedAtom });
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

        self.drawScene();
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
        Object.keys(self.props.keyboardAccelerators).forEach(key => {
            if (event.key && self.props.keyboardAccelerators[key].keyPress === event.key.toLowerCase() && self.props.keyboardAccelerators[key]) {
                self.keysDown[key] = false;
            }
        })
    }

    handleKeyDown(event, self) {
        let eventModifiersCodes: string[] = []

        if (event.shiftKey) eventModifiersCodes.push('shiftKey')
        if (event.ctrlKey) eventModifiersCodes.push('ctrlKey')
        if (event.metaKey) eventModifiersCodes.push('metaKey')
        if (event.altKey) eventModifiersCodes.push('altKey')

        Object.keys(self.props.keyboardAccelerators).forEach(key => {
            if (
                event.key &&
                self.props.keyboardAccelerators[key].keyPress === event.key.toLowerCase() &&
                self.props.keyboardAccelerators[key].modifiers.every(modifier => event[modifier]) &&
                eventModifiersCodes.every(modifier => self.props.keyboardAccelerators[key].modifiers.includes(modifier))
            ) {
                self.keysDown[key] = true
            } else {
                self.keysDown[key] = false
            }
        })

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
            let textMetric = theCtx.measureText("Mgq!^(){}|'\"~`√∫Å");
            let actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;
            let loop = 0;
            while(actualHeight>theCtx.canvas.height&&loop<3){
                theCtx.canvas.height *= 2;
                theCtx.font = font;
                textMetric = theCtx.measureText("M");
                actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;
                loop += 1;
            }
            theCtx.textAlign = "left";
            theCtx.fillStyle = "#00000000";
            theCtx.fillRect(0, 0, theCtx.canvas.width, theCtx.canvas.height);
            theCtx.fillStyle = textColour;
            theCtx.fillText(text, 0, theCtx.canvas.height + textMetric.ideographicBaseline,theCtx.canvas.width);
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
