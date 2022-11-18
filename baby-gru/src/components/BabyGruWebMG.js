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

    const handleKeyPressWithMousePosition = useCallback(e => {
        if (e.detail.key === "G") {
            props.commandCentre.current.cootCommand({
                returnType: "float_array",
                command: "go_to_blob_array",
                commandArgs: [e.detail.front[0], e.detail.front[1], e.detail.front[2], e.detail.back[0], e.detail.back[1], e.detail.back[2], 0.5]
            }).then(response => {
                let newOrigin = response.data.result.result;
                if (newOrigin.length === 3) {
                    glRef.current.setOrigin([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
                }
            })
        }
    })

    useEffect(() => {
        document.addEventListener("keyPressWithMousePosition", handleKeyPressWithMousePosition);
        return () => {
            document.removeEventListener("keyPressWithMousePosition", handleKeyPressWithMousePosition);
        };
    }, [handleKeyPressWithMousePosition]);

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
            glRef.current.background_colour = props.backgroundColor
            glRef.current.drawScene()
        }
    }, [
        props.backgroundColor,
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
        messageChanged={() => { }} />
});


