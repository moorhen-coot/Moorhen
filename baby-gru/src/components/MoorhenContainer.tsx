import { useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Container, Col, Row, Spinner } from 'react-bootstrap';
import { MoorhenWebMG } from './webMG/MoorhenWebMG';
import { createLocalStorageInstance, parseAtomInfoLabel } from '../utils/utils';
import { MoorhenCommandCentre } from "../utils/MoorhenCommandCentre";
import { MoorhenTimeCapsule } from '../utils/MoorhenTimeCapsule';
import { Backdrop } from "@mui/material";
import { isDarkBackground } from '../WebGLgComponents/webGLUtils'
import { MoorhenNavBar } from "./navbar-menus/MoorhenNavBar"
import { MoorhenModalsContainer } from './misc/MoorhenModalsContainer';
import { moorhen } from '../types/moorhen';
import { webGL } from '../types/mgWebGL';
import { MoorhenPreferencesContainer } from './misc/MoorhenPreferencesContainer';
import { useSelector, useDispatch } from 'react-redux';
import { setDefaultBackgroundColor, setBackgroundColor, setHeight, setIsDark, setWidth } from '../store/sceneSettingsSlice';
import { setCootInitialized, setTheme, toggleCootCommandExit, toggleCootCommandStart } from '../store/generalStatesSlice';
import { setEnableAtomHovering, setHoveredAtom } from '../store/hoveringStatesSlice';
import { setRefinementSelection } from '../store/refinementSettingsSlice';
import { MoorhenSnackBarManager } from '../components/snack-bar/MoorhenSnackBarManager';
import MoorhenReduxStore from '../store/MoorhenReduxStore';
import { SnackbarProvider } from 'notistack';
import { MoorhenGoToResidueSnackbar } from './snack-bar/MoorhenGoToResidueSnackbar';
import { MoorhenRecordingSnackBar } from './snack-bar/MoorhenRecordingSnackBar'
import { MoorhenResidueSelectionSnackBar } from './snack-bar/MoorhenResidueSelectionSnackBar';
import { MoorhenAcceptRejectDragAtomsSnackBar } from './snack-bar/MoorhenAcceptRejectDragAtomsSnackBar';
import { MoorhenAcceptRejectRotateTranslateSnackBar } from './snack-bar/MoorhenAcceptRejectRotateTranslateSnackBar';
import { MoorhenAcceptRejectMatchingLigandSnackBar } from './snack-bar/MoorhenAcceptRejectMatchingLigandSnackBar';
import { MoorhenLongJobSnackBar } from './snack-bar/MoorhenLongJobSnackBar';
import { MoorhenResidueStepsSnackBar } from './snack-bar/MoorhenResidueStepsSnackBar';
import { MoorhenUpdatingMapsManager, MoorhenUpdatingMapsSnackBar } from './snack-bar/MoorhenUpdatingMapsSnackBar';
import { MoorhenModelTrajectorySnackBar } from './snack-bar/MoorhenModelTrajectorySnackBar';
import { MoorhenTomogramSnackBar } from './snack-bar/MoorhenTomogramSnackBar';
import { MoorhenMapContourLevelSnackBar } from './snack-bar/MoorhenMapContourLevelSnackBar';
import { MoorhenRotamerChangeSnackBar } from './snack-bar/MoorhenRotamerChangeSnackbar';
import { MoorhenScreenshotSnackBar } from './snack-bar/MoorhenScreenshotSnackBar';
import { MoorhenSideBar } from './snack-bar/MoorhenSideBar';
import { MoorhenAtomInfoSnackBar } from './snack-bar/MoorhenAtomInfoSnackBar';
import { MoorhenDroppable } from './MoorhenDroppable';
import { setRequestDrawScene } from "../store/glRefSlice"

