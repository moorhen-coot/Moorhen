import { useRef, useState, useReducer, useContext, useEffect, useCallback } from 'react'
import { MenuItem } from '@mui/material'
import { MoorhenContext } from "../../../src/utils/MoorhenContext"
import { MoorhenContainer } from "../../../src/components/MoorhenContainer"
import { itemReducer } from "../../../src/utils/MoorhenUtils"
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
        cootInitialized, setCootInitialized, hoveredAtom, setHoveredAtom,
        showToast, setShowToast, toastContent, setToastContent,
    }

    const doExportCallback = useCallback(async () => {
        let moleculePromises = molecules.map((molecule: moorhen.Molecule) => {return molecule.getAtoms()})
        let moleculeAtoms = await Promise.all(moleculePromises)
        molecules.forEach((molecule, index) => props.exportCallback(molecule.name, moleculeAtoms[index].data.result.pdbData))
    }, [props.exportCallback, molecules])

    const exportMenuItem =  <MenuItem key={'export-cloud'} id='cloud-export-menu-item' onClick={doExportCallback}>
                                Save current model
                            </MenuItem>
    
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
