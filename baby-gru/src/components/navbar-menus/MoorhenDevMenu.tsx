import { Form, InputGroup } from "react-bootstrap";
import { useRef, useState } from "react";
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from "react-redux";
import { setDoOutline } from "../../store/sceneSettingsSlice";
import { useSnackbar } from "notistack";
import { setUseGemmi } from "../../store/generalStatesSlice";

export const MoorhenDevMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)

    const customCid = useRef<string>('')

    const dispatch = useDispatch()

    const doOutline = useSelector((state: moorhen.State) => state.sceneSettings.doOutline)

    const menuItemProps = {setPopoverIsShown, customCid, ...props}

    const { enqueueSnackbar } = useSnackbar()

    const useGemmi = useSelector((state: moorhen.State) => state.generalStates.useGemmi)

    const tomogramTest = () => {
        enqueueSnackbar("tomogram", {
            variant: "tomogram",
            persist: true,
            commandCentre: props.commandCentre,
            glRef: props.glRef,
            mapMolNo: 0,
            anchorOrigin: { vertical: "bottom", horizontal: "center" }
        })
    }

    return <>
                    <MenuItem onClick={tomogramTest}>
                        Tomogram...
                    </MenuItem>
                    <hr></hr>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check
                            type="switch"
                            checked={useGemmi}
                            onChange={() => {dispatch( setUseGemmi(!useGemmi) )}}
                            label="Use gemmi for reading/writing coord files"/>
                    </InputGroup>

                    <hr></hr>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check
                            type="switch"
                            checked={doOutline}
                            onChange={() => {dispatch( setDoOutline(!doOutline) )}}
                            label="Outlines"/>
                    </InputGroup>
        </>
    }
