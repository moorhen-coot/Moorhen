import { Form, InputGroup } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";


export const MoorhenScoresToastPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    defaultUpdatingScores: string[];
    setDefaultUpdatingScores: React.Dispatch<{
        action: 'Add' | 'Remove' | 'Overwrite';
        item?: string;
        items?: string[];
    }>;
    showScoresToast: boolean;
    setShowScoresToast: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const panelContent =
        <>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.showScoresToast}
                    onChange={() => { props.setShowScoresToast(!props.showScoresToast) }}
                    label="Show scores window" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Rfactor')}
                    onChange={() => {
                        props.setDefaultUpdatingScores({
                            action: props.defaultUpdatingScores.includes('Rfactor') ? 'Remove' : 'Add',
                            item: 'Rfactor'
                        })
                    }}
                    label="Show Rfactor" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Rfree')}
                    onChange={() => {
                        props.setDefaultUpdatingScores({
                            action: props.defaultUpdatingScores.includes('Rfree') ? 'Remove' : 'Add',
                            item: 'Rfree'
                        })
                    }}
                    label="Show Rfree" />
            </InputGroup>
            <InputGroup style={{ padding: '0rem', width: '15rem' }}>
                <Form.Check
                    type="switch"
                    checked={props.defaultUpdatingScores.includes('Moorhen Points')}
                    onChange={() => {
                        props.setDefaultUpdatingScores({
                            action: props.defaultUpdatingScores.includes('Moorhen Points') ? 'Remove' : 'Add',
                            item: 'Moorhen Points'
                        })
                    }}
                    label="Show Moorhen points" />
            </InputGroup>
        </>

    return <MoorhenBaseMenuItem
        id="updating-maps-scores-options-menu-item"
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Options for scores when updating maps..."}
        setPopoverIsShown={props.setPopoverIsShown}
        showOkButton={false}
    />

}
