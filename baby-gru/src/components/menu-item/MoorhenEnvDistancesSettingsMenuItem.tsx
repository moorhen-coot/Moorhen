import { Form, InputGroup } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { useDispatch, useSelector } from "react-redux";
import { setEnvDistancesLabelled, setShowContacts, setShowHBonds } from "../../store/sceneSettingsSlice"
import { moorhen } from "../../types/moorhen";

export const MoorhenEnvDistancesSettingsMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
}) => {
 
    const envDistancesLabelled = useSelector((state: moorhen.State) => state.sceneSettings.envDistancesSettings.labelled)
    const showHBonds = useSelector((state: moorhen.State) => state.sceneSettings.envDistancesSettings.showHBonds)
    const showContacts = useSelector((state: moorhen.State) => state.sceneSettings.envDistancesSettings.showContacts)

    const dispatch = useDispatch()

    const panelContent = <div style={{width: '18rem'}}>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={envDistancesLabelled}
                onChange={() => {dispatch( setEnvDistancesLabelled(!envDistancesLabelled) )}}
                label="Show labels"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={showHBonds}
                onChange={() => {dispatch( setShowHBonds(!showHBonds) )}}
                label="Show H bonds"/>
        </InputGroup>
        <InputGroup className='moorhen-input-group-check'>
            <Form.Check 
                type="switch"
                checked={showContacts}
                onChange={() => {dispatch( setShowContacts(!showContacts) )}}
                label="Show contacts"/>
        </InputGroup>
    </div> 

    return <MoorhenBaseMenuItem
        popoverPlacement={"right"}
        popoverContent={panelContent}
        showOkButton={false}
        menuItemText={"Env. distances settings..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={() => {}}
    />
}