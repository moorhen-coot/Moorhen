import { MenuItem } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button, FormSelect, Row, Placeholder } from "react-bootstrap";
import { readTextFile, cidToSpec } from "../../utils/MoorhenUtils";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm"
import MoorhenSlider from "../misc/MoorhenSlider";
import "rc-tree/assets/index.css"
import Tree from 'rc-tree';
import { MoorhenScriptModal } from "../modal/MoorhenScriptModal";

export const MoorhenMenuItem = (props) => {

    const resolveOrRejectRef = useRef({
        resolve: () => { },
        reject: () => { }
    })

    return <>
        {props.popoverContent ? <OverlayTrigger
            rootClose
            placement={props.popoverPlacement}
            trigger="click"

            onToggle={(doShow) => {
                if (doShow) {
                    new Promise((resolve, reject) => {
                        resolveOrRejectRef.current = { resolve, reject }
                    }).then(result => {
                        props.onCompleted("Resolve")
                        document.body.click()
                    })
                }
            }}

            onEntering={() => {
                props.onEntering()
            }}

            onEntered={() => {
                props.setPopoverIsShown(true)
            }}

            onExit={() => {
                props.setPopoverIsShown(false)
            }}

            onExiting={() => {
                props.onExiting()
            }}

            overlay={
                <Popover style={{ maxWidth: "40rem", zIndex: 99999 }}>
                    <PopoverHeader as="h3">{props.menuItemTitle}</PopoverHeader>
                    <PopoverBody>
                        {props.popoverContent}
                        {props.showOkButton &&
                            <Button variant={props.buttonVariant} onClick={() => {
                                resolveOrRejectRef.current.resolve()
                            }}>
                                {props.buttonText}
                            </Button>
                        }

                    </PopoverBody>
                </Popover>
            }>
            <MenuItem disabled={props.disabled} className={props.textClassName} id={props.id}>{props.menuItemText}</MenuItem>
        </OverlayTrigger> :
            <MenuItem disabled={props.disabled} className={props.textClassName}>{props.menuItemText}</MenuItem>
        }
    </>
}

MoorhenMenuItem.defaultProps = {
    id: '',
    showOkButton: true,
    buttonText: "OK",
    buttonVariant: "primary",
    textClassName: "",
    popoverPlacement: "right",
    onEntering: () => { },
    onExiting: () => { },
    onCompleted: () => { },
    disabled: false
}

export const MoorhenAboutMenuItem = (props) => {

    const panelContent = <div style={{ minWidth: "20rem" }}>
        <p>Moorhen is a molecular graphics program based on the Coot desktop program.</p>
        <p>Authors</p>
        <ul>
            <li>Paul Emsley</li>
            <li>Filomeno Sanchez</li>
            <li>Martin Noble</li>
            <li>Stuart McNicholas</li>
        </ul>
        <p>Current version: 4th May 2023</p>
    </div>

    return <MoorhenMenuItem
        id='help-about-menu-item'
        popoverContent={panelContent}
        menuItemText="About..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenGoToMenuItem = (props) => {
    const cidRef = useRef(null)
    const [cid, setCid] = useState("")

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="cid" className="mb-3">
            <Form.Label>Residue CID</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>
    </>

    const onCompleted = () => {
        const selectedCid = cidRef.current.value
        if (!selectedCid || props.molecules.length === 0) {
            return
        }
        
        let residueSpec
        try {
            residueSpec = cidToSpec(selectedCid)
        } catch (err) {
            console.log(err)
            console.log('Unable to parse CID')
            return
        }

        const molecule = residueSpec.mol_name ? props.molecules.find(molecule => molecule.name === residueSpec.mol_name) : props.molecules[0]
        
        if (!residueSpec.chain_id || !residueSpec.res_no || !molecule) {
            return
        }

        molecule.centreOn(props.glRef, `/${residueSpec.mol_no ? residueSpec.mol_no : '*'}/${residueSpec.chain_id}/${residueSpec.res_no}-${residueSpec.res_no}/*`)
    }

    return <MoorhenMenuItem
        id='go-to-menu-item'
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText="Go to..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenDeleteUsingCidMenuItem = (props) => {
    const fromRef = useRef(null)
    const cidRef = useRef(null)
    const [cid, setCid] = useState("")

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="cid" className="mb-3">
            <Form.Label>Selection to delete</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        const fromMolecules = props.molecules
            .filter(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToDelete = cidRef.current.value

        const commandArgs = [
            parseInt(fromRef.current.value),
            `${cidToDelete}`,
            "LITERAL"
        ]

        props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "delete_using_cid",
            commandArgs: commandArgs,
            changesMolecules: [parseInt(fromRef.current.value)]
        }, true).then(_ => {
            fromMolecules[0].setAtomsDirty(true)
            fromMolecules[0].redraw(props.glRef)
        })

        props.setPopoverIsShown(false)
    }

    return <MoorhenMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Delete Cid..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenCopyFragmentUsingCidMenuItem = (props) => {
    const fromRef = useRef(null)
    const cidRef = useRef(null)
    const [cid, setCid] = useState("")

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} label="From molecule" allowAny={false} ref={fromRef} />
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="cid" className="mb-3">
            <Form.Label>Selection to copy</Form.Label>
            <Form.Control ref={cidRef} type="text" value={cid} onChange={(e) => {
                setCid(e.target.value)
            }} />
        </Form.Group>

    </>

    const onCompleted = async () => {
        const fromMolecules = props.molecules
            .filter(molecule => molecule.molNo === parseInt(fromRef.current.value))
        const cidToCopy = cidRef.current.value

        const commandArgs = [
            parseInt(fromRef.current.value),
            `${cidToCopy}`,
        ]

        props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "copy_fragment_using_cid",
            commandArgs: commandArgs,
            changesMolecules: [parseInt(fromRef.current.value)]
        }, true).then(async response => {
            const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
            newMolecule.name = `${fromMolecules[0].name} fragment`
            newMolecule.molNo = response.data.result.result
            newMolecule.setBackgroundColour(props.backgroundColor)
            newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
            await newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
            props.changeMolecules({ action: "Add", item: newMolecule })
        })

        props.setPopoverIsShown(false)
    }

    return <MoorhenMenuItem
        id='copy-fragment-menu-item'
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText="Copy fragment..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenAddWatersMenuItem = (props) => {
    const moleculeRef = useRef(null)
    const [disabled, setDisabled] = useState(true)

    useEffect(() => {
        if (!props.activeMap) {
            setDisabled(true)
        } else {
            setDisabled(false)
        }
    }, [props.activeMap])

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} ref={moleculeRef} allowAny={false} />
    </>

    const onCompleted = useCallback(async () => {
        if (!props.activeMap || moleculeRef.current.value === null) {
            return
        }
        const molNo = parseInt(moleculeRef.current.value)
        await props.commandCentre.current.cootCommand({
            command: 'add_waters',
            commandArgs: [molNo, props.activeMap.molNo],
            returnType: "status",
            changesMolecules: [molNo]
        }, true)
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === molNo)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw(props.glRef)
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molNo } })
        document.dispatchEvent(scoresUpdateEvent)

    }, [props.molecules, props.activeMap, props.glRef, props.commandCentre])

    return <MoorhenMenuItem
        id='add-waters-menu-item'
        disabled={disabled}
        popoverContent={panelContent}
        menuItemText="Add waters..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenCentreOnLigandMenuItem = (props) => {
    const [molTreeData, setMolTreeData] = useState([])

    useEffect(() => {

        async function updateLigands(molecule) {
            const newTreeData = []
            for (const molecule of props.molecules) {
                if (molecule.gemmiStructure === null || molecule.atomsDirty) {
                    await molecule.updateAtoms()
                }
                if (molecule.gemmiStructure === null || molecule.gemmiStructure.isDeleted()) {
                    console.log('Cannot proceed, something went wrong...')
                    return
                }

                let newMoleculeNode = { title: molecule.name, key: molecule.molNo, type: "molecule" }
                const model = molecule.gemmiStructure.first_model()
                const ligandCids = []

                try {
                    const chains = model.chains
                    const chainsSize = chains.size()
                    for (let i = 0; i < chainsSize; i++) {
                        const chain = chains.get(i)
                        const ligands = chain.get_ligands()
                        for (let j = 0; j < ligands.length(); j++) {
                            const ligand = ligands.at(j)
                            const ligandSeqId = ligand.seqid
                            const ligandCid = `/${model.name}/${chain.name}/${ligandSeqId.num?.value}(${ligand.name})`
                            ligandCids.push({ molecule: molecule, title: ligandCid, key: ligandCid, type: "ligand" })
                            ligand.delete()
                            ligandSeqId.delete()
                        }
                        chain.delete()
                        ligands.delete()
                    }
                    chains.delete()
                } finally {
                    model.delete()
                }

                if (ligandCids.length > 0) {
                    newMoleculeNode.children = ligandCids
                }
                newTreeData.push(newMoleculeNode)
            }
            setMolTreeData(newTreeData)
        }

        updateLigands()

    }, [props.molecules])

    return <>
        <MoorhenMenuItem
            key='centre-on-ligand-menu-item'
            id='centre-on-ligand-menu-item'
            popoverContent={
                molTreeData.length > 0 ?
                <Tree treeData={molTreeData}
                    onSelect={async (selectedKeys, e) => {
                        if (e.node.type === "ligand") {
                            const selAtoms = await e.node.molecule.gemmiAtomsForCid(e.node.title)
                            const reducedValue = selAtoms.reduce(
                                (accumulator, currentValue) => {
                                    const newSum = accumulator.sumXyz.map((coord, i) => coord + currentValue.pos[i])
                                    const newCount = accumulator.count + 1
                                    return { sumXyz: newSum, count: newCount }
                                },
                                { sumXyz: [0., 0., 0.], count: 0 }
                            )
                            if (reducedValue.count > 0) {
                                props.glRef.current.setOriginAnimated(
                                    reducedValue.sumXyz.map(coord => -coord / reducedValue.count)
                                    , true)
                            }
                        }
                    }}
                >
                </Tree>
                :
                <span>No ligands...</span>
            }
            menuItemText="Centre on ligand..."
            setPopoverIsShown={props.setPopoverIsShown}
            showOkButton={false}
        />
    </>
}

export const MoorhenLoadScriptMenuItem = (props) => {
    const filesRef = useRef(null);
    const [showCodeEditor, setShowCodeEditor] = useState(false)
    const [code, setCode] = useState('No code loaded')

    const panelContent = <Row>
        <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadScript" className="mb-3">
            <Form.Label>Load and execute script</Form.Label>
            <Form.Control ref={filesRef} type="file" multiple={false} accept={[".js"]} />
        </Form.Group>
    </Row>

    const onCompleted = async (onCompletedArg) => {
        for (const file of filesRef.current.files) {
            const text = await readTextFile(file)
            setShowCodeEditor(true)
            setCode(text)
            //eval(text)
        }
    }

    return <><MoorhenMenuItem
        key='execute-script-menu-item'
        id='execute-on-ligand-menu-item'
        popoverContent={panelContent}
        menuItemText="Load and execute script..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
        <MoorhenScriptModal code={code} show={showCodeEditor} setShow={setShowCodeEditor} />
    </>

}

export const MoorhenMapMaskingMenuItem = (props) => {
    const [invertFlag, setInvertFlag] = useState(false)
    const [maskType, setMaskType] = useState('molecule')
    const moleculeSelectRef = useRef(null)
    const maskTypeSelectRef = useRef(null)
    const invertFlagRef = useRef(null)
    const mapSelectRef = useRef(null)
    const chainSelectRef = useRef(null)
    const ligandSelectRef = useRef(null)
    const cidSelectRef = useRef(null)

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
        {maskTypeSelectRef.current?.value === 'cid' && <MoorhenCidInputForm {...props} width='20rem' margin='0.5rem' ref={cidSelectRef} />}
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
            let cidLabel

            switch (maskTypeSelectRef.current?.value) {
                case 'molecule':
                    cidLabel = `/1/*/*/*:*`
                    break
                case 'chain':
                    cidLabel = `/1/${chainSelectRef.current.value}/*/*:*`
                    break
                case 'cid':
                    cidLabel = cidSelectRef.current.value
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

    return <MoorhenMenuItem
        id='mask-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Map masking..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

// FIXME: this will be incorporated to the UI when the backend allows to set map weight by imol
export const MoorhenMapWeightMenuItem = (props) => {
    const [mapWeight, setMapWeight] = useState(null)


    useEffect(() => {
        const fetchInitialMapWeight = async () => {
            //const result = await props.map.getMapWeight()
            //setMapWeight(result.data.result.result)
        }

        fetchInitialMapWeight()
    }, [])

    useEffect(() => {
        const setMapWeight = async () => {
            await props.map.setMapWeight(mapWeight)
        }

        setMapWeight()
    }, [mapWeight])


    const onCompleted = () => {

    }

    const panelContent =
        <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MapWeightSlider">
            {mapWeight === null ?
                <Placeholder animation="glow">
                    <Placeholder size='lg' xs={3} />
                    <Placeholder size='lg' xs={12} />
                </Placeholder>
                :
                <MoorhenSlider minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="Map Weight" initialValue={mapWeight} externalValue={mapWeight} setExternalValue={setMapWeight} />
            }
        </Form.Group>

    return <MoorhenMenuItem
        popoverPlacement='left'
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText='Set map weight'
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
