import { useEffect, useState } from 'react';
import { useCommandCentre } from '../../InstanceManager';
import { version } from '../../version'
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"



export const MoorhenAboutMenuItem = () => {

    const [is64Bit, setIs64Bit] = useState<boolean>(false)
    const commandCentre = useCommandCentre();

    useEffect(() => {
        const getIs64bit = async () => {
            const is64bit = await commandCentre.current.cootCommand({
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
            <li>Paul Bond</li>
            <li>Jordan Dialpuri</li>
            <li>Jakub Smulski</li>
            <li>Clément Dégut</li>
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
    />
}
