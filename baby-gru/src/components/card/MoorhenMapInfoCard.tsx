import { Backdrop, Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { convertViewtoPx } from "../../utils/utils";
import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "../menu-item/MoorhenBaseMenuItem"

export const MoorhenMapInfoCard = (props: {
    map: moorhen.Map;
    disabled: boolean;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;

}) => {

    const [cell, setCell] = useState<string | null>(null)
    const [spacegroup, setSpacegroup] = useState<string | null>(null)
    const [resolution, setResolution] = useState<string | null>(null)
    const [busy, setBusy] = useState<boolean>(true)
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    useEffect(() => {
        const fetchHeaderInfo = async () => {
            const headerInfo = await props.map.fetchHeaderInfo()
            setCell(headerInfo.cell_a.toFixed(2)+" "+headerInfo.cell_b.toFixed(2)+" "+headerInfo.cell_c.toFixed(2)+" "+(headerInfo.cell_alpha*180./Math.PI).toFixed(2)+" "+(headerInfo.cell_beta*180./Math.PI).toFixed(2)+" "+(headerInfo.cell_gamma*180./Math.PI).toFixed(2))
            setSpacegroup(headerInfo.spacegroup)
            setResolution(headerInfo.resolution.toFixed(2))
            setBusy(false)
        }
        setBusy(true)
        fetchHeaderInfo()
    }, [])

    const panelContent = 
        <TableContainer style={{maxWidth: convertViewtoPx(40, width), maxHeight: convertViewtoPx(40, height), overflow: 'auto'}}>
            <Table stickyHeader={true}>
                <TableBody>
                    <TableRow style={{backgroundColor: 'rgba(233, 233, 233, 0.3)'}} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell component="th" scope="row">Cell</TableCell>
                        <TableCell component="th" scope="row">{cell}</TableCell>
                    </TableRow>
                    <TableRow style={{backgroundColor: 'white'}} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell component="th" scope="row">SpaceGroup</TableCell>
                        <TableCell component="th" scope="row">{spacegroup}</TableCell>
                    </TableRow>
                    <TableRow style={{backgroundColor: 'rgba(233, 233, 233, 0.3)'}} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell component="th" scope="row">Resolution</TableCell>
                        <TableCell component="th" scope="row">{resolution}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
         </TableContainer>

    return <MoorhenBaseMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText="Map Information..."
        showOkButton={false}
        onCompleted={() => {}}
        setPopoverIsShown={props.setPopoverIsShown}
        />

}
