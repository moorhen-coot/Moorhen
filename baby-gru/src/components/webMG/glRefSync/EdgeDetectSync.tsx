import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { moorhen } from '../../../types/moorhen';
import { MGWebGL } from '../../../WebGLgComponents/mgWebGL';

/**
 * Headless sync component: mirrors the edge-detect scene settings onto the
 * WebGL instance. Extracted from MoorhenWebMG so that an edge-detect setting
 * change re-renders only this tiny null-rendering component (which subscribes
 * to just those slices), not the whole 770-line MoorhenWebMG.
 *
 * Behaviour is identical to the original inline effects: each setting drives
 * one glRef setter followed by a redraw. `glRef` is passed down unchanged.
 */
export const EdgeDetectSync = ({ glRef }: { glRef: React.Ref<MGWebGL> }) => {
    const doEdgeDetect = useSelector((state: moorhen.State) => state.sceneSettings.doEdgeDetect)
    const edgeDetectDepthThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthThreshold)
    const edgeDetectNormalThreshold = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalThreshold)
    const edgeDetectDepthScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectDepthScale)
    const edgeDetectNormalScale = useSelector((state: moorhen.State) => state.sceneSettings.edgeDetectNormalScale)

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectOn(doEdgeDetect)
            glRef.current.drawScene()
        }
    }, [doEdgeDetect])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectDepthThreshold(edgeDetectDepthThreshold)
            glRef.current.drawScene()
        }
    }, [edgeDetectDepthThreshold])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectNormalThreshold(edgeDetectNormalThreshold)
            glRef.current.drawScene()
        }
    }, [edgeDetectNormalThreshold])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectDepthScale(edgeDetectDepthScale)
            glRef.current.drawScene()
        }
    }, [edgeDetectDepthScale])

    useEffect(() => {
        if(glRef !== null && typeof glRef !== 'function') {
            glRef.current.setEdgeDetectNormalScale(edgeDetectNormalScale)
            glRef.current.drawScene()
        }
    }, [edgeDetectNormalScale])

    return null
}
