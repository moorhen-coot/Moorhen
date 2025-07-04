import { useEffect, useMemo, useRef } from "react";
import { MoorhenPreferences } from "../../utils/MoorhenPreferences";
import { setDefaultMapLitLines, setDefaultMapSamplingRate, setDefaultMapSurface, setMapLineWidth, setReContourMapOnlyOnMouseUp } from "../../store/mapContourSettingsSlice";
import { useSelector, useDispatch } from "react-redux"
import { setContourWheelSensitivityFactor, setMouseSensitivity, setZoomWheelSensitivityFactor } from "../../store/mouseSettings";
import { setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, setModificationCountBackupThreshold } from "../../store/backupSettingsSlice";
import { overwriteMapUpdatingScores, setShowScoresToast } from "../../store/moleculeMapUpdateSlice";
import { setShortCuts, setShortcutOnHoveredAtom, setShowShortcutToast } from "../../store/shortCutsSlice";
import { setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize } from "../../store/labelSettingsSlice";
import {
    setClipCap, setDefaultBackgroundColor, setDefaultBondSmoothness, setDepthBlurDepth, setDepthBlurRadius, setDoOutline,
    setDoPerspectiveProjection, setDoSSAO, setDoShadow, setDoShadowDepthDebug, setDrawAxes, setDrawCrosshairs, setUseOffScreenBuffers,
    setDrawFPS, setDrawMissingLoops, setResetClippingFogging, setSsaoBias, setSsaoRadius, setEdgeDetectNormalScale,
    setDrawScaleBar, setDoEdgeDetect, setEdgeDetectDepthThreshold, setEdgeDetectNormalThreshold, setEdgeDetectDepthScale,
    setDrawEnvBOcc
} from "../../store/sceneSettingsSlice";
import { setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut } from "../../store/generalStatesSlice";
import { setAnimateRefine, setEnableRefineAfterMod } from '../../store/refinementSettingsSlice';
import { setDevMode, setUserPreferencesMounted, setUseGemmi } from "../../store/generalStatesSlice";
import { moorhen } from "../../types/moorhen"

