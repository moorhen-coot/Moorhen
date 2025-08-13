import { useEffect, useCallback, useRef, useLayoutEffect } from "react"
import { Container, Spinner } from "react-bootstrap"
import { Backdrop } from "@mui/material"
import { useSelector, useDispatch, useStore } from "react-redux"
import type { Store } from "redux"
import { SnackbarProvider } from "notistack"
import { createLocalStorageInstance, parseAtomInfoLabel } from "../utils/utils"
import { isDarkBackground } from "../WebGLgComponents/webGLUtils"
import { moorhen } from "../types/moorhen"
import { webGL } from "../types/mgWebGL"
import {
    setDefaultBackgroundColor,
    setBackgroundColor,
    setHeight,
    setIsDark,
    setWidth,
} from "../store/sceneSettingsSlice"
import { setAllowAddNewFittedLigand, setAllowMergeFittedLigand, setAllowScripting, setDisableFileUpload, setTheme, setViewOnly } from "../store/generalStatesSlice"
import { setEnableAtomHovering, setHoveredAtom } from "../store/hoveringStatesSlice"
import { setRefinementSelection } from "../store/refinementSettingsSlice"
import { MoorhenSnackBarManager } from "../components/snack-bar/MoorhenSnackBarManager"
import { setRequestDrawScene } from "../store/glRefSlice"
import { moorhenGlobalInstance } from "../InstanceManager/MoorhenGlobalInstance"
import { MoorhenWebMG } from "./webMG/MoorhenWebMG"
import { MoorhenNavBar } from "./navbar-menus/MoorhenNavBar"
import { MoorhenModalsContainer } from "./misc/MoorhenModalsContainer"
import { MoorhenPreferencesContainer } from "./managers/preferences/MoorhenPreferencesContainer"
import { MoorhenGoToResidueSnackbar } from "./snack-bar/MoorhenGoToResidueSnackbar"
import { MoorhenRecordingSnackBar } from "./snack-bar/MoorhenRecordingSnackBar"
import { MoorhenResidueSelectionSnackBar } from "./snack-bar/MoorhenResidueSelectionSnackBar"
import { MoorhenAcceptRejectDragAtomsSnackBar } from "./snack-bar/MoorhenAcceptRejectDragAtomsSnackBar"
import { MoorhenAcceptRejectRotateTranslateSnackBar } from "./snack-bar/MoorhenAcceptRejectRotateTranslateSnackBar"
import { MoorhenAcceptRejectMatchingLigandSnackBar } from "./snack-bar/MoorhenAcceptRejectMatchingLigandSnackBar"
import { MoorhenLongJobSnackBar } from "./snack-bar/MoorhenLongJobSnackBar"
import { MoorhenResidueStepsSnackBar } from "./snack-bar/MoorhenResidueStepsSnackBar"
import { MoorhenUpdatingMapsManager, MoorhenUpdatingMapsSnackBar } from "./snack-bar/MoorhenUpdatingMapsSnackBar"
import { MoorhenModelTrajectorySnackBar } from "./snack-bar/MoorhenModelTrajectorySnackBar"
import { MoorhenTomogramSnackBar } from "./snack-bar/MoorhenTomogramSnackBar"
import { MoorhenMapContourLevelSnackBar } from "./snack-bar/MoorhenMapContourLevelSnackBar"
import { MoorhenRotamerChangeSnackBar } from "./snack-bar/MoorhenRotamerChangeSnackbar"
import { MoorhenScreenshotSnackBar } from "./snack-bar/MoorhenScreenshotSnackBar"
import { MoorhenSideBar } from "./snack-bar/MoorhenSideBar"
import { MoorhenAtomInfoSnackBar } from "./snack-bar/MoorhenAtomInfoSnackBar"
import { MoorhenDroppable } from "./MoorhenDroppable"
import { MoorhenMapsHeadManager } from "./managers/maps/MoorhenMapsHeadManager"
import type { ExtraNavBarMenus, ExtraNavBarModals } from "./navbar-menus/MoorhenNavBar"

