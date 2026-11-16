import parse from "html-react-parser";
import { batch, shallowEqual, useDispatch, useSelector, useStore } from "react-redux";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { MoorhenIcon } from "@/components/icons";
import { MoorhenLinearProgress } from "@/components/icons/MoorhenLinearProgress";
import { MoorhenButton, MoorhenColourPicker, MoorhenMoleculeSelect, MoorhenPopoverButton, MoorhenToggle } from "@/components/inputs";
import type { RGBAColour } from "@/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { MoorhenAccordion, MoorhenStack, MoorhenTooltip } from "@/components/interface-base";
import { type RootState, addCustomRepresentation, enqueueSnackbar, removeCustomRepresentation, removeMolecule, setHoveredAtom } from "@/store";
import { triggerUpdate } from "@/store/moleculeMapUpdateSlice";
import type { MoleculeLigandRecord } from "@/store/moleculesSlice";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { MoleculeRepresentation, type RepresentationStyles } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { type LigandSite, centreOnSite, groupLigandsBySite } from "@/utils/ligandSites";
import { setMoleculeVisible } from "@/utils/moleculeVisibility";
import { hexToRGB, rgbToHex } from "@/utils/utils";
import { LigandContactsSection } from "./LigandContacts";
import { selectCustomRepresentations } from "../MoleculeCard/moleculeCardSelectors";
import "./ligand-list-card.css";

const HOVERED_ROW_CLASS = "moorhen__ligand-list-row-hovered";

/** The key a row registers under: its molecule, plus the residue for a ligand inside a model. */
const rowKey = (molecule: MoorhenMolecule, ligand?: MoleculeLigandRecord) =>
    ligand ? `${molecule.uniqueId}|${ligand.chainName}|${ligand.resNum}` : molecule.uniqueId;

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
            const residueKey = molecule ? `${molecule.uniqueId}|${parts[2]}|${parts[3]?.split("(")[0]}` : null;
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
 * The ligands of the Models panel, each with its ligand card (2D view, centre-on, representation,
 * contacts...):
 * - the ligands inside models, one group per model, open by default;
 * - the ligand-only molecules (MoorhenMolecule.isLigandOnly), listed by name instead of a full
 *   molecule card each (which does not scale to the hundreds or thousands of ligands
 *   files.batchLoadLigands can load). Optionally grouped by position: one sub-card per site, i.e.
 *   per set of overlapping ligands.
 */
