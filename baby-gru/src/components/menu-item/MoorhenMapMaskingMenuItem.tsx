import { useCallback, useRef, useState } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { batch, useDispatch, useSelector, useStore } from 'react-redux';
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { useCommandCentre } from "../../InstanceManager";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { moorhen } from "../../types/moorhen";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { addMap } from "../../store/mapsSlice";
import { hideMap, setContourLevel, setMapAlpha, setMapRadius, setMapStyle } from "../../store/mapContourSettingsSlice";
import { MoorhenNumberForm } from "../select/MoorhenNumberForm";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";


export const MoorhenMapMaskingMenuItem = () => {

    const dispatch = useDispatch()
    const store = useStore()
    const maps = useSelector((state: moorhen.State) => state.maps)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const [invertFlag, setInvertFlag] = useState<boolean>(false)
    const [useDefaultMaskRadius, setUseDefaultMaskRadius] = useState<boolean>(true)
    const [, setMaskType] = useState<string>('molecule')

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const maskTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const invertFlagRef = useRef<null | HTMLInputElement>(null)
    const maskRadiusFormRef = useRef<string>(null)
    const useDefaultMaskRadiusRef = useRef<null | HTMLInputElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidInputRef = useRef<null | HTMLInputElement>(null)
    const commandCentre = useCommandCentre();

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
        <MoorhenMoleculeSelect  molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
        {maskTypeSelectRef.current?.value === 'cid' && <MoorhenCidInputForm  width='20rem' margin='0.5rem' ref={cidInputRef} allowUseCurrentSelection={true}/>}
        {maskTypeSelectRef.current?.value === 'chain' && <MoorhenChainSelect  molecules={molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={chainSelectRef} />}
        {maskTypeSelectRef.current?.value === 'ligand' && <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={ligandSelectRef} />}
        {!useDefaultMaskRadius && <MoorhenNumberForm ref={maskRadiusFormRef} defaultValue={2.5} label="Mask radius" allowNegativeValues={false}/>}
        <Form.Group className='moorhen-form-group'>
            <Form.Check
                ref={useDefaultMaskRadiusRef}
                type="switch"
                checked={useDefaultMaskRadius}
                onChange={() => setUseDefaultMaskRadius(!useDefaultMaskRadius)}
                label="Use default mask radius" />
        </Form.Group>
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

        const maskRadius = useDefaultMaskRadiusRef.current.checked ? -1 : parseFloat(maskRadiusFormRef.current)
        if (!maskRadius) {
            console.log('Mask radius is invalid...')
            return
        }

        const result = await commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'mask_map_by_atom_selection',
            commandArgs: [molNo, mapNo, cidLabel, maskRadius, invertFlagRef.current.checked]
        }, false) as moorhen.WorkerResponse<number>
        
        if (result.data.result.result !== -1) {
            const newMap = new MoorhenMap(commandCentre, store)
            newMap.molNo = result.data.result.result
            newMap.name = `Map ${mapNo} masked`
            await newMap.getSuggestedSettings()
            newMap.isDifference = selectedMap.isDifference
            const { mapRadius, contourLevel, mapAlpha, mapStyle } = selectedMap.getMapContourParams()
            batch(() => {
                dispatch( setMapRadius({ molNo: newMap.molNo, radius: mapRadius }) )
                dispatch( setContourLevel({ molNo: newMap.molNo, contourLevel: contourLevel }) )
                dispatch( setMapAlpha({ molNo: newMap.molNo, alpha: mapAlpha }) )
                dispatch( setMapStyle({ molNo: newMap.molNo, style: mapStyle }) )
                dispatch( hideMap(selectedMap) )
                dispatch( addMap(newMap) )    
            })
        }

    }, [commandCentre, maps])

    return <MoorhenBaseMenuItem
        id='mask-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Map masking..."
        onCompleted={onCompleted}
    />
}

