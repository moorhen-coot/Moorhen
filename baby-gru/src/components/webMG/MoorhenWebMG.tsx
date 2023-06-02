import React, { useEffect, useCallback, forwardRef, useState, useRef } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { MGWebGL } from '../../WebGLgComponents/mgWebGL.js';
import { MoorhenColourRules } from "../modal/MoorhenColourRules.js"
import { MoorhenContextMenu } from "../context-menu/MoorhenContextMenu.js"
import { cidToSpec, convertViewtoPx } from '../../utils/MoorhenUtils';
import { MoorhenTimeCapsuleInterface } from '../../utils/MoorhenTimeCapsule';
import { MoorhenCommandCentreInterface } from '../../utils/MoorhenCommandCentre';
import { MoorhenMoleculeInterface, MoorhenResidueSpecType } from '../../utils/MoorhenMolecule';
import { MoorhenMapInterface } from '../../utils/MoorhenMap';
import { MolChange } from "../MoorhenApp"
import { MoorhenPreferencesInterface } from '../../utils/MoorhenPreferences';

interface MoorhenWebMGPropsInterface {
    timeCapsuleRef: React.RefObject<MoorhenTimeCapsuleInterface>;
    commandCentre: React.RefObject<MoorhenCommandCentreInterface>;
    molecules: MoorhenMoleculeInterface[];
    changeMolecules: (arg0: MolChange<MoorhenMoleculeInterface>) => void;
    maps: MoorhenMapInterface[];
    changeMaps: (arg0: MolChange<MoorhenMapInterface>) => void;
    width: () => number;
    height: () => number;
    activeMap: MoorhenMapInterface;
    backgroundColor: [number, number, number, number];
    setBackgroundColor: React.Dispatch<React.SetStateAction<[number, number, number, number]>>;
    isDark: boolean;
    hoveredAtom: HoveredAtomType;
    viewOnly: boolean;
    preferences: MoorhenPreferencesInterface;
    setShowColourRulesToast: React.Dispatch<React.SetStateAction<boolean>>;
    showColourRulesToast: boolean;
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

export const MoorhenWebMG = forwardRef<mgWebGLType, MoorhenWebMGPropsInterface>((props, glRef) => {
    const scores = useRef<MoorhenScoresType | null>(null)
    const [mapLineWidth, setMapLineWidth] = useState<number>(0.75)
    const [connectedMolNo, setConnectedMolNo] = useState<null | MoorhenConnectMapsInfoType>(null)
    const [scoresToastContents, setScoreToastContents] = useState<null | JSX.Element>(null)
    const [showContextMenu, setShowContextMenu] = useState<boolean>(false)
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
        if (props.preferences.resetClippingFogging) {
            setClipFogByZoom()
        }
    }, [glRef, props.preferences.resetClippingFogging])

    const handleGoToBlobDoubleClick = useCallback((evt) => {
        props.commandCentre.current.cootCommand({
            returnType: "float_array",
            command: "go_to_blob_array",
            commandArgs: [evt.detail.front[0], evt.detail.front[1], evt.detail.front[2], evt.detail.back[0], evt.detail.back[1], evt.detail.back[2], 0.5]
        }).then(response => {
            let newOrigin: [number, number, number] = response.data.result.result;
            if (newOrigin.length === 3 && glRef !== null && typeof glRef !== 'function') {
                glRef.current.setOriginAnimated([-newOrigin[0], -newOrigin[1], -newOrigin[2]])
            }
        })
    }, [props.commandCentre, glRef])

    const handleMiddleClickGoToAtom = useCallback(evt => {
        if (props.hoveredAtom?.molecule && props.hoveredAtom?.cid){

            const residueSpec: MoorhenResidueSpecType = cidToSpec(props.hoveredAtom.cid)

            if (!residueSpec.chain_id || !residueSpec.res_no) {
                return
            }

            props.hoveredAtom.molecule.centreOn(glRef, `/*/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`)
        }
    }, [props.hoveredAtom, glRef])


    const drawHBonds = useCallback(async () => {
        if (hBondsDirty.current && glRef !== null && typeof glRef !== 'function') {
            busyDrawingHBonds.current = true
            hBondsDirty.current = false

            const visibleMolecules: MoorhenMoleculeInterface[] = props.molecules.filter(molecule => molecule.isVisible && molecule.hasVisibleBuffers())
            if (visibleMolecules.length === 0) {
                busyDrawingHBonds.current = false
                return
            }

            const response = await props.commandCentre.current.cootCommand({
                returnType: "int_string_pair",
                command: "get_active_atom",
                commandArgs: [...glRef.current.origin.map(coord => -coord), visibleMolecules.map(molecule => molecule.molNo).join(':')]
            })
            const moleculeMolNo: number = response.data.result.result.first
            const residueCid: string = response.data.result.result.second
    
            const mol: MoorhenMoleculeInterface = props.molecules.find(molecule => molecule.molNo === moleculeMolNo)
            if(typeof mol !== 'undefined') {
                const cidSplit0 = residueCid.split(" ")[0]
                const cidSplit = cidSplit0.replace(/\/+$/, "").split("/")
                const resnum = cidSplit[cidSplit.length-1]
                const chainID = cidSplit[cidSplit.length-2]
                // const oneCid = cidSplit.join("/")+"-"+resnum
                // mol.drawHBonds(glRef, oneCid, 'originNeighbours', true)
                mol.drawEnvironment(glRef, chainID, parseInt(resnum), "", true)
            }
            
            busyDrawingHBonds.current = false
            drawHBonds()
        }

    }, [props.commandCentre, props.molecules])

    const clearHBonds = useCallback(async () => {
        if(!props.preferences.drawInteractions) {
            props.molecules.forEach(mol => {
                mol.drawGemmiAtomPairs(glRef, [], "originNeighboursBump", [1.0, 0.0, 0.0, 1.0], true, true)
                mol.drawGemmiAtomPairs(glRef, [], "originNeighboursHBond", [1.0, 0.0, 0.0, 1.0], true, true)
            })
        }
    }, [props.preferences.drawInteractions, props.molecules])

    const handleOriginUpdate = useCallback(async (e) => {
        hBondsDirty.current = true
        if (!busyDrawingHBonds.current && props.preferences.drawInteractions) {
            drawHBonds()
        }
    }, [drawHBonds, props.preferences.drawInteractions])

    useEffect(() => {
        if(props.preferences.drawInteractions){
            hBondsDirty.current = true
            if (!busyDrawingHBonds.current) {
                drawHBonds()
            }
        } else {
            clearHBonds()
        }
    }, [props.preferences.drawInteractions, props.molecules])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.doPerspectiveProjection = props.preferences.doPerspectiveProjection
            glRef.current.clearTextPositionBuffers()
            glRef.current.drawScene()    
        }
    }, [props.preferences.doPerspectiveProjection])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowDepthDebug(props.preferences.doShadowDepthDebug)
            glRef.current.drawScene()
        }
    }, [props.preferences.doShadowDepthDebug])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowsOn(props.preferences.doShadow)
            glRef.current.drawScene()
        }
    }, [props.preferences.doShadow])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpinTestState(props.preferences.doSpinTest)
            glRef.current.drawScene()
        }
    }, [props.preferences.doSpinTest])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.useOffScreenBuffers = props.preferences.useOffScreenBuffers
            glRef.current.drawScene()
        }
    }, [props.preferences.useOffScreenBuffers])

    const handleScoreUpdates = useCallback(async (e) => {
        if (e.detail?.modifiedMolecule !== null && connectedMolNo && connectedMolNo.molecule === e.detail.modifiedMolecule && glRef !== null && typeof glRef !== 'function') {
            
            await Promise.all(
                props.maps.filter(map => connectedMolNo.uniqueMaps.includes(map.molNo)).map(map => {
                    return map.doCootContour(glRef,
                        ...glRef.current.origin.map(coord => -coord) as [number, number, number],
                        map.mapRadius,
                        map.contourLevel)
                })
            )
            
            const currentScores = await props.commandCentre.current.cootCommand({
                returnType: "r_factor_stats",
                command: "get_r_factor_stats",
                commandArgs: [],
            }, true)

            const newToastContents =    <Toast.Body style={{width: '100%'}}>
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
                        <Toast.Body style={{width: '100%'}}>
                            {props.preferences.defaultUpdatingScores.includes('Rfactor') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFactorDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Factor {scores.current.rFactor.toFixed(3)} {`${rFactorDiff < 0 ? '' : '+'}${rFactorDiff.toFixed(3)}`}
                                </p>
                            }
                            {props.preferences.defaultUpdatingScores.includes('Rfree') && 
                                <p style={{paddingLeft: '0.5rem', marginBottom:'0rem', color: rFreeDiff < 0 ? 'green' : 'red'}}>
                                    Clipper R-Free {scores.current.rFree.toFixed(3)} {`${rFreeDiff < 0 ? '' : '+'}${rFreeDiff.toFixed(3)}`}
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

    }, [props.commandCentre, connectedMolNo, scores, props.preferences.defaultUpdatingScores, glRef, props.maps])

    const handleDisconnectMaps = () => {
        scores.current = null
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === connectedMolNo.molecule)
        if (selectedMolecule) {
            selectedMolecule.connectedToMaps = null
        }
        setConnectedMolNo(null)
        setScoreToastContents(null)
    }
    
    const handleConnectMaps = useCallback(async (evt: MoorhenConnectMapsEventType) => {
        
        const currentScores = await props.commandCentre.current.cootCommand({
            returnType: "r_factor_stats",
            command: "get_r_factor_stats",
            commandArgs: [],
        }, true)

        setScoreToastContents(
                <Toast.Body style={{width: '100%'}}>
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

        if (connectedMolNo && evt.detail.molecule !== connectedMolNo.molecule) {
            const previousConnectedMolecule = props.molecules.find(molecule => molecule.molNo === connectedMolNo.molecule)
            previousConnectedMolecule.connectedToMaps = null    
        }

        setConnectedMolNo(evt.detail)
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === evt.detail.molecule)
        selectedMolecule.connectedToMaps = evt.detail.maps
        
    }, [props.commandCentre, props.preferences.defaultUpdatingScores, props.molecules, connectedMolNo])

    useEffect(() => {
        if (scores.current !== null && props.preferences.defaultUpdatingScores !== null && props.preferences.showScoresToast && connectedMolNo) {
            setScoreToastContents(
                <Toast.Body style={{width: '100%'}}>
                    {props.preferences.defaultUpdatingScores.includes('Rfactor') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Factor {scores.current.rFactor.toFixed(3)}
                        </p>
                    }
                    {props.preferences.defaultUpdatingScores.includes('Rfree') && 
                        <p style={{paddingLeft: '0.5rem', marginBottom:'0rem'}}>
                            Clipper R-Free {scores.current.rFree.toFixed(3)}
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

    const handleWindowResized = useCallback(() => {
        if (glRef !== null && typeof glRef !== 'function') {
            glRef.current.setAmbientLightNoUpdate(0.2, 0.2, 0.2)
            glRef.current.setSpecularLightNoUpdate(0.6, 0.6, 0.6)
            glRef.current.setDiffuseLight(1., 1., 1.)
            glRef.current.setLightPositionNoUpdate(10., 10., 60.)
            if (props.preferences.resetClippingFogging) {
                setClipFogByZoom()
            }
            glRef.current.resize(props.width(), props.height())
            glRef.current.drawScene()    
        }
    }, [glRef, props.width, props.height])

    const handleRightClick = useCallback((e) => {
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
            glRef.current.clipCapPerfectSpheres = props.preferences.clipCap
            glRef.current.drawScene()
        }
    }, [props.preferences.clipCap, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setTextFont(props.preferences.GLLabelsFontFamily,props.preferences.GLLabelsFontSize)
        }
    }, [props.preferences.GLLabelsFontSize, props.preferences.GLLabelsFontFamily, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.setBackground(props.backgroundColor)
        }
    }, [props.backgroundColor, glRef])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.atomLabelDepthMode = props.preferences.atomLabelDepthMode
            glRef.current.drawScene()
        }
    }, [props.preferences.atomLabelDepthMode, glRef])

    useEffect(() => {
        if (props.preferences.mapLineWidth !== mapLineWidth){
            setMapLineWidth(props.preferences.mapLineWidth)
        }
    }, [props.preferences])

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
        props.maps.forEach(map => {
            if (map.webMGContour) {
                map.contour(glRef)
            }
        })
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
                <ToastContainer style={{ zIndex: '0', marginTop: "5rem", marginLeft: '0.5rem', textAlign:'left', alignItems: 'left', maxWidth: convertViewtoPx(40, props.windowWidth)}} position='top-start' >
                    {scoresToastContents !== null && props.preferences.showScoresToast &&
                        <Toast onClose={() => {}} autohide={false} show={true} style={{width: '100%'}}>
                            {scoresToastContents}
                        </Toast>
                    }
                </ToastContainer>

                <MGWebGL
                    ref={/**FIXME: Setting this to any is very dirty...*/ glRef as any}
                    dataChanged={(d) => { console.log(d) }}
                    onAtomHovered={props.onAtomHovered}
                    onKeyPress={props.onKeyPress}
                    messageChanged={() => { }}
                    mouseSensitivityFactor={props.preferences.mouseSensitivity}
                    zoomWheelSensitivityFactor={props.preferences.zoomWheelSensitivityFactor}
                    keyboardAccelerators={JSON.parse(props.preferences.shortCuts as string)}
                    showCrosshairs={props.preferences.drawCrosshairs}
                    showAxes={props.preferences.drawAxes}
                    showFPS={props.preferences.drawFPS}
                    mapLineWidth={mapLineWidth}
                    drawMissingLoops={props.preferences.drawMissingLoops}
                    drawInteractions={props.preferences.drawInteractions} />

                {showContextMenu &&
                <MoorhenContextMenu 
                    glRef={glRef}
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
                    refineAfterMod={props.preferences.refineAfterMod}
                    shortCuts={props.preferences.shortCuts}
                    enableTimeCapsule={props.preferences.enableTimeCapsule}
                    windowWidth={props.windowWidth}
                    windowHeight={props.windowHeight}
                />}
                
                <MoorhenColourRules glRef={glRef} {...props}/>

                {props.extraDraggableModals && props.extraDraggableModals.map(modal => modal)}

            </>
});


