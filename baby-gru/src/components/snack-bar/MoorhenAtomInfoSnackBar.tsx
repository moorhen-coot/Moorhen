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
    const [atomProps, setAtomProps] = useState({tempFactor:100.0,occupancy:0.0,x:-9999.,y:-9999.,z:-9999.,charge:0});

    const finishDragging = async (acceptTransform: boolean) => {
        closeSnackbar(props.id)
    }

    useEffect(() => {
        const getAtomInfo = async () => { 
            if(props.moleculeRef.current&&props.cidRef){
                const gemmiAtoms = await props.moleculeRef.current.gemmiAtomsForCid(props.cidRef.current[0])
                setAtomProps({tempFactor:gemmiAtoms[0].tempFactor, 
                              occupancy:gemmiAtoms[0].occupancy,
                              x:gemmiAtoms[0].x,
                              y:gemmiAtoms[0].y,
                              z:gemmiAtoms[0].z,
                              charge:gemmiAtoms[0].charge
                              })
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
                        <tr><td>Temp. factor: {atomProps.tempFactor.toFixed(3)}</td></tr>
                        <tr><td>Occupancy: {atomProps.occupancy.toFixed(3)}</td></tr>
                        <tr><td>Position: {atomProps.x.toFixed(3)} {atomProps.y.toFixed(3)} {atomProps.z.toFixed(3)}</td></tr>
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
