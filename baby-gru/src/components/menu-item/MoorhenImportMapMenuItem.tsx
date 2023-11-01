import { useCallback, useRef } from "react"
import { Col, Form, Row } from "react-bootstrap"
import { MoorhenMap } from "../../utils/MoorhenMap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { setActiveMap, setNotificationContent } from "../../store/generalStatesSlice";
import { batch, useDispatch, useSelector } from 'react-redux';
import { addMap } from "../../store/mapsSlice";

export const MoorhenImportMapMenuItem = (props: { 
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    getWarningToast: (arg0: string) => JSX.Element;
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const filesRef = useRef<null | HTMLInputElement>(null)
    const isDiffRef = useRef<undefined | HTMLInputElement>()

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
    </>

    const onCompleted = useCallback(async () => {
        if (filesRef.current.files.length > 0) {
            const file = filesRef.current.files[0]
            const newMap = new MoorhenMap(props.commandCentre, props.glRef)
            try {
                await newMap.loadToCootFromMapFile(file, isDiffRef.current.checked)
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
                dispatch(setNotificationContent(props.getWarningToast('Error reading map file')))
                console.log(`Cannot read file`)    
            }
        }
    }, [filesRef.current, isDiffRef.current, props.glRef, props.commandCentre, molecules, maps])

    return <MoorhenBaseMenuItem
        id='import-map-menu-item'
        popoverContent={panelContent}
        menuItemText="CCP4/MRC map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

