import { useEffect, useCallback, useRef, useMemo } from 'react';
import { Container, Col, Row, Spinner } from 'react-bootstrap';
import { MoorhenWebMG } from './webMG/MoorhenWebMG';
import { getTooltipShortcutLabel, createLocalStorageInstance } from '../utils/MoorhenUtils';
import { MoorhenCommandCentre } from "../utils/MoorhenCommandCentre"
import { MoorhenTimeCapsule } from '../utils/MoorhenTimeCapsule';
import { Backdrop } from "@mui/material";
import { babyGruKeyPress } from '../utils/MoorhenKeyboardAccelerators';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { MoorhenNavBar } from "./navbar-menus/MoorhenNavBar"
import { MoorhenNotification } from './misc/MoorhenNotification';
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import { MoorhenPreferencesContainer } from './misc/MoorhenPreferencesContainer'
import { useSelector, useDispatch } from 'react-redux';
import { setDefaultBackgroundColor } from '../store/sceneSettingsSlice';
import { setBackgroundColor, setHeight, setIsDark, setWidth } from '../store/canvasStatesSlice';
import { setCootInitialized, setNotificationContent, setTheme } from '../store/generalStatesSlice';
import { setEnableAtomHovering, setHoveredAtom } from '../store/hoveringStatesSlice';

/**
 * A container for the Moorhen app. Needs to be rendered within a MoorhenReduxprovider.
 * @property {React.RefObject<webGL.mgWebGL>} [glRef] - React reference holding the webGL rendering component
 * @property {React.RefObject<moorhen.TimeCapsule>} [timeCapsuleRef] - React reference holding an instance of MoorhenTimeCapsule which is in charge of backups
 * @property {React.RefObject<moorhen.commandCentre>} [commandCentre] - React reference holding an instance of MoorhenCommandCentre which is in charge of communication with libcoot instance
 * @property {React.RefObject<moorhen.Molecule[]>} [moleculesRef] - React reference holding a list of loaded MoorhenMolecule instances
 * @property {React.RefObject<moorhen.Map[]>} [mapsRef] - React reference holding a list of loaded MoorhenMap instances
 * @property {string} [urlPrefix='.'] - The root url used to load sources from public folder
 * @property {string} [monomerLibraryPath='./baby-gru/monomers'] - A string with the path to the monomer library, relative to the root of the app
 * @property {function} setMoorhenDimensions - Callback executed on window resize. Return type is an array of two numbers [width, height]
 * @property {function} onUserPreferencesChange - Callback executed whenever a user-defined preference changes (key: string, value: any) => void.
 * @property {boolean} [disableFileUploads=false] - Indicates if file uploads should b disabled
 * @property {JSX.Element[]} extraNavBarMenus - A list with additional menu items rendered under the navigation menu
 * @property {JSX.Element[]} extraFileMenuItems - A list with additional menu items rendered under the "File" menu
 * @property {JSX.Element[]} extraEditMenuItems - A list with additional menu items rendered under the "Edit" menu
 * @property {JSX.Element[]} extraCalculateMenuItems - A list with additional menu items rendered under the "Calculate" menu
 * @property {JSX.Element[]} extraDraggableModals - A list with additional draggable modals to be rendered
 * @property {boolean} [viewOnly=false] - Indicates if Moorhen should work in view-only mode
 * @property {boolean} [allowScripting=true] - Indicates if the scrpting interface is enabled
 * @property {moorhen.LocalStorageInstance} backupStorageInstance - An interface used by the moorhen container to store session backups
 * @property {moorhen.AceDRGInstance} aceDRGInstance - An interface used by the moorhen container to execute aceDRG jobs
 * @example
 * import { MoorhenContainer } from "moorhen";
 *
 * const ExampleApp = () => {
 * 
 *  const doClick = (evt) => { console.log('Click!') }
 * 
 *  const exportMenuItem =  <MenuItem key={'example-key'} id='example-menu-item' onClick={doClick}>
 *                              Example extra menu
 *                          </MenuItem>
 *  
 * const setDimensions = () => {
 *   return [window.innerWidth, window.innerHeight]
 * }
 *  
 * return <MoorhenReduxProvider> 
 *              <MoorhenContainer
 *                  allowScripting={false}
 *                  setMoorhenDimensions={setDimensions}
 *                  extraFileMenuItems={[exportMenuItem]}/>
 *          </MoorhenReduxProvider>
 * 
 */
