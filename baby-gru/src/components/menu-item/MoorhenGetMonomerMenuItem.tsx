import { useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch } from 'react-redux';
import { addMolecule } from "../../store/moleculesSlice";

export const MoorhenGetMonomerMenuItem = (props: {
    glRef: React.RefObject<webGL.MGWebGL>
    popoverPlacement?: 'left' | 'right'
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    monomerLibraryPath: string;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)

    const tlcRef = useRef<HTMLInputElement>()
    const selectRef = useRef<HTMLSelectElement | null>(null)

    const panelContent = <>
        <Form.Group className='moorhen-form-group' controlId="MoorhenGetMonomerMenuItem">
            <Form.Label>Monomer identifier</Form.Label>
            <Form.Control ref={tlcRef} type="text" />
        </Form.Group>
        <MoorhenMoleculeSelect molecules={molecules} allowAny={true} ref={selectRef} />
    </>


    const onCompleted = async () => {
        const fromMolNo = parseInt(selectRef.current.value)
        const newTlc = tlcRef.current.value.toUpperCase()
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibraryPath)

        if (!newTlc || !selectRef.current.value) {
            return
        }

        const getMonomer = () => {
            return props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [newTlc, fromMolNo,
                    ...props.glRef.current.origin.map(coord => -coord)
                ]
            }, true) as Promise<moorhen.WorkerResponse<number>>
        }

        let result = await getMonomer()
        
        if (result.data.result.result === -1) {
            await newMolecule.loadMissingMonomer(newTlc, fromMolNo)
            result = await getMonomer()
        } 
        
        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            newMolecule.molNo = result.data.result.result
            newMolecule.name = newTlc
            newMolecule.setBackgroundColour(props.glRef.current.background_colour)
            newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
            const fromMolecule = molecules.find(molecule => molecule.molNo === fromMolNo)
            if (typeof fromMolecule !== 'undefined') {
                const ligandDict = fromMolecule.getDict(newTlc)
                if (ligandDict) {
                    await newMolecule.addDict(ligandDict)
                }
            }
            await newMolecule.fetchIfDirtyAndDraw('CBs')
            dispatch( addMolecule(newMolecule) )
        } else {
            console.log('Error getting monomer... Missing dictionary?')
        }
    }

    return <MoorhenBaseMenuItem
        id='get-monomer-menu-item'
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenGetMonomerMenuItem.defaultProps = { popoverPlacement: "right" }
