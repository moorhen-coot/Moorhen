import { MenuItem } from "@mui/material";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button, FormSelect, Row, Col, SplitButton, Dropdown, Toast, ToastContainer } from "react-bootstrap";
import { SketchPicker } from "react-color";
import { MoorhenMtzWrapper, readTextFile } from "../utils/MoorhenUtils";
import { MoorhenMap } from "../utils/MoorhenMap";
import { MoorhenMolecule } from "../utils/MoorhenMolecule";
import { MoorhenMoleculeSelect } from "./MoorhenMoleculeSelect";
import MoorhenSlider from "./MoorhenSlider";
import { MoorhenMapSelect } from "./MoorhenMapSelect";
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
                <Popover style={{ maxWidth: "40rem" }}>

                    <PopoverHeader as="h3">{props.menuItemTitle}</PopoverHeader>
                    <PopoverBody>
                        {props.popoverContent}
                        {props.showOkButton &&
                            <Button variant={props.buttonVariant} onClick={() => {
                                console.log('Popover clicked')
                                resolveOrRejectRef.current.resolve()
                            }}>
                                {props.buttonText}
                            </Button>
                        }

                    </PopoverBody>
                </Popover>}
        >
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
    const allTutorialNumbers = ['1', '2']

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
        console.log({ onCompletedArg })
        const tutorialNumber = tutorialNumberSelectorRef.current.value
        console.log(`Loading data for tutorial number ${tutorialNumber}`)
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.urlPrefix)
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
                newMolecule.centreOn(props.glRef)
            }).then(_ => {
                return newMap.loadToCootFromMtzURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`, `moorhen-tutorial-${tutorialNumber}`,
                    {
                        F: "FWT", PHI: "PHWT", Fobs: tutorialNumber === '1' ? 'F' : 'FP', SigFobs: tutorialNumber === '1' ? 'SIGF' : 'SIGFP', FreeR: tutorialNumber === '1' ? 'FREER' : 'FREE',
                        isDifference: false, useWeight: false, calcStructFact: true
                    })
            }).then(_ => {
                return newDiffMap.loadToCootFromMtzURL(`${props.urlPrefix}/baby-gru/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`, `moorhen-tutorial-${tutorialNumber}`,
                    { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false })
            }).then(_ => {
                props.changeMaps({ action: 'AddList', items: [newMap, newDiffMap] })
                props.setActiveMap(newMap)
            })
        props.setPopoverIsShown(false)
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
        props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'get_monomer_and_position_at',
            commandArgs: [tlcRef.current.value,
            parseInt(selectRef.current.value),
            ...props.glRef.current.origin.map(coord => -coord)
            ]

        }, true)
            .then(result => {
                if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
                    const newMolecule = new MoorhenMolecule(props.commandCentre, props.urlPrefix)
                    newMolecule.molNo = result.data.result.result
                    newMolecule.name = tlcRef.current.value
                    newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
                    return newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef).then(_ => {
                        props.changeMolecules({ action: "Add", item: newMolecule })
                        props.setPopoverIsShown(false)
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
                //console.log('result is', result)
                if (result.data.result.status === "Completed") {
                    result.data.result.result.forEach(iMol => {
                        const newMolecule = new MoorhenMolecule(props.commandCentre, props.urlPrefix)
                        newMolecule.molNo = iMol
                        newMolecule.name = `lig_${iMol}`
                        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
                        return newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef).then(_ => {
                            props.changeMolecules({ action: "Add", item: newMolecule })
                        })
                    })
                }
                props.setPopoverIsShown(false)
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

export const MoorhenScoresToastPreferencesMenuItem = (props) => {
   
    const panelContent =
        <>
            <InputGroup style={{ padding:'0rem', width: '15rem'}}>
                <Form.Check 
                        type="switch"
                        checked={props.showScoresToast}
                        onChange={() => { props.setShowScoresToast(!props.showScoresToast) }}
                        label="Show scores window"/>
            </InputGroup>
            <InputGroup style={{ padding:'0rem', width: '15rem'}}>
                <Form.Check 
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Rfactor')}
                    onChange={() => { props.setDefaultUpdatingScores({
                        action: props.defaultUpdatingScores.includes('Rfactor') ? 'Remove' : 'Add',
                        item: 'Rfactor'
                    }) }}
                    label="Show Rfactor"/>
            </InputGroup>
            <InputGroup style={{ padding:'0rem', width: '15rem'}}>
                <Form.Check 
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Rfree')}
                    onChange={() => { props.setDefaultUpdatingScores({
                        action: props.defaultUpdatingScores.includes('Rfree') ? 'Remove' : 'Add',
                        item: 'Rfree'
                    }) }}
                    label="Show Rfree"/>
            </InputGroup>
            <InputGroup style={{ padding:'0rem', width: '15rem'}}>
                <Form.Check 
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Moorhen Points')}
                    onChange={() => { props.setDefaultUpdatingScores({
                        action: props.defaultUpdatingScores.includes('Moorhen Points') ? 'Remove' : 'Add',
                        item: 'Moorhen Points'
                    }) }}
                    label="Show Moorhen points"/>
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
    const mapSolid = props.mapSolid
    const panelContent =
        <>
            <MenuItem key='solid-or-chickenwire' variant="success" onClick={() => {props.setMapSolid(!mapSolid) }}>Draw as {mapSolid ? "Chickenwire" : "Solid"}</MenuItem>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenMapOpacitySlider">
                <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Opacity" intialValue={props.mapOpacity} externalValue={props.mapOpacity} setExternalValue={props.setMapOpacity} />
            </Form.Group>
        </>
    return <MoorhenMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Draw settings"}
        setPopoverIsShown={props.setPopoverIsShown}
    />
 
}

export const MoorhenMoleculeBondSettingsMenuItem = (props) => {
    const smoothnesSelectRef = useRef(null)

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenBondWidthSlider">
                <MoorhenSlider minVal={0.05} maxVal={0.5} logScale={false} sliderTitle="Bond width" intialValue={0.1} externalValue={props.bondWidth} setExternalValue={props.setBondWidth} />
            </Form.Group>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenRadiusBondRatioSlider">
                <MoorhenSlider minVal={1.0} maxVal={3.5} logScale={false} sliderTitle="Radius-Bond ratio" intialValue={1.5} externalValue={props.atomRadiusBondRatio} setExternalValue={props.setAtomRadiusBondRatio} />
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
        props.setPopoverIsShown(false)
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
    const onCompleted = () => { props.setPopoverIsShown(false) }

    const panelContent = <>
        <SketchPicker color={backgroundColor} onChange={handleColorChange} />
    </>

    return <MoorhenMenuItem
        id="change-background-colour-menu-item"
        popoverContent={panelContent}
        menuItemText={<Form.Group style={{ minWidth: "20rem" }}>
            <Form.Label>Background Color</Form.Label>
            <InputGroup>
                <Form.Control style={{
                    backgroundColor: `rgba(  ${backgroundColor.r}, ${backgroundColor.g},  ${backgroundColor.b},  ${backgroundColor.a})`
                }} type="text" />
                <Button variant="light">Change</Button>
            </InputGroup>
        </Form.Group>}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown} />
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

    const handleFileContent = async (fileContent) => {
        let newMolecule = null
        const selectedMoleculeIndex = parseInt(moleculeSelectRef.current.value)
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
                //console.log({ createInstance })
                if (createRef.current) {
                    const instanceName = tlcValueRef.current
                    console.log({ instanceName })
                    return props.commandCentre.current.cootCommand({
                        returnType: 'status',
                        command: 'get_monomer_and_position_at',
                        commandArgs: [instanceName,
                            selectedMoleculeIndex,
                            ...props.glRef.current.origin.map(coord => -coord)]
                    }, true)
                        .then(result => {
                            if (result.data.result.status === "Completed") {
                                newMolecule = new MoorhenMolecule(props.commandCentre, props.urlPrefix)
                                newMolecule.molNo = result.data.result.result
                                newMolecule.name = instanceName
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
                                    return toMolecule.redraw(props.glRef)
                                })
                        } else {
                            newMolecule.redraw(props.glRef)
                        }
                    }
                    props.setPopoverIsShown(false)
                }
                console.log('After create instance', { result })
            })
    }//, [moleculeSelectRef.current, props.molecules, tlcRef, tlc, addToRef, createInstance])

    const readMmcifFile = async (file) => {
        return readTextFile(file)
            .then(fileContent => {
                return handleFileContent(fileContent)
            })
    }

    const readMonomerFile = async (newTlc) => {
        console.log({ newTlc })
        return fetch(`${props.urlPrefix}/baby-gru/monomers/${newTlc.toLowerCase()[0]}/${newTlc.toUpperCase()}.cif`)
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
        console.log({ fileOrLibrary, ref: fileOrLibraryRef.current })
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

    }, [fileOrLibrary.current, moleculeSelectRef.current, moleculeSelectRef.current, props.molecules, tlcRef.current, tlc, addToRef.current, createInstance])

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
        props.setPopoverIsShown(false)
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
                    <Form.Check ref={calcStructFactRef} label={'assing labels for structure factor calculation?'} name={`calcStructFactors`} type="checkbox" variant="outline"
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

export const MoorhenImportFSigFMenuItem = (props) => {
    const mapSelectRef = useRef(null)
    const twoFoFcSelectRef = useRef(null)
    const foFcSelectRef = useRef(null)
    const moleculeSelectRef = useRef(null)

    const connectMap = async () => {
        const connectMapsArgs = [
            parseInt(moleculeSelectRef.current.value),
            parseInt(mapSelectRef.current.value),
            parseInt(twoFoFcSelectRef.current.value),
            parseInt(foFcSelectRef.current.value),
        ]
        const sFcalcArgs = [
            parseInt(moleculeSelectRef.current.value),
            parseInt(twoFoFcSelectRef.current.value),
            parseInt(foFcSelectRef.current.value),
            parseInt(mapSelectRef.current.value)
        ]
        
        if (connectMapsArgs.every(arg => !isNaN(arg))) {
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
            
            const connectedMapsEvent = new CustomEvent("connectedMaps")
            document.dispatchEvent(connectedMapsEvent)    
        }
    }

    const onCompleted = async () => {
        props.setPopoverIsShown(false)
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
            <Col key="Col3">
                <MoorhenMoleculeSelect {...props} ref={moleculeSelectRef} label="Molecule" allowAny={false} width='100%' />
            </Col>
        </Row>
    </>

    return <MoorhenMenuItem
        popoverContent={panelContent}
        menuItemText="Connect map and molecule for updating..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

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
        console.log('file is', file, isDiffRef.current.checked)
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

export const MoorhenAboutMenuItem = (props) => {
    const onCompleted = () => { props.setPopoverIsShown(false) }

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
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenClipFogMenuItem = (props) => {

    const [zclipFront, setZclipFront] = useState(5)
    const [zclipBack, setZclipBack] = useState(5)
    const [zfogFront, setZfogFront] = useState(5)
    const [zfogBack, setZfogBack] = useState(5)

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0) {
            setZclipFront(500 + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - 500)
            setZfogFront(500 - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - 500)
        }
    })

    const fractionalLog = (minVal, maxVal, val) => {
        if (minVal < 0.00001) minVal = 0.0001
        if (maxVal < 0.0001) maxVal = 0.0001
        if (val < 0.0001) val = 0.0001
        return 1 + 99 * ((Math.log10(val) - Math.log10(minVal)) / (Math.log10(maxVal) - Math.log10(minVal)))
    }

    const initialClipFront = fractionalLog(0.1, 1000, 500 + props.glRef.current.gl_clipPlane0[3])
    const initialClipBack = fractionalLog(0.1, 1000, props.glRef.current.gl_clipPlane1[3])
    const initialFogFront = fractionalLog(0.1, 1000, 500 - props.glRef.current.gl_fog_end)
    const initialFogBack = fractionalLog(0.1, 1000, props.glRef.current.gl_fog_end - 500)

    const panelContent = <div style={{ minWidth: "20rem" }}>
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front clip"
            initialValue={initialClipFront}
            externalValue={zclipFront}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_clipPlane0[3] = newValue - 500
                props.glRef.current.drawScene()
                setZclipFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back clip"
            initialValue={initialClipBack}
            externalValue={zclipBack}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_clipPlane1[3] = 500 + newValue
                props.glRef.current.drawScene()
                setZclipBack(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front zFog"
            initialValue={initialFogFront}
            externalValue={zfogFront}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_fog_start = 500 - newValue
                props.glRef.current.drawScene()
                setZfogFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back zFog"
            externalValue={zfogBack}
            initialValue={initialFogBack}
            setExternalValue={(newValue) => {
                props.glRef.current.gl_fog_end = newValue + 500
                props.glRef.current.drawScene()
                setZfogBack(newValue)
            }} />
    </div>

    const onCompleted = () => { props.setPopoverIsShown(false) }

    return <MoorhenMenuItem
        id='clipping-fogging-menu-item'
        popoverContent={panelContent}
        menuItemText="Clipping and fogging..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

export const MoorhenMergeMoleculesMenuItem = (props) => {
    const toRef = useRef(null)
    const fromRef = useRef(null)
    const [selectedMolecules, setSelectedMolecules] = useState([])

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
        console.log({ toMolecule, otherMolecules })
        let banan = await toMolecule.mergeMolecules(otherMolecules, props.glRef, true)
        console.log({ banan })
        props.setPopoverIsShown(false)
    }, [toRef.current, fromRef.current, props.molecules])

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
            <Form.Label>Residue cid...</Form.Label>
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
            const newMolecule = new MoorhenMolecule(props.commandCentre, props.urlPrefix)
            newMolecule.name = `${fromMolecules[0].name} fragment`
            newMolecule.molNo = response.data.result.result
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
        async function updateMoleculeAtoms(molecule) {
            await molecule.updateAtoms()
        }

        const newTreeData = []
        props.molecules.forEach(molecule => {

            if (molecule.gemmiStructure === null || molecule.atomsDirty) {
                updateMoleculeAtoms(molecule)
            }
            if (molecule.gemmiStructure === null) {
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
        })
        setMolTreeData(newTreeData)
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
                            console.log({ reducedValue })
                            if (reducedValue.count > 0) {
                                props.glRef.current.setOrigin(
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
