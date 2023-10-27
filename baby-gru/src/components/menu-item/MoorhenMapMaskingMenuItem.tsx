import { useCallback, useRef, useState } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { moorhen } from "../../types/moorhen";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { addMap } from "../../store/mapsSlice";

export const MoorhenMapMaskingMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const [invertFlag, setInvertFlag] = useState<boolean>(false)
    const [maskType, setMaskType] = useState<string>('molecule')

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const maskTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const invertFlagRef = useRef<null | HTMLInputElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidInputRef = useRef<null | HTMLInputElement>(null)

    const { commandCentre, glRef } = props

    const panelContent = <>
        <Form.Group style={{ margin: '0.5rem', width: '20rem' }}>
            <Form.Label>Create mask by...</Form.Label>
            <FormSelect size="sm" ref={maskTypeSelectRef} defaultValue={'molecule'} onChange={(evt) => {
                setMaskType(evt.target.value)
                maskTypeSelectRef.current.value = evt.target.value
            }}>
                <option value={'molecule'} key={'molecule'}>By molecule</option>
                <option value={'chain'} key={'chain'}>By chain</option>
                <option value={'ligand'} key={'ligand'}>By ligand</option>
                <option value={'cid'} key={'cid'}>By atom selection</option>
            </FormSelect>
        </Form.Group>
        <MoorhenMapSelect maps={maps} ref={mapSelectRef} />
        <MoorhenMoleculeSelect {...props} molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
        {maskTypeSelectRef.current?.value === 'cid' && <MoorhenCidInputForm {...props} width='20rem' margin='0.5rem' ref={cidInputRef} />}
        {maskTypeSelectRef.current?.value === 'chain' && <MoorhenChainSelect {...props} molecules={molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={chainSelectRef} />}
        {maskTypeSelectRef.current?.value === 'ligand' && <MoorhenLigandSelect {...props} molecules={molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={ligandSelectRef} />}
        <Form.Group className='moorhen-form-group'>
            <Form.Check
                ref={invertFlagRef}
                type="switch"
                checked={invertFlag}
                onChange={() => setInvertFlag(!invertFlag)}
                label="Invert mask" />
        </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        if (!mapSelectRef.current.value || !moleculeSelectRef.current.value) {
            return
        }
        
        const mapNo = parseInt(mapSelectRef.current.value)
        const molNo = parseInt(moleculeSelectRef.current.value)
        const selectedMap = maps.find(map => map.molNo === mapNo)

        if (!selectedMap) {
            return
        }
        
        let cidLabel: string

        switch (maskTypeSelectRef.current?.value) {
            case 'molecule':
                cidLabel = `/1/*/*/*:*`
                break
            case 'chain':
                cidLabel = `/1/${chainSelectRef.current.value}/*/*:*`
                break
            case 'cid':
                cidLabel = cidInputRef.current.value
                break
            case 'ligand':
                cidLabel = ligandSelectRef.current.value
                break
            default:
                console.log('Unrecognised mask type...')
                break
        }

        const result = await commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'mask_map_by_atom_selection',
            commandArgs: [molNo, mapNo, cidLabel, invertFlagRef.current.checked]
        }, false) as moorhen.WorkerResponse<number>
        
        if (result.data.result.result !== -1) {
            const newMap = new MoorhenMap(commandCentre, glRef)
            newMap.molNo = result.data.result.result
            newMap.name = `Map ${mapNo} masked`
            await newMap.getSuggestedSettings()
            newMap.isDifference = selectedMap.isDifference
            newMap.suggestedContourLevel = selectedMap.contourLevel
            newMap.suggestedRadius = selectedMap.mapRadius
            dispatch( addMap(newMap) )
        }

    }, [commandCentre, maps, glRef])

    return <MoorhenBaseMenuItem
        id='mask-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Map masking..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

