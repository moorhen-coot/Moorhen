import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setSelectedThreeDObject } from "../../store/generalStatesSlice";
import { MOORHEN_3D_OBJECT_TAG_KIND } from "../../utils/enums";

/**
 * Choosing which 3D object the manipulation handles belong to, by clicking it.
 *
 * The renderer reports that something was clicked and hands over the label it was carrying,
 * without knowing what the label means or whether anyone is listening. Here that label is read
 * as an object id - but only if it is in this scheme, so a click on anything else labelled in
 * some other way passes by untouched.
 *
 * Clicking nothing clears the selection, which is the only way to put the handles away without
 * going back to the dialog.
 */
export const SelectClickedObject = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const onClick = (event: CustomEvent) => {
            const { tag, kind } = event.detail;
            if (tag && kind !== MOORHEN_3D_OBJECT_TAG_KIND) {
                // Something was clicked, but it is not ours to interpret. Leaving the selection
                // alone is the right answer: clearing it would make an unrelated click - on a
                // handle's own label, say - throw away what the user had chosen.
                return;
            }
            dispatch(setSelectedThreeDObject(tag ?? null));
        };

        document.addEventListener("meshClicked", onClick);
        return () => document.removeEventListener("meshClicked", onClick);
    }, [dispatch]);

    return null;
};
