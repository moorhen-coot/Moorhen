import { MenuItem } from "@mui/material";
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button, FormSelect, Row, Col } from "react-bootstrap";
import { SketchPicker } from "react-color";
import { BabyGruMtzWrapper, readTextFile } from "../BabyGruUtils";
import { BabyGruMap } from "./BabyGruMap";
import { BabyGruMolecule } from "./BabyGruMolecule";
import { BabyGruMoleculeSelect } from "./BabyGruMoleculeSelect";

export const BabyGruMenuItem = (props) => {

    const resolveOrRejectRef = useRef({
        resolve: () => { },
        reject: () => { }
    })
    const popoverRef = createRef()

    return <>
        {props.popoverContent ? <OverlayTrigger rootClose onEnter={() => {
            new Promise((resolve, reject) => {
                resolveOrRejectRef.current = { resolve, reject }
            }).then(result => {
                props.onCompleted("Resolve")
                document.body.click()
            })
        }}
            placement="right"
            delay={{ show: 250, hide: 400 }}
            overlay={
                <Popover style={{ maxWidth: "40rem" }} ref={popoverRef}>
                    <PopoverHeader as="h3">{props.menuItemTitle}</PopoverHeader>
                    <PopoverBody>
                        {props.popoverContent}
                        <Button variant={props.buttonVariant} onClick={() => { resolveOrRejectRef.current.resolve() }}>{props.buttonText}</Button>
                    </PopoverBody>
                </Popover>}
            trigger="click"
        >
            <MenuItem className={props.textClassName}  variant="success">{props.menuItemText}</MenuItem>
        </OverlayTrigger> :
            <MenuItem variant="success">{props.menuItemText}</MenuItem>
        }
    </>
}

BabyGruMenuItem.defaultProps = {
    buttonText: "OK",
    buttonVariant: "primary",
    textClassName: ""
}

export const BabyGruGetMonomerMenuItem = (props) => {
    const tlcRef = useRef()
    const selectRef = useRef(null)

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="BabyGruGetMonomerMenuItem" className="mb-3">
            <Form.Label>Monomer identifier</Form.Label>
            <Form.Control ref={tlcRef} type="text" />
        </Form.Group>
        <BabyGruMoleculeSelect {...props} allowAny={true} ref={selectRef} />
    </>


    const onCompleted = () => {
        props.commandCentre.current.cootCommand({
            returnType: 'status',
            command: 'get_monomer_and_position_at',
            commandArgs: [tlcRef.current.value, selectRef.current.value, ...props.glRef.current.origin.map(coord => -coord)]

        }, true)
            .then(result => {
                if (result.data.result.status === "Completed") {
                    const newMolecule = new BabyGruMolecule(props.commandCentre)
                    newMolecule.coordMolNo = result.data.result.result
                    newMolecule.name = tlcRef.current.value
                    newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef).then(_ => {
                        props.setMolecules([...props.molecules, newMolecule])
                    })
                }
            })
    }

    return <BabyGruMenuItem
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={onCompleted}
    />
}

export const BabyGruDeleteEverythingMenuItem = (props) => {

    const panelContent = <>
        <Form.Group style={{ width: '18rem', margin: '0.5rem' }} controlId="BabyGruGetDeleteEverythingMenuItem" className="mb-3">
            <span style={{fontWeight:'bold'}}>Warning: this action cannot be reversed.</span>
        </Form.Group>
    </>


    const onCompleted = () => {
        props.maps.forEach(map => {
            map.delete(props.glRef)
        })
        props.molecules.forEach(molecule => {
            molecule.delete(props.glRef)
        })
        props.setMaps([])
        props.setMolecules([])

    }

    return <BabyGruMenuItem
        textClassName="text-danger"
        buttonVariant="danger"
        buttonText="I understand, delete"
        popoverContent={panelContent}
        menuItemText="Delete everything"
        onCompleted={onCompleted}
    />
}


