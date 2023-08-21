import { useEffect, useCallback, forwardRef, useState, useRef, useReducer } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { MGWebGL } from '../../WebGLgComponents/mgWebGL';
import { MoorhenContextMenu } from "../context-menu/MoorhenContextMenu"
import { cidToSpec, convertViewtoPx } from '../../utils/MoorhenUtils';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { libcootApi } from '../../types/libcoot';

interface MoorhenWebMGPropsInterface {
    monomerLibraryPath: string;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecules: moorhen.Molecule[];
    changeMolecules: (arg0: moorhen.MolChange<moorhen.Molecule>) => void;
    maps: moorhen.Map[];
    changeMaps: (arg0: moorhen.MolChange<moorhen.Map>) => void;
    width: () => number;
    height: () => number;
    activeMap: moorhen.Map;
    backgroundColor: [number, number, number, number];
    setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
    isDark: boolean;
    hoveredAtom: moorhen.HoveredAtom;
    viewOnly: boolean;
    context: moorhen.Context;
    windowHeight: number;
    windowWidth: number;
    urlPrefix: string;
    extraDraggableModals: JSX.Element[];
    onAtomHovered: (identifier: { buffer: { id: string; }; atom: { label: string; }; }) => void;
    onKeyPress: (event: KeyboardEvent) =>  boolean | Promise<boolean>;
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
    const scores = useRef<MoorhenScoresType | null>(null)
    const [mapLineWidth, setMapLineWidth] = useState<number>(0.75)
    const [connectedMolNo, setConnectedMolNo] = useState<null | moorhen.ConnectMapsInfo>(null)
    const [scoresToastContents, setScoreToastContents] = useState<null | JSX.Element>(null)
    const [showContextMenu, setShowContextMenu] = useState<false | moorhen.AtomRightClickEventInfo>(false)
    const [defaultActionButtonSettings, setDefaultActionButtonSettings] = useReducer(actionButtonSettingsReducer, intialDefaultActionButtonSettings)
    const hBondsDirty = useRef<boolean>(false)
    const busyDrawingHBonds = useRef<boolean>(false)

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
        if (props.context.resetClippingFogging) {
            setClipFogByZoom()
        }
    }, [glRef, props.context.resetClippingFogging])

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
        if (props.hoveredAtom?.molecule && props.hoveredAtom?.cid){

            const residueSpec: moorhen.ResidueSpec = cidToSpec(props.hoveredAtom.cid)

            if (!residueSpec.chain_id || !residueSpec.res_no) {
                return
            }

            props.hoveredAtom.molecule.centreOn(`/*/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`)
        }
    }, [props.hoveredAtom])


    const drawHBonds = useCallback(async () => {
        if (hBondsDirty.current && glRef !== null && typeof glRef !== 'function') {
            busyDrawingHBonds.current = true
            hBondsDirty.current = false

            const visibleMolecules: moorhen.Molecule[] = props.molecules.filter(molecule => molecule.isVisible && molecule.hasVisibleBuffers())
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
    
            const mol: moorhen.Molecule = props.molecules.find(molecule => molecule.molNo === moleculeMolNo)
            if(typeof mol !== 'undefined') {
                mol.drawEnvironment(residueCid, true)
            }
            
            busyDrawingHBonds.current = false
            drawHBonds()
        }

    }, [props.commandCentre, props.molecules, glRef])

    const clearHBonds = useCallback(async () => {
        if(!props.context.drawInteractions) {
            props.molecules.forEach(mol => {
                mol.clearBuffersOfStyle('environment')
            })
        }
    }, [props.context.drawInteractions, props.molecules])

    const handleOriginUpdate = useCallback(async (e) => {
        hBondsDirty.current = true
        if (!busyDrawingHBonds.current && props.context.drawInteractions) {
            drawHBonds()
        }
    }, [drawHBonds, props.context.drawInteractions])

    useEffect(() => {
        if(props.context.drawInteractions){
            hBondsDirty.current = true
            if (!busyDrawingHBonds.current) {
                drawHBonds()
            }
        } else {
            clearHBonds()
        }
    }, [props.context.drawInteractions, props.molecules])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.doPerspectiveProjection = props.context.doPerspectiveProjection
            glRef.current.clearTextPositionBuffers()
            glRef.current.drawScene()    
        }
    }, [props.context.doPerspectiveProjection])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowDepthDebug(props.context.doShadowDepthDebug)
            glRef.current.drawScene()
        }
    }, [props.context.doShadowDepthDebug])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setOutlinesOn(props.context.doOutline)
            glRef.current.drawScene()
        }
    }, [props.context.doOutline])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowsOn(props.context.doShadow)
            glRef.current.drawScene()
        }
    }, [props.context.doShadow])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpinTestState(props.context.doSpinTest)
            glRef.current.drawScene()
        }
    }, [props.context.doSpinTest])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setBlurSize(props.context.depthBlurRadius)
            glRef.current.drawScene()
        }
    }, [props.context.depthBlurRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.blurDepth = props.context.depthBlurDepth
            glRef.current.drawScene()
        }
    }, [props.context.depthBlurDepth])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.useOffScreenBuffers = props.context.useOffScreenBuffers
            glRef.current.drawScene()
        }
    }, [props.context.useOffScreenBuffers])

    const handleScoreUpdates = useCallback(async (e) => {
        if (e.detail?.modifiedMolecule !== null && connectedMolNo && connectedMolNo.molecule === e.detail.modifiedMolecule && glRef !== null && typeof glRef !== 'function') {
            
            await Promise.all(
                props.maps.filter(map => connectedMolNo.uniqueMaps.includes(map.molNo)).map(map => {
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
                                            {props.context.defaultUpdatingScores.includes('Rfactor') && 
                                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                    Clipper R-Factor {currentScores.data.result.result.r_factor.toFixed(3)}
                                                </p>
                                            }
                                            {props.context.defaultUpdatingScores.includes('Rfree') && 
                                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                                                    Clipper R-Free {currentScores.data.result.result.free_r_factor.toFixed(3)}
                                                </p>
                                            }
                                            {props.context.defaultUpdatingScores.includes('Moorhen Points') && 
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
                            {props.context.defaultUpdatingScores.includes('Rfactor') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFactorDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Factor {scores.current.rFactor.toFixed(3)} {`${rFactorDiff < 0 ? '' : '+'}${rFactorDiff.toFixed(3)}`}
                                </p>
                            }
                            {props.context.defaultUpdatingScores.includes('Rfree') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFreeDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Free {scores.current.rFree.toFixed(3)} {`${rFreeDiff < 0 ? '' : '+'}${rFreeDiff.toFixed(3)}`}
                                </p>
                            }
                            {props.context.defaultUpdatingScores.includes('Moorhen Points') && 
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

    }, [props.commandCentre, connectedMolNo, scores, props.context.defaultUpdatingScores, glRef, props.maps])

    const handleDisconnectMaps = () => {
        scores.current = null
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === connectedMolNo.molecule)
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
                    {props.context.defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {currentScores.data.result.result.r_factor.toFixed(3)}
                        </p>
                    }
                    {props.context.defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {currentScores.data.result.result.free_r_factor.toFixed(3)}
                        </p>
                    }
                    {props.context.defaultUpdatingScores.includes('Moorhen Points') && 
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
            const previousConnectedMolecule = props.molecules.find(molecule => molecule.molNo === connectedMolNo.molecule)
            previousConnectedMolecule.connectedToMaps = null    
        }

        setConnectedMolNo(evt.detail)
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === evt.detail.molecule)
        selectedMolecule.connectedToMaps = evt.detail.maps
        
    }, [props.commandCentre, props.context.defaultUpdatingScores, props.molecules, connectedMolNo])

    useEffect(() => {
        if (scores.current !== null && props.context.defaultUpdatingScores !== null && props.context.showScoresToast && connectedMolNo) {
            setScoreToastContents(
                <Toast.Body style={{width: '100%'}}>
                    {props.context.defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {scores.current.rFactor.toFixed(3)}
                        </p>
                    }
                    {props.context.defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {scores.current.rFree.toFixed(3)}
                        </p>
                    }
                    {props.context.defaultUpdatingScores.includes('Moorhen Points') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Moorhen Points {scores.current.moorhenPoints}
                        </p>
                    }
                </Toast.Body>
            )
        }

    }, [props.context.defaultUpdatingScores, props.context.showScoresToast]);

    const handleWindowResized = useCallback(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2)
            glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6)
            glRef.current.setDiffuseLight(1., 1., 1.)
            glRef.current.setLightPositionNoUpdate(10., 10., 60.)
            if (props.context.resetClippingFogging) {
                setClipFogByZoom()
            }
            glRef.current.resize(props.width(), props.height())
            glRef.current.drawScene()    
        }
    }, [glRef, props.width, props.height])

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
            glRef.current.resize(props.width(), props.height())
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
            glRef.current.clipCapPerfectSpheres = props.context.clipCap
            glRef.current.drawScene()
        }
    }, [props.context.clipCap, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setTextFont(props.context.GLLabelsFontFamily,props.context.GLLabelsFontSize)
        }
    }, [props.context.GLLabelsFontSize, props.context.GLLabelsFontFamily, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setBackground(props.backgroundColor)
        }
    }, [props.backgroundColor, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.atomLabelDepthMode = props.context.atomLabelDepthMode
            glRef.current.drawScene()
        }
    }, [props.context.atomLabelDepthMode, glRef])

    useEffect(() => {
        if (props.context.mapLineWidth !== mapLineWidth){
            setMapLineWidth(props.context.mapLineWidth)
        }
    }, [props.context])

    useEffect(() => {
        if (connectedMolNo && props.molecules.length === 0){
            handleDisconnectMaps()
        } else if (connectedMolNo && !props.molecules.map(molecule => molecule.molNo).includes(connectedMolNo.molecule)){
            handleDisconnectMaps()
        }
    }, [props.molecules])

    useEffect(() => {
        const mapsMolNo: number[] = props.maps.map(map => map.molNo)
        if (connectedMolNo && mapsMolNo.length === 0){
            handleDisconnectMaps()
        } else if (connectedMolNo && !connectedMolNo.uniqueMaps.every(mapMolNo => mapsMolNo.includes(mapMolNo))){
            handleDisconnectMaps()
        }
    }, [props.maps, props.maps.length])

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
                <ToastContainer style={{ zIndex: '0', marginTop: "5rem", marginRight: '0.5rem', textAlign:'left', alignItems: 'left', maxWidth: convertViewtoPx(40, props.windowWidth)}} position='top-end' >
                    {scoresToastContents !== null && props.context.showScoresToast &&
                        <Toast onClose={() => {}} autohide={false} show={true} style={{width: '100%', borderRadius: '1.5rem'}}>
                            {scoresToastContents}
                        </Toast>
                    }
                </ToastContainer>

                <MGWebGL
                    ref={glRef}
                    onAtomHovered={props.onAtomHovered}
                    onKeyPress={props.onKeyPress}
                    messageChanged={(d) => { }}
                    mouseSensitivityFactor={props.context.mouseSensitivity}
                    zoomWheelSensitivityFactor={props.context.zoomWheelSensitivityFactor}
                    keyboardAccelerators={JSON.parse(props.context.shortCuts as string)}
                    showCrosshairs={props.context.drawCrosshairs}
                    showAxes={props.context.drawAxes}
                    showFPS={props.context.drawFPS}
                    mapLineWidth={mapLineWidth}
                    drawMissingLoops={props.context.drawMissingLoops}
                    drawInteractions={props.context.drawInteractions} />

                {showContextMenu &&
                <MoorhenContextMenu 
                    glRef={glRef as React.RefObject<webGL.MGWebGL>}
                    monomerLibraryPath={props.monomerLibraryPath}
                    viewOnly={props.viewOnly}
                    urlPrefix={props.urlPrefix}
                    commandCentre={props.commandCentre}
                    backgroundColor={props.backgroundColor}
                    setBackgroundColor={props.setBackgroundColor}
                    isDark={props.isDark}
                    timeCapsuleRef={props.timeCapsuleRef}
                    molecules={props.molecules}
                    changeMolecules={props.changeMolecules}
                    maps={props.maps}
                    changeMaps={props.changeMaps}
                    showContextMenu={showContextMenu}
                    setShowContextMenu={setShowContextMenu}
                    activeMap={props.activeMap}
                    enableRefineAfterMod={props.context.enableRefineAfterMod}
                    shortCuts={props.context.shortCuts}
                    enableTimeCapsule={props.context.enableTimeCapsule}
                    defaultBondSmoothness={props.context.defaultBondSmoothness}
                    windowWidth={props.windowWidth}
                    windowHeight={props.windowHeight}
                    defaultActionButtonSettings={defaultActionButtonSettings}
                    setDefaultActionButtonSettings={setDefaultActionButtonSettings}
                />}
                
                {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}

            </>
});


