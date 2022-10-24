import { createRef, Fragment, useEffect } from "react";
import { Row, Form } from "react-bootstrap";
import BabyGruSlider from "./BabyGruSlider";


export const BabyGruMapSettings = (props) => {
    const busyContouring = createRef(false)

    useEffect(() => {
    }, [])

    const recontourActiveMap = (newLevel) => {
        if (props.activeMap) {
            props.activeMap.contourLevel = newLevel
            if (props.activeMap.cootContour) {
                if (busyContouring.current) {
                }
                else {
                    busyContouring.current = true
                    props.activeMap.doCootContour(props.glRef.current,
                        ...props.glRef.current.origin,
                        props.mapRadius,
                        props.activeMap.contourLevel)
                        .then(result => {
                            busyContouring.current = false
                        })
                }
            }
        }
    }

    return <Fragment>
        <Row className="mx-auto" style={{ marginTop: '2rem', width: '20rem' }}>
            <Form.Group style={{ width: '20rem' }} controlId="downloadCoords" className="mb-3">
                <Form.Label>Coot contouring radius</Form.Label>
                <Form.Control type="number" value={props.mapRadius} onChange={(e) => {
                    props.setMapRadius(parseFloat(e.target.value))
                }} />
            </Form.Group>
        </Row>
        <Row>
            <Form.Group style={{ width: '20rem' }} controlId="Contouring level" className="mb-3">
                <Form.Label>Contour level</Form.Label>
                <BabyGruSlider minVal={0.01} maxVal={50} logScale={true} setExternalValue={recontourActiveMap} />
            </Form.Group>
        </Row>
    </Fragment>
}

