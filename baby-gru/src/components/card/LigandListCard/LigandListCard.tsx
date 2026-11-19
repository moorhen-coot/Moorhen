import parse from "html-react-parser";
import { batch, shallowEqual, useDispatch, useSelector, useStore } from "react-redux";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { MoorhenIcon, MoorhenSpinner } from "@/components/icons";
import { MoorhenLinearProgress } from "@/components/icons/MoorhenLinearProgress";
import { MoorhenButton, MoorhenColourPicker, MoorhenMoleculeSelect, MoorhenPopoverButton, MoorhenToggle } from "@/components/inputs";
import type { RGBAColour } from "@/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { MoorhenAccordion, MoorhenStack, MoorhenTooltip } from "@/components/interface-base";
import { type RootState, addCustomRepresentation, enqueueSnackbar, removeCustomRepresentation, removeMolecule, removeVectorsByTag, setHoveredAtom } from "@/store";
import { setRequestDrawScene } from "@/store/glRefSlice";
import { triggerUpdate } from "@/store/moleculeMapUpdateSlice";
import type { MoleculeLigandRecord } from "@/store/moleculesSlice";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { MoleculeRepresentation, type RepresentationStyles } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { type LigandEntry, type LigandSite, centreOnSite, groupLigandsBySite } from "@/utils/ligandSites";
import { SOURCE_LIGAND_CONTACTS, TAG_MOLECULE, TAG_SOURCE } from "@/utils/tags";
import { setMoleculeListVisible, setMoleculeVisible } from "@/utils/moleculeVisibility";
import { hexToRGB, rgbToHex } from "@/utils/utils";
import { LigandContactsSection } from "./LigandContacts";
import { selectCustomRepresentations } from "../MoleculeCard/moleculeCardSelectors";
import "./ligand-list-card.css";

const HOVERED_ROW_CLASS = "moorhen__ligand-list-row-hovered";

/**
 * The key a row registers under: its molecule, plus the residue for a ligand inside a model (with its
 * model: an ensemble has the same ligand residue in each). The residue number as gemmi writes it,
 * insertion code appended (301A).
 */
const rowKey = (molecule: MoorhenMolecule, ligand?: MoleculeLigandRecord) =>
    ligand ? `${molecule.uniqueId}|${ligand.modelName}|${ligand.chainName}|${ligand.resNum}` : molecule.uniqueId;

/**
 * Highlights the row of the ligand under the mouse in the 3D view (hoveringStates.hoveredAtom): the
 * row of the hovered residue if it is a listed ligand of a model, else the row of the molecule.
 * The hover changes at mouse rate, so this does not go through React: a store subscription moves
 * one CSS class from row element to row element, and no component re-renders. React never
 * overwrites the class, as a row's className prop does not change.
 * Returns the ref callback each row registers its element with.
 */
const useHoveredRowHighlight = (store: ReturnType<typeof useStore<RootState>>) => {
    const rowElements = useRef(new Map<string, HTMLElement>());
    const hoveredUid = useRef<string | null>(null);

    useEffect(() => {
        const update = () => {
            const { molecule, cid } = store.getState().hoveringStates.hoveredAtom;
            // A cid as hovering gives it: /1/A/301(ATP)/C1
            const parts = cid?.split("/") ?? [];
            // Its residue number as rowKey has it: an mmdb insertion code (301.A) without the dot
            const residueKey = molecule ? `${molecule.uniqueId}|${parts[1]}|${parts[2]}|${parts[3]?.split("(")[0].replace(".", "")}` : null;
            const uid = residueKey && rowElements.current.has(residueKey) ? residueKey : (molecule?.uniqueId ?? null);
            if (uid === hoveredUid.current) return;
            rowElements.current.get(hoveredUid.current)?.classList.remove(HOVERED_ROW_CLASS);
            rowElements.current.get(uid)?.classList.add(HOVERED_ROW_CLASS);
            hoveredUid.current = uid;
        };
        update();
        return store.subscribe(update);
    }, [store]);

    return useCallback((uid: string, element: HTMLElement | null) => {
        if (element) {
            rowElements.current.set(uid, element);
            // A row mounted while its molecule is hovered (list regrouped, site opened)
            element.classList.toggle(HOVERED_ROW_CLASS, uid === hoveredUid.current);
        } else {
            rowElements.current.delete(uid);
        }
    }, []);
};

