import { RootState } from "@/store";
import { useDocumentEventListener } from "../../../hooks/useDocumentEventListener";
import { useMoorhenInstance } from "@/InstanceManager";
import { useSelector } from "react-redux";
import { useEffect } from "react";


export const MapOriginListener = (props: { drawMap(): void, mapUID: string }) => {
    const origin = useSelector((state: RootState) => state.glRef.origin);
    const moorhenInstance = useMoorhenInstance();
    const map = moorhenInstance.getMap(props.mapUID);
    const isInRange = (value: number, min: number, max: number) => value >= min && value <= max;
    
    const reContourMapOnlyOnMouseUp = useSelector((state: RootState) => {
        const reContourOnMouseUp = state.mapContourSettings.reContourMapOnlyOnMouseUp;
        return reContourOnMouseUp || false;
    });

    let isDrawOriginInCell = true;

    const handleMouseMove = () => {

    if (map.isEM && map.dataOrigin === "mtz" && map.isOriginLocked) {
        const drawOrigin = map.drawOrigin;
        const cell = map.headerInfo.cell;
        const currentCell = { a: [drawOrigin[0] - cell.a / 2, drawOrigin[0] + cell.a / 2], b: [drawOrigin[1] - cell.b / 2, drawOrigin[1] + cell.b / 2], c: [drawOrigin[2] - cell.c / 2, drawOrigin[2] + cell.c / 2] };
        isDrawOriginInCell = isInRange(origin[0], currentCell.a[0], currentCell.a[1]) && isInRange(origin[1], currentCell.b[0], currentCell.b[1]) && isInRange(origin[2], currentCell.c[0], currentCell.c[1]);
        console.log(`Current draw origin: ${drawOrigin}, current cell: ${JSON.stringify(currentCell)}, is draw origin in cell: ${isDrawOriginInCell}`);
        if (!isDrawOriginInCell) {
            map.drawOrigin = [(Math.trunc(origin[0] / cell.a) * cell.a + map.originShift[0]), (Math.trunc(origin[1] / cell.b) * cell.b + map.originShift[1]), (Math.trunc(origin[2] / cell.c) * cell.c + map.originShift[2])];
            console.log(`Adjusted draw origin to: ${map.drawOrigin}`);
        }
    }


    if (!map.isOriginLocked || !isDrawOriginInCell) {
        props.drawMap();
    }};

    if (!reContourMapOnlyOnMouseUp) {
        handleMouseMove();
    }

    useEffect(() => {
        if (reContourMapOnlyOnMouseUp) {
            document.addEventListener("mouseup", handleMouseMove, { capture: true });
        }
        if (!reContourMapOnlyOnMouseUp) {
            document.removeEventListener("mouseup", handleMouseMove, { capture: true });
        }
        return () => {
            document.removeEventListener("mouseup", handleMouseMove, { capture: true });
        };
    }, [reContourMapOnlyOnMouseUp]);


    return null;
};

export const MapOriginListenerMouseUp = (props: { drawMap(): void }) => {
    const handleMouseUp = () => {
            props.drawMap();
        };
    
    return null;
};
