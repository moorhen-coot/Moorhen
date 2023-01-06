import React, { createRef, useEffect, useCallback, forwardRef, useState } from 'react';
import { MGWebGL } from '../WebGL/mgWebGL.js';

export const MoorhenWebMG = forwardRef((props, glRef) => {
    const windowResizedBinding = createRef(null)
    const [mapLineWidth, setMapLineWidth] = useState(1.0)

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

    const handleGoToBlobDoubleClick = useCallback(e => {
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
    })

    useEffect(() => {
        document.addEventListener("goToBlobDoubleClick", handleGoToBlobDoubleClick);
        return () => {
            document.removeEventListener("goToBlobDoubleClick", handleGoToBlobDoubleClick);
        };

    }, [handleGoToBlobDoubleClick]);

    useEffect(() => {
        document.addEventListener("zoomChanged", handleZoomChanged);
        return () => {
            document.removeEventListener("zoomChanged", handleZoomChanged);
        };
    }, [handleZoomChanged]);

    const handleMiddleClickGoToAtom = useCallback(e => {
        if (props.hoveredAtom?.molecule && props.hoveredAtom?.cid){

            const [molName, insCode, chainId, resInfo, atomName] = props.hoveredAtom.cid.split('/')
            if (!chainId || !resInfo) {
                return
            }
                        
            const resNum = resInfo.split("(")[0]
            const selectedResidue = {
                molName: props.hoveredAtom.molecule.name,
                modelIndex: 0,
                seqNum: resNum,
                chain: chainId
            }
            props.hoveredAtom.molecule.centreOn(glRef, selectedResidue)
        }
    }, [props.hoveredAtom])

    useEffect(() => {
        document.addEventListener("goToAtomMiddleClick", handleMiddleClickGoToAtom);
        return () => {
            document.removeEventListener("goToAtomMiddleClick", handleMiddleClickGoToAtom);
        };

    }, [handleMiddleClickGoToAtom]);

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
        if (props.preferences.mapLineWidth !== mapLineWidth){
            setMapLineWidth(props.preferences.mapLineWidth)
        }
    }, [props.preferences])

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
        keyboardAccelerators={JSON.parse(props.preferences.shortCuts)}
        showCrosshairs={props.preferences.drawCrosshairs}
        mapLineWidth={mapLineWidth}
        drawMissingLoops={props.drawMissingLoops} />
});


