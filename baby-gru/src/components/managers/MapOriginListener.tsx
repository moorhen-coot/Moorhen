import { useEffect} from "react";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";

export const MapOriginListener= (props: { drawMap(now: number): void; }) => {
    const currentOrigin = useSelector((state: moorhen.State) => state.glRef.origin);

    useEffect(() => {
        {
            const now = Date.now();
            props.drawMap(now);
        }
    }, [currentOrigin]);


    return null;
};

export const MapOriginListenerMousseUp= (props: { drawMap(now: number): void; }) => {
    useEffect(() => {
        const handleMouseUp = (event) => {
            const now = Date.now();
            props.drawMap(now);
        }
        document.addEventListener('mouseup', handleMouseUp , { capture: true });              
        return () => {
            document.removeEventListener('mouseup', handleMouseUp , { capture: true });

        };
    }, []);

    return null;
};