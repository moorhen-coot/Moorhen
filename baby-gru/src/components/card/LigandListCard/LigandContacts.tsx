import parse from "html-react-parser";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenLinearProgress } from "@/components/icons/MoorhenLinearProgress";
import { MoorhenColourPicker, MoorhenMoleculeSelect, MoorhenToggle } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { type RootState, setHoveredAtom } from "@/store";
import { type MoorhenVector, addVectors, removeVectorsByTag } from "@/store/vectorsSlice";
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { type ContactSide, type ContactType, type LigandContact, type LigandContactsResult, getLigandContacts } from "@/utils/ligandContacts";
import { SOURCE_LIGAND_CONTACTS, TAG_MOLECULE, TAG_SOURCE } from "@/utils/tags";
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
const contactVector = (contact: LigandContact, colour: Colour, ligand: MoorhenMolecule): MoorhenVector => {
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
        tags: { [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS, [TAG_MOLECULE]: ligand.uniqueId },
    });
};

/**
 * The contacts of a ligand-only molecule with one other molecule (its protein, typically): H-bonds,
 * salt bridges and XH-π, drawn as dashed vectors (each type switched and coloured on its own),
 * listed, and the FLEV diagram. Mounted only while
 * its accordion is open: Coot is asked when it opens or the other molecule changes, and the vectors
 * are removed when it closes.
 */
export const LigandContacts = (props: { molecule: MoorhenMolecule }) => {
    const { molecule } = props;
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const partners = moleculeList.filter(other => other !== molecule && !other.isLigandOnly());

    const [partnerUid, setPartnerUid] = useState<string | undefined>(undefined);
    const partner = partners.find(other => other.uniqueId === partnerUid) ?? null;
    const [result, setResult] = useState<{ partnerUid: string; contacts: ContactsState } | null>(null);
    const current = result && partner && result.partnerUid === partner.uniqueId ? result.contacts : null;
    const [styles, setStyles] = useState<DrawStyles>(DEFAULT_STYLES);
    const setStyle = (type: ContactType, change: Partial<DrawStyles[ContactType]>) =>
        setStyles(previous => ({ ...previous, [type]: { ...previous[type], ...change } }));

    useEffect(() => {
        if (!partner) return;
        let cancelled = false;
        getLigandContacts(molecule, partner, { xhpi: true, flev: true })
            .catch((err: unknown): ContactsState => ({ error: err instanceof Error ? err.message : String(err) }))
            .then(contacts => {
                if (!cancelled) setResult({ partnerUid: partner.uniqueId, contacts });
            });
        return () => {
            cancelled = true;
        };
    }, [molecule, partner]);

    // Redrawn whole when a type is switched or recoloured: there are tens of contacts, not thousands
    useEffect(() => {
        const shown = (current?.contacts ?? []).filter(contact => styles[contact.type].draw);
        if (shown.length === 0) return;
        dispatch(addVectors(shown.map(contact => contactVector(contact, styles[contact.type].colour, molecule))));
        return () => {
            dispatch(removeVectorsByTag({ [TAG_SOURCE]: SOURCE_LIGAND_CONTACTS, [TAG_MOLECULE]: molecule.uniqueId }));
        };
    }, [current, styles, molecule, dispatch]);

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
                    selectedMolecule={partnerUid}
                    setSelectedMolecule={setPartnerUid}
                    label="With"
                />
            </MoorhenStack>
            {current === null ? (
                <MoorhenLinearProgress />
            ) : current.error ? (
                <span className="moorhen__ligand-contacts-note">{current.error}</span>
            ) : (
                <>
                    <MoorhenStack direction="row" gap="0.75rem" align="center" style={{ flexWrap: "wrap" }}>
                        {TYPES.map(type => (
                            <MoorhenStack key={type} direction="row" gap="0.25rem" align="center">
                                <MoorhenToggle
                                    label={`${CONTACT_TYPES[type].plural} (${count(type)})`}
                                    checked={styles[type].draw}
                                    disabled={count(type) === 0}
                                    tooltip={`Draw the ${CONTACT_TYPES[type].plural}`}
                                    onChange={() => setStyle(type, { draw: !styles[type].draw })}
                                />
                                <MoorhenColourPicker
                                    colour={[styles[type].colour.r, styles[type].colour.g, styles[type].colour.b]}
                                    setColour={colour => setStyle(type, { colour: { r: colour[0], g: colour[1], b: colour[2] } })}
                                    tooltip={`Colour of the ${CONTACT_TYPES[type].plural}`}
                                    position="left"
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
