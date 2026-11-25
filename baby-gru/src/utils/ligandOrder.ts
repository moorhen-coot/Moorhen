/**
 * The order of the ligand list (components/card/LigandListCard): by name, as loaded, or by one of the
 * facts the ligand-only molecules carry (MoorhenMolecule.metadata: a docking score, a rank...).
 */

/** What the list needs of a ligand to order it: its molecule and, for a ligand inside a model, which one */
type OrderedEntry = {
    molecule: { name: string; metadata?: Record<string, string> };
    ligand?: { resName: string; chainName: string; resNum: string };
};

export type LigandOrder = {
    /** "name", "load" (the order the list is given in), or a metadata key as metadataOrder(key) */
    by: string;
    descending: boolean;
};

const METADATA_PREFIX = "metadata:";

/** The `by` of an order by a metadata key (a key may be called "name" or "load") */
export const metadataOrder = (key: string): string => `${METADATA_PREFIX}${key}`;

/** The metadata key an order is by, or null for the name and load orders */
export const orderMetadataKey = (order: LigandOrder): string | null =>
    order.by.startsWith(METADATA_PREFIX) ? order.by.slice(METADATA_PREFIX.length) : null;

// Natural order ("pose_2" before "pose_10"), ignoring case
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** The name a ligand is listed and ordered by */
export const ligandEntryName = ({ molecule, ligand }: OrderedEntry): string =>
    ligand ? `${molecule.name} ${ligand.resName} ${ligand.chainName}/${ligand.resNum}` : molecule.name;

/** A ligand's value for a metadata key: a ligand inside a model has none (its model's is not its) */
export const ligandMetadataValue = ({ molecule, ligand }: OrderedEntry, key: string): string | undefined =>
    ligand ? undefined : molecule.metadata?.[key];

/** The metadata keys the ligand-only molecules of the list have, in name order */
export const ligandMetadataKeys = (entries: OrderedEntry[]): string[] => {
    const keys = new Set<string>();
    for (const { molecule, ligand } of entries) {
        if (!ligand) Object.keys(molecule.metadata ?? {}).forEach(key => keys.add(key));
    }
    return [...keys].sort(byName.compare);
};

/** A value as a number if it starts with one ("-7.2", "120 Å³"), else NaN */
const asNumber = (value: string): number => parseFloat(value);

/**
 * Whether a metadata key is ordered as numbers: when every value of it in the list is one. Asked of
 * the whole list, not of each group of it, so that every group is ordered the same way.
 */
export const isNumericMetadata = (entries: OrderedEntry[], key: string): boolean => {
    const values = entries.map(entry => ligandMetadataValue(entry, key)).filter(value => value !== undefined);
    return values.length > 0 && values.every(value => Number.isFinite(asNumber(value)));
};

/**
 * A list of ligands in the given order (a new array; the list itself for the load order). By a
 * metadata key: numbers as numbers if `numeric`, else as text; equal values by name; the ligands
 * without a value last, by name, whichever the direction.
 */
export const sortLigandEntries = <E extends OrderedEntry>(list: E[], order: LigandOrder, numeric: boolean = false): E[] => {
    const direction = order.descending ? -1 : 1;
    const compareNames = (a: E, b: E) => byName.compare(ligandEntryName(a), ligandEntryName(b));
    if (order.by === "load") return order.descending ? [...list].reverse() : list;
    const key = orderMetadataKey(order);
    if (key === null) return [...list].sort((a, b) => direction * compareNames(a, b));

    const withValue = list.filter(entry => ligandMetadataValue(entry, key) !== undefined);
    const without = list.filter(entry => ligandMetadataValue(entry, key) === undefined);
    const compareValues = (a: E, b: E) => {
        const [valueA, valueB] = [ligandMetadataValue(a, key), ligandMetadataValue(b, key)];
        return numeric ? asNumber(valueA) - asNumber(valueB) : byName.compare(valueA, valueB);
    };
    return [...withValue.sort((a, b) => direction * compareValues(a, b) || compareNames(a, b)), ...without.sort(compareNames)];
};
