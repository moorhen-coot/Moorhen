import { useEffect } from "react";
import { Table } from "react-bootstrap";

export const BabyGruMaps = (props) => {
    useEffect(() => {
    }, [])

    return <Table key="BabyGruMaps">
        <thead><tr><th>Number</th><th>Name</th></tr></thead>
        <tbody>
            {
                props.maps.map(map => <tr key={map.mapMolNo} >
                    <th>{map.mapMolNo}</th><th>{map.name}</th>
                </tr>)
            }
        </tbody>
    </Table>
}