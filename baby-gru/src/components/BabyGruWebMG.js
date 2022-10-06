import React, { createRef, useEffect, useState, useRef, forwardRef } from 'react';

import { MGWebGL } from '../WebGL/mgWebGL.js';

export const BabyGruWebMG = forwardRef((props, ref) => {
    const windowResizedBinding = createRef(null)
    const [width, setWidth] = useState(200)
    const [height, setHeight] = useState(200)

    useEffect(() => {
        ref.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2);
        ref.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6);
        ref.current.setLightPositionNoUpdate(1., 1., 1.);
        ref.current.background_colour = [.2, 0., 0., 1.];
        windowResizedBinding.current = window.addEventListener('resize', windowResized)
        windowResized()
        ref.current.drawScene()
        return () => {
            window.removeEventListener('resize', windowResizedBinding.current)
        }
    }, [])

    useEffect(() => {
        props.molecules.forEach(molecule => {
            //molecule.fetchCoordsAndDraw('bonds', glRef)
        })
    }, [props.molecules, props.molecules.length])

    const windowResized = (e) => {
        ref.current.resize(props.width(), props.height())
        ref.current.drawScene()
    }

    const setOrigin = (o) => {
        ref.current.setOrigin(o)
        ref.current.drawScene()
    }

    const setQuat = (q) => {
        ref.current.setQuat(q)
        ref.current.drawScene()
    }

    const setZoom = (z) => {
        ref.current.setZoom(z)
        ref.current.drawScene()
    }

    const set_fog_range = (start, end) => {
        ref.current.set_fog_range(start, end, true)
        ref.current.drawScene()
    }

    const set_clip_range = (start, end) => {
        ref.current.set_clip_range(start, end, true)
        ref.current.drawScene()
    }

    const setBackground = (bgColor) => {
        var rgbaFloat = [...bgColor];
        if (rgbaFloat.length == 3) { rgbaFloat.push(1.) }
        ref.current.background_colour = rgbaFloat;
        ref.current.drawScene()
    }

    return <div >
        <MGWebGL 
            ref={ref}
            dataChanged={() => { }}
            messageChanged={() => { }} />
    </div>

});


