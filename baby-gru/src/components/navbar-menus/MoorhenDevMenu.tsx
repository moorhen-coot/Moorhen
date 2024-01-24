import { Form, InputGroup } from "react-bootstrap";
import { useRef, useState } from "react";
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider } from "../misc/MoorhenSlider"
import { useSelector, useDispatch } from "react-redux";
import { setDoOutline, setDoSSAO, setDoShadow, setDoSpinTest, setSsaoBias, setSsaoRadius } from "../../store/sceneSettingsSlice";
import { doDownload } from "../../utils/MoorhenUtils";

export const MoorhenDevMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const customCid = useRef<string>('')
    const dispatch = useDispatch()
    const doShadow = useSelector((state: moorhen.State) => state.sceneSettings.doShadow)
    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)
    const doSpinTest = useSelector((state: moorhen.State) => state.sceneSettings.doSpinTest)
    const doSSAO = useSelector((state: moorhen.State) => state.sceneSettings.doSSAO)
    const ssaoBias = useSelector((state: moorhen.State) => state.sceneSettings.ssaoBias)
    const ssaoRadius = useSelector((state: moorhen.State) => state.sceneSettings.ssaoRadius)

    const menuItemProps = {setPopoverIsShown, customCid, ...props}

    const doTest = async () => {
        props.moleculesRef.current[0].representations.forEach(async (representation) => {
            const result = await props.moleculesRef.current[0].exportAsGltf(representation.uniqueId)
            doDownload([result], `${props.moleculesRef.current[0].name}.glb`)    
        })
    }
       
    return <>
                    <MenuItem onClick={() => doTest()}>
                        Do a test...
                    </MenuItem>
                    <hr></hr>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doShadow}
                            onChange={() => {dispatch( setDoShadow(!doShadow) )}}
                            label="Shadows"/>
                    </InputGroup>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doSSAO}
                            onChange={() => {dispatch( setDoSSAO(!doSSAO) )}}
                            label="Occlusion"/>
                    </InputGroup>
                    <MoorhenSlider minVal={0.0} maxVal={2.0} logScale={false}
                        sliderTitle="Occlusion radius"
                        initialValue={ssaoRadius}
                        externalValue={ssaoRadius}
                        setExternalValue={(val: number) => dispatch(setSsaoRadius(val))} />
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doOutline}
                            onChange={() => {dispatch( setDoOutline(!doOutline) )}}
                            label="Outlines"/>
                    </InputGroup>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={doSpinTest}
                            onChange={() => {dispatch( setDoSpinTest(!doSpinTest) )}}
                            label="Spin test"/>
                    </InputGroup>
        </>
    }
