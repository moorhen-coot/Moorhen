import { useEffect, Fragment, useState } from "react";
import { Table, Card, Form } from "react-bootstrap";

export const BabyGruMoleculeUI = (props) => {
    const [showState, setShowState] = useState({})

    useEffect(() => {
        const initialState = {}
        Object.keys(props.molecule.displayObjects).forEach(key => {
            initialState[key] = props.molecule.displayObjects[key].length > 0 
            //&& props.molecule.displayObjects[key][0].visible
        })
        setShowState(initialState)
    }, [props.molecule.displayObjects.bonds.length,
        props.molecule.displayObjects.sticks.length,
        props.molecule.displayObjects.ribbons.length])

    return <Card key={props.molecule.coordMolNo}>
        <Card.Title>{`Mol ${props.molecule.coordMolNo}:${props.molecule.name}`}</Card.Title>
        <Card.Body>
            {
                Object.keys(props.molecule.displayObjects).map(key => {
                    return <Form.Check
                        inline
                        label={`${key}`}
                        name={key}
                        type="checkbox"
                        checked={showState[key]}
                        onChange={(e) => {
                            if (e.target.checked) {
                                props.molecule.show(key, props.glRef)
                                const changedState = { ...showState }
                                changedState[key] = true
                                setShowState(changedState)
                            }
                            else {
                                props.molecule.hide(key, props.glRef)
                                const changedState = { ...showState }
                                changedState[key] = false
                                setShowState(changedState)
                            }
                        }}
                    />
                })
            }
        </Card.Body>
    </Card>
}

export const BabyGruMolecules = (props) => {
    useEffect(() => {
    }, [])

    return <Fragment>
        {
            props.molecules.map(molecule => <BabyGruMoleculeUI key={molecule.coordMolNo}
                molecule={molecule}
                glRef={props.glRef}>
            </BabyGruMoleculeUI>
            )
        }
    </Fragment>
}

