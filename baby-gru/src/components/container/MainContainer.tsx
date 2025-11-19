import { Backdrop } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { SnackbarProvider } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { Store } from "redux";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MoorhenInstance, MoorhenInstanceProvider, useCommandAndCapsule, useMoorhenInstance } from "../../InstanceManager";
import { CommandCentre } from "../../InstanceManager/CommandCentre";
import { isDarkBackground } from "../../WebGLgComponents/webGLUtils";
import { useWindowEventListener } from "../../hooks/useWindowEventListener";
import { RootState } from "../../store/MoorhenReduxStore";
import {
    setAllowAddNewFittedLigand,
    setAllowMergeFittedLigand,
    setAllowScripting,
    setDisableFileUpload,
    setTheme,
    setViewOnly,
} from "../../store/generalStatesSlice";
import { setRequestDrawScene } from "../../store/glRefSlice";
import { setEnableAtomHovering, setHoveredAtom } from "../../store/hoveringStatesSlice";
import { addAvailableFontList, emptyAvailableFonts } from "../../store/labelSettingsSlice";
import { setRefinementSelection } from "../../store/refinementSettingsSlice";
import {
    setBackgroundColor,
    setDefaultBackgroundColor,
    setGlViewportHeight,
    setGlViewportWidth,
    setHeight,
    setIsDark,
    setWidth,
} from "../../store/sceneSettingsSlice";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { allFontsSet } from "../../utils/enums";
import { parseAtomInfoLabel } from "../../utils/utils";
import { MoorhenMapsHeadManager } from "../managers/maps/MoorhenMapsHeadManager";
import { MoorhenPreferencesContainer } from "../managers/preferences/MoorhenPreferencesContainer";
import { MoorhenMainMenu } from "../menu-system/MainMenu";
import { MoorhenMenuSystem } from "../menu-system/MenuSystem";
import { MoorhenMenuSystemProvider, useMoorhenMenuSystem } from "../menu-system/MenuSystemContext";
import { MoorhenSearchBar } from "../menu-system/SearchBar";
import { BottomPanelContainer } from "../panels/BottomPanel";
import { MoorhenSidePanel } from "../panels/SidePanel";
import { MoorhenAcceptRejectDragAtomsSnackBar } from "../snack-bar/MoorhenAcceptRejectDragAtomsSnackBar";
import { MoorhenAcceptRejectMatchingLigandSnackBar } from "../snack-bar/MoorhenAcceptRejectMatchingLigandSnackBar";
import { MoorhenAcceptRejectRotateTranslateSnackBar } from "../snack-bar/MoorhenAcceptRejectRotateTranslateSnackBar";
import { MoorhenAtomInfoSnackBar } from "../snack-bar/MoorhenAtomInfoSnackBar";
import { MoorhenGoToResidueSnackbar } from "../snack-bar/MoorhenGoToResidueSnackbar";
import { MoorhenLongJobSnackBar } from "../snack-bar/MoorhenLongJobSnackBar";
import { MoorhenMapContourLevelSnackBar } from "../snack-bar/MoorhenMapContourLevelSnackBar";
import { MoorhenModelTrajectorySnackBar } from "../snack-bar/MoorhenModelTrajectorySnackBar";
import { MoorhenRecordingSnackBar } from "../snack-bar/MoorhenRecordingSnackBar";
import { MoorhenResidueSelectionSnackBar } from "../snack-bar/MoorhenResidueSelectionSnackBar";
import { MoorhenResidueStepsSnackBar } from "../snack-bar/MoorhenResidueStepsSnackBar";
import { MoorhenRotamerChangeSnackBar } from "../snack-bar/MoorhenRotamerChangeSnackbar";
import { MoorhenScreenshotSnackBar } from "../snack-bar/MoorhenScreenshotSnackBar";
import { MoorhenSideBar } from "../snack-bar/MoorhenSideBar";
import { MoorhenSnackBarManager } from "../snack-bar/MoorhenSnackBarManager";
import { MoorhenTomogramSnackBar } from "../snack-bar/MoorhenTomogramSnackBar";
import { MoorhenUpdatingMapsManager, MoorhenUpdatingMapsSnackBar } from "../snack-bar/MoorhenUpdatingMapsSnackBar";
import { MoorhenWebMG } from "../webMG/MoorhenWebMG";
import { ActivityIndicator } from "./ActivityIndicator";
import { cootAPIHelpers } from "./ContainerHelpers";
import { MoorhenModalsContainer } from "./ModalsContainer";
import { MoorhenDroppable } from "./MoorhenDroppable";
import { windowCootCCP4Loader } from "./windowCootCCP4Loader";

