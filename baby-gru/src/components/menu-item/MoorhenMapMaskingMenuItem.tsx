import { useCallback, useRef, useState } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMap, MoorhenMapInterface } from "../../utils/MoorhenMap";
import { MolChange } from "../MoorhenApp";
import { MoorhenCommandCentreInterface } from "../../utils/MoorhenCommandCentre";
import { MoorhenMoleculeInterface } from "../../utils/MoorhenMolecule";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenMapMaskingMenuItem = (props: {
    molecules: MoorhenMoleculeInterface[];
    maps: MoorhenMapInterface[];
    changeMaps: (arg0: MolChange<MoorhenMapInterface>) => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>
    commandCentre: React.RefObject<MoorhenCommandCentreInterface>;
}) => {

    const [invertFlag, setInvertFlag] = useState<boolean>(false)
    const [maskType, setMaskType] = useState<string>('molecule')
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const maskTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const invertFlagRef = useRef<null | HTMLInputElement>(null)
    const mapSelectRef = useRef<null | HTMLSelectElement>(null)
    const chainSelectRef = useRef<null | HTMLSelectElement>(null)
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null)
    const cidInputRef = useRef<null | HTMLInputElement>(null)

    const { commandCentre, maps, changeMaps } = props

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
                <option value={'cid'} key={'cid'}>By CID</option>
            </FormSelect>
        </Form.Group>
        <MoorhenMapSelect {...props} ref={mapSelectRef} />
        <MoorhenMoleculeSelect {...props} allowAny={false} ref={moleculeSelectRef} />
        {maskTypeSelectRef.current?.value === 'cid' && <MoorhenCidInputForm {...props} width='20rem' margin='0.5rem' ref={cidInputRef} />}
        {maskTypeSelectRef.current?.value === 'chain' && <MoorhenChainSelect {...props} molecules={props.molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={chainSelectRef} />}
        {maskTypeSelectRef.current?.value === 'ligand' && <MoorhenLigandSelect {...props} molecules={props.molecules} selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)} ref={ligandSelectRef} />}
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }}>
            <Form.Check
                ref={invertFlagRef}
                type="switch"
                checked={invertFlag}
                onChange={() => setInvertFlag(!invertFlag)}
                label="Invert mask" />
        </Form.Group>
    </>

    const onCompleted = useCallback(() => {
        const mapNo = parseInt(mapSelectRef.current.value)
        const molNo = parseInt(moleculeSelectRef.current.value)
        const newMap = new MoorhenMap(commandCentre)

        const maskMap = () => {
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

            return commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'mask_map_by_atom_selection',
                commandArgs: [molNo, mapNo, cidLabel, invertFlagRef.current.checked
                ]
            }, true)
        }

        maskMap()
            .then(result => {
                if (result.data.result.result !== -1) {
                    newMap.molNo = result.data.result.result
                    newMap.name = `Map ${mapNo} masked`
                    const originalMap = maps.find(map => map.molNo === mapNo)
                    newMap.isDifference = originalMap.isDifference
                    changeMaps({ action: 'Add', item: newMap })
                }
                return Promise.resolve(result)
            })
    }, [commandCentre, maps, changeMaps])

    return <MoorhenBaseMenuItem
        id='mask-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Map masking..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

