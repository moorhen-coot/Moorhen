import { Fragment, useEffect } from "react";
import { Table, Button, Row, Col, Form } from "react-bootstrap";
import { doDownload } from "../BabyGruUtils";
//import { Download } from 'react-bootstrap-icons';

export const BabyGruMaps = (props) => {
    useEffect(() => {
    }, [])

    return <Fragment>
        <Row>
            <Col><div style={{ height: "1rem" }} /></Col>
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
                                    0.,0.,0.,15.,0.5)
                            }}>
                                Down
                            </Button>
                        </td>
                    </tr>)
                }
            </tbody>
        </Table>
    </Fragment>
}