import "./moorhen-toggle.css";

type MoorhenToggleProps = {
    checked: boolean;
    onChange: () => void;
    label: string;
    className?: string;
    id?: string;
    style?: React.CSSProperties;
    type?: "switch" | "radio";
};

export const MoorhenToggle = (props: MoorhenToggleProps) => {
    return (
        <div className={`moorhen__toggle-container ${props.className ? props.className : ""}`} style={{ ...props.style }}>
            <label className="moorhen__toggle-switch">
                <input id={props.id} className="moorhen__toggle-input" type="checkbox" checked={props.checked} onChange={props.onChange} />
                <span className="moorhen__toggle-slider"></span>
            </label>
            <span className="moorhen__toggle-label-text">{props.label}</span>
        </div>
    );
};
