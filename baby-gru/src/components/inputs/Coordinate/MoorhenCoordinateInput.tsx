import type { ReactNode } from "react";
import { MoorhenStack } from "../../interface-base/Stack/Stack";
import { MoorhenNumberInput } from "../MoorhenNumberInput/NumberInput";

type MoorhenCoordinateInputProps = {
    /** Shown above the numbers, e.g. "Position" or "End". */
    title?: string;
    /** The numbers, one box each. Usually x, y, z; a 2D position or a size has two. */
    value: number[];
    /** Called with the whole array whenever one box changes to a valid number. */
    onChange: (value: number[]) => void;
    /** One per box, shown as "x:" and so on. Defaults to x, y, z. */
    labels?: string[];
    decimalDigits?: number;
    allowNegativeValues?: boolean;
    disabled?: boolean;
    /** Anything to go under the numbers, such as a "Current origin" button. */
    children?: ReactNode;
};

const DEFAULT_LABELS = ["x", "y", "z"];

/**
 * A point (or size) as separate number boxes in an outlined section, as the vectors panel lays
 * out its ends.
 *
 * Spans the whole row when placed in an inputGrid, so a panel can mix these with label/input
 * pairs without the grid's columns going out of step.
 */
export const MoorhenCoordinateInput = (props: MoorhenCoordinateInputProps) => {
    const { value, onChange, labels = DEFAULT_LABELS, decimalDigits = 2, allowNegativeValues = true, disabled = false } = props;
    return (
        <MoorhenStack card gap="0.5rem" style={{ gridColumn: "1 / -1" }}>
            {props.title && <div>{props.title}</div>}
            <MoorhenStack inputGrid gridWidth={Math.min(4, Math.max(1, value.length)) as 1 | 2 | 3 | 4}>
                {value.map((component, i) => (
                    <MoorhenNumberInput
                        key={i}
                        value={component}
                        type="number"
                        label={`${labels[i] ?? i}:`}
                        decimalDigits={decimalDigits}
                        allowNegativeValues={allowNegativeValues}
                        disabled={disabled}
                        setValue={val => {
                            const next = [...value];
                            next[i] = Number(val);
                            onChange(next);
                        }}
                    />
                ))}
            </MoorhenStack>
            {props.children}
        </MoorhenStack>
    );
};
