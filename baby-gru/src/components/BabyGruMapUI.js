import { Fragment, useEffect, useState } from "react";
import { Table, Button, Row, Col, Form } from "react-bootstrap";
import { doDownload } from "../BabyGruUtils";
//import { Download } from 'react-bootstrap-icons';

export const BabyGruMaps = (props) => {
    const [mapRadius, setMapRadius] = useState(50.)

    useEffect(() => {
    }, [])

    return <Fragment>
        <Row>
            <Form.Group style={{ width: '20rem' }} controlId="downloadCoords" className="mb-3">
                <Form.Label>Coot contouring radius</Form.Label>
                <Form.Control type="number" value={mapRadius} onChange={(e) => {
                    console.log(e.target.value)
                    setMapRadius(e.target.value)
                }} />
            </Form.Group>

        </Row>
        <Table key="BabyGruMaps">
            <thead><tr><th>Active</th><th>Number</th><th>Name</th><th>Download</th><th>Coot</th></tr></thead>
            <tbody>
                {
                    props.maps.map(map => <tr key={map.mapMolNo} >
                        <td>
                            <Form.Check checked={map === props.activeMap}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        props.setActiveMap(map)
                                    }
                                }}
                            />
                        </td>
                        <td>{map.mapMolNo}</td>
                        <td>{map.name}</td>
                        <td>
                            <Button size="sm" onClick={() => {
                                map.getMap()
                                    .then(reply => {
                                        doDownload([reply.data.result.mapData],
                                            `${map.name.replace('.mtz', '.map')}`
                                        )
                                    })
                            }}>
                                Down
                            </Button>
                        </td>
                        <td>
                            <Button size="sm" onClick={() => {
                                map.cootContour(props.glRef.current,
                                    -props.glRef.current.origin[0],
                                    -props.glRef.current.origin[1],
                                    -props.glRef.current.origin[2],
                                    mapRadius, 0.5)
                            }}>
                                Contour
                            </Button>
                        </td>
                    </tr>)
                }
            </tbody>
        </Table>
    </Fragment>
}