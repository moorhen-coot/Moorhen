import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { moorhen } from '../../../types/moorhen';
import { MGWebGL } from '../../../WebGLgComponents/mgWebGL';

/**
 * Headless sync component: mirrors the scene-render settings (SSAO, shadows,
 * environment B-occ, stereo / multi-view, spin, depth blur) onto the WebGL
 * instance. Extracted from MoorhenWebMG so a change to any of these re-renders
 * only this tiny null-rendering component, not the whole 770-line parent.
 *
 * Each effect is copied verbatim from the original inline effects (same guards,
 * same setter-or-field-assignment, same dependency arrays), so behaviour is
 * identical - only the component the subscription lives in has changed.
 */
export const SceneRenderSettingsSync = ({ glRef }: { glRef: React.Ref<MGWebGL> }) => {
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)
    const doSpin = useSelector((state: moorhen.State) => state.sceneSettings.doSpin)
    const doAnaglyphStereo = useSelector((state: moorhen.State) => state.sceneSettings.doAnaglyphStereo)
    const doCrossEyedStereo = useSelector((state: moorhen.State) => state.sceneSettings.doCrossEyedStereo)
    const doSideBySideStereo = useSelector((state: moorhen.State) => state.sceneSettings.doSideBySideStereo)
    const doThreeWayView = useSelector((state: moorhen.State) => state.sceneSettings.doThreeWayView)
    const multiViewRows = useSelector((state: moorhen.State) => state.sceneSettings.multiViewRows)
    const multiViewColumns = useSelector((state: moorhen.State) => state.sceneSettings.multiViewColumns)
    const threeWayViewOrder = useSelector((state: moorhen.State) => state.sceneSettings.threeWayViewOrder)
    const specifyMultiViewRowsColumns = useSelector((state: moorhen.State) => state.sceneSettings.specifyMultiViewRowsColumns)
    const doMultiView = useSelector((state: moorhen.State) => state.sceneSettings.doMultiView)
    const drawEnvBOcc = useSelector((state: moorhen.State) => state.sceneSettings.drawEnvBOcc)
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)
    const doPerspectiveProjection = useSelector((state: moorhen.State) => state.sceneSettings.doPerspectiveProjection)
    const doShadowDepthDebug = useSelector((state: moorhen.State) => state.sceneSettings.doShadowDepthDebug)
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)
    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSSAOOn(doSSAO)
            glRef.current.drawScene()
        }
    }, [doSSAO])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowsOn(doShadow)
            glRef.current.drawScene()
        }
    }, [doShadow])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDrawEnvBOcc(drawEnvBOcc)
            glRef.current.handleOriginUpdated(false)
            glRef.current.drawScene()
        }
    }, [drawEnvBOcc])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setThreeWayViewOrder(threeWayViewOrder)
            glRef.current.setupThreeWayTransformations()
            glRef.current.drawScene()
        }
    }, [threeWayViewOrder])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setMultiViewRowsColumns([multiViewRows,multiViewColumns])
            glRef.current.setSpecifyMultiViewRowsColumns(specifyMultiViewRowsColumns)
            glRef.current.drawScene()
        }
    }, [multiViewRows,multiViewColumns,specifyMultiViewRowsColumns])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoThreeWayView(doThreeWayView)
            glRef.current.drawScene()
        }
    }, [doThreeWayView])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoSideBySideStereo(doSideBySideStereo)
            glRef.current.drawScene()
        }
    }, [doSideBySideStereo])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoMultiView(doMultiView)
            glRef.current.drawScene()
        }
    }, [doMultiView])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoCrossEyedStereo(doCrossEyedStereo)
            glRef.current.drawScene()
        }
    }, [doCrossEyedStereo])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setDoAnaglyphStereo(doAnaglyphStereo)
            glRef.current.drawScene()
        }
    }, [doAnaglyphStereo])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setSpinTestState(doSpin)
            glRef.current.drawScene()
        }
    }, [doSpin])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function' && ssaoBias != null) {
            glRef.current.setSSAOBias(ssaoBias)
            glRef.current.drawScene()
        }
    }, [ssaoBias])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function' && ssaoRadius != null) {
            glRef.current.setSSAORadius(ssaoRadius)
            glRef.current.drawScene()
        }
    }, [ssaoRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setBlurSize(depthBlurRadius)
            glRef.current.drawScene()
        }
    }, [depthBlurRadius])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.blurDepth = depthBlurDepth
            glRef.current.drawScene()
        }
    }, [depthBlurDepth])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.useOffScreenBuffers = useOffScreenBuffers
            glRef.current.drawScene()
        }
    }, [useOffScreenBuffers])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.doPerspectiveProjection = doPerspectiveProjection
            glRef.current.clearTextPositionBuffers()
            glRef.current.drawScene()
        }
    }, [doPerspectiveProjection])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setShadowDepthDebug(doShadowDepthDebug)
            glRef.current.drawScene()
        }
    }, [doShadowDepthDebug])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setOutlinesOn(doOutline)
            glRef.current.drawScene()
        }
    }, [doOutline])

    useEffect(() => {
        if (glRef !== null && typeof glRef !== 'function' && glRef.current) {
            glRef.current.clipCapPerfectSpheres = clipCap
            glRef.current.drawScene()
        }
    }, [clipCap, glRef])

    return null
}
