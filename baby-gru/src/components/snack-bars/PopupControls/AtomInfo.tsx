import { CloseOutlined } from "@mui/icons-material";
import { IconButton, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { RootState } from "@/store";
import { setShownControl } from "@/store/globalUISlice";

export const AtomInfo = () => {
    const dispatch = useDispatch();

    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const molecule = molecules.find(mol => mol.molNo === (shownControl?.name === "atomInfo" ? shownControl.payload?.molNo : undefined));
    const fragmentCid = shownControl?.name === "atomInfo" ? shownControl.payload?.fragmentCid : undefined;

    const [atomProps, setAtomProps] = useState({ tempFactor: 100.0, occupancy: 0.0, x: -9999, y: -9999, z: -9999, charge: 0 });

    useEffect(() => {
        const getAtomInfo = async () => {
            if (molecule && fragmentCid) {
                const gemmiAtoms = await molecule.gemmiAtomsForCid(fragmentCid);
                setAtomProps({
                    tempFactor: gemmiAtoms[0].tempFactor,
                    occupancy: gemmiAtoms[0].occupancy,
                    x: gemmiAtoms[0].x,
                    y: gemmiAtoms[0].y,
                    z: gemmiAtoms[0].z,
                    charge: gemmiAtoms[0].charge,
                });
            }
        };
        getAtomInfo();
    }, [molecule, fragmentCid]);

    return (
        <>
            <span>
                <em>Atom information</em>
            </span>
            <Table>
                <TableBody sx={{ padding: 1, border: 0 }}>
                    <TableRow sx={{ padding: 1, border: 0 }}>
                        <TableCell sx={{ padding: 1, border: 0 }}>
                            <Table sx={{ padding: 1, border: 0 }}>
                                <TableBody sx={{ padding: 1, border: 0 }}>
                                    <TableRow sx={{ padding: 1, border: 0 }}>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "left" }}>Name:</TableCell>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "right" }}>{fragmentCid}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ padding: 1, border: 0 }}>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "left" }}>Molecule:</TableCell>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "right" }}>{molecule?.name}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ padding: 1, border: 0 }}>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "left" }}>Temp. factor:</TableCell>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "right" }}>
                                            {atomProps.tempFactor.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow sx={{ padding: 1, border: 0 }}>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "left" }}>Occupancy:</TableCell>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "right" }}>
                                            {atomProps.occupancy.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow sx={{ padding: 1, border: 0 }}>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "left" }}>Position:</TableCell>
                                        <TableCell sx={{ padding: 1, border: 0, textAlign: "right" }}>
                                            {atomProps.x.toFixed(3)} {atomProps.y.toFixed(3)} {atomProps.z.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableCell>
                        <TableCell style={{ padding: 1, border: 0 }}>
                            <IconButton onClick={() => dispatch(setShownControl(null))}>
                                <CloseOutlined />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </>
    );
};
