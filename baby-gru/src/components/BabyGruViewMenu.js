import { NavDropdown, Form, Overlay, InputGroup, Button } from "react-bootstrap";
import { createRef, useEffect, useRef, useState } from "react";
import { SketchPicker } from 'react-color'


export const BabyGruViewMenu = (props) => {
    const [backgroundColorPickerVisible, setBackgroundColorPickerVisible] = useState(false)
    const target = useRef(null);
    const [backgroundColor, setBackgroundColor] = useState({ r: 255, g: 255, b: 255, a: 1 })

    useEffect(() => {
        setBackgroundColor({
            r: 255 * props.backgroundColor[0],
            g: 255 * props.backgroundColor[1],
            b: 255 * props.backgroundColor[2],
            a: props.backgroundColor[3]
        })
    }, [props.backgroundColor, props.setBackgroundColor])

    const handleColorChange = (color) => {
        try {
            setBackgroundColorPickerVisible(false)
            props.setBackgroundColor([color.rgb.r / 255., color.rgb.g / 255., color.rgb.b / 255., color.rgb.a])
            setBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    return <>
        <NavDropdown title="View" id="basic-nav-dropdown">
            <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="setBackground" className="mb-3">
                <Form.Label>Set background color</Form.Label>
                <InputGroup>
                    <Form.Control
                        style={{
                            backgroundColor: `rgba(
                                ${backgroundColor.r},
                                ${backgroundColor.g},
                                ${backgroundColor.b},
                                ${backgroundColor.a})`
                        }}
                        type="text" ref={target} onKeyDown={(e) => {
                        }} />
                    <Button variant="outline-secondary" onClick={(e) => {
                        setBackgroundColorPickerVisible(true)
                    }}>
                        Change
                    </Button>
                </InputGroup>
            </Form.Group>
        </NavDropdown>
        <Overlay
            target={target.current}
            show={backgroundColorPickerVisible}
            placement={"right"}
        >
            {({ placement, arrowProps, show: _show, popper, ...props }) => (
                <div
                    {...props}
                    style={{
                        position: 'absolute',
                        marginBottom: '0.5rem',
                        marginLeft: '1rem',
                        backgroundColor: 'rgba(200, 200, 200, 0.65)',
                        color: 'black',
                        borderRadius: 3,
                        ...props.style,
                    }}
                >
                    <SketchPicker
                        color={backgroundColor}
                        onChange={handleColorChange}
                    />

                </div>
            )}
        </Overlay>
    </>
}

