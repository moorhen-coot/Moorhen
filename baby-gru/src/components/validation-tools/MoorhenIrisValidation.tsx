import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap'
import { useDispatch, useSelector } from "react-redux"
import { Iris, IrisData, IrisAesthetics, IrisProps } from "iris-validation"
import iris_module from "iris-validation-backend"
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { convertRemToPx } from '../../utils/MoorhenUtils'
import { moorhen } from "../../types/moorhen"
import { MoorhenMapSelect } from "../select/MoorhenMapSelect"
import { gemmi } from "../../types/gemmi";
import { setHoveredAtom } from "../../store/hoveringStatesSlice"

export const MoorhenIrisValidation = (props: {
    sideBarWidth: number;
    showSideBar: boolean;
    dropdownId: number;
    accordionDropdownId: number;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    resizeTrigger: boolean;
    resizeNodeRef: React.RefObject<HTMLDivElement>;
}) => {

    const dispatch = useDispatch()
    const newCootCommandAlert = useSelector((state: moorhen.State) => state.generalStates.newCootCommandAlert)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const [plotDimensions, setPlotDimensions] = useState<number>(230)
    const [irisData, setIrisData] = useState<null | IrisData>(null)
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [selectedMap, setSelectedMap] = useState<null | number>(null)

    const mapSelectRef = useRef<undefined | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<undefined | HTMLSelectElement>(null);

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

    useEffect(() => {
        const fetchData = async () => {
            if (selectedModel === null || selectedMap === null) {
                return
            }
    
            const molecule = molecules.find(item => item.molNo === selectedModel)
            const map = maps.find(item => item.molNo === selectedMap)
            
            if (!molecule || !map) {
                return
            }
    
            const irisModule = await iris_module()
    
            const [mapResponse, moleculeData] = await Promise.all([
                map.getMap(),
                molecule.getAtoms()
            ])
            const map_data = new Uint8Array(mapResponse.data.result.mapData)
    
            const moleculeFileName = `${molecule.name}.pdb`
            const mapFileName = `${map.name}.map`
            irisModule['FS_createDataFile']('/', mapFileName, map_data, true, true, true)
            irisModule['FS_createDataFile']('/', moleculeFileName, moleculeData, true, true, true)
    
            const backend_call = irisModule.calculate_single_pdb(moleculeFileName, mapFileName, false)
            setIrisData({
                data: backend_call.results,
                chain_list: null,
                file_list: [moleculeFileName],
            })
        }
        fetchData()
    }, [selectedMap, selectedModel, molecules, maps, newCootCommandAlert])

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
   
    useEffect(() => {
        setTimeout(() => {
            const plotHeigth = (props.resizeNodeRef.current.clientHeight) - convertRemToPx(15)
            const plotWidth = (props.resizeNodeRef.current.clientWidth) - convertRemToPx(3)
            if (plotHeigth > 0 && plotWidth > 0) {
                plotHeigth > plotWidth ? setPlotDimensions(plotWidth) : setPlotDimensions(plotHeigth)
            }
        }, 50);

    }, [width, height, props.resizeTrigger])

    const aes: IrisAesthetics = {
        dimensions: [plotDimensions, plotDimensions],
        radius_change: 50,
        header: 40,
        text_size: 100
    }

    const iris_props: IrisProps = {
        results: irisData,
        from_wasm: true,
        aesthetics: aes,
        click_callback: handleClick,
        hover_callback: handleHover
    }

    return <Fragment>
        <Form style={{ padding:'0', margin: '0' }}>
            <Form.Group>
                <Row style={{ padding:'0', margin: '0' }}>
                    <Col>
                        <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef}/>
                    </Col>
                    <Col>
                        <MoorhenMapSelect width="" onChange={handleMapChange} maps={maps} ref={mapSelectRef}/>
                    </Col>
                </Row>
            </Form.Group>
        </Form>
        {irisData ? <Iris {...iris_props} /> : <>No data</>}
    </Fragment>
}
