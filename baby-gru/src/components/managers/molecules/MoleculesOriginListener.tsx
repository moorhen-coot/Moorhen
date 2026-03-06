import { useSelector, useStore } from "react-redux";
import { useEffect, useRef } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { RootState } from "@/store";
import { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { getCentreAtom } from "@/utils/utils";

export const MoleculesOriginListener = () => {
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const _origin = useSelector((state: RootState) => state.glRef.origin);
    const originRef = useRef(_origin);
    const lastOriginRef = useRef(_origin);
    const commandCentre = useCommandCentre();

    originRef.current = _origin;

    const store = useStore<RootState>();
    const drawOriginRepresentations = async () => {
        if (molecules.length === 0) {
            return;
        }
        if (!originRef.current) {
            return;
        }
        if (lastOriginRef.current === originRef.current) {
            return;
        }
        lastOriginRef.current = originRef.current;
        const [_molecule, cid] = await getCentreAtom(molecules, commandCentre, store);
        molecules.forEach((molecule: MoorhenMolecule) => {
            if (molecule.environmentRepresentation.visible) {
                molecule.drawEnvironment(cid);
            }
            if (molecule.adaptativeBondsEnabled) {
                molecule.redrawAdaptativeBonds(cid);
            }
            if (molecule.symmetryOn) {
                molecule.drawSymmetry();
            }
        });
    };

    (useEffect(() => {
        const intervalId = setInterval(async () => {
            drawOriginRepresentations();
        }, 500);
        return () => {
            clearInterval(intervalId);
        };
    }),
        []);

    return null;
};
