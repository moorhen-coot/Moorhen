import { useEffect } from "react";
import { moorhen } from "../../../src/types/moorhen";
import { webGL } from "../../../src/types/mgWebGL";

export const MoorhenExitMenu = (props: {
    molecules: moorhen.Molecule[];
    glRef: React.RefObject<webGL.MGWebGL>;
    exitCallback: () => Promise<void>;
}) => {

    useEffect(() => {
        props.exitCallback()
    }, [])

    return <span>Saving...</span>
}