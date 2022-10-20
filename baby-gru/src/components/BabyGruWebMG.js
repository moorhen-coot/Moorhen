import React, { createRef, useEffect, useCallback, forwardRef } from 'react';

import { MGWebGL } from '../WebGL/mgWebGL.js';

export const BabyGruWebMG = forwardRef((props, glRef) => {
    const windowResizedBinding = createRef(null)

    const setClipFogByZoom = () => {
        const fieldDepthFront = 6;
        const fieldDepthBack = 14;
        glRef.current.set_fog_range(500 - (glRef.current.zoom * fieldDepthFront), 500 + (glRef.current.zoom * fieldDepthBack))
        glRef.current.set_clip_range(0 - (glRef.current.zoom * fieldDepthFront), 0 + (glRef.current.zoom * fieldDepthBack))
    }

    const handleZoomChanged = useCallback(e => {
        setClipFogByZoom()
    })

    useEffect(() => {
        document.addEventListener("zoomChanged", handleZoomChanged);
        return () => {
            document.removeEventListener("zoomChanged", handleZoomChanged);
        };
    }, [handleZoomChanged]);

    useEffect(() => {
        glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2);
        glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6);
        glRef.current.setLightPositionNoUpdate(1., 1., 1.);
        setClipFogByZoom()
        glRef.current.background_colour = [0., 0., 0., 1.];
        windowResizedBinding.current = window.addEventListener('resize', windowResized)
        windowResized()
        glRef.current.drawScene()
        return () => {
            window.removeEventListener('resize', windowResizedBinding.current)
        }
    }, [glRef])

    useEffect(() => {
        props.molecules.forEach(molecule => {
            //molecule.fetchIfDirtyAndDraw('bonds', glRef)
        })
    }, [props.molecules, props.molecules.length])

    useEffect(() => {
        props.maps.forEach(map => {
            console.log('in map changed useEffect')
            map.contour(glRef.current)
        })
    }, [props.maps, props.maps.length])

    const windowResized = (e) => {
        glRef.current.resize(props.width(), props.height())
        glRef.current.drawScene()
    }


    return <MGWebGL
        ref={glRef}
        dataChanged={(d) => { console.log(d) }}
        messageChanged={() => { }} />
});


