import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState, setShownControl } from "@/store";

export const MapContourLevel = () => {
    const currentContourLevelRef = useRef<number | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const maps = useSelector((state: RootState) => state.maps);
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const mapMolNo = shownControl?.name === "mapContourLvl" ? shownControl.payload?.molNo : undefined;
    const mapPrecision = (shownControl?.name === "mapContourLvl" ? shownControl.payload?.mapPrecision : undefined) || 1;
    const contourLevel = useSelector(
        (state: RootState) => state.mapContourSettings.contourLevels.find(item => item.molNo === mapMolNo)?.contourLevel
    );
    const dispatch = useDispatch();

    const selectedMap = maps.find(map => map.molNo === mapMolNo);

    useEffect(() => {
        timeoutRef.current = setTimeout(() => {
            dispatch(setShownControl(null));
        }, 1500);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [contourLevel, dispatch]);

    useEffect(() => {
        currentContourLevelRef.current = contourLevel;
    }, [contourLevel]);

    return (
        <div>
            {`Level: ${contourLevel?.toFixed(selectedMap?.isEM ? Math.abs(Math.floor(Math.log10(mapPrecision))) : 2)} ${selectedMap?.mapRmsd ? "(" + (contourLevel / selectedMap?.mapRmsd).toFixed(2) + " rmsd)" : ""}`}
        </div>
    );
};
