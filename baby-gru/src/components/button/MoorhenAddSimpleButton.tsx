import React, { useCallback, useRef } from "react"
import { moorhen } from "../../types/moorhen";
import { MoorhenEditButtonBase } from "./MoorhenEditButtonBase";
import { Container } from "react-bootstrap";
import { MenuItem, MenuList } from "@mui/material";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const MoorhenAddSimpleButton = (props: moorhen.EditButtonProps) => {
    const selectRef = useRef<HTMLSelectElement>()
    const molTypes = ['HOH', 'SO4', 'PO4', 'GOL', 'CIT', 'EDO', 'IOD', 'NA', 'CA']

    const onTypeSelectedCallback = useCallback(async (value: string) => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(selectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.addLigandOfType(value, props.glRef)
            props.setSelectedButtonIndex(null)
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: selectedMolecule.molNo } })
            document.dispatchEvent(scoresUpdateEvent)
        }
    }, [props.molecules, props.glRef])   
    
    const MoorhenAddSimplePanel = (props: {
        molecules: moorhen.Molecule[]; 
        selectRef: React.RefObject<HTMLSelectElement>;
        onTypeSelectedCallback: (arg0: string) => Promise<void>;
    }) => {
        return <Container>
            <MenuList>
                {molTypes.map(molType => {
                    return <MenuItem key={molType} onClick={() => { props.onTypeSelectedCallback(molType) }}>{molType}</MenuItem>
                })}
            </MenuList>
            <MoorhenMoleculeSelect {...props} allowAny={false} ref={props.selectRef} />
        </Container>
    }   
        
    return <MoorhenEditButtonBase
                toolTip="Add simple"
                buttonIndex={props.buttonIndex}
                selectedButtonIndex={props.selectedButtonIndex}
                setSelectedButtonIndex={props.setSelectedButtonIndex}
                needsMapData={false}
                prompt={<MoorhenAddSimplePanel
                    {...props}
                    onTypeSelectedCallback={onTypeSelectedCallback}
                    selectRef={selectRef}
                />}
                icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/atom-at-pointer.svg`} alt='add...' />}
                {...props}
            />
    
}
