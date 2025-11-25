import "./moorhen-toggle.css";

export const MoorhenToggle = (props: { checked: boolean; onChange: () => void; label: string; className?: string }) => {
    return (
        <div className={`moorhen__toggle-container ${props.className ? props.className : ""}`}>
            <label className="moorhen__toggle-switch">
                <input
                    className="moorhen__toggle-input" /* Add the correct class name here */
                    type="checkbox"
                    checked={props.checked}
                    onChange={props.onChange}
                />
                <span className="moorhen__toggle-slider"></span>
            </label>
            <span className="moorhen__toggle-label-text">{props.label}</span>
        </div>
    );
};
