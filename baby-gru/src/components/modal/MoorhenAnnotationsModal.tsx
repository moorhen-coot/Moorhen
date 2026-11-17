import { useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import type { RootState } from "../../store/MoorhenReduxStore";
import { addAnnotation, newAnnotation, removeAnnotationById, updateAnnotation } from "../../store/annotationsSlice";
import type { AnnotationPositionMode, MoorhenAnnotation } from "../../store/annotationsSlice";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenButton, MoorhenCoordinateInput, MoorhenSelect, MoorhenTextStyleEditor, MoorhenToggle } from "../inputs";
import { MoorhenCidAndMoleculeSelect } from "../inputs/Cid/CidAndMoleculeSelect";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

/** What the chooser shows for an annotation: its text, and where it is. */
const describeAnnotation = (annotation: MoorhenAnnotation): string => {
    const text = annotation.text.length > 30 ? annotation.text.substring(0, 30) + "..." : annotation.text;
    const where =
        annotation.positionMode === "atom"
            ? annotation.cid
            : [annotation.x, annotation.y, annotation.z].map(coord => coord.toFixed(1)).join(" ");
    return `${annotation.latex ? "LaTeX" : "Text"}: ${text} (${where})`;
};

/**
 * Create and edit 3D annotations: text placed in the scene at a point or on atoms.
 *
 * Laid out as the vectors panel is: choose one (or New), change it, Apply.
 */
export const MoorhenAnnotations = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const annotationsList = useSelector((state: RootState) => state.annotations.annotationsList);

    /** A new annotation, at the centre of the view so that it can be seen as soon as it is applied. */
    const freshAnnotation = (): MoorhenAnnotation => {
        const origin = store.getState().sceneSettings.origin;
        return newAnnotation({ x: -origin[0], y: -origin[1], z: -origin[2], uniqueId: uuidv4() });
    };

    const [theAnnotation, setTheAnnotation] = useState<MoorhenAnnotation>(freshAnnotation);
    const [selectedOption, setSelectedOption] = useState<string>("new");
    const selectRef = useRef<HTMLSelectElement>(null);

    const isExisting = selectedOption !== "new" && annotationsList.some(a => a.uniqueId === selectedOption);

    const update = (changes: Partial<MoorhenAnnotation>) => {
        setTheAnnotation(prev => ({ ...prev, ...changes }));
    };

    const handleSelect = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const id = evt.target.value;
        if (id === "new") {
            setSelectedOption("new");
            setTheAnnotation(freshAnnotation());
            return;
        }
        const existing = annotationsList.find(a => a.uniqueId === id);
        if (existing) {
            setSelectedOption(id);
            setTheAnnotation({ ...existing });
        }
    };

    const handleApply = () => {
        if (isExisting) {
            const { uniqueId, ...changes } = theAnnotation;
            dispatch(updateAnnotation({ uniqueId, changes }));
        } else {
            dispatch(addAnnotation(theAnnotation));
            setSelectedOption(theAnnotation.uniqueId);
        }
    };

    const handleDelete = () => {
        dispatch(removeAnnotationById(theAnnotation.uniqueId));
        setSelectedOption("new");
        setTheAnnotation(freshAnnotation());
    };

    const setPositionMode = (mode: AnnotationPositionMode) => update({ positionMode: mode });

    const currentOrigin = () => {
        const origin = store.getState().sceneSettings.origin;
        update({ x: -origin[0], y: -origin[1], z: -origin[2] });
    };

    const locked = isExisting && !!theAnnotation.locked;

    return (
        <>
            <MoorhenStack card inputGrid>
                <MoorhenSelect ref={selectRef} label="Annotation" value={selectedOption} onChange={handleSelect}>
                    <option value="new">New annotation</option>
                    {annotationsList.map(annotation => (
                        <option key={annotation.uniqueId} value={annotation.uniqueId}>
                            {describeAnnotation(annotation)}
                        </option>
                    ))}
                </MoorhenSelect>
            </MoorhenStack>
            <MoorhenStack card>
                Position
                <MoorhenToggle
                    inline
                    label="Point"
                    name="annotationpositiongroup"
                    type="radio"
                    checked={theAnnotation.positionMode === "point"}
                    onChange={() => setPositionMode("point")}
                />
                <MoorhenToggle
                    inline
                    label="Atom"
                    name="annotationpositiongroup"
                    type="radio"
                    checked={theAnnotation.positionMode === "atom"}
                    onChange={() => setPositionMode("atom")}
                />
            </MoorhenStack>
            {theAnnotation.positionMode === "atom" && (
                <MoorhenStack card inputGrid>
                    <MoorhenCidAndMoleculeSelect
                        selectedMoleculeUniqueId={theAnnotation.molUniqueId}
                        selectedCid={theAnnotation.cid}
                        setSelectedMoleculeUniqueId={uid => update({ molUniqueId: uid })}
                        setSelectedCid={cid => update({ cid })}
                    />
                </MoorhenStack>
            )}
            {theAnnotation.positionMode === "point" && (
                <MoorhenCoordinateInput
                    value={[theAnnotation.x, theAnnotation.y, theAnnotation.z]}
                    onChange={([x, y, z]) => update({ x, y, z })}
                >
                    <MoorhenButton size="sm" onClick={currentOrigin} tooltip="Put the annotation at the centre of the view">
                        Current origin
                    </MoorhenButton>
                </MoorhenCoordinateInput>
            )}
            <MoorhenStack card inputGrid>
                <MoorhenTextStyleEditor value={theAnnotation} onChange={changes => update(changes)} />
                <span>Always on top</span>
                <MoorhenToggle label="" checked={!!theAnnotation.alwaysOnTop} onChange={evt => update({ alwaysOnTop: evt.target.checked })} />
            </MoorhenStack>
            <MoorhenStack direction="line">
                {isExisting && (
                    <MoorhenButton className="m-2" variant="danger" onClick={handleDelete}>
                        Delete
                    </MoorhenButton>
                )}
                <MoorhenButton className="m-2" onClick={handleApply} disabled={locked}>
                    Apply
                </MoorhenButton>
                {locked && <span>Locked by its owner</span>}
            </MoorhenStack>
        </>
    );
};

export const MoorhenAnnotationsModal = () => {
    const width = useSelector((state: RootState) => state.sceneSettings.width);
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const resizeNodeRef = useRef<HTMLDivElement>(null);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.ANNOTATIONS}
            left={width / 6}
            top={height / 3}
            minHeight={50}
            minWidth={convertRemToPx(25)}
            maxHeight={convertViewtoPx(70, height)}
            maxWidth={convertViewtoPx(90, width)}
            enforceMaxBodyDimensions={true}
            overflowY="auto"
            overflowX="auto"
            headerTitle="Annotations"
            resizeNodeRef={resizeNodeRef}
            body={<MoorhenAnnotations />}
            footer={null}
        />
    );
};
