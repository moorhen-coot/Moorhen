import { Form } from "react-bootstrap";
import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from "react";
import { moorhen } from "../../types/moorhen";
import { setActiveMap } from "../../store/generalStatesSlice";
import { removeMap } from "../../store/mapsSlice";
import { removeMolecule } from "../../store/moleculesSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenDeleteDisplayObjectMenuItem = (props: {
    item: moorhen.Map | moorhen.Molecule;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const dispatch = useDispatch()

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Are you sure?</span>
        </Form.Group>
    </>

    const onCompleted = useCallback(() => {
        props.item.delete()
        props.setPopoverIsShown(false)
        if (props.item.type === "map") {
            if (activeMap?.molNo === props.item.molNo) {
                if (maps.length > 1) {
                    const newActiveMap = maps.find(map => map.molNo !== props.item.molNo)
                    dispatch( setActiveMap(newActiveMap) )
                } else {
                    dispatch( setActiveMap(null) )
                }
            }
            dispatch( removeMap(props.item as moorhen.Map) )
        } else if(props.item.type === "molecule") {
            dispatch( removeMolecule(props.item as moorhen.Molecule) )
        } else {
            console.warn('Attempted to delete item of unknown type ', props.item.type)
        }
    }, [activeMap, maps])

    return <MoorhenBaseMenuItem
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="Delete"
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={props.item.type === 'molecule' ? "Delete molecule" : "Delete map"}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
