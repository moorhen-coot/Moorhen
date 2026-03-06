
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../../../types/moorhen";

export const MapAlphaListener = (props: { map: moorhen.Map }) => {
    const mapAlpha = useSelector((state: moorhen.State) => state.mapContourSettings.mapAlpha.find((item) => item.molNo === props.map.molNo));
    useEffect(() => {
        props.map.fetchMapAlphaAndRedraw();
    }, [mapAlpha]);

    return null;
}