// Natural order ("pose_2" before "pose_10"), ignoring case
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * The ligands of the Ligands panel, each with its ligand card (2D view, centre-on, representation,
 * contacts...):
 * - the ligands inside models, one group per model, open by default;
 * - the ligand-only molecules (MoorhenMolecule.isLigandOnly), listed by name instead of a full
 *   molecule card each (which does not scale to the hundreds or thousands of ligands
 *   files.batchLoadLigands can load).
 * Or, grouped by position, only sites: one sub-card per set of overlapping ligands, whichever
 * molecule each is in.
 */
export const LigandListCard = (props: { molecules: MoorhenMolecule[] }) => {
    const store = useStore<RootState>();
    // What the list groups and labels by, from the molecule records (refreshed by the molecules)
    const records = useSelector((state: RootState) => state.molecules.moleculeRecords);
    const ligandsOf = (molecule: MoorhenMolecule) => records[molecule.uniqueId]?.ligands ?? [];
    const molecules = props.molecules.filter(molecule => records[molecule.uniqueId]?.isLigandOnly);
    const hosts = props.molecules.filter(molecule => !records[molecule.uniqueId]?.isLigandOnly && ligandsOf(molecule).length > 0);
    /** The ligand residue types of the row that have no dictionary */
    const noDictionary = (molecule: MoorhenMolecule, ligand?: MoleculeLigandRecord): string[] => {
        const missing = records[molecule.uniqueId]?.missingDictionaries ?? [];
        if (missing.length === 0) return [];
        const resNames = ligand ? [ligand.resName] : [...new Set(ligandsOf(molecule).map(info => info.resName))];
        return resNames.filter(resName => missing.includes(resName));
    };
    const registerRow = useHoveredRowHighlight(store);
    // A ligand batch load adds molecules chunk after chunk: rendering every row for each chunk made
    // the load much slower with this panel open. The rows are rendered once it is done.
    const batchLoading = useSelector((state: RootState) => state.generalStates.ligandBatchLoads > 0);
    const visibleMolecules = useSelector((state: RootState) => state.molecules.visibleMolecules);
    const visible = new Set(visibleMolecules);

    // A–Z by default; load order kept as the other choice, since it may carry the caller's ranking
    const [order, setOrder] = useState<"name" | "load">("name");
    const entryName = ({ molecule, ligand }: LigandEntry) =>
        ligand ? `${molecule.name} ${ligand.resName} ${ligand.chainName}/${ligand.resNum}` : molecule.name;
    const sorted = (list: LigandEntry[]) => (order === "load" ? list : [...list].sort((a, b) => byName.compare(entryName(a), entryName(b))));

    // Every ligand: those of the models, then the ligand-only molecules
    const entries: LigandEntry[] = [
        ...hosts.flatMap(host => ligandsOf(host).map(ligand => ({ molecule: host, ligand }))),
        ...molecules.map(molecule => ({ molecule })),
    ];
    const entryKey = ({ molecule, ligand }: LigandEntry) => (ligand ? `${molecule.uniqueId}|${ligand.cid}` : molecule.uniqueId);

    // Grouping by position, of all the ligands: computed when switched on, again only if the ligands change
    const [grouped, setGrouped] = useState<boolean>(false);
    const [computed, setComputed] = useState<{ membership: string; sites: LigandSite[] } | null>(null);
    const membership = entries.map(entryKey).join(",");
    const sites = computed?.membership === membership ? computed.sites : null;
    useEffect(() => {
        if (!grouped || sites || batchLoading) return;
        let cancelled = false;
        groupLigandsBySite(entries)
            .then(result => {
                if (!cancelled) setComputed({ membership, sites: result });
            })
            // A molecule deleted while its atoms were read, say: back to the plain list rather than
            // waiting forever (an empty site list would show no ligand at all)
            .catch(err => {
                console.error(err);
                if (!cancelled) setGrouped(false);
            });
        return () => {
            cancelled = true;
        };
        // Keyed on which ligands are listed, not on the entries array, which is new on every render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grouped, membership, batchLoading]);

    /** Show / hide the ligand-only molecules of a list (a ligand of a model is shown with its model) */
    const visibilityButton = (list: LigandEntry[], what: string): React.JSX.Element[] => {
        const switchable = list.filter(entry => !entry.ligand).map(entry => entry.molecule);
        if (switchable.length === 0) return [];
        const anyShown = switchable.some(molecule => visible.has(molecule.molNo));
        return [
            <MoorhenButton
                key="visibility"
                size="accordion"
                type="icon-only"
                icon={anyShown ? "MatSymVisibility" : "MatSymVisibilityOff"}
                tooltip={anyShown ? `Hide ${what}` : `Show ${what}`}
                onClick={() => batch(() => setMoleculeListVisible(switchable, !anyShown))}
            />,
        ];
    };
    const rows = (list: LigandEntry[]) => (
        <div className="moorhen__ligand-list-list">
            {sorted(list).map(entry => (
                <LigandListRow
                    key={entryKey(entry)}
                    molecule={entry.molecule}
                    ligand={entry.ligand}
                    noDictionary={noDictionary(entry.molecule, entry.ligand).join(", ")}
                    isVisible={visible.has(entry.molecule.molNo)}
                    registerRow={registerRow}
                />
            ))}
        </div>
    );

    let content: React.ReactNode;
    if (batchLoading) {
        content = (
            <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
                <MoorhenSpinner />
            </div>
        );
    } else if (grouped) {
        // Only sites: each holds every ligand at that position, whichever molecule it is in
        content =
            sites === null ? (
                <MoorhenLinearProgress />
            ) : (
                sites.map((site, i) => {
                    return (
                        <MoorhenAccordion
                            key={entryKey(site.ligands[0])}
                            title={`Site ${i + 1} (${site.ligands.length})`}
                            defaultOpen={sites.length === 1}
                            extraControls={[
                                <MoorhenButton
                                    key="centre"
                                    size="accordion"
                                    type="icon-only"
                                    icon="MatSymFilterFocus"
                                    tooltip="Centre on site"
                                    onClick={() => centreOnSite(site, store)}
                                />,
                                ...visibilityButton(site.ligands, "the ligand-only molecules of this site"),
                            ]}
                        >
                            {rows(site.ligands)}
                        </MoorhenAccordion>
                    );
                })
            );
    } else {
        // One group per model with ligands, then the ligand-only molecules as a group of their own
        content = (
            <>
                {hosts.map(host => (
                    <MoorhenAccordion
                        key={host.uniqueId}
                        title={`${host.name} (${ligandsOf(host).length})`}
                        defaultOpen={true}
                        extraControls={[
                            <MoorhenButton
                                key="centre"
                                size="accordion"
                                type="icon-only"
                                icon="MatSymFilterFocus"
                                tooltip="Centre on molecule"
                                onClick={() => host.centreOn()}
                            />,
                        ]}
                    >
                        {rows(ligandsOf(host).map(ligand => ({ molecule: host, ligand })))}
                    </MoorhenAccordion>
                ))}
                {molecules.length > 0 && (
                    <MoorhenAccordion
                        key="ligand-only"
                        title={`Ligand-only molecules (${molecules.length})`}
                        defaultOpen={true}
                        extraControls={visibilityButton(molecules.map(molecule => ({ molecule })), "the ligand-only molecules")}
                    >
                        {rows(molecules.map(molecule => ({ molecule })))}
                    </MoorhenAccordion>
                )}
            </>
        );
    }

    return (
        <MoorhenAccordion
            title={grouped && sites ? `Ligands (${entries.length}, ${sites.length} sites)` : `Ligands (${entries.length})`}
            type="card"
            defaultOpen={true}
            extraControls={[
                <MoorhenButton
                    key="group"
                    size="accordion"
                    type="icon-only"
                    icon="MatSymGrain"
                    tooltip={grouped ? "Grouped by position: click to group by molecule" : "Group by position"}
                    onClick={() => setGrouped(!grouped)}
                />,
                <MoorhenButton
                    key="order"
                    size="accordion"
                    type="icon-only"
                    icon="MatSymSwapVert"
                    tooltip={order === "name" ? "Sorted A–Z: click for load order" : "In load order: click to sort A–Z"}
                    onClick={() => setOrder(order === "name" ? "load" : "name")}
                />,
            ]}
        >
            {content}
        </MoorhenAccordion>
    );
};

/**
 * One ligand's card: a ligand-only molecule, or with `ligand` one ligand of a model. The latter has
 * no merge or show/hide (its model's), and its representations are of its residue only.
 */
const LigandListRow = memo(function LigandListRow(props: {
    molecule: MoorhenMolecule;
    ligand?: MoleculeLigandRecord;
    /** The ligand residue types with no dictionary, comma-separated; empty if none (a string, for memo) */
    noDictionary: string;
    isVisible: boolean;
    registerRow: (uid: string, element: HTMLElement | null) => void;
}) {
    const { molecule, ligand, noDictionary, isVisible, registerRow } = props;
    const store = useStore<RootState>();
    const key = rowKey(molecule, ligand);
    const rowRef = useCallback((element: HTMLDivElement | null) => registerRow(key, element), [key, registerRow]);
    const ligandCid = ligand?.cid ?? molecule.ligands?.[0]?.cid;
    const name = ligand ? `${ligand.resName} ${ligand.chainName}/${ligand.resNum}` : molecule.name;

    // A double-click on the eye isolates the ligand. Told apart here rather than by dblclick, which
    // does not fire: the first click swaps the icon, so the second lands on a new element.
    const lastVisibilityClick = useRef(0);
    const onVisibilityClick = () => {
        const now = performance.now();
        if (now - lastVisibilityClick.current < DOUBLE_CLICK_MS) {
            lastVisibilityClick.current = 0;
            isolateLigand(molecule, store);
        } else {
            lastVisibilityClick.current = now;
            setMoleculeVisible(molecule, !isVisible);
        }
    };

    // Hovering a row hovers its ligand, as hovering a residue in the sequence viewer does: hover marker
    // in 3D, hover info panel. Leaving clears it, unless something else (the 3D view) has hovered since.
    const onMouseEnter = () => {
        if (ligandCid) store.dispatch(setHoveredAtom({ molecule, cid: ligandCid, atomInfo: null }));
    };
    const onMouseLeave = () => {
        if (store.getState().hoveringStates.hoveredAtom.molecule === molecule) {
            store.dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        }
    };

    return (
        // A data attribute, not a class: the hover class is set on this element outside React
        <div
            className="moorhen__ligand-list-row"
            data-no-dictionary={noDictionary ? "" : undefined}
            ref={rowRef}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <MoorhenAccordion
                title={
                    <span className="moorhen__ligand-list-row-title">
                        {noDictionary && (
                            <MoorhenTooltip tooltip={`No dictionary for ${noDictionary}: bonds are guessed, and it cannot be refined`}>
                                <span className="moorhen__ligand-list-no-dictionary">
                                    <MoorhenIcon moorhenSVG="MatSymWarning" className="moorhen__ligand-list-no-dictionary-icon" alt="Warning" />
                                    No dictionary
                                </span>
                            </MoorhenTooltip>
                        )}
                        <span className="moorhen__ligand-list-row-name" title={name}>
                            {name}
                        </span>
                    </span>
                }
                extraControls={[
                    <MoorhenPopoverButton key="2d" size="accordion" icon="ligand" tooltip="2D view" popoverPlacement="left">
                        <LigandDrawing molecule={molecule} resName={ligand?.resName} />
                    </MoorhenPopoverButton>,
                    !ligand && (
                        <MoorhenPopoverButton key="merge" size="accordion" icon="MatSymMerge" tooltip="Merge into a molecule" popoverPlacement="left">
                            <LigandMergeInto molecule={molecule} />
                        </MoorhenPopoverButton>
                    ),
                    <MoorhenButton
                        key="centre"
                        size="accordion"
                        type="icon-only"
                        icon="MatSymFilterFocus"
                        tooltip="Centre on ligand"
                        onClick={() => (ligand ? molecule.centreOn(ligand.cid) : molecule.centreOn())}
                    />,
                    !ligand && (
                        <MoorhenButton
                            key="download"
                            size="accordion"
                            type="icon-only"
                            icon="MatSymDownload"
                            tooltip="Download"
                            onClick={() => molecule.downloadAtoms()}
                        />
                    ),
                    <MoorhenPopoverButton key="delete" size="accordion" icon="MatSymDelete" tooltip="Delete" popoverPlacement="left">
                        <LigandDelete molecule={molecule} ligand={ligand} name={name} />
                    </MoorhenPopoverButton>,
                    !ligand && (
                        <MoorhenButton
                            key="visibility"
                            size="accordion"
                            type="icon-only"
                            icon={isVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
                            tooltip="Toggle visibility (double-click: show only this ligand)"
                            onClick={onVisibilityClick}
                        />
                    ),
                ].filter(Boolean)}
            >
                <LigandRepresentations molecule={molecule} cid={ligand?.cid} />
                <div className="moorhen__ligand-list-section">
                    <LigandContactsSection molecule={molecule} ligand={ligand} />
                </div>
            </MoorhenAccordion>
        </div>
    );
});

const DOUBLE_CLICK_MS = 350;

/**
 * Show this ligand-only molecule and hide every other one, to look at it alone, in a fixed number of
 * dispatches (setMoleculeListVisible) however many ligands there are. Ligands inside models are left
 * as they are: they are shown and hidden with their model. (The first click of the double-click
 * toggles it, so this shows it again either way.)
 */
const isolateLigand = (molecule: MoorhenMolecule, store: ReturnType<typeof useStore<RootState>>) => {
    const { moleculeList, moleculeRecords } = store.getState().molecules;
    batch(() => {
        // One redraw request for both
        setMoleculeListVisible(
            moleculeList.filter(other => other !== molecule && moleculeRecords[other.uniqueId]?.isLigandOnly),
            false,
            false
        );
        setMoleculeVisible(molecule, true, false);
        store.dispatch(setRequestDrawScene(true));
    });
};

/** The representations offered for a ligand, one at a time. */
const LIGAND_STYLES: { style: RepresentationStyles; label: string }[] = [
    { style: "CBs", label: "Bonds" },
    { style: "MolecularSurface", label: "Surface" },
    { style: "MetaBalls", label: "MetaBalls" },
];

// Shown on the colour button if the molecule has no single default colour to show
const FALLBACK_SWATCH = "#a0a0a0";

/** The carbon colour the molecule is drawn with by default: its first single-colour default rule. */
const defaultCarbonColour = (molecule: MoorhenMolecule): string =>
    molecule.defaultColourRules?.find(rule => !rule.isMultiColourRule && rule.color)?.color ?? FALLBACK_SWATCH;

/**
 * The open part of a ligand's row (mounted only while open): a choice of one representation among
 * bonds, surface and MetaBalls, and one carbon colour for it (other elements keep their colours).
 * These are the molecule's custom representations, the same ones the molecule card's chips edit:
 * of the whole molecule for a ligand-only one, of the residue `cid` for a ligand inside a model.
 */
const LigandRepresentations = (props: { molecule: MoorhenMolecule; cid?: string }) => {
    const { molecule, cid } = props;
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const representations = useSelector((state: RootState) => selectCustomRepresentations(state, molecule.molNo), shallowEqual);
    const isLigandStyle = (representation: MoleculeRepresentation) => LIGAND_STYLES.some(item => item.style === representation.style);
    // Plus the default bonds that some ways of loading a ligand draw (fetchIfDirtyAndDraw: dictionaries,
    // Get Monomer...), which are not custom representations and so not in the store, but are shown
    // (A ligand cid names its residue type, /1/A/301(ATP), so no other residue's cid starts with it)
    const ligandRepresentations = cid
        ? representations.filter(representation => isLigandStyle(representation) && representation.cid?.startsWith(cid))
        : [
              ...representations.filter(isLigandStyle),
              // Shown in the interface, not shown right now: a hidden molecule's bonds are still its style,
              // and must be replaced with it (else they come back with the new style when it is shown)
              ...molecule.representations.filter(
                  representation =>
                      !representation.isCustom &&
                      (representation.interfaceOption.visible ?? representation.visible) &&
                      isLigandStyle(representation)
              ),
          ];
    const shownStyle = ligandRepresentations[0]?.style ?? null;
    const [busy, setBusy] = useState<boolean>(false);

    // Hydrogens are left out through the representation's atom selection ([!H] in its cid), which
    // Coot applies to bonds and MetaBalls but not to surfaces. Kept across style changes.
    const [hideHydrogens, setHideHydrogens] = useState<boolean>(() =>
        ligandRepresentations.some(representation => representation.cid.includes("[!H]"))
    );
    const hydrogensApply = shownStyle !== "MolecularSurface";

    // The carbon colour: the one picked here, else the custom colour a representation already has
    const [pickedColour, setPickedColour] = useState<string | null>(null);
    const currentColour =
        pickedColour ??
        ligandRepresentations
            .map(representation => (representation.useDefaultColourRules ? null : representation.colourRules[0]?.color))
            .find(Boolean) ??
        null;
    const colourOptions = (colour: string | null) =>
        colour
            ? { useDefaultColours: false, colourMode: "custom", colour, applyColourToNonCarbonAtoms: false }
            : { useDefaultColours: true };

    // Draw the new style first, then remove the others, so the ligand never disappears in between
    const switchStyle = async (style: RepresentationStyles) => {
        setBusy(true);
        try {
            const representation = await MoleculeRepresentation.create({
                representationStyle: style,
                molecule,
                ...(cid ? { ruleType: "cid" as const, cid } : { ruleType: "molecule" as const }),
                isCustom: true,
                // As the molecule is (its eye button): a hidden ligand given a new style stays hidden
                visible: store.getState().molecules.visibleMolecules.includes(molecule.molNo),
                notH: hideHydrogens,
                ...colourOptions(currentColour),
            });
            if (!representation) return;
            batch(() => {
                dispatch(addCustomRepresentation(representation));
                for (const previous of ligandRepresentations) {
                    molecule.removeRepresentation(previous.uniqueId);
                    if (previous.isCustom) dispatch(removeCustomRepresentation(previous));
                }
            });
        } finally {
            setBusy(false);
        }
    };

    const toggleHydrogens = () => {
        const hide = !hideHydrogens;
        setHideHydrogens(hide);
        for (const representation of ligandRepresentations) {
            representation.edit({ representationStyle: representation.style, notH: hide });
        }
    };

    const applyColour = (colour: RGBAColour) => {
        const hex = rgbToHex(colour[0], colour[1], colour[2]);
        setPickedColour(hex);
        for (const representation of ligandRepresentations) {
            representation.edit({ representationStyle: representation.style, ...colourOptions(hex) });
        }
    };

    return (
        <MoorhenStack direction="row" gap={2} style={{ alignItems: "center", flexWrap: "wrap" }}>
            {LIGAND_STYLES.map(({ style, label }) => (
                <MoorhenToggle
                    key={style}
                    type="radio"
                    name={`ligand-style-${molecule.uniqueId}-${cid ?? ""}`}
                    label={label}
                    checked={shownStyle === style}
                    disabled={busy}
                    onChange={() => {
                        if (shownStyle !== style) switchStyle(style);
                    }}
                />
            ))}
            <MoorhenStack direction="row" gap={"0.5rem"} style={{ alignItems: "center" }}>
            <MoorhenColourPicker
                colour={hexToRGB(currentColour ?? defaultCarbonColour(molecule))}
                onApply={applyColour}
                tooltip="Carbon colour of this ligand"
                position="left"
            />
            Carbon colour</MoorhenStack>
            <MoorhenToggle
                label="Show Hydrogens"
                checked={!hideHydrogens}
                disabled={busy || !hydrogensApply}
                tooltip={hydrogensApply ? undefined : "Surfaces are drawn without hydrogens"}
                onChange={toggleHydrogens}
            />

        </MoorhenStack>
    );
};

/**
 * Merge the ligand into another molecule (a model, not another ligand-only molecule). The ligand-only
 * molecule is then deleted: the ligand has moved, and lives on in the model's group of this list.
 */
const LigandMergeInto = (props: { molecule: MoorhenMolecule }) => {
    const { molecule } = props;
    const dispatch = useDispatch();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const records = useSelector((state: RootState) => state.molecules.moleculeRecords);
    const targets = moleculeList.filter(other => other !== molecule && !records[other.uniqueId]?.isLigandOnly);
    const [targetUid, setTargetUid] = useState<string | undefined>(undefined);
    const [busy, setBusy] = useState<boolean>(false);

    const merge = async () => {
        const target = targets.find(other => other.uniqueId === targetUid);
        if (!target) return;
        setBusy(true);
        try {
            await target.mergeMolecules([molecule]);
            dispatch(removeMolecule(molecule));
            await molecule.delete();
            dispatch(triggerUpdate(target.molNo));
            dispatch(enqueueSnackbar({ message: `Merged ${molecule.name} into ${target.name}`, variant: "success" }));
            document.body.click();
        } catch (err) {
            console.error(err);
            dispatch(enqueueSnackbar({ message: `Failed to merge ${molecule.name}`, variant: "error" }));
        } finally {
            setBusy(false);
        }
    };

    if (targets.length === 0) return <span>No model to merge into</span>;
    return (
        <MoorhenStack direction="row" gap="0.5rem" align="center">
            <MoorhenMoleculeSelect useUniqueId={true} molecules={targets} selectedMolecule={targetUid} setSelectedMolecule={setTargetUid} label="Into" />
            <MoorhenButton onClick={merge} disabled={busy || !targetUid}>
                Merge
            </MoorhenButton>
        </MoorhenStack>
    );
};

/**
 * Delete a ligand, once confirmed: a ligand-only molecule as a molecule, a ligand inside a model as
 * that residue of the model (an edit of the model, which its undo can take back; the model goes too
 * if nothing is left of it). The ligand's contact vectors go with it.
 *
 * A molecule leaves the store before it is deleted: delete() frees its gemmi structure, and the
 * store's dev checks read every object it holds on each dispatch.
 */
const LigandDelete = (props: { molecule: MoorhenMolecule; ligand?: MoleculeLigandRecord; name: string }) => {
    const { molecule, ligand, name } = props;
    const dispatch = useDispatch();
    const [busy, setBusy] = useState<boolean>(false);

    const deleteLigand = async () => {
        setBusy(true);
        try {
            if (ligand) {
                dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS, [TAG_MOLECULE]: molecule.uniqueId, ligand: ligand.cid }));
                const result = await molecule.deleteCid(ligand.cid);
                if (result.second < 1) {
                    dispatch(removeMolecule(molecule));
                    await molecule.delete();
                } else {
                    dispatch(triggerUpdate(molecule.molNo));
                }
            } else {
                dispatch(removeMolecule(molecule));
                await molecule.delete();
            }
            document.body.click();
        } catch (err) {
            console.error(err);
            dispatch(enqueueSnackbar({ message: `Failed to delete ${name}`, variant: "error" }));
        } finally {
            setBusy(false);
        }
    };

    return (
        <MoorhenStack direction="row" gap="0.5rem" align="center">
            <span>{ligand ? `Delete ${name} from ${molecule.name}?` : `Delete ${name}?`}</span>
            <MoorhenButton variant="danger" onClick={deleteLigand} disabled={busy}>
                Delete
            </MoorhenButton>
        </MoorhenStack>
    );
};

