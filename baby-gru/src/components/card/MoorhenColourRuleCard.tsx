import { useRef, useState } from "react";
import { Row, Button, Card, Col, OverlayTrigger, Tooltip } from "react-bootstrap";
import { ArrowUpwardOutlined, ArrowDownwardOutlined, DeleteOutlined, GrainOutlined } from '@mui/icons-material';
import { RgbColorPicker } from "react-colorful";
import { rgbToHex } from "../../utils/MoorhenUtils";
import { moorhen } from "../../types/moorhen";
import { Popover, hexToRgb } from "@mui/material";
import { useSelector } from "react-redux";

export const MoorhenColourRuleCard = (props: {
    molecule: moorhen.Molecule;
    index: number;
    rule: moorhen.ColourRule;
    urlPrefix: string;
    setRuleList: any;
}) => {
    
    const colourSwatchRef = useRef<null | HTMLDivElement>(null)
    const busyRedrawing = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)

    const [showColourPicker, setShowColourPicker] = useState<boolean>(false)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const { index, molecule, rule, urlPrefix, setRuleList } = props
    
    let [r, g, b]: number[] = []
    if (!rule.isMultiColourRule) {
        [r, g, b] = hexToRgb(rule.color).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
    }
    
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

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            rule.color = rgbToHex(color.r, color.g, color.b)
            if (!rule.isMultiColourRule) rule.args[1] = rule.color 
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawIfDirty()
            }
        }
        catch (err) {
            console.log('err', err)
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
                <>
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
                        <RgbColorPicker color={{r, g, b}} onChange={handleColorChange} />
                    </Popover>
                </>
                : rule.ruleType === "secondary-structure" ?
                    <img className='colour-rule-icon' src={`${urlPrefix}/baby-gru/pixmaps/secondary-structure-grey.svg`} alt='ss2' style={{height:'28px', width:'`12px', margin: '0.1rem'}}/>
                : rule.ruleType === "jones-rainbow" ?
                <>
                    <div style={{borderColor: 'rgb(255, 0, 0)', borderWidth:'5px', backgroundColor:  'rgb(255, 0, 0)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(255, 255, 0)', borderWidth:'5px', backgroundColor: 'rgb(255, 255, 0)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(0, 255, 0)', borderWidth:'5px', backgroundColor: 'rgb(0, 255, 0)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                    <div style={{borderColor: 'rgb(0, 0, 255)', borderWidth:'5px', backgroundColor: 'rgb(0, 0, 255)', height:'20px', width:'5px', margin: '0rem', padding: '0rem'}}/>
                </>
                : rule.ruleType === "mol-symm" ?
                    <GrainOutlined style={{height:'23px', width:'23px', marginLeft: '0.5rem', marginRight: '0.5rem', borderStyle: 'solid', borderColor: '#ced4da', borderWidth: '3px', borderRadius: '8px'}}/>            
                : (rule.ruleType === "b-factor" || rule.ruleType === "b-factor-norm") ?
                    <img className="colour-rule-icon" src={`${urlPrefix}/baby-gru/pixmaps/temperature.svg`} alt='b-factor' style={{height:'28px', width:'`12px', margin: '0.1rem'}}/>
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