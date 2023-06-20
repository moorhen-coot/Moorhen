import { useCallback, useRef } from "react"
import { Form, Row } from "react-bootstrap"
import { readDataFile } from "../../utils/MoorhenUtils"
import { MoorhenMap, MoorhenMapInterface } from "../../utils/MoorhenMap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { MolChange } from "../MoorhenApp"

export const MoorhenAutoOpenMtzMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    changeMaps: (arg0: MolChange<MoorhenMapInterface>) => void;
    setActiveMap: React.Dispatch<React.SetStateAction<MoorhenMapInterface>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const filesRef = useRef<null | HTMLInputElement>(null)

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMTZ" className="mb-3">
                <Form.Label>Auto open MTZ file</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept=".mtz" />
            </Form.Group>
        </Row>
    </>

    const onCompleted = useCallback(async () => {
        const file = filesRef.current.files[0]

        const reflectionData = await readDataFile(file)
        const mtzData = new Uint8Array(reflectionData)

        const response = await props.commandCentre.current.cootCommand({
            returnType: "int_array",
            command: "shim_auto_open_mtz",
            commandArgs: [mtzData]
        })

        const isDiffMapResponses = await Promise.all(response.data.result.result.map(mapMolNo => {
            return props.commandCentre.current.cootCommand({
                returnType: "status",
                command: "is_a_difference_map",
                commandArgs: [mapMolNo]
            })
        }))

        response.data.result.result.forEach((mapMolNo, index) => {
            const newMap = new MoorhenMap(props.commandCentre)
            newMap.molNo = mapMolNo
            newMap.name = `${file.name.replace('mtz', '')}-map-${index}`
            newMap.isDifference = isDiffMapResponses[index].data.result.result
            props.changeMaps({ action: 'Add', item: newMap })
            if (index === 0) props.setActiveMap(newMap)
        })

    }, [filesRef.current, props.changeMaps, props.commandCentre])

    return <MoorhenBaseMenuItem
        id='auto-open-mtz-menu-item'
        popoverContent={panelContent}
        menuItemText="Auto open MTZ..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

