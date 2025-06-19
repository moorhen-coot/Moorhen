import * as quat4 from 'gl-matrix/quat';

export function createQuatFromDXAngle(angle_in, axis) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, Math.sin(angle / 2.0) * axis[0], Math.sin(angle / 2.0) * axis[1], Math.sin(angle / 2.0) * axis[2], Math.cos(angle / 2.0));
    return q;
}

export function createQuatFromAngle(angle_in,axis) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, Math.sin(angle / 2.0)*axis[0], Math.sin(angle / 2.0)*axis[1], Math.sin(angle / 2.0)*axis[2], Math.cos(angle / 2.0));
    return q;
}

export function createXQuatFromDX(angle_in) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, Math.sin(angle / 2.0), 0.0, 0.0, Math.cos(angle / 2.0));
    return q;
}

export function createYQuatFromDY(angle_in) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, 0.0, Math.sin(angle / 2.0), 0.0, Math.cos(angle / 2.0));
    return q;
}

export function createZQuatFromDX(angle_in) {
    let angle = angle_in * Math.PI / 180.0;
    let q = quat4.create();
    quat4.set(q, 0.0, 0.0, Math.sin(angle / 2.0), Math.cos(angle / 2.0));
    return q;
}

export function quatDotProduct(q1,q2){
    return q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
}

export function quatSlerp(q1,q2,h) {
    let cosw = quatDotProduct(q1,q2);
    if(Math.abs(Math.abs(cosw)-1.0)<1e-3) return q1;
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
    if(isNaN(newQuat[0])||isNaN(newQuat[1])||isNaN(newQuat[2])||isNaN(newQuat[3])){
        console.log(h)
        console.log(cosw)
        console.log(omega)
        console.log(q1Mult)
        console.log(q2Mult)
        console.log((Math.abs(cosw-1.0)))
        console.log((Math.abs(cosw-1.0)<1e-5))
        return q1
    }
    return newQuat
}