/** The 2D drawing of the molecule's ligands. Asked of Coot when shown (the popover mounts it on opening), then cached. */
const LigandDrawing = (props: { molecule: MoorhenMolecule; resName?: string }) => {
    const { molecule, resName } = props;
    const [svgs, setSvgs] = useState<string[] | null>(null);
    // A ligand-only molecule's metadata, every entry (a docking score, or whatever a host attached),
    // read as the drawing opens. A ligand inside a model has none of its own (its model's is not its).
    const entries = resName ? [] : Object.entries(molecule.metadata ?? {});
    const metadataList =
        entries.length > 0 ? (
            <dl className="moorhen__ligand-list-metadata">
                {entries.map(([key, value]) => (
                    <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        ) : null;

    useEffect(() => {
        let cancelled = false;
        const resNames = resName ? [resName] : [...new Set((molecule.ligands ?? []).map(ligand => ligand.resName))];
        Promise.all(resNames.map(resName => molecule.getLigandSVG(resName, true))).then(result => {
            if (!cancelled) setSvgs(result);
        });
        return () => {
            cancelled = true;
        };
    }, [molecule, resName]);

    // Same box while loading, so the popover opens at its final size and is placed once
    if (svgs === null) {
        return (
            <div className="moorhen__ligand-list-drawing">
                <MoorhenLinearProgress />
            </div>
        );
    }
    if (svgs.length === 0) {
        return (
            <>
                <span>No ligand found in {molecule.name}</span>
                {metadataList}
            </>
        );
    }
    return (
        <>
            <div className="moorhen__ligand-list-drawing">
                {svgs.map((svg, i) => (
                    <div key={i}>{parse(svg)}</div>
                ))}
            </div>
            {metadataList}
        </>
    );
};
