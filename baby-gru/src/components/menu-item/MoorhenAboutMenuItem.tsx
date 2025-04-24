import { useEffect, useState } from 'react';
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { version } from '../../version'
import { moorhen } from "../../types/moorhen";

export const MoorhenAboutMenuItem = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>, commandCentre:React.RefObject<moorhen.CommandCentre> }) => {

    const [is64Bit, setIs64Bit] = useState<boolean>(false)
    useEffect(() => {
        const getIs64bit = async () => {
            const is64bit = await props.commandCentre.current.cootCommand({
                    returnType: "boolean",
                    command: "is64bit",
                    commandArgs: []
                }, false) as moorhen.WorkerResponse<boolean>
            setIs64Bit(is64bit.data.result.result)
        }
        getIs64bit()
    }, [])

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
        <p>This is Moorhen v{version} ({is64Bit ? "64" : "32"}-bit)</p>
        <p><a href={`https://github.com/moorhen-coot/Moorhen`}>Source code</a></p>
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
