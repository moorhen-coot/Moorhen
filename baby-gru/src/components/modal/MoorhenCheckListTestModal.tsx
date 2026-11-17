import { useState } from "react";
import { modalKeys } from "../../utils/enums";
import { MoorhenChainCheckList } from "../inputs/CheckList/MoorhenChainCheckList";
import { MoorhenMoleculeCheckList } from "../inputs/CheckList/MoorhenMoleculeCheckList";
import { MoorhenMoleculeSelect } from "../inputs/Selector/MoleculeSelector";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { MoorhenStack } from "../interface-base/Stack/Stack";

/** What a list holds now, and how many times the user changed it. */
const Readout = (props: { selected: string[] | undefined; userChanges: number }) => (
    <span style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
        Selected: <code>{JSON.stringify(props.selected ?? null)}</code> · user changes: {props.userChanges}
    </span>
);

/** Dev-only playground for the multi-select check lists, before they are used in real tools. */
export const MoorhenCheckListTestModal = (props: ModalComponentProps) => {
    const [molecules, setMolecules] = useState<string[] | undefined>(undefined);
    const [moleculeChanges, setMoleculeChanges] = useState(0);
    const [molecule, setMolecule] = useState<string | undefined>(undefined);
    const [chains, setChains] = useState<string[] | undefined>(undefined);
    const [chainChanges, setChainChanges] = useState(0);

    const body = (
        <MoorhenStack direction="column" gap="1rem" style={{ padding: "0.5rem" }}>
            <MoorhenStack direction="column" gap="0.3rem">
                <MoorhenMoleculeCheckList setSelected={setMolecules} onChange={() => setMoleculeChanges(n => n + 1)} />
                <Readout selected={molecules} userChanges={moleculeChanges} />
            </MoorhenStack>
            <MoorhenStack direction="column" gap="0.3rem">
                <MoorhenMoleculeSelect useUniqueId={true} label="Chains of:" selectedMolecule={molecule} setSelectedMolecule={setMolecule} />
                <MoorhenChainCheckList moleculeUniqueId={molecule} setSelected={setChains} onChange={() => setChainChanges(n => n + 1)} />
                <Readout selected={chains} userChanges={chainChanges} />
            </MoorhenStack>
        </MoorhenStack>
    );

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.CHECK_LIST_TEST}
            headerTitle="Check lists (test)"
            body={body}
            allowDocking={true}
            openDocked={props.openDocked}
            initialWidth={420}
            initialHeight={560}
        />
    );
};
