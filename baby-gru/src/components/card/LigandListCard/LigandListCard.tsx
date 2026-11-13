import parse from "html-react-parser";
import { batch, shallowEqual, useDispatch, useSelector, useStore } from "react-redux";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { MoorhenLinearProgress } from "@/components/icons/MoorhenLinearProgress";
import { MoorhenButton, MoorhenColourPicker, MoorhenPopoverButton, MoorhenToggle } from "@/components/inputs";
import type { RGBAColour } from "@/components/inputs/MoorhenColourPicker/MoorhenColourPicker";
import { MoorhenAccordion, MoorhenStack } from "@/components/interface-base";
import { type RootState, addCustomRepresentation, removeCustomRepresentation, setHoveredAtom } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { MoleculeRepresentation, type RepresentationStyles } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { type LigandSite, centreOnSite, groupLigandsBySite } from "@/utils/ligandSites";
import { setMoleculeVisible } from "@/utils/moleculeVisibility";
import { hexToRGB, rgbToHex } from "@/utils/utils";
import { selectCustomRepresentations } from "../MoleculeCard/moleculeCardSelectors";
import "./ligand-list-card.css";

const HOVERED_ROW_CLASS = "moorhen__ligand-list-row-hovered";

/**
 * Highlights the row of the molecule under the mouse in the 3D view (hoveringStates.hoveredAtom).
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
            const uid = store.getState().hoveringStates.hoveredAtom.molecule?.uniqueId ?? null;
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
 * The ligand-only molecules (MoorhenMolecule.isLigandOnly) in the Models panel: a list of names with
 * a 2D view, centre-on and show/hide button each, instead of a full molecule card each (which does
 * not scale to the hundreds or thousands of ligands files.batchLoadLigands can load). Optionally
 * grouped by position: one sub-card per site, i.e. per set of overlapping ligands.
 */
export const LigandListCard = (props: { molecules: MoorhenMolecule[] }) => {
    const { molecules } = props;
    const store = useStore<RootState>();
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
                    isVisible={visible.has(molecule.molNo)}
                    registerRow={registerRow}
                />
            ))}
        </div>
    );

    let content: React.ReactNode;
    if (!grouped) {
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
            title={grouped && sites ? `Ligands (${molecules.length}, ${sites.length} sites)` : `Ligands (${molecules.length})`}
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
                visibilityButton(molecules, "all"),
            ]}
        >
            {content}
        </MoorhenAccordion>
    );
};

const LigandListRow = memo(function LigandListRow(props: {
    molecule: MoorhenMolecule;
    isVisible: boolean;
    registerRow: (uid: string, element: HTMLElement | null) => void;
}) {
    const { molecule, isVisible, registerRow } = props;
    const store = useStore<RootState>();
    const rowRef = useCallback((element: HTMLDivElement | null) => registerRow(molecule.uniqueId, element), [molecule, registerRow]);

    // Hovering a row hovers its ligand, as hovering a residue in the sequence viewer does: hover marker
    // in 3D, hover info panel. Leaving clears it, unless something else (the 3D view) has hovered since.
    const onMouseEnter = () => {
        const cid = molecule.ligands?.[0]?.cid;
        if (cid) store.dispatch(setHoveredAtom({ molecule, cid, atomInfo: null }));
    };
    const onMouseLeave = () => {
        if (store.getState().hoveringStates.hoveredAtom.molecule === molecule) {
            store.dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        }
    };

    return (
        <div className="moorhen__ligand-list-row" ref={rowRef} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <MoorhenAccordion
                title={
                    <span className="moorhen__ligand-list-row-name" title={molecule.name}>
                        {molecule.name}
                    </span>
                }
                extraControls={[
                    <MoorhenPopoverButton key="2d" size="accordion" icon="ligand" tooltip="2D view" popoverPlacement="left">
                        <LigandDrawing molecule={molecule} />
                    </MoorhenPopoverButton>,
                    <MoorhenButton
                        key="centre"
                        size="accordion"
                        type="icon-only"
                        icon="MatSymFilterFocus"
                        tooltip="Centre on ligand"
                        onClick={() => molecule.centreOn()}
                    />,
                    <MoorhenButton
                        key="visibility"
                        size="accordion"
                        type="icon-only"
                        icon={isVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
                        tooltip="Toggle visibility"
                        onClick={() => setMoleculeVisible(molecule, !isVisible)}
                    />,
                ]}
            >
                <LigandRepresentations molecule={molecule} />
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
 * These are the molecule's custom representations, the same ones the molecule card's chips edit.
 */
const LigandRepresentations = (props: { molecule: MoorhenMolecule }) => {
    const { molecule } = props;
    const dispatch = useDispatch();
    const representations = useSelector((state: RootState) => selectCustomRepresentations(state, molecule.molNo), shallowEqual);
    const ligandRepresentations = representations.filter(representation => LIGAND_STYLES.some(item => item.style === representation.style));
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
                ruleType: "molecule",
                isCustom: true,
                notH: hideHydrogens,
                ...colourOptions(currentColour),
            });
            if (!representation) return;
            batch(() => {
                dispatch(addCustomRepresentation(representation));
                for (const previous of ligandRepresentations) {
                    molecule.removeRepresentation(previous.uniqueId);
                    dispatch(removeCustomRepresentation(previous));
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
                    name={`ligand-style-${molecule.uniqueId}`}
                    label={label}
                    checked={shownStyle === style}
                    disabled={busy}
                    onChange={() => {
                        if (shownStyle !== style) switchStyle(style);
                    }}
                />
            ))}
            <MoorhenToggle
                label="Hydrogens"
                checked={!hideHydrogens}
                disabled={busy || !hydrogensApply}
                tooltip={hydrogensApply ? undefined : "Surfaces are drawn without hydrogens"}
                onChange={toggleHydrogens}
            />
            <MoorhenColourPicker
                colour={hexToRGB(currentColour ?? defaultCarbonColour(molecule))}
                onApply={applyColour}
                tooltip="Carbon colour of this ligand"
                position="left"
            />
        </MoorhenStack>
    );
};

/** The 2D drawing of the molecule's ligands. Asked of Coot when shown (the popover mounts it on opening), then cached. */
const LigandDrawing = (props: { molecule: MoorhenMolecule }) => {
    const { molecule } = props;
    const [svgs, setSvgs] = useState<string[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const resNames = [...new Set((molecule.ligands ?? []).map(ligand => ligand.resName))];
        Promise.all(resNames.map(resName => molecule.getLigandSVG(resName, true))).then(result => {
            if (!cancelled) setSvgs(result);
        });
        return () => {
            cancelled = true;
        };
    }, [molecule]);

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
