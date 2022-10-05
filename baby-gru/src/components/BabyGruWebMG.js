import React, { createRef, useEffect, useState, useRef } from 'react';

import { EnerLib } from '../WebGL/mgMiniMol.js';

import { MGWebGL } from '../WebGL/mgWebGL.js';

export const BabyGruWebMG = (props) => {
    const enerLib = useRef(null)
    const gl = useRef(null)
    const windowResizedBinding = createRef(null)
    const [width, setWidth] = useState(200)
    const [height, setHeight] = useState(200)

    useEffect(() => {
        enerLib.current = new EnerLib()
        gl.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2);
        gl.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6);
        gl.current.setLightPositionNoUpdate(1., 1., 1.);
        gl.current.background_colour = [.2, 0., 0., 1.];
        windowResizedBinding.current = window.addEventListener('resize', windowResized)
        windowResized()
        gl.current.drawScene()
        return () => {
            window.removeEventListener('resize', windowResizedBinding.current)
        }
    }, [])

    useEffect(()=>{
        props.molecules.forEach(molecule=>{
            molecule.fetchCoordsAndDrawBonds(gl, enerLib)
        })
    },[props.molecules.length])

    const windowResized = (e) => {
        gl.current.resize(props.width(), props.height())
        gl.current.drawScene()
    }

    const setOrigin = (o) => {
        gl.current.setOrigin(o)
        gl.current.drawScene()
    }

    const setQuat = (q) => {
        gl.current.setQuat(q)
        gl.current.drawScene()
    }

    const setZoom = (z) => {
        gl.current.setZoom(z)
        gl.current.drawScene()
    }

    const set_fog_range = (start, end) => {
        gl.current.set_fog_range(start, end, true)
        gl.current.drawScene()
    }

    const set_clip_range = (start, end) => {
        gl.current.set_clip_range(start, end, true)
        gl.current.drawScene()
    }

    const setBackground = (bgColor) => {
        var rgbaFloat = [...bgColor];
        if (rgbaFloat.length == 3) { rgbaFloat.push(1.) }
        gl.current.background_colour = rgbaFloat;
        gl.current.drawScene()
    }

    return <div >
        <MGWebGL enerLib={enerLib.current}
            ref={gl}
            dataChanged={() => { }}
            messageChanged={() => { }} />
    </div>

}


