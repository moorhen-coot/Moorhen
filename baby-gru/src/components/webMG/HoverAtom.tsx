import { useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { moorhen } from "../../types/moorhen";

export const DrawHoverAtom = () => {
    const lastHoveredAtomRef = useRef<null | moorhen.HoveredAtom>(null);
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const drawHover = async () => {
        if (hoveredAtom && hoveredAtom.molecule && hoveredAtom.cid) {
            if (
                lastHoveredAtomRef.current == null ||
                hoveredAtom.molecule !== lastHoveredAtomRef.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtomRef.current.cid
            ) {
                await hoveredAtom.molecule.drawHover(hoveredAtom.cid); //this takes 25ms seems way too much
            }
        }

        if (
            lastHoveredAtomRef.current !== null &&
            lastHoveredAtomRef.current.molecule !== null &&
            lastHoveredAtomRef.current.molecule !== hoveredAtom.molecule
        ) {
            lastHoveredAtomRef.current.molecule.clearBuffersOfStyle("hover");
        }
        lastHoveredAtomRef.current = hoveredAtom;
    };

    useEffect(() => {
        drawHover();
    }, [hoveredAtom]);
    return null;
};
