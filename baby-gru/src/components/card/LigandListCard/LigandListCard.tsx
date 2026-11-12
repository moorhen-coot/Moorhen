import parse from "html-react-parser";
import { memo, useEffect, useState } from "react";
import { batch, useSelector, useStore } from "react-redux";
import { MoorhenButton, MoorhenPopoverButton } from "@/components/inputs";
import { MoorhenLinearProgress } from "@/components/icons/MoorhenLinearProgress";
import { MoorhenAccordion } from "@/components/interface-base";
import type { RootState } from "@/store";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { setMoleculeVisible } from "@/utils/moleculeVisibility";
import { centreOnSite, groupLigandsBySite, type LigandSite } from "@/utils/ligandSites";
import "./ligand-list-card.css";

// Natural order ("pose_2" before "pose_10"), ignoring case
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * The molecules loaded by `files.batchLoadLigands`, in the Models panel: a list of names with a
 * 2D view, centre-on and show/hide button each, instead of a full molecule card each (which does not
 * scale to the hundreds or thousands of ligands loaded that way). Optionally grouped by position:
 * one sub-card per site, i.e. per set of overlapping ligands.
 */
export const LigandListCard = (props: { molecules: MoorhenMolecule[] }) => {
    const { molecules } = props;
    const store = useStore<RootState>();
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
                <LigandListRow key={molecule.uniqueId} molecule={molecule} isVisible={visible.has(molecule.molNo)} />
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

const LigandListRow = memo(function LigandListRow(props: { molecule: MoorhenMolecule; isVisible: boolean }) {
    const { molecule, isVisible } = props;
    return (
        <div className="moorhen__ligand-list-row">
            <span className="moorhen__ligand-list-row-name" title={molecule.name}>
                {molecule.name}
            </span>
            <MoorhenPopoverButton size="accordion" icon="ligand" tooltip="2D view" popoverPlacement="left">
                <LigandDrawing molecule={molecule} />
            </MoorhenPopoverButton>
            <MoorhenButton
                size="accordion"
                type="icon-only"
                icon="MatSymFilterFocus"
                tooltip="Centre on ligand"
                onClick={() => molecule.centreOn()}
            />
            <MoorhenButton
                size="accordion"
                type="icon-only"
                icon={isVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
                tooltip="Toggle visibility"
                onClick={() => setMoleculeVisible(molecule, !isVisible)}
            />
        </div>
    );
});

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

    if (svgs === null) {
        return <MoorhenLinearProgress />;
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
