import {Fragment, useCallback, useEffect, useRef, useState} from "react"
import {Button, Col, Form, Row} from 'react-bootstrap'
import {MoorhenMoleculeSelect} from '../select/MoorhenMoleculeSelect'
import {useDispatch, useSelector} from "react-redux"

import {moorhen} from "../../types/moorhen"

import {MoorhenMapSelect} from "../select/MoorhenMapSelect"
import {setHoveredAtom} from "../../moorhen"

import privateer_module from "../../../public/privateer/privateer.js";
import pako from "pako";

export async function loadGlytoucanFromFile(
    tableData: TableDataEntry[]
): Promise<TableDataEntry[]> {
    const response = await fetch(
        'privateer_glycomics_database_slim.json.gzip',
        {
            headers: new Headers({ 'content-type': 'application/gzip' }),
            mode: 'no-cors',
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch the file. Status: ${response.status}`);
    }
    const gzippedData = await response.arrayBuffer();
    const output = pako.inflate(gzippedData, { to: 'string' });
    const glycomicsData = JSON.parse(output);

    tableData.forEach((data, index) => {
        const glycomicsResult = glycomicsData[data.wurcs];

        // Neaten up NotFound -> Not Found
        if (glycomicsResult.GlyConnect === 'NotFound') {
            glycomicsResult.GlyConnect = 'Not Found';
        }

        tableData[index].glytoucan_id = glycomicsResult.GlyToucan;
        tableData[index].glyconnect_id = glycomicsResult.GlyConnect;
    });
    return tableData;
}
function PrivateerValidation(props: {data: TableDataEntry[], selectedModel: any, clickCallback: (e) => void}) {

    const molecules = useSelector((state: any) => state.molecules);
    async function handleClick(e) {
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
        const _center = await selectedMolecule.centreOn(newCenterString);
    }

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
                    <div style={{display: "flex", justifyContent: "space-between", padding: "1rem 1rem 0rem 1rem"}}>
                    <p>Glycan ID: {item.id}</p>
                        <p>GlyToucan ID: {item.glytoucan_id}</p>
                            <p>GlyConnect ID: {item.glyconnect_id}</p>
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

        <p style={{margin: "auto"}}><i>Powered by Privateer Web Assembly</i></p>
    </>

}

interface TorsionEntry {
    sugar_1: string;
    sugar_2: string;
    atom_number_1: string;
    atom_number_2: string;
    phi: number;
    psi: number;
}

interface TableDataEntry {
    svg: string;
    wurcs: string;
    chain: string;
    glyconnect_id: string;
    glytoucan_id: string;
    id: string;
    torsion_err: number;
    conformation_err: number;
    anomer_err: number;
    puckering_err: number;
    chirality_err: number;
    torsions: TorsionEntry[];
}

export const MoorhenPrivateerValidation = (props: {
    sideBarWidth: number;
    showSideBar: boolean;
    dropdownId: number;
    accordionDropdownId: number;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {

    const dispatch = useDispatch()
    const newCootCommandAlert = useSelector((state: moorhen.State) => state.generalStates.newCootCommandAlert)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const [plotDimensions, setPlotDimensions] = useState<number>(230)
    const [privateerData, setPrivateerData] = useState<null | TableDataEntry[]>(null)
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [selectedMap, setSelectedMap] = useState<null | number>(null)

    const mapSelectRef = useRef<undefined | HTMLSelectElement>();
    const moleculeSelectRef = useRef<undefined | HTMLSelectElement>();

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleMapChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMap(parseInt(evt.target.value))
    }

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


    const handleClick = useCallback((residueLabel: string) => {
        if (selectedModel !== null) {
            const molecule = molecules.find(item => item.molNo === selectedModel)
            if (molecule) {
                const [chain, resName, resNum] = residueLabel.split('/')
                const cid = `//${chain}/${resNum}(${resName})`
                molecule.centreOn(cid)
            }
        }
    }, [selectedModel, molecules])


    function sanitizeID(id: string): string {
        const regex = /: *32/g;
        return id.replace(regex, '');
    }
    const fetchData = async () => {
        if (selectedModel === null || selectedMap === null) {
            return
        }

        const molecule = molecules.find(item => item.molNo === selectedModel)
        const map = maps.find(item => item.molNo === selectedMap)

        if (!molecule || !map) {
            return
        }

        // const irisModule = await iris_module()

        const [mapResponse, moleculeData] = await Promise.all([
            map.getMap(),
            molecule.getAtoms()
        ])
        const map_data = new Uint8Array(mapResponse.data.result.mapData)

        const moleculeFileName = `${molecule.name}.pdb`
        const mapFileName = `${map.name}.map`
        const Module = await privateer_module();

        Module['FS_createDataFile']('/', mapFileName, map_data, true, true, true)
        Module['FS_createDataFile']('/', moleculeFileName, moleculeData, true, true, true)


        const backend_call = Module.read_structure_to_table(moleculeData, moleculeFileName);
        console.log(backend_call)
        let tableData: TableDataEntry[] = [];
        for (let i = 0; i < backend_call.size(); i++) {
            const tableEntry = backend_call.get(i);

            tableEntry.id = sanitizeID(tableEntry.id as string);

            const collectedTorsions: any[] = [];
            for (let j = 0; j < tableEntry.torsions.size(); j++) {
                collectedTorsions.push(tableEntry.torsions.get(j));
            }
            tableEntry.torsions = collectedTorsions;
            const regex = /: *32/g;
            tableEntry.svg = tableEntry.svg.replace(regex, '');
            tableData.push(tableEntry as TableDataEntry);
        }
        tableData = await loadGlytoucanFromFile(tableData)

        console.table(tableData)
        setPrivateerData(tableData)
    }

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
        }
    }, [molecules.length])

    useEffect(() => {
        if (maps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(maps[0].molNo)
        } else if (!maps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(maps[0].molNo)
        }
    }, [maps.length])

    // useEffect(() => {
    //     setTimeout(() => {
    //         let plotHeigth = (props.resizeNodeRef.current.clientHeight) - convertRemToPx(15)
    //         let plotWidth = (props.resizeNodeRef.current.clientWidth) - convertRemToPx(3)
    //         if (plotHeigth > 0 && plotWidth > 0) {
    //             plotHeigth > plotWidth ? setPlotDimensions(plotWidth) : setPlotDimensions(plotHeigth)
    //         }
    //     }, 50);
    //
    // }, [width, height, props.resizeTrigger])

    // const aes: IrisAesthetics = {
    //     dimensions: [plotDimensions, plotDimensions],
    //     radius_change: 50,
    //     header: 40,
    //     text_size: 100
    // }

    // const iris_props: IrisProps = {
    //     results: irisData,
    //     from_wasm: true,
    //     aesthetics: aes,
    //     click_callback: handleClick,
    //     hover_callback: handleHover
    // }

    return <Fragment>
        <Form style={{padding: '0', margin: '0'}}>
            <Form.Group>
                <Row style={{padding: '0', margin: '0'}}>
                    <Col>
                        <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules}
                                               ref={moleculeSelectRef}/>
                    </Col>
                    <Col>
                        <MoorhenMapSelect width="" onChange={handleMapChange} maps={maps} ref={mapSelectRef}/>
                    </Col>
                    <Col style={{
                        display: 'flex',
                        alignItems: 'center',
                        alignContent: 'center',
                        verticalAlign: 'center'
                    }}>
                        <Button variant="secondary" size='lg' onClick={fetchData} style={{width: '80%', marginTop: '10%'}}>
                            Plot
                        </Button>
                    </Col>
                </Row>
            </Form.Group>
        </Form>
        {privateerData ? <PrivateerValidation data={privateerData} selectedModel={selectedModel} clickCallback={(e) => {console.log(e)}}/>: <>No Data</>}
    </Fragment>
}