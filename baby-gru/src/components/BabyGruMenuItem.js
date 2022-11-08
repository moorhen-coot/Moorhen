import { MenuItem } from "@mui/material";
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Form, InputGroup, Button } from "react-bootstrap";

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
        props.commandCentre.cootCommand('get_monomer', [tlcRef.current.value], true)
    }

    return <BabyGruMenuItem
        popoverContent={panelContent}
        menuItemText="Get monomer"
        onCompleted={onCompleted}
    />
}