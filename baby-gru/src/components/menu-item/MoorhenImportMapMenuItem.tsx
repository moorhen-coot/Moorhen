import { useCallback, useRef } from "react"
import { Button, Col, Form, Row } from "react-bootstrap"
import { MoorhenMap } from "../../utils/MoorhenMap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { setActiveMap } from "../../store/generalStatesSlice";
import { batch, useDispatch, useSelector } from 'react-redux';
import { addMap } from "../../store/mapsSlice";
import { Store } from "@reduxjs/toolkit";
import { useSnackbar } from "notistack";

export const MoorhenImportMapMenuItem = (props: { 
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    store: Store;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const filesRef = useRef<null | HTMLInputElement>(null)
    const isDiffRef = useRef<undefined | HTMLInputElement>(null)

    const { enqueueSnackbar } = useSnackbar()

    const readMap = useCallback(async () => {
        if (filesRef.current.files.length > 0) {
            const file = filesRef.current.files[0]
            const newMap = new MoorhenMap(props.commandCentre, props.glRef, props.store)
            try {
                try {
                    await newMap.loadToCootFromMapFile(file, isDiffRef.current.checked)
                } catch (err) {
                    // Try again if this is a compressed file...
                    if (file.name.includes('.gz')) {
                        await newMap.loadToCootFromMapFile(file, isDiffRef.current.checked, true)
                    } else {
                        console.warn(err)
                        throw new Error("Cannot read the fetched map...")
                    }
                }
                if (newMap.molNo === -1) {
                    throw new Error('Cannot read the map file!')
                }
                if (molecules.length === 0 && maps.length === 0) {
                    await newMap.centreOnMap()
                }
                batch(() => {
                    dispatch( addMap(newMap) )
                    dispatch( setActiveMap(newMap) )
                })
            } catch (err) {
                console.warn(err)
                enqueueSnackbar('Error reading map file', {variant: "error"})
                console.log(`Cannot read file`)
            } finally {
                props.setPopoverIsShown(false)
                document.body.click()
            }
        }
    }, [filesRef.current, isDiffRef.current, props.glRef, props.commandCentre, molecules, maps])

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadCCP4Map" className="mb-3">
                <Form.Label>CCP4/MRC Map...</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept=".map, .mrc, .map.gz, .mrc.gz" />
            </Form.Group>
        </Row>
        <Row style={{ marginBottom: "1rem" }}>
            <Col>
                <Form.Check label={'is diff map'} name={`isDifference`} type="checkbox" ref={isDiffRef} />
            </Col>
        </Row>
        <Button variant="primary" onClick={readMap}>
            OK
        </Button>
    </>

    return <MoorhenBaseMenuItem
        id='import-map-menu-item'
        popoverContent={panelContent}
        menuItemText="CCP4/MRC map..."
        onCompleted={() => {}}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

