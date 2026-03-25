import { IconButton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useStore } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { MoorhenButton } from "@/components/inputs";
import { MoorhenCidInputForm } from "@/components/inputs/MoorhenCidInputForm";
import { MoorhenStack } from "@/components/interface-base";
import { setShownControl } from "@/store";
import { RootState } from "@/store/MoorhenReduxStore";
import { moorhen } from "@/types/moorhen";
import { getCentreAtom } from "@/utils/utils";

export const GoToResidue = () => {
    const store = useStore<RootState>();
    const cidFormRef = useRef<null | HTMLInputElement>(null);
    const commandCentre = useCommandCentre();

    const [invalidCid, setInvalidCid] = useState<boolean>(false);

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const dispatch = useDispatch();

    const centreOnSelection = useCallback(async () => {
        if (!cidFormRef.current?.value) {
            return;
        }

        const [chosenMolecule, _residueCid] = await getCentreAtom(molecules, commandCentre, store);
        if (!chosenMolecule) {
            return;
        }

        const isValidCid = await chosenMolecule.isValidSelection(cidFormRef.current.value);
        if (isValidCid) {
            setInvalidCid(false);
            await chosenMolecule.centreOn(cidFormRef.current.value, true, true);
            dispatch(setShownControl(null));
        } else {
            setInvalidCid(true);
        }
    }, [molecules]);

    return (
        <MoorhenStack align="center">
            <MoorhenCidInputForm
                ref={cidFormRef}
                invalidCid={invalidCid}
                allowUseCurrentSelection={false}
                label={null}
                placeholder="//Chain/Residue"
            />
            <div>
                <MoorhenButton type="icon-only" icon="MatSymCheck" onClick={centreOnSelection} />
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymClose"
                    onClick={async () => {
                        dispatch(setShownControl(null));
                    }}
                />
            </div>
        </MoorhenStack>
    );
};
