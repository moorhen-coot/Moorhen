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

function BezierCurve(carts, accu){
  let spline = [];
  let nsteps = accu * (carts.length/3);
  let tstep = 1.0 / parseFloat(nsteps);

  let t = 0.0;
  for (let k = 0; k < nsteps; k++){
   let cartsi = JSON.parse(JSON.stringify(carts));

   for (let j = carts.length-3; j > 0; j-=3){
    for (let i = 0; i < j; i+=3){
     cartsi[i]   = (1-t)*cartsi[i]   + t*cartsi[i+3];
     cartsi[i+1] = (1-t)*cartsi[i+1] + t*cartsi[i+4];
     cartsi[i+2] = (1-t)*cartsi[i+2] + t*cartsi[i+5];
    }
   }

   spline.push(cartsi[0]);
   spline.push(cartsi[1]);
   spline.push(cartsi[2]);
   t += tstep;
  }

  return spline;

}

/****** lincrv.c ******/
/* Ken Shoemake, 1994 */
/* DialASpline(t,a,p,m,n,Cn,interp,val) computes a point val at parameter
    t on a spline with knot values a and control points p. The curve will have
    Cn continuity, and if interp is TRUE it will interpolate the control points.
    Possibilities include Langrange interpolants, Bezier curves, Catmull-Rom
    interpolating splines, and B-spline curves. Points have m coordinates, and
    n+1 of them are provided. The work array must have room for n+1 points.
 */

function DialASpline(t, a,  p, Cn, interp, output, idx, work)
{
    var i, j, k, h, lo, hi;

    let n = p.length/3 - 1;

    if (Cn>n-1) Cn = n-1;       /* Anything greater gives one polynomial */
    for (k=0; t> a[k]&&k<a.length; k++);    /* Find enclosing knot interval */
    for (h=k; t===a[k]; k++);    /* May want to use fewer legs */
    if (k>n) {k = n; if (h>k) h = k;}
    h = 1+Cn - (k-h); k--;
    lo = k-Cn; hi = k+1+Cn;


    if (interp) {               /* Lagrange interpolation steps */
        let drop=0;
        if (lo<0) {lo = 0; drop += Cn-k;
                   if (hi-lo<Cn) {drop += Cn-hi; hi = Cn;}}
        if (hi>n) {hi = n; drop += k+1+Cn-n;
                   if (hi-lo<Cn) {drop += lo-(n-Cn); lo = n-Cn;}}
        for (i=lo; i<=hi; i++){
          work[3*i]   = p[3*i];
          work[3*i+1] = p[3*i+1];
          work[3*i+2] = p[3*i+2];
        }
        for (j=1; j<=Cn; j++) {
            for (i=lo; i<=hi-j; i++) {
                let t0=(a[i+j]-t)/(a[i+j]-a[i]), t1=1-t0;
                work[3*i]   = t0*work[3*i]   + t1*work[3*(i+1)];
                work[3*i+1] = t0*work[3*i+1] + t1*work[3*(i+1)+1];
                work[3*i+2] = t0*work[3*i+2] + t1*work[3*(i+1)+2];
            }
        }
        h = 1+Cn-drop;
    } else {                    /* Prepare for B-spline steps */
        if (lo<0) {h += lo; lo = 0;}
        for (i=lo; i<=lo+h; i++){
          work[3*i]   = p[3*i];
          work[3*i+1] = p[3*i+1];
          work[3*i+2] = p[3*i+2];
        }
        if (h<0) h = 0;
    }
    for (j=0; j<h; j++) {
        let tmp = 1+Cn-j;
        for (i=h-1; i>=j; i--) {
            let t0=(a[lo+i+tmp]-t)/(a[lo+i+tmp]-a[lo+i]), t1=1-t0;
            work[3*(lo+i+1)]   = t0*work[3*(lo+i)]   + t1*work[3*(lo+i+1)];
            work[3*(lo+i+1)+1] = t0*work[3*(lo+i)+1] + t1*work[3*(lo+i+1)+1];
            work[3*(lo+i+1)+2] = t0*work[3*(lo+i)+2] + t1*work[3*(lo+i+1)+2];
        }
    }

    //console.log(t+" "+lo+" "+hi+" "+p.length);
    //console.log("done spline point");
    //console.log(work[3*(lo+h)]+" "+work[3*(lo+h)+1]+" "+work[3*(lo+h)+2]);
    output[3*idx]   = work[3*(lo+h)];
    output[3*idx+1] = work[3*(lo+h)+1];
    output[3*idx+2] = work[3*(lo+h)+2];
}

function SplineCurve(ctlPts, accu, Cn, interp){
   let nsteps = ctlPts.length/3 * accu;
   const  BIG = 1.0e8;
   let knots = [];
   let maxx = -BIG;
   let minx = BIG;
   let maxy = -BIG;
   let miny = BIG;
   let maxz = -BIG;
   let minz = BIG;
   let maxt = -BIG;
   let mint = BIG;
   var tstep;
   var knotstep;

   for(let i=0;i<ctlPts.length;i+=3){
     minx = Math.min(ctlPts[i],minx);
     maxx = Math.max(ctlPts[i],maxx);
     miny = Math.min(ctlPts[i+1],minx);
     maxy = Math.max(ctlPts[i+1],maxx);
     minz = Math.min(ctlPts[i+2],minx);
     maxz = Math.max(ctlPts[i+2],maxx);
   }

   mint = minx;
   mint = Math.min(mint,miny);
   mint = Math.min(mint,minz);

   maxt = maxx;
   maxt = Math.max(maxt,maxy);
   maxt = Math.max(maxt,maxz);

   tstep = (maxt-mint)/parseFloat(nsteps-1);
   knotstep = (maxt-mint)/(ctlPts.length/3-1);

   for(let i=0;i<ctlPts.length/3;i++){
     knots.push(mint + parseFloat(i)*knotstep);
   }
   knots.push(tstep);

   let output = [];
   let work = [];
   //console.log("mint: " + mint);
   //console.log("maxt: " + maxt);
   
   for (let ii=0;ii<nsteps;ii++){
     let t = mint + ii*tstep;
     DialASpline(t, knots, ctlPts, Cn, interp,output,ii,work);
   }
   //console.log(output.length);
   //console.log(knots.length+" "+nsteps);

   return output;
   
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

export {SplineCurve, BezierCurve, DistanceBetweenPointAndLine, DistanceBetweenTwoLines, DihedralAngle};