declare module "notistack" {
    interface VariantOverrides {
        goToResidue;
        screenRecorder: {
            videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
        };
        residueSelection: true;
        acceptRejectDraggingAtoms: {
            moleculeRef: React.RefObject<moorhen.Molecule>;
            cidRef: React.RefObject<string[]>;
        };
        atomInformation: {
            moleculeRef: moorhen.Molecule;
            cidRef: string;
        };
        acceptRejectRotateTranslateAtoms: {
            moleculeRef: React.RefObject<moorhen.Molecule>;
            cidRef: React.RefObject<string>;
        };
        acceptRejectMatchingLigand: {
            refMolNo: number;
            movingMolNo: number;
            refLigandCid: string;
            movingLigandCid: string;
        };
        longJobNotification: true;
        residueSteps: {
            timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
            residueList: { cid: string }[];
            onStep: (stepInput) => Promise<void>;
            onStart?: () => Promise<void> | void;
            onStop?: () => void;
            onPause?: () => void;
            onResume?: () => void;
            onProgress?: (progress: number) => void;
            disableTimeCapsule?: boolean;
            sleepTime?: number;
        };
        updatingMaps;
        modelTrajectory: {
            moleculeMolNo: number;
            representationStyle: string;
        };
        tomogram: {
            mapMolNo: number;
        };
        mapContourLevel: {
            mapMolNo: number;
            mapPrecision: number;
        };
        rotamerChange: {
            moleculeMolNo: number;
            chosenAtom: moorhen.ResidueSpec;
        };
        screenshot: {
            videoRecorderRef: React.RefObject<moorhen.ScreenRecorder>;
        };
        sideBar: {
            children: React.JSX.Element;
            modalId: string;
            title: string | React.JSX.Element;
        };
    }
}

interface ContainerRefs {
    glRef?: React.RefObject<null | webGL.MGWebGL>;
    timeCapsuleRef?: React.RefObject<null | moorhen.TimeCapsule>;
    commandCentre?: React.RefObject<null | CommandCentre>;
    videoRecorderRef?: React.RefObject<null | moorhen.ScreenRecorder>;
    moleculesRef?: React.RefObject<null | moorhen.Molecule[]>;
    mapsRef?: React.RefObject<null | moorhen.Map[]>;
    activeMapRef?: React.RefObject<moorhen.Map>;
    lastHoveredAtomRef?: React.RefObject<null | moorhen.HoveredAtom>;
    moorhenInstanceRef?: React.RefObject<null | MoorhenInstance>;
    moorhenMenuSystemRef?: React.RefObject<null | MoorhenMenuSystem>;
}

interface ContainerOptionalProps {
    onUserPreferencesChange?: (key: string, value: unknown) => void;
    disableFileUploads?: boolean;
    urlPrefix?: string;
    viewOnly: boolean;
    extraDraggableModals?: React.JSX.Element[];
    monomerLibraryPath?: string;
    setMoorhenDimensions?: null | (() => [number, number]);
    extraFileMenuItems?: React.JSX.Element[];
    allowScripting?: boolean;
    backupStorageInstance?: moorhen.LocalStorageInstance;
    aceDRGInstance?: moorhen.AceDRGInstance | null;
    includeNavBarMenuNames?: string[];
    store?: Store;
    allowAddNewFittedLigand?: boolean;
    allowMergeFittedLigand?: boolean;
}

export interface ContainerProps extends Partial<ContainerRefs>, Partial<ContainerOptionalProps> {}

