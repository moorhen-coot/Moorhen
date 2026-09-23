import { useDispatch, useSelector } from "react-redux";
import { useStore } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { useCommandCentre, useMoorhenInstance } from "@/InstanceManager";
import { MoorhenButton, MoorhenMoleculeSelect } from "@/components/inputs";
import { MoorhenCidInputForm } from "@/components/inputs/Cid/MoorhenCidInputForm";
import { MoorhenStack } from "@/components/interface-base";
import { setShownControl } from "@/store";
import { RootState } from "@/store/MoorhenReduxStore";
import { moorhen } from "@/types/moorhen";
import { getCentreAtom } from "@/utils/utils";

export const GoToResidue = () => {

    const [invalidCid, setInvalidCid] = useState<boolean>(false);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const [selectedMolecule, setSelectedMolecule] = useState<string>(null);
    const [cid, setCid] = useState<string>("");
    const dispatch = useDispatch();
    const moorhenInstance = useMoorhenInstance();

    const centreOnSelection = async () => {
        
        const chosenMolecule = moorhenInstance.getMolecule(selectedMolecule);
        const isValidCid = await chosenMolecule.isValidSelection(cid);
        if (isValidCid) {
            setInvalidCid(false);
            await chosenMolecule.centreOn(cid, true, true);
            dispatch(setShownControl(null));
        } else {
            setInvalidCid(true);
        }
    };

    return (
        <MoorhenStack align="center">
            <MoorhenMoleculeSelect
                molecules={molecules}
                selectedMolecule={selectedMolecule}
                setSelectedMolecule={setSelectedMolecule}
                useUniqueId
            />
            <MoorhenCidInputForm
                invalidCid={invalidCid}
                allowUseCurrentSelection={false}
                label={null}
                value={cid}
                setValue={setCid}
                setMoleculeUniqueId={setSelectedMolecule}
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
