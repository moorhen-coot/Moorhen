import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
import { MoorhenGrid } from "@/components/interface-base/Stack/Grid";
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
                <em>Atom information<br/><br/></em> 
            </span>
            <MoorhenGrid columns={2} columnGap="2rem">
                <div>Name:</div>
                <div>{fragmentCid}</div>
                <div>Molecule:</div>
                <div>{molecule?.name}</div>
                <div>Temp. factor:</div>
                <div>{atomProps.tempFactor.toFixed(3)}</div>

                <div>Occupancy:</div>
                <div>{atomProps.occupancy.toFixed(3)}</div>

                <div>Position:</div>
                <div>
                    {atomProps.x.toFixed(3)} {atomProps.y.toFixed(3)} {atomProps.z.toFixed(3)}
                </div>
            </MoorhenGrid>
            <MoorhenButton tooltip="Close" type="icon-only" icon="MatSymClose" onClick={() => dispatch(setShownControl(null))} />
        </>
    );
};