const MoorhenContainer = (props: ContainerProps) => {
    const {
        urlPrefix = "/baby-gru",
        monomerLibraryPath = "./baby-gru/monomers",
        setMoorhenDimensions = null,
        disableFileUploads = false,
        allowScripting = true,
        allowAddNewFittedLigand = false,
        allowMergeFittedLigand = true,
        viewOnly = false,
        aceDRGInstance = null,
    } = props;

    const innerGlRef = useRef<null | webGL.MGWebGL>(null);
    const glRef = props.glRef ? props.glRef : innerGlRef;
    const innerLastHoveredAtomRef = useRef<null | moorhen.HoveredAtom>(null);
    const lastHoveredAtomRef = props.lastHoveredAtomRef ? props.lastHoveredAtomRef : innerLastHoveredAtomRef;

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom);
    const cursorStyle = useSelector((state: moorhen.State) => state.hoveringStates.cursorStyle);

    const cootInitialized = useSelector((state: moorhen.State) => state.generalStates.cootInitialized);
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const isGlobalInstanceReady = useSelector((state: moorhen.State) => state.globalUI.isGlobalInstanceReady);

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const GlViewportHeight = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportHeight);
    const GlViewportWidth = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportWidth);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops);
    const defaultBackgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.defaultBackgroundColor);

    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate);

    const makeBackups = useSelector((state: moorhen.State) => state.backupSettings.makeBackups);
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount);
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold);

    const sidePanelIsShown = useSelector((state: RootState) => state.globalUI.sidePanelIsShown);
    const bottomPanelIsShown = useSelector((state: RootState) => state.globalUI.bottomPanelIsShown);

    const containerRef = useRef<HTMLDivElement>(null);

    if (props.moleculesRef) {
        // eslint-disable-next-line
        props.moleculesRef.current = molecules;
    }

    const timeCapsuleMapRef = useRef<moorhen.Map[]>(maps);
    const timeCapsuleMoleculeRef = useRef<moorhen.Molecule[]>(molecules);

    timeCapsuleMapRef.current = maps;
    timeCapsuleMoleculeRef.current = molecules;

    const dispatch = useDispatch();
    const store: Store = useStore();
    const moorhenInstance = useMoorhenInstance();
    const moorhenMenuSystem = useMoorhenMenuSystem();

    useEffect(() => {
        if (props.moorhenInstanceRef) {
            props.moorhenInstanceRef.current = moorhenInstance;
        }
        if (props.moorhenMenuSystemRef) {
            props.moorhenMenuSystemRef.current = moorhenMenuSystem;
        }
    }, [props.moorhenInstanceRef, props.moorhenMenuSystemRef]);

    const { commandCentre, timeCapsuleRef } = useCommandAndCapsule();

    const onUserPreferencesChange = useCallback(
        (key: string, value: unknown) => {
            props.onUserPreferencesChange?.(key, value);
        },
        [props.onUserPreferencesChange]
    );

    const onAtomHovered = useCallback(
        (identifier: { buffer: { id: string }; atom: moorhen.AtomInfo }) => {
            if (identifier == null) {
                if (lastHoveredAtomRef.current !== null && lastHoveredAtomRef.current.molecule !== null) {
                    dispatch(setHoveredAtom({ molecule: null, cid: null }));
                }
            } else {
                molecules.forEach(molecule => {
                    if (molecule.buffersInclude(identifier.buffer)) {
                        const newCid = parseAtomInfoLabel(identifier.atom);
                        if (molecule !== hoveredAtom.molecule || newCid !== hoveredAtom.cid) {
                            dispatch(setHoveredAtom({ molecule: molecule, cid: newCid }));
                        }
                    }
                });
            }
        },
        [molecules]
    );

    const setWindowDimensions = useCallback(() => {
        let [newWidth, newHeight]: [number, number] = [window.innerWidth, window.innerHeight];
        if (setMoorhenDimensions) {
            [newWidth, newHeight] = setMoorhenDimensions();
        }
        const GLviewWidth = newWidth - (sidePanelIsShown ? 300 : 0);
        const GLviewHeigth = newHeight - (bottomPanelIsShown ? 75 : 0);
        dispatch(setWidth(newWidth));
        dispatch(setGlViewportWidth(GLviewWidth));
        dispatch(setHeight(newHeight));
        dispatch(setGlViewportHeight(GLviewHeigth));
    }, [sidePanelIsShown, bottomPanelIsShown]);

    useLayoutEffect(() => {
        setWindowDimensions();
    }, [setWindowDimensions]);

    useWindowEventListener("resize", setWindowDimensions);

    // Style append to header at initialization
    useLayoutEffect(() => {
        const head = document.head;
        const style: HTMLLinkElement = document.createElement("link");
        style.href = `${urlPrefix}/moorhen.css`;
        style.rel = "stylesheet";
        style.type = "text/css";
        head.appendChild(style);
    }, []);

    useLayoutEffect(() => {
        const head = document.head;
        const style: HTMLLinkElement = document.createElement("link");

        if (isDark) {
            style.href = `${urlPrefix}/darkly.css`;
        } else {
            style.href = `${urlPrefix}/flatly.css`;
        }

        style.rel = "stylesheet";
        // style.async = true;
        style.type = "text/css";

        head.appendChild(style);
        return () => {
            head.removeChild(style);
        };
    }, [isDark, isGlobalInstanceReady]);

    useEffect(() => {
        const _isDark = isDarkBackground(...backgroundColor);

        if (defaultBackgroundColor !== backgroundColor) {
            dispatch(setDefaultBackgroundColor(backgroundColor));
        }
        if (isDark !== _isDark) {
            dispatch(setIsDark(_isDark));
            dispatch(setTheme(_isDark ? "darkly" : "flatly"));
        }
    }, [backgroundColor]);

    useEffect(() => {
        if (commandCentre.current && makeBackups !== null && cootInitialized) {
            cootAPIHelpers.setMakeBackups(commandCentre, makeBackups);
        }
    }, [makeBackups]);

    useEffect(() => {
        if (drawMissingLoops !== null && cootInitialized) {
            cootAPIHelpers.setDrawMissingLoops(commandCentre, drawMissingLoops);
        }
    }, [drawMissingLoops]);

    useEffect(() => {
        function startupEffect() {
            if (!window.cootModule) windowCootCCP4Loader(".");
            setWindowDimensions();
            dispatch(setViewOnly(viewOnly));
            dispatch(setDisableFileUpload(disableFileUploads));
            dispatch(setAllowScripting(allowScripting));
            dispatch(setAllowAddNewFittedLigand(allowAddNewFittedLigand));
            dispatch(setAllowMergeFittedLigand(allowMergeFittedLigand));

            if (!userPreferencesMounted) {
                return;
            }

            //moorhenInstance.setMoleculesAndMapsRefs(timeCapsuleMoleculeRef, timeCapsuleMapRef);
            moorhenInstance.setPaths(urlPrefix, monomerLibraryPath);
            moorhenInstance.startInstance(
                dispatch,
                timeCapsuleMoleculeRef,
                timeCapsuleMapRef,
                store,
                props.commandCentre,
                props.timeCapsuleRef,
                {
                    providedBackupStorageInstance: props.backupStorageInstance,
                    maxBackupCount: maxBackupCount,
                    modificationCountBackupThreshold: modificationCountBackupThreshold,
                }
            );

            if (aceDRGInstance) {
                moorhenInstance.setAceDRGInstance(aceDRGInstance);
            }

            dispatch(setBackgroundColor(defaultBackgroundColor));
            cootAPIHelpers.setSamplingRate(commandCentre, defaultMapSamplingRate);
            cootAPIHelpers.setDrawMissingLoops(commandCentre, drawMissingLoops);
        }
        startupEffect();
    }, [userPreferencesMounted]);

    useEffect(() => {
        const checkMoleculeSizes = async () => {
            const moleculeAtomCounts = await Promise.all(
                molecules.filter(molecule => !molecule.atomCount).map(molecule => molecule.getNumberOfAtoms())
            );
            const totalAtomCount = moleculeAtomCounts.reduce((partialAtomCount, atomCount) => partialAtomCount + atomCount, 0);
            if (totalAtomCount >= 80000) {
                dispatch(setEnableAtomHovering(false));
            }
        };
        checkMoleculeSizes();
    }, [molecules]);

    useEffect(() => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (
                lastHoveredAtomRef.current == null ||
                hoveredAtom.molecule !== lastHoveredAtomRef.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtomRef.current.cid
            ) {
                hoveredAtom.molecule.drawHover(hoveredAtom.cid);
                //if we have changed molecule, might have to clean up hover display item of previous molecule
            }
        }

        if (
            lastHoveredAtomRef.current !== null &&
            lastHoveredAtomRef.current.molecule !== null &&
            lastHoveredAtomRef.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtomRef.current.molecule.clearBuffersOfStyle("hover");
        }
        lastHoveredAtomRef.current = hoveredAtom;
    }, [hoveredAtom]);

    useEffect(() => {
        dispatch(setRequestDrawScene(true));
    }, [width, height]);

    useEffect(() => {
        if (activeMap && commandCentre.current) {
            activeMap.setActive();
            if (activeMap.isEM) {
                dispatch(setRefinementSelection("SPHERE"));
            } else {
                dispatch(setRefinementSelection("TRIPLE"));
            }
        }
    }, [activeMap]);

    useEffect(() => {
        const fetchAvailableFonts = async () => {
            await document.fonts.ready;
            dispatch(emptyAvailableFonts());
            const fontAvailable: string[] = [];
            allFontsSet.forEach((font: string) => {
                if (document.fonts.check(`12px "${font}"`)) {
                    fontAvailable.push(font);
                }
            });
            dispatch(addAvailableFontList(fontAvailable));
        };
        fetchAvailableFonts();
    }, []);

    const backgroundStyle = useMemo(
        () => ({
            backgroundColor: `rgba(
            ${255 * backgroundColor[0]},
            ${255 * backgroundColor[1]},
            ${255 * backgroundColor[2]},
            ${backgroundColor[3]})`,
            cursor: cursorStyle,
            margin: 0,
            padding: 0,
            height: height,
            width: width,
        }),
        [backgroundColor, cursorStyle, height, width, isDark]
    );
    const viewportStyle = useMemo(
        () => ({
            height: Math.floor(GlViewportHeight),
            width: Math.floor(GlViewportWidth),
        }),
        [GlViewportHeight, GlViewportWidth]
    );

    const snackbarComponents = {
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
    };

    // ========== Loading Screen ==========
    if (!isGlobalInstanceReady) {
        return (
            <Backdrop sx={theme => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })} open={true}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
                    <div>Moorhen is loading...</div>
                    <CircularProgress color="inherit" />
                </div>
                <MoorhenPreferencesContainer />
            </Backdrop>
        );
    }

    // ========== Main Interface ==========
    return (
        <>
            <div style={backgroundStyle} className="moorhen__inner-container" ref={containerRef} data-theme={isDark ? "dark" : "light"}>
                <SnackbarProvider
                    hideIconVariant={false}
                    autoHideDuration={4000}
                    maxSnack={20}
                    anchorOrigin={{ horizontal: "center", vertical: "top" }}
                    transitionDuration={{ enter: 500, exit: 300 }}
                    Components={snackbarComponents}
                    preventDuplicate={true}
                >
                    <MoorhenMainMenu />

                    <div style={viewportStyle} className="moorhen__viewport-container">
                        <ActivityIndicator />
                        <MoorhenModalsContainer extraDraggableModals={props.extraDraggableModals} />
                        <MoorhenPreferencesContainer onUserPreferencesChange={onUserPreferencesChange} />
                        <MoorhenSnackBarManager />
                        <MoorhenUpdatingMapsManager />
                        <MoorhenMapsHeadManager />

                        <MoorhenDroppable
                            monomerLibraryPath={monomerLibraryPath}
                            timeCapsuleRef={timeCapsuleRef}
                            commandCentre={commandCentre}
                        >
                            <MoorhenWebMG
                                ref={glRef}
                                monomerLibraryPath={monomerLibraryPath}
                                timeCapsuleRef={timeCapsuleRef}
                                onAtomHovered={onAtomHovered}
                                urlPrefix={urlPrefix}
                                viewOnly={viewOnly}
                            />
                        </MoorhenDroppable>
                    </div>
                    <BottomPanelContainer />
                    <MoorhenSidePanel width={300} />
                </SnackbarProvider>
            </div>
        </>
    );
};

const MoorhenContainerWrapper = (props: ContainerProps) => {
    return (
        <MoorhenInstanceProvider>
            <MoorhenMenuSystemProvider>
                <MoorhenContainer {...props} />
            </MoorhenMenuSystemProvider>
        </MoorhenInstanceProvider>
    );
};
export { MoorhenContainerWrapper as MoorhenContainer };
