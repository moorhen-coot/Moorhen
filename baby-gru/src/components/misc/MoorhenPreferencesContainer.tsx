import { useEffect, useRef,  memo } from "react";
import { useSelector, useDispatch } from "react-redux"
import { MoorhenPreferences } from "../../utils/MoorhenPreferences";
import { setDefaultMapLitLines, setDefaultMapSamplingRate, setDefaultMapSurface, setMapLineWidth, setReContourMapOnlyOnMouseUp } from "../../store/mapContourSettingsSlice";
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
} from "../../store/sceneSettingsSlice";
import { setDefaultExpandDisplayCards, setTransparentModalsOnMouseOut , setDevMode, setUserPreferencesMounted, setUseGemmi } from "../../store/generalStatesSlice";
import { setAnimateRefine, setEnableRefineAfterMod } from '../../store/refinementSettingsSlice';
import { setElementsIndicesRestrict } from "../../store/glRefSlice";
import { moorhen } from "../../types/moorhen"



export const MoorhenPreferencesContainer = memo((props: {
    onUserPreferencesChange?: (key: string, value: unknown) => void;
}) => {

    const localForageInstanceRef = useRef<null | moorhen.Preferences>(null)
    const dispatch = useDispatch()

    // Some important general app states
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi)

    // Whether or not to restrict maximum element indices draw to 65535, or to use what driver thinks is best.
    const elementsIndicesRestrict = useSelector((state: moorhen.State) => state.glRef.elementsIndicesRestrict)

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
        51: { label: "elementsIndicesRestrict", value: elementsIndicesRestrict, valueSetter: setElementsIndicesRestrict},
    }

    const usePreferencePersistence = (key: string, value: unknown, onUserPreferencesChange?: (key: string, value: unknown) => void) => {
    useEffect(() => {
        if (value === null) return;
        
        localForageInstanceRef.current?.localStorageInstance.setItem(key, value)
            .then(_ => onUserPreferencesChange?.(key, value));
    }, [key, value, onUserPreferencesChange]);
};

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

    
    // Replace all the individual useEffect hooks with these calls:
    usePreferencePersistence('reContourMapOnlyOnMouseUp', reContourMapOnlyOnMouseUp, props.onUserPreferencesChange);
    usePreferencePersistence('transparentModalsOnMouseOut', transparentModalsOnMouseOut, props.onUserPreferencesChange);
    usePreferencePersistence('defaultMapSamplingRate', defaultMapSamplingRate, props.onUserPreferencesChange);
    usePreferencePersistence('shortcutOnHoveredAtom', shortcutOnHoveredAtom, props.onUserPreferencesChange);
    usePreferencePersistence('devMode', devMode, props.onUserPreferencesChange);
    usePreferencePersistence('useGemmi', useGemmi, props.onUserPreferencesChange);
    usePreferencePersistence('elementsIndicesRestrict', elementsIndicesRestrict, props.onUserPreferencesChange);
    usePreferencePersistence('contourWheelSensitivityFactor', contourWheelSensitivityFactor, props.onUserPreferencesChange);
    usePreferencePersistence('enableTimeCapsule', enableTimeCapsule, props.onUserPreferencesChange);
    usePreferencePersistence('maxBackupCount', maxBackupCount, props.onUserPreferencesChange);
    usePreferencePersistence('modificationCountBackupThreshold', modificationCountBackupThreshold, props.onUserPreferencesChange);
    usePreferencePersistence('clipCap', clipCap, props.onUserPreferencesChange);
    usePreferencePersistence('resetClippingFogging', resetClippingFogging, props.onUserPreferencesChange);
    usePreferencePersistence('zoomWheelSensitivityFactor', zoomWheelSensitivityFactor, props.onUserPreferencesChange);
    usePreferencePersistence('showShortcutToast', showShortcutToast, props.onUserPreferencesChange);
    usePreferencePersistence('showScoresToast', showScoresToast, props.onUserPreferencesChange);
    usePreferencePersistence('defaultUpdatingScores', defaultUpdatingScores, props.onUserPreferencesChange);
    usePreferencePersistence('defaultBondSmoothness', defaultBondSmoothness, props.onUserPreferencesChange);
    usePreferencePersistence('defaultMapSurface', defaultMapSurface, props.onUserPreferencesChange);
    usePreferencePersistence('makeBackups', makeBackups, props.onUserPreferencesChange);
    usePreferencePersistence('enableRefineAfterMod', enableRefineAfterMod, props.onUserPreferencesChange);
    usePreferencePersistence('mapLineWidth', mapLineWidth, props.onUserPreferencesChange);
    usePreferencePersistence('drawAxes', drawAxes, props.onUserPreferencesChange);
    usePreferencePersistence('drawScaleBar', drawScaleBar, props.onUserPreferencesChange);
    usePreferencePersistence('drawCrosshairs', drawCrosshairs, props.onUserPreferencesChange);
    usePreferencePersistence('drawFPS', drawFPS, props.onUserPreferencesChange);
    usePreferencePersistence('drawMissingLoops', drawMissingLoops, props.onUserPreferencesChange);
    usePreferencePersistence('doPerspectiveProjection', doPerspectiveProjection, props.onUserPreferencesChange);
    usePreferencePersistence('depthBlurDepth', depthBlurDepth, props.onUserPreferencesChange);
    usePreferencePersistence('animateRefine', animateRefine, props.onUserPreferencesChange);
    usePreferencePersistence('edgeDetectDepthThreshold', edgeDetectDepthThreshold, props.onUserPreferencesChange);
    usePreferencePersistence('edgeDetectNormalThreshold', edgeDetectNormalThreshold, props.onUserPreferencesChange);
    usePreferencePersistence('edgeDetectDepthScale', edgeDetectDepthScale, props.onUserPreferencesChange);
    usePreferencePersistence('edgeDetectNormalScale', edgeDetectNormalScale, props.onUserPreferencesChange);
    usePreferencePersistence('ssaoBias', ssaoBias, props.onUserPreferencesChange);
    usePreferencePersistence('ssaoRadius', ssaoRadius, props.onUserPreferencesChange);
    usePreferencePersistence('depthBlurRadius', depthBlurRadius, props.onUserPreferencesChange);
    usePreferencePersistence('useOffScreenBuffers', useOffScreenBuffers, props.onUserPreferencesChange);
    usePreferencePersistence('doShadowDepthDebug', doShadowDepthDebug, props.onUserPreferencesChange);
    usePreferencePersistence('doOutline', doOutline, props.onUserPreferencesChange);
    usePreferencePersistence('doShadow', doShadow, props.onUserPreferencesChange);
    usePreferencePersistence('doSSAO', doSSAO, props.onUserPreferencesChange);
    usePreferencePersistence('doEdgeDetect', doEdgeDetect, props.onUserPreferencesChange);
    usePreferencePersistence('GLLabelsFontFamily', GLLabelsFontFamily, props.onUserPreferencesChange);
    usePreferencePersistence('GLLabelsFontSize', GLLabelsFontSize, props.onUserPreferencesChange);
    usePreferencePersistence('mouseSensitivity', mouseSensitivity, props.onUserPreferencesChange);
    usePreferencePersistence('atomLabelDepthMode', atomLabelDepthMode, props.onUserPreferencesChange);
    usePreferencePersistence('defaultBackgroundColor', defaultBackgroundColor, props.onUserPreferencesChange);
    usePreferencePersistence('defaultExpandDisplayCards', defaultExpandDisplayCards, props.onUserPreferencesChange);
    usePreferencePersistence('shortCuts', shortCuts, props.onUserPreferencesChange);
    usePreferencePersistence('defaultMapLitLines', defaultMapLitLines, props.onUserPreferencesChange);

    return  null
});

MoorhenPreferencesContainer.displayName = "MoorhenPreferencesContainer";