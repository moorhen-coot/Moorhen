import { MenuItem } from "@mui/material";
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button } from "react-bootstrap";
import { SketchPicker } from "react-color";
import { BabyGruMolecule } from "./BabyGruMolecule";

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
                        <Button onClick={() => { resolveOrRejectRef.current.resolve() }}>OK</Button>
                    </PopoverBody>
                </Popover>}
            trigger="click"
        >
            <MenuItem variant="success">{props.menuItemText}</MenuItem>
        </OverlayTrigger> :
            <MenuItem variant="success">{props.menuItemText}</MenuItem>
        }
    </>
}

export const BabyGruGetMonomerMenuItem = (props) => {
    const tlcRef = useRef()

    const panelContent =
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="BabyGruGetMonomerMenuItem" className="mb-3">
            <Form.Label>Monomer identifier</Form.Label>
            <Form.Control ref={tlcRef} type="text" />
        </Form.Group>

    const onCompleted = () => {
        props.commandCentre.current.cootCommand({
            returnType: 'status',

            command: 'get_monomer',
            commandArgs: [tlcRef.current.value]
            /*
                        command: 'get_monomer_and_position_at',
                        commandArgs: [tlcRef.current.value, ...props.glRef.current.origin.map(coord => -coord)]
                        */
        }, true)
            .then(result => {
                console.log(result)
                if (result.data.result.status === "Completed") {
                    const newMolecule = new BabyGruMolecule(props.commandCentre)
                    newMolecule.coordMolNo = result.data.result.result
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
                <Button variant="outline-secondary">Change</Button>
            </InputGroup >
        </Form.Group>}
        onCompleted={onCompleted} />
}