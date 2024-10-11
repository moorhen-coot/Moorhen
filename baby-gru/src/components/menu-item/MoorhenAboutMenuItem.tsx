import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { version } from '../../version'

export const MoorhenAboutMenuItem = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {

    const panelContent = <div style={{ width: "18rem" }}>
        <p>Moorhen is a molecular graphics program based on the Coot desktop program.</p>
        <p>Authors:</p>
        <ul>
            <li>Paul Emsley</li>
            <li>Filomeno Sanchez</li>
            <li>Martin Noble</li>
            <li>Stuart McNicholas</li>
            <li>Lucrezia Catapano</li>
            <li>Jakub Smulski</li>
        </ul>
        <p>This is Moorhen v{version} ({WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1])) ? "64" : "32"}-bit)</p>
    </div>

    return <MoorhenBaseMenuItem
        id='help-about-menu-item'
        popoverContent={panelContent}
        menuItemText="About..."
        onCompleted={() => { }}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}
