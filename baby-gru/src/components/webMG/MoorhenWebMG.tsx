import { useEffect, useCallback, forwardRef, useState, useRef, useReducer } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { MGWebGL } from '../../WebGLgComponents/mgWebGL';
import { MoorhenContextMenu } from "../context-menu/MoorhenContextMenu"
import { cidToSpec, convertViewtoPx } from '../../utils/MoorhenUtils';
import { MoorhenScreenRecorder } from "../../utils/MoorhenScreenRecorder"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { libcootApi } from '../../types/libcoot';
import { useSelector } from 'react-redux';

interface MoorhenWebMGPropsInterface {
    monomerLibraryPath: string;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    viewOnly: boolean;
    urlPrefix: string;
    extraDraggableModals: JSX.Element[];
    onAtomHovered: (identifier: { buffer: { id: string; }; atom: { label: string; }; }) => void;
    onKeyPress: (event: KeyboardEvent) =>  boolean | Promise<boolean>;
    videoRecorderRef: React.MutableRefObject<null | moorhen.ScreenRecorder>;
}

type MoorhenScoresType = {
    rFactor: number;
    rFree: number;
    moorhenPoints: number;
}

const intialDefaultActionButtonSettings: moorhen.actionButtonSettings = {
    mutate: 'ALA',
    refine: 'TRIPLE',
    delete: 'RESIDUE',
    rotateTranslate: 'RESIDUE',
    drag: 'TRIPLE',
    rigidBodyFit: 'TRIPLE',
}

const actionButtonSettingsReducer = (defaultSettings: moorhen.actionButtonSettings, change: {key: string; value: string}) => {
    defaultSettings[change.key] = change.value
    return defaultSettings
}

