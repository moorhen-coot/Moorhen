import { SnackbarContent, useSnackbar } from "notistack";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from "react-redux";
import { cidToSpec, parseAtomInfoLabel } from "../../utils/utils";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { setIsDraggingAtoms } from "../../store/generalStatesSlice";
import { Stack } from "react-bootstrap";
import { IconButton } from "@mui/material";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";

export const MoorhenAtomInfoSnackBar = forwardRef<
    HTMLDivElement, 
    {
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        moleculeRef: React.RefObject<moorhen.Molecule>;
        cidRef: React.RefObject<string[]>;
        glRef: React.RefObject<webGL.MGWebGL>;
        monomerLibraryPath: string;
        id: string;
    }
>((props, ref) => {
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const dispatch = useDispatch()

    const { closeSnackbar } = useSnackbar()
    const [tempFactor, setTempFactor] = useState(20.0);

    const finishDragging = async (acceptTransform: boolean) => {
        closeSnackbar(props.id)
    }

    useEffect(() => {
        const getAtomInfo = async () => { 
            if(props.moleculeRef.current&&props.cidRef){
                console.log(props.moleculeRef.current.molNo,props.cidRef.current)
                const result = await props.commandCentre.current.cootCommand({
                    command: 'get_atom_info',
                    commandArgs: [props.moleculeRef.current.molNo,props.cidRef.current[0]],
                }, false)
                setTempFactor(result.data.result.result.tempFactor)
            }
        }
        getAtomInfo()    
    }, [props.moleculeRef,props.cidRef])

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? 'grey' : 'white', color: isDark ? 'white' : 'grey' }}>
                <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span>Atom information</span>
                        <table>
                        <tr><td>Name: {props.cidRef.current}</td></tr>
                        <tr><td>Molecule: {props.cidRef.current}</td></tr>
                        <tr><td>Temp. factor: {tempFactor.toFixed(3)}</td></tr>
                        <tr><td>Occupancy: {props.cidRef.current}</td></tr>
                        <tr><td>Position: {props.cidRef.current}</td></tr>
                        </table>
                    </div>
                    <div>
                        <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                            await finishDragging(true)
                        }}>
                            <CloseOutlined />
                        </IconButton>
                    </div>
                </Stack>
    </SnackbarContent>
})
