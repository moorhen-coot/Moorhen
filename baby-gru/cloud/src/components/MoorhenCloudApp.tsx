import { useRef, useState, useReducer, useContext, useEffect, useCallback } from 'react'
import { MenuItem } from '@mui/material'
import { MoorhenContext } from "../../../src/utils/MoorhenContext"
import { MoorhenContainer } from "../../../src/components/MoorhenContainer"
import { itemReducer } from "../../../src/utils/MoorhenUtils"
import { isDarkBackground } from "../../../src/WebGLgComponents/mgWebGL"
import { MoorhenLegendToast } from './MoorhenLegendToast'
import { moorhen } from "../../../src/types/moorhen";
import { webGL } from "../../../src/types/mgWebGL";

export interface MoorhenCloudControlsInterface extends moorhen.Controls {
    setNotifyNewContent: React.Dispatch<React.SetStateAction<boolean>>;
    setLegendText: React.Dispatch<React.SetStateAction<JSX.Element>>;
    setBusyFetching: React.Dispatch<React.SetStateAction<boolean>>;
}

const initialMoleculesState: moorhen.Molecule[] = []

const initialMapsState: moorhen.Map[] = []

interface MoorhenCloudAppPropsInterface extends moorhen.ContainerProps {
    exportCallback: (arg0: string, arg1: string) => Promise<void>;
    onChangePreferencesListener: (context: moorhen.Context) => void;
}