declare module "notistack" {
    interface VariantOverrides {
        goToResidue: {
            glRef: React.RefObject<webGL.MGWebGL>;
            commandCentre: React.RefObject<moorhen.CommandCentre>;

        };
        screenRecorder: {
            videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
        };
        residueSelection: true;
        acceptRejectDraggingAtoms: {
            commandCentre: React.RefObject<moorhen.CommandCentre>;
            moleculeRef: React.RefObject<moorhen.Molecule>;
            cidRef: React.RefObject<string[]>;
            glRef: React.RefObject<webGL.MGWebGL>;
            monomerLibraryPath: string;
        },
        atomInformation: {
            commandCentre: React.RefObject<moorhen.CommandCentre>;
            moleculeRef: moorhen.Molecule;
            cidRef: string;
            glRef: React.RefObject<webGL.MGWebGL>;
            monomerLibraryPath: string;
        },
        acceptRejectRotateTranslateAtoms: {
            moleculeRef: React.RefObject<moorhen.Molecule>;
            cidRef: React.RefObject<string>;
            glRef: React.RefObject<webGL.MGWebGL>;
        };
        acceptRejectMatchingLigand: {
            refMolNo: number;
            movingMolNo: number;
            refLigandCid: string;
            movingLigandCid: string;
            commandCentre: React.RefObject<moorhen.CommandCentre>;
        };
        longJobNotification: true;
        residueSteps: {
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
            residueList: { cid: string }[];
            onStep: (stepInput: any) => Promise<void>;
            onStart?: () => Promise<void> | void;
            onStop?: () => void;
            onPause?: () => void;
            onResume?: () => void;
            onProgress?: (progress: number) => void;
            disableTimeCapsule?: boolean
            sleepTime?: number;
        };
        updatingMaps: {
            glRef: React.RefObject<webGL.MGWebGL>;
            commandCentre: React.RefObject<moorhen.CommandCentre>;
        };
        modelTrajectory: {
            commandCentre: React.RefObject<moorhen.CommandCentre>;
            glRef: React.RefObject<webGL.MGWebGL>;
            moleculeMolNo: number;
            representationStyle: string;
        };
        tomogram: {
            commandCentre: React.RefObject<moorhen.CommandCentre>;
            glRef: React.RefObject<webGL.MGWebGL>;
            mapMolNo: number;
        };
        mapContourLevel: {
            mapMolNo: number;
            mapPrecision: number
        };
        rotamerChange: {
            moleculeMolNo: number;
            chosenAtom: moorhen.ResidueSpec;
            commandCentre: React.RefObject<moorhen.CommandCentre>;
            glRef: React.RefObject<webGL.MGWebGL>;
        }
        screenshot: {
            videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
            glRef: React.RefObject<webGL.MGWebGL>;
        };
        sideBar: {
            children: React.JSX.Element;
            modalId: string;
            title: string | React.JSX.Element;
        }
    }
}

