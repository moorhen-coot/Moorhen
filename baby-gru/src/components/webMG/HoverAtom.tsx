import { useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { moorhen } from "../../types/moorhen";

/**
 * The styles that actually put individual atoms on the screen.
 *
 * A hover ball is a sphere at an atom's position, so it only means anything where that atom is
 * drawn. On a molecule shown as ribbons or as a surface it would hang in space beside geometry
 * that never mentions the atom it is marking.
 */
const ATOM_LEVEL_STYLES = ["CBs", "CAs", "VdwSpheres", "ligands"];

const showsIndividualAtoms = (molecule: moorhen.Molecule): boolean =>
    molecule?.representations?.some(
        representation => representation.visible && ATOM_LEVEL_STYLES.includes(representation.style)
    ) ?? false;

export const DrawHoverAtom = () => {
    const lastHoveredAtomRef = useRef<null | moorhen.HoveredAtom>(null);
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const drawHover = async () => {
        const molecule = hoveredAtom?.molecule;

        // Drawing the ball is a separate question from being hovered. The hover state stands
        // whatever happens here - the info panel and the sequence highlight read it, and a hover
        // can now come from somewhere other than the mouse landing on an atom - but the ball
        // itself is only drawn where there are atoms on screen for it to sit on.
        const shouldDraw = !!(molecule && hoveredAtom.cid && showsIndividualAtoms(molecule));

        if (shouldDraw) {
            if (
                lastHoveredAtomRef.current == null ||
                molecule !== lastHoveredAtomRef.current.molecule ||
                hoveredAtom.cid !== lastHoveredAtomRef.current.cid
            ) {
                await molecule.drawHover(hoveredAtom.cid); //this takes 25ms seems way too much
            }
        } else if (molecule) {
            molecule.clearBuffersOfStyle("hover");
        }

        if (
            lastHoveredAtomRef.current !== null &&
            lastHoveredAtomRef.current.molecule !== null &&
            lastHoveredAtomRef.current.molecule !== molecule
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
