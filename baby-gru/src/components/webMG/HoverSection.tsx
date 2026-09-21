import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { setHoveredSection } from "../../store/hoveringStatesSlice";
import { setRequestDrawScene } from "../../store/glRefSlice";
import { MOORHEN_ATOM_TAG_KIND, moorhenAtomTagKey } from "../../utils/enums";
import { cidToSpec } from "../../utils/utils";

/**
 * The reciprocal of the bridge in MainContainer: an atom is hovered, so light the piece of mesh
 * that stands for it.
 *
 * The same opaque labels carry the meaning in both directions. There a section's label became an
 * atom hover; here an atom hover is turned back into a label and looked for among the meshes.
 * Neither the mesh code nor the molecular code learns anything about the other - this component
 * and the label scheme are the whole of the coupling.
 *
 * The hover may have come from the sequence viewer, a validation plot, or the pointer landing on
 * an atom in the 3D view. None of that matters here: whatever set hoveredAtom gets the same
 * reciprocal highlight, which is why hovering an atom also lights the trace that passes through
 * it. Whether a golden ball appears alongside is a separate question, settled by DrawHoverAtom
 * according to whether the molecule is showing its atoms.
 */
export const HighlightHoveredSection = () => {
    const dispatch = useDispatch();
    const hoveredAtom = useSelector((state: RootState) => state.hoveringStates.hoveredAtom);
    const displayBuffers = useSelector((state: RootState) => state.glRef.displayBuffers);
    // What was last published, so that a rebuild of the display buffers - which happens whenever
    // any 3D object changes - does not dispatch an identical highlight and redraw over and over.
    const lastPublishedRef = useRef<string | null>(null);

    useEffect(() => {
        // Matched on the residue rather than on the CID string. A CID's shape depends on who
        // wrote it - the sequence viewer's "/0/A/36" and an atom hover's "/5a3h/A/36(GLY)/CA"
        // name the same residue and share not one character - so the raw strings cannot be
        // compared. cidToSpec reduces either to a chain and a number.
        let target: string | null = null;
        if (hoveredAtom?.molecule && hoveredAtom.cid) {
            const spec = cidToSpec(hoveredAtom.cid);
            if (spec?.chain_id && Number.isFinite(spec.res_no)) {
                target = moorhenAtomTagKey(hoveredAtom.molecule.uniqueId, spec.chain_id, spec.res_no);
            }
        }

        let found: { bufferId: string; section: number } | null = null;
        if (target) {
            for (const buffer of displayBuffers ?? []) {
                const pickInfo = buffer.pick_info;
                if (!pickInfo?.pick_point_tags || pickInfo.pick_tag_kind !== MOORHEN_ATOM_TAG_KIND) {
                    // Either it has no labels, or they are in a scheme this does not speak.
                    continue;
                }
                // The key is the leading part of the tag, so this is a prefix test and no tag has
                // to be parsed - which matters because this runs again every time the display
                // buffers are rebuilt, and that is once a frame while an object is dragged.
                const index = pickInfo.pick_point_tags.findIndex(tag => tag.startsWith(`${target}|`));
                if (index > -1) {
                    const sections = pickInfo.pick_point_sections;
                    found = { bufferId: buffer.id, section: sections ? sections[index] : index };
                    break;
                }
            }
        }

        const published = found ? `${found.bufferId}:${found.section}` : null;
        if (published === lastPublishedRef.current) {
            return;
        }
        lastPublishedRef.current = published;
        dispatch(setHoveredSection(found));
        // Nothing else will notice: the highlight is read inside the draw loop rather than by a
        // component, so the scene has to be asked for.
        dispatch(setRequestDrawScene(true));
    }, [hoveredAtom, displayBuffers, dispatch]);

    return null;
};
