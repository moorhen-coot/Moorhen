import { MenuItem } from "@mui/material";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button, FormSelect, Row, Col, SplitButton, Dropdown, Stack } from "react-bootstrap";
import { SketchPicker } from "react-color";
import { MoorhenMtzWrapper, readTextFile, readDataFile, getMultiColourRuleArgs } from "../utils/MoorhenUtils";
import { MoorhenMap } from "../utils/MoorhenMap";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";
import { MoorhenMoleculeSelect } from "./MoorhenMoleculeSelect";
import { MoorhenMapSelect } from "./MoorhenMapSelect";
import { MoorhenBackupSelect } from "./MoorhenBackupSelect";
import { MoorhenChainSelect } from "./MoorhenChainSelect";
import MoorhenSlider from "./MoorhenSlider";
import "rc-tree/assets/index.css"
import Tree from 'rc-tree';

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
            <MenuItem className={props.textClassName} id={props.id} variant="success">{props.menuItemText}</MenuItem>
        </OverlayTrigger> :
            <MenuItem className={props.textClassName} variant="success">{props.menuItemText}</MenuItem>
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
    onCompleted: () => { }
}

export const MoorhenLoadTutorialDataMenuItem = (props) => {
    const tutorialNumberSelectorRef = useRef(null);
    const allTutorialNumbers = ['1', '2', '3']
    const tutorialMtzColumnNames = {
        1: {F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR:'FREE'},
        2: {F: "FWT", PHI: "PHWT", Fobs: 'FP', SigFobs: 'SIGFP', FreeR:'FREE'},
        3: {F: "FWT", PHI: "PHWT", Fobs: 'F', SigFobs: 'SIGF', FreeR:'FREER'}
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
        newMolecule.loadToCootFromURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.pdb`, `moorhen-tutorial-${tutorialNumber}`)
            .then(result => {
                newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
            }).then(result => {
                props.changeMolecules({ action: "Add", item: newMolecule })
                Promise.resolve(newMolecule)
            }).then(_ => {
                newMolecule.centreOn(props.glRef, null, false)
            }).then(_ => {
                return newMap.loadToCootFromMtzURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`, `moorhen-tutorial-${tutorialNumber}`,
                    {
                        isDifference: false, useWeight: false, calcStructFact: true, ...tutorialMtzColumnNames[tutorialNumber]
                    })
            }).then(_ => {
                return newDiffMap.loadToCootFromMtzURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`, `moorhen-tutorial-${tutorialNumber}`,
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


    const onCompleted = () => {
        const fromMolNo = parseInt(selectRef.current.value)
        const newTlc = tlcRef.current.value
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

        getMonomer()
            .then(result => {
                if (result.data.result.result === -1) {
                    return newMolecule.loadMissingMonomer(newTlc, fromMolNo)
                        .then(() => { return getMonomer() })
                }
                return Promise.resolve(result)
            })
            .then(result => {
                if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
                    const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
                    newMolecule.molNo = result.data.result.result
                    newMolecule.name = newTlc
                    newMolecule.setBackgroundColour(props.backgroundColor)
                    newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
                    return newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef).then(_ => {
                        props.changeMolecules({ action: "Add", item: newMolecule })
                    })
                } else {
                    console.log('Error getting monomer... Missing dictionary?')
                    props.commandCentre.current.extendConsoleMessage('Error getting monomer... Missing dictionary?')
                }
            })
    }

    return <MoorhenMenuItem
        id='get-monomer-menu-item'
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenFitLigandRightHereMenuItem = (props) => {
    const tlcRef = useRef()
    const intoMoleculeRef = useRef(null)
    const ligandMoleculeRef = useRef(null)
    const mapSelectRef = useRef(null)

    const panelContent = <>
        <MoorhenMapSelect {...props} label="Map" allowAny={false} ref={mapSelectRef} />
        <MoorhenMoleculeSelect {...props} label="Protein molecule" allowAny={false} ref={intoMoleculeRef} />
        <MoorhenMoleculeSelect {...props} label="Ligand molecule" allowAny={false} ref={ligandMoleculeRef} />
    </>


    const onCompleted = () => {
        props.commandCentre.current.cootCommand({
            returnType: 'int_array',
            command: 'fit_ligand_right_here',
            commandArgs: [
                parseInt(intoMoleculeRef.current.value),
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                ...props.glRef.current.origin.map(coord => -coord),
                1., false, 1
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
    />
}

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
        const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: props.molecule.molNo} })
        document.dispatchEvent(mapUpdateEvent)
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
        menuItemText={"Default smoothness of molecule bonds"}
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
        maxBackupCount, setMaxBackupCount, modificationCountBackupThreshold, setModificationCountBackupThreshold
    } = props

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenMaxBackupCount">
                <MoorhenSlider minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="Max. number of stored backups" initialValue={maxBackupCount} externalValue={maxBackupCount} setExternalValue={setMaxBackupCount} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '18rem', margin: '0' }} controlId="MoorhenModifThresholdBackup">
                <MoorhenSlider minVal={1} maxVal={30} allowFloats={false} logScale={false} sliderTitle="No. of modifications to trigger backup" initialValue={modificationCountBackupThreshold} externalValue={modificationCountBackupThreshold} setExternalValue={setModificationCountBackupThreshold} />
            </Form.Group>
        </>

    return <MoorhenMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Automatic backup settings"}
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
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Options for scores when updating maps"}
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
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenMapOpacitySlider">
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

export const MoorhenMoleculeGaussianSurfaceSettingsMenuItem = (props) => {

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfSigmaSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Sigma" initialValue={4.4} externalValue={props.surfaceSigma} setExternalValue={props.setSurfaceSigma} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfLevelSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Contour level" initialValue={4.0} externalValue={props.surfaceLevel} setExternalValue={props.setSurfaceLevel} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenGausSurfRadiusSlider">
                <MoorhenSlider minVal={0.01} maxVal={10} logScale={false} sliderTitle="Box radius" initialValue={5.0} externalValue={props.surfaceRadius} setExternalValue={props.setSurfaceRadius} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSurfGridScaleSlider">
                <MoorhenSlider minVal={0.01} maxVal={1.5} logScale={false} sliderTitle="Grid scale" initialValue={0.7} externalValue={props.surfaceGridScale} setExternalValue={props.setSurfaceGridScale} />
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
        menuItemText="Set background colour..."
        onCompleted={() => props.setPopoverIsShown(false) }
        setPopoverIsShown={props.setPopoverIsShown}
        />
}

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
            <MoorhenMoleculeSelect width="" molecules={props.molecules} ref={refMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, true)}/>
            <MoorhenChainSelect width="" molecules={props.molecules} onChange={(evt) => handleChainChange(evt, true)} selectedCoordMolNo={selectedRefModel} allowedTypes={[1, 2]} ref={refChainSelectRef}/>
        </Form.Group>
        <Form.Group key="moving-model-select" style={{ width: '20rem', margin: '0.5rem' }} controlId="movModelSelect" className="mb-3">
            <Form.Label>
                Moving structure
            </Form.Label>
            <MoorhenMoleculeSelect width="" molecules={props.molecules} ref={movMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, false)}/>
            <MoorhenChainSelect width="" molecules={props.molecules} onChange={(evt) => handleChainChange(evt, false)} selectedCoordMolNo={selectedMovModel} allowedTypes={[1, 2]} ref={movChainSelectRef}/>
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

export const MoorhenImportDictionaryMenuItem = (props) => {
    const filesRef = useRef(null)
    const moleculeSelectRef = useRef(null)
    const tlcRef = useRef(null)
    const [tlc, setTlc] = useState('')
    const addToRef = useRef(null)
    const [addToMolecule, setAddToMolecule] = useState('')
    const addToMoleculeValue = useRef(null)
    const [fileOrLibrary, setFileOrLibrary] = useState("Library")
    const fileOrLibraryRef = useRef("Library")
    const [createInstance, setCreateInstance] = useState(true)
    const [tlcsOfFile, setTlcsOfFile] = useState([])
    const tlcSelectRef = useRef(null)
    const tlcValueRef = useRef(null)
    const createInstanceRef = useRef(null)
    const createRef = useRef(true)

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
                <Form.Select ref={tlcSelectRef} value={tlc} onChange={(newVal) => { setTlc(newVal) }}>
                    {tlcsOfFile.map(tlcOfFile => <option key={tlcOfFile} value={tlcOfFile}>{tlcOfFile}</option>)}
                </Form.Select>
            }
        </>
            :
            <Form.Group key="tlc" style={{ width: '20rem', margin: '0.5rem' }} controlId="tlc" className="mb-3">
                <Form.Label>Three letter code</Form.Label>
                <Form.Control ref={tlcRef} value={tlc}
                    onChange={(e) => {
                        setTlc(e.target.value)
                        tlcValueRef.current = e.target.value
                    }}
                    type="text" />
            </Form.Group>
        }
        <MoorhenMoleculeSelect {...props} allowAny={true} ref={moleculeSelectRef} label="Make monomer available to" />
        <Form.Group key="createInstance" style={{ width: '20rem', margin: '0.5rem' }} controlId="createInstance" className="mb-3">
            <Form.Label>Create instance on read</Form.Label>
            <InputGroup>
                <SplitButton
                    title={createInstance ? "Yes" : "No"}
                    id="segmented-button-dropdown-1"
                >
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
                    addToMoleculeValue.current = parseInt(e.target.value)
                }}>
                    <option key={-1} value={"-1"}>{createInstance ? "...create new molecule" : ""}</option>
                    {props.molecules.map(molecule => <option key={molecule.molNo} value={molecule.molNo}>
                        ...add to {molecule.name}
                    </option>)}
                </Form.Select>
            </InputGroup>
        </Form.Group>
    </>

    useEffect(() => {
        fileOrLibraryRef.current = fileOrLibrary
    }, [fileOrLibrary])

    const handleFileContent = useCallback(async (fileContent) => {
        let newMolecule
        let selectedMoleculeIndex
        if (moleculeSelectRef.current) {
            selectedMoleculeIndex = parseInt(moleculeSelectRef.current.value)
        } else {
            selectedMoleculeIndex = parseInt(-999999)
        }
        return props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_read_dictionary',
            commandArgs: [fileContent, selectedMoleculeIndex],
            changesMolecules: []
        }, true)
            .then(_ => {
                props.molecules.forEach(molecule => {
                    if (molecule.molNo === parseInt(selectedMoleculeIndex) ||
                        -999999 === parseInt(selectedMoleculeIndex)) {
                        molecule.addDict(fileContent)
                    }
                })
                return Promise.resolve(true)
            })
            .then(async (result) => {
                props.molecules.forEach(async molecule => {
                    if (molecule.molNo === parseInt(selectedMoleculeIndex) ||
                        -999999 === parseInt(selectedMoleculeIndex)) {
                        let a = await molecule.redraw(props.glRef)
                    }
                })
                return Promise.resolve()
            })
            .then(result => {
                if (createRef.current) {
                    const instanceName = tlcValueRef.current
                    return props.commandCentre.current.cootCommand({
                        returnType: 'status',
                        command: 'get_monomer_and_position_at',
                        commandArgs: [instanceName,
                            selectedMoleculeIndex,
                            ...props.glRef.current.origin.map(coord => -coord)]
                    }, true)
                        .then(result => {
                            if (result.data.result.status === "Completed") {
                                newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
                                newMolecule.molNo = result.data.result.result
                                newMolecule.name = instanceName
                                newMolecule.setBackgroundColour(props.backgroundColor)
                                newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
                                newMolecule.addDict(fileContent)
                                props.changeMolecules({ action: "Add", item: newMolecule })
                                return newMolecule.fetchIfDirtyAndDraw("CBs", props.glRef)
                            }
                        })
                }
                else {
                    return Promise.resolve(false)
                }
            })
            .then(result => {
                if (newMolecule) {
                    //Here if instance created
                    if (addToMoleculeValue.current !== -1) {
                        const toMolecule = props.molecules.filter(molecule => molecule.molNo === addToMoleculeValue.current)[0]
                        if (toMolecule) {
                            const otherMolecules = [newMolecule]
                            return toMolecule.mergeMolecules(otherMolecules, props.glRef, true)
                                .then(_ => {
                                    const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: toMolecule.molNo} })
                                    document.dispatchEvent(mapUpdateEvent)
                                    return toMolecule.redraw(props.glRef)
                                })
                        } else {
                            newMolecule.redraw(props.glRef)
                        }
                    }
                    props.setPopoverIsShown(false)
                }
            })
    }, [fileOrLibrary, moleculeSelectRef, moleculeSelectRef, props.molecules, tlcRef, tlc, addToRef, createInstance])

    const readMmcifFile = async (file) => {
        return readTextFile(file)
            .then(fileContent => {
                return handleFileContent(fileContent)
            })
    }

    const readMonomerFile = async (newTlc) => {
        return fetch(`${props.monomerLibraryPath}/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
            .then(response => response.text())
            .then(fileContent => {
                return handleFileContent(fileContent)
            })
    }

    const fetchFromMrcLmb = async (newTlc) => {
        const url = `https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`
        const response = await fetch(url)
        if (!response.ok) {
            console.log(`Cannot fetch data from https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
        } else {
            const fileContent = await response.text()
            return handleFileContent(fileContent)
        }
    }

    const onCompleted = useCallback(async () => {
        if (fileOrLibraryRef.current === "File") {
            let readPromises = []
            for (const file of filesRef.current.files) {
                readPromises.push(readMmcifFile(file))
            }
            let mmcifReads = await Promise.all(readPromises)
        }
        else if (fileOrLibraryRef.current === "Library") {
            readMonomerFile(tlcRef.current.value)
        } else if (fileOrLibraryRef.current === "MRC") {
            fetchFromMrcLmb(tlcRef.current.value)
        } else {
            console.log(`Unkown ligand source ${fileOrLibraryRef.current}`)
        }

    }, [handleFileContent])

    return <MoorhenMenuItem
        id='import-dict-menu-item'
        popoverContent={panelContent}
        menuItemText="Import dictionary..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
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
        <Row style={{ width: '30rem', marginTop: '0.5rem',  marginBottom: '0.5rem' }}>
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
            const prevRmsd = await Promise.all(uniqueMaps.map(imol => props.commandCentre.current.cootCommand({
                command: 'get_map_rmsd_approx',
                commandArgs: [imol],
                returnType: 'status'
            }, true)))

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
            const postRmsd = await Promise.all(uniqueMaps.map(imol => props.commandCentre.current.cootCommand({
                command: 'get_map_rmsd_approx',
                commandArgs: [imol],
                returnType: 'status'
            }, true)))
  
            uniqueMaps.forEach((imol, index) => {
                const map = props.maps.find(map => map.molNo === imol)
                let newContourLevel = map.contourLevel * postRmsd[index].data.result.result / prevRmsd[index].data.result.result
                if (map.isDifference) {
                    newContourLevel -= newContourLevel * 0.3
                } 
                const newMapContourEvt = new CustomEvent("newMapContour", {
                    "detail": {
                        molNo: map.molNo,
                        mapRadius: map.mapRadius,
                        cootContour: map.cootContour,
                        contourLevel: newContourLevel,
                        mapColour: map.colour,
                        litLines: map.litLines,
                    }
                })
                document.dispatchEvent(newMapContourEvt)    
            })
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
        popoverContent={panelContent}
        menuItemText="Connect molecule and map for updating..."
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
            <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadCCP4Map" className="mb-3">
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

        let promises = []
        response.data.result.result.forEach(mapMolNo => {
            promises.push(
                props.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: "is_a_difference_map",
                    commandArgs: [mapMolNo]
                })
            )
        })
        const isDiffMapResponses = await Promise.all(promises)

        response.data.result.result.forEach((mapMolNo, index) => {
            const newMap = new MoorhenMap(props.commandCentre)
            newMap.molNo = mapMolNo
            newMap.name = `${file.name.replace('mtz', '')}-map-${index}`
            newMap.isDifference = isDiffMapResponses[index]
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
        <p>Current version: 25th Jan 2023 10:31</p>
    </div>

    return <MoorhenMenuItem
        id='help-about-menu-item'
        popoverContent={panelContent}
        menuItemText="About..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenClipFogMenuItem = (props) => {
    const [zclipFront, setZclipFront] = useState(500 + props.glRef.current.gl_clipPlane0[3])
    const [zclipBack, setZclipBack] = useState(props.glRef.current.gl_clipPlane1[3] - 500)
    const [zfogFront, setZfogFront] = useState(500 - props.glRef.current.gl_fog_start)
    const [zfogBack, setZfogBack] = useState(props.glRef.current.gl_fog_end - 500)

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0) {
            setZclipFront(500 + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - 500)
            setZfogFront(500 - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - 500)
        }
    }, [props.glRef.current.gl_clipPlane, props.glRef.current.gl_clipPlane1, props.glRef.current.gl_fog_start, props.glRef.current.gl_fog_end])

    const panelContent = <div style={{ minWidth: "20rem" }}>
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front clip"
            initialValue={500 + props.glRef.current.gl_clipPlane0[3]}
            externalValue={zclipFront}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_clipPlane0[3] = newValue - 500
                props.glRef.current.drawScene()
                setZclipFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back clip"
            initialValue={props.glRef.current.gl_clipPlane1[3] - 500}
            externalValue={zclipBack}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_clipPlane1[3] = 500 + newValue
                props.glRef.current.drawScene()
                setZclipBack(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front zFog"
            initialValue={500 - props.glRef.current.gl_fog_start}
            externalValue={zfogFront}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_fog_start = 500 - newValue
                props.glRef.current.drawScene()
                setZfogFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back zFog"
            externalValue={zfogBack}
            initialValue={props.glRef.current.gl_fog_end - 500}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_fog_end = newValue + 500
                props.glRef.current.drawScene()
                setZfogBack(newValue)
            }} />
        <InputGroup style={{ paddingLeft:'0.1rem', paddingBottom: '0.5rem', width: '25rem'}}>
            <Form.Check 
                type="switch"
                checked={props.resetClippingFogging}
                onChange={() => { props.setResetClippingFogging(!props.resetClippingFogging) }}
                label="Reset clipping and fogging on zoom"/>
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
        const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: toMolecule.molNo} })
        document.dispatchEvent(mapUpdateEvent)
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
        if (!selectedCid) {
            return
        }

        const [molName, insCode, chainId, resInfo, atomName] = selectedCid.split('/')
        if (!molName || !chainId || !resInfo) {
            return
        }

        const molecule = props.molecules.find(molecule => molecule.name === molName)
        if (!molecule) {
            return
        }

        const resNum = resInfo.split("(")[0]

        molecule.centreOn(props.glRef, `/*/${chainId}/${resNum}-${resNum}/*`)
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
    const molNo = useRef(null)

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} ref={moleculeRef} allowAny={false} />
    </>

    const onCompleted = useCallback(() => {
        molNo.current = parseInt(moleculeRef.current.value)
        return props.commandCentre.current.cootCommand({
            command: 'add_waters',
            commandArgs: [parseInt(molNo.current), props.activeMap.molNo],
            returnType: "status",
            changesMolecules: [parseInt(molNo.current)]
        }, true).then(result => {
            props.molecules
                .filter(molecule => molecule.molNo === molNo.current)
                .forEach(molecule => {
                    molecule.setAtomsDirty(true)
                    molecule.redraw(props.glRef)
                })
        })
    }, [props.molecules])

    return <MoorhenMenuItem
        id='add-waters-menu-item'
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
            }
            menuItemText="Centre on ligand..."
            setPopoverIsShown={props.setPopoverIsShown}
        />
    </>

}