export const MoorhenWebMG = forwardRef<webGL.MGWebGL, MoorhenWebMGPropsInterface>((props, glRef) => {
    const hBondsDirty = useRef<boolean>(false)
    const busyDrawingHBonds = useRef<boolean>(false)
    const scores = useRef<MoorhenScoresType | null>(null)

    const [innerMapLineWidth, setInnerMapLineWidth] = useState<number>(0.75)
    const [connectedMolNo, setConnectedMolNo] = useState<null | moorhen.ConnectMapsInfo>(null)
    const [scoresToastContents, setScoreToastContents] = useState<null | JSX.Element>(null)
    const [showContextMenu, setShowContextMenu] = useState<false | moorhen.AtomRightClickEventInfo>(false)
    const [defaultActionButtonSettings, setDefaultActionButtonSettings] = useReducer(actionButtonSettingsReducer, intialDefaultActionButtonSettings)

    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const enableAtomHovering = useSelector((state: moorhen.State) => state.hoveringStates.enableAtomHovering)
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs)
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
    const drawInteractions = useSelector((state: moorhen.State) => state.sceneSettings.drawInteractions)
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging)
    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const doShadowDepthDebug = useSelector((state: moorhen.State) => state.sceneSettings.doShadowDepthDebug)
    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)
    const doSpinTest = useSelector((state: moorhen.State) => state.sceneSettings.doSpinTest)
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.updatingMapScoresSettings.defaultUpdatingScores)
    const showScoresToast = useSelector((state: moorhen.State) => state.updatingMapScoresSettings.showScoresToast)
    const GLLabelsFontFamily = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontFamily)
    const GLLabelsFontSize = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontSize)
    const atomLabelDepthMode = useSelector((state: moorhen.State) => state.labelSettings.atomLabelDepthMode)
    const mouseSensitivity = useSelector((state: moorhen.State) => state.mouseSettings.mouseSensitivity)
    const zoomWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.zoomWheelSensitivityFactor)
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const mapLineWidth = useSelector((state: moorhen.State) => state.mapSettings.mapLineWidth)
    const width = useSelector((state: moorhen.State) => state.canvasStates.width)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)
    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const setClipFogByZoom = (): void => {
        const fieldDepthFront: number = 8;
        const fieldDepthBack: number = 21;
        if (glRef !== null && typeof glRef !== 'function') { 
            glRef.current.set_fog_range(glRef.current.fogClipOffset - (glRef.current.zoom * fieldDepthFront), glRef.current.fogClipOffset + (glRef.current.zoom * fieldDepthBack))
            glRef.current.set_clip_range(0 - (glRef.current.zoom * fieldDepthFront), 0 + (glRef.current.zoom * fieldDepthBack))
            glRef.current.doDrawClickedAtomLines = false    
        }
    }

    const handleZoomChanged = useCallback(evt => {
        if (resetClippingFogging) {
            setClipFogByZoom()
        }
    }, [glRef, resetClippingFogging])

    const handleGoToBlobDoubleClick = useCallback(async (evt) => {
        const response = await props.commandCentre.current.cootCommand({
            returnType: "float_array",
            command: "go_to_blob_array",
            commandArgs: [evt.detail.front[0], evt.detail.front[1], evt.detail.front[2], evt.detail.back[0], evt.detail.back[1], evt.detail.back[2], 0.5]
        }, false) as moorhen.WorkerResponse<[number, number, number]>;

        let newOrigin = response.data.result.result;
        if (newOrigin.length === 3 && glRef !== null && typeof glRef !== 'function') {
            glRef.current.setOriginAnimated([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
        }

    }, [props.commandCentre, glRef])

    const handleMiddleClickGoToAtom = useCallback(evt => {
        if (hoveredAtom?.molecule && hoveredAtom?.cid){

            const residueSpec: moorhen.ResidueSpec = cidToSpec(hoveredAtom.cid)

            if (!residueSpec.chain_id || !residueSpec.res_no) {
                return
            }

            hoveredAtom.molecule.centreOn(`/*/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`)
        }
    }, [hoveredAtom])


    const drawHBonds = useCallback(async () => {
        if (hBondsDirty.current && glRef !== null && typeof glRef !== 'function') {
            busyDrawingHBonds.current = true
            hBondsDirty.current = false

            const visibleMolecules: moorhen.Molecule[] = molecules.filter(molecule => molecule.isVisible && molecule.hasVisibleBuffers())
            if (visibleMolecules.length === 0) {
                busyDrawingHBonds.current = false
                return
            }

            const response = await props.commandCentre.current.cootCommand({
                returnType: "int_string_pair",
                command: "get_active_atom",
                commandArgs: [...glRef.current.origin.map(coord => -coord), visibleMolecules.map(molecule => molecule.molNo).join(':')]
            }, false) as moorhen.WorkerResponse<libcootApi.PairType<number, string>>
            const moleculeMolNo: number = response.data.result.result.first
            const residueCid: string = response.data.result.result.second
    
            const mol: moorhen.Molecule = molecules.find(molecule => molecule.molNo === moleculeMolNo)
            if(typeof mol !== 'undefined') {
                await mol.drawEnvironment(residueCid, true)
            }
            
            busyDrawingHBonds.current = false
            drawHBonds()
        }

    }, [props.commandCentre, molecules, glRef])

    const clearHBonds = useCallback(async () => {
        if(!drawInteractions) {
            molecules.forEach(mol => {
                mol.clearBuffersOfStyle('environment')
            })
        }
    }, [drawInteractions, molecules])

    const handleOriginUpdate = useCallback(async (e) => {
        hBondsDirty.current = true
        if (!busyDrawingHBonds.current && drawInteractions) {
            drawHBonds()
        }
    }, [drawHBonds, drawInteractions])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            props.videoRecorderRef.current = new MoorhenScreenRecorder(glRef)
        }
    }, [])

    useEffect(() => {
        if(drawInteractions){
            hBondsDirty.current = true
            if (!busyDrawingHBonds.current) {
                drawHBonds()
            }
        } else {
            clearHBonds()
        }
    }, [drawInteractions, molecules, backgroundColor])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.doPerspectiveProjection = doPerspectiveProjection
            glRef.current.clearTextPositionBuffers()
            glRef.current.drawScene()    
        }
    }, [doPerspectiveProjection])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowDepthDebug(doShadowDepthDebug)
            glRef.current.drawScene()
        }
    }, [doShadowDepthDebug])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setOutlinesOn(doOutline)
            glRef.current.drawScene()
        }
    }, [doOutline])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAOOn(doSSAO)
            glRef.current.drawScene()
        }
    }, [doSSAO])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowsOn(doShadow)
            glRef.current.drawScene()
        }
    }, [doShadow])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpinTestState(doSpinTest)
            glRef.current.drawScene()
        }
    }, [doSpinTest])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAOBias(ssaoBias)
            glRef.current.drawScene()
        }
    }, [ssaoBias])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAORadius(ssaoRadius)
            glRef.current.drawScene()
        }
    }, [ssaoRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setBlurSize(depthBlurRadius)
            glRef.current.drawScene()
        }
    }, [depthBlurRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.blurDepth = depthBlurDepth
            glRef.current.drawScene()
        }
    }, [depthBlurDepth])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.useOffScreenBuffers = useOffScreenBuffers
            glRef.current.drawScene()
        }
    }, [useOffScreenBuffers])

    const handleScoreUpdates = useCallback(async (e) => {
        if (e.detail?.modifiedMolecule !== null && connectedMolNo && connectedMolNo.molecule === e.detail.modifiedMolecule && glRef !== null && typeof glRef !== 'function') {
            
            await Promise.all(
                maps.filter(map => connectedMolNo.uniqueMaps.includes(map.molNo)).map(map => {
                    return map.doCootContour(
                        ...glRef.current.origin.map(coord => -coord) as [number, number, number],
                        map.mapRadius,
                        map.contourLevel
                    )
                })
            )
            
            const currentScores = await props.commandCentre.current.cootCommand({
                returnType: "r_factor_stats",
                command: "get_r_factor_stats",
                commandArgs: [],
            }, false) as moorhen.WorkerResponse<{r_factor: number; free_r_factor: number; rail_points_total: number; }>

            const newToastContents =    <Toast.Body style={{width: '100%'}}>
                                            {defaultUpdatingScores.includes('Rfactor') && 
                                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                    Clipper R-Factor {currentScores.data.result.result.r_factor.toFixed(3)}
                                                </p>
                                            }
                                            {defaultUpdatingScores.includes('Rfree') && 
                                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                    Clipper R-Free {currentScores.data.result.result.free_r_factor.toFixed(3)}
                                                </p>
                                            }
                                            {defaultUpdatingScores.includes('Moorhen Points') && 
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
                        <Toast.Body style={{width: '100%'}}>
                            {defaultUpdatingScores.includes('Rfactor') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFactorDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Factor {scores.current.rFactor.toFixed(3)} {`${rFactorDiff < 0 ? '' : '+'}${rFactorDiff.toFixed(3)}`}
                                </p>
                            }
                            {defaultUpdatingScores.includes('Rfree') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFreeDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Free {scores.current.rFree.toFixed(3)} {`${rFreeDiff < 0 ? '' : '+'}${rFreeDiff.toFixed(3)}`}
                                </p>
                            }
                            {defaultUpdatingScores.includes('Moorhen Points') && 
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

    }, [props.commandCentre, connectedMolNo, scores, defaultUpdatingScores, glRef, maps])

    const handleDisconnectMaps = () => {
        scores.current = null
        const selectedMolecule = molecules.find(molecule => molecule.molNo === connectedMolNo.molecule)
        if (selectedMolecule) {
            selectedMolecule.connectedToMaps = null
        }
        setConnectedMolNo(null)
        setScoreToastContents(null)
    }
    
    const handleConnectMaps = useCallback(async (evt: moorhen.ConnectMapsEvent) => {
        
        const currentScores = await props.commandCentre.current.cootCommand({
            returnType: "r_factor_stats",
            command: "get_r_factor_stats",
            commandArgs: [],
        }, false) as moorhen.WorkerResponse<{r_factor: number; free_r_factor: number; rail_points_total: number; }>

        setScoreToastContents(
                <Toast.Body style={{width: '100%'}}>
                    {defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {currentScores.data.result.result.r_factor.toFixed(3)}
                        </p>
                    }
                    {defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {currentScores.data.result.result.free_r_factor.toFixed(3)}
                        </p>
                    }
                    {defaultUpdatingScores.includes('Moorhen Points') && 
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

        if (connectedMolNo && evt.detail.molecule !== connectedMolNo.molecule) {
            const previousConnectedMolecule = molecules.find(molecule => molecule.molNo === connectedMolNo.molecule)
            previousConnectedMolecule.connectedToMaps = null    
        }

        setConnectedMolNo(evt.detail)
        const selectedMolecule = molecules.find(molecule => molecule.molNo === evt.detail.molecule)
        selectedMolecule.connectedToMaps = evt.detail.maps
        
    }, [props.commandCentre, defaultUpdatingScores, molecules, connectedMolNo])

    useEffect(() => {
        if (scores.current !== null && defaultUpdatingScores !== null && showScoresToast && connectedMolNo) {
            setScoreToastContents(
                <Toast.Body style={{width: '100%'}}>
                    {defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {scores.current.rFactor.toFixed(3)}
                        </p>
                    }
                    {defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {scores.current.rFree.toFixed(3)}
                        </p>
                    }
                    {defaultUpdatingScores.includes('Moorhen Points') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Moorhen Points {scores.current.moorhenPoints}
                        </p>
                    }
                </Toast.Body>
            )
        }

    }, [defaultUpdatingScores, showScoresToast]);

    const handleWindowResized = useCallback(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2)
            glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6)
            glRef.current.setDiffuseLight(1., 1., 1.)
            glRef.current.setLightPositionNoUpdate(10., 10., 60.)
            if (resetClippingFogging) {
                setClipFogByZoom()
            }
            glRef.current.resize(width, height)
            glRef.current.drawScene()    
        }
    }, [glRef, width, height])

    const handleRightClick = useCallback((e: moorhen.AtomRightClickEvent) => {
        setShowContextMenu({ ...e.detail })
    }, [])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2)
            glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6)
            glRef.current.setDiffuseLight(1., 1., 1.)
            glRef.current.setLightPositionNoUpdate(10., 10., 60.)
            setClipFogByZoom()
            glRef.current.resize(width, height)
            glRef.current.drawScene()
        }
    }, [])

    useEffect(() => {
        document.addEventListener("connectMaps", handleConnectMaps);
        return () => {
            document.removeEventListener("connectMaps", handleConnectMaps);
        };

    }, [handleConnectMaps]);

    useEffect(() => {
        document.addEventListener("scoresUpdate", handleScoreUpdates);
        return () => {
            document.removeEventListener("scoresUpdate", handleScoreUpdates);
        };

    }, [handleScoreUpdates]);

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        };

    }, [handleOriginUpdate]);

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
        window.addEventListener('resize', handleWindowResized)
        return () => {
            window.removeEventListener('resize', handleWindowResized)
        }
    }, [handleWindowResized])

    useEffect(() => {
        document.addEventListener("rightClick", handleRightClick);
        return () => {
            document.removeEventListener("rightClick", handleRightClick);
        };

    }, [handleRightClick]);

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.clipCapPerfectSpheres = clipCap
            glRef.current.drawScene()
        }
    }, [clipCap, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setTextFont(GLLabelsFontFamily,GLLabelsFontSize)
            if (drawInteractions){
                hBondsDirty.current = true
                if (!busyDrawingHBonds.current) {
                    drawHBonds()
                }
            } else {
                clearHBonds()
            }
        }
    }, [GLLabelsFontSize, GLLabelsFontFamily, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setBackground(backgroundColor)
        }
    }, [backgroundColor, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.atomLabelDepthMode = atomLabelDepthMode
            glRef.current.drawScene()
        }
    }, [atomLabelDepthMode, glRef])

    useEffect(() => {
        if (innerMapLineWidth !== mapLineWidth){
            setInnerMapLineWidth(mapLineWidth)
        }
    }, [mapLineWidth])

    useEffect(() => {
        if (connectedMolNo && molecules.length === 0){
            handleDisconnectMaps()
        } else if (connectedMolNo && !molecules.map(molecule => molecule.molNo).includes(connectedMolNo.molecule)){
            handleDisconnectMaps()
        }
    }, [molecules])

    useEffect(() => {
        const mapsMolNo: number[] = maps.map(map => map.molNo)
        if (connectedMolNo && mapsMolNo.length === 0){
            handleDisconnectMaps()
        } else if (connectedMolNo && !connectedMolNo.uniqueMaps.every(mapMolNo => mapsMolNo.includes(mapMolNo))){
            handleDisconnectMaps()
        }
    }, [maps, maps.length])

    /*
    if(window.pyodide){
        window.xxx = 42
        window.yyy = [2,21,84]
        window.zzz = {"foo":"bar","sna":"foo"}
        window.zzz.fu = "kung"
        window.pyodide.runPython(`
        from js import window
        zzz = window.zzz
        zzz_py = zzz.to_py()
        print("hello !!!!!!!!!!!!!!!!!!!!!!",window.xxx,window.yyy,len(window.yyy))
        for k,v in zzz_py.items():
            print(k,v)
        `)
    }
    */
    return  <>
                <ToastContainer style={{ zIndex: '0', marginTop: "5rem", marginRight: '0.5rem', textAlign:'left', alignItems: 'left', maxWidth: convertViewtoPx(40, width)}} position='top-end' >
                    {scoresToastContents !== null && showScoresToast &&
                        <Toast onClose={() => {}} autohide={false} show={true} style={{width: '100%', borderRadius: '1.5rem'}}>
                            {scoresToastContents}
                        </Toast>
                    }
                </ToastContainer>

                <MGWebGL
                    ref={glRef}
                    onAtomHovered={enableAtomHovering ? props.onAtomHovered : null}
                    onKeyPress={props.onKeyPress}
                    messageChanged={(d) => { }}
                    mouseSensitivityFactor={mouseSensitivity}
                    zoomWheelSensitivityFactor={zoomWheelSensitivityFactor}
                    keyboardAccelerators={JSON.parse(shortCuts as string)}
                    showCrosshairs={drawCrosshairs}
                    showAxes={drawAxes}
                    showFPS={drawFPS}
                    mapLineWidth={innerMapLineWidth}
                    drawMissingLoops={drawMissingLoops}
                    drawInteractions={drawInteractions} />

                {showContextMenu &&
                <MoorhenContextMenu 
                    glRef={glRef as React.RefObject<webGL.MGWebGL>}
                    monomerLibraryPath={props.monomerLibraryPath}
                    viewOnly={props.viewOnly}
                    urlPrefix={props.urlPrefix}
                    commandCentre={props.commandCentre}
                    timeCapsuleRef={props.timeCapsuleRef}
                    showContextMenu={showContextMenu}
                    setShowContextMenu={setShowContextMenu}
                    defaultActionButtonSettings={defaultActionButtonSettings}
                    setDefaultActionButtonSettings={setDefaultActionButtonSettings}
                />}
                
                {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}

            </>
});


