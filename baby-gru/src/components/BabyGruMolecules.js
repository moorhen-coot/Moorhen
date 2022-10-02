import { useEffect } from "react";
import { Table } from "react-bootstrap";

export const BabyGruMolecules = (props) => {
    useEffect(() => {
    }, [])

    return <Table key="BabyGruMolecules">
        <thead><tr><th>Number</th><th>Name</th></tr></thead>
        <tbody>
            {
                props.molecules.map(molecule => <tr key="molecule.coordMolNo">
                    <th>{molecule.coordMolNo}</th><th>{molecule.name}</th>
                </tr>)
            }
        </tbody>
    </Table>
}