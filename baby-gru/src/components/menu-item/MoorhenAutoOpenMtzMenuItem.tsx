import { useCallback, useRef } from "react"
import { Form, Row } from "react-bootstrap"
import { useDispatch } from 'react-redux';
import { Store } from "@reduxjs/toolkit";
import { useSnackbar } from "notistack"
import { MoorhenMap } from "../../utils/MoorhenMap"
import { MoorhenMtzWrapper } from "../../utils/MoorhenMtzWrapper"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL"
import { libcootApi } from "../../types/libcoot"
import { setActiveMap } from "../../store/generalStatesSlice"
import { addMap, addMapList } from "../../store/mapsSlice"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenAutoOpenMtzMenuItem = (props: {
    store: Store;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const filesRef = useRef<null | HTMLInputElement>(null)

    const { enqueueSnackbar } = useSnackbar()

    const dispatch = useDispatch()

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMTZ" className="mb-3">
                <Form.Label>Auto open MTZ file</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept=".mtz" />
            </Form.Group>
        </Row>
    </>

    const onCompleted = useCallback(async () => {
        if (filesRef.current.files.length === 0) {
            return
        }

        try {
            const file = filesRef.current.files[0]
            const newMaps = await MoorhenMap.autoReadMtz(file, props.commandCentre);    
            if (newMaps.length === 0) {
                enqueueSnackbar('Error reading mtz file', {variant: "error"})
            } else {
                dispatch( addMapList(newMaps) )
                dispatch( setActiveMap(newMaps[0]) )    
            }
        } catch (err) {
            console.warn(err)
            enqueueSnackbar('Error reading mtz file', {variant: "error"})
        }
        
    }, [filesRef.current, props.commandCentre, props.glRef])

    return <MoorhenBaseMenuItem
        id='auto-open-mtz-menu-item'
        popoverContent={panelContent}
        menuItemText="Auto open MTZ..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

