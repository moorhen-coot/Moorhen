import { useRef, useState } from "react";
import { Row, Button, Card, Col, OverlayTrigger, Tooltip, Form, FormSelect } from "react-bootstrap";
import { ArrowUpwardOutlined, ArrowDownwardOutlined, DeleteOutlined, GrainOutlined } from '@mui/icons-material';
import { HexAlphaColorPicker, HexColorInput, RgbColorPicker } from "react-colorful";
import { Popover } from "@mui/material";
import { useSelector } from "react-redux";
import { rgbToHex } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { MoorhenColourRule } from "../../utils/MoorhenColourRule";

const ColourSwatch = (props: {
    rule: moorhen.ColourRule;
    applyColourChange: () => void;
}) => {

    const colourSwatchRef = useRef<null | HTMLDivElement>(null)
    const newHexValueRef = useRef<string>('')

    const { rule, applyColourChange } = props
    
    const [hex, setHex] = useState<string>(rule.color)
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)

    const handleClick = () => {
        try {
            rule.color = newHexValueRef.current
            if (!rule.isMultiColourRule) rule.args[1] = rule.color 
            applyColourChange()
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: string) => {
        try {
            newHexValueRef.current = color
            setHex(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    return  <>
        <div ref={colourSwatchRef} onClick={() => setShowColourPicker(true)}
            style={{
                marginLeft: '0.5rem',
                marginRight: '0.5rem',
                width: '23px',
                height: '23px',
                borderRadius: '8px',
                border: '3px solid #fff',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                backgroundColor: `${rule.color}` 
        }}/>
        <Popover 
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            open={showColourPicker}
            onClose={() => setShowColourPicker(false)}
            anchorEl={colourSwatchRef.current}
            sx={{
                '& .MuiPaper-root': {
                    overflowY: 'hidden', borderRadius: '8px'
                }
            }}
        >
        <div style={{ padding: '0.5rem', width: '100%', margin: 0, justifyContent: 'center', display: 'flex', flexDirection: 'column'}}>
            <HexAlphaColorPicker color={hex} onChange={handleColorChange}/>
            <div style={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                <div className="moorhen-hex-input-decorator">#</div>
                <HexColorInput className="moorhen-hex-input" color={hex} onChange={handleColorChange}/>
            </div>
            <Button style={{marginTop: '0.2rem'}} onClick={handleClick}>
                Apply
            </Button>
        </div>
        </Popover>
    </>
}

export const NcsColourSwatch = (props: {
    rule: moorhen.ColourRule;
    applyColourChange: () => void;
    style?: {[key: string]: string}
}) => {

    const ncsSwatchRef = useRef(null)
    const newNcsHexValueRef = useRef<string>('')
    const ncsCopySelectRef = useRef<null | HTMLSelectElement>(null)

    const [hex, setHex] = useState<string>("#ffffff")
    const [ncsCopyValue, setNcsCopyValue] = useState<string>('')
    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)

    const { rule, applyColourChange } = props

    const applyNcsColourChange = () => {
        const chainNames: string[] = JSON.parse(ncsCopySelectRef.current.value)
        const newRules = (rule.args[0] as string).split('|').map(item => {
            const [chainName, hex] = item.split('^')
            if (chainNames.includes(chainName)) {
                return `${chainName}^${newNcsHexValueRef.current}`
            } 
            return item
        }).join('|')
        rule.args[0] = newRules
        applyColourChange()
    }

    return  <>
        <GrainOutlined ref={ncsSwatchRef} onClick={() => {
            setShowColourPicker(true)
            const hex = (rule.args[0] as string).split('|')[0].split('^')[1]
            setHex(hex)
        }} style={props.style ? props.style : { cursor: 'pointer', height:'23px', width:'23px', marginLeft: '0.5rem', marginRight: '0.5rem', borderStyle: 'solid', borderColor: '#ced4da', borderWidth: '3px', borderRadius: '8px' }}/>
        <Popover 
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            open={showColourPicker}
            onClose={() => setShowColourPicker(false)}
            anchorEl={ncsSwatchRef.current}
            sx={{
                '& .MuiPaper-root': {
                    overflowY: 'hidden', borderRadius: '8px'
                }
            }}>
        <div style={{ padding: '0.5rem', width: '100%', margin: 0, justifyContent: 'center', display: 'flex', flexDirection: 'column'}}>
            <Form.Group >
                <Form.Label style={{ justifyContent: 'center', display: 'flex'}}>NCS colours</Form.Label>
                <FormSelect ref={ncsCopySelectRef} size="sm" style={{marginBottom: '0.2rem'}} value={ncsCopyValue} onChange={(evt) => {
                    setNcsCopyValue(evt.target.value)
                    const chainNames = JSON.parse(evt.target.value)
                    const hex = (rule.args[0] as string).split('|').find(item => item.includes(chainNames[0]))?.split('^')[1]
                    setHex(hex)
                }}>
                    {[...new Set((rule.args[0] as string).split('|').map(item => item.split('^')[1]))].map((hex, index) => {
                        const chainNames = JSON.stringify((rule.args[0] as string).split('|').filter(item => item.includes(hex)).map(item => item.split('^')[0]))
                        return <option key={chainNames} value={chainNames}>{`Copy no. ${index+1}`}</option>
                    })}
                </FormSelect>
            </Form.Group>
            <HexAlphaColorPicker color={hex} onChange={(color: string) => {
                newNcsHexValueRef.current = color
                setHex(color)
            }}/>
            <div style={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                <div className="moorhen-hex-input-decorator">#</div>
                <HexColorInput className="moorhen-hex-input" color={hex} onChange={(hex) => {
                    newNcsHexValueRef.current = hex
                    setHex(hex)
                }}/>
            </div>
            <Button style={{marginTop: '0.2rem'}} onClick={applyNcsColourChange}>
                Apply
            </Button>
        </div>
        </Popover>
    </>
}

export const MoorhenColourRuleCard = (props: {
    molecule: moorhen.Molecule;
    index: number;
    rule: moorhen.ColourRule;
    urlPrefix: string;
    setRuleList: any;
}) => {
    
    const busyRedrawing = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const { index, molecule, rule, urlPrefix, setRuleList } = props
    
    const redrawIfDirty = () => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            molecule.redraw().then(() => {
                busyRedrawing.current = false
                redrawIfDirty()
            })
        }
    }

    return <Card className='hide-scrolling' style={{margin: '0.1rem', maxWidth: '100%', overflowX:'scroll'}}>
    <Card.Body>
        <Row className='align-items-center'>
            <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: isDark ? 'white' : 'black' }}>
                <b>
                {`#${index+1}. `}
                </b>
                <span>
                    {`. ${rule.label}`}
                </span>
            </Col>
            <Col style={{ display: 'flex', justifyContent: 'right', alignItems:'center' }}>
                {!rule.isMultiColourRule ?
                    <ColourSwatch rule={rule} applyColourChange={() => {
                        isDirty.current = true
                        if (!busyRedrawing.current) {
                            redrawIfDirty()
                        }
                    }}/>
                : rule.ruleType === "secondary-structure" ?
                    <img className='colour-rule-icon' src={`${urlPrefix}/pixmaps/secondary-structure-grey.svg`} alt='ss2' style={{height:'28px', width:'`12px', margin: '0.1rem'}}/>
                : rule.ruleType === "jones-rainbow" ?
                <>
                    <div style={{borderColor: 'rgb(255, 0, 0)', borderWidth:'5px', backgroundColor:  'rgb(255, 0, 0)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(255, 255, 0)', borderWidth:'5px', backgroundColor: 'rgb(255, 255, 0)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(0, 255, 0)', borderWidth:'5px', backgroundColor: 'rgb(0, 255, 0)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(0, 0, 255)', borderWidth:'5px', backgroundColor: 'rgb(0, 0, 255)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                </>
                : rule.ruleType === "mol-symm" ?
                    <NcsColourSwatch rule={rule} applyColourChange={() => {
                        isDirty.current = true
                        if (!busyRedrawing.current) {
                            redrawIfDirty()
                        }
                    }}/>
                : (rule.ruleType === "b-factor" || rule.ruleType === "b-factor-norm") ?
                    <img className="colour-rule-icon" src={`${urlPrefix}/pixmaps/temperature.svg`} alt='b-factor' style={{height:'28px', width:'`12px', margin: '0.1rem'}}/>
                :
                <>
                    <div style={{borderColor: 'rgb(255, 125, 69)', borderWidth:'5px', backgroundColor:  'rgb(255, 125, 69)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(255, 219, 19)', borderWidth:'5px', backgroundColor: 'rgb(255, 219, 19)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(101, 203, 243)', borderWidth:'5px', backgroundColor: 'rgb(101, 203, 243)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(0, 83, 214)', borderWidth:'5px', backgroundColor: 'rgb(0, 83, 214)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                </>
                }
                <OverlayTrigger
                    placement="top"
                    delay={{ show: 400, hide: 400 }}
                    overlay={
                        <Tooltip id="button-tooltip">
                            Move up
                        </Tooltip>
                    }>
                    <Button size='sm' style={{margin: '0.1rem'}} variant={isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveUp', item:rule})}}>
                        <ArrowUpwardOutlined/>
                    </Button>
                </OverlayTrigger>
                <OverlayTrigger
                    placement="top"
                    delay={{ show: 400, hide: 400 }}
                    overlay={
                        <Tooltip id="button-tooltip">
                            Move down
                        </Tooltip>
                    }>
                    <Button size='sm' style={{margin: '0.1rem'}} variant={isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'MoveDown', item:rule})}}>
                        <ArrowDownwardOutlined/>
                    </Button>
                </OverlayTrigger>
                <OverlayTrigger
                    placement="top"
                    delay={{ show: 400, hide: 400 }}
                    overlay={
                        <Tooltip id="button-tooltip">
                            Delete
                        </Tooltip>
                    }>
                    <Button size='sm' style={{margin: '0.1rem'}} variant={isDark ? "dark" : "light"} onClick={() => {setRuleList({action:'Remove', item:rule})}}>
                        <DeleteOutlined/>
                    </Button>
                </OverlayTrigger>
            </Col>
        </Row>
    </Card.Body>
</Card>
}