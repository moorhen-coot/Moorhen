import parse from "html-react-parser";
import { batch, useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { MoorhenLinearProgress } from "@/components/icons/MoorhenLinearProgress";
import { MoorhenButton, MoorhenColourPicker, MoorhenMoleculeSelect, MoorhenToggle } from "@/components/inputs";
import { MoorhenAccordion, MoorhenStack } from "@/components/interface-base";
import { type RootState, setHoveredAtom } from "@/store";
import { type MoorhenVector, addVectors, removeVectorsByTag } from "@/store/vectorsSlice";
import type { LigandInfo, MoorhenMolecule } from "@/utils/MoorhenMolecule";
import {
    type ContactSide,
    type ContactType,
    type LigandContact,
    type LigandContactsResult,
    getLigandContacts,
} from "@/utils/ligandContacts";
import { SOURCE_LIGAND_CONTACTS, TAG_MOLECULE, TAG_PARTNER, TAG_SOURCE, type Tags, matchesTags } from "@/utils/tags";
import { newVector } from "@/utils/vectorFactories";

type ContactsState = (LigandContactsResult & { error?: undefined }) | { error: string; contacts?: undefined; flev?: undefined };

type Colour = MoorhenVector["vectorColour"];

const CONTACT_TYPES: Record<ContactType, { label: string; plural: string; defaultColour: Colour }> = {
    hbond: { label: "H-bond", plural: "H-bonds", defaultColour: { r: 60, g: 140, b: 255 } },
    "salt-bridge": { label: "Salt bridge", plural: "Salt bridges", defaultColour: { r: 255, g: 150, b: 0 } },
    "xh-pi": { label: "XH-π", plural: "XH-π", defaultColour: { r: 230, g: 40, b: 40 } },
};
const TYPES = Object.keys(CONTACT_TYPES) as ContactType[];

/** How each type of contact is drawn: whether at all, and in which colour. */
type DrawStyles = Record<ContactType, { draw: boolean; colour: Colour }>;
const DEFAULT_STYLES = Object.fromEntries(
    TYPES.map(type => [type, { draw: true, colour: CONTACT_TYPES[type].defaultColour }])
) as DrawStyles;

const rgb = (colour: Colour) => `rgb(${colour.r}, ${colour.g}, ${colour.b})`;

const sideLabel = (side: ContactSide) =>
    `${side.resName} ${side.chainId}/${side.resNo}${side.insCode}${side.atomName ? ` ${side.atomName}` : " ring"}`;

/**
 * The cid hovering uses: model and residue name included (/1/A/45(LYS)/NZ), as the hover info box
 * reads them from it. A ring is hovered as its residue.
 */
const hoverCid = (side: ContactSide) =>
    `/1/${side.chainId}/${side.resNo}${side.insCode ? `.${side.insCode}` : ""}(${side.resName})/${side.atomName ?? "*"}`;

/**
 * A contact as a dashed vector labelled with its length. XH-π: an arrow from the X atom to the ring
 * centre, whichever side the donor is on.
 */
const contactVector = (contact: LigandContact, colour: Colour, tags: Tags): MoorhenVector => {
    const fromPartner = contact.type === "xh-pi" && contact.ligandRole === "ring";
    const [xFrom, yFrom, zFrom] = fromPartner ? contact.partner.xyz : contact.ligand.xyz;
    const [xTo, yTo, zTo] = fromPartner ? contact.ligand.xyz : contact.partner.xyz;
    return newVector({
        coordsMode: "points",
        drawMode: "dashedcylinder",
        labelMode: "middle",
        labelText: `${contact.distance.toFixed(2)} Å`,
        xFrom,
        yFrom,
        zFrom,
        xTo,
        yTo,
        zTo,
        vectorColour: colour,
        radius: 0.05,
        dashSpacing: 0.22,
        labelFontSize: 20,
        ...(contact.type === "xh-pi" ? { arrowMode: "end", arrowHeadLength: 0.42, arrowHeadRadiusScale: 2.2 } : {}),
        tags,
    });
};

/**
 * The tags of one ligand's contact vectors: a model has several ligands, each with its own. Each
 * vector also carries its contact type and the partner molecule (TAG_CONTACT, TAG_PARTNER), from
 * which the section's settings are read back when it is opened again.
 */
const ligandContactTags = (molecule: MoorhenMolecule, ligand?: LigandInfo): Tags => ({
    [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS,
    [TAG_MOLECULE]: molecule.uniqueId,
    ligand: ligand?.cid ?? "",
});
const TAG_CONTACT = "contact";

/**
 * What the drawn vectors of a ligand say about how its contacts were shown: the partner molecule,
 * and for each type whether it is drawn and in which colour. A type with no vector while others have
 * some was switched off. Null if nothing is drawn.
 */
const readBackDrawn = (vectors: MoorhenVector[], tags: Tags): { partnerUid: string | undefined; styles: DrawStyles } | null => {
    const drawn = vectors.filter(vector => matchesTags(vector, tags));
    if (drawn.length === 0) return null;
    const styles = Object.fromEntries(
        TYPES.map(type => {
            const vector = drawn.find(item => item.tags?.[TAG_CONTACT] === type);
            return [type, vector ? { draw: true, colour: vector.vectorColour } : { draw: false, colour: CONTACT_TYPES[type].defaultColour }];
        })
    ) as DrawStyles;
    return { partnerUid: drawn[0].tags?.[TAG_PARTNER], styles };
};

/**
 * The Contacts section of a ligand card. Its vectors outlive it: they stay drawn when the card or
 * the panel is closed (it unmounts), and go when the section itself is closed by the user. Opened
 * again (the panel reopened), it starts open if they are still drawn.
 */
export const LigandContactsSection = (props: { molecule: MoorhenMolecule; ligand?: LigandInfo }) => {
    const { molecule, ligand } = props;
    const dispatch = useDispatch();
    const tags = ligandContactTags(molecule, ligand);
    // Only its first value matters: the section opens or closes on its own afterwards
    const drawn = useSelector((state: RootState) => state.vectors.vectorsList.some(vector => matchesTags(vector, tags)));
    return (
        <MoorhenAccordion title="Contacts" defaultOpen={drawn} onClose={() => dispatch(removeVectorsByTag(tags))}>
            <LigandContacts molecule={molecule} ligand={ligand} />
        </MoorhenAccordion>
    );
};

/**
 * The contacts of a ligand-only molecule with one other molecule (its protein, typically): H-bonds,
 * salt bridges and XH-π, drawn as dashed vectors (each type switched and coloured on its own),
 * listed, and the FLEV diagram. Mounted only while its accordion is open: Coot is asked when it opens
 * or the other molecule changes. The vectors are left drawn when it unmounts (see
 * LigandContactsSection).
 */
export const LigandContacts = (props: { molecule: MoorhenMolecule; ligand?: LigandInfo }) => {
    const { molecule, ligand } = props;
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    // A ligand inside a model: that model first (the rest of it), then the others
    const records = useSelector((state: RootState) => state.molecules.moleculeRecords);
    const others = moleculeList.filter(other => other !== molecule && !records[other.uniqueId]?.isLigandOnly);
    const partners = ligand ? [molecule, ...others] : others;

    const tags = useMemo(() => ligandContactTags(molecule, ligand), [molecule, ligand]);
    // As they were shown, if their vectors are still drawn (the section closed with the panel)
    const [drawnBefore] = useState(() => readBackDrawn(store.getState().vectors.vectorsList, tags));

    const [partnerUid, setPartnerUid] = useState<string | undefined>(() =>
        partners.some(other => other.uniqueId === drawnBefore?.partnerUid) ? drawnBefore.partnerUid : undefined
    );
    // A partner since deleted counts as none chosen, so that the selector picks one again (it only
    // does when given none); else this would wait for its contacts forever
    const partner = partners.find(other => other.uniqueId === partnerUid) ?? null;
    const selectedUid = partner ? partnerUid : undefined;
    const [result, setResult] = useState<{ partnerUid: string; contacts: ContactsState; computation: number } | null>(null);
    // Contacts are not recomputed when either molecule's coordinates change (refined, moved...): asked
    // for with the recompute button, each press a new computation
    const [computation, setComputation] = useState(0);
    const current = result && partner && result.partnerUid === partner.uniqueId ? result.contacts : null;
    const recomputing = result !== null && result.computation !== computation;
    const [styles, setStyles] = useState<DrawStyles>(drawnBefore?.styles ?? DEFAULT_STYLES);
    const setStyle = (type: ContactType, change: Partial<DrawStyles[ContactType]>) =>
        setStyles(previous => ({ ...previous, [type]: { ...previous[type], ...change } }));

    useEffect(() => {
        if (!partner) return;
        let cancelled = false;
        getLigandContacts(molecule, partner, { xhpi: true, flev: true }, ligand)
            .catch((err: unknown): ContactsState => ({ error: err instanceof Error ? err.message : String(err) }))
            .then(contacts => {
                if (!cancelled) setResult({ partnerUid: partner.uniqueId, contacts, computation });
            });
        return () => {
            cancelled = true;
        };
    }, [molecule, partner, ligand, computation]);

    // Redrawn whole, replacing what this ligand has drawn (also what was left drawn when it last
    // unmounted), when the contacts arrive or a type is switched or recoloured: tens of contacts, not
    // thousands. While they are being computed, what is drawn stays.
    // Drawn only while both molecules are shown: hiding one removes the vectors (a store sync), and
    // showing it again while this is open draws them again
    const bothVisible = useSelector(
        (state: RootState) =>
            !!partner && state.molecules.visibleMolecules.includes(molecule.molNo) && state.molecules.visibleMolecules.includes(partner.molNo)
    );
    useEffect(() => {
        if (current === null || !partner || !bothVisible) return;
        const shown = (current.contacts ?? []).filter(contact => styles[contact.type].draw);
        batch(() => {
            dispatch(removeVectorsByTag(tags));
            if (shown.length > 0) {
                const vectors = shown.map(contact =>
                    contactVector(contact, styles[contact.type].colour, {
                        ...tags,
                        [TAG_CONTACT]: contact.type,
                        [TAG_PARTNER]: partner.uniqueId,
                    })
                );
                dispatch(addVectors(vectors));
            }
        });
    }, [current, styles, tags, partner, bothVisible, dispatch]);

    // Hovering a contact hovers the partner's atom (or residue, for a ring)
    const hoverPartner = (contact: LigandContact | null) => {
        if (contact && partner) {
            store.dispatch(setHoveredAtom({ molecule: partner, cid: hoverCid(contact.partner), atomInfo: null }));
        } else if (store.getState().hoveringStates.hoveredAtom.molecule === partner) {
            store.dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        }
    };

    if (partners.length === 0) {
        return <span className="moorhen__ligand-contacts-note">Load a model to see the contacts of this ligand with it</span>;
    }

    const contacts = current?.contacts ?? [];
    const count = (type: ContactType) => contacts.filter(contact => contact.type === type).length;

    return (
        <MoorhenStack gap="0.25rem">
            <MoorhenStack direction="row" gap="0.5rem" align="center" style={{ flexWrap: "wrap" }}>
                <MoorhenMoleculeSelect
                    useUniqueId={true}
                    molecules={partners}
                    selectedMolecule={selectedUid}
                    setSelectedMolecule={setPartnerUid}
                    label="With"
                />
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymReplay"
                    tooltip="Recompute the contacts (after either molecule has moved or been changed)"
                    disabled={current === null || recomputing}
                    onClick={() => setComputation(previous => previous + 1)}
                />
            </MoorhenStack>
            {current === null || recomputing ? (
                <MoorhenLinearProgress />
            ) : current.error ? (
                <span className="moorhen__ligand-contacts-note">{current.error}</span>
            ) : (
                <>
                    <MoorhenStack direction="column" align="flex-start">
                        {TYPES.map(type => (
                            <MoorhenStack key={type} direction="row" gap="0.25rem" align="center">
                                <MoorhenColourPicker
                                    colour={[styles[type].colour.r, styles[type].colour.g, styles[type].colour.b]}
                                    setColour={colour => setStyle(type, { colour: { r: colour[0], g: colour[1], b: colour[2] } })}
                                    tooltip={`Colour of the ${CONTACT_TYPES[type].plural}`}
                                    position="left"
                                />
                                <MoorhenToggle
                                    label={`${CONTACT_TYPES[type].plural} (${count(type)})`}
                                    checked={styles[type].draw}
                                    disabled={count(type) === 0}
                                    tooltip={`Draw the ${CONTACT_TYPES[type].plural}`}
                                    onChange={() => setStyle(type, { draw: !styles[type].draw })}
                                />
                            </MoorhenStack>
                        ))}
                    </MoorhenStack>
                    {contacts.length === 0 && <span className="moorhen__ligand-contacts-note">No contacts</span>}
                    {contacts.length > 0 && (
                        <div className="moorhen__ligand-contacts-list" onMouseLeave={() => hoverPartner(null)}>
                            {contacts.map((contact, i) => (
                                <div key={i} className="moorhen__ligand-contacts-row" onMouseEnter={() => hoverPartner(contact)}>
                                    <span
                                        className="moorhen__ligand-contacts-swatch"
                                        style={{ background: rgb(styles[contact.type].colour) }}
                                    />
                                    <span>{CONTACT_TYPES[contact.type].label}</span>
                                    <span>{contact.ligand.atomName ?? "ring"}</span>
                                    <span>{sideLabel(contact.partner)}</span>
                                    <span>{contact.distance.toFixed(2)} Å</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {current.flev ? (
                        <div className="moorhen__ligand-contacts-flev">{parse(current.flev)}</div>
                    ) : (
                        <span className="moorhen__ligand-contacts-note">No environment diagram (FLEV) for this ligand</span>
                    )}
                </>
            )}
        </MoorhenStack>
    );
};
