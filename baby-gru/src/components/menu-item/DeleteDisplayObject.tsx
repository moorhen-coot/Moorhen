import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import { setActiveMap } from "../../store/generalStatesSlice";
import { removeMap } from "../../store/mapsSlice";
import { removeMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const DeleteDisplayObject = (props: { item: moorhen.Map | moorhen.Molecule }) => {
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const menuItemText = props.item.type === "molecule" ? "Delete molecule" : "Delete map";
    const dispatch = useDispatch();

    const onCompleted = useCallback(() => {
        props.item.delete();
        if (props.item.type === "map") {
            if (activeMap?.molNo === props.item.molNo) {
                if (maps.length > 1) {
                    const newActiveMap = maps.find(map => map.molNo !== props.item.molNo);
                    dispatch(setActiveMap(newActiveMap));
                } else {
                    dispatch(setActiveMap(null));
                }
            }
            dispatch(removeMap(props.item as moorhen.Map));
        } else if (props.item.type === "molecule") {
            dispatch(removeMolecule(props.item as moorhen.Molecule));
        } else {
            console.warn("Attempted to delete item of unknown type ", props.item.type);
        }
    }, [activeMap, maps]);

    return (
        <MoorhenStack justify="center" align="center" gap="0.5rem">
            <span style={{ fontWeight: "bold" }}>Are you sure?</span>
            <MoorhenButton onClick={onCompleted} variant="danger">
                Yes delete
            </MoorhenButton>
        </MoorhenStack>
    );
};