/**
 * A container for the Moorhen app. Needs to be rendered within a MoorhenReduxprovider.
 * @property {React.RefObject<webGL.mgWebGL>} [glRef] - React reference holding the webGL rendering component
 * @property {React.RefObject<moorhen.TimeCapsule>} [timeCapsuleRef] - React reference holding an instance of MoorhenTimeCapsule which is in charge of backups
 * @property {React.RefObject<moorhen.commandCentre>} [commandCentre] - React reference holding an instance of MoorhenCommandCentre which is in charge of communication with libcoot instance
 * @property {React.RefObject<moorhen.Molecule[]>} [moleculesRef] - React reference holding a list of loaded MoorhenMolecule instances
 * @property {React.RefObject<moorhen.Map[]>} [mapsRef] - React reference holding a list of loaded MoorhenMap instances
 * @property {string} [urlPrefix='.'] - The root url used to load sources from public folder
 * @property {string} [monomerLibraryPath='./monomers'] - A string with the path to the monomer library, relative to the root of the app
 * @property {function} setMoorhenDimensions - Callback executed on window resize. Return type is an array of two numbers [width, height]
 * @property {function} onUserPreferencesChange - Callback executed whenever a user-defined preference changes (key: string, value: any) => void.
 * @property {boolean} [disableFileUploads=false] - Indicates if file uploads should b disabled
 * @property {string[]} [includeNavBarMenuNames] - An array of menu names to include in the Moorhen navbar. If empty array then all menus will be included. It can also be used to set their order.
 * @property {object[]} extraNavBarModals - A list with additional draggable modals with buttons rendered under the navigation menu
 * @property {object[]} extraNavBarMenus - A list with additional menu items rendered under the navigation menu
 * @property {React.JSX.Element[]} extraFileMenuItems - A list with additional menu items rendered under the "File" menu
 * @property {React.JSX.Element[]} extraEditMenuItems - A list with additional menu items rendered under the "Edit" menu
 * @property {React.JSX.Element[]} extraCalculateMenuItems - A list with additional menu items rendered under the "Calculate" menu
 * @property {React.JSX.Element[]} extraDraggableModals - A list with additional draggable modals to be rendered
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

    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const cursorStyle = useSelector((state: moorhen.State) => state.hoveringStates.cursorStyle)
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized)
    const theme = useSelector((state: moorhen.State) => state.generalStates.theme)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate)
    const defaultBackgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.defaultBackgroundColor)
    const makeBackups = useSelector((state: moorhen.State) => state.backupSettings.makeBackups)
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount)
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi)

    const dispatch = useDispatch()

    const innerRefsMap: moorhen.ContainerRefs = {
        glRef: innerGlRef, timeCapsuleRef: innerTimeCapsuleRef, commandCentre: innnerCommandCentre,
        moleculesRef: innerMoleculesRef, mapsRef: innerMapsRef, activeMapRef: innerActiveMapRef,
        lastHoveredAtomRef: innerlastHoveredAtomRef, videoRecorderRef: innerVideoRecorderRef,
    }

    let refs = {} as moorhen.ContainerRefs
    Object.keys(innerRefsMap).forEach(key => {
        refs[key] = props[key] ? props[key] : innerRefsMap[key]
    })

    const {
        glRef, timeCapsuleRef, commandCentre, moleculesRef, mapsRef, activeMapRef, videoRecorderRef, lastHoveredAtomRef
    } = refs

    activeMapRef.current = activeMap
    moleculesRef.current = molecules
    mapsRef.current = maps

    const defaultProps = {
        onUserPreferencesChange: () => {},
        urlPrefix: '/baby-gru',
        monomerLibraryPath: './baby-gru/monomers',
        setMoorhenDimensions: null,
        disableFileUploads: false,
        includeNavBarMenuNames: [],
        extraNavBarModals: [],
        extraNavBarMenus: [],
        extraFileMenuItems: [],
        extraEditMenuItems: [],
        extraCalculateMenuItems: [],
        extraDraggableModals: [],
        viewOnly: false,
        allowScripting: true,
        backupStorageInstance: createLocalStorageInstance('Moorhen-TimeCapsule'),
        aceDRGInstance: null,
        store: MoorhenReduxStore,
        allowAddNewFittedLigand: false,
        allowMergeFittedLigand: true,
    }

    const {
        disableFileUploads, urlPrefix, extraNavBarMenus, viewOnly, extraDraggableModals,
        monomerLibraryPath, extraFileMenuItems, allowScripting, backupStorageInstance,
        extraEditMenuItems, aceDRGInstance, extraCalculateMenuItems, setMoorhenDimensions,
        onUserPreferencesChange, extraNavBarModals, includeNavBarMenuNames, store,
        allowAddNewFittedLigand, allowMergeFittedLigand
    } = { ...defaultProps, ...props }

    const collectedProps: moorhen.CollectedProps = {
        glRef, commandCentre, timeCapsuleRef, disableFileUploads, extraDraggableModals, aceDRGInstance,
        urlPrefix, viewOnly, mapsRef, allowScripting, extraCalculateMenuItems, extraEditMenuItems,
        extraNavBarMenus, monomerLibraryPath, moleculesRef, extraFileMenuItems, activeMapRef,
        videoRecorderRef, lastHoveredAtomRef, onUserPreferencesChange, extraNavBarModals, store,
        includeNavBarMenuNames, allowAddNewFittedLigand, allowMergeFittedLigand
    }

    useLayoutEffect(() => {
        let head = document.head
        let style: any = document.createElement("link")
        style.href = `${urlPrefix}/moorhen.css`
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
                timeCapsuleRef.current = new MoorhenTimeCapsule(moleculesRef, mapsRef, activeMapRef, glRef, store)
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

    useLayoutEffect(() => {
        let head = document.head;
        let style: any = document.createElement("link");

        if (isDark) {
            style.href = `${urlPrefix}/darkly.css`
        } else {
            style.href = `${urlPrefix}/flatly.css`
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
        const initCommandCentre = async () => {
            setWindowDimensions()
            commandCentre.current = new MoorhenCommandCentre(urlPrefix, glRef, timeCapsuleRef, {
                onCootInitialized: () => {
                    dispatch( setCootInitialized(true) )
                },
                onCommandExit: (kwargs) => {
                    dispatch( toggleCootCommandExit() )
                },
                onCommandStart: (kwargs) => {
                    dispatch( toggleCootCommandStart() )
                }
            })
            await commandCentre.current.init()
        }

        initCommandCentre()

        return () => {
            commandCentre.current.close()
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

    const onAtomHovered = useCallback((identifier: { buffer: { id: string; }; atom: moorhen.AtomInfo; }) => {
        if (identifier == null) {
            if (lastHoveredAtomRef.current !== null && lastHoveredAtomRef.current.molecule !== null) {
                dispatch( setHoveredAtom({ molecule: null, cid: null }) )
            }
        }
        else {
            molecules.forEach(molecule => {
                if (molecule.buffersInclude(identifier.buffer)) {
                    const newCid = parseAtomInfoLabel(identifier.atom)
                    if (molecule !== hoveredAtom.molecule || newCid !== hoveredAtom.cid) {
                        dispatch( setHoveredAtom({ molecule: molecule, cid: newCid }) )
                    }
                }
            })
        }
    }, [molecules])

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
        dispatch(setRequestDrawScene(true))
    }, [width, height])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            activeMap.setActive()
            if (activeMap.isEM) {
                dispatch(setRefinementSelection('SPHERE'))
            } else {
                dispatch(setRefinementSelection('TRIPLE'))
            }
        }
    }, [activeMap])

    return <SnackbarProvider
        hideIconVariant={false}
        autoHideDuration={4000}
        maxSnack={20}
        anchorOrigin={{horizontal: 'center', vertical: 'top'}}
        transitionDuration={{ enter: 500, exit: 300 }}
        Components={{
            goToResidue: MoorhenGoToResidueSnackbar,
            screenRecorder: MoorhenRecordingSnackBar,
            residueSelection: MoorhenResidueSelectionSnackBar,
            acceptRejectDraggingAtoms: MoorhenAcceptRejectDragAtomsSnackBar,
            acceptRejectRotateTranslateAtoms: MoorhenAcceptRejectRotateTranslateSnackBar,
            acceptRejectMatchingLigand: MoorhenAcceptRejectMatchingLigandSnackBar,
            longJobNotification: MoorhenLongJobSnackBar,
            residueSteps: MoorhenResidueStepsSnackBar,
            updatingMaps: MoorhenUpdatingMapsSnackBar,
            modelTrajectory: MoorhenModelTrajectorySnackBar,
            tomogram: MoorhenTomogramSnackBar,
            mapContourLevel: MoorhenMapContourLevelSnackBar,
            rotamerChange: MoorhenRotamerChangeSnackBar,
            screenshot: MoorhenScreenshotSnackBar,
            sideBar: MoorhenSideBar,
            atomInformation: MoorhenAtomInfoSnackBar,
        }}
        preventDuplicate={true}>
    <div>
        <Backdrop sx={{ color: '#fff', zIndex: (_theme) => _theme.zIndex.drawer + 1 }} open={!cootInitialized}>
            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
            <span>Starting moorhen...</span>
        </Backdrop>
        <MoorhenNavBar {...collectedProps}/>
    </div>

    <MoorhenModalsContainer {...collectedProps}/>

    <MoorhenPreferencesContainer onUserPreferencesChange={onUserPreferencesChange}/>

    <MoorhenSnackBarManager {...collectedProps}/>

    <MoorhenUpdatingMapsManager commandCentre={commandCentre} glRef={glRef}/>

    {/**
    <MoorhenSharedSessionManager
        commandCentre={props.commandCentre}
        glRef={props.glRef}
        monomerLibrary={monomerLibraryPath}
        moleculesRef={moleculesRef}
        mapsRef={mapsRef}
        activeMapRef={activeMapRef}
    />
    */}

    <Container fluid className={`baby-gru ${theme}`}>
        <MoorhenDroppable
                        glRef={glRef}
                        monomerLibraryPath={monomerLibraryPath}
                        timeCapsuleRef={timeCapsuleRef}
                        commandCentre={commandCentre}
                        store={store}
        >
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
                        urlPrefix={urlPrefix}
                        viewOnly={viewOnly}
                        videoRecorderRef={videoRecorderRef}
                    />
                </div>
            </Col>
        </Row>
        </MoorhenDroppable>
    </Container>
    </SnackbarProvider>
}
