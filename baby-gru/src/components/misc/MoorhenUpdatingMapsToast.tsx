import { useCallback, useEffect, useRef, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { convertViewtoPx } from '../../utils/MoorhenUtils';
import { useDispatch, useSelector } from 'react-redux';
import { moorhen } from '../../types/moorhen';
import { webGL } from '../../types/mgWebGL';
import { disableUpdatingMaps, triggerUpdate } from '../../store/moleculeMapUpdateSlice';

export const MoorhenUpdatingMapsToast = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    
    const scores = useRef<{ rFactor: number; rFree: number; moorhenPoints: number; } | null>(null)

    const [scoresToastContents, setScoreToastContents] = useState<null | JSX.Element>(null)

    const dispatch = useDispatch()
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const updatingMapsIsEnabled = useSelector((state: moorhen.State) => state.moleculeMapUpdate.updatingMapsIsEnabled)
    const reflectionMap = useSelector((state: moorhen.State) => state.moleculeMapUpdate.reflectionMap)
    const foFcMap = useSelector((state: moorhen.State) => state.moleculeMapUpdate.foFcMap)
    const twoFoFcMap = useSelector((state: moorhen.State) => state.moleculeMapUpdate.twoFoFcMap)
    const uniqueMaps = useSelector((state: moorhen.State) => state.moleculeMapUpdate.uniqueMaps)
    const connectedMoleculeMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.connectedMolecule)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.moleculeMapUpdate.defaultUpdatingScores)
    const showScoresToast = useSelector((state: moorhen.State) => state.moleculeMapUpdate.showScoresToast)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    useEffect(() => {
        const handleScoresUpdate = async () => {
            if (updateMolNo !== null && connectedMoleculeMolNo === updateMolNo && props.glRef !== null && typeof props.glRef !== 'function') {
                
                await Promise.all(
                    maps.filter(map => uniqueMaps.includes(map.molNo)).map(map => {
                        return map.drawMapContour()
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
        }
        handleScoresUpdate()
    }, [updateSwitch])
    
    useEffect(() => {
        const handleConnectMaps = async () => {
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

            const selectedMolecule = molecules.find(molecule => molecule.molNo === connectedMoleculeMolNo)
            selectedMolecule.connectedToMaps = [reflectionMap, twoFoFcMap, foFcMap]
        }
        if (updatingMapsIsEnabled) {
            handleConnectMaps()
        } else {
            scores.current = null
            setScoreToastContents(null)
        }    
    }, [updatingMapsIsEnabled])

    useEffect(() => {
        if (scores.current !== null && defaultUpdatingScores !== null && showScoresToast && updatingMapsIsEnabled) {
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

    const disconnectMaps = () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === connectedMoleculeMolNo)
        if (selectedMolecule) {
            selectedMolecule.connectedToMaps = null
        }
        dispatch( disableUpdatingMaps() )
    }
    
    useEffect(() => {
        if (updatingMapsIsEnabled && molecules.length === 0){
            disconnectMaps()
        } else if (updatingMapsIsEnabled && !molecules.map(molecule => molecule.molNo).includes(connectedMoleculeMolNo)){
            disconnectMaps()
        }
    }, [molecules])

    useEffect(() => {
        const mapsMolNo: number[] = maps.map(map => map.molNo)
        if (updatingMapsIsEnabled && mapsMolNo.length === 0){
            disconnectMaps()
        } else if (updatingMapsIsEnabled && !uniqueMaps.every(mapMolNo => mapsMolNo.includes(mapMolNo))){
            disconnectMaps()
        }
    }, [maps])

    return <ToastContainer style={{ zIndex: '0', marginTop: "5rem", marginRight: '0.5rem', textAlign:'left', alignItems: 'left', maxWidth: convertViewtoPx(40, width)}} position='top-end' >
                {updatingMapsIsEnabled && showScoresToast && scoresToastContents !== null &&
                    <Toast onClose={() => {}} autohide={false} show={true} style={{width: '100%', borderRadius: '1.5rem'}}>
                        {scoresToastContents}
                    </Toast>
                }
            </ToastContainer>
}
