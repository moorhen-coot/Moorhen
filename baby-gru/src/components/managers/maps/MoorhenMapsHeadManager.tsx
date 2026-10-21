import { useSelector } from "react-redux";
import { moorhen } from "../../../types/moorhen";
import { MapScrollWheelListener } from "./MapScrollWheelListener";

/**
 * Mounts the scroll-wheel contour level control for the active map.
 *
 * @remarks
 * Maps are no longer drawn from React: the instance's `MapDisplayDriver` draws them from their representation
 * records (see .roadmaps/map-display.md).
 */
export const MoorhenMapsHeadManager = () => {
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const map = useSelector((state: moorhen.State) => state.maps.find(item => item.molNo === activeMap?.molNo) ?? null);
    const mapIsVisible = useSelector((state: moorhen.State) => (map ? state.mapContourSettings.visibleMaps.includes(map.molNo) : false));
    const mapContourLevel = useSelector((state: moorhen.State) => {
        const level = map ? state.mapContourSettings.contourLevels.find(item => item.molNo === map.molNo)?.contourLevel : undefined;
        return level ?? map?.suggestedContourLevel ?? 0.003;
    });

    if (!map) {
        return null;
    }
    return <MapScrollWheelListener key={map.uniqueId} map={map} mapIsVisible={mapIsVisible} mapContourLevel={mapContourLevel} />;
};
