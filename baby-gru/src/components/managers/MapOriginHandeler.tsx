import { useEffect } from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";

export const MapOriginHandeler = (props:{ drawMap(now:number): void}) => {

    const currentOrigin = useSelector((state: moorhen.State) => state.glRef.origin);
    const now = Date.now()

    useEffect(() => props.drawMap(now), [currentOrigin])

    return null

}