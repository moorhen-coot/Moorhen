import { Fragment, useEffect } from "react";
import { Table, Button, Row, Col } from "react-bootstrap";
import { doDownload } from "../BabyGruUtils";
import { Download } from 'react-bootstrap-icons';

export const BabyGruMaps = (props) => {
    useEffect(() => {
    }, [])

    return <Fragment>
        <Row><Col><div style={{ height: "1rem" }} /></Col></Row>
        <Table key="BabyGruMaps">
            <thead><tr><th>Number</th><th>Name</th><th>Download</th></tr></thead>
            <tbody>
                {
                    props.maps.map(map => <tr key={map.mapMolNo} >
                        <th>{map.mapMolNo}</th><th>{map.name}</th>
                        <th>            <Button onClick={() => {
                            map.getMap()
                                .then(reply => {
                                    doDownload([reply.data.result.mapData],
                                        `${map.name.replace('.mtz', '.map')}`
                                    )
                                })
                        }}><Download />
                        </Button>
                        </th>
                    </tr>)
                }
            </tbody>
        </Table>
    </Fragment>
}