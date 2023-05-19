import { MenuItem, TextField } from "@mui/material";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button, FormSelect, Row, Col, SplitButton, Dropdown, Stack, Placeholder } from "react-bootstrap";
import { SketchPicker } from "react-color";
import { MoorhenMtzWrapper, readTextFile, readDataFile, cidToSpec } from "../../utils/MoorhenUtils";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenBackupSelect } from "../select/MoorhenBackupSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect"
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm"
import MoorhenSlider from "../misc/MoorhenSlider";
import "rc-tree/assets/index.css"
import Tree from 'rc-tree';
import { MoorhenScriptModal } from "../modal/MoorhenScriptModal";
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition";

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
            <MenuItem disabled={props.disabled} className={props.textClassName} id={props.id} variant="success">{props.menuItemText}</MenuItem>
        </OverlayTrigger> :
            <MenuItem disabled={props.disabled} className={props.textClassName} variant="success">{props.menuItemText}</MenuItem>
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

export const MoorhenLoadTutorialDataMenuItem = (props) => {
    const tutorialNumberSelectorRef = useRef(null);
    const allTutorialNumbers = ['1', '2', '3']
    const tutorialMtzColumnNames = {
        1: { F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE' },
        2: { F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR: 'FREE' },
        3: { F: "FWT", PHI: "PHWT", Fobs: 'F', SigFobs: 'SIGF', FreeR: 'FREER' }
    }

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="loadTutorialData" className="mb-3">
            <Form.Label>Select tutorial number</Form.Label>
            <Form.Select ref={tutorialNumberSelectorRef} >
                {allTutorialNumbers.map(tutorialNumber => {
                    return <option key={tutorialNumber} value={tutorialNumber}>{`Tutorial ${tutorialNumber}`}</option>
                })}
            </Form.Select>
        </Form.Group>
    </>

    const onCompleted = (onCompletedArg) => {
        const tutorialNumber = tutorialNumberSelectorRef.current.value
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
        const newMap = new MoorhenMap(props.commandCentre)
        const newDiffMap = new MoorhenMap(props.commandCentre)
        newMolecule.loadToCootFromURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.pdb`, `mol-${tutorialNumber}`)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
            }).then(result => {
                props.changeMolecules({ action: "Add", item: newMolecule })
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(props.glRef, null, false)
            }).then(_ => {
                return newMap.loadToCootFromMtzURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`, `map-${tutorialNumber}`,
                    {
                        isDifference: false, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber]
                    })
            }).then(_ => {
                return newDiffMap.loadToCootFromMtzURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`, `diff-map-${tutorialNumber}`,
                    { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false })
            }).then(_ => {
                props.changeMaps({ action: 'AddList', items: [newMap, newDiffMap] })
                props.setActiveMap(newMap)
            })
    }

    return <MoorhenMenuItem
        id='load-tutorial-data-menu-item'
        popoverContent={panelContent}
        menuItemText="Load tutorial data..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenAddSimpleMenuItem = (props) => {
    const molTypeSelectRef = useRef(null)
    const moleculeSelectRef = useRef(null)
    const molTypes = ['HOH', 'SO4', 'PO4', 'GOL', 'CIT', 'EDO', 'IOD', 'NA', 'CA']

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="MoorhenAddSimpleMenuItem" className="mb-3">
            <Form.Label>Add...</Form.Label>
            <FormSelect size="sm" ref={molTypeSelectRef} defaultValue={'HOH'}>
                {molTypes.map(type => {return <option value={type} key={type}>{type}</option>})}
            </FormSelect>
        </Form.Group>
        <MoorhenMoleculeSelect {...props} allowAny={false} ref={moleculeSelectRef} />
    </>


    const onCompleted = useCallback(async () => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.addLigandOfType(molTypeSelectRef.current.value, props.glRef)
            const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: selectedMolecule.molNo } })
            document.dispatchEvent(scoresUpdateEvent)    
        }
    }, [props.glRef, props.molecules])

    return <MoorhenMenuItem
        id='add-simple-menu-item'
        popoverContent={panelContent}
        menuItemText="Add simple..."
        onCompleted={onCompleted}
        popoverPlacement={props.popoverPlacement}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenAddSimpleMenuItem.defaultProps = { popoverPlacement: "right" }

export const MoorhenGetMonomerMenuItem = (props) => {
    const tlcRef = useRef()
    const selectRef = useRef(null)

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="MoorhenGetMonomerMenuItem" className="mb-3">
            <Form.Label>Monomer identifier</Form.Label>
            <Form.Control ref={tlcRef} type="text" />
        </Form.Group>
        <MoorhenMoleculeSelect {...props} allowAny={true} ref={selectRef} />
    </>


    const onCompleted = async () => {
        const fromMolNo = parseInt(selectRef.current.value)
        const newTlc = tlcRef.current.value.toUpperCase()
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)

        const getMonomer = () => {
            return props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [newTlc, fromMolNo,
                    ...props.glRef.current.origin.map(coord => -coord)
                ]
            }, true)
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
            newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
            const fromMolecule = props.molecules.find(molecule => molecule.molNo === fromMolNo)
            if (typeof fromMolecule !== 'undefined') {
                const ligandDict = fromMolecule.getDict(newTlc)
                await newMolecule.addDict(ligandDict)    
            }
            await newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
            props.changeMolecules({ action: "Add", item: newMolecule })
        } else {
            console.log('Error getting monomer... Missing dictionary?')
            props.commandCentre.current.extendConsoleMessage('Error getting monomer... Missing dictionary?')
        }
    }

    return <MoorhenMenuItem
        id='get-monomer-menu-item'
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenGetMonomerMenuItem.defaultProps = { popoverPlacement: "right" }

export const MoorhenSharpenBlurMapMenuItem = (props) => {
    const factorRef = useRef()
    const selectRef = useRef(null)

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="MoorhenBlurMapMenuItem" className="mb-3">
            <Form.Label>B-factor to apply</Form.Label>
            <Form.Control ref={factorRef} type="number" defaultValue={50.} />
        </Form.Group>
        <MoorhenMapSelect {...props} allowAny={false} ref={selectRef} />
    </>


    const onCompleted = () => {
        const mapNo = parseInt(selectRef.current.value)
        const bFactor = parseFloat(factorRef.current.value)
        const newMap = new MoorhenMap(props.commandCentre)

        const blurMap = () => {
            return props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'sharpen_blur_map',
                commandArgs: [mapNo, bFactor, false
                ]
            }, true)
        }

        blurMap()
            .then(result => {
                if (result.data.result.result !== -1) {
                    newMap.molNo = result.data.result.result
                    newMap.name = `Map ${mapNo} blurred by ${bFactor}`
                    const oldMaps = props.maps.filter(map => map.molNo === mapNo)
                    newMap.isDifference = oldMaps[0].isDifference
                    props.changeMaps({ action: 'Add', item: newMap })
                }
                return Promise.resolve(result)
            })
    }

    return <MoorhenMenuItem
        id='sharpen-blur-map-menu-item'
        popoverContent={panelContent}
        menuItemText="Sharpen/Blur map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenFitLigandRightHereMenuItem = (props) => {
    const tlcRef = useRef()
    const intoMoleculeRef = useRef(null)
    const ligandMoleculeRef = useRef(null)
    const mapSelectRef = useRef(null)
    const useConformersRef = useRef(false)
    const conformerCountRef = useRef(0)
    const [useConformers, setUseConformers] = useState(false)
    const [conformerCount, setConformerCount] = useState(10)

    const panelContent = <>
        <MoorhenMapSelect {...props} label="Map" allowAny={false} ref={mapSelectRef} />
        <MoorhenMoleculeSelect {...props} label="Protein molecule" allowAny={false} ref={intoMoleculeRef} />
        <MoorhenMoleculeSelect {...props} label="Ligand molecule" allowAny={false} ref={ligandMoleculeRef} />
        {/** FIXME: This remains unavailable until the thread pool exhausted issue is fixed
         <Form.Check
            style={{margin: '0.5rem'}} 
            type="switch"
            checked={useConformers}
            onChange={() => { 
                useConformersRef.current = !useConformers
                setUseConformers(!useConformers)
            }}
            label="Use conformers"/>*/}
        {useConformers &&
        <Form.Group>
            <TextField
                style={{margin: '0.5rem'}} 
                id='conformer-count'
                label='No. of conformers'
                type='number'
                variant="standard"
                error={isNaN(parseInt(conformerCount)) || parseInt(conformerCount) < 0 || parseInt(conformerCount) === Infinity}
                value={conformerCount}
                onChange={(evt) => {
                    conformerCountRef.current = evt.target.value
                    setConformerCount(evt.target.value)
                }}
            />
        </Form.Group>
        }
    </>


    const onCompleted = () => {
        if (useConformersRef.current && (isNaN(parseInt(conformerCountRef.current)) || parseInt(conformerCountRef.current) < 0 || parseInt(conformerCountRef.current) === Infinity)) {
            console.log('Unable to parse conformer count into a valid int...')
            return
        }
        props.commandCentre.current.cootCommand({
            returnType: 'int_array',
            command: 'fit_ligand_right_here',
            commandArgs: [
                parseInt(intoMoleculeRef.current.value),
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                ...props.glRef.current.origin.map(coord => -coord),
                1., useConformersRef.current, parseInt(conformerCountRef.current)
            ]

        }, true)
            .then(result => {
                if (result.data.result.status === "Completed") {
                    result.data.result.result.forEach(iMol => {
                        const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
                        newMolecule.molNo = iMol
                        newMolecule.name = `lig_${iMol}`
                        newMolecule.setBackgroundColour(props.backgroundColor)
                        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
                        return newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef).then(_ => {
                            props.changeMolecules({ action: "Add", item: newMolecule })
                        })
                    })
                }
            })
    }

    return <MoorhenMenuItem
        id='fit-ligand-right-here-menu-item'
        popoverContent={panelContent}
        menuItemText="Fit ligand here..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenFitLigandRightHereMenuItem.defaultProps = { popoverPlacement: "right" }

export const MoorhenDeleteDisplayObjectMenuItem = (props) => {

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Are you sure?</span>
        </Form.Group>
    </>

    const onCompleted = () => {
        props.changeItemList({ action: 'Remove', item: props.item })
        props.item.delete(props.glRef);
        props.setPopoverIsShown(false)
        if (props.item.type === "map" && props.activeMap?.molNo === props.item.molNo) {
            props.setActiveMap(null)
        }
    }

    return <MoorhenMenuItem
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="Delete"
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={props.item.type === 'molecule' ? "Delete molecule" : "Delete map"}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenRenameDisplayObjectMenuItem = (props) => {
    const newNameInputRef = useRef(null)

    const panelContent = <>
        <Form.Group style={{ width: '10rem', margin: '0' }} controlId="MoorhenGetRenameMenuItem" className="mb-3">
            <Form.Control
                ref={newNameInputRef}
                type="text"
                name="newItemName"
                placeholder="New name"
            />
        </Form.Group>
    </>

    const onCompleted = () => {
        let newName = newNameInputRef.current.value
        if (newName === "") {
            return
        }
        props.item.name ? props.item.name = newName : props.item.name = newName
        props.setCurrentName(newName)
        props.setPopoverIsShown(false)
    }

    return <MoorhenMenuItem
        testId={document.getElementById('test-display')}
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={props.item.type === 'molecule' ? "Rename molecule" : "Rename map"}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenRotateTranslateMoleculeMenuItem = (props) => {
    const ghostMolecule = useRef(null)

    const onExiting = () => {
        props.glRef.current.setActiveMolecule(null)
        props.changeMolecules({ action: 'Remove', item: ghostMolecule.current })
        ghostMolecule.current.delete(props.glRef)
    }

    const acceptTransform = async () => {
        props.setPopoverIsShown(false)
        props.glRef.current.setActiveMolecule(null)
        const transformedAtoms = ghostMolecule.current.transformedCachedAtomsAsMovedAtoms(props.glRef)
        await props.molecule.updateWithMovedAtoms(transformedAtoms, props.glRef)
        props.changeMolecules({ action: 'Remove', item: ghostMolecule.current })
        ghostMolecule.current.delete(props.glRef)
        document.body.click()
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: props.molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
    }

    const rejectTransform = () => {
        onExiting()
        document.body.click()
    }

    const startTransform = async () => {
        const newMolecule = await props.molecule.copyMolecule(props.glRef)
        props.changeMolecules({ action: "Add", item: newMolecule })
        props.glRef.current.setActiveMolecule(newMolecule)
        ghostMolecule.current = newMolecule
    }

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenRotateTranslateMolecule">
                <Form.Label>Accept rotate/translate ?</Form.Label>
                <Button onClick={acceptTransform}><CheckOutlined /></Button>
                <Button className="mx-2" onClick={rejectTransform}><CloseOutlined /></Button>
            </Form.Group>
        </>

    return <MoorhenMenuItem
        showOkButton={false}
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Rotate/Translate molecule"}
        onEntering={startTransform}
        onExiting={onExiting}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenDefaultBondSmoothnessPreferencesMenuItem = (props) => {
    const smoothnesSelectRef = useRef(null)

    const onCompleted = () => {
        props.setDefaultBondSmoothness(parseInt(smoothnesSelectRef.current.value))
    }

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSmoothnessSelector">
                <Form.Label>Smoothness</Form.Label>
                <FormSelect size="sm" ref={smoothnesSelectRef} defaultValue={props.defaultBondSmoothness}>
                    <option value={1} key={1}>Coarse</option>
                    <option value={2} key={2}>Nice</option>
                    <option value={3} key={3}>Smooth</option>
                </FormSelect>
            </Form.Group>
        </>

    return <MoorhenMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Default smoothness of molecule bonds..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={onCompleted}
    />

}

export const MoorhenAddRemoveHydrogenAtomsMenuItem = (props) => {
    const moleculeSelectRef = useRef(null)

    const handleClick = useCallback(async (cootCommand) => {
        if (moleculeSelectRef.current !== null) {
            const selectedMolNo = parseInt(moleculeSelectRef.current.value)
            await props.commandCentre.current.cootCommand({
                message: 'coot_command',
                command: cootCommand,
                returnType: 'status',
                commandArgs: [selectedMolNo],
            })
            const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedMolNo)
            selectedMolecule.setAtomsDirty(true)
            selectedMolecule.redraw(props.glRef)
            document.body.click()
            document.body.click()
        }
    }, [moleculeSelectRef, props.molecules, props.glRef, props.commandCentre])

    const panelContent = <Form.Group>
        <MoorhenMoleculeSelect {...props} label="Molecule" allowAny={false} ref={moleculeSelectRef} />
        <Button className="mx-2" variant='primary' onClick={() => handleClick('add_hydrogen_atoms')}>
            Add
        </Button>
        <Button className="mx-2" variant='danger' onClick={() => handleClick('delete_hydrogen_atoms')}>
            Remove
        </Button>
    </Form.Group>


    return <MoorhenMenuItem
        id='add-hydrogens-menu-item'
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText="Add/Remove hydrogen atoms"
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />

}

export const MoorhenBackupPreferencesMenuItem = (props) => {

    const {
        enableTimeCapsule, setEnableTimeCapsule, maxBackupCount, setMaxBackupCount, modificationCountBackupThreshold, setModificationCountBackupThreshold
    } = props

    const panelContent =
        <>
            <Form.Group style={{ width: '25rem' }}>
                <Form.Check
                    type="switch"
                    checked={enableTimeCapsule}
                    onChange={() => { setEnableTimeCapsule(!enableTimeCapsule) }}
                    label="Make automatic backups" />
            </Form.Group>
            <hr></hr>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenMaxBackupCount">
                <MoorhenSlider isDisabled={!enableTimeCapsule} minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="Max. number of stored backups" initialValue={maxBackupCount} externalValue={maxBackupCount} setExternalValue={setMaxBackupCount} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenModifThresholdBackup">
                <MoorhenSlider isDisabled={!enableTimeCapsule} minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="No. of modifications to trigger backup" initialValue={modificationCountBackupThreshold} externalValue={modificationCountBackupThreshold} setExternalValue={setModificationCountBackupThreshold} />
            </Form.Group>
        </>

    return <MoorhenMenuItem
        id="auto-backup-settings-menu-item"
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Automatic backup settings..."}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />
}

export const MoorhenScoresToastPreferencesMenuItem = (props) => {

    const panelContent =
        <>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.showScoresToast}
                    onChange={() => { props.setShowScoresToast(!props.showScoresToast) }}
                    label="Show scores window" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Rfactor')}
                    onChange={() => {
                        props.setDefaultUpdatingScores({
                            action: props.defaultUpdatingScores.includes('Rfactor') ? 'Remove' : 'Add',
                            item: 'Rfactor'
                        })
                    }}
                    label="Show Rfactor" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Rfree')}
                    onChange={() => {
                        props.setDefaultUpdatingScores({
                            action: props.defaultUpdatingScores.includes('Rfree') ? 'Remove' : 'Add',
                            item: 'Rfree'
                        })
                    }}
                    label="Show Rfree" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Moorhen Points')}
                    onChange={() => {
                        props.setDefaultUpdatingScores({
                            action: props.defaultUpdatingScores.includes('Moorhen Points') ? 'Remove' : 'Add',
                            item: 'Moorhen Points'
                        })
                    }}
                    label="Show Moorhen points" />
            </InputGroup>
        </>

    return <MoorhenMenuItem
        id="updating-maps-scores-options-menu-item"
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Options for scores when updating maps..."}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />

}

export const MoorhenMapSettingsMenuItem = (props) => {

    const panelContent =
        <>
            <Form.Check
                type="switch"
                checked={props.mapSolid}
                onChange={() => { props.setMapSolid(!props.mapSolid) }}
                label="Draw as a surface" />
            {!props.mapSolid &&
                <Form.Check
                    type="switch"
                    checked={props.mapLitLines}
                    onChange={() => { props.setMapLitLines(!props.mapLitLines) }}
                    label="Activate lit lines" />
            }
            <Form.Group style={{ width: '100%', margin: '0.1rem' }} controlId="MoorhenMapOpacitySlider">
                <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Opacity" initialValue={props.mapOpacity} externalValue={props.mapOpacity} setExternalValue={props.setMapOpacity} />
            </Form.Group>
        </>
    return <MoorhenMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Draw settings"}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />

}

export const MoorhenMoleculeBondSettingsMenuItem = (props) => {
    const smoothnesSelectRef = useRef(null)

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenBondWidthSlider">
                <MoorhenSlider minVal={0.05} maxVal={0.5} logScale={false} sliderTitle="Bond width" initialValue={0.1} externalValue={props.bondWidth} setExternalValue={props.setBondWidth} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenRadiusBondRatioSlider">
                <MoorhenSlider minVal={1.0} maxVal={3.5} logScale={false} sliderTitle="Radius-Bond ratio" initialValue={1.5} externalValue={props.atomRadiusBondRatio} setExternalValue={props.setAtomRadiusBondRatio} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSmoothnessSelector">
                <Form.Label>Smoothness</Form.Label>
                <FormSelect size="sm" ref={smoothnesSelectRef} defaultValue={props.bondSmoothness} onChange={(evt) => { props.setBondSmoothness(Number(evt.target.value)) }}>
                    <option value={1} key={1}>Coarse</option>
                    <option value={2} key={2}>Nice</option>
                    <option value={3} key={3}>Smooth</option>
                </FormSelect>
            </Form.Group>
        </>

    return <MoorhenMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Bond settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenMoleculeSymmetrySettingsMenuItem = (props) => {
    const [symmetryRadius, setSymmetryRadius] = useState(25.0)
    const [symmetryOn, setSymmetryOn] = useState(false)
    const isDirty = useRef(false)
    const busyDrawing = useRef(false)

    const drawSymmetryIfDirty = () => {
        if (isDirty.current) {
            busyDrawing.current = true
            isDirty.current = false
            props.molecule.drawSymmetry(props.glRef)
                .then(_ => {
                    busyDrawing.current = false
                    drawSymmetryIfDirty()
                })
        }
    }

    useEffect(() => {
        isDirty.current = true
        props.molecule.symmetryRadius = symmetryRadius
        if (!busyDrawing.current) {
            drawSymmetryIfDirty()
        }
    }, [symmetryRadius])

    useEffect(() => {
        if (props.molecule.symmetryOn !== symmetryOn) {
            props.molecule.toggleSymmetry(props.glRef)
        }
    }, [symmetryOn])

    const panelContent =
        <>
            <Form.Check
                type="switch"
                checked={symmetryOn}
                onChange={() => { setSymmetryOn(!symmetryOn) }}
                label="Show symmetry" />
            <Form.Group className="mt-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSymmetryRadiusSigmaSlider">
                <MoorhenSlider minVal={0.01} maxVal={100} logScale={false} sliderTitle="Radius" initialValue={symmetryRadius} externalValue={symmetryRadius} setExternalValue={setSymmetryRadius} />
            </Form.Group>
        </>

    return <MoorhenMenuItem
        showOkButton={false}
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Symmetry settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenMoleculeGaussianSurfaceSettingsMenuItem = (props) => {

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfSigmaSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Sigma" initialValue={props.surfaceSigma} externalValue={props.surfaceSigma} setExternalValue={props.setSurfaceSigma} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfLevelSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Contour level" initialValue={props.surfaceLevel} externalValue={props.surfaceLevel} setExternalValue={props.setSurfaceLevel} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfRadiusSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Box radius" initialValue={props.surfaceRadius} externalValue={props.surfaceRadius} setExternalValue={props.setSurfaceRadius} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSurfGridScaleSlider">
                <MoorhenSlider minVal={0.01} maxVal={1.5} logScale={false} sliderTitle="Grid scale" initialValue={props.surfaceGridScale} externalValue={props.surfaceGridScale} setExternalValue={props.setSurfaceGridScale} />
            </Form.Group>
        </>

    return <MoorhenMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Gaussian surface settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenDeleteEverythingMenuItem = (props) => {

    const panelContent = <>
        <Form.Group style={{ width: '18rem', margin: '0.5rem' }} controlId="MoorhenGetDeleteEverythingMenuItem" className="mb-3">
            <span style={{ fontWeight: 'bold' }}>Warning: this action cannot be reversed.</span>
        </Form.Group>
    </>


    const onCompleted = () => {
        props.maps.forEach(map => {
            map.delete(props.glRef)
        })
        props.molecules.forEach(molecule => {
            molecule.delete(props.glRef)
        })
        props.changeMaps({ action: 'Empty' })
        props.changeMolecules({ action: "Empty" })
    }

    return <MoorhenMenuItem
        id='delete-everything-menu-item'
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="I understand, delete"
        popoverContent={panelContent}
        menuItemText="Delete everything"
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}


export const MoorhenBackgroundColorMenuItem = (props) => {
    const [backgroundColor, setBackgroundColor] = useState({
        r: 128, g: 128, b: 128, a: 0.5
    })

    useEffect(() => {
        setBackgroundColor({
            r: 255 * props.backgroundColor[0],
            g: 255 * props.backgroundColor[1],
            b: 255 * props.backgroundColor[2],
            a: props.backgroundColor[3]
        })
    }, [props.backgroundColor])

    const handleColorChange = (color) => {
        try {
            props.setBackgroundColor([color.rgb.r / 255., color.rgb.g / 255., color.rgb.b / 255., color.rgb.a])
            setBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const panelContent = <>
        <SketchPicker color={backgroundColor} onChange={handleColorChange} />
    </>

    return <MoorhenMenuItem
        id="change-background-colour-menu-item"
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText="Set background colour..."
        onCompleted={() => props.setPopoverIsShown(false)}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenBackgroundColorMenuItem.defaultProps = { popoverPlacement: "right" }

export const MoorhenSuperposeMenuItem = (props) => {
    const refChainSelectRef = useRef(null);
    const refMoleculeSelectRef = useRef(null);
    const movChainSelectRef = useRef(null);
    const movMoleculeSelectRef = useRef(null);
    const [selectedRefModel, setSelectedRefModel] = useState(null)
    const [selectedRefChain, setSelectedRefChain] = useState(null)
    const [selectedMovModel, setSelectedMovModel] = useState(null)
    const [selectedMovChain, setSelectedMovChain] = useState(null)

    const handleModelChange = (evt, isReferenceModel) => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (isReferenceModel) {
            setSelectedRefModel(parseInt(evt.target.value))
            setSelectedRefChain(selectedMolecule.sequences[0].chain)
        } else {
            setSelectedMovModel(parseInt(evt.target.value))
            setSelectedMovChain(selectedMolecule.sequences[0].chain)
        }
    }

    const handleChainChange = (evt, isReferenceModel) => {
        if (isReferenceModel) {
            setSelectedRefChain(evt.target.value)
        } else {
            setSelectedMovChain(evt.target.value)
        }
    }

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedRefModel(null)
            setSelectedMovModel(null)
            return
        }

        if (selectedRefModel === null || !props.molecules.map(molecule => molecule.molNo).includes(selectedRefModel)) {
            setSelectedRefModel(props.molecules[0].molNo)
        }

        if (selectedMovModel === null || !props.molecules.map(molecule => molecule.molNo).includes(selectedMovModel)) {
            setSelectedMovModel(props.molecules[0].molNo)
        }

    }, [props.molecules.length])

    const panelContent = <>
        <Form.Group key="reference-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="refModelSelect" className="mb-3">
            <Form.Label>
                Reference structure
            </Form.Label>
            <MoorhenMoleculeSelect width="" molecules={props.molecules} ref={refMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, true)} />
            <MoorhenChainSelect width="" molecules={props.molecules} onChange={(evt) => handleChainChange(evt, true)} selectedCoordMolNo={selectedRefModel} allowedTypes={[1, 2]} ref={refChainSelectRef} />
        </Form.Group>
        <Form.Group key="moving-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="movModelSelect" className="mb-3">
            <Form.Label>
                Moving structure
            </Form.Label>
            <MoorhenMoleculeSelect width="" molecules={props.molecules} ref={movMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, false)} />
            <MoorhenChainSelect width="" molecules={props.molecules} onChange={(evt) => handleChainChange(evt, false)} selectedCoordMolNo={selectedMovModel} allowedTypes={[1, 2]} ref={movChainSelectRef} />
        </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        if (!refMoleculeSelectRef || !movMoleculeSelectRef) {
            return
        }

        const refMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(refMoleculeSelectRef.current.value))
        const movMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(movMoleculeSelectRef.current.value))

        if (!refMolecule || !movMolecule) {
            return
        } else if (refMolecule.molNo === movMolecule.molNo && refChainSelectRef.current.value === movChainSelectRef.current.value) {
            return
        }

        await props.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: 'SSM_superpose',
            returnType: 'superpose_results',
            commandArgs: [
                refMolecule.molNo,
                refChainSelectRef.current.value,
                movMolecule.molNo,
                movChainSelectRef.current.value
            ],
        })

        refMolecule.atomsDirty = true
        movMolecule.atomsDirty = true
        await Promise.all([
            refMolecule.redraw(props.glRef),
            movMolecule.redraw(props.glRef)
        ])

    }, [props.molecules, props.glRef, props.commandCentre])

    return <MoorhenMenuItem
        id='superpose-models-menu-item'
        popoverContent={panelContent}
        menuItemText="Superpose structures..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

const MoorhenImportLigandDictionary = (props) => {

    const {
        createInstance, setCreateInstance, addToMolecule, fetchLigandDict, panelContent,
        setAddToMolecule, tlcValueRef, createRef, moleculeSelectRef, addToRef,moleculeSelectValueRef,
        addToMoleculeValueRef, setPopoverIsShown, molecules, glRef, commandCentre, menuItemText,
        changeMolecules, backgroundColor, monomerLibraryPath, defaultBondSmoothness, id
    } = props

    const handleFileContent = useCallback(async (fileContent) => {
        let newMolecule
        let selectedMoleculeIndex
        
        if (moleculeSelectValueRef.current) {
            selectedMoleculeIndex = parseInt(moleculeSelectValueRef.current)
            const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMoleculeIndex)
            if (typeof selectedMolecule !== 'undefined') {
                selectedMolecule.addDict(fileContent)
            }
        } else {
            selectedMoleculeIndex = parseInt(-999999)
            await Promise.all([
                commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'shim_read_dictionary',
                    commandArgs: [fileContent, selectedMoleculeIndex],
                    changesMolecules: []
                }, true),
                ...molecules.map(molecule => {
                    molecule.addDictShim(fileContent)
                    return molecule.redraw(glRef)
                })
            ])
            
        }
                
        if (createRef.current) {
            const instanceName = tlcValueRef.current
            const result = await commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [instanceName,
                    selectedMoleculeIndex,
                    ...glRef.current.origin.map(coord => -coord)]
            }, true)
            if (result.data.result.status === "Completed") {
                newMolecule = new MoorhenMolecule(commandCentre, monomerLibraryPath)
                newMolecule.molNo = result.data.result.result
                newMolecule.name = instanceName
                newMolecule.setBackgroundColour(backgroundColor)
                newMolecule.cootBondsOptions.smoothness = defaultBondSmoothness
                await newMolecule.addDict(fileContent)
                changeMolecules({ action: "Add", item: newMolecule })
                await newMolecule.fetchIfDirtyAndDraw("CBs", glRef)
                if (addToMoleculeValueRef.current !== -1) {
                    const toMolecule = molecules.find(molecule => molecule.molNo === addToMoleculeValueRef.current)
                    if (typeof toMolecule !== 'undefined') {
                        const otherMolecules = [newMolecule]
                        await toMolecule.mergeMolecules(otherMolecules, glRef, true)
                        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: glRef.current.origin, modifiedMolecule: toMolecule.molNo } })
                        document.dispatchEvent(scoresUpdateEvent)
                        await toMolecule.redraw(glRef)
                    } else {
                        await newMolecule.redraw(glRef)
                    }
                }
            }
        }

        setPopoverIsShown(false)

    }, [moleculeSelectValueRef, createRef, setPopoverIsShown, molecules, commandCentre, glRef, tlcValueRef, monomerLibraryPath, backgroundColor, defaultBondSmoothness, changeMolecules, addToMoleculeValueRef])

    const popoverContent = <>
            {panelContent}
            <MoorhenMoleculeSelect {...props} allowAny={true} ref={moleculeSelectRef} label="Make monomer available to" onChange={(evt) => {
            moleculeSelectValueRef.current = evt.target.value
        }}/>
            <Form.Group key="createInstance" style={{ width: '20rem', margin: '0.5rem' }} controlId="createInstance" className="mb-3">
                <Form.Label>Create instance on read</Form.Label>
                <InputGroup>
                    <SplitButton title={createInstance ? "Yes" : "No"} id="segmented-button-dropdown-1">
                        <Dropdown.Item key="Yes" href="#" onClick={() => {
                            createRef.current = true
                            setCreateInstance(true)
                        }}>Yes</Dropdown.Item>
                        <Dropdown.Item key="No" href="#" onClick={() => {
                            createRef.current = false
                            setCreateInstance(false)
                        }}>No</Dropdown.Item>
                    </SplitButton>
                    <Form.Select disabled={!createInstance} ref={addToRef} value={addToMolecule} onChange={(e) => {
                        setAddToMolecule(parseInt(e.target.value))
                        addToMoleculeValueRef.current = parseInt(e.target.value)
                    }}>
                        <option key={-1} value={"-1"}>{createInstance ? "...create new molecule" : ""}</option>
                        {props.molecules.map(molecule => <option key={molecule.molNo} value={molecule.molNo}>
                            ...add to {molecule.name}
                        </option>)}
                    </Form.Select>
                </InputGroup>
            </Form.Group>
    </>

    const onCompleted = useCallback(async () => {
        const ligandDict = await fetchLigandDict()
        if (ligandDict) {
            handleFileContent(ligandDict)
        } else {
            console.log('Unable to get ligand dict...')
        }
    }, [handleFileContent, fetchLigandDict])
    
    return <MoorhenMenuItem
        id={id}
        popoverContent={popoverContent}
        menuItemText={menuItemText}
        onCompleted={onCompleted}
        setPopoverIsShown={setPopoverIsShown}
    />

}

export const MoorhenSMILESToLigandMenuItem = (props) => {
    const [smile, setSmile] = useState('')
    const [tlc, setTlc] = useState('')
    const [createInstance, setCreateInstance] = useState(true)
    const [addToMolecule, setAddToMolecule] = useState('')
    const [conformerCount, setConformerCount] = useState(10)
    const [iterationCount, setIterationCount] = useState(100)
    const smileRef = useRef(null)
    const tlcValueRef = useRef(null)
    const createRef = useRef(true)
    const moleculeSelectRef = useRef(null)
    const moleculeSelectValueRef = useRef(null)
    const addToRef = useRef(null)
    const addToMoleculeValueRef = useRef(null)
    const conformerCountRef = useRef(10)
    const iterationCountRef = useRef(100)

    const collectedProps = {
        smile, setSmile, tlc, setTlc, createInstance, setCreateInstance, addToMolecule,
        setAddToMolecule, smileRef, tlcValueRef, createRef, moleculeSelectRef, addToRef,
        addToMoleculeValueRef, moleculeSelectValueRef, ...props
    }

    const smilesToPDB = async () => {
        if (!smileRef.current) {
            console.log('Empty smile, do nothing...')
            return
        }

        let n_conformer
        let n_iteration
        try {
            n_conformer = parseInt(conformerCountRef.current)
            n_iteration = parseInt(iterationCountRef.current)
        } catch (err) {
            console.log(err)
            return
        }

        if ( (isNaN(n_conformer) || n_conformer < 0 || n_conformer === Infinity) || 
            (isNaN(n_iteration) || n_iteration < 0 || n_iteration === Infinity) ) {
            console.log('Unable to parse n_conformer / n_iteration count into a valid int...')
            return
        }

        const response = await props.commandCentre.current.cootCommand({
            command: 'shim_smiles_to_pdb',
            commandArgs: [smileRef.current, tlcValueRef.current, n_conformer, n_iteration],
            returnType: 'str_str_pair'
        }, true)
        const result = response.data.result.result.second

        if (result) {
            return result
        } else {
            console.log('Error creating molecule... Wrong SMILES?')
            props.commandCentre.current.extendConsoleMessage('Error creating molecule... Wrong SMILES?')
        }
    }

    const panelContent = <>
        <Form.Group key="smile" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
            <Form.Label>Type a smile</Form.Label>
            <Form.Control value={smile} type="text" 
                onChange={(e) => {
                    setSmile(e.target.value)
                    smileRef.current = e.target.value
                }}/>
        </Form.Group>            
        <Form.Group key="tlc" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
            <Form.Label>Assign a name</Form.Label>
            <Form.Control value={tlc} type="text" 
                onChange={(e) => {
                    setTlc(e.target.value)
                    tlcValueRef.current = e.target.value
                }}/>
        </Form.Group>
        <Form.Group>
            <TextField
                style={{margin: '0.5rem', width: '9rem'}} 
                id='conformer-count'
                label='No. of conformers'
                type='number'
                variant="standard"
                error={isNaN(parseInt(conformerCount)) || parseInt(conformerCount) < 0 || parseInt(conformerCount) === Infinity}
                value={conformerCount}
                onChange={(evt) => {
                    conformerCountRef.current = evt.target.value
                    setConformerCount(evt.target.value)
                }}
            />
            <TextField
                style={{margin: '0.5rem', width: '9rem'}} 
                id='iteration-count'
                label='No. of iterations'
                type='number'
                variant="standard"
                error={isNaN(parseInt(iterationCount)) || parseInt(iterationCount) < 0 || parseInt(iterationCount) === Infinity}
                value={iterationCount}
                onChange={(evt) => {
                    iterationCountRef.current = evt.target.value
                    setIterationCount(evt.target.value)
                }}
            />
        </Form.Group>
    </>

    return <MoorhenImportLigandDictionary id='smiles-to-ligand-menu-item' menuItemText="From SMILES..." panelContent={panelContent} fetchLigandDict={smilesToPDB} {...collectedProps} />
}

export const MoorhenImportDictionaryMenuItem = (props) => {
    const filesRef = useRef(null)
    const moleculeSelectRef = useRef(null)
    const moleculeSelectValueRef = useRef(null)
    const [tlc, setTlc] = useState('')
    const addToRef = useRef(null)
    const [addToMolecule, setAddToMolecule] = useState('')
    const addToMoleculeValueRef = useRef(null)
    const [fileOrLibrary, setFileOrLibrary] = useState("Library")
    const fileOrLibraryRef = useRef("Library")
    const [createInstance, setCreateInstance] = useState(true)
    const [tlcsOfFile, setTlcsOfFile] = useState([])
    const tlcSelectRef = useRef(null)
    const tlcValueRef = useRef(null)
    const createRef = useRef(true)

    const collectedProps = {
        tlc, setTlc, createInstance, setCreateInstance, addToMolecule,
        setAddToMolecule, tlcValueRef, createRef, moleculeSelectRef, addToRef,
        addToMoleculeValueRef, moleculeSelectValueRef, ...props
    }

    const panelContent = <>
        <Form.Group key="fileOrLibrary" style={{ width: '20rem', margin: '0.5rem' }} controlId="fileOrLibrary" className="mb-3">
            <Form.Label>Select a source</Form.Label>
            <Form.Select value={fileOrLibrary} onChange={(e) => { setFileOrLibrary(e.target.value) }}>
                <option key="File" value="File">From local file</option>
                <option key="Library" value="Library">From monomer library</option>
                <option key="MRC" value="MRC">Fetch from MRC-LMB</option>
            </Form.Select>
        </Form.Group>
        {fileOrLibrary === 'File' ? <>
            <Form.Group key="uploadDicts" style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadDicts" className="mb-3"
                onChange={(e) => {
                    readTextFile(e.target.files[0])
                        .then(fileContent => {
                            const rx = /data_comp_(.*)/g;
                            const tlcs = [...fileContent.matchAll(rx)]
                                .map(array => array[1])
                                .filter(item => item !== 'list')
                            if (tlcs.length > 0) {
                                setTlcsOfFile(tlcs)
                                setTlc(tlcs[0])
                                tlcValueRef.current = tlcs[0]
                            }
                        })
                }}>
                <Form.Label>Browse...</Form.Label>
                <Form.Control ref={filesRef} type="file" accept={[".cif", ".dict", ".mmcif"]} multiple={false} />
            </Form.Group>
            {createInstance &&
                <Form.Select ref={tlcSelectRef} value={tlc} onChange={(newVal) => { setTlc(newVal) }} style={{ width: '20rem', margin: '0.5rem' }} >
                    {tlcsOfFile.map(tlcOfFile => <option key={tlcOfFile} value={tlcOfFile}>{tlcOfFile}</option>)}
                </Form.Select>
            }
        </>
        :
            <Form.Group key="tlc" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
                <Form.Label>Three letter code</Form.Label>
                <Form.Control value={tlc}
                    onChange={(e) => {
                        setTlc(e.target.value)
                        tlcValueRef.current = e.target.value
                    }}
                    type="text" />
            </Form.Group>
        }
    </>

    useEffect(() => {
        fileOrLibraryRef.current = fileOrLibrary
    }, [fileOrLibrary])

    const readMonomerFile = async (newTlc) => {
        return fetch(`${props.monomerLibraryPath}/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
            .then(response => response.text())
            .then(fileContent => {
                return fileContent
            })
        }

    const fetchFromMrcLmb = async (newTlc) => {
        const url = `https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`
        const response = await fetch(url)
        if (!response.ok) {
            console.log(`Cannot fetch data from https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
        } else {
            const fileContent = await response.text()
            return fileContent
        }
    }

    const fetchLigandDict = async () => {
        if (fileOrLibraryRef.current === "File") {
            return readTextFile(filesRef.current.files[0])
        }
        else if (fileOrLibraryRef.current === "Library") {
            return readMonomerFile(tlcValueRef.current)
        } else if (fileOrLibraryRef.current === "MRC") {
            return fetchFromMrcLmb(tlcValueRef.current)
        } else {
            console.log(`Unkown ligand source ${fileOrLibraryRef.current}`)
        }

    }

    return <MoorhenImportLigandDictionary id='import-dict-menu-item' menuItemText="Import dictionary..." panelContent={panelContent} fetchLigandDict={fetchLigandDict} {...collectedProps} />
}

export const MoorhenImportMapCoefficientsMenuItem = (props) => {
    const filesRef = useRef(null)
    const fSelectRef = useRef(null)
    const phiSelectRef = useRef(null)
    const wSelectRef = useRef(null)
    const sigFobsSelectRef = useRef(null)
    const fobsSelectRef = useRef(null)
    const freeRSelectRef = useRef(null)
    const isDiffRef = useRef(null)
    const useWeightRef = useRef(null)
    const calcStructFactRef = useRef(null)
    const [calcStructFact, setCalcStructFact] = useState(false)
    const [columns, setColumns] = useState({})

    const handleFileRead = async (e) => {
        const babyGruMtzWrapper = new MoorhenMtzWrapper()
        let allColumnNames = await babyGruMtzWrapper.loadHeaderFromFile(e.target.files[0])
        setColumns(allColumnNames)
    }

    const handleFile = async (file, selectedColumns) => {
        const newMap = new MoorhenMap(props.commandCentre)
        await newMap.loadToCootFromMtzFile(file, selectedColumns)
        props.changeMaps({ action: 'Add', item: newMap })
        props.setActiveMap(newMap)
        setCalcStructFact(false)
    }

    const onCompleted = async () => {
        let selectedColumns = {
            F: fSelectRef.current.value, PHI: phiSelectRef.current.value, W: wSelectRef.current.value,
            isDifference: isDiffRef.current.checked, useWeight: useWeightRef.current.checked,
            Fobs: fobsSelectRef.current.value, SigFobs: sigFobsSelectRef.current.value,
            FreeR: freeRSelectRef.current.value, calcStructFact: calcStructFactRef.current.checked
        }
        return await handleFile(filesRef.current.files[0], selectedColumns)
    }

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadDicts" className="mb-3">
                <Form.Label>Map coefficient files</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept={[".mtz"]} onChange={(e) => {
                    handleFileRead(e)
                }} />
            </Form.Group>
        </Row>
        <Row key="Row1" style={{ marginBottom: "1rem" }}>
            <Col key="F">
                Amplitude
                <FormSelect size="sm" ref={fSelectRef} defaultValue="FWT" onChange={(val) => { }}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === 'F')
                        .map(key => <option value={key} key={key}>{key}</option>
                        )}
                </FormSelect>
            </Col>
            <Col key="Phi">
                Phase
                <FormSelect size="sm" ref={phiSelectRef} defaultValue="PHWT" onChange={(val) => { }}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === 'P')
                        .map(key => <option value={key} key={key}>{key}</option>
                        )}
                </FormSelect>
            </Col>
            <Col key="Weight">
                Weight
                <FormSelect size="sm" ref={wSelectRef} defaultValue="FOM" onChange={(val) => { }}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === 'W')
                        .map(key => <option value={key} key={key}>{key}</option>
                        )}
                </FormSelect>
            </Col>
        </Row>
        <Row style={{ marginBottom: "1rem" }}>
            <Col>
                <Form.Check label={'is diff map'} name={`isDifference`} type="checkbox" ref={isDiffRef} variant="outline" />
            </Col>
            <Col>
                <Form.Check label={'use weight'} name={`useWeight`} type="checkbox" ref={useWeightRef} variant="outline" />
            </Col>
            <Row key="Row4" style={{ marginTop: "1rem" }}>
                <Col>
                    <Form.Check ref={calcStructFactRef} label={'assign labels for structure factor calculation?'} name={`calcStructFactors`} type="checkbox" variant="outline"
                        onChange={() => setCalcStructFact(
                            (prev) => { return !prev }
                        )}
                    />
                </Col>
            </Row>
        </Row>
        <Row key="Row3" style={{ marginBottom: "1rem" }}>
            <Col key="F">
                Fobs
                <FormSelect size="sm" disabled={!calcStructFactRef.current?.checked} ref={fobsSelectRef} defaultValue="FP" onChange={(val) => { }}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === 'F')
                        .map(key => <option value={key} key={key}>{key}</option>
                        )}
                </FormSelect>
            </Col>
            <Col key="SigF">
                SIGFobs
                <FormSelect size="sm" disabled={!calcStructFactRef.current?.checked} ref={sigFobsSelectRef} defaultValue="SIGFP" onChange={(val) => { }}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === 'Q')
                        .map(key => <option value={key} key={key}>{key}</option>
                        )}
                </FormSelect>
            </Col>
            <Col key="FreeR">
                Free R
                <FormSelect size="sm" disabled={!calcStructFactRef.current?.checked} ref={freeRSelectRef} defaultValue="FREER" onChange={(val) => { }}>
                    {Object.keys(columns)
                        .filter(key => columns[key] === 'I')
                        .map(key => <option value={key} key={key}>{key}</option>
                        )}
                </FormSelect>
            </Col>
        </Row>
    </>

    return <MoorhenMenuItem
        id='import-map-coeff-menu-item'
        popoverContent={panelContent}
        menuItemText="Map coefficients..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenBackupsMenuItem = (props) => {
    const backupSelectRef = useRef(null)

    const retrieveSession = useCallback(async () => {
        const key = backupSelectRef.current.value

        try {
            let backup = await props.timeCapsuleRef.current.retrieveBackup(key)
            props.loadSessionJSON(backup)
        } catch (err) {
            console.log(err)
        }

        document.body.click()

    }, [props.setPopoverIsShown, props.loadSessionJSON, props.timeCapsuleRef])

    const panelContent = <>
        <Row style={{ width: '30rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <MoorhenBackupSelect {...props} ref={backupSelectRef} width='100%' label='Select backup' />
        </Row>
        <Row>
            <Stack direction='horizontal' gap={2}>
                <Button variant='primary' onClick={retrieveSession}>
                    OK
                </Button>
                <Button variant='secondary' onClick={async () => {
                    document.body.click()
                    props.setShowBackupsModal(true)
                }}>
                    More...
                </Button>
            </Stack>
        </Row>
    </>

    return <MoorhenMenuItem
        id="recover-backup-menu-item"
        disabled={props.disabled}
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText="Recover molecule backup..."
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenImportFSigFMenuItem = (props) => {
    const mapSelectRef = useRef(null)
    const twoFoFcSelectRef = useRef(null)
    const foFcSelectRef = useRef(null)
    const moleculeSelectRef = useRef(null)

    const connectMap = async () => {
        const [molecule, reflectionMap, twoFoFcMap, foFcMap] = [
            props.selectedMolNo !== null ? props.selectedMolNo : parseInt(moleculeSelectRef.current.value),
            parseInt(mapSelectRef.current.value),
            parseInt(twoFoFcSelectRef.current.value),
            parseInt(foFcSelectRef.current.value)
        ]
        const uniqueMaps = [...new Set([reflectionMap, twoFoFcMap, foFcMap].slice(1))]
        const connectMapsArgs = [molecule, reflectionMap, twoFoFcMap, foFcMap]
        const sFcalcArgs = [molecule, twoFoFcMap, foFcMap, reflectionMap]

        if (connectMapsArgs.every(arg => !isNaN(arg))) {

            //Calculate rmsd before connecting
            const prevRmsd = await Promise.all(uniqueMaps.map(imol => {
                const currentMap = props.maps.find(map => map.molNo === imol)
                return currentMap.fetchMapRmsd()
            }))

            // Connect maps
            await props.commandCentre.current.cootCommand({
                command: 'connect_updating_maps',
                commandArgs: connectMapsArgs,
                returnType: 'status'
            }, true)

            await props.commandCentre.current.cootCommand({
                command: 'sfcalc_genmaps_using_bulk_solvent',
                commandArgs: sFcalcArgs,
                returnType: 'status'
            }, true)

            const connectedMapsEvent = new CustomEvent("connectMaps", {
                "detail": {
                    molecule: molecule,
                    maps: [reflectionMap, twoFoFcMap, foFcMap],
                    uniqueMaps: uniqueMaps
                }
            })
            document.dispatchEvent(connectedMapsEvent)

            //Adjust contour to match previous rmsd
            await Promise.all(
                uniqueMaps.map((imol, index) => {
                    const currentMap = props.maps.find(map => map.molNo === imol)
                    return currentMap.fetchMapRmsd().then(postRmsd => {
                        let newContourLevel = currentMap.contourLevel * postRmsd / prevRmsd[index]
                        if (currentMap.isDifference) {
                            newContourLevel -= newContourLevel * 0.3
                        }
                        const newMapContourEvt = new CustomEvent("newMapContour", {
                            "detail": {
                                molNo: currentMap.molNo,
                                mapRadius: currentMap.mapRadius,
                                cootContour: currentMap.cootContour,
                                contourLevel: newContourLevel,
                                mapColour: currentMap.colour,
                                litLines: currentMap.litLines,
                            }
                        })
                        document.dispatchEvent(newMapContourEvt)    
                    })
                })
            )
        }
    }

    const onCompleted = async () => {
        return await connectMap()
    }

    const panelContent = <>
        <Row>
            <Col style={{ width: '30rem' }}>
                <MoorhenMapSelect {...props} ref={mapSelectRef} filterFunction={(map) => map.hasReflectionData} allowAny={false} width='100%' label='Reflection data' />
            </Col>
        </Row>
        <Row style={{ marginBottom: "1rem" }}>
            <Col key="Col1">
                <MoorhenMapSelect {...props} ref={twoFoFcSelectRef} label="2foFc" allowAny={false} width='100%' />
            </Col>
            <Col key="Col2">
                <MoorhenMapSelect {...props} ref={foFcSelectRef} label="FoFc" filterFunction={(map) => map.isDifference} allowAny={false} width='100%' />
            </Col>
            {props.selectedMolNo === null &&
                <Col key="Col3">
                    <MoorhenMoleculeSelect {...props} ref={moleculeSelectRef} label="Molecule" allowAny={false} width='100%' />
                </Col>
            }
        </Row>
    </>

    return <MoorhenMenuItem
        id="connect-molecule-and-map-menu-item"
        popoverContent={panelContent}
        menuItemText="Connect mol. and map for updating..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenImportFSigFMenuItem.defaultProps = { selectedMolNo: null }

export const MoorhenImportMapMenuItem = (props) => {
    const filesRef = useRef(null)
    const isDiffRef = useRef()

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadCCP4Map" className="mb-3">
                <Form.Label>CCP4/MRC Map...</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept={[".map", ".mrc"]} onChange={(e) => {
                    handleFileRead(e)
                }} />
            </Form.Group>
        </Row>
        <Row style={{ marginBottom: "1rem" }}>
            <Col>
                <Form.Check label={'is diff map'} name={`isDifference`} type="checkbox" ref={isDiffRef} variant="outline" />
            </Col>
        </Row>
    </>

    const handleFileRead = async (e) => {
        "Here I would suggest we parse the file provided and give feedback on contents"
    }

    const onCompleted = useCallback(async (e) => {
        const file = filesRef.current.files[0]
        const newMap = new MoorhenMap(props.commandCentre)
        await newMap.loadToCootFromMapFile(file, isDiffRef.current.checked)
        props.changeMaps({ action: 'Add', item: newMap })
        props.setActiveMap(newMap)
    }, [props.maps, filesRef.current, isDiffRef.current])

    return <MoorhenMenuItem
        id='import-map-menu-item'
        popoverContent={panelContent}
        menuItemText="CCP4/MRC map..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenAutoOpenMtzMenuItem = (props) => {
    const filesRef = useRef(null)

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMTZ" className="mb-3">
                <Form.Label>Auto open MTZ file</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept={[".mtz"]} />
            </Form.Group>
        </Row>
    </>

    const onCompleted = useCallback(async (e) => {
        const file = filesRef.current.files[0]

        const reflectionData = await readDataFile(file)
        const mtzData = new Uint8Array(reflectionData)

        const response = await props.commandCentre.current.cootCommand({
            returnType: "int_array",
            command: "shim_auto_open_mtz",
            commandArgs: [mtzData]
        })

        const isDiffMapResponses = await Promise.all(response.data.result.result.map(mapMolNo => {
            return props.commandCentre.current.cootCommand({
                returnType: "status",
                command: "is_a_difference_map",
                commandArgs: [mapMolNo]
            })
        }))

        response.data.result.result.forEach((mapMolNo, index) => {
            const newMap = new MoorhenMap(props.commandCentre)
            newMap.molNo = mapMolNo
            newMap.name = `${file.name.replace('mtz', '')}-map-${index}`
            newMap.isDifference = isDiffMapResponses[index].data.result.result
            props.changeMaps({ action: 'Add', item: newMap })
            if (index === 0) props.setActiveMap(newMap)
        })

    }, [filesRef.current, props.changeMaps, props.commandCentre])

    return <MoorhenMenuItem
        id='auto-open-mtz-menu-item'
        popoverContent={panelContent}
        menuItemText="Auto open MTZ..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
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

export const MoorhenLightingMenuItem = (props) => {
    const [diffuse, setDiffuse] = useState(props.glRef.current.light_colours_diffuse)
    const [specular, setSpecular] = useState(props.glRef.current.light_colours_specular)
    const [ambient, setAmbient] = useState(props.glRef.current.light_colours_ambient)
    const [specularPower, setSpecularPower] = useState(props.glRef.current.specularPower)
    const [position, setPosition] = useState([props.glRef.current.light_positions[0],props.glRef.current.light_positions[1],props.glRef.current.light_positions[2]])

    const busyLighting = useRef(false)
    const isSetLightPosIsDirty = useRef(false)

    const setLightingPositionIfDirty = (newValue) => {
        if (isSetLightPosIsDirty.current) {
            busyLighting.current = true
            isSetLightPosIsDirty.current = false
            props.glRef.current.setLightPosition(newValue[0],-newValue[1],newValue[2])
            props.glRef.current.drawScene()
            busyLighting.current = false;
            setLightingPositionIfDirty(newValue)
        }
    }

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.light_colours_diffuse) {
            setDiffuse(props.glRef.current.light_colours_diffuse[0])
            setSpecular(props.glRef.current.light_colours_specular[0])
            setAmbient(props.glRef.current.light_colours_ambient[0])
            setSpecularPower(props.glRef.current.specularPower)
            setPosition([props.glRef.current.light_positions[0],props.glRef.current.light_positions[1],props.glRef.current.light_positions[2]])
        }
    }, [props.glRef.current.specularPower,props.glRef.current.light_positions,props.glRef.current.light_colours_diffuse,props.glRef.current.light_colours_specular,props.glRef.current.light_colours_ambient])

    const panelContent = <div>
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Diffuse"
            initialValue={props.glRef.current.light_colours_diffuse[0]}
            externalValue={props.glRef.current.light_colours_diffuse[0]}
            setExternalValue={(newValue) => {
                props.glRef.current.light_colours_diffuse = [newValue,newValue,newValue,1.0]
                props.glRef.current.drawScene()
                setDiffuse([newValue, newValue, newValue,1.0])
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Specular"
            initialValue={props.glRef.current.light_colours_specular[0]}
            externalValue={props.glRef.current.light_colours_specular[0]}
            setExternalValue={(newValue) => {
                props.glRef.current.light_colours_specular = [newValue,newValue,newValue,1.0]
                props.glRef.current.drawScene()
                setSpecular([newValue, newValue, newValue,1.0])
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Ambient"
            initialValue={props.glRef.current.light_colours_ambient[0]}
            externalValue={props.glRef.current.light_colours_ambient[0]}
            setExternalValue={(newValue) => {
                props.glRef.current.light_colours_ambient = [newValue,newValue,newValue,1.0]
                props.glRef.current.drawScene()
                setAmbient([newValue, newValue, newValue,1.0])
            }} />
        <MoorhenSlider minVal={1.0} maxVal={128.0} logScale={false}
            sliderTitle="Specular Power"
            initialValue={props.glRef.current.specularPower}
            externalValue={props.glRef.current.specularPower}
            setExternalValue={(newValue) => {
                props.glRef.current.specularPower = newValue
                props.glRef.current.drawScene()
                setAmbient(newValue)
            }} />
        <MoorhenLightPosition
            initialValue={props.glRef.current.light_positions}
            externalValue={props.glRef.current.light_positions}
            setExternalValue={(newValue) => {
                isSetLightPosIsDirty.current = true
                setLightingPositionIfDirty(newValue)
            }}
        />
    </div>

    return <MoorhenMenuItem
        id='lighting-menu-item'
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText="Lighting..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenClipFogMenuItem = (props) => {
    const [zclipFront, setZclipFront] = useState(props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3])
    const [zclipBack, setZclipBack] = useState(props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset)
    const [zfogFront, setZfogFront] = useState(props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start)
    const [zfogBack, setZfogBack] = useState(props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset)

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0 && props.glRef.current.gl_clipPlane1) {
            setZclipFront(props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset)
            setZfogFront(props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset)
        }
    }, [props.glRef.current.gl_clipPlane, props.glRef.current.gl_clipPlane1[3], props.glRef.current.gl_clipPlane0[3], props.glRef.current.gl_fog_start, props.glRef.current.gl_fog_end])

    const panelContent = <div>
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front clip"
            initialValue={props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3]}
            externalValue={zclipFront}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_clipPlane0[3] = newValue - props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
                setZclipFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back clip"
            initialValue={props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset}
            externalValue={zclipBack}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_clipPlane1[3] = props.glRef.current.fogClipOffset + newValue
                props.glRef.current.drawScene()
                setZclipBack(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front zFog"
            initialValue={props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start}
            externalValue={zfogFront}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_fog_start = props.glRef.current.fogClipOffset - newValue
                props.glRef.current.drawScene()
                setZfogFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back zFog"
            externalValue={zfogBack}
            initialValue={props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_fog_end = newValue + props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
                setZfogBack(newValue)
            }} />
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={props.resetClippingFogging}
                onChange={() => { props.setResetClippingFogging(!props.resetClippingFogging) }}
                label="Reset clipping and fogging on zoom" />
        </InputGroup>
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={props.clipCap}
                onChange={() => { props.setClipCap(!props.clipCap) }}
                label="'Clip-cap' perfect spheres" />
        </InputGroup>
    </div>

    return <MoorhenMenuItem
        id='clipping-fogging-menu-item'
        popoverContent={panelContent}
        menuItemText="Clipping and fogging..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenMergeMoleculesMenuItem = (props) => {
    const toRef = useRef(null)
    const fromRef = useRef(null)

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} label="Into molecule" allowAny={false} ref={toRef} />
        {props.fromMolNo === null ? <MoorhenMoleculeSelect {...props} label="From molecule" allowAny={false} ref={fromRef} /> : null}
    </>

    const onCompleted = useCallback(async () => {
        const toMolecule = props.molecules
            .filter(molecule => molecule.molNo === parseInt(toRef.current.value))[0]
        const otherMolecules = props.molecules
            .filter(molecule => molecule.molNo === parseInt(props.fromMolNo !== null ? props.fromMolNo : fromRef.current.value) && molecule.molNo !== toMolecule.molNo)
        if (!otherMolecules.length > 0) {
            console.log('No valid molecules selected, skipping merge...')
            return
        }
        await toMolecule.mergeMolecules(otherMolecules, props.glRef, true)
        props.setPopoverIsShown(false)
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: toMolecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
    }, [toRef.current, fromRef.current, props.molecules, props.fromMolNo, props.glRef])

    return <MoorhenMenuItem
        id='merge-molecules-menu-item'
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText={props.menuItemText}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenMergeMoleculesMenuItem.defaultProps = {
    popoverPlacement: "right",
    menuItemText: 'Merge molecules...',
    fromMolNo: null
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

export const MoorhenAssociateReflectionsToMap = (props) => {
    const mapSelectRef = useRef(null)
    const filesRef = useRef(null)
    const fobsSelectRef = useRef(null)
    const sigFobsSelectRef = useRef(null)
    const freeRSelectRef = useRef(null)
    const reflectionDataRef = useRef(null)
    const [columns, setColumns] = useState({})
    const [reflectionData, setReflectionData] = useState({})

    const handleFileRead = async (e) => {
        const babyGruMtzWrapper = new MoorhenMtzWrapper()
        let allColumnNames = await babyGruMtzWrapper.loadHeaderFromFile(e.target.files[0])
        setColumns(allColumnNames)
        reflectionDataRef.current = babyGruMtzWrapper.reflectionData
    }

    const onCompleted = async () => {
        const selectedMap = props.maps.find(map => map.molNo === parseInt(mapSelectRef.current.value))
        const selectedColumns = {
            Fobs: fobsSelectRef.current.value, SigFobs: sigFobsSelectRef.current.value,
            FreeR: freeRSelectRef.current.value, calcStructFact: true
        }
        await selectedMap.associateToReflectionData(selectedColumns, reflectionDataRef.current)
    }

    const panelContent = <>
        <Stack direction='vertical' gap={2}>
            <MoorhenMapSelect {...props} ref={mapSelectRef} filterFunction={(map) => !map.hasReflectionData} allowAny={false} width='100%' label='Select a map' />
            <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMTZ" className="mb-3">
                <Form.Label>Upload MTZ file with reflection data</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept={[".mtz"]} onChange={(e) => {
                    handleFileRead(e)
                }} />
            </Form.Group>
            <Stack direcotion='horizontal'>
                <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="fobs" className="mb-3">
                    <Form.Label>Fobs</Form.Label>
                    <FormSelect size="sm" ref={fobsSelectRef} defaultValue="FP" onChange={(val) => { }}>
                        {Object.keys(columns)
                            .filter(key => columns[key] === 'F')
                            .map(key => <option value={key} key={key}>{key}</option>
                            )}
                    </FormSelect>
                </Form.Group>
                <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="sigfobs" className="mb-3">
                    <Form.Label>SIGFobs</Form.Label>
                    <FormSelect size="sm" ref={sigFobsSelectRef} defaultValue="SIGFP" onChange={(val) => { }}>
                        {Object.keys(columns)
                            .filter(key => columns[key] === 'Q')
                            .map(key => <option value={key} key={key}>{key}</option>
                            )}
                    </FormSelect>
                </Form.Group>
                <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="freeR" className="mb-3">
                    <Form.Label>Free R</Form.Label>
                    <FormSelect size="sm" ref={freeRSelectRef} defaultValue="FREER" onChange={(val) => { }}>
                        {Object.keys(columns)
                            .filter(key => columns[key] === 'I')
                            .map(key => <option value={key} key={key}>{key}</option>
                            )}
                    </FormSelect>
                </Form.Group>
            </Stack>
        </Stack>
    </>

    return <MoorhenMenuItem
        id='associate-reflections-menu-item'
        popoverContent={panelContent}
        menuItemText="Associate map to reflection data..."
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
