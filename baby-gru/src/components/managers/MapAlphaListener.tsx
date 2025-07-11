
import { useEffect } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";

export const MapAlphaListener = (props: { map: moorhen.Map }) => {
    const mapAlpha = useSelector((state: moorhen.State) => state.mapContourSettings.mapAlpha.find((item) => item.molNo === props.map.molNo));
    useEffect(() => {
        props.map.fetchMapAlphaAndRedraw();
    }, [mapAlpha]);

    return null;
}
