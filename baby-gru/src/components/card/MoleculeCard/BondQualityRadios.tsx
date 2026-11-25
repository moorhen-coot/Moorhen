import { MoorhenToggle } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";

/** Bond smoothness (Coot's tessellation of bonds and atom balls), as the default-smoothness preference names it */
const BOND_QUALITIES: { smoothness: number; label: string }[] = [
    { smoothness: 1, label: "Coarse" },
    { smoothness: 2, label: "Nice" },
    { smoothness: 3, label: "Smooth" },
];

/**
 * The draw quality of bonds, as three radio buttons rather than a slider: three settings, each
 * with a name.
 * @param name - The radio group's name: unique on the page (several cards may be open at once)
 */
export const BondQualityRadios = (props: { value: number; onChange: (smoothness: number) => void; name: string; disabled?: boolean }) => {
    const { value, onChange, name, disabled } = props;
    return (
        <MoorhenStack direction="row" gap="1rem" align="center" style={{ flexWrap: "wrap" }}>
            <span>Draw quality</span>
            {BOND_QUALITIES.map(({ smoothness, label }) => (
                <MoorhenToggle
                    key={smoothness}
                    type="radio"
                    name={name}
                    label={label}
                    checked={value === smoothness}
                    disabled={disabled}
                    onChange={() => {
                        if (value !== smoothness) onChange(smoothness);
                    }}
                />
            ))}
        </MoorhenStack>
    );
};
