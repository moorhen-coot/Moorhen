import * as vec3 from 'gl-matrix/vec3';
import * as vec4 from 'gl-matrix/vec4';
import * as quat4 from 'gl-matrix/quat';
import * as mat4 from 'gl-matrix/mat4';
//import {vec3} from 'gl-matrix/esm';

function NormalizeVec3(v){
    let vin = vec3Create(v);
    vec3.normalize(v,vin);
}

function vec3Cross(v1,v2,out){
    vec3.cross(out,v1,v2);
}

function vec3Add(v1,v2,out){
    vec3.add(out,v1,v2);
}

function vec3Subtract(v1,v2,out){
    vec3.subtract(out,v1,v2);
}

function vec3Create(v){
    var theVec = vec3.create();
    vec3.set(theVec,v[0],v[1],v[2],v[3]);
    return theVec;
}

function DihedralAngle(A,B,C,D){
    var AB = vec3.create();
    var BC = vec3.create();
    var CD = vec3.create();

    vec3Subtract(B,A,AB);
    vec3Subtract(C,B,BC);
    vec3Subtract(D,C,CD);

    var Q = vec3.create();
    var T = vec3.create();
    var S = vec3.create();

    vec3Cross(AB,BC,Q);
    vec3Cross(BC,CD,T);
    vec3Cross(Q,T,S);

    var ss = vec3.dot(S,S);
    var qt = vec3.dot(Q,T);

    var angle = Math.atan2(Math.sqrt(ss),qt);
    var sbc = S[0]*BC[0] + S[1]*BC[1] + S[2]*BC[2];

    if(sbc<0.0) {
        return -angle;
    } else {
        return angle;
    }

}

function DistanceBetweenTwoLines(p1,p2,p3,p4){
    var ret = [];

    var a1 = vec3.create();
    var a2 = vec3.create();
    vec3Subtract(p2,p1,a1);
    vec3Subtract(p4,p3,a2);

    ret[0] = -1.0;
    ret[1] = -1.0;
    ret[2] = -1.0;

    if(vec3.length(a1)===0){
        return ret;
    }

    var n = vec3.create();
    vec3Cross(a1,a2,n);

    if(Math.abs(vec3.length(n))<1e-6){
        return DistanceBetweenPointAndLine(p1,p2,p3);
    }

    if(vec3.length(a2)===0){
        return ret;
    }

    NormalizeVec3(n);

    var p4p1 = vec3.create();
    vec3Subtract(p4,p1,p4p1);

    var dist = Math.abs(vec3.dot(p4p1,n));
    var a1sq = vec3.length(a1)*vec3.length(a1);
    var a2sq = vec3.length(a2)*vec3.length(a2);

    var u = (a1sq*(vec3.dot(a2,p3) - vec3.dot(a2,p1)) + vec3.dot(a1,a2)*(vec3.dot(a1,p1) - vec3.dot(a1,p3)))/ (vec3.dot(a1,a2)*vec3.dot(a1,a2) - a1sq*a2sq);

    var t = (vec3.dot(a1,p3) + u * vec3.dot(a1,a2) - vec3.dot(a1,p1)) / a1sq;

    ret[0] = dist;
    ret[1] = t;
    ret[2] = u;

    return ret;

}

function DistanceBetweenPointAndLine(ls, le, p){

    var ret = [];
    ret.push(-1.0);

    var lemls = vec3.clone(le); 
    vec3Subtract(lemls, ls, lemls);

    var linesize = vec3.length(lemls);
    //console.log("ls: "+ls[0]+" "+ls[1]+" "+ls[2]);
    //console.log("le: "+le[0]+" "+le[1]+" "+le[2]);
    //console.log("p: "+p[0]+" "+p[1]+" "+p[2]);

    if(Math.abs(linesize)<1e-6){
        console.log("Zero length line in DistanceBetweenPointAndLine");
        return ret;
    }

    /* t is value in line equation p = p1 + t(p2-p1) */

    var pmls = vec3.clone(p); 
    vec3Subtract(pmls, ls, pmls);

    var t = vec3.dot(pmls,lemls) / (linesize*linesize);

    var ttlemls = vec3.clone(lemls);
    ttlemls[0] *= t;
    ttlemls[1] *= t;
    ttlemls[2] *= t;

    var pt = vec3.create();
    vec3Add(ls,ttlemls,pt);

    vec3Subtract(pt,p, pt);

    ret[0] = vec3.length(pt);
    ret[1] = t;

    return ret;

}