export const BabyGruBackgroundColorMenuItem = (props) => {
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
    const onCompleted = () => { }

    const panelContent = <>
        <SketchPicker color={backgroundColor} onChange={handleColorChange} />
    </>

    return <BabyGruMenuItem
        popoverContent={panelContent}
        menuItemText={<Form.Group style={{ minWidth: "20rem" }}>
            <Form.Label>BackgroundColor</Form.Label>
            <InputGroup>
                <Form.Control style={{
                    backgroundColor: `rgba(  ${backgroundColor.r}, ${backgroundColor.g},  ${backgroundColor.b},  ${backgroundColor.a})`
                }} type="text" />
                <Button variant="light">Change</Button>
            </InputGroup >
        </Form.Group>}
        onCompleted={onCompleted} />
}

export const BabyGruImportDictionaryMenuItem = (props) => {
    const filesRef = useRef(null)
    const moleculeSelectRef = useRef(null)
    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="uploadDicts" className="mb-3">
            <Form.Label>Dictionaries</Form.Label>
            <Form.Control ref={filesRef} type="file" multiple={true} accept={[".cif", ".dict", ".mmcif"]} multiple={false} />
        </Form.Group>
        <BabyGruMoleculeSelect {...props} allowAny={true} ref={moleculeSelectRef} />
    </>

    const readMmcifFile = async (file) => {
        return readTextFile(file)
            .then(fileContent => {
                return props.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'shim_read_dictionary',
                    commandArgs: [fileContent, moleculeSelectRef.current.value]
                }, true)
            }).then(result => {
                props.molecules
                    .filter(molecule => molecule.coordMolNo === parseInt(moleculeSelectRef.current.value))
                    .forEach(molecule => {
                        molecule.redraw(props.glRef)
                    })
                return Promise.resolve()
            })
    }

    const onCompleted = async () => {
        let readPromises = []
        for (const file of filesRef.current.files) {
            readPromises.push(readMmcifFile(file))
        }
        let mmcifReads = await Promise.all(readPromises)
    }

    return <BabyGruMenuItem
        popoverContent={panelContent}
        menuItemText="Import dictionary..."
        onCompleted={onCompleted}
    />
}

export const BabyGruImportMapCoefficientsMenuItem = (props) => {
    const filesRef = useRef(null)
    const fSelectRef = useRef()
    const phiSelectRef = useRef()
    const wSelectRef = useRef()
    const isDiffRef = useRef()
    const useWeightRef = useRef()
    const [columns, setColumns] = useState({})

    const handleFileRead = async (e) => {
        const newMap = new BabyGruMap(props.commandCentre)
        const babyGruMtzWrapper = new BabyGruMtzWrapper()
        const newColumns = await babyGruMtzWrapper.loadHeaderFromFile(e.target.files[0])
        const fColumns = Object.keys(newColumns)
            .filter(key => newColumns[key] === 'F')
        const pColumns = Object.keys(newColumns)
            .filter(key => newColumns[key] === 'P')
        const wColumns = Object.keys(newColumns)
            .filter(key => newColumns[key] === 'W')
        if (fColumns.length === 1 && fColumns.includes('FWT') &&
            pColumns.length === 1 && pColumns.includes('PHWT')) {
            let selectedColumns = { F: 'FWT', PHI: 'PHWT', W: '', isDifference: false, useWeight: false }
            await handleFile(e.target.files[0], selectedColumns)
        }
        else {
            setColumns(newColumns)
        }
    }

    const handleFile = async (file, selectedColumns) => {
        const newMap = new BabyGruMap(props.commandCentre)
        await newMap.loadToCootFromFile(file, selectedColumns)
        props.setMaps([...props.maps, newMap])
    }

    const onCompleted = async () => {
        let selectedColumns = {
            F: fSelectRef.current.value, PHI: phiSelectRef.current.value, W: wSelectRef.current.value,
            isDifference: isDiffRef.current.checked, useWeight: useWeightRef.current.checked
        }
        return await handleFile(filesRef.current.files[0], selectedColumns)
    }

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '30rem', margin: '0.5rem' }} controlId="uploadDicts" className="mb-3">
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
        </Row>
    </>

    return <BabyGruMenuItem
        popoverContent={panelContent}
        menuItemText="Map coefficients..."
        onCompleted={onCompleted}
    />
}

const BabyGruImportCoordinatesFromEBI = (props) => {
    const panelContent = {

    }
    const onCompleted = () => { }
    return <BabyGruMenuItem
        popoverContent={panelContent}
        menuItemText="Map coefficients..."
        onCompleted={onCompleted}
    />
}