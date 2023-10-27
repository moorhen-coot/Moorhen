import { useCallback, useRef } from "react"
import { Form, Row } from "react-bootstrap"
import { MoorhenMap } from "../../utils/MoorhenMap"
import { MoorhenMtzWrapper } from "../../utils/MoorhenMtzWrapper"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL"
import { libcootApi } from "../../types/libcoot"
import { useDispatch } from 'react-redux';
import { setActiveMap, setNotificationContent } from "../../store/generalStatesSlice"
import { addMap } from "../../store/mapsSlice"

export const MoorhenAutoOpenMtzMenuItem = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    getWarningToast: (arg0: string) => JSX.Element;
}) => {

    const filesRef = useRef<null | HTMLInputElement>(null)
    const dispatch = useDispatch()

    const panelContent = <>
        <Row>
            <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMTZ" className="mb-3">
                <Form.Label>Auto open MTZ file</Form.Label>
                <Form.Control ref={filesRef} type="file" multiple={false} accept=".mtz" />
            </Form.Group>
        </Row>
    </>

    const onCompleted = useCallback(async () => {
        if (filesRef.current.files.length === 0) {
            return
        }

        const file = filesRef.current.files[0]
        const mtzWrapper = new MoorhenMtzWrapper()
        let allColumnNames = await mtzWrapper.loadHeaderFromFile(file)

        const response = await props.commandCentre.current.cootCommand({
            returnType: "auto_read_mtz_info_array",
            command: "shim_auto_open_mtz",
            commandArgs: [mtzWrapper.reflectionData]
        }, true) as moorhen.WorkerResponse<libcootApi.AutoReadMtzInfoJS[]>

        if (response.data.result.result.length === 0) {
            dispatch(setNotificationContent(props.getWarningToast('Error reading mtz file')))
        }

        const isDiffMapResponses = await Promise.all(response.data.result.result.map(autoReadInfo => {
            return props.commandCentre.current.cootCommand({
                returnType: "status",
                command: "is_a_difference_map",
                commandArgs: [autoReadInfo.idx]
            }, false) as Promise<moorhen.WorkerResponse<boolean>>
        }))

        await Promise.all(
            response.data.result.result.map(async (autoReadInfo, index) => {
                if (autoReadInfo.idx === -1) {
                    dispatch(setNotificationContent(props.getWarningToast('Error reading mtz file')))
                    return
                }
                const newMap = new MoorhenMap(props.commandCentre, props.glRef)
                newMap.molNo = autoReadInfo.idx
                newMap.name = `${file.name.replace('mtz', '')}-map-${index}`
                newMap.isDifference = isDiffMapResponses[index].data.result.result
                newMap.selectedColumns = {
                    F: autoReadInfo.F,
                    Fobs: autoReadInfo.F_obs,
                    FreeR: autoReadInfo.Rfree,
                    SigFobs: autoReadInfo.sigF_obs,
                    PHI: autoReadInfo.phi,
                    isDifference: newMap.isDifference,
                    useWeight: autoReadInfo.weights_used,
                    calcStructFact: true
                }
                await newMap.associateToReflectionData(newMap.selectedColumns, mtzWrapper.reflectionData)
                await newMap.getSuggestedSettings()
                dispatch( addMap(newMap) )
                if (index === 0) dispatch( setActiveMap(newMap) )
            })
        )

    }, [filesRef.current, props.commandCentre, props.glRef])

    return <MoorhenBaseMenuItem
        id='auto-open-mtz-menu-item'
        popoverContent={panelContent}
        menuItemText="Auto open MTZ..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

