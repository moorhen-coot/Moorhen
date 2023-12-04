import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Button } from 'react-bootstrap'
import { Chart, TooltipItem } from 'chart.js'
import { MoorhenChainSelect } from '../select/MoorhenChainSelect'
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { residueCodesOneToThree, getResidueInfo, convertViewtoPx, convertRemToPx } from '../../utils/MoorhenUtils'
import { useDispatch, useSelector } from "react-redux"
import { setHoveredAtom } from "../../store/hoveringStatesSlice"
import {Iris, IrisData, IrisAesthetics, IrisProps, generate_random_data} from "iris-validation"
import { moorhen } from "../../types/moorhen"
import { libcootApi } from "../../types/libcoot"

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

    const random_data = generate_random_data(5) // get 5 metric rings

    const aes: IrisAesthetics = {
        dimensions: [plotDimensions, plotDimensions],
        radius_change: 50, 
        header: 40,
        text_size: 50
    }

    const results: IrisData = {
        data: random_data,
        chain_list: ["A", "B", "C"],
        file_list: ["input1"], 
    } 
    
    const iris_props: IrisProps = { 
        results: results,
        from_wasm: false,
        aesthetics: aes, 
        callback: (residue) => { 
            console.log("RESIDUE CLICKED", residue)
        }
    }

    useEffect(() => {
        setTimeout(() => {
            let plotHeigth = (props.resizeNodeRef.current.clientHeight) - convertRemToPx(10)
            let plotWidth = (props.resizeNodeRef.current.clientWidth) - convertRemToPx(3)
            if (plotHeigth > 0 && plotWidth > 0) {
                plotHeigth > plotWidth ? setPlotDimensions(plotWidth) : setPlotDimensions(plotHeigth)
            }
        }, 50);

    }, [width, height, props.resizeTrigger])


    return  <Fragment>
                <Iris {...iris_props} />
            </Fragment>

}