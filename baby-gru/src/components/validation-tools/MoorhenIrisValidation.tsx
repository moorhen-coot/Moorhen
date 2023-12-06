import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Button } from 'react-bootstrap'
import { Chart, TooltipItem } from 'chart.js'
import { MoorhenChainSelect } from '../select/MoorhenChainSelect'
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { residueCodesOneToThree, getResidueInfo, convertViewtoPx, convertRemToPx, getMoleculeBfactors } from '../../utils/MoorhenUtils'
import { useDispatch, useSelector } from "react-redux"
import { setHoveredAtom } from "../../store/hoveringStatesSlice"
import { Iris, IrisData, IrisAesthetics, IrisProps, generate_random_data } from "iris-validation"
import { moorhen } from "../../types/moorhen"
import { libcootApi } from "../../types/libcoot"
import iris_module from "iris-validation-backend"

export const MoorhenIrisValidation = (props: {
    sideBarWidth: number;
    showSideBar: boolean;
    dropdownId: number;
    accordionDropdownId: number;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    resizeTrigger: boolean;
    resizeNodeRef: React.RefObject<HTMLDivElement>;
}) => {

    const [plotDimensions, setPlotDimensions] = useState<number>(230)

    const dispatch = useDispatch()
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const [result, setResult] = useState();

    const random_data = generate_random_data(5) // get 5 metric rings
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

    const aes: IrisAesthetics = {
        dimensions: [plotDimensions, plotDimensions],
        radius_change: 50,
        header: 40,
        text_size: 100
    }

    const results: IrisData = {
        data: result,
        chain_list: null,
        file_list: [`${molecules[0].name}.pdb`],
    }

    const iris_props: IrisProps = {
        results: results,
        from_wasm: true,
        aesthetics: aes,
        click_callback: (residue) => {
            const split_res = residue.split("/")
            const res = `${split_res[0]}/${split_res[2]}(${split_res[1]})`
            molecules[0].centreOn(res)
        },
        hover_callback: (residue) => {
            // const split_res = residue.split("/")
            // const res = `${split_res[0]}/${split_res[2]}(${split_res[1]})`
            // console.log(res)
            // molecules[0].drawHover(res)

        }
    }

    useEffect(() => {
        iris_module().then(async (Module) => {
            const map_response = await maps[0].getMap()
            const moleculeData = await molecules[0].getAtoms()
            let map_data = new Uint8Array(map_response.data.result.mapData)

            const molecule_name = `${molecules[0].name}.pdb`
            const map_name = `${maps[0].name}.map`
            Module['FS_createDataFile']('/', map_name, map_data, true, true, true)
            Module['FS_createDataFile']('/', molecule_name, moleculeData, true, true, true)

            let backend_call = Module.calculate_single_pdb(molecule_name, map_name, false);
            setResult(backend_call.results);
        })
    }, [])

    useEffect(() => {
        setTimeout(() => {
            let plotHeigth = (props.resizeNodeRef.current.clientHeight) - convertRemToPx(10)
            let plotWidth = (props.resizeNodeRef.current.clientWidth) - convertRemToPx(3)
            if (plotHeigth > 0 && plotWidth > 0) {
                plotHeigth > plotWidth ? setPlotDimensions(plotWidth) : setPlotDimensions(plotHeigth)
            }
        }, 50);

    }, [width, height, props.resizeTrigger])



    return <Fragment>
        <Form style={{ padding: '0', margin: '0' }}>
            <Form.Group>
                <Row style={{ padding: '0', margin: '0' }}>
                    <Col>
                        <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef} />
                    </Col>

                </Row>
            </Form.Group>
        </Form>
        {result ? <Iris {...iris_props} /> : <>Molecule not loaded</>}
    </Fragment>

}