import { useRef, useState, useReducer, useContext, useEffect, useCallback } from 'react'
import { MenuItem } from '@mui/material'
import { PreferencesContext } from "../../../src/utils/MoorhenPreferences"
import { MoorhenContainer } from "../../../src/components/MoorhenContainer"
import { isDarkBackground } from '../../../src/WebGLgComponents/mgWebGL'
import { MoorhenLegendToast } from './MoorhenLegendToast'

const initialMoleculesState = []

const initialMapsState = []

const itemReducer = (oldList, change) => {
    if (change.action === 'Add') {
        return [...oldList, change.item]
    }
    else if (change.action === 'Remove') {
        return oldList.filter(item => item.molNo !== change.item.molNo)
    }
    else if (change.action === 'AddList') {
        return oldList.concat(change.items)
    }
    else if (change.action === 'Empty') {
        return []
    }
}

export const MoorhenCloudApp = (props) => {
    const glRef = useRef(null)
    const timeCapsuleRef = useRef(null)
    const commandCentre = useRef(null)
    const moleculesRef = useRef(null)
    const mapsRef = useRef(null)
    const activeMapRef = useRef(null)
    const lastHoveredAtom = useRef(null)
    const isDirty = useRef(false)
    const busyContouring = useRef(false)
    const preferences = useContext(PreferencesContext)
    const [activeMap, setActiveMap] = useState(null)
    const [hoveredAtom, setHoveredAtom] = useState({ molecule: null, cid: null })
    const [busy, setBusy] = useState(false)
    const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [maps, changeMaps] = useReducer(itemReducer, initialMapsState)
    const [backgroundColor, setBackgroundColor] = useState([1, 1, 1, 1])
    const [cootInitialized, setCootInitialized] = useState(false)
    const [showToast, setShowToast] = useState(false)
    const [toastContent, setToastContent] = useState("")
    const [showColourRulesToast, setShowColourRulesToast] = useState(false)
    const [legendText, setLegendText] = useState('Loading, please wait...')
    const [busyFetching, setBusyFetching] = useState(false)
    const [notifyNewContent, setNotifyNewContent] = useState(false)
    
    moleculesRef.current = molecules
    mapsRef.current = maps
    activeMapRef.current = activeMap

    const forwardCollectedControls = useCallback((controls) => {
        let collectedControls = {
            setLegendText, setBusyFetching, setNotifyNewContent, ...controls
        }
        props.forwardControls(collectedControls)
    }, [props.forwardControls])

    const collectedProps = {
        ...props, glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, 
        activeMapRef, lastHoveredAtom, preferences, activeMap, setActiveMap,
        busy, setBusy, molecules, changeMolecules, maps, changeMaps, 
        backgroundColor, setBackgroundColor, cootInitialized, setCootInitialized,
        showToast, setShowToast, toastContent, setToastContent, showColourRulesToast,
        setShowColourRulesToast, hoveredAtom, setHoveredAtom,
    }

    const doExportCallback = useCallback(async () => {
        let moleculePromises = molecules.map(molecule => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        molecules.forEach((molecule, index) => props.exportCallback(molecule.name, moleculeAtoms[index].data.result.pdbData))
    }, [props.exportCallback, molecules])

    const exportMenuItem =  <MenuItem key={'export-cloud'} id='cloud-export-menu-item' variant="success" onClick={doExportCallback}>
                                Export to CCP4 Cloud
                            </MenuItem>

    const doContourIfDirty = async () => {
        if (isDirty.current) {
            busyContouring.current = true
            isDirty.current = false
            await Promise.all(
                maps.map(map => {
                  return map.doCootContour(
                    glRef, ...glRef.current.origin.map(coord => -coord), map.mapRadius, map.contourLevel
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
            maps.forEach(map => {
                const newRadius = map.mapRadius + parseInt(evt.detail.factor)
                map.mapRadius = newRadius
            })
            triggerMapContour()
        }
    }, [props.viewOnly, maps, glRef])
    
    const handleWheelContourLevelCallback = useCallback(async (evt) => {
        if (props.viewOnly) {
            maps.forEach(map => {
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
    }, [handleOriginUpdate])

    useEffect(() => {
        document.addEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback)
        return () => {
            document.removeEventListener("wheelContourLevelChanged", handleWheelContourLevelCallback)
        }
    }, [handleOriginUpdate])

    useEffect(() => {
        if (props.viewOnly && maps.length > 0) {
            maps.map(map => {
                map.doCootContour(
                    glRef, ...glRef.current.origin.map(coord => -coord), 13.0, 0.8
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
            await Promise.all(molecules.map(molecule => {
                if (molecule.cootBondsOptions.isDarkBackground !== newBackgroundIsDark) {
                    molecule.cootBondsOptions.isDarkBackground = newBackgroundIsDark
                    molecule.setAtomsDirty(true)
                    return molecule.redraw(glRef)
                }
                return Promise.resolve()
            }))
        }

        redrawMolecules()

    }, [glRef.current?.background_colour])

    useEffect(() => {
        if (!Object.keys(preferences).some(key => preferences[key] === null)) {
            props.onChangePreferencesListener(
                Object.keys(preferences).reduce((obj, key) => {
                    if (key === 'isMounted') {
                        // pass
                    } else if (key === 'shortCuts') {
                        obj[key] = JSON.parse(preferences[key])
                    } else {
                        obj[key] = preferences[key]
                    }
                    return obj
                }, {})
            )
        }
    }, [preferences])

    return <>
            <MoorhenContainer {...collectedProps} extraFileMenuItems={[exportMenuItem]} forwardControls={forwardCollectedControls}/>
            {props.viewOnly && 
            <MoorhenLegendToast backgroundColor={backgroundColor} hoveredAtom={hoveredAtom} busyFetching={busyFetching} notifyNewContent={notifyNewContent} legendText={legendText}/>
            }
        </>

}