/**
 * Shortest distance from an infinite line to a finite segment, with the closest point on that
 * segment.
 *
 * DistanceBetweenTwoLines treats both as infinite, which is wrong for picking: a short segment
 * whose extension happens to pass near the ray would score as a hit from a long way off its own
 * ends. Here only the segment is clamped; the line is left infinite because the caller's ray
 * already spans the clip range and is range-checked separately.
 *
 * @param {number[]} ls - a point on the line
 * @param {number[]} le - a second point on the line
 * @param {number[]} a - one end of the segment
 * @param {number[]} b - the other end
 * @returns {[number, number, number[]]} distance, the segment parameter in [0, 1], and the
 *          closest point on the segment
 */
function DistanceBetweenLineAndSegment(ls, le, a, b){
    const d = [le[0]-ls[0], le[1]-ls[1], le[2]-ls[2]];
    const e = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
    const r = [ls[0]-a[0], ls[1]-a[1], ls[2]-a[2]];

    const dd = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
    const ee = e[0]*e[0] + e[1]*e[1] + e[2]*e[2];
    const de = d[0]*e[0] + d[1]*e[1] + d[2]*e[2];
    const dr = d[0]*r[0] + d[1]*r[1] + d[2]*r[2];
    const er = e[0]*r[0] + e[1]*r[1] + e[2]*r[2];

    // A degenerate segment is just a point, and a degenerate line has no direction to offer.
    if(ee < 1e-12 || dd < 1e-12){
        const closest = ee < 1e-12 ? [a[0], a[1], a[2]] : null;
        if(closest === null) return [-1.0, 0.0, [a[0], a[1], a[2]]];
        const dpl = DistanceBetweenPointAndLine(ls, le, closest);
        return [dpl[0], 0.0, closest];
    }

    const denom = dd*ee - de*de;
    // Parallel: every point of the segment is the same distance away, so take an end.
    let u = Math.abs(denom) < 1e-12 ? 0.0 : (dd*er - de*dr) / denom;
    u = Math.max(0.0, Math.min(1.0, u));

    const closest = [a[0] + u*e[0], a[1] + u*e[1], a[2] + u*e[2]];
    const dpl = DistanceBetweenPointAndLine(ls, le, closest);
    return [dpl[0], u, closest];
}

/**
 * The same, for a polyline given as flat x, y, z triples: the nearest of its segments.
 *
 * This is what makes a long object pickable by its whole extent rather than by however many
 * sample points someone thought to scatter over it.
 */
function DistanceBetweenLineAndPolyline(ls, le, flatPoints){
    let best = -1.0;
    let bestPoint = null;
    const count = Math.floor(flatPoints.length / 3);
    for(let i = 0; i + 1 < count; i++){
        const a = [flatPoints[3*i], flatPoints[3*i+1], flatPoints[3*i+2]];
        const b = [flatPoints[3*i+3], flatPoints[3*i+4], flatPoints[3*i+5]];
        const [distance, , closest] = DistanceBetweenLineAndSegment(ls, le, a, b);
        if(distance >= 0.0 && (best < 0.0 || distance < best)){
            best = distance;
            bestPoint = closest;
        }
    }
    return [best, bestPoint];
}

export {DistanceBetweenPointAndLine, DistanceBetweenTwoLines, DistanceBetweenLineAndSegment, DistanceBetweenLineAndPolyline, DihedralAngle, NormalizeVec3, vec3Cross, vec3Add, vec3Subtract, vec3Create};
