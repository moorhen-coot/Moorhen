import { useEffect, useCallback, useReducer, useRef, useState, useContext } from 'react';
import { Container, Col, Row, Spinner, Toast, ToastContainer } from 'react-bootstrap';
import { MoorhenWebMG } from './webMG/MoorhenWebMG';
import { convertViewtoPx, getTooltipShortcutLabel, createLocalStorageInstance, allFontsSet, itemReducer } from '../utils/MoorhenUtils';
import { MoorhenCommandCentre } from "../utils/MoorhenCommandCentre"
import { MoorhenContext } from "../utils/MoorhenContext";
import { MoorhenTimeCapsule } from '../utils/MoorhenTimeCapsule';
import { Backdrop } from "@mui/material";
import { babyGruKeyPress } from '../utils/MoorhenKeyboardAccelerators';
import { isDarkBackground } from '../WebGLgComponents/mgWebGL'
import { MoorhenNavBar } from "./navbar-menus/MoorhenNavBar"
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';

const initialMoleculesState: moorhen.Molecule[] = []

const initialMapsState: moorhen.Map[] = []

/**
 * A container for the Moorhen app
 * @property {string} [urlPrefix='.'] - The root url used to load sources from public folder
 * @property {string} [monomerLibraryPath='./baby-gru/monomers'] - A string with the path to the monomer library, relative to the root of the app
 * @property {function} forwardControls - Callback executed when coot is initialised and will return an object of type moorhen.Controls
 * @property {function} setMoorhenDimensions - Callback executed on window resize. Return type is an array of two numbers [width, height]
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
 * import { useState, useReducer, useRef } from "react";
 * import { MoorhenContainer, itemReducer } from "moorhen";
 *
 * const initialMoleculesState = []
 * const initialMapsState = []
 * 
 * const ExampleApp = () => {
 * 
 *  const [activeMap, setActiveMap] = useState(null);
 *  const [molecules, changeMolecules] = useReducer(itemReducer, initialMoleculesState);
 *  const [maps, changeMaps] = useReducer(itemReducer, initialMapsState);
 * 
 *  const doClick = (evt) => { console.log('Click!') }
 *  const exportMenuItem =  <MenuItem key={'example-key'} id='example-menu-item' onClick={doClick}>
 *                              Example extra menu
 *                          </MenuItem>
 * 
 *  const moleculesRef = useRef(null);
 *  const mapsRef = useRef(null);
 *  const activeMapRef = useRef(null);
 * 
 *  moleculesRef.current = molecules;
 *  mapsRef.current = maps;
 *  activeMapRef.current = activeMap;
 * 
 *  const forwardCollectedControls = (controls) => { console.log(controls) }
 * 
 *  return <MoorhenContainer
 *    moleculesRef={moleculesRef}
 *    mapsRef={mapsRef}
 *    allowScripting={false}
 *    extraFileMenuItems={[exportMenuItem]}
 *    forwardControls={forwardCollectedControls}
 *  />
 * }
 */
