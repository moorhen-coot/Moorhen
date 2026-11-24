import { batch, shallowEqual, useDispatch, useSelector, useStore } from "react-redux";
import { useState } from "react";
import { MoorhenButton, MoorhenMoleculeSelect, MoorhenSlider, MoorhenToggle } from "@/components/inputs";
import { MoorhenAccordion, MoorhenStack } from "@/components/interface-base";
import { type RootState, addCustomRepresentation, enqueueSnackbar, removeCustomRepresentation } from "@/store";
import type { MoleculeLigandRecord } from "@/store/moleculesSlice";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { MoleculeRepresentation } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { neighbourResidues } from "@/utils/Representation/RepresentationBuilder";

const DEFAULT_DISTANCE = 5;

/**
 * The atoms a ligand's pocket is measured from: all of a ligand-only molecule (it is the ligand), or
 * the ligand's residue in its model.
 */
const pocketNeighboursCid = (ligand?: MoleculeLigandRecord) => ligand?.cid ?? "/*/*/*/*";

/**
 * A ligand's pockets: representations of a model (the protein) drawing its residues within some
 * distance of the ligand, as a "neighbourhood" representation whose neighbours are the ligand, in its
 * own molecule (`neighboursMoleculeUid`). That parameter is also how the pockets are found again here:
 * no list to keep, and it survives style changes of the ligand, scenes and sessions.
 */
const usePockets = (molecule: MoorhenMolecule, ligand?: MoleculeLigandRecord) => {
    const neighboursCid = pocketNeighboursCid(ligand);
    return useSelector(
        (state: RootState) =>
            state.molecules.customRepresentations.filter(
                representation =>
                    representation.restrictToNeighbours &&
                    representation.neighboursMoleculeUid === molecule.uniqueId &&
                    representation.neighboursCid === neighboursCid
            ),
        shallowEqual
    );
};

/**
 * The Pocket section of a ligand card: open by default when the ligand has its pocket, so it is seen
 * (and can be changed or deleted) when the card is opened.
 */
export const LigandPocketSection = (props: { molecule: MoorhenMolecule; ligand?: MoleculeLigandRecord }) => {
    const pockets = usePockets(props.molecule, props.ligand);
    return (
        <MoorhenAccordion title={pockets.length > 0 ? "Pocket (shown)" : "Pocket"} defaultOpen={pockets.length > 0}>
            <LigandPocket {...props} />
        </MoorhenAccordion>
    );
};

/**
 * A ligand's one pocket: the residues of a model within a distance of the ligand, drawn as bonds (side
 * chains only by default). Creating it again with other settings replaces it; the settings start from
 * the pocket there is.
 */
