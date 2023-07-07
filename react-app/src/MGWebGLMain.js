import React, { createRef, Component } from 'react';

import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
//import {vec3,mat4} from 'gl-matrix/esm';
import pako from 'pako';
import {EnerLib, Model, Chain, Residue, Atom, parseMMCIF} from './mgMiniMol';
import {CIsoSurface} from './CIsoSurface.js';
import {base64encode,base64decode} from './mgBase64.js';
import {isMainchainHBond,PrintSecStructure,CalcSecStructure,GetSSE,GetBfactorSplinesColoured,GetWormColoured,GetSplinesColoured} from './mgSecStr.js';
import {SplineCurve,BezierCurve} from './mgMaths.js';
import {determineFontHeight} from './fontHeight.js';
import {readMapFromArrayBuffer,mapToMapGrid} from './mgWebGLReadMap.js';
import {wizards} from './mgWizard.js';

//TODO
import {MGWebGL } from './mgWebGL.js';

class MGMWebGLMain extends Component {

  render() {
    //var m = mat4.create();
    //var v = vec3.create();
    //console.log(m);
    //console.log(v);
    //console.log(pako);
    return (
        <div>
Hello World
        </div>
    );
  }
}

export default MGMWebGLMain;
