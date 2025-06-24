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
    const qnew = quat4.create()
    quat4.slerp(qnew,q1,q2,h)
    return qnew
}


