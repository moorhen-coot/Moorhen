import { useEffect, useMemo, useRef } from "react";
import { MoorhenPreferences } from "../../utils/MoorhenPreferences";
import { setDefaultMapLitLines, setDefaultMapSamplingRate, setDefaultMapSurface, setMapLineWidth } from "../../store/mapSettingsSlice";
import { useSelector, useDispatch } from "react-redux"
import { setContourWheelSensitivityFactor, setMouseSensitivity, setZoomWheelSensitivityFactor } from "../../store/mouseSettings";
import { setEnableTimeCapsule, setMakeBackups, setMaxBackupCount, setModificationCountBackupThreshold } from "../../store/backupSettingsSlice";
import { overwriteMapUpdatingScores, setShowScoresToast } from "../../store/updatingMapScoresSettingsSlice";
import { setShortCuts, setShortcutOnHoveredAtom, setShowShortcutToast } from "../../store/shortCutsSlice";
import { setAtomLabelDepthMode, setGLLabelsFontFamily, setGLLabelsFontSize } from "../../store/labelSettingsSlice";
import { setClipCap, setDefaultBackgroundColor, setDefaultBondSmoothness, setDepthBlurDepth, setDepthBlurRadius, setDoOutline, setDoPerspectiveProjection, setDoSSAO, setDoShadow, setDoShadowDepthDebug, setDoSpinTest, setDrawAxes, setDrawCrosshairs, setDrawFPS, setDrawInteractions, setDrawMissingLoops, setResetClippingFogging, setSsaoBias, setSsaoRadius, setUseOffScreenBuffers } from "../../store/sceneSettingsSlice";
import { setDefaultExpandDisplayCards, setEnableRefineAfterMod, setTransparentModalsOnMouseOut } from "../../store/miscAppSettingsSlice";
import { setDevMode, setUserPreferencesMounted } from "../../store/generalStatesSlice";
import { moorhen } from "../../types/moorhen"

export const MoorhenPreferencesContainer = (props) => {
    const localForageInstanceRef = useRef<null | moorhen.Preferences>(null)
    const dispatch = useDispatch()

    // Some important general app states
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)

    // Map settings
    const defaultMapLitLines = useSelector((state: moorhen.State) => state.mapSettings.defaultMapLitLines)
    const defaultMapSamplingRate = useSelector((state: moorhen.State) => state.mapSettings.defaultMapSamplingRate)
    const mapLineWidth = useSelector((state: moorhen.State) => state.mapSettings.mapLineWidth)
    const defaultMapSurface = useSelector((state: moorhen.State) => state.mapSettings.defaultMapSurface)

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
    const showScoresToast = useSelector((state: moorhen.State) => state.updatingMapScoresSettings.showScoresToast)
    const defaultUpdatingScores = useSelector((state: moorhen.State) => state.updatingMapScoresSettings.defaultUpdatingScores)

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
    const drawCrosshairs = useSelector((state: moorhen.State) => state.sceneSettings.drawCrosshairs)
    const drawFPS = useSelector((state: moorhen.State) => state.sceneSettings.drawFPS)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const drawAxes = useSelector((state: moorhen.State) => state.sceneSettings.drawAxes)
    const drawInteractions = useSelector((state: moorhen.State) => state.sceneSettings.drawInteractions)
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging)
    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const doShadowDepthDebug = useSelector((state: moorhen.State) => state.sceneSettings.doShadowDepthDebug)
    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)
    const doSpinTest = useSelector((state: moorhen.State) => state.sceneSettings.doSpinTest)
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)

    // Some misc. settings
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.miscAppSettings.defaultExpandDisplayCards)
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.miscAppSettings.enableRefineAfterMod)
    const transparentModalsOnMouseOut = useSelector((state: moorhen.State) => state.miscAppSettings.transparentModalsOnMouseOut)

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
        23: { label: "drawInteractions", value: drawInteractions, valueSetter: setDrawInteractions},
        24: { label: "clipCap", value: clipCap, valueSetter: setClipCap},
        25: { label: "enableTimeCapsule", value: enableTimeCapsule, valueSetter: setEnableTimeCapsule},
        26: { label: "doPerspectiveProjection", value: doPerspectiveProjection, valueSetter: setDoPerspectiveProjection},
        27: { label: "useOffScreenBuffers", value: useOffScreenBuffers, valueSetter: setUseOffScreenBuffers},
        28: { label: "contourWheelSensitivityFactor", value: contourWheelSensitivityFactor, valueSetter: setContourWheelSensitivityFactor},
        29: { label: "drawAxes", value: drawAxes, valueSetter: setDrawAxes},
        30: { label: "devMode", value: devMode, valueSetter: setDevMode},
        31: { label: "doShadowDepthDebug", value: doShadowDepthDebug, valueSetter: setDoShadowDepthDebug},
        32: { label: "doShadow", value: doShadow, valueSetter: setDoShadow},
        33: { label: "GLLabelsFontFamily", value: GLLabelsFontFamily, valueSetter: setGLLabelsFontFamily},
        34: { label: "GLLabelsFontSize", value: GLLabelsFontSize, valueSetter: setGLLabelsFontSize},
        35: { label: "doSpinTest", value: doSpinTest, valueSetter: setDoSpinTest},
        36: { label: "doOutline", value: doOutline, valueSetter: setDoOutline},
        37: { label: "depthBlurRadius", value: depthBlurRadius, valueSetter: setDepthBlurRadius},
        38: { label: "depthBlurDepth", value: depthBlurDepth, valueSetter: setDepthBlurDepth},
        39: { label: "transparentModalsOnMouseOut", value: transparentModalsOnMouseOut, valueSetter: setTransparentModalsOnMouseOut},
        40: { label: "defaultMapSamplingRate", value: defaultMapSamplingRate, valueSetter: setDefaultMapSamplingRate},
        41: { label: "doSSAO", value: doSSAO, valueSetter: setDoSSAO},
        42: { label: "ssaoRadius", value: ssaoRadius, valueSetter: setSsaoRadius},
        43: { label: "ssaoBias", value: ssaoBias, valueSetter: setSsaoBias},
    }

    const restoreDefaults = (preferences: moorhen.Preferences, defaultValues: moorhen.ContextValues)=> {
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
                const preferences = new MoorhenPreferences('babyGru-localStorage')
                localForageInstanceRef.current = preferences

                const storedVersion = await preferences.localStorageInstance.getItem('version')
                const defaultValues = MoorhenPreferences.defaultContextValues
                if (storedVersion !== defaultValues.version) {
                    restoreDefaults(preferences, defaultValues)
                    dispatch(setUserPreferencesMounted(true))
                    return
                }
                
                const fetchPromises = Object.keys(preferencesMap).map(key => preferences.localStorageInstance.getItem(preferencesMap[key].label))
                let responses = await Promise.all(fetchPromises)
                               
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

        if (transparentModalsOnMouseOut === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('transparentModalsOnMouseOut', transparentModalsOnMouseOut);
    }, [transparentModalsOnMouseOut]);


    useMemo(() => {

        if (defaultMapSamplingRate === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultMapSamplingRate', defaultMapSamplingRate);
    }, [defaultMapSamplingRate]);

    useMemo(() => {

        if (shortcutOnHoveredAtom === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('shortcutOnHoveredAtom', shortcutOnHoveredAtom);
    }, [shortcutOnHoveredAtom]);

    useMemo(() => {

        if (devMode === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('devMode', devMode);
    }, [devMode]);
    
    useMemo(() => {

        if (contourWheelSensitivityFactor === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('contourWheelSensitivityFactor', contourWheelSensitivityFactor);
    }, [contourWheelSensitivityFactor]);
    
    useMemo(() => {

        if (enableTimeCapsule === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('enableTimeCapsule', enableTimeCapsule);
    }, [enableTimeCapsule]);
    
    useMemo(() => {

        if (maxBackupCount === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('maxBackupCount', maxBackupCount);
    }, [maxBackupCount]);
    
    useMemo(() => {

        if (modificationCountBackupThreshold === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('modificationCountBackupThreshold', modificationCountBackupThreshold);
    }, [modificationCountBackupThreshold]);

    useMemo(() => {

        if (clipCap === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('clipCap', clipCap);
    }, [clipCap]);

    useMemo(() => {

        if (resetClippingFogging === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('resetClippingFogging', resetClippingFogging);
    }, [resetClippingFogging]);

    useMemo(() => {

        if (zoomWheelSensitivityFactor === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('zoomWheelSensitivityFactor', zoomWheelSensitivityFactor);
    }, [zoomWheelSensitivityFactor]);

    useMemo(() => {

        if (showShortcutToast === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('showShortcutToast', showShortcutToast);
    }, [showShortcutToast]);
    
    useMemo(() => {

        if (showScoresToast === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('showScoresToast', showScoresToast);
    }, [showScoresToast]);
    
    useMemo(() => {

        if (defaultUpdatingScores === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultUpdatingScores', defaultUpdatingScores);
    }, [defaultUpdatingScores]);
    
    useMemo(() => {

        if (defaultBondSmoothness === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultBondSmoothness', defaultBondSmoothness);
    }, [defaultBondSmoothness]);

    useMemo(() => {

        if (defaultMapSurface === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultMapSurface', defaultMapSurface);
    }, [defaultMapSurface]);

    useMemo(() => {

        if (makeBackups === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('makeBackups', makeBackups);
    }, [makeBackups]);

    useMemo(() => {

        if (enableRefineAfterMod === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('enableRefineAfterMod', enableRefineAfterMod);
    }, [enableRefineAfterMod]);

    useMemo(() => {

        if (mapLineWidth === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('mapLineWidth', mapLineWidth);
    }, [mapLineWidth]);

    useMemo(() => {

        if (drawAxes === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('drawAxes', drawAxes);
    }, [drawAxes]);

    useMemo(() => {

        if (drawCrosshairs === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('drawCrosshairs', drawCrosshairs);
    }, [drawCrosshairs]);

    useMemo(() => {

        if (drawFPS === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('drawFPS', drawFPS);
    }, [drawFPS]);

    useMemo(() => {

        if (drawMissingLoops === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('drawMissingLoops', drawMissingLoops);
    }, [drawMissingLoops]);

    useMemo(() => {

        if (doPerspectiveProjection === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doPerspectiveProjection', doPerspectiveProjection);
    }, [doPerspectiveProjection]);

    useMemo(() => {

        if (depthBlurDepth === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('depthBlurDepth', depthBlurDepth);
    }, [depthBlurDepth]);

    useMemo(() => {

        if (ssaoBias === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('ssaoBias', ssaoBias);
    }, [ssaoBias]);

    useMemo(() => {

        if (ssaoRadius === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('ssaoRadius', ssaoRadius);
    }, [ssaoRadius]);

    useMemo(() => {

        if (depthBlurRadius === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('depthBlurRadius', depthBlurRadius);
    }, [depthBlurRadius]);

    useMemo(() => {

        if (useOffScreenBuffers === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('useOffScreenBuffers', useOffScreenBuffers);
    }, [useOffScreenBuffers]);

    useMemo(() => {

        if (doShadowDepthDebug === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doShadowDepthDebug', doShadowDepthDebug);
    }, [doShadowDepthDebug]);

    useMemo(() => {

        if (doOutline === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doOutline', doOutline);
    }, [doOutline]);

    useMemo(() => {

        if (doShadow === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doShadow', doShadow);
    }, [doShadow]);

    useMemo(() => {

        if (doSSAO === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doSSAO', doSSAO);
    }, [doSSAO]);

    useMemo(() => {

        if (GLLabelsFontFamily === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('GLLabelsFontFamily', GLLabelsFontFamily);
    }, [GLLabelsFontFamily]);

    useMemo(() => {

        if (GLLabelsFontSize === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('GLLabelsFontSize', GLLabelsFontSize);
    }, [GLLabelsFontSize]);

    useMemo(() => {

        if (doSpinTest === null) {
            return
        }

        localForageInstanceRef.current?.localStorageInstance.setItem('doSpinTest', doSpinTest);
    }, [doSpinTest]);

    useMemo(() => {

        if (drawInteractions === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('drawInteractions', drawInteractions);
    }, [drawInteractions]);

    useMemo(() => {

        if (mouseSensitivity === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('mouseSensitivity', mouseSensitivity);
    }, [mouseSensitivity]);

    useMemo(() => {

        if (atomLabelDepthMode === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('atomLabelDepthMode', atomLabelDepthMode);
    }, [atomLabelDepthMode]);
 
    useMemo(() => {

        if (defaultBackgroundColor === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultBackgroundColor', defaultBackgroundColor);
    }, [defaultBackgroundColor]);
    
    useMemo(() => {

        if (defaultExpandDisplayCards === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultExpandDisplayCards', defaultExpandDisplayCards);
    }, [defaultExpandDisplayCards]);

    useMemo(() => {

        if (shortCuts === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('shortCuts', shortCuts);
    }, [shortCuts]);

    useMemo(() => {

        if (defaultMapLitLines === null) {
            return
        }
       
        localForageInstanceRef.current?.localStorageInstance.setItem('defaultMapLitLines', defaultMapLitLines);
    }, [defaultMapLitLines]);

    return  <></>
}