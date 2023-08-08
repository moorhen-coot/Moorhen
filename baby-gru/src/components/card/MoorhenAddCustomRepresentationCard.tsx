import { useState, useRef, useCallback } from 'react';
import { Stack, Button, FormSelect, Form } from "react-bootstrap";
import { SliderPicker } from "react-color";
import { rgbToHex, representationLabelMapping } from '../../utils/MoorhenUtils';
import { moorhen } from "../../types/moorhen";
import { Popover } from '@mui/material';

const customRepresentations = [ 'CBs', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres' ]

export const MoorhenAddCustomRepresentationCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean; anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule
}) => {

    const cidFormRef = useRef<HTMLInputElement | null>(null)
    const styleSelectRef = useRef<HTMLSelectElement | null>(null)
    const [colour, setColour] = useState<{ r: string; g: string; b: string; }>({r: '150', g:'100', b:'50'})

    const handleCreateRepresentation = useCallback(() => {
        props.molecule.addRepresentation(styleSelectRef.current.value, cidFormRef.current.value, true, rgbToHex(parseInt(colour.r), parseInt(colour.g), parseInt(colour.b)))
        props.setShow(false)
    }, [colour])

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: '#e8e8e8', marginTop: '0.1rem'}}}
            >
            <Stack gap={2} direction='horizontal' style={{width: '25rem', margin: '0.5rem'}}>
                <FormSelect ref={styleSelectRef} size="sm" defaultValue={'Bonds'}>
                    {customRepresentations.map(key => {
                        return <option value={key} key={key}>{representationLabelMapping[key]}</option>
                    })}
                </FormSelect>
                <Form.Control ref={cidFormRef} size="sm" type='text' placeholder={'CID selection'} style={{width: "100%"}}/>
                <div style={{width: '100%', textAlign: 'center'}}>
                <SliderPicker color={colour} onChange={(color) => {setColour({r: color.rgb.r, g: color.rgb.g, b: color.rgb.b})}}/>
                </div>
                <Button onClick={handleCreateRepresentation}>
                    Create
                </Button>
            </Stack>
        </Popover>
 
}