export const MoorhenCloudApp = (props: MoorhenCloudAppPropsInterface) => {
    const glRef = useRef<webGL.MGWebGL | null>(null)
    const timeCapsuleRef = useRef<moorhen.TimeCapsule | null>(null)
    const commandCentre = useRef<moorhen.CommandCentre | null>(null)
    const moleculesRef = useRef<moorhen.Molecule[] | null>(null)
    const mapsRef = useRef<moorhen.Map[] | null>(null)
    const activeMapRef = useRef<moorhen.Map | null>(null)
    const lastHoveredAtom = useRef<moorhen.HoveredAtom | null>(null)
    const isDirty = useRef<boolean>(false)
    const busyContouring = useRef<boolean>(false)
    const context = useContext<undefined | moorhen.Context>(MoorhenContext)
    const [activeMap, setActiveMap] = useState<moorhen.Map | null>(null)
    const [hoveredAtom, setHoveredAtom] = useState<moorhen.HoveredAtom>({ molecule: null, cid: null })
    const [busy, setBusy] = useState<boolean>(false)
    const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [maps, changeMaps] = useReducer(itemReducer, initialMapsState)
    const [backgroundColor, setBackgroundColor] = useState<[number, number, number, number]>([1, 1, 1, 1])
    const [cootInitialized, setCootInitialized] = useState<boolean>(false)
    const [showToast, setShowToast] = useState<boolean>(false)
    const [toastContent, setToastContent] = useState<JSX.Element | null>(null)
    const [showColourRulesToast, setShowColourRulesToast] = useState<boolean>(false)
    const [legendText, setLegendText] = useState<string | JSX.Element>('Loading, please wait...')
    const [busyFetching, setBusyFetching] = useState<boolean>(false)
    const [notifyNewContent, setNotifyNewContent] = useState<boolean>(false)

    moleculesRef.current = molecules as moorhen.Molecule[]
    mapsRef.current = maps as moorhen.Map[]
    activeMapRef.current = activeMap

    const forwardCollectedControls = useCallback((controls: moorhen.Controls) => {
        let collectedControls: MoorhenCloudControlsInterface = {
            setLegendText, setBusyFetching, setNotifyNewContent, ...controls
        }
        props.forwardControls(collectedControls)
    }, [props.forwardControls])

    const collectedProps = {
        ...props, glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, 
        activeMapRef, lastHoveredAtom, context, activeMap, setActiveMap,
        busy, setBusy, molecules: molecules as moorhen.Molecule[], changeMolecules,
        maps: maps as moorhen.Map[], changeMaps, backgroundColor, setBackgroundColor,
        cootInitialized, setCootInitialized, setShowColourRulesToast, hoveredAtom, setHoveredAtom,
        showToast, setShowToast, toastContent, setToastContent, showColourRulesToast,
    }

    const doExportCallback = useCallback(async () => {
        let moleculePromises = molecules.map((molecule: moorhen.Molecule) => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        molecules.forEach((molecule, index) => props.exportCallback(molecule.name, moleculeAtoms[index].data.result.pdbData))
    }, [props.exportCallback, molecules])

    const exportMenuItem =  <MenuItem key={'export-cloud'} id='cloud-export-menu-item' onClick={doExportCallback}>
                                Save current model
                            </MenuItem>

    const doContourIfDirty = async () => {
        if (isDirty.current) {
            busyContouring.current = true
            isDirty.current = false
            await Promise.all(
                maps.map((map: moorhen.Map) => {
                  return map.doCootContour(
                    ...glRef.current.origin.map(coord => -coord) as [number, number, number], map.mapRadius, map.contourLevel
                  )     
                })
            )
            busyContouring.current = false
            doContourIfDirty()
        }
    }

    const triggerMapContour = () => {
        isDirty.current = true
        if (!busyContouring.current) {
            doContourIfDirty()
        }
    }

    const handleOriginUpdate = useCallback(async () => {
        if (props.viewOnly) {
            triggerMapContour()
        }
    }, [props.viewOnly, maps, glRef])
    
    const handleRadiusChangeCallback = useCallback(async (evt) => {
        if (props.viewOnly) {
            maps.forEach((map: moorhen.Map) => {
                const newRadius = map.mapRadius + parseInt(evt.detail.factor)
                map.mapRadius = newRadius
            })
            triggerMapContour()
        }
    }, [props.viewOnly, maps, glRef])
    
    const handleWheelContourLevelCallback = useCallback(async (evt) => {
        if (props.viewOnly) {
            maps.forEach((map: moorhen.Map) => {
                const newLevel = evt.detail.factor > 1 ? map.contourLevel + 0.1 : map.contourLevel - 0.1
                map.contourLevel = newLevel
          })
            triggerMapContour()
        }
    }, [props.viewOnly, maps, glRef])
    
    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate)
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate)
        }
    }, [handleOriginUpdate])

    useEffect(() => {
        document.addEventListener("mapRadiusChanged", handleRadiusChangeCallback)
        return () => {
            document.removeEventListener("mapRadiusChanged", handleRadiusChangeCallback)
        }
    }, [handleRadiusChangeCallback])

    useEffect(() => {
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback)
        return () => {
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback)
        }
    }, [handleWheelContourLevelCallback])

    useEffect(() => {
        if (props.viewOnly && maps.length > 0) {
            maps.forEach((map: moorhen.Map) => {
                map.doCootContour(
                    ...glRef.current.origin.map(coord => -coord) as [number, number, number], 13.0, 0.8
              )
            })
        }
    }, [maps])

    useEffect(() => {
        const redrawMolecules = async () => {
            if (!props.viewOnly || molecules.length === 0 || glRef.current.background_colour === null) {
                return
            }
            const newBackgroundIsDark = isDarkBackground(...glRef.current.background_colour)
            await Promise.all(molecules.map((molecule: moorhen.Molecule) => {
                if (molecule.cootBondsOptions.isDarkBackground !== newBackgroundIsDark) {
                    molecule.cootBondsOptions.isDarkBackground = newBackgroundIsDark
                    molecule.setAtomsDirty(true)
                    return molecule.redraw()
                }
                return Promise.resolve()
            }))
        }

        redrawMolecules()

    }, [glRef.current?.background_colour])

    useEffect(() => {
        if (!Object.keys(context).some(key => context[key] === null)) {
            props.onChangePreferencesListener(
                Object.keys(context).reduce((obj, key) => {
                    if (key === 'isMounted') {
                        // pass
                    } else if (key === 'shortCuts') {
                        obj[key] = JSON.parse(context[key as string])
                    } else {
                        obj[key] = context[key]
                    }
                    return obj
                }, {}) as any
            )
        }
    }, [context])

    return <>
            <MoorhenContainer
                {...collectedProps} 
                allowScripting={false}
                extraFileMenuItems={[exportMenuItem]}
                forwardControls={forwardCollectedControls}
                />
            {props.viewOnly && 
            <MoorhenLegendToast backgroundColor={backgroundColor} hoveredAtom={hoveredAtom} busyFetching={busyFetching} notifyNewContent={notifyNewContent} legendText={legendText}/>
            }
        </>

}