export const MoorhenPreferencesContainer = (props: {
    onUserPreferencesChange?: (key: string, value: any) => void;
}) => {

    const localForageInstanceRef = useRef<null | moorhen.Preferences>(null)
    const dispatch = useDispatch()

    // Some important general app states
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi)

    // Map settings
    const defaultMapLitLines = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapLitLines)
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSamplingRate)
    const mapLineWidth = useSelector((state: moorhen.State) => state.mapContourSettings.mapLineWidth)
    const defaultMapSurface = useSelector((state: moorhen.State) => state.mapContourSettings.defaultMapSurface)
    const reContourMapOnlyOnMouseUp = useSelector((state: moorhen.State) => state.mapContourSettings.reContourMapOnlyOnMouseUp)

    // Backup settings
    const enableTimeCapsule = useSelector((state: moorhen.State) => state.backupSettings.enableTimeCapsule)
    const makeBackups = useSelector((state: moorhen.State) => state.backupSettings.makeBackups)
    const maxBackupCount = useSelector((state: moorhen.State) => state.backupSettings.maxBackupCount)
    const modificationCountBackupThreshold = useSelector((state: moorhen.State) => state.backupSettings.modificationCountBackupThreshold)

    // Shortcut settings
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts)
    const showShortcutToast = useSelector((state: moorhen.State) => state.shortcutSettings.showShortcutToast)
    const shortcutOnHoveredAtom = useSelector((state: moorhen.State) => state.shortcutSettings.shortcutOnHoveredAtom)

    // Updating scores
    const showScoresToast = useSelector((state: moorhen.State) => state.moleculeMapUpdate.showScoresToast)
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.moleculeMapUpdate.defaultUpdatingScores)

    // Label settings
    const atomLabelDepthMode = useSelector((state: moorhen.State) => state.labelSettings.atomLabelDepthMode)
    const GLLabelsFontFamily = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontFamily)
    const GLLabelsFontSize = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontSize)

    // Mouse settings
    const mouseSensitivity = useSelector((state: moorhen.State) => state.mouseSettings.mouseSensitivity)
    const zoomWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.zoomWheelSensitivityFactor)
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor)

    // Scene settings
    const defaultBackgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.defaultBackgroundColor)
    const drawScaleBar = useSelector((state: moorhen.State) => state.sceneSettings.drawScaleBar)
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs)
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const doEdgeDetect = useSelector((state: moorhen.State) => state.sceneSettings.doEdgeDetect)
    const edgeDetectDepthThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold)
    const edgeDetectNormalThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold)
    const edgeDetectDepthScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale)
    const edgeDetectNormalScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging)
    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const doShadowDepthDebug = useSelector((state: moorhen.State) => state.sceneSettings.doShadowDepthDebug)
    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)

    // Some misc. settings
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.generalStates.defaultExpandDisplayCards)
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const transparentModalsOnMouseOut = useSelector((state: moorhen.State) => state.generalStates.transparentModalsOnMouseOut)
    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine)

    // Value setter here corresponds with whatever needs to be called with a new value to set the *initial* value loaded from the local storage
    const preferencesMap = {
        1: { label: "defaultBackgroundColor", value: defaultBackgroundColor, valueSetter: setDefaultBackgroundColor},
        2: { label: "atomLabelDepthMode", value: atomLabelDepthMode, valueSetter: setAtomLabelDepthMode},
        3: { label: "defaultExpandDisplayCards", value: defaultExpandDisplayCards, valueSetter: setDefaultExpandDisplayCards},
        4: { label: "shortCuts", value: shortCuts, valueSetter: setShortCuts},
        5: { label: "defaultMapLitLines", value: defaultMapLitLines, valueSetter: setDefaultMapLitLines},
        6: { label: "enableRefineAfterMod", value: enableRefineAfterMod, valueSetter: setEnableRefineAfterMod},
        7: { label: "mouseSensitivity", value: mouseSensitivity, valueSetter: setMouseSensitivity},
        8: { label: "zoomWheelSensitivityFactor", value: zoomWheelSensitivityFactor, valueSetter: setZoomWheelSensitivityFactor},
        9: { label: "drawCrosshairs", value: drawCrosshairs, valueSetter: setDrawCrosshairs},
        10: { label: "drawFPS", value: drawFPS, valueSetter: setDrawFPS},
        11: { label: "drawMissingLoops", value: drawMissingLoops, valueSetter: setDrawMissingLoops},
        12: { label: "mapLineWidth", value: mapLineWidth, valueSetter: setMapLineWidth},
        13: { label: "makeBackups", value: makeBackups, valueSetter: setMakeBackups},
        14: { label: "showShortcutToast", value: showShortcutToast, valueSetter: setShowShortcutToast},
        15: { label: "defaultMapSurface", value: defaultMapSurface, valueSetter: setDefaultMapSurface},
        16: { label: "defaultBondSmoothness", value: defaultBondSmoothness, valueSetter: setDefaultBondSmoothness},
        17: { label: "showScoresToast", value: showScoresToast, valueSetter: setShowScoresToast},
        18: { label: "shortcutOnHoveredAtom", value: shortcutOnHoveredAtom, valueSetter: setShortcutOnHoveredAtom},
        19: { label: "resetClippingFogging", value: resetClippingFogging, valueSetter: setResetClippingFogging},
        20: { label: "defaultUpdatingScores", value: defaultUpdatingScores, valueSetter: overwriteMapUpdatingScores},
        21: { label: "maxBackupCount", value: maxBackupCount, valueSetter: setMaxBackupCount},
        22: { label: "modificationCountBackupThreshold", value: modificationCountBackupThreshold, valueSetter: setModificationCountBackupThreshold},
        23: { label: "clipCap", value: clipCap, valueSetter: setClipCap},
        24: { label: "enableTimeCapsule", value: enableTimeCapsule, valueSetter: setEnableTimeCapsule},
        25: { label: "doPerspectiveProjection", value: doPerspectiveProjection, valueSetter: setDoPerspectiveProjection},
        26: { label: "useOffScreenBuffers", value: useOffScreenBuffers, valueSetter: setUseOffScreenBuffers},
        27: { label: "contourWheelSensitivityFactor", value: contourWheelSensitivityFactor, valueSetter: setContourWheelSensitivityFactor},
        28: { label: "drawAxes", value: drawAxes, valueSetter: setDrawAxes},
        29: { label: "devMode", value: devMode, valueSetter: setDevMode},
        30: { label: "doShadowDepthDebug", value: doShadowDepthDebug, valueSetter: setDoShadowDepthDebug},
        31: { label: "doShadow", value: doShadow, valueSetter: setDoShadow},
        32: { label: "GLLabelsFontFamily", value: GLLabelsFontFamily, valueSetter: setGLLabelsFontFamily},
        33: { label: "GLLabelsFontSize", value: GLLabelsFontSize, valueSetter: setGLLabelsFontSize},
        34: { label: "doOutline", value: doOutline, valueSetter: setDoOutline},
        35: { label: "depthBlurRadius", value: depthBlurRadius, valueSetter: setDepthBlurRadius},
        36: { label: "depthBlurDepth", value: depthBlurDepth, valueSetter: setDepthBlurDepth},
        37: { label: "transparentModalsOnMouseOut", value: transparentModalsOnMouseOut, valueSetter: setTransparentModalsOnMouseOut},
        38: { label: "defaultMapSamplingRate", value: defaultMapSamplingRate, valueSetter: setDefaultMapSamplingRate},
        39: { label: "doSSAO", value: doSSAO, valueSetter: setDoSSAO},
        40: { label: "ssaoRadius", value: ssaoRadius, valueSetter: setSsaoRadius},
        41: { label: "ssaoBias", value: ssaoBias, valueSetter: setSsaoBias},
        42: { label: "drawScaleBar", value: drawScaleBar, valueSetter: setDrawScaleBar},
        43: { label: "animateRefine", value: animateRefine, valueSetter: setAnimateRefine},
        44: { label: "doEdgeDetect", value: doEdgeDetect, valueSetter: setDoEdgeDetect},
        45: { label: "edgeDetectDepthThreshold", value: edgeDetectDepthThreshold, valueSetter: setEdgeDetectDepthThreshold},
        46: { label: "edgeDetectNormalThreshold", value: edgeDetectNormalThreshold, valueSetter: setEdgeDetectNormalThreshold},
        47: { label: "edgeDetectDepthScale", value: edgeDetectDepthScale, valueSetter: setEdgeDetectDepthScale},
        48: { label: "edgeDetectNormalScale", value: edgeDetectNormalScale, valueSetter: setEdgeDetectNormalScale},
        49: { label: "reContourMapOnlyOnMouseUp", value: reContourMapOnlyOnMouseUp, valueSetter: setReContourMapOnlyOnMouseUp},
        50: { label: "useGemmi", value: useGemmi, valueSetter: setUseGemmi},
    }

    const restoreDefaults = (preferences: moorhen.Preferences, defaultValues: moorhen.PreferencesValues)=> {
        localForageInstanceRef.current.localStorageInstance.setItem('version', defaultValues.version)
        Object.keys(preferencesMap).forEach(key => {
            if (preferencesMap[key].label === 'shortCuts') {
                dispatch(
                    preferencesMap[key].valueSetter(JSON.stringify(defaultValues[preferencesMap[key].label]))
                )
            } else {
                dispatch(
                    preferencesMap[key].valueSetter(defaultValues[preferencesMap[key].label])
                )
            }
        })
    }

    /**
     * Hook used after component mounts to retrieve user preferences from
     * local storage. If no previously stored data is found, default values
     * are used.
     */
    useEffect(() => {
        const fetchStoredContext = async () => {
            try {
                const preferences = new MoorhenPreferences()
                localForageInstanceRef.current = preferences

                const storedVersion = await preferences.localStorageInstance.getItem('version')
                const defaultValues = MoorhenPreferences.defaultPreferencesValues
                if (storedVersion !== defaultValues.version) {
                    restoreDefaults(preferences, defaultValues)
                    dispatch(setUserPreferencesMounted(true))
                    return
                }

                const fetchPromises = Object.keys(preferencesMap).map(key => preferences.localStorageInstance.getItem(preferencesMap[key].label))
                const responses = await Promise.all(fetchPromises)

                if(!responses.every(item => item !== null) || responses.length < Object.keys(preferencesMap).length) {
                    restoreDefaults(preferences, defaultValues)
                } else {
                    Object.keys(preferencesMap).forEach((key, index) => dispatch(
                        preferencesMap[key].valueSetter(responses[index]))
                    )
                }
            } catch (err) {
                console.log(err)
                console.log('Unable to fetch preferences from local storage...')
            } finally {
                dispatch(setUserPreferencesMounted(true))
            }
        }

        fetchStoredContext();

    }, [])

    useMemo(() => {

        if (reContourMapOnlyOnMouseUp === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('reContourMapOnlyOnMouseUp', reContourMapOnlyOnMouseUp)
        .then(_ => props.onUserPreferencesChange('reContourMapOnlyOnMouseUp', reContourMapOnlyOnMouseUp));
    }, [reContourMapOnlyOnMouseUp]);

    useMemo(() => {

        if (transparentModalsOnMouseOut === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('transparentModalsOnMouseOut', transparentModalsOnMouseOut)
        .then(_ => props.onUserPreferencesChange('transparentModalsOnMouseOut', transparentModalsOnMouseOut));
    }, [transparentModalsOnMouseOut]);


    useMemo(() => {

        if (defaultMapSamplingRate === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultMapSamplingRate', defaultMapSamplingRate)
        .then(_ => props.onUserPreferencesChange('defaultMapSamplingRate', defaultMapSamplingRate));
    }, [defaultMapSamplingRate]);

    useMemo(() => {

        if (shortcutOnHoveredAtom === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('shortcutOnHoveredAtom', shortcutOnHoveredAtom)
        .then(_ => props.onUserPreferencesChange('shortcutOnHoveredAtom', shortcutOnHoveredAtom));
    }, [shortcutOnHoveredAtom]);

    useMemo(() => {

        if (devMode === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('devMode', devMode)
        .then(_ => props.onUserPreferencesChange('devMode', devMode));
    }, [devMode]);

    useMemo(() => {

        if (useGemmi === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('useGemmi', useGemmi)
        .then(_ => props.onUserPreferencesChange('useGemmi', useGemmi));
    }, [useGemmi]);

    useMemo(() => {

        if (contourWheelSensitivityFactor === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('contourWheelSensitivityFactor', contourWheelSensitivityFactor)
        .then(_ => props.onUserPreferencesChange('contourWheelSensitivityFactor', contourWheelSensitivityFactor));
    }, [contourWheelSensitivityFactor]);

    useMemo(() => {

        if (enableTimeCapsule === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('enableTimeCapsule', enableTimeCapsule)
        .then(_ => props.onUserPreferencesChange('enableTimeCapsule', enableTimeCapsule));
    }, [enableTimeCapsule]);

    useMemo(() => {

        if (maxBackupCount === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('maxBackupCount', maxBackupCount)
        .then(_ => props.onUserPreferencesChange('maxBackupCount', maxBackupCount));
    }, [maxBackupCount]);

    useMemo(() => {

        if (modificationCountBackupThreshold === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('modificationCountBackupThreshold', modificationCountBackupThreshold)
        .then(_ => props.onUserPreferencesChange('modificationCountBackupThreshold', modificationCountBackupThreshold));
    }, [modificationCountBackupThreshold]);

    useMemo(() => {

        if (clipCap === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('clipCap', clipCap)
        .then(_ => props.onUserPreferencesChange('clipCap', clipCap));
    }, [clipCap]);

    useMemo(() => {

        if (resetClippingFogging === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('resetClippingFogging', resetClippingFogging)
        .then(_ => props.onUserPreferencesChange('resetClippingFogging', resetClippingFogging));
    }, [resetClippingFogging]);

    useMemo(() => {

        if (zoomWheelSensitivityFactor === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('zoomWheelSensitivityFactor', zoomWheelSensitivityFactor)
        .then(_ => props.onUserPreferencesChange('zoomWheelSensitivityFactor', zoomWheelSensitivityFactor));
    }, [zoomWheelSensitivityFactor]);

    useMemo(() => {

        if (showShortcutToast === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('showShortcutToast', showShortcutToast)
        .then(_ => props.onUserPreferencesChange('showShortcutToast', showShortcutToast));
    }, [showShortcutToast]);

    useMemo(() => {

        if (showScoresToast === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('showScoresToast', showScoresToast)
        .then(_ => props.onUserPreferencesChange('showScoresToast', showScoresToast));
    }, [showScoresToast]);

    useMemo(() => {

        if (defaultUpdatingScores === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultUpdatingScores', defaultUpdatingScores)
        .then(_ => props.onUserPreferencesChange('defaultUpdatingScores', defaultUpdatingScores));
    }, [defaultUpdatingScores]);

    useMemo(() => {

        if (defaultBondSmoothness === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultBondSmoothness', defaultBondSmoothness)
        .then(_ => props.onUserPreferencesChange('defaultBondSmoothness', defaultBondSmoothness));
    }, [defaultBondSmoothness]);

    useMemo(() => {

        if (defaultMapSurface === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultMapSurface', defaultMapSurface)
        .then(_ => props.onUserPreferencesChange('defaultMapSurface', defaultMapSurface));
    }, [defaultMapSurface]);

    useMemo(() => {

        if (makeBackups === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('makeBackups', makeBackups)
        .then(_ => props.onUserPreferencesChange('makeBackups', makeBackups));
    }, [makeBackups]);

    useMemo(() => {

        if (enableRefineAfterMod === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('enableRefineAfterMod', enableRefineAfterMod)
        .then(_ => props.onUserPreferencesChange('enableRefineAfterMod', enableRefineAfterMod));
    }, [enableRefineAfterMod]);

    useMemo(() => {

        if (mapLineWidth === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('mapLineWidth', mapLineWidth)
        .then(_ => props.onUserPreferencesChange('mapLineWidth', mapLineWidth));
    }, [mapLineWidth]);

    useMemo(() => {

        if (drawAxes === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('drawAxes', drawAxes)
        .then(_ => props.onUserPreferencesChange('drawAxes', drawAxes));
    }, [drawAxes]);

    useMemo(() => {

        if (drawScaleBar === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('drawScaleBar', drawScaleBar)
        .then(_ => props.onUserPreferencesChange('drawScaleBar', drawScaleBar));
    }, [drawScaleBar]);

    useMemo(() => {

        if (drawCrosshairs === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('drawCrosshairs', drawCrosshairs)
        .then(_ => props.onUserPreferencesChange('drawCrosshairs', drawCrosshairs));
    }, [drawCrosshairs]);

    useMemo(() => {

        if (drawFPS === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('drawFPS', drawFPS)
        .then(_ => props.onUserPreferencesChange('drawFPS', drawFPS));
    }, [drawFPS]);

    useMemo(() => {

        if (drawMissingLoops === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('drawMissingLoops', drawMissingLoops)
        .then(_ => props.onUserPreferencesChange('drawMissingLoops', drawMissingLoops));
    }, [drawMissingLoops]);

    useMemo(() => {

        if (doPerspectiveProjection === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doPerspectiveProjection', doPerspectiveProjection)
        .then(_ => props.onUserPreferencesChange('doPerspectiveProjection', doPerspectiveProjection));
    }, [doPerspectiveProjection]);

    useMemo(() => {

        if (depthBlurDepth === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('depthBlurDepth', depthBlurDepth)
        .then(_ => props.onUserPreferencesChange('depthBlurDepth', depthBlurDepth));
    }, [depthBlurDepth]);

    useMemo(() => {

        if (animateRefine === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('animateRefine', animateRefine)
        .then(_ => props.onUserPreferencesChange('animateRefine', animateRefine));
    }, [animateRefine]);

    useMemo(() => {

        if (edgeDetectDepthThreshold === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('edgeDetectDepthThreshold', edgeDetectDepthThreshold)
        .then(_ => props.onUserPreferencesChange('edgeDetectDepthThreshold', edgeDetectDepthThreshold));
    }, [edgeDetectDepthThreshold]);

    useMemo(() => {

        if (edgeDetectNormalThreshold === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('edgeDetectNormalThreshold', edgeDetectNormalThreshold)
        .then(_ => props.onUserPreferencesChange('edgeDetectNormalThreshold', edgeDetectNormalThreshold));
    }, [edgeDetectNormalThreshold]);

    useMemo(() => {

        if (edgeDetectDepthScale === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('edgeDetectDepthScale', edgeDetectDepthScale)
        .then(_ => props.onUserPreferencesChange('edgeDetectDepthScale', edgeDetectDepthScale));
    }, [edgeDetectDepthScale]);

    useMemo(() => {

        if (edgeDetectNormalScale === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('edgeDetectNormalScale', edgeDetectNormalScale)
        .then(_ => props.onUserPreferencesChange('edgeDetectNormalScale', edgeDetectNormalScale));
    }, [edgeDetectNormalScale]);

    useMemo(() => {

        if (ssaoBias === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('ssaoBias', ssaoBias)
        .then(_ => props.onUserPreferencesChange('ssaoBias', ssaoBias));
    }, [ssaoBias]);

    useMemo(() => {

        if (ssaoRadius === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('ssaoRadius', ssaoRadius)
        .then(_ => props.onUserPreferencesChange('ssaoRadius', ssaoRadius));
    }, [ssaoRadius]);

    useMemo(() => {

        if (depthBlurRadius === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('depthBlurRadius', depthBlurRadius)
        .then(_ => props.onUserPreferencesChange('depthBlurRadius', depthBlurRadius));
    }, [depthBlurRadius]);

    useMemo(() => {

        if (useOffScreenBuffers === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('useOffScreenBuffers', useOffScreenBuffers)
        .then(_ => props.onUserPreferencesChange('useOffScreenBuffers', useOffScreenBuffers));
    }, [useOffScreenBuffers]);

    useMemo(() => {

        if (doShadowDepthDebug === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doShadowDepthDebug', doShadowDepthDebug)
        .then(_ => props.onUserPreferencesChange('doShadowDepthDebug', doShadowDepthDebug));
    }, [doShadowDepthDebug]);

    useMemo(() => {

        if (doOutline === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doOutline', doOutline)
        .then(_ => props.onUserPreferencesChange('doOutline', doOutline));
    }, [doOutline]);

    useMemo(() => {

        if (doShadow === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doShadow', doShadow)
        .then(_ => props.onUserPreferencesChange('doShadow', doShadow));
    }, [doShadow]);

    useMemo(() => {

        if (doSSAO === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doSSAO', doSSAO)
        .then(_ => props.onUserPreferencesChange('doSSAO', doSSAO));
    }, [doSSAO]);

    useMemo(() => {

        if (doEdgeDetect === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doEdgeDetect', doEdgeDetect)
        .then(_ => props.onUserPreferencesChange('doEdgeDetect', doEdgeDetect));
    }, [doEdgeDetect]);

    useMemo(() => {

        if (GLLabelsFontFamily === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('GLLabelsFontFamily', GLLabelsFontFamily)
        .then(_ => props.onUserPreferencesChange('GLLabelsFontFamily', GLLabelsFontFamily));
    }, [GLLabelsFontFamily]);

    useMemo(() => {

        if (GLLabelsFontSize === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('GLLabelsFontSize', GLLabelsFontSize)
        .then(_ => props.onUserPreferencesChange('GLLabelsFontSize', GLLabelsFontSize));
    }, [GLLabelsFontSize]);

    useMemo(() => {

        if (mouseSensitivity === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('mouseSensitivity', mouseSensitivity)
        .then(_ => props.onUserPreferencesChange('mouseSensitivity', mouseSensitivity));
    }, [mouseSensitivity]);

    useMemo(() => {

        if (atomLabelDepthMode === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('atomLabelDepthMode', atomLabelDepthMode)
        .then(_ => props.onUserPreferencesChange('atomLabelDepthMode', atomLabelDepthMode));
    }, [atomLabelDepthMode]);

    useMemo(() => {

        if (defaultBackgroundColor === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultBackgroundColor', defaultBackgroundColor)
        .then(_ => props.onUserPreferencesChange('defaultBackgroundColor', defaultBackgroundColor));
    }, [defaultBackgroundColor]);

    useMemo(() => {

        if (defaultExpandDisplayCards === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultExpandDisplayCards', defaultExpandDisplayCards)
        .then(_ => props.onUserPreferencesChange('defaultExpandDisplayCards', defaultExpandDisplayCards));
    }, [defaultExpandDisplayCards]);

    useMemo(() => {

        if (shortCuts === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('shortCuts', shortCuts)
        .then(_ => props.onUserPreferencesChange('shortCuts', shortCuts));
    }, [shortCuts]);

    useMemo(() => {

        if (defaultMapLitLines === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('defaultMapLitLines', defaultMapLitLines)
        .then(_ => props.onUserPreferencesChange('defaultMapLitLines', defaultMapLitLines));
    }, [defaultMapLitLines]);

    return  null
}