declare module "notistack" {
    interface VariantOverrides {
        goToResidue
        screenRecorder: {
            videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>
        }
        residueSelection: true
        acceptRejectDraggingAtoms: {
            moleculeRef: React.RefObject<moorhen.Molecule>
            cidRef: React.RefObject<string[]>
        }
        atomInformation: {
            moleculeRef: moorhen.Molecule
            cidRef: string
        }
        acceptRejectRotateTranslateAtoms: {
            moleculeRef: React.RefObject<moorhen.Molecule>
            cidRef: React.RefObject<string>
        }
        acceptRejectMatchingLigand: {
            refMolNo: number
            movingMolNo: number
            refLigandCid: string
            movingLigandCid: string
        }
        longJobNotification: true
        residueSteps: {
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>
            residueList: { cid: string }[]
            onStep: (stepInput) => Promise<void>
            onStart?: () => Promise<void> | void
            onStop?: () => void
            onPause?: () => void
            onResume?: () => void
            onProgress?: (progress: number) => void
            disableTimeCapsule?: boolean
            sleepTime?: number
        }
        updatingMaps
        modelTrajectory: {
            moleculeMolNo: number
            representationStyle: string
        }
        tomogram: {
            mapMolNo: number
        }
        mapContourLevel: {
            mapMolNo: number
            mapPrecision: number
        }
        rotamerChange: {
            moleculeMolNo: number
            chosenAtom: moorhen.ResidueSpec
        }
        screenshot: {
            videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>
        }
        sideBar: {
            children: React.JSX.Element
            modalId: string
            title: string | React.JSX.Element
        }
    }
}

interface ContainerRefs {
    glRef?: React.RefObject<null | webGL.MGWebGL>
    timeCapsuleRef?: React.RefObject<null | moorhen.TimeCapsule>
    commandCentre?: React.RefObject<moorhen.CommandCentre>
    videoRecorderRef?: React.RefObject<null | moorhen.ScreenRecorder>
    moleculesRef?: React.RefObject<null | moorhen.Molecule[]>
    mapsRef?: React.RefObject<null | moorhen.Map[]>
    activeMapRef?: React.RefObject<moorhen.Map>
    lastHoveredAtomRef?: React.RefObject<null | moorhen.HoveredAtom>
}

interface ContainerOptionalProps {
    onUserPreferencesChange: (key: string, value: unknown) => void
    disableFileUploads: boolean
    urlPrefix: string
    extraNavBarMenus: ExtraNavBarMenus[]
    extraNavBarModals: ExtraNavBarModals[]
    viewOnly: boolean
    extraDraggableModals: React.JSX.Element[]
    monomerLibraryPath: string
    setMoorhenDimensions?: null | (() => [number, number])
    extraFileMenuItems: React.JSX.Element[]
    allowScripting: boolean
    backupStorageInstance?: moorhen.LocalStorageInstance
    extraEditMenuItems: React.JSX.Element[]
    extraCalculateMenuItems: React.JSX.Element[]
    aceDRGInstance: moorhen.AceDRGInstance | null
    includeNavBarMenuNames: string[]
    store: Store
    allowAddNewFittedLigand: boolean
    allowMergeFittedLigand: boolean
}

interface ContainerProps extends Partial<ContainerRefs>, Partial<ContainerOptionalProps> {}