export const MoorhenContainer = (props: moorhen.ContainerProps) => {
    const context = useContext<undefined | moorhen.Context>(MoorhenContext);
    const innerGlRef = useRef<null | webGL.MGWebGL>(null)
    const innerTimeCapsuleRef = useRef<null | moorhen.TimeCapsule>(null);
    const innnerCommandCentre = useRef<null | moorhen.CommandCentre>(null)
    const innerMoleculesRef = useRef<null | moorhen.Molecule[]>(null)
    const innerMapsRef = useRef<null | moorhen.Map[]>(null)
    const innerActiveMapRef = useRef<null | moorhen.Map>(null)
    const innerLastHoveredAtom = useRef<null | moorhen.HoveredAtom>(null)
    const innerPrevActiveMoleculeRef = useRef<null |  moorhen.Molecule>(null)
    const [innerEnableAtomHovering, setInnerEnableAtomHovering] = useState<boolean>(true)
    const [innerActiveMap, setInnerActiveMap] = useState<null | moorhen.Map>(null)
    const [innerActiveMolecule, setInnerActiveMolecule] = useState<null|  moorhen.Molecule>(null)
    const [innerHoveredAtom, setInnerHoveredAtom] = useState<null | moorhen.HoveredAtom>({ molecule: null, cid: null })
    const [innerCursorStyle, setInnerCursorStyle] = useState<string>("default")
    const [innerBusy, setInnerBusy] = useState<boolean>(false)
    const [innerWindowWidth, setInnerWindowWidth] = useState<number>(window.innerWidth)
    const [innerWindowHeight, setInnerWindowHeight] = useState<number>(window.innerHeight)
    const [innerMolecules, innerChangeMolecules] = useReducer(itemReducer, initialMoleculesState)
    const [innerMaps, innerChangeMaps] = useReducer(itemReducer, initialMapsState)
    const [innerBackgroundColor, setInnerBackgroundColor] = useState<[number, number, number, number]>([1, 1, 1, 1])
    const [innerAppTitle, setInnerAppTitle] = useState<string>('Moorhen')
    const [innerCootInitialized, setInnerCootInitialized] = useState<boolean>(false)
    const [innerTheme, setInnerTheme] = useState<string>("flatly")
    const [innerShowToast, setInnerShowToast] = useState<boolean>(false)
    const [innerToastContent, setInnerToastContent] = useState<null | JSX.Element>(null)
    const [innerAvailableFonts, setInnerAvailableFonts] = useState<string[]>([])
    
    innerMoleculesRef.current = innerMolecules as moorhen.Molecule[]
    innerMapsRef.current = innerMaps as moorhen.Map[]
    innerActiveMapRef.current = innerActiveMap
    
    useEffect(() => {
        let head = document.head
        let style: any = document.createElement("link")
        style.href = `${props.urlPrefix}/baby-gru/moorhen.css`
        style.rel = "stylesheet"
        style.async = true
        style.type = 'text/css'
        head.appendChild(style)
        
    }, [])

    useEffect(() => {
        const fetchAvailableFonts = async () => {
            await document.fonts.ready;
            const fontAvailable: string[] = []
            allFontsSet.forEach((font: string) => {
                if (document.fonts.check(`12px "${font}"`)) {
                    fontAvailable.push(font);
                }    
            })
            setInnerAvailableFonts(Array.from(fontAvailable))  
        }

        fetchAvailableFonts()

    }, [])

    const innerStatesMap: moorhen.ContainerStates = {
        glRef: innerGlRef, timeCapsuleRef: innerTimeCapsuleRef, commandCentre: innnerCommandCentre,
        moleculesRef: innerMoleculesRef, mapsRef: innerMapsRef, activeMapRef: innerActiveMapRef,
        lastHoveredAtom: innerLastHoveredAtom, setEnableAtomHovering: setInnerEnableAtomHovering,
        prevActiveMoleculeRef: innerPrevActiveMoleculeRef, setAvailableFonts: setInnerAvailableFonts,
        activeMap: innerActiveMap, setActiveMap: setInnerActiveMap, activeMolecule: innerActiveMolecule,
        setActiveMolecule: setInnerActiveMolecule, hoveredAtom: innerHoveredAtom, setHoveredAtom: setInnerHoveredAtom,
        cursorStyle: innerCursorStyle, maps: innerMaps as moorhen.Map[], molecules: innerMolecules as moorhen.Molecule[],
        setCursorStyle: setInnerCursorStyle, busy: innerBusy, setBusy: setInnerBusy, windowHeight: innerWindowHeight, 
        windowWidth: innerWindowWidth, setWindowWidth: setInnerWindowWidth, setBackgroundColor: setInnerBackgroundColor,
        changeMaps: innerChangeMaps, setWindowHeight: setInnerWindowHeight, enableAtomHovering: innerEnableAtomHovering,
        changeMolecules: innerChangeMolecules, backgroundColor: innerBackgroundColor, 
        appTitle: innerAppTitle, setAppTitle: setInnerAppTitle, cootInitialized: innerCootInitialized, 
        setCootInitialized: setInnerCootInitialized, theme: innerTheme, setTheme: setInnerTheme, 
        showToast: innerShowToast, setShowToast: setInnerShowToast, toastContent: innerToastContent, 
        setToastContent: setInnerToastContent, availableFonts: innerAvailableFonts
    }

    let states = {} as moorhen.ContainerStates
    Object.keys(innerStatesMap).forEach(key => {
        states[key] = props[key] ? props[key] : innerStatesMap[key]
    })

    const { glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef,
        lastHoveredAtom, prevActiveMoleculeRef, activeMap, maps, changeMaps,
        setActiveMap, activeMolecule, setActiveMolecule, hoveredAtom, setHoveredAtom,
        cursorStyle, setCursorStyle, busy, setBusy, changeMolecules, setEnableAtomHovering,
        windowWidth, setWindowWidth, windowHeight, setWindowHeight, molecules, 
        backgroundColor, setBackgroundColor, availableFonts, setAvailableFonts, enableAtomHovering,
        appTitle, setAppTitle, cootInitialized, setCootInitialized, theme, setTheme,
        showToast, setShowToast, toastContent, setToastContent
    } = states

    const {
        disableFileUploads, urlPrefix, extraNavBarMenus, viewOnly, extraDraggableModals, 
        monomerLibraryPath, forwardControls, extraFileMenuItems, allowScripting, backupStorageInstance,
        extraEditMenuItems, aceDRGInstance, extraCalculateMenuItems, setMoorhenDimensions
    } = props
    
    const setWindowDimensions = () => {
        if (setMoorhenDimensions) {
            const [ width, height ] = setMoorhenDimensions()
            setWindowWidth(width)
            setWindowHeight(height)
        } else {
            setWindowWidth(window.innerWidth)
            setWindowHeight(window.innerHeight)
        }
    }

    useEffect(() => {
        const initTimeCapsule = async () => {
            if (context.isMounted) {
                timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, context)
                timeCapsuleRef.current.storageInstance = backupStorageInstance
                timeCapsuleRef.current.maxBackupCount = context.maxBackupCount
                timeCapsuleRef.current.modificationCountBackupThreshold = context.modificationCountBackupThreshold
                await timeCapsuleRef.current.init()
            }
        }
        initTimeCapsule()
    }, [context.isMounted])
    
    useEffect(() => {
        const onCootInitialized = async () => {
            if (cootInitialized && context.isMounted) {
                await commandCentre.current.cootCommand({
                    command: 'set_map_sampling_rate',
                    commandArgs: [context.defaultMapSamplingRate],
                    returnType: 'status'
                }, false)
    
                const shortCut = JSON.parse(context.shortCuts as string).show_shortcuts
                setToastContent(
                    <h4 style={{margin: 0}}>
                        {`Press ${getTooltipShortcutLabel(shortCut)} to show help`}
                    </h4>
                )

                if (forwardControls) {
                    forwardControls(collectedProps)
                }
            }
        }
        
        onCootInitialized()

    }, [cootInitialized, context.isMounted, forwardControls])

    useEffect(() => {
        if (context.isMounted && context.defaultBackgroundColor !== backgroundColor) {
            setBackgroundColor(context.defaultBackgroundColor)
        }
        
    }, [context.isMounted])

    useEffect(() => {
        if (!context.isMounted) {
            return
        }
        
        let head = document.head;
        let style: any = document.createElement("link");
        const isDark = isDarkBackground(...backgroundColor)

        if (isDark) {
            style.href = `${urlPrefix}/baby-gru/darkly.css`
            setTheme("darkly")
        } else {
            style.href = `${urlPrefix}/baby-gru/flatly.css`
            setTheme("flatly")
        }
        
        if (context.defaultBackgroundColor !== backgroundColor) {
            context.setDefaultBackgroundColor(backgroundColor)
        }

        style.rel = "stylesheet";
        style.async = true
        style.type = 'text/css'

        head.appendChild(style);
        return () => { head.removeChild(style); }


    }, [backgroundColor])

    useEffect(() => {
        async function setMakeBackupsAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_make_backups',
                commandArgs: [context.makeBackups],
                returnType: "status"
            }, false)
        }

        if (commandCentre.current && context.makeBackups !== null && cootInitialized) {
            setMakeBackupsAPI()
        }

    }, [context.makeBackups, cootInitialized])

    useEffect(() => {
        async function setDrawMissingLoopAPI() {
            await commandCentre.current.cootCommand({
                command: 'set_draw_missing_residue_loops',
                commandArgs: [context.drawMissingLoops],
                returnType: "status"
            }, false)
        }

        if (commandCentre.current && context.drawMissingLoops !== null && cootInitialized) {
            setDrawMissingLoopAPI()
        }

    }, [context.drawMissingLoops, cootInitialized])

    useEffect(() => {
        setWindowDimensions()
        commandCentre.current = new MoorhenCommandCentre(urlPrefix, glRef, timeCapsuleRef, {
            onActiveMessagesChanged: (newActiveMessages) => {
                setBusy(newActiveMessages.length !== 0)
            },
            onCootInitialized: () => {
                setCootInitialized(true)
            },
        })
        window.addEventListener('resize', setWindowDimensions)
        return () => {
            window.removeEventListener('resize', setWindowDimensions)
            commandCentre.current.unhook()
        }
    }, [])

    useEffect(() => {
        const checkMoleculeSizes = async () => {
            const responses = await Promise.all(molecules.map(molecule => {
                return commandCentre.current.cootCommand({
                    command: 'get_number_of_atoms',
                    commandArgs: [molecule.molNo],
                    returnType: "status"
                }, false) as Promise<moorhen.WorkerResponse<number>>
            }))
            const atomCount = responses.reduce((partialAtomCount, response) => partialAtomCount + response.data.result.result, 0)
            console.log(atomCount)
            if (atomCount >= 80000) {
                setEnableAtomHovering(false)
            }
        }
        checkMoleculeSizes()
    }, [molecules])

    const onAtomHovered = useCallback((identifier: { buffer: { id: string; }; atom: { label: string; }; }) => {
        if (identifier == null) {
            if (lastHoveredAtom.current !== null && lastHoveredAtom.current.molecule !== null) {
                setHoveredAtom({ molecule: null, cid: null })
            }
        }
        else {
            molecules.forEach(molecule => {
                if (molecule.buffersInclude(identifier.buffer)) {
                    if (molecule !== hoveredAtom.molecule || identifier.atom.label !== hoveredAtom.cid) {
                        setHoveredAtom({ molecule: molecule, cid: identifier.atom.label })
                    }
                }
            })
        }
    }, [molecules])

    useEffect(() => {
        if (toastContent) setShowToast(true)
    }, [toastContent])

    //Make this so that the keyPress returns true or false, depending on whether mgWebGL is to continue processing event
    const onKeyPress = useCallback((event: KeyboardEvent) => {
        return babyGruKeyPress(event, collectedProps, context, JSON.parse(context.shortCuts as string))
    }, [molecules, activeMolecule, activeMap, hoveredAtom, viewOnly, context])

    useEffect(() => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (lastHoveredAtom.current == null ||
                hoveredAtom.molecule !== lastHoveredAtom.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtom.current.cid
            ) {
                hoveredAtom.molecule.drawHover(hoveredAtom.cid)
                //if we have changed molecule, might have to clean up hover display item of previous molecule
            }
        }

        if (lastHoveredAtom.current !== null &&
            lastHoveredAtom.current.molecule !== null &&
            lastHoveredAtom.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtom.current.molecule.clearBuffersOfStyle("hover")
        }

        lastHoveredAtom.current = hoveredAtom
    }, [hoveredAtom])

    useEffect(() => {
        glResize()
    }, [windowHeight, windowWidth])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            commandCentre.current.cootCommand({
                returnType: "status",
                command: "set_imol_refinement_map",
                commandArgs: [activeMap.molNo]
            }, false)
        }
    }, [activeMap])

    useEffect(() => {
        function resetActiveGL() {
            prevActiveMoleculeRef.current = activeMolecule;
            if (activeMolecule)
                glRef.current.setActiveMolecule(activeMolecule)
            else
                glRef.current.setActiveMolecule(null)
        }
        if (prevActiveMoleculeRef.current) {
            prevActiveMoleculeRef.current.applyTransform().then(() => resetActiveGL())
        } else {
            resetActiveGL()
        }
    }, [activeMolecule])

    const glResize = () => {
        glRef.current.resize(windowWidth, windowHeight)
        glRef.current.drawScene()
    }

    const webGLWidth = () => {
        return windowWidth
    }

    const webGLHeight = () => {
        return windowHeight
    }

    const isDark = isDarkBackground(...backgroundColor)

    const collectedProps: moorhen.Controls = {
        molecules, changeMolecules, appTitle, setAppTitle, maps, changeMaps, glRef, activeMolecule, setActiveMolecule,
        activeMap, setActiveMap, commandCentre, backgroundColor, setBackgroundColor, toastContent, 
        setToastContent, hoveredAtom, setHoveredAtom, showToast, setShowToast, windowWidth, windowHeight,
        timeCapsuleRef, isDark, disableFileUploads, urlPrefix, viewOnly, mapsRef, allowScripting, extraCalculateMenuItems,
        extraNavBarMenus, monomerLibraryPath, moleculesRef, extraFileMenuItems, extraEditMenuItems, 
        extraDraggableModals, aceDRGInstance, availableFonts, enableAtomHovering, setEnableAtomHovering
    }

    return <> 
    <div>
        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        
        <MoorhenNavBar {...collectedProps} busy={busy}/>
        
    </div>
    
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
                        cursor: cursorStyle, margin: 0, padding: 0, height: Math.floor(windowHeight),
                    }}>
                    <MoorhenWebMG
                        ref={glRef}
                        enableAtomHovering={enableAtomHovering}
                        monomerLibraryPath={monomerLibraryPath}
                        timeCapsuleRef={timeCapsuleRef}
                        commandCentre={commandCentre}
                        molecules={molecules}
                        changeMolecules={changeMolecules}
                        maps={maps}
                        changeMaps={changeMaps}
                        width={webGLWidth}
                        height={webGLHeight}
                        backgroundColor={backgroundColor}
                        setBackgroundColor={setBackgroundColor}
                        isDark={isDark}
                        onAtomHovered={onAtomHovered}
                        onKeyPress={onKeyPress}
                        hoveredAtom={hoveredAtom}
                        windowHeight={windowHeight}
                        windowWidth={windowWidth}
                        urlPrefix={urlPrefix}
                        activeMap={activeMap}
                        viewOnly={viewOnly}
                        extraDraggableModals={extraDraggableModals}
                    />
                </div>
            </Col>
        </Row>
        <ToastContainer style={{ marginTop: "5rem", maxWidth: '20rem' }} position='top-center' >
            <Toast className='shadow-none hide-scrolling' onClose={() => setShowToast(false)} autohide={true} delay={5000} show={showToast} style={{overflowY: 'scroll', maxHeight: convertViewtoPx(80, windowHeight)}}>
                <Toast.Header className="stop-scrolling" closeButton={false} style={{justifyContent:'center'}}>
                    {toastContent}
                </Toast.Header>
            </Toast>
        </ToastContainer>
    </Container>
    </>
}

MoorhenContainer.defaultProps = {
    urlPrefix: '.',
    monomerLibraryPath: './baby-gru/monomers',
    forwardControls: () => {},
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
