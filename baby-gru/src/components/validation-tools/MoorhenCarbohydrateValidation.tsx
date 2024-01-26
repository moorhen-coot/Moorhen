import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenLigandCard } from "../card/MoorhenLigandCard";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Col, Row, Form, Button } from 'react-bootstrap'
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import {PrivateerResultsEntry} from "../../types/privateer"
import {setHoveredAtom} from "../../moorhen"
interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

function PrivateerValidation(props: {data: PrivateerResultsEntry[], selectedModel: any, clickCallback: (e) => void}) {

    const molecules = useSelector((state: any) => state.molecules);
    const handleClick = useCallback(async (e) => {
        const newCenterString =
            e.target.dataset.chainid +
            '/' +
            e.target.dataset.seqnum +
            '(' +
            e.target.dataset.resname +
            ')';

        props.clickCallback(newCenterString);
        const selectedMolecule = molecules.find(
            (molecule) => molecule.molNo === props.selectedModel
        );

        if (selectedMolecule !== null) {
            const _center = await selectedMolecule.centreOn(newCenterString);
        }
    }, [molecules]);

    const sugarRef = useCallback(
        (node: HTMLElement | null) => {
            if (node !== null) {
                node.querySelector('svg').style.display = 'block';
                node.querySelector('svg').style.margin = 'auto';

                const useList = node.querySelectorAll('use');

                for (let i = 0; i < useList.length; i++) {
                    useList[i].addEventListener('click', handleClick);
                    useList[i].addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                    });
                    useList[i].addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                    });
                }
            }
        }, []
    );

    return <>
        {props.data.map((item, index) => {
            return (
                <div style={{padding: "0 0 1rem 1rem", borderBottom: "solid"}}>
                    <div style={{display: "flex", justifyContent: "center", padding: "1rem 1rem 0rem 1rem"}}>
                    <p>Glycan ID: {item.id}</p>

                    </div>
                <div
                    style={{display: "flex", padding: "1rem"}}
                    id="svgContainer"
                    dangerouslySetInnerHTML={{
                        __html: item.svg,
                    }}
                    ref={sugarRef}
                />
                </div>
            )
        })}
    </>

}

export const MoorhenCarbohydrateValidation = (props: Props) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const moleculeSelectRef = useRef<undefined | HTMLSelectElement>();
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [privateerData, setPrivateerData] = useState<null | PrivateerResultsEntry[]>(null)


    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }


    const dispatch = useDispatch()
    const handleHover = useCallback((residueLabel: string) => {
        if (selectedModel !== null) {
            const molecule = molecules.find(item => item.molNo === selectedModel)
            if (molecule) {
                const [chain, resName, resNum] = residueLabel.split('/')
                const cid = `//${chain}/${resNum}(${resName})`
                dispatch(setHoveredAtom({molecule, cid}))
            }
        }
    }, [selectedModel, molecules])



    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
        }

    }, [molecules.length])


    const validate = async () => { 
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)

        if (selectedMolecule) {
            const privateerResult = await props.commandCentre.current.cootCommand({
                command: 'privateer_validate',
                commandArgs: [selectedMolecule.molNo],
                returnType: 'privateer_results'
            }, false)

            const privateerData: PrivateerResultsEntry[] = privateerResult.data.result.result;
            setPrivateerData(privateerData)
        }
    }

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef}/>
                            </Col>
                            <Col style={{ display:'flex', alignItems: 'center', alignContent: 'center', verticalAlign: 'center'}}>
                                <Button variant="secondary" size='lg' onClick={() => {validate()}} style={{width: '80%', marginTop:'10%'}}>
                                    Validate
                                </Button>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                {
                    privateerData !== null ? 
                    <PrivateerValidation data={privateerData} selectedModel={selectedModel} clickCallback={(e) => {}}/> :
                        <>
                        <span>No data</span>
                        </>
                }
            </Fragment>
}