export const MoorhenContainer = (props: ContainerProps) => {
    const {
        urlPrefix = "/baby-gru",
        monomerLibraryPath = "./baby-gru/monomers",
        setMoorhenDimensions = null,     
        includeNavBarMenuNames = [],
        extraNavBarModals = [],
        extraNavBarMenus = [],
        disableFileUploads= false,
        extraFileMenuItems= [],
        extraEditMenuItems= [],
        extraCalculateMenuItems= [],
        allowScripting= true,
        allowAddNewFittedLigand= false,
        allowMergeFittedLigand= true,
        extraDraggableModals = [],
        viewOnly = false,
        backupStorageInstance = createLocalStorageInstance("Moorhen-TimeCapsule"),
        aceDRGInstance = null,
    } = props

    const innerGlRef = useRef<null | webGL.MGWebGL>(null)
    const glRef = props.glRef ? props.glRef : innerGlRef
    const innerMoleculesRef = useRef<null | moorhen.Molecule[]>(null)
    const moleculesRef = props.moleculesRef ? props.moleculesRef : innerMoleculesRef
    const innerMapsRef = useRef<null | moorhen.Map[]>(null)
    const mapsRef = props.mapsRef ? props.mapsRef : innerMapsRef
    const innerActiveMapRef = useRef<null | moorhen.Map>(null)
    const activeMapRef = props.activeMapRef ? props.activeMapRef : innerActiveMapRef
    const innerLastHoveredAtomRef = useRef<null | moorhen.HoveredAtom>(null)
    const lastHoveredAtomRef = props.lastHoveredAtomRef ? props.lastHoveredAtomRef : innerLastHoveredAtomRef

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
    const defaultMapSamplingRate = useSelector(
        (state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate
    )
    const defaultBackgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.defaultBackgroundColor)
    const makeBackups = useSelector((state: moorhen.State) => state.backupSettings.makeBackups)
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount)
    const modificationCountBackupThreshold = useSelector(
        (state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold
    )
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const globalInstanceIsReady = useSelector((state: moorhen.State) => state.globalUI.globalInstanceIsReady)

    //const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi); // unused selector

    const dispatch = useDispatch()
    const store = useStore()

    const commandCentre = moorhenGlobalInstance.getCommandCentreRef()
    const timeCapsuleRef = moorhenGlobalInstance.getTimeCapsuleRef()

    const onUserPreferencesChange = useCallback(
        (key: string, value: unknown) => {
            props.onUserPreferencesChange?.(key, value)
        },
        [props.onUserPreferencesChange]
    )

    const onAtomHovered = useCallback(
        (identifier: { buffer: { id: string }; atom: moorhen.AtomInfo }) => {
            if (identifier == null) {
                if (lastHoveredAtomRef.current !== null && lastHoveredAtomRef.current.molecule !== null) {
                    dispatch(setHoveredAtom({ molecule: null, cid: null }))
                }
            } else {
                molecules.forEach((molecule) => {
                    if (molecule.buffersInclude(identifier.buffer)) {
                        const newCid = parseAtomInfoLabel(identifier.atom)
                        if (molecule !== hoveredAtom.molecule || newCid !== hoveredAtom.cid) {
                            dispatch(setHoveredAtom({ molecule: molecule, cid: newCid }))
                        }
                    }
                })
            }
        },
        [molecules]
    )

    const setWindowDimensions = useCallback(() => {
        let [newWidth, newHeight]: [number, number] = [window.innerWidth, window.innerHeight]
        if (setMoorhenDimensions) {
            ;[newWidth, newHeight] = setMoorhenDimensions()
        }
        if (width !== newWidth) {
            dispatch(setWidth(newWidth))
        }
        if (height !== newHeight) {
            dispatch(setHeight(newHeight))
        }
    }, [width, height])

    // Style append to header at initialization
    useLayoutEffect(() => {
        const head = document.head
        const style: HTMLLinkElement = document.createElement("link")
        style.href = `${urlPrefix}/moorhen.css`
        style.rel = "stylesheet"
        style.type = "text/css"
        head.appendChild(style)
    }, [])

    useEffect(() => {
        window.addEventListener("resize", setWindowDimensions)
        return () => {
            window.removeEventListener("resize", setWindowDimensions)
        }
    }, [])


    useLayoutEffect(() => {
        const head = document.head
        const style: HTMLLinkElement = document.createElement("link")

        if (isDark) {
            style.href = `${urlPrefix}/darkly.css`
            document.body.setAttribute("data-theme", "dark")
        } else {
            style.href = `${urlPrefix}/flatly.css`
            document.body.setAttribute("data-theme", "light")
        }

        style.rel = "stylesheet"
        // style.async = true;
        style.type = "text/css"

        head.appendChild(style)
        return () => {
            head.removeChild(style)
        }
    }, [isDark])

    useEffect(() => {
        const _isDark = isDarkBackground(...backgroundColor)

        if (defaultBackgroundColor !== backgroundColor) {
            dispatch(setDefaultBackgroundColor(backgroundColor))
        }
        if (isDark !== _isDark) {
            dispatch(setIsDark(_isDark))
            dispatch(setTheme(_isDark ? "darkly" : "flatly"))
        }
    }, [backgroundColor])

    /* Coot Setups */

    async function setMakeBackupsAPI() {
        if (commandCentre.current === null || !cootInitialized) {
            return
        }
        await commandCentre.current.cootCommand(
            {
                command: "set_make_backups",
                commandArgs: [makeBackups],
                returnType: "status",
            },
            false
        )
    }

    const setSamplingRate = async () => {
        if (commandCentre.current === null || !cootInitialized) {
            return
        }
        await commandCentre.current.cootCommand(
            {
                command: "set_map_sampling_rate",
                commandArgs: [defaultMapSamplingRate],
                returnType: "status",
                },
                false
            )
        }

    async function setDrawMissingLoopAPI() {
        if (commandCentre.current === null || !cootInitialized) {
            return
        }
        await commandCentre.current.cootCommand(
            {
                command: "set_draw_missing_residue_loops",
                commandArgs: [drawMissingLoops],
                returnType: "status",
            },
            false
        )
    }

    useEffect(() => {
        if (commandCentre.current && makeBackups !== null && cootInitialized) {
            setMakeBackupsAPI()
        }
    }, [makeBackups])

    useEffect(() => {
        if (drawMissingLoops !== null && cootInitialized) {
            setDrawMissingLoopAPI()
        }
    }, [drawMissingLoops])

    useEffect(() => {
        function startupEffect() {
            setWindowDimensions()
            dispatch(setViewOnly(viewOnly))
            dispatch(setDisableFileUpload(disableFileUploads))
            dispatch(setAllowScripting(allowScripting))
            dispatch(setAllowAddNewFittedLigand(allowAddNewFittedLigand))
            dispatch(setAllowMergeFittedLigand(allowMergeFittedLigand))

            if (!userPreferencesMounted) {
                return
            }

            moorhenGlobalInstance.paths.urlPrefix = urlPrefix
            moorhenGlobalInstance.paths.monomerLibrary = monomerLibraryPath
            moorhenGlobalInstance.startInstance(
                dispatch,
                store,
                props.commandCentre ? props.commandCentre.current : null,
                props.timeCapsuleRef ? props.timeCapsuleRef.current : null,
                {
                    activeMapRef: activeMapRef,
                    providedBackupStorageInstance: backupStorageInstance,
                    maxBackupCount: maxBackupCount,
                    modificationCountBackupThreshold: modificationCountBackupThreshold,
                    moleculesRef: moleculesRef,
                    mapsRef: mapsRef,
                }
            )

            if (aceDRGInstance) {
                moorhenGlobalInstance.setAceDRGInstance(aceDRGInstance)
            }
            dispatch(setBackgroundColor(defaultBackgroundColor))
            setSamplingRate()
            setDrawMissingLoopAPI()
            
        }
        startupEffect()
    },
        [userPreferencesMounted]
    )

    useEffect(() => {
        const checkMoleculeSizes = async () => {
            const moleculeAtomCounts = await Promise.all(
                molecules.filter((molecule) => !molecule.atomCount).map((molecule) => molecule.getNumberOfAtoms())
            )
            const totalAtomCount = moleculeAtomCounts.reduce(
                (partialAtomCount, atomCount) => partialAtomCount + atomCount,
                0
            )
            if (totalAtomCount >= 80000) {
                dispatch(setEnableAtomHovering(false))
            }
        }
        checkMoleculeSizes()
    }, [molecules])

    useEffect(() => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (
                lastHoveredAtomRef.current == null ||
                hoveredAtom.molecule !== lastHoveredAtomRef.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtomRef.current.cid
            ) {
                hoveredAtom.molecule.drawHover(hoveredAtom.cid)
                //if we have changed molecule, might have to clean up hover display item of previous molecule
            }
        }

        if (
            lastHoveredAtomRef.current !== null &&
            lastHoveredAtomRef.current.molecule !== null &&
            lastHoveredAtomRef.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtomRef.current.molecule.clearBuffersOfStyle("hover")
        }
        // eslint-disable-next-line
        lastHoveredAtomRef.current = hoveredAtom
    }, [hoveredAtom])

    useEffect(() => {
        dispatch(setRequestDrawScene(true))
    }, [width, height])

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            activeMap.setActive()
            if (activeMap.isEM) {
                dispatch(setRefinementSelection("SPHERE"))
            } else {
                dispatch(setRefinementSelection("TRIPLE"))
            }
        }
    }, [activeMap])

    if (!globalInstanceIsReady) {
        return (
            <Backdrop sx={{ color: "#fff", zIndex: (_theme) => _theme.zIndex.drawer + 1 }} open={true}>
                <Spinner animation="border" style={{ marginRight: "0.5rem" }} />
                <span>Starting moorhen...</span>
                <MoorhenPreferencesContainer />
            </Backdrop>
        )
    }

    return (
        <SnackbarProvider
            hideIconVariant={false}
            autoHideDuration={4000}
            maxSnack={20}
            anchorOrigin={{ horizontal: "center", vertical: "top" }}
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
            preventDuplicate={true}
        >
            <div>
                <MoorhenNavBar
                    extraNavBarMenus={extraNavBarMenus}
                    extraNavBarModals={extraNavBarModals}
                    extraFileMenuItems= {extraFileMenuItems}
                    extraEditMenuItems= {extraEditMenuItems}
                    extraCalculateMenuItems= {extraCalculateMenuItems}
                    includeNavBarMenuNames={includeNavBarMenuNames}
                />
            </div>

            <MoorhenModalsContainer extraDraggableModals={extraDraggableModals} />
            <MoorhenPreferencesContainer onUserPreferencesChange={onUserPreferencesChange} />
            <MoorhenSnackBarManager />
            <MoorhenUpdatingMapsManager/>
            <MoorhenMapsHeadManager />

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
                    monomerLibraryPath={monomerLibraryPath}
                    timeCapsuleRef={timeCapsuleRef}
                    commandCentre={commandCentre}
                >
                    <div
                        id="moorhen-canvas-background"
                        style={{
                            backgroundColor: `rgba(
                            ${255 * backgroundColor[0]},
                            ${255 * backgroundColor[1]},
                            ${255 * backgroundColor[2]},
                            ${backgroundColor[3]})`,
                            cursor: cursorStyle,
                            margin: 0,
                            padding: 0,
                            height: Math.floor(height),
                        }}
                    >
                        <MoorhenWebMG
                            ref={glRef}
                            monomerLibraryPath={monomerLibraryPath}
                            timeCapsuleRef={timeCapsuleRef}
                            commandCentre={commandCentre}
                            onAtomHovered={onAtomHovered}
                            urlPrefix={urlPrefix}
                            viewOnly={viewOnly}
                        />
                    </div>
                </MoorhenDroppable>
            </Container>
        </SnackbarProvider>
    )
}
