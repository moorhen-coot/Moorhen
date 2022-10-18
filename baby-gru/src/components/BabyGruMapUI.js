import { Fragment, useEffect, useState } from "react";
import { Table, Button, Row, Col, Form, FormCheck } from "react-bootstrap";
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
                    setMapRadius(e.target.value)
                }} />
            </Form.Group>

        </Row>
        <Table key="BabyGruMaps">
            <thead><tr><th>Active</th><th>No.</th><th>Name</th><th>Download</th><th>WC</th><th>CC</th></tr></thead>
            <tbody>
                {
                    props.maps.map(map => <BabyGruMapRow {...props}
                        map={map}
                    />)
                }
            </tbody>
        </Table>
    </Fragment>
}

const BabyGruMapRow = (props) => {
    const [webMGContour, setWebMGContour] = useState(true)
    const [cootContour, setCootContour] = useState(true)

    useEffect(() => {
        setWebMGContour(props.map.webMGContour)
        setCootContour(props.map.cootContour)
    }, [])

    useEffect(() => {
        setWebMGContour(props.map.webMGContour)
        setCootContour(props.map.cootContour)
    }, [props.map.webMGContour, props.map.cootContour])

    return <tr key={props.map.mapMolNo} >
        <td>
            <Form.Check checked={props.map === props.activeMap}
                onChange={(e) => {
                    if (e.target.checked) {
                        props.setActiveMap(props.map)
                    }
                }}
            />
        </td>
        <td>{props.map.mapMolNo}</td>
        <td>{props.map.name}</td>
        <td>
            <Button size="sm" onClick={() => {
                props.map.getMap()
                    .then(reply => {
                        doDownload([reply.data.result.mapData],
                            `${props.map.name.replace('.mtz', '.map')}`
                        )
                    })
            }}>
                Down
            </Button>
        </td>
        <td>
            <FormCheck checked={webMGContour}
                onChange={(newState) => {
                    if (newState.target.checked && !webMGContour) {
                        props.map.makeWebMGLive(props.glRef.current)
                        setWebMGContour(true)
                    }
                    else if (!newState.target.checked && webMGContour) {
                        props.map.makeWebMGUnlive(props.glRef.current)
                        setWebMGContour(false)
                    }
                }} />
        </td>
        <td>
            <FormCheck checked={cootContour}
                onChange={(newState) => {
                    if (newState.target.checked && !cootContour) {
                        props.map.makeCootLive(props.glRef.current)
                        setCootContour(true)
                    }
                    else if (!newState.target.checked && cootContour) {
                        props.map.makeCootUnlive(props.glRef.current)
                        setCootContour(false)
                    }
                }} />
        </td>

            {/*<Button size="sm" onClick={() => {
            map.cootContour(props.glRef.current,
                -props.glRef.current.origin[0],
                -props.glRef.current.origin[1],
                -props.glRef.current.origin[2],
                mapRadius, 0.5)
        }}>
            Contour
    </Button>*/}
    </tr>
}