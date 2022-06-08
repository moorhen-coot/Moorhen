import React from 'react'

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import {vec3} from 'gl-matrix/esm';
import {quat as quat4} from 'gl-matrix/esm';
import {DihedralAngle} from './mgMaths.js';
import {quatToMat4} from './quatToMat4.js';

function quat4Create(v1,v2,v3,v4){
    let theQuat = quat4.create();
    quat4.set(theQuat,v1,v2,v3,v4);
    return theQuat;
}

function vec3Create(v){
    let theVec = vec3.create();
    vec3.set(theVec,v[0],v[1],v[2],v[3]);
    return theVec;
}

function vec3CrossR(v1,v2){
    let out = vec3.create();
    vec3.cross(out,v1,v2);
    return out;
}

function NormalizeVec3(v){
    let vin = vec3Create(v);
    vec3.normalize(v,vin);
}

function vec3AddR(v1,v2){
    let out = vec3.create();
    vec3.add(out,v1,v2);
    return out;
}

function vec3SubtractR(v1,v2){
    let out = vec3.create();
    vec3.subtract(out,v1,v2);
    return out;
}

function vec3ScaleR(v1,s){
    let out = vec3.create();
    out[0] = v1[0] * s;
    out[1] = v1[1] * s;
    out[2] = v1[2] * s;
    return out;
}

function mat3MultVec3R(m,v){
    let out = vec3.create();
    vec3.transformMat4(out,v,m);
    return out;
}

/*
A small utility to generate amino-acid helices.*/

function CreateHelixPDB(ztrans = null, turnAngle = null, psi = null, nresidues = 3, sideChainH = false, scaleMult = 2.1, isBeta = false, phipsi = false, psinew = 0.0, phi = 0.0) {
    /*
CreateHelixPDB: returns a PDB format string containing atoms in
helix as defined by following parameters.
ztrans: Translation along z-axis per amino acid.
turnAngle: Rotation about z-axis per amino acid.
psi: The peptide linkage psi angle.
nresidues: The number of amino-acid units in the helix.
scaleMult: A number that ensures CA-CA distance is ~3.8anstroms.
This number should be calculated internally, but is
fudged at the moment until I sort out my geometry.
     */
    let a1, a2, angle, ax, ax2, c, ca, ca2, ca2ca, cac, cacart, cacartold, cacb, caccart, caccartnew, cacn, cacnorm, caco, cacoldnorm, caha, can, cancart, cancartnew, cannorm, carts, cbcart, cbcartnew, ccart, ccartold, ccb, ccbt, cfrac, ch2, ch3, cha, chb, cn, cnca, cncartnew, cnnorm, cnoldnorm, co, cocart, coxt, coxtcartnew, crosscart, h, h2cart, hacart, hacartnew, hb1cart, hb2cart, hb3cart, hc, hcart, hn, n, nca, ncac, ncacartnew, ncacb, ncanorm, ncart, ncartold, nccartnew, nfrac, nh, nh1, nh2, nhcart, ocart, oh, ohcart, omega, out, oxt, oxtcart, pcacb, pcn, prevCcart, prevNcart, psidiff, q, qOther, qOther1, qOther2, qOtherH, qOtherHB, qc1, qca1, qcb, qh, qh1, qh2, qn1, qo, qo1, qoxt, qoxt1, qphi, qpsi, rotax, s, sinth, theOther, theta, theta2, x, x2, y, y2, z, z2, zaxis;
    nresidues = nresidues + 1;
    a1 = a2 = 120 * Math.PI / 180.0;
    sinth = (1.46 * Math.sin(a1) + 1.5 * Math.sin(a2)) / 3.8;
    cfrac = 1.5 * Math.cos(Math.PI * (60 - Math.asin(sinth) * 180 / Math.PI) / 180) / 3.8;
    nfrac = (3.8 - 1.46 * Math.cos(Math.PI * (60 - Math.asin(sinth) * 180 / Math.PI) / 180)) / 3.8;
    hc = 1.5 * Math.sin(Math.PI * (60 - Math.asin(sinth) * 180 / Math.PI) / 180);
    hn = -1.46 * Math.sin(Math.PI * (60 - Math.asin(sinth) * 180 / Math.PI) / 180);
    zaxis = vec3Create([0, 0, 1]);
    carts = [];

    for (let i = 0, _pj_a = 2; i < _pj_a; i += 1) {
        theta = i * turnAngle;
        x = scaleMult * Math.sin(theta);
        y = scaleMult * Math.cos(theta);
        z = -i * ztrans;
        ca = vec3Create([x, y, z]);
        theta2 = (i + 1) * turnAngle;
        x2 = scaleMult * Math.sin(theta2);
        y2 = scaleMult * Math.cos(theta2);
        z2 = -(i + 1) * ztrans;
        ca2 = vec3Create([x2, y2, z2]);
        c = vec3AddR(ca , vec3ScaleR(vec3SubtractR(ca2 , ca) , cfrac));
        n = vec3AddR(ca , vec3ScaleR(vec3SubtractR(ca2 , ca) , nfrac));
        ca2ca = vec3SubtractR(ca2 , ca);
        NormalizeVec3(ca2ca);
        out = vec3CrossR(ca2ca, zaxis);
        NormalizeVec3(out);
        h = vec3CrossR(ca2ca, out);

        if (i > 0) {
            cacart = vec3Create([x, y, z]);
            ccart = vec3Create([c[0] + h[0] * hc, c[1] + h[1] * hc, c[2] + h[2] * hc]);
            carts.push(cacart);
            carts.push(ccart);
        }

        ncart = vec3Create([n[0] + h[0] * hn, n[1] + h[1] * hn, n[2] + h[2] * hn]);
        carts.push(ncart);
    }
    console.log(carts);

    angle = DihedralAngle(carts[0], carts[1], carts[2], carts[3]);
    psidiff = angle * 180 / Math.PI - psi;

    console.log(angle);
    console.log(psidiff);

    s = "";

    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
    console.log(nresidues);
    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
    if (phipsi) {
        s = s + "SHEET    1  AA 1 ALA A   1  ALA A " +nresidues.toString().padStart(3) + "  0\n";
        nca = 1.47;
        cac = 1.52;
        cacb = 1.52;
        cn = 1.35;
        co = 1.24;
        coxt = 1.2;
        caha = 1.0;
        nh = 0.86;
        oh = 0.9;
        ncac = 109;
        ncacb = 110;
        cacn = 115;
        cnca = 122;
        caco = 120;
        psi = psinew;
        omega = 180;
        ncart = vec3Create([0, 0, 0]);
        cacart = vec3Create([0, 0, nca]);
        q = quat4Create(1, 0, 0, 1, 180 - ncac);
        caccart = vec3Create([0, 0, cac]);
        ccart = vec3AddR(mat3MultVec3R(quatToMat4(q) , caccart) , cacart);
        console.log(caccart);
        nhcart = vec3Create([0, 0, nh]);
        q = quat4Create(1, 0, 0, 1, 120);
        nhcart = mat3MultVec3R(quatToMat4(q) , nhcart);
        cancart = vec3SubtractR(cacart , ncart);
        qh2 = quat4Create(cancart[0], cancart[1], cancart[2], 1, 110);
        qh1 = quat4Create(cancart[0], cancart[1], cancart[2], 1, -110);
        nh2 = mat3MultVec3R(quatToMat4(qh2) , nhcart);
        nh1 = mat3MultVec3R(quatToMat4(qh1) , nhcart);
        hcart = vec3AddR(ncart , nh1);
        h2cart = vec3AddR(ncart , nh2);
        console.log(nhcart);
        console.log(cancart);
        console.log(hcart);
        console.log(h2cart);

        for (let i = 0, _pj_a = nresidues; i < _pj_a; i += 1) {
            if (i > 0) {
                if (i > 1) {
                    cancartnew = vec3SubtractR(cacart , ncart);
                    NormalizeVec3(cancartnew);
                    console.log(cancartnew);
                    nccartnew = vec3SubtractR(ncart , prevCcart);
                    NormalizeVec3(nccartnew);
                    console.log(nccartnew);
                    ax = vec3SubtractR(nccartnew , cancartnew);
                    NormalizeVec3(ax);
                    ax[0] *= nh; ax[1] *= nh; ax[2] *= nh; 
                    hcart = vec3AddR(ncart , ax);
                    console.log(hcart);
                }

                console.log(hcart);
                console.log(h2cart);
//FIXME
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 2, " H  ", " ", "ALA", "A", i, " ", hcart[0], hcart[1], hcart[2], 1, 99, " H"];

                if (i === 1) {
                    s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 3, " H2 ", " ", "ALA", "A", i, " ", h2cart[0], h2cart[1], h2cart[2], 1, 99, " H"];
                }

                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 4, " CA ", " ", "ALA", "A", i, " ", cacart[0], cacart[1], cacart[2], 1, 99, " C"];
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 5, " C  ", " ", "ALA", "A", i, " ", ccart[0], ccart[1], ccart[2], 1, 99, " C"];
                ncacartnew = vec3SubtractR(prevNcart , cacart);
                NormalizeVec3(ncacartnew);
                console.log(ncacartnew);
                caccartnew = vec3SubtractR(ccart , cacart);
                NormalizeVec3(caccartnew);
                ax = vec3AddR(ncacartnew , caccartnew);
                console.log(ax);
                NormalizeVec3(ax);
                ax2 = vec3CrossR(ncacartnew, caccartnew);
                NormalizeVec3(ax2);
                console.log(ax2);
                rotax = vec3CrossR(ax, ax2);
                console.log(rotax);
                qOther = quat4Create(rotax[0], rotax[1], rotax[2], 1, 35);
                qOtherH = quat4Create(rotax[0], rotax[1], rotax[2], 1, 145);
                cbcartnew = mat3MultVec3R(quatToMat4(qOther) , ax2);
                hacartnew = mat3MultVec3R(quatToMat4(qOtherH) , ax2);
                NormalizeVec3(hacartnew);
                NormalizeVec3(cbcartnew);
                console.log(hacartnew);
                console.log(cbcartnew);
                hacartnew[0] *= caha; hacartnew[1] *= caha; hacartnew[2] *= caha; 
                cbcartnew[0] *= cacb; cbcartnew[1] *= cacb; cbcartnew[2] *= cacb; 
                cbcart = vec3AddR(cacart , cbcartnew);
                hacart = vec3AddR(cacart , hacartnew);
                console.log(cbcart);
                console.log(hacart);
                pcn = vec3SubtractR(cacart , prevNcart);
                NormalizeVec3(pcn);
                crosscart = vec3CrossR(caccartnew, pcn);
                NormalizeVec3(crosscart);
                qcb = quat4Create(crosscart[0], crosscart[1], crosscart[2], 1, 60);
                ccbt = mat3MultVec3R(quatToMat4(qcb) , pcn);
                pcacb = vec3SubtractR(cacart , cbcart);
                theOther = vec3CrossR(ccbt, crosscart);
                qOtherHB = quat4Create(theOther[0], theOther[1], theOther[2], 1, -15);
                qOther1 = quat4Create(pcacb[0], pcacb[1], pcacb[2], 1, 60);
                quat4.multiply(qOtherHB,qOtherHB,qOther1);
                chb = mat3MultVec3R(quatToMat4(qOtherHB) , ccbt);
                hb1cart = vec3AddR(cbcart , vec3ScaleR(chb , 0.98));
                qOther = quat4Create(pcacb[0], pcacb[1], pcacb[2], 1, 120);
                qOther2 = quat4Create(pcacb[0], pcacb[1], pcacb[2], 1, 240);
                ch2 = mat3MultVec3R(quatToMat4(qOther) , chb);
                hb2cart = vec3AddR(cbcart , vec3ScaleR(ch2 , 0.98));
                ch3 = mat3MultVec3R(quatToMat4(qOther2) , chb);
                hb3cart = vec3AddR(cbcart , vec3ScaleR(ch3 , 0.98));
                console.log(pcacb);
                console.log(chb);
                console.log(hb1cart);
                console.log(hb2cart);
                console.log(hb3cart);
            }

            if (i > 0) {
                cacartold = cacart;
                ccartold = ccart;
                ncartold = ncart;
                cacoldnorm = vec3SubtractR(cacartold , ccartold);
                NormalizeVec3(cacoldnorm);
                cnoldnorm = vec3SubtractR(ncartold , ccartold);
                NormalizeVec3(cnoldnorm);
                cncartnew = vec3SubtractR(ccart , cacart);
                coxtcartnew = vec3SubtractR(ccart , cacart);
                NormalizeVec3(cncartnew);
                NormalizeVec3(coxtcartnew);
                cncartnew[0] *= coxt; cncartnew[1] *= coxt; cncartnew[2] *= coxt; 
                coxtcartnew[0] *= cn; coxtcartnew[1] *= cn; coxtcartnew[2] *= cn; 
                cannorm = vec3SubtractR(ncart , cacart);
                cacnorm = vec3SubtractR(ccart , cacart);
                console.log(cannorm);
                console.log(cacnorm);
                NormalizeVec3(cannorm);
                NormalizeVec3(cacnorm);
                rotax = vec3CrossR(cannorm, cacnorm);
                console.log(rotax);
                qn1 = quat4Create(rotax[0], rotax[1], rotax[2], 1, 180 - cacn);
                qoxt1 = quat4Create(rotax[0], rotax[1], rotax[2], 1, 180 - caco);
                cncartnew = mat3MultVec3R(quatToMat4(qn1) , cncartnew);
                coxtcartnew = mat3MultVec3R(quatToMat4(qoxt1) , coxtcartnew);
                qphi = quat4Create(cacnorm[0], cacnorm[1], cacnorm[2], 1, 180 - phi);
                cncartnew = mat3MultVec3R(quatToMat4(qphi) , cncartnew);
                coxtcartnew = mat3MultVec3R(quatToMat4(qphi) , coxtcartnew);
                ncart = vec3AddR(ccart , cncartnew);
                oxtcart = vec3AddR(ccart , coxtcartnew);
                cncartnew = vec3SubtractR(ccart , cacart);
                NormalizeVec3(cncartnew);
                cncartnew[0] *= co; cncartnew[1] *= co; cncartnew[2] *= co; 
                qo1 = quat4Create(rotax[0], rotax[1], rotax[2], 1, 180 - caco);
                cocart = mat3MultVec3R(quatToMat4(qo1) , cncartnew);
                qphi = quat4Create(cacnorm[0], cacnorm[1], cacnorm[2], 1, -phi);
                cocart = mat3MultVec3R(quatToMat4(qphi) , cocart);
                ocart = vec3AddR(ccart , cocart);
                ncacartnew = vec3SubtractR(ncart , ccart);
                NormalizeVec3(ncacartnew);
                ncacartnew[0] *= nca; ncacartnew[1] *= nca; ncacartnew[2] *= nca; 
                cnnorm = vec3SubtractR(ncart , ccart);
                NormalizeVec3(cnnorm);
                rotax = vec3CrossR(cnnorm, cacnorm);
                qca1 = quat4Create(rotax[0], rotax[1], rotax[2], 1, 180 - cnca);
                ncacartnew = mat3MultVec3R(quatToMat4(qca1) , ncacartnew);
                cacart = vec3AddR(ncart , ncacartnew);
                caccartnew = vec3SubtractR(cacart , ncart);
                NormalizeVec3(caccartnew);
                caccartnew[0] *= cac; caccartnew[1] *= cac; caccartnew[2] *= cac; 
                ncanorm = vec3SubtractR(cacart , ncart);
                NormalizeVec3(ncanorm);
                rotax = vec3CrossR(cnnorm, ncanorm);
                qc1 = quat4Create(rotax[0], rotax[1], rotax[2], 1, 180 - ncac);
                caccartnew = mat3MultVec3R(quatToMat4(qc1) , caccartnew);
                qpsi = quat4Create(ncanorm[0], ncanorm[1], ncanorm[2], 1, -psi);
                caccartnew = mat3MultVec3R(quatToMat4(qpsi) , caccartnew);
                prevCcart = vec3Create([ccart[0], ccart[1], ccart[2]]);
                ccart = vec3AddR(cacart , caccartnew);
                console.log(ocart);
                console.log(cbcart);
                console.log(hacart);
                console.log(hb1cart);
                console.log(hb2cart);
                console.log(hb3cart);
                console.log(ncart);
                console.log(oxtcart);
//FIXME
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 6, " O  ", " ", "ALA", "A", i, " ", ocart[0], ocart[1], ocart[2], 1, 99, " O"];
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 7, " CB ", " ", "ALA", "A", i, " ", cbcart[0], cbcart[1], cbcart[2], 1, 99, " C"];
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 8, " HA ", " ", "ALA", "A", i, " ", hacart[0], hacart[1], hacart[2], 1, 99, " H"];

                if (sideChainH) {
                    s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 9, " HB1", " ", "ALA", "A", i, " ", hb1cart[0], hb1cart[1], hb1cart[2], 1, 99, " H"];
                    s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 10, " HB2", " ", "ALA", "A", i, " ", hb2cart[0], hb2cart[1], hb2cart[2], 1, 99, " H"];
                    s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 11, " HB3", " ", "ALA", "A", i, " ", hb3cart[0], hb3cart[1], hb3cart[2], 1, 99, " H"];
                }
            }

            if (i < nresidues - 1) {
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * i + 1, " N  ", " ", "ALA", "A", i + 1, " ", ncart[0], ncart[1], ncart[2], 1, 99, " N"];
            }

            prevNcart = vec3Create([ncart[0], ncart[1], ncart[2]]);

            if (i === nresidues - 1) {
                ohcart = vec3Create([-cacoldnorm[0], -cacoldnorm[1], -cacoldnorm[2]]);
                NormalizeVec3(ohcart);
                ohcart[0] *= oh; ohcart[1] *= oh; ohcart[2] *= oh; 
                ohcart = vec3AddR(ocart , ohcart);
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 12, " OXT", " ", "ALA", "A", i, " ", oxtcart[0], oxtcart[1], oxtcart[2], 1, 99, " O"];
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 13, " HO ", " ", "ALA", "A", i, " ", ohcart[0], ohcart[1], ohcart[2], 1, 99, " H"];
                console.log(ohcart);
            }
        }

        console.log("returning 1");
        return s;
    }

    for (let i = 0, _pj_a = nresidues; i < _pj_a; i += 1) {
        console.log("hello");
        theta = i * turnAngle;
        x = scaleMult * Math.sin(theta);
        y = scaleMult * Math.cos(theta);
        z = -i * ztrans;
        ca = vec3Create([x, y, z]);
        theta2 = (i + 1) * turnAngle;
        x2 = scaleMult * Math.sin(theta2);
        y2 = scaleMult * Math.cos(theta2);
        z2 = -(i + 1) * ztrans;
        ca2 = vec3Create([x2, y2, z2]);
        c = vec3AddR(ca ,  vec3ScaleR(vec3SubtractR(ca2 , ca) , cfrac));
        n = vec3AddR(ca ,  vec3ScaleR(vec3SubtractR(ca2 , ca) , nfrac));
        ca2ca = vec3SubtractR(ca2 , ca);
        NormalizeVec3(ca2ca);
        out = vec3CrossR(ca2ca, zaxis);
        NormalizeVec3(out);
        h = vec3CrossR(ca2ca, out);
        ccart = vec3Create([c[0] + h[0] * hc, c[1] + h[1] * hc, c[2] + h[2] * hc]);
        ncart = vec3Create([n[0] + h[0] * hn, n[1] + h[1] * hn, n[2] + h[2] * hn]);
        q = quat4Create(ca2ca[0], ca2ca[1], ca2ca[2], 1, psidiff);
        ccart = vec3AddR(c , mat3MultVec3R(quatToMat4(q) , vec3SubtractR(ccart , c)));
        ncart = vec3AddR(n , mat3MultVec3R(quatToMat4(q) , vec3SubtractR(ncart , n)));
        cacart = vec3Create([x, y, z]);
        cac =  vec3SubtractR(ccart , cacart);
        cn =  vec3SubtractR(ncart , ccart);
        NormalizeVec3(cac);
        NormalizeVec3(cn);
        crosscart = vec3CrossR(cac, cn);
        console.log(crosscart);
        qo = quat4Create(crosscart[0], crosscart[1], crosscart[2], 1, -120);
        co = mat3MultVec3R(quatToMat4(qo) , cn);
        ocart = vec3AddR(ccart , vec3ScaleR(co , 1.2));

        if (i === nresidues - 1) {
            qoxt = quat4Create(cac[0], cac[1], cac[2], 1, 180);
            oxt = mat3MultVec3R(quatToMat4(qoxt) , co);
            oxtcart = vec3AddR(ccart , vec3ScaleR(oxt , 1.2));
            oh = vec3Create([cac[0], cac[1], cac[2]]);
            ohcart = vec3AddR(ocart , vec3ScaleR(oh , 0.9));
        }

        if (i > 0) {
            cn = vec3SubtractR(cacart , prevNcart);
            console.log(cn);
            NormalizeVec3(cn);
            crosscart = vec3CrossR(cac, cn);
            NormalizeVec3(crosscart);
            qcb = quat4Create(crosscart[0], crosscart[1], crosscart[2], 1, 60);
            ccbt = mat3MultVec3R(quatToMat4(qcb) , cn);
            theOther = vec3CrossR(ccbt, crosscart);
            qOther = quat4Create(theOther[0], theOther[1], theOther[2], 1, 55);
            qOtherH = quat4Create(theOther[0], theOther[1], theOther[2], 1, -55);
            cha = mat3MultVec3R(quatToMat4(qOtherH) , ccbt);
            hacart = vec3AddR(cacart , vec3ScaleR(cha , 0.98));
            ccb = mat3MultVec3R(quatToMat4(qOther) , ccbt);
            cbcart = vec3AddR(cacart , vec3ScaleR(ccb , 1.5));
            cacb = vec3SubtractR(cacart , cbcart);
            qOtherHB = quat4Create(theOther[0], theOther[1], theOther[2], 1, -15);
            qOther1 = quat4Create(cacb[0], cacb[1], cacb[2], 1, 60);
            quat4.multiply(qOtherHB,qOtherHB,qOther1);
            chb = mat3MultVec3R(quatToMat4(qOtherHB) , ccbt);
            hb1cart =  vec3AddR(cbcart , vec3ScaleR(chb , 0.98));
            qOther = quat4Create(cacb[0], cacb[1], cacb[2], 1, 120);
            qOther2 = quat4Create(cacb[0], cacb[1], cacb[2], 1, 240);
            ch2 = mat3MultVec3R(quatToMat4(qOther) , chb);
            hb2cart =  vec3AddR(cbcart , vec3ScaleR(ch2 , 0.98));
            ch3 = mat3MultVec3R(quatToMat4(qOther2) , chb);
            hb3cart =  vec3AddR(cbcart , vec3ScaleR(ch3 , 0.98));
            cn = vec3SubtractR(prevNcart , prevCcart);
            NormalizeVec3(cn);
            can = vec3SubtractR(cacart , prevNcart);
            NormalizeVec3(can);
            crosscart = vec3CrossR(cn, can);
            qh = quat4Create(crosscart[0], crosscart[1], crosscart[2], 1, -120);
            nh = mat3MultVec3R(quatToMat4(qh) , can);
            hcart = vec3AddR(prevNcart , vec3ScaleR(nh , 0.86));

            if (i === 1) {
                qh2 = quat4Create(can[0], can[1], can[2], 1, 110);
                qh1 = quat4Create(can[0], can[1], can[2], 1, -110);
                nh2 = mat3MultVec3R(quatToMat4(qh2) , nh);
                nh1 = mat3MultVec3R(quatToMat4(qh1) , nh);
                hcart = vec3AddR(prevNcart , vec3ScaleR(nh1 , 0.86));
                h2cart = vec3AddR(prevNcart , vec3ScaleR(nh2 , 0.86));
                console.log(hcart);
                console.log(h2cart);
            }
        }

//FIXME
        if (i >= 1) {
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 2, " H  ", " ", "ALA", "A", i, " ", hcart[0], hcart[1], hcart[2], 1, 99, " H"];
        }

        if (i === 1) {
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 3, " H2 ", " ", "ALA", "A", i, " ", h2cart[0], h2cart[1], h2cart[2], 1, 99, " H"];
        }

        if (i > 0) {
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 4, " CA ", " ", "ALA", "A", i, " ", x, y, z, 1, 99, " C"];
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 5, " C  ", " ", "ALA", "A", i, " ", ccart[0], ccart[1], ccart[2], 1, 99, " C"];
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 6, " O  ", " ", "ALA", "A", i, " ", ocart[0], ocart[1], ocart[2], 1, 99, " O"];
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 7, " CB ", " ", "ALA", "A", i, " ", cbcart[0], cbcart[1], cbcart[2], 1, 99, " C"];
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 8, " HA ", " ", "ALA", "A", i, " ", hacart[0], hacart[1], hacart[2], 1, 99, " H"];

            if (sideChainH) {
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 9, " HB1", " ", "ALA", "A", i, " ", hb1cart[0], hb1cart[1], hb1cart[2], 1, 99, " H"];
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 10, " HB2", " ", "ALA", "A", i, " ", hb2cart[0], hb2cart[1], hb2cart[2], 1, 99, " H"];
                s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 11, " HB3", " ", "ALA", "A", i, " ", hb3cart[0], hb3cart[1], hb3cart[2], 1, 99, " H"];
            }
        }

        if (i < nresidues - 1) {
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * i + 1, " N  ", " ", "ALA", "A", i + 1, " ", ncart[0], ncart[1], ncart[2], 1, 99, " N"];
        }

        if (i === nresidues - 1) {
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 12, " OXT", " ", "ALA", "A", i, " ", oxtcart[0], oxtcart[1], oxtcart[2], 1, 99, " O"];
            s = s + "%6s%5d %4s%s%3s %s%4d%s   %8.3f%8.3f%8.3f%6.2f%6.2f          %2s\n" % ["ATOM  ", 11 * (i - 1) + 13, " HO ", " ", "ALA", "A", i, " ", ohcart[0], ohcart[1], ohcart[2], 1, 99, " H"];
        }

        prevNcart = vec3Create([ncart[0], ncart[1], ncart[2]]);
        prevCcart = vec3Create([ccart[0], ccart[1], ccart[2]]);
    }

    return s;
}

const Spacer = props => {
  return (
    <div style={{height:props.height}}></div>
  );
}

class Helices extends React.Component {
    constructor(props){
        super(props);
        this.state = { helixType : "Alpha", nResidues : 10, doCB : true };
        this.helixTypes = ["Alpha","3-10","Pi","Left-handed alpha","Untwisted beta","Twisted beta parallel","Twisted beta antiparallel"];
    }

    cbChanged(evt){
        this.setState({doCB:evt.target.checked});
    }

    typeChanged(evt){
        this.setState({helixType:evt.target.value});
    }

    numberChanged(evt){
        this.setState({nResidues:evt.target.value});
    }

    handleSubmit(){
        console.log(this.state.helixType,this.state.nResidues,this.state.doCB);

        const t = this.state.helixType;
        const nresidues = this.state.nResidues;
        const sideChainH = this.state.doCB;
        const phipsi = true;

        if(nresidues<1)
            return;

        let isBeta = false;
        let ztrans,turnAngle,psi,phi,scaleMult,psinew;

        if(t === "3-10"){
            ztrans = 2;
            turnAngle = 2 * Math.PI/3.;
            psi = -26;
            scaleMult = 1.865476;
            phi = 74;
            psinew = 4;
        } else if(t === "Twisted-Beta-parallel"){
            ztrans = 3.4;
            turnAngle = 195 * Math.PI / 180.;
            psi = -105;
            scaleMult = 0.7;
            isBeta = true;
            phi = -119;
            psinew = 113;
        } else if(t === "Twisted-Beta-anti-parallel"){
            ztrans = 3.4;
            turnAngle = 195 * Math.PI / 180.;
            psi = -105;
            scaleMult = 0.7;
            isBeta = true;
            phi = -139;
            psinew = 135;
        } else if(t === "Untwisted-Beta"){
            ztrans = 3.4;
            turnAngle = 180 * Math.PI / 180.;
            psi = -105;
            scaleMult = 0.7;
            isBeta = true;
            phi = -131;
            psinew = 135;
        } else if(t === "Left-handed-alpha"){
            ztrans = 1.5;
            turnAngle = -100 * Math.PI / 180.;
            psi = 60;
            scaleMult = -2.1;
            phi = -57;
            psinew = -47;
        } else if(t === "Alpha"){
            ztrans = 1.5;
            turnAngle = 100 * Math.PI / 180.;
            psi = -60;
            scaleMult = 2.1;
            phi = 57;
            psinew = 47;
        } else if(t === "Pi"){
            ztrans = 1.15;
            turnAngle = 87 * Math.PI / 180.;
            psi = -60;
            scaleMult = 2.35;
            phi = 57;
            psinew = 70 ;
        } else {
            return
        }

        let s = CreateHelixPDB(ztrans,turnAngle,psi,parseInt(nresidues),sideChainH,scaleMult,isBeta,phipsi,psinew,phi);
        console.log(s);

    }

    render() {
        const helixOptions = [];
        const typeChanged = this.typeChanged.bind(this);
        const numberChanged = this.numberChanged.bind(this);
        const cbChanged = this.cbChanged.bind(this);
        const handleSubmit = this.handleSubmit.bind(this);

        for(let iho=0;iho<this.helixTypes.length;iho++){
            const item = this.helixTypes[iho];
            helixOptions.push(
                        <option key={item} value={item}>
                        {item}
                        </option>
                        );
        }
        return (
        <>
        <Form>

        <Spacer height="1rem" />
        <Form.Group as={Row} controlId="helixtype">
        <Col>
        <div>Helix type</div>
        </Col>
        <Col>
        <Form.Select aria-label="helix-type-select" value={this.state.helixType} onChange={typeChanged}>
        {helixOptions}
        </Form.Select>
        </Col>
        </Form.Group>

        <Spacer height="1rem" />
        <Form.Group as={Row} controlId="nohelixres">
        <Col>
        <div>Number of resides</div>
        </Col>
        <Col>
          <Form.Control
            required
            type="number"
            placeholder="Number of residues"
            value={this.state.nResidues}
            onChange={numberChanged}
          />

        </Col>
        </Form.Group>
        
        <Spacer height="1rem" />
        <Form.Group as={Row} controlId="showcbh">
        <Col>
        <div>Calculate CB Hydrogens</div>
        </Col>
        <Col>
          <Form.Check
          checked={this.state.doCB}
            onChange={cbChanged}
          />
        </Col>
        </Form.Group>

        <Spacer height="1rem" />
        <Button  variant="primary" size="sm" onClick={handleSubmit}>Create helix</Button>

        </Form>
        </>
        )
    }
}
export default Helices;

