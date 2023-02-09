import React, { createRef, useEffect, useCallback, forwardRef, useState, useRef } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { MGWebGL } from '../WebGLgComponents/mgWebGL.js';
import { MoorhenAdvancedDisplayOptions } from "./MoorhenAdvancedDisplayOptions"
import { convertViewtoPx } from '../utils/MoorhenUtils.js';

export const MoorhenWebMG = forwardRef((props, glRef) => {
    const scores = useRef({})
    const windowResizedBinding = createRef(null)
    const [mapLineWidth, setMapLineWidth] = useState(1.0)
    const [connectedMolNo, setConnectedMolNo] = useState(null)
    const [scoresToastContents, setScoreToastContents] = useState(null)

    const setClipFogByZoom = () => {
        const fieldDepthFront = 8;
        const fieldDepthBack = 21;
        glRef.current.set_fog_range(500 - (glRef.current.zoom * fieldDepthFront), 500 + (glRef.current.zoom * fieldDepthBack))
        glRef.current.set_clip_range(0 - (glRef.current.zoom * fieldDepthFront), 0 + (glRef.current.zoom * fieldDepthBack))
        glRef.current.doDrawClickedAtomLines = false
    }

    const handleZoomChanged = useCallback(e => {
        setClipFogByZoom()
    }, [glRef])

    const handleGoToBlobDoubleClick = useCallback(e => {
        props.commandCentre.current.cootCommand({
            returnType: "float_array",
            command: "go_to_blob_array",
            commandArgs: [e.detail.front[0], e.detail.front[1], e.detail.front[2], e.detail.back[0], e.detail.back[1], e.detail.back[2], 0.5]
        }).then(response => {
            let newOrigin = response.data.result.result;
            if (newOrigin.length === 3) {
                glRef.current.setOriginAnimated([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
            }
        })
    }, [props.commandCentre, glRef])

    const handleMiddleClickGoToAtom = useCallback(e => {
        if (props.hoveredAtom?.molecule && props.hoveredAtom?.cid){

            const [molName, insCode, chainId, resInfo, atomName] = props.hoveredAtom.cid.split('/')
            if (!chainId || !resInfo) {
                return
            }
                        
            const resNum = resInfo.split("(")[0]

            props.hoveredAtom.molecule.centreOn(glRef, `/*/${chainId}/${resNum}-${resNum}/*`)
        }
    }, [props.hoveredAtom, glRef])

    const handleScoreUpdates = useCallback(async (e) => {
        if (e.detail?.modifiedMolecule !== null && connectedMolNo && connectedMolNo.molecule === e.detail.modifiedMolecule) {
            
            const currentScores = await props.commandCentre.current.cootCommand({
                returnType: "r_factor_stats",
                command: "get_r_factor_stats",
                commandArgs: [],
            }, true)

            const newToastContents =   <Toast.Body>
                                                {props.preferences.defaultUpdatingScores.includes('Rfactor') && 
                                                    <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                        Clipper R-Factor {parseFloat(currentScores.data.result.result.r_factor).toFixed(3)}
                                                    </p>
                                                }
                                                {props.preferences.defaultUpdatingScores.includes('Rfree') && 
                                                    <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                        Clipper R-Free {parseFloat(currentScores.data.result.result.free_r_factor).toFixed(3)}
                                                    </p>
                                                }
                                                {props.preferences.defaultUpdatingScores.includes('Moorhen Points') && 
                                                    <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                        Moorhen Points {currentScores.data.result.result.rail_points_total}
                                                    </p>
                                                }
                                            </Toast.Body>
            
            if (scores !== null) {
                const moorhenPointsDiff = currentScores.data.result.result.rail_points_total - scores.current.moorhenPoints
                const rFactorDiff = currentScores.data.result.result.r_factor - scores.current.rFactor
                const rFreeDiff = currentScores.data.result.result.free_r_factor - scores.current.rFree

                setScoreToastContents(
                        <Toast.Body>
                            {props.preferences.defaultUpdatingScores.includes('Rfactor') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFactorDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Factor {parseFloat(scores.current.rFactor).toFixed(3)} {`${rFactorDiff < 0 ? '' : '+'}${parseFloat(rFactorDiff).toFixed(3)}`}
                                </p>
                            }
                            {props.preferences.defaultUpdatingScores.includes('Rfree') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFreeDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Free {parseFloat(scores.current.rFree).toFixed(3)} {`${rFreeDiff < 0 ? '' : '+'}${parseFloat(rFreeDiff).toFixed(3)}`}
                                </p>
                            }
                            {props.preferences.defaultUpdatingScores.includes('Moorhen Points') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: moorhenPointsDiff < 0 ? 'red' : 'green'}}>
                                    Moorhen Points {scores.current.moorhenPoints} {`${moorhenPointsDiff < 0 ? '' : '+'}${moorhenPointsDiff}`}
                                </p>
                            }
                        </Toast.Body>
                )

                setTimeout(() => {
                    setScoreToastContents(newToastContents)
                }, 3000);
        
            } else {
                setScoreToastContents(newToastContents)
            }

            scores.current = {
                moorhenPoints: currentScores.data.result.result.rail_points_total,
                rFactor: currentScores.data.result.result.r_factor,
                rFree: currentScores.data.result.result.free_r_factor
            }
        } 

    }, [props.commandCentre, connectedMolNo, scores, props.preferences.defaultUpdatingScores])

    const handleDisconnectMaps = () => {
        scores.current = {}
        setConnectedMolNo(null)
        setScoreToastContents(null)
    }
    
    const handleConnectMaps = useCallback(async (evt) => {
        
        const currentScores = await props.commandCentre.current.cootCommand({
            returnType: "r_factor_stats",
            command: "get_r_factor_stats",
            commandArgs: [],
        }, true)

        setScoreToastContents(
                <Toast.Body>
                    {props.preferences.defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {parseFloat(currentScores.data.result.result.r_factor).toFixed(3)}
                        </p>
                    }
                    {props.preferences.defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {parseFloat(currentScores.data.result.result.free_r_factor).toFixed(3)}
                        </p>
                    }
                    {props.preferences.defaultUpdatingScores.includes('Moorhen Points') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Moorhen Points {currentScores.data.result.result.rail_points_total}
                        </p>
                    }
                </Toast.Body>
        )
        
        scores.current = {
            moorhenPoints: currentScores.data.result.result.rail_points_total,
            rFactor: currentScores.data.result.result.r_factor,
            rFree: currentScores.data.result.result.free_r_factor
        }

        setConnectedMolNo(evt.detail)
    }, [props.commandCentre, props.preferences.defaultUpdatingScores])

    useEffect(() => {
        if (scores.current !== null && props.preferences.defaultUpdatingScores !== null && props.preferences.showScoresToast && connectedMolNo) {
            setScoreToastContents(
                <Toast.Body>
                    {props.preferences.defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {parseFloat(scores.current.rFactor).toFixed(3)}
                        </p>
                    }
                    {props.preferences.defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {parseFloat(scores.current.rFree).toFixed(3)}
                        </p>
                    }
                    {props.preferences.defaultUpdatingScores.includes('Moorhen Points') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Moorhen Points {scores.current.moorhenPoints}
                        </p>
                    }
                </Toast.Body>
            )
        }

    }, [props.preferences.defaultUpdatingScores, props.preferences.showScoresToast]);

    useEffect(() => {
        document.addEventListener("connectMaps", handleConnectMaps);
        return () => {
            document.removeEventListener("connectMaps", handleConnectMaps);
        };

    }, [handleConnectMaps]);

    useEffect(() => {
        document.addEventListener("mapUpdate", handleScoreUpdates);
        return () => {
            document.removeEventListener("mapUpdate", handleScoreUpdates);
        };

    }, [handleScoreUpdates]);

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
        if (connectedMolNo && props.molecules.lenght === 0){
            handleDisconnectMaps()
        } else if (connectedMolNo && !props.molecules.map(molecule => molecule.molNo).includes(connectedMolNo.molecule)){
            handleDisconnectMaps()
        }
    }, [props.molecules])

    useEffect(() => {
        if (connectedMolNo && props.maps.lenght === 0){
            handleDisconnectMaps()
        } else if (connectedMolNo && !connectedMolNo.maps.every(mapMolNo => props.maps.includes(mapMolNo))){
            handleDisconnectMaps()
        }
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

    return  <>
                <ToastContainer style={{ zIndex: '0', marginTop: "5rem", marginLeft: '0.5rem', textAlign:'left', alignItems: 'left'}} position='top-start' >
                    {scoresToastContents !== null && props.preferences.showScoresToast &&
                        <Toast bg='light' onClose={() => {}} autohide={false} show={true} style={{maxWidth: convertViewtoPx(15, props.windowWidth)}}>
                            {scoresToastContents}
                        </Toast>
                    }
                    <MoorhenAdvancedDisplayOptions glRef={glRef} {...props}/>
                </ToastContainer>

                
                <MGWebGL
                    ref={glRef}
                    dataChanged={(d) => { console.log(d) }}
                    onAtomHovered={props.onAtomHovered}
                    onKeyPress={props.onKeyPress}
                    messageChanged={() => { }}
                    mouseSensitivityFactor={props.preferences.mouseSensitivity}
                    wheelSensitivityFactor={props.preferences.wheelSensitivityFactor}
                    keyboardAccelerators={JSON.parse(props.preferences.shortCuts)}
                    showCrosshairs={props.preferences.drawCrosshairs}
                    showFPS={props.preferences.drawFPS}
                    mapLineWidth={mapLineWidth}
                    drawMissingLoops={props.drawMissingLoops} />
            </>
});


