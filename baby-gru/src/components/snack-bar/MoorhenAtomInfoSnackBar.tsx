import { SnackbarContent, useSnackbar } from "notistack";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from "react-redux";
import { cidToSpec, parseAtomInfoLabel } from "../../utils/utils";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { setIsDraggingAtoms } from "../../store/generalStatesSlice";
import { Stack } from "react-bootstrap";
import { IconButton, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";

export const MoorhenAtomInfoSnackBar = forwardRef<
    HTMLDivElement, 
    {
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        moleculeRef: moorhen.Molecule;
        cidRef: string;
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
            if(props.moleculeRef&&props.cidRef){
                const gemmiAtoms = await props.moleculeRef.gemmiAtomsForCid(props.cidRef)
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

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ width: '100%', backgroundColor: isDark ? 'grey' : 'white', color: isDark ? 'white' : 'grey' }}>
                <span><em>Atom information</em></span>
                <Table>
                    <TableBody sx={{padding: 1, border: 0}}>
                    <TableRow sx={{padding: 1, border: 0}}>
                    <TableCell sx={{padding: 1, border: 0}}>
                        <Table sx={{padding: 1, border: 0}}>
                        <TableBody sx={{padding: 1, border: 0}}>
                        <TableRow sx={{padding: 1, border: 0}}>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'left'}}>Name:</TableCell>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'right'}}>{props.cidRef}</TableCell>
                        </TableRow>
                        <TableRow sx={{padding: 1, border: 0}}>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'left'}}>Molecule:</TableCell>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'right'}}>{props.moleculeRef.name}</TableCell>
                        </TableRow>
                        <TableRow sx={{padding: 1, border: 0}}>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'left'}}>Temp. factor:</TableCell>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'right'}}>{atomProps.tempFactor.toFixed(3)}</TableCell>
                        </TableRow>
                        <TableRow sx={{padding: 1, border: 0}}>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'left'}}>Occupancy:</TableCell>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'right'}}>{atomProps.occupancy.toFixed(3)}</TableCell>
                        </TableRow>
                        <TableRow sx={{padding: 1, border: 0}}>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'left'}}>Position:</TableCell>
                        <TableCell sx={{padding: 1, border: 0, textAlign: 'right'}}>{atomProps.x.toFixed(3)} {atomProps.y.toFixed(3)} {atomProps.z.toFixed(3)}</TableCell>
                        </TableRow>
                        </TableBody>
                        </Table>
                    </TableCell>
                    <TableCell style={{padding: 1, border: 0}}>
                        <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={async () => {
                            await finishDragging(true)
                        }}>
                            <CloseOutlined />
                        </IconButton>
                    </TableCell>
                    </TableRow>
                    </TableBody>
                </Table>
    </SnackbarContent>
})