const LigandPocket = (props: { molecule: MoorhenMolecule; ligand?: MoleculeLigandRecord }) => {
    const { molecule, ligand } = props;
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const pockets = usePockets(molecule, ligand);
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const records = useSelector((state: RootState) => state.molecules.moleculeRecords);
    // The models it can be in: a ligand of a model first in its own; any model for a docked ligand
    const others = moleculeList.filter(other => other !== molecule && !records[other.uniqueId]?.isLigandOnly);
    const targets = ligand ? [molecule, ...others] : others;

    // One pocket per ligand: should there be more (made elsewhere), the first stands for them
    const current = pockets[0] ?? null;
    const [targetUid, setTargetUid] = useState<string | undefined>(() => current?.parentMolecule?.uniqueId);
    const [distance, setDistance] = useState<number>(() => current?.neighboursDistance ?? DEFAULT_DISTANCE);
    // From the settings it was built with (its cid is the resolved residue list by now)
    const built = (current as unknown as MoleculeRepresentation | null)?.buildParams ?? null;
    const [sideChainsOnly, setSideChainsOnly] = useState<boolean>(() => built?.sideChainOnly ?? true);
    const [waters, setWaters] = useState<boolean>(() => (built ? !built.notHOH : false));
    const [busy, setBusy] = useState<boolean>(false);

    const createPocket = async () => {
        const target = targets.find(other => other.uniqueId === targetUid);
        if (!target) return;
        const neighboursCid = pocketNeighboursCid(ligand);
        // Checked first: an empty neighbourhood would draw the whole model
        if (!neighbourResidues(target, "/*/*/*/", neighboursCid, distance, false, molecule.uniqueId)) {
            dispatch(enqueueSnackbar({ message: `No residue of ${target.name} within ${distance} Å`, variant: "warning" }));
            return;
        }
        setBusy(true);
        try {
            const representation = await MoleculeRepresentation.create({
                representationStyle: "CBs",
                molecule: target,
                ruleType: "neighbourhood",
                restrictToNeighbours: true,
                neighboursCid,
                neighboursMoleculeUid: molecule.uniqueId,
                neighboursDistance: distance,
                sideChainOnly: sideChainsOnly,
                notHOH: !waters,
                isCustom: true,
                // Shown with its ligand (a store sync keeps it so): made hidden for a hidden ligand
                visible: store.getState().molecules.visibleMolecules.includes(molecule.molNo),
            });
            if (representation) {
                // The new one is drawn: the old one goes (in whichever model it was)
                batch(() => {
                    dispatch(addCustomRepresentation(representation));
                    pockets.forEach(pocket => deletePocket(pocket as unknown as MoleculeRepresentation));
                });
            }
        } catch (err) {
            console.error(err);
            dispatch(enqueueSnackbar({ message: "Failed to create the pocket", variant: "error" }));
        } finally {
            setBusy(false);
        }
    };

    const deletePocket = (representation: MoleculeRepresentation) => {
        batch(() => {
            representation.parentMolecule?.removeRepresentation(representation.uniqueId);
            dispatch(removeCustomRepresentation(representation));
        });
    };

    return (
        <MoorhenStack gap="0.5rem">
            {current && (
                <MoorhenStack direction="row" gap="0.5rem" align="center" style={{ justifyContent: "space-between" }}>
                    <span>
                        Shown in {current.parentMolecule?.name}: {current.neighboursDistance} Å
                        {built?.sideChainOnly ? ", side chains" : ""}
                        {built && !built.notHOH ? ", waters" : ""}
                    </span>
                    <MoorhenButton
                        type="icon-only"
                        icon="MatSymDelete"
                        tooltip="Delete the pocket"
                        onClick={() => batch(() => pockets.forEach(pocket => deletePocket(pocket as unknown as MoleculeRepresentation)))}
                    />
                </MoorhenStack>
            )}
            {targets.length === 0 ? (
                <span>Load a model to draw the pocket of this ligand in it</span>
            ) : (
                <>
                    <MoorhenMoleculeSelect
                        useUniqueId={true}
                        molecules={targets}
                        selectedMolecule={targetUid}
                        setSelectedMolecule={setTargetUid}
                        label="In"
                    />
                    <MoorhenSlider
                        sliderTitle="Distance"
                        sliderTitleUnit="Å"
                        value={distance}
                        setValue={setDistance}
                        showLabels={false}
                        stepButtons={0.5}
                        minVal={2}
                        maxVal={12}
                        scale="linear"
                        decimalPlaces={1}
                    />
                    <MoorhenStack direction="row" gap="1rem" align="center" style={{ flexWrap: "wrap" }}>
                        <MoorhenToggle label="Side chains only" checked={sideChainsOnly} onChange={() => setSideChainsOnly(!sideChainsOnly)} />
                        <MoorhenToggle label="Waters" checked={waters} onChange={() => setWaters(!waters)} />
                    </MoorhenStack>
                    <MoorhenButton onClick={createPocket} disabled={busy || !targetUid} style={{ alignSelf: "flex-end" }}>
                        {current ? "Update pocket" : "Create pocket"}
                    </MoorhenButton>
                </>
            )}
        </MoorhenStack>
    );
};
