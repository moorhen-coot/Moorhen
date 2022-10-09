import React, { createRef, useEffect, useState, useRef, forwardRef } from 'react';

import { MGWebGL } from '../WebGL/mgWebGL.js';

export const BabyGruWebMG = forwardRef((props, ref) => {
    const windowResizedBinding = createRef(null)

    useEffect(() => {
        ref.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2);
        ref.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6);
        ref.current.setLightPositionNoUpdate(1., 1., 1.);
        ref.current.set_fog_range(490, 510)
        ref.current.set_clip_range(-10,20)
        ref.current.background_colour = [0., 0., 0., 1.];
        windowResizedBinding.current = window.addEventListener('resize', windowResized)
        windowResized()
        ref.current.drawScene()
        return () => {
            window.removeEventListener('resize', windowResizedBinding.current)
        }
    }, [])

    useEffect(() => {
        props.molecules.forEach(molecule => {
            //molecule.fetchIfDirtyAndDraw('bonds', glRef)
        })
    }, [props.molecules, props.molecules.length])

    useEffect(() => {
        props.maps.forEach(map => {
            console.log('in map changed useEffect')
            map.contour(ref.current)
        })
    }, [props.maps, props.maps.length])

    const windowResized = (e) => {
        ref.current.resize(props.width(), props.height())
        ref.current.drawScene()
    }

    return <div >
        <MGWebGL
            ref={ref}
            dataChanged={() => { }}
            messageChanged={() => { }} />
    </div>

});