export const LigandListCard = (props: { molecules: MoorhenMolecule[] }) => {
    const store = useStore<RootState>();
    // What the list groups and labels by, from the molecule records (refreshed by the molecules)
    const records = useSelector((state: RootState) => state.molecules.moleculeRecords);
    const ligandsOf = (molecule: MoorhenMolecule) => records[molecule.uniqueId]?.ligands ?? [];
    const molecules = props.molecules.filter(molecule => records[molecule.uniqueId]?.isLigandOnly);
    const hosts = props.molecules.filter(molecule => !records[molecule.uniqueId]?.isLigandOnly && ligandsOf(molecule).length > 0);
    const hostedCount = hosts.reduce((n, host) => n + ligandsOf(host).length, 0);
    /** The ligand residue types of the row that have no dictionary */
    const noDictionary = (molecule: MoorhenMolecule, ligand?: MoleculeLigandRecord): string[] => {
        const missing = records[molecule.uniqueId]?.missingDictionaries ?? [];
        if (missing.length === 0) return [];
        const resNames = ligand ? [ligand.resName] : [...new Set(ligandsOf(molecule).map(info => info.resName))];
        return resNames.filter(resName => missing.includes(resName));
    };
    const registerRow = useHoveredRowHighlight(store);
    const visibleMolecules = useSelector((state: RootState) => state.molecules.visibleMolecules);
    const visible = new Set(visibleMolecules);
    const anyVisible = (list: MoorhenMolecule[]) => list.some(molecule => visible.has(molecule.molNo));

    // A–Z by default; load order kept as the other choice, since it may carry the caller's ranking
    const [order, setOrder] = useState<"name" | "load">("name");
    const sorted = (list: MoorhenMolecule[]) => (order === "load" ? list : [...list].sort((a, b) => byName.compare(a.name, b.name)));

    // Grouping by position: computed when switched on, again only if the ligands change
    const [grouped, setGrouped] = useState<boolean>(false);
    const [computed, setComputed] = useState<{ membership: string; sites: LigandSite[] } | null>(null);
    const membership = molecules.map(molecule => molecule.molNo).join(",");
    const sites = computed?.membership === membership ? computed.sites : null;
    useEffect(() => {
        if (!grouped || sites) return;
        let cancelled = false;
        groupLigandsBySite(molecules).then(result => {
            if (!cancelled) setComputed({ membership, sites: result });
        });
        return () => {
            cancelled = true;
        };
        // Keyed on which ligands are listed, not on the molecules array, which is new on every render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grouped, membership]);

    const setAllVisible = (list: MoorhenMolecule[], show: boolean) => {
        batch(() => list.forEach(molecule => setMoleculeVisible(molecule, show)));
    };
    const visibilityButton = (list: MoorhenMolecule[], what: string) => (
        <MoorhenButton
            key="visibility"
            size="accordion"
            type="icon-only"
            icon={anyVisible(list) ? "MatSymVisibility" : "MatSymVisibilityOff"}
            tooltip={anyVisible(list) ? `Hide ${what}` : `Show ${what}`}
            onClick={() => setAllVisible(list, !anyVisible(list))}
        />
    );
    const rows = (list: MoorhenMolecule[]) => (
        <div className="moorhen__ligand-list-list">
            {sorted(list).map(molecule => (
                <LigandListRow
                    key={molecule.uniqueId}
                    molecule={molecule}
                    noDictionary={noDictionary(molecule).join(", ")}
                    isVisible={visible.has(molecule.molNo)}
                    registerRow={registerRow}
                />
            ))}
        </div>
    );

    const hostGroups = hosts.map(host => (
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
            <div className="moorhen__ligand-list-list">
                {ligandsOf(host).map(ligand => (
                    <LigandListRow
                        key={ligand.cid}
                        molecule={host}
                        ligand={ligand}
                        noDictionary={noDictionary(host, ligand).join(", ")}
                        isVisible={visible.has(host.molNo)}
                        registerRow={registerRow}
                    />
                ))}
            </div>
        </MoorhenAccordion>
    ));

    let content: React.ReactNode;
    if (molecules.length === 0) {
        content = null;
    } else if (!grouped) {
        content = rows(molecules);
    } else if (sites === null) {
        content = <MoorhenLinearProgress />;
    } else {
        content = sites.map((site, i) => (
            <MoorhenAccordion
                key={site.molecules[0].uniqueId}
                title={`Site ${i + 1} (${site.molecules.length})`}
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
                    visibilityButton(site.molecules, "site"),
                ]}
            >
                {rows(site.molecules)}
            </MoorhenAccordion>
        ));
    }

    return (
        <MoorhenAccordion
            title={
                grouped && sites
                    ? `Ligands (${molecules.length + hostedCount}, ${sites.length} sites)`
                    : `Ligands (${molecules.length + hostedCount})`
            }
            type="card"
            defaultOpen={true}
            extraControls={[
                <MoorhenButton
                    key="group"
                    size="accordion"
                    type="icon-only"
                    icon="MatSymGrain"
                    tooltip={grouped ? "Grouped by position: click to list all" : "Group by position"}
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
                visibilityButton(molecules, "ligand-only molecules"),
            ]}
        >
            {hostGroups}
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
                            key="visibility"
                            size="accordion"
                            type="icon-only"
                            icon={isVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
                            tooltip="Toggle visibility"
                            onClick={() => setMoleculeVisible(molecule, !isVisible)}
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
    const representations = useSelector((state: RootState) => selectCustomRepresentations(state, molecule.molNo), shallowEqual);
    const isLigandStyle = (representation: MoleculeRepresentation) => LIGAND_STYLES.some(item => item.style === representation.style);
    // Plus the default bonds that some ways of loading a ligand draw (fetchIfDirtyAndDraw: dictionaries,
    // Get Monomer...), which are not custom representations and so not in the store, but are shown
    // (A ligand cid names its residue type, /1/A/301(ATP), so no other residue's cid starts with it)
    const ligandRepresentations = cid
        ? representations.filter(representation => isLigandStyle(representation) && representation.cid?.startsWith(cid))
        : [
              ...representations.filter(isLigandStyle),
              ...molecule.representations.filter(
                  representation => !representation.isCustom && representation.visible && isLigandStyle(representation)
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
            await molecule.delete();
            dispatch(removeMolecule(molecule));
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

/** The 2D drawing of the molecule's ligands. Asked of Coot when shown (the popover mounts it on opening), then cached. */
const LigandDrawing = (props: { molecule: MoorhenMolecule; resName?: string }) => {
    const { molecule, resName } = props;
    const [svgs, setSvgs] = useState<string[] | null>(null);

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
        return <span>No ligand found in {molecule.name}</span>;
    }
    return (
        <div className="moorhen__ligand-list-drawing">
            {svgs.map((svg, i) => (
                <div key={i}>{parse(svg)}</div>
            ))}
        </div>
    );
};
