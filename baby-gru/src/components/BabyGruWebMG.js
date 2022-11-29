import React, { createRef, useEffect, useCallback, forwardRef } from 'react';

import { MGWebGL } from '../WebGL/mgWebGL.js';

export const BabyGruWebMG = forwardRef((props, glRef) => {
    const windowResizedBinding = createRef(null)

    const setClipFogByZoom = () => {
        const fieldDepthFront = 8;
        const fieldDepthBack = 21;
        glRef.current.set_fog_range(500 - (glRef.current.zoom * fieldDepthFront), 500 + (glRef.current.zoom * fieldDepthBack))
        glRef.current.set_clip_range(0 - (glRef.current.zoom * fieldDepthFront), 0 + (glRef.current.zoom * fieldDepthBack))
        glRef.current.doDrawClickedAtomLines = false
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
        glRef.current.setDiffuseLight(1., 1., 1.);
        glRef.current.setLightPositionNoUpdate(10., 10., 60.);
        setClipFogByZoom()
        windowResizedBinding.current = window.addEventListener('resize', windowResized)
        windowResized()
        glRef.current.drawScene()
        return () => {
            window.removeEventListener('resize', windowResizedBinding.current)
        }
    }, [glRef])

    useEffect(() => {
        if (glRef.current) {
            console.log('Stuff', glRef.current.background_colour, props.backgroundColor)
            console.log(props)
            glRef.current.background_colour = props.backgroundColor
            glRef.current.drawScene()
        }
    }, [
        props.backgroundColor,
        glRef.current
    ])

    useEffect(() => {
        if (glRef.current) {
            //console.log('Stuff', glRef.current.atomLabelDepthMode, props.atomLabelDepthMode)
            glRef.current.atomLabelDepthMode = props.atomLabelDepthMode
            glRef.current.drawScene()
        }
    }, [
        props.atomLabelDepthMode,
        glRef.current
    ])

    useEffect(() => {
        props.molecules.forEach(molecule => {
            //molecule.fetchIfDirtyAndDraw('bonds', glRef)
        })
    }, [props.molecules, props.molecules.length])

    useEffect(() => {
        props.maps.forEach(map => {
            console.log('in map changed useEffect')
            if (map.webMGContour) {
                map.contour(glRef.current)
            }
        })
    }, [props.maps, props.maps.length])

    const windowResized = (e) => {
        glRef.current.resize(props.width(), props.height())
        glRef.current.drawScene()
    }


    return <MGWebGL
        ref={glRef}
        dataChanged={(d) => { console.log(d) }}
        onAtomHovered={props.onAtomHovered}
        onKeyPress={props.onKeyPress}
        messageChanged={() => { }}
        mouseSensitivityFactor={props.preferences.mouseSensitivity}
        keyboardAccelerators={JSON.parse(props.preferences.shortCuts)}/>
});