export const MoorhenContainer = (props: moorhen.ContainerProps) => {
    
    const innerGlRef = useRef<null | webGL.MGWebGL>(null)
    const innerVideoRecorderRef = useRef<null | moorhen.ScreenRecorder>(null);
    const innerTimeCapsuleRef = useRef<null | moorhen.TimeCapsule>(null);
    const innnerCommandCentre = useRef<null | moorhen.CommandCentre>(null)
    const innerMoleculesRef = useRef<null | moorhen.Molecule[]>(null)
    const innerMapsRef = useRef<null | moorhen.Map[]>(null)
    const innerActiveMapRef = useRef<null | moorhen.Map>(null)
    const innerlastHoveredAtomRef = useRef<null | moorhen.HoveredAtom>(null)
    
    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const cursorStyle = useSelector((state: moorhen.State) => state.hoveringStates.cursorStyle)
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const theme = useSelector((state: moorhen.State) => state.generalStates.theme)
    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const height = useSelector((state: moorhen.State) => state.canvasStates.height)
    const width = useSelector((state: moorhen.State) => state.canvasStates.width)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)
    const notificationContent = useSelector((state: moorhen.State) => state.generalStates.notificationContent)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const shortcutOnHoveredAtom = useSelector((state: moorhen.State) => state.shortcutSettings.shortcutOnHoveredAtom)
    const showShortcutToast = useSelector((state: moorhen.State) => state.shortcutSettings.showShortcutToast)
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapSettings.defaultMapSamplingRate)
    const defaultBackgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.defaultBackgroundColor)
    const makeBackups = useSelector((state: moorhen.State) => state.backupSettings.makeBackups)
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount)
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
   
    const innerStatesMap: moorhen.ContainerRefs = {
        glRef: innerGlRef, timeCapsuleRef: innerTimeCapsuleRef, commandCentre: innnerCommandCentre,
        moleculesRef: innerMoleculesRef, mapsRef: innerMapsRef, activeMapRef: innerActiveMapRef,
        lastHoveredAtomRef: innerlastHoveredAtomRef, videoRecorderRef: innerVideoRecorderRef,
    }

    let refs = {} as moorhen.ContainerRefs
    Object.keys(innerStatesMap).forEach(key => {
        refs[key] = props[key] ? props[key] : innerStatesMap[key]
    })

    const { 
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef, videoRecorderRef, lastHoveredAtomRef, 
    } = refs

    activeMapRef.current = activeMap
    moleculesRef.current = molecules
    mapsRef.current = maps

    const {
        disableFileUploads, urlPrefix, extraNavBarMenus, viewOnly, extraDraggableModals, 
        monomerLibraryPath, extraFileMenuItems, allowScripting, backupStorageInstance,
        extraEditMenuItems, aceDRGInstance, extraCalculateMenuItems, setMoorhenDimensions,
        onUserPreferencesChange
    } = props

    const collectedProps: moorhen.CollectedProps = {
        glRef, commandCentre, timeCapsuleRef, disableFileUploads, extraDraggableModals, aceDRGInstance, 
        urlPrefix, viewOnly, mapsRef, allowScripting, extraCalculateMenuItems, extraEditMenuItems,
        extraNavBarMenus, monomerLibraryPath, moleculesRef, extraFileMenuItems, activeMapRef,
        videoRecorderRef, lastHoveredAtomRef, onUserPreferencesChange
    }
    
    useEffect(() => {
        let head = document.head
        let style: any = document.createElement("link")
        style.href = `${props.urlPrefix}/baby-gru/moorhen.css`
        style.rel = "stylesheet"
        style.async = true
        style.type = 'text/css'
        head.appendChild(style)
    }, [])

    const setWindowDimensions = useCallback(() => {
        let [ newWidth, newHeight ]: [number, number] = [window.innerWidth, window.innerHeight]
        if (setMoorhenDimensions) {
            [ newWidth, newHeight ] = setMoorhenDimensions()
        } 
        if (width !== newWidth) {
            dispatch(setWidth(newWidth))
        }
        if (height !== newHeight) {
            dispatch(setHeight(newHeight))
        }
    }, [width, height])

    useEffect(() => {
        window.addEventListener('resize', setWindowDimensions)
        return () => {
            window.removeEventListener('resize', setWindowDimensions)
        }
    }, [setWindowDimensions])

    useEffect(() => {
        const initTimeCapsule = async () => {
            if (userPreferencesMounted) {
                timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef)
                timeCapsuleRef.current.storageInstance = backupStorageInstance
                timeCapsuleRef.current.maxBackupCount = maxBackupCount
                timeCapsuleRef.current.modificationCountBackupThreshold = modificationCountBackupThreshold
                await timeCapsuleRef.current.init()
            }
        }
        initTimeCapsule()
    }, [userPreferencesMounted])
    
    useEffect(() => {
        const onCootInitialized = async () => {
            if (cootInitialized && userPreferencesMounted) {
                await commandCentre.current.cootCommand({
                    command: 'set_map_sampling_rate',
                    commandArgs: [defaultMapSamplingRate],
                    returnType: 'status'
                }, false)
    
                const shortCut = JSON.parse(shortCuts as string).show_shortcuts
                dispatch(setNotificationContent(
                    <MoorhenNotification key={'initial-notification'} hideDelay={5000} width={20}>
                        <h4 style={{margin: 0}}>
                            {`Press ${getTooltipShortcutLabel(shortCut)} to show help`}
                        </h4>
                    </MoorhenNotification>
                ))
            }
        }
        
        onCootInitialized()

    }, [cootInitialized, userPreferencesMounted])

    useEffect(() => {
        if (userPreferencesMounted && defaultBackgroundColor !== backgroundColor) {
            dispatch(
                setBackgroundColor(defaultBackgroundColor)
            )
        }
        
    }, [userPreferencesMounted])

    useMemo(() => {
        let head = document.head;
        let style: any = document.createElement("link");

        if (isDark) {
            style.href = `${urlPrefix}/baby-gru/darkly.css`
        } else {
            style.href = `${urlPrefix}/baby-gru/flatly.css`
        }
        
        style.rel = "stylesheet";
        style.async = true
        style.type = 'text/css'

        head.appendChild(style);
        return () => { head.removeChild(style); }
    }, [isDark])

    useEffect(() => {
        if (!userPreferencesMounted) {
            return
        }
        
        const _isDark = isDarkBackground(...backgroundColor)
        
        if (defaultBackgroundColor !== backgroundColor) {
            dispatch( setDefaultBackgroundColor(backgroundColor) )
        }
        if (isDark !== _isDark) {
            dispatch( setIsDark(_isDark) )
            dispatch( setTheme(_isDark ? "darkly" : "flatly") )
        }

    }, [backgroundColor])

    useEffect(() => {
        async function setMakeBackupsAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_make_backups',
                commandArgs: [makeBackups],
                returnType: "status"
            }, false)
        }

        if (commandCentre.current && makeBackups !== null && cootInitialized) {
            setMakeBackupsAPI()
        }

    }, [makeBackups, cootInitialized])

    useEffect(() => {
        async function setDrawMissingLoopAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_draw_missing_residue_loops',
                commandArgs: [drawMissingLoops],
                returnType: "status"
            }, false)
        }

        if (commandCentre.current && drawMissingLoops !== null && cootInitialized) {
            setDrawMissingLoopAPI()
        }

    }, [drawMissingLoops, cootInitialized])

    useEffect(() => {
        setWindowDimensions()
        commandCentre.current = new MoorhenCommandCentre(urlPrefix, glRef, timeCapsuleRef, {
            onCootInitialized: () => {
                dispatch( setCootInitialized(true) )
            },
        })
        return () => {
            commandCentre.current.unhook()
        }
    }, [])

    useEffect(() => {
        const checkMoleculeSizes = async () => {
            const moleculeAtomCounts = await Promise.all(
                molecules.filter(molecule => !molecule.atomCount).map(molecule => molecule.getNumberOfAtoms())
            )
            const totalAtomCount = moleculeAtomCounts.reduce((partialAtomCount, atomCount) => partialAtomCount + atomCount, 0)
            if (totalAtomCount >= 80000) {
                dispatch( setEnableAtomHovering(false) )
            }
        }
        checkMoleculeSizes()
    }, [molecules])

    const onAtomHovered = useCallback((identifier: { buffer: { id: string; }; atom: { label: string; }; }) => {
        if (identifier == null) {
            if (lastHoveredAtomRef.current !== null && lastHoveredAtomRef.current.molecule !== null) {
                dispatch( setHoveredAtom({ molecule: null, cid: null }) )
            }
        }
        else {
            molecules.forEach(molecule => {
                if (molecule.buffersInclude(identifier.buffer)) {
                    if (molecule !== hoveredAtom.molecule || identifier.atom.label !== hoveredAtom.cid) {
                        dispatch( setHoveredAtom({ molecule: molecule, cid: identifier.atom.label }) )
                    }
                }
            })
        }
    }, [molecules])

    //Make this so that the keyPress returns true or false, depending on whether mgWebGL is to continue processing event
    const onKeyPress = useCallback((event: KeyboardEvent) => {
        return babyGruKeyPress(
            event,
            {
                ...collectedProps,
                molecules,
                isDark,
                windowWidth: width,
                activeMap,
                hoveredAtom,
                setHoveredAtom: (newVal) => dispatch(setHoveredAtom(newVal)),
                setNotificationContent: (newVal) => dispatch(setNotificationContent(newVal))
            },
            JSON.parse(shortCuts as string),
            showShortcutToast,
            shortcutOnHoveredAtom
        )
    }, [molecules, activeMap, hoveredAtom, viewOnly, shortCuts, showShortcutToast, shortcutOnHoveredAtom, width, isDark])

    useEffect(() => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (lastHoveredAtomRef.current == null ||
                hoveredAtom.molecule !== lastHoveredAtomRef.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtomRef.current.cid
            ) {
                hoveredAtom.molecule.drawHover(hoveredAtom.cid)
                //if we have changed molecule, might have to clean up hover display item of previous molecule
            }
        }

        if (lastHoveredAtomRef.current !== null &&
            lastHoveredAtomRef.current.molecule !== null &&
            lastHoveredAtomRef.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtomRef.current.molecule.clearBuffersOfStyle("hover")
        }

        lastHoveredAtomRef.current = hoveredAtom
    }, [hoveredAtom])

    useEffect(() => {
        glResize()
    }, [width, height])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            activeMap.setActive()
        }
    }, [activeMap])

    const glResize = () => {
        glRef.current.resize(width, height)
        glRef.current.drawScene()
    }

    return <> 
    <div>
        <Backdrop sx={{ color: '#fff', zIndex: (_theme) => _theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        
        <MoorhenNavBar {...collectedProps}/>
        
    </div>

    <MoorhenPreferencesContainer onUserPreferencesChange={onUserPreferencesChange}/>

    <Container fluid className={`baby-gru ${theme}`}>
        <Row>
            <Col style={{ paddingLeft: '0', paddingRight: '0' }}>
                <div
                    id="moorhen-canvas-background"
                    style={{
                        backgroundColor: `rgba(
                            ${255 * backgroundColor[0]},
                            ${255 * backgroundColor[1]},
                            ${255 * backgroundColor[2]}, 
                            ${backgroundColor[3]})`,
                        cursor: cursorStyle, margin: 0, padding: 0, height: Math.floor(height),
                    }}>
                    <MoorhenWebMG
                        ref={glRef}
                        monomerLibraryPath={monomerLibraryPath}
                        timeCapsuleRef={timeCapsuleRef}
                        commandCentre={commandCentre}
                        onAtomHovered={onAtomHovered}
                        onKeyPress={onKeyPress}
                        urlPrefix={urlPrefix}
                        viewOnly={viewOnly}
                        extraDraggableModals={extraDraggableModals}
                        videoRecorderRef={videoRecorderRef}
                    />
                </div>
            </Col>
        </Row>
        {notificationContent}
    </Container>
    </>
}

MoorhenContainer.defaultProps = {
    onUserPreferencesChange: () => {},
    urlPrefix: '.',
    monomerLibraryPath: './baby-gru/monomers',
    setMoorhenDimensions: null,
    disableFileUploads: false,
    extraNavBarMenus: [],
    extraFileMenuItems: [],
    extraEditMenuItems: [],
    extraCalculateMenuItems: [],
    extraDraggableModals: [],
    viewOnly: false,
    allowScripting: true,
    backupStorageInstance: createLocalStorageInstance('Moorhen-TimeCapsule'),
    aceDRGInstance: null
}
