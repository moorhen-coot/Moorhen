import {  useRef, useCallback } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { MapScrollWheelHandeler} from "./MapScrollWheelHandeler"

export const MoorhenMapManager = (props:{mapMolNo:number}) => {
    const lastTime = useRef<number>(Date.now())
    const drawTiming = useRef<[number, number]>([0, 50])
    const debounceTime = useRef<number>(150)
    const mapContourLevelRef = useRef<number>(null)

    const mapMolNo = props.mapMolNo


    const map = useSelector((state: moorhen.State) => state.maps.find((item) =>item.molNo === mapMolNo));
    const activeMapMolNo = useSelector((state: moorhen.State) => state.generalStates.activeMap.molNo);
    const isMapActive = activeMapMolNo === mapMolNo ? true : false
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(mapMolNo));
    const mapRadius = useSelector((state: moorhen.State) => {
        const mapRadiusItem = state.mapContourSettings.mapRadii.find((item) => item.molNo === mapMolNo);
        return mapRadiusItem?.radius || 25;
    });
    
    const mapContourLevel = useSelector((state: moorhen.State) => {
        const mapContourItem = state.mapContourSettings.contourLevels.find((item) => item.molNo === mapMolNo);
        return mapContourItem?.contourLevel || 0.8;
    });
    mapContourLevelRef.current = mapContourLevel

    useSelector((state: moorhen.State) => {const map = state.mapContourSettings.mapStyles.find((item) => item.molNo === mapMolNo);});
    useSelector((state: moorhen.State) => {const map = state.mapContourSettings.mapAlpha.find((item) => item.molNo === mapMolNo);});
    
    const postDraw = useCallback(() => {
        const now = Date.now()
        drawTiming.current = [drawTiming.current[0], now]
        debounceTime.current = drawTiming.current[1] - drawTiming.current[0]
        console.log("Map manager draw time:", drawTiming.current[1] - drawTiming.current[0])
        
    },[])

    function drawMap() {
        if (!map || !mapIsVisible) {
            map?.hideMapContour();
            return;
        }
        const now = Date.now()
        if (now - lastTime.current < debounceTime.current) {
            return}
        drawTiming.current = [now, null]
        map.drawMapContour().then(postDraw)
        lastTime.current = Date.now() }
    if (!map) { 
        return null       
    }

    drawMap()

    return (isMapActive ? 
        <MapScrollWheelHandeler 
        mapContourLevel={mapContourLevel}
        mapIsVisible={mapIsVisible}
        mapRadius={mapRadius}
        map={map}
        ></MapScrollWheelHandeler>
        :
    false)
}
