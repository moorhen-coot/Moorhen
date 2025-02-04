import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { convertRemToPx } from '../../utils/utils';
import { MoorhenChainSelect } from '../select/MoorhenChainSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from 'react-redux';
import { setHoveredAtom } from "../../store/hoveringStatesSlice";

interface Props extends moorhen.CollectedProps {
    resizeTrigger: boolean;
    resizeNodeRef?: React.RefObject<HTMLDivElement>;
}

export const MoorhenRamachandran = (props: Props) => {
    const canvasRef = useRef<null | HTMLCanvasElement>(null);
    const ramaPlotDivRef = useRef<HTMLDivElement>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement>(null);
    const chainSelectRef = useRef<HTMLSelectElement>(null);
    const reqRef = useRef<number>(null)
    const hitRef = useRef<number>(-1)
    const imageRefAll = useRef<null | HTMLImageElement>(null);
    const oldImage = useRef<null | HTMLImageElement>(null);
    const imageRefGly = useRef<null | HTMLImageElement>(null);
    const imageRefPro = useRef<null | HTMLImageElement>(null);
    const imageRefPrePro = useRef<null | HTMLImageElement>(null);
    const imageRefIleVal = useRef<null | HTMLImageElement>(null);
    const imageRefNonGlyPro = useRef<null | HTMLImageElement>(null);
    const imageRefNonGlyProIleVal = useRef<null | HTMLImageElement>(null);
    const ramaPlotGlyNormalImageRef = useRef<null | HTMLImageElement>(null);
    const ramaPlotGlyOutlierImageRef = useRef<null | HTMLImageElement>(null);
    const ramaPlotProNormalImageRef = useRef<null | HTMLImageElement>(null);
    const ramaPlotProOutlierImageRef = useRef<null | HTMLImageElement>(null);
    const ramaPlotOtherNormalImageRef = useRef<null | HTMLImageElement>(null);
    const ramaPlotOtherOutlierImageRef = useRef<null | HTMLImageElement>(null);

    const [clickedResidue, setClickedResidue] = useState<null | {modelIndex: number; coordMolNo: number; molName: string; chain: string; seqNum: number; insCode: string;}>(null)
    const [ramaPlotDimensions, setRamaPlotDimensions] = useState<number>(230)
    const [ramaPlotData, setRamaPlotData] = useState<null | libcootApi.RamaDataJS[]>(null)
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [selectedChain, setSelectedChain] = useState<string | null>(null)
    const [molName, setMolName] = useState<null | string>(null)
    const [chainId, setChainId] = useState<null | string>(null)
    
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const dispatch = useDispatch()

    const getMolName = useCallback((selectedMolNo: number) => {
        if (selectedMolNo === null || molecules.length === 0) {
            return;
        }
        const coordMolNums = molecules.map(molecule => molecule.molNo);
        const molNames = molecules.map(molecule => molecule.name);
        let moleculeIndex = coordMolNums.findIndex(num => num === selectedMolNo)
        return molNames[moleculeIndex];
    }, [molecules])

    const getOffsetRect = (elem: HTMLCanvasElement) => {
        const box = elem.getBoundingClientRect();
        const body = document.body;
        const docElem = document.documentElement;
    
        const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
        const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
        const clientTop = docElem.clientTop || body.clientTop || 0;
        const clientLeft = docElem.clientLeft || body.clientLeft || 0;
        const top  = box.top +  scrollTop - clientTop;
        const left = box.left + scrollLeft - clientLeft;
        
        return { top: Math.round(top), left: Math.round(left) };
    }  

    const fixContext = useCallback(() => {
        const context = canvasRef.current.getContext('2d');
        const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        return [context, imageData]    
    }, [canvasRef])

    const draw = useCallback((iframe: number, newHit?: number) => {
        if(canvasRef.current === null) {
            return
        } 

        const [ ctx, imageData ] = fixContext() as [CanvasRenderingContext2D, ImageData];

        let pointSize: number
        
        pointSize = canvasRef.current.width * 0.02
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const animationFrames = 15

        if(newHit > -1) {

            ctx.globalAlpha = iframe / animationFrames;
            // And we can determine background image with this.
            if (ramaPlotData[newHit].restype=== "GLY") {
                if(imageRefGly.current) {
                    if(imageRefGly.current===oldImage.current) ctx.globalAlpha = 1;
                    ctx.drawImage(imageRefGly.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    if(iframe===animationFrames-1) oldImage.current = imageRefGly.current;
                }
            } else {
                if (ramaPlotData[newHit].restype=== "PRO") {
                    if(imageRefPro.current) {
                        if(imageRefPro.current===oldImage.current) ctx.globalAlpha = 1;
                        ctx.drawImage(imageRefPro.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                        if(iframe===animationFrames-1) oldImage.current = imageRefPro.current;
                    }
                } else {
                    if (ramaPlotData[newHit].is_pre_pro) {
                        if(imageRefPrePro.current) {
                            if(imageRefPrePro.current===oldImage.current) ctx.globalAlpha = 1;
                            ctx.drawImage(imageRefPrePro.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                            if(iframe===animationFrames-1) oldImage.current = imageRefPrePro.current;
                        }
                    } else {
                        if (ramaPlotData[newHit].restype=== "ILE" || ramaPlotData[newHit].restype=== "VAL") {
                            if(imageRefIleVal.current) {
                                if(imageRefIleVal.current===oldImage.current) ctx.globalAlpha = 1;
                                ctx.drawImage(imageRefIleVal.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                                if(iframe===animationFrames-1) oldImage.current = imageRefIleVal.current;
                            }
                        } else {
                            if(imageRefNonGlyProIleVal.current) {
                                if(imageRefNonGlyProIleVal.current===oldImage.current) ctx.globalAlpha = 1;
                                ctx.drawImage(imageRefNonGlyProIleVal.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                                if(iframe===animationFrames-1) oldImage.current = imageRefNonGlyProIleVal.current;
                            }
                        }
                    }
                }
            }

            if (Math.abs(ctx.globalAlpha - 1.0) > 1e-2) {
                if (oldImage.current) {
                    ctx.globalAlpha = 1.0 - iframe / animationFrames;
                    ctx.drawImage(oldImage.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                } else if (imageRefAll.current) {
                    ctx.globalAlpha = 1.0 - iframe / animationFrames;
                    ctx.drawImage(imageRefAll.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            }

        } else {
            ctx.globalAlpha = 1.0;
            if(oldImage.current) {
                ctx.drawImage(oldImage.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            } else if (imageRefAll.current) {
                ctx.drawImage(imageRefAll.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
        
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        if(ramaPlotData && ramaPlotOtherOutlierImageRef.current && ramaPlotOtherNormalImageRef.current && ramaPlotGlyOutlierImageRef.current && ramaPlotProOutlierImageRef.current){
            for (let ip=0; ip < ramaPlotData.length; ip++) {
                let phitest = ramaPlotData[ip].phi;
                let psitest = ramaPlotData[ip].psi;
                let x = ((phitest /180.) * 0.5 + 0.5) * canvasRef.current.width;
                let y = ((-psitest /180.) * 0.5 + 0.5) * canvasRef.current.height;

                if(ramaPlotData[ip].isOutlier){
                    if (ramaPlotData[ip].restype === "PRO") {
                        ctx.drawImage(ramaPlotProOutlierImageRef.current, x-4, y-4, pointSize, pointSize);
                    } else if (ramaPlotData[ip].restype === "GLY") {
                        ctx.drawImage(ramaPlotGlyOutlierImageRef.current, x-4, y-4, pointSize, pointSize);
                    } else {
                        ctx.drawImage(ramaPlotOtherOutlierImageRef.current, x-4, y-4, pointSize, pointSize);
                    }
                } else {
                    if (ramaPlotData[ip].restype === "PRO") {
                        ctx.drawImage(ramaPlotProNormalImageRef.current, x-4, y-4, pointSize, pointSize);
                    } else if (ramaPlotData[ip].restype === "GLY") {
                        ctx.drawImage(ramaPlotGlyNormalImageRef.current, x-4, y-4, pointSize, pointSize);
                    } else {
                        ctx.drawImage(ramaPlotOtherNormalImageRef.current, x-4, y-4, pointSize, pointSize);
                    }
                }
            }
            if (newHit > -1) {
                let phitest = ramaPlotData[newHit].phi;
                let psitest = ramaPlotData[newHit].psi;
                let x = ((phitest /180.) * 0.5 + 0.5) * canvasRef.current.width;
                let y = ((-psitest /180.) * 0.5 + 0.5) * canvasRef.current.height;

                if(ramaPlotData[newHit].isOutlier){
                    if(ramaPlotData[newHit].restype==="PRO"){
                        ctx.drawImage(ramaPlotProOutlierImageRef.current, x-4-iframe/animationFrames*2, y-4-iframe/animationFrames*2, pointSize+iframe/animationFrames*4, pointSize+iframe/animationFrames*4);
                    } else if(ramaPlotData[newHit].restype==="GLY"){
                        ctx.drawImage(ramaPlotGlyOutlierImageRef.current, x-4-iframe/animationFrames*2, y-4-iframe/animationFrames*2, pointSize+iframe/animationFrames*4, pointSize+iframe/animationFrames*4);
                    } else {
                        ctx.drawImage(ramaPlotOtherOutlierImageRef.current, x-4-iframe/animationFrames*2, y-4-iframe/animationFrames*2, pointSize+iframe/animationFrames*4, pointSize+iframe/animationFrames*4);
                    }
                } else {
                    if(ramaPlotData[newHit].restype==="PRO"){
                        ctx.drawImage(ramaPlotProNormalImageRef.current, x-4-iframe/animationFrames*2, y-4-iframe/animationFrames*2, pointSize+iframe/animationFrames*4, pointSize+iframe/animationFrames*4);
                    } else if(ramaPlotData[newHit].restype==="GLY"){
                        ctx.drawImage(ramaPlotGlyNormalImageRef.current, x-4-iframe/animationFrames*2, y-4-iframe/animationFrames*2, pointSize+iframe/animationFrames*4, pointSize+iframe/animationFrames*4);
                    } else {
                        ctx.drawImage(ramaPlotOtherNormalImageRef.current, x-4-iframe/animationFrames*2, y-4-iframe/animationFrames*2, pointSize+iframe/animationFrames*4, pointSize+iframe/animationFrames*4);
                    }
                }
            }
        }
        if (iframe < animationFrames) {
            reqRef.current = requestAnimationFrame(() => draw(iframe+1, newHit));
        } else {
            reqRef.current = null;
        }

        if (newHit) {
            hitRef.current = newHit
        } else {
            hitRef.current = -1
        }

    }, [ramaPlotData, canvasRef, fixContext])

    const getHit = useCallback((evt) => {
        let x: number;
        let y: number;

        if (evt.pageX || evt.pageY) {
            x = evt.pageX;
            y = evt.pageY;
        }
        else {
            x = evt.clientX ;
            y = evt.clientY ;
        }

       
        if (ramaPlotData) {
            let offset = getOffsetRect(canvasRef.current);
            x -= offset.left;
            y -= offset.top;
            let ihit = -1;
            let mindist = 100000;
            for (let ip=0; ip < ramaPlotData.length; ip++) {
                let phitest = ramaPlotData[ip].phi;
                let psitest = ramaPlotData[ip].psi;
                let xp = ((phitest /180.) * 0.5 + 0.5) * canvasRef.current.width;
                let yp = ((-psitest /180.) * 0.5 + 0.5) * canvasRef.current.height;
                if( (Math.abs(xp-x) < 3) && (Math.abs(yp-y) < 3) ) {
                    let dist = (xp-x)*(xp-x) + (yp-y)*(yp-y);
                    if (dist < mindist) {
                        mindist = dist;
                        ihit = ip;
                    }
                }
            }
            return ihit;
        }
        return -1;
    }, [ramaPlotData, canvasRef])

    const handleMouseClick = useCallback((event) => {
        if (ramaPlotData) {
            const newHit = getHit(event);
            if (newHit > -1) {
                // WARNING: ALWAYS ASSUMING FIRST MODEL IN MOLECULE
                setClickedResidue({
                    modelIndex: 0,
                    coordMolNo: selectedModel,
                    molName: molName,
                    chain: chainId,
                    seqNum: ramaPlotData[newHit].seqNum,
                    insCode: ramaPlotData[newHit].insCode
                });
            }
        }
    }, [molName, chainId, ramaPlotData, selectedModel, getHit])
    
    const doAnimation = useCallback((oldHit: number, newHit: number) => {
        if (oldHit === newHit) {
            return
        } else if (reqRef.current) {
            cancelAnimationFrame(reqRef.current)
        }
        reqRef.current = requestAnimationFrame(() => draw(0, newHit));
    }, [draw])

    const handleHoveredAtom = useCallback((cid: string) => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = molecules.findIndex(molecule => molecule.molNo === selectedModel);
            if (selectedMoleculeIndex !== -1 && molecules[selectedMoleculeIndex]) {
                dispatch( setHoveredAtom({ molecule:molecules[selectedMoleculeIndex], cid: cid }) )
            }
        }
    }, [selectedModel, molecules])

    const handleMouseMove = useCallback((event) => {
    
        if (ramaPlotData) {
            const newHit = getHit(event);
            if (newHit > -1) {
                doAnimation(hitRef.current, newHit)
                handleHoveredAtom(`//${chainId}/${ramaPlotData[newHit].seqNum}${ramaPlotData[newHit].insCode ? '.' + ramaPlotData[newHit].insCode : ''}(${ramaPlotData[newHit].restype})/`)
            };
            hitRef.current = newHit;
        }
    }, [hitRef, getHit, ramaPlotData, chainId, doAnimation, handleHoveredAtom])

    useEffect(() => {
        
        const newMolName = getMolName(selectedModel)
        setMolName(newMolName)
        setChainId(chainSelectRef.current.value)
        draw(-1)

    }, [ramaPlotData, draw, chainSelectRef, selectedModel, getMolName, ramaPlotDimensions])

    useEffect(() => {

        const imgAll = new window.Image();
        imgAll.src = `${props.urlPrefix}/pixmaps/rama2_all.png`;
        imgAll.crossOrigin = "Anonymous";
        imageRefAll.current = imgAll;

        const imgGly = new window.Image();
        imgGly.src = `${props.urlPrefix}/pixmaps/rama2_gly.png`;
        imgGly.crossOrigin = "Anonymous";
        imageRefGly.current = imgGly;

        const imgPrePro = new window.Image();
        imgPrePro.src = `${props.urlPrefix}/pixmaps/rama2_pre_pro.png`;
        imgPrePro.crossOrigin = "Anonymous";
        imageRefPrePro.current = imgPrePro;

        const imgPro = new window.Image();
        imgPro.src = `${props.urlPrefix}/pixmaps/rama2_pro.png`;
        imgPro.crossOrigin= "Anonymous";
        imageRefPro.current = imgPro;

        const imgIleVal = new window.Image();
        imgIleVal.src = `${props.urlPrefix}/pixmaps/rama2_ileval.png`;
        imgIleVal.crossOrigin = "Anonymous";
        imageRefIleVal.current = imgIleVal;

        const imgNonGlyPro = new window.Image();
        imgNonGlyPro.src = `${props.urlPrefix}/pixmaps/rama2_non_gly_pro.png`;
        imgNonGlyPro.crossOrigin = "Anonymous";
        imageRefNonGlyPro.current = imgNonGlyPro;

        const imgNonGlyProIleVal = new window.Image();
        imgNonGlyProIleVal.src = `${props.urlPrefix}/pixmaps/rama2_non_gly_pro_pre_pro_ileval.png`;
        imgNonGlyProIleVal.crossOrigin = "Anonymous";
        imageRefNonGlyProIleVal.current = imgNonGlyProIleVal;

        const imgGlyNormal = new window.Image();
        imgGlyNormal.src = `${props.urlPrefix}/pixmaps/rama-plot-gly-normal.png`;
        imgGlyNormal.crossOrigin = "Anonymous";
        ramaPlotGlyNormalImageRef.current = imgGlyNormal;

        const imgGlyOutlier = new window.Image();
        imgGlyOutlier.src = `${props.urlPrefix}/pixmaps/rama-plot-gly-outlier.png`;
        imgGlyOutlier.crossOrigin = "Anonymous";
        ramaPlotGlyOutlierImageRef.current = imgGlyOutlier;

        const imgProNormal = new window.Image();
        imgProNormal.src = `${props.urlPrefix}/pixmaps/rama-plot-pro-normal.png`;
        imgProNormal.crossOrigin = "Anonymous";
        ramaPlotProNormalImageRef.current = imgProNormal;

        const imgProOutlier = new window.Image();
        imgProOutlier.src = `${props.urlPrefix}/pixmaps/rama-plot-pro-outlier.png`;
        imgProOutlier.crossOrigin = "Anonymous";
        ramaPlotProOutlierImageRef.current = imgProOutlier;

        const imgOtherNormal = new window.Image();
        imgOtherNormal.src = `${props.urlPrefix}/pixmaps/rama-plot-other-normal.png`;
        imgOtherNormal.crossOrigin = "Anonymous";
        ramaPlotOtherNormalImageRef.current = imgOtherNormal;

        const imgOtherOutlier = new window.Image();
        imgOtherOutlier.src = `${props.urlPrefix}/pixmaps/rama-plot-other-outlier.png`;
        imgOtherOutlier.crossOrigin = "Anonymous";
        ramaPlotOtherOutlierImageRef.current = imgOtherOutlier;
        
        canvasRef.current.addEventListener("mousemove", handleMouseMove , false);
        canvasRef.current.addEventListener("click", handleMouseClick, false);
        

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove);
                canvasRef.current.removeEventListener("click", handleMouseClick);    
            }
        }
        
    }, [canvasRef, handleMouseClick, handleMouseMove])


    useEffect(() => {
        setTimeout(() => {
            let plotHeigth = (props.resizeNodeRef?.current.clientHeight) - convertRemToPx(7)
            let plotWidth = (props.resizeNodeRef?.current.clientWidth) - convertRemToPx(3)
            if (plotHeigth > 0 && plotWidth > 0) {
                plotHeigth > plotWidth ? setRamaPlotDimensions(plotWidth) : setRamaPlotDimensions(plotHeigth)
            }
        }, 50);

    }, [width, height, props.resizeTrigger])

    const fetchRamaData = useCallback( async () => {
        if (!moleculeSelectRef.current.value || !chainSelectRef.current.value) {
            setRamaPlotData(null)
            return
        }
        const inputData = {message:'coot_command', command:'ramachandran_validation', returnType:'ramachandran_data', commandArgs:[parseInt(moleculeSelectRef.current.value)], chainID: chainSelectRef.current.value}
        let response = await props.commandCentre.current.cootCommand(inputData, false) as moorhen.WorkerResponse<libcootApi.RamaDataJS[]>
        setRamaPlotData(response.data.result.result)
    }, [])

    useEffect(() => {

        fetchRamaData()

    }, [selectedModel, selectedChain, fetchRamaData])

    useEffect(() => {
        if (selectedModel === updateMolNo && ramaPlotData !== null && selectedModel !== null && chainSelectRef.current.value !== null && molecules.length !== 0) {
            fetchRamaData()
        }
    }, [updateSwitch, fetchRamaData])

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
        if (!clickedResidue) {
            return
        }

        let selectedMoleculeIndex = molecules.findIndex(molecule => molecule.name === clickedResidue.molName);
        if (selectedMoleculeIndex === -1) {
            console.log(`Cannot find molecule ${clickedResidue.molName}`)
            return
        }

        molecules[selectedMoleculeIndex].centreOn(`/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`, true, true)

    }, [clickedResidue])

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
        setSelectedChain(chainSelectRef.current.value)
    }

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChain(evt.target.value)
    }

    useEffect(() => {
        if (hoveredAtom===null || hoveredAtom.molecule === null || hoveredAtom.cid === null || ramaPlotData === null || selectedModel === null || chainSelectRef.current.value === null || selectedModel !==  hoveredAtom.molecule.molNo || canvasRef.current === null) {
            return
        }

        const [_, insCode, chainId, resInfo, atomName]   = hoveredAtom.cid.split('/')

        if (chainSelectRef.current.value !== chainId || !resInfo) {
            return
        }
        
        const resNum = resInfo.split('(')[0]
        const newHit = ramaPlotData.findIndex(residue => residue.seqNum === parseInt(resNum))

        if (newHit === -1 || newHit === hitRef.current) {
            return
        }

        doAnimation(hitRef.current, newHit)
        hitRef.current = newHit

    }, [hoveredAtom])

    return <Fragment>
        <Form style={{ padding:'0', margin: '0' }}>
            <Form.Group>
                <Row style={{ padding: '0', margin: '0' }}>
                    <Col>
                        <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef}/>
                    </Col>
                    <Col>
                        <MoorhenChainSelect width="" molecules={molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef} allowedTypes={[1, 2]}/>
                    </Col>
                </Row>
            </Form.Group>
        </Form>
        <div ref={ramaPlotDivRef} id="ramaPlotDiv" className="rama-plot-div" style={{padding:'0rem', margin:'0rem'}}>
            <canvas ref={canvasRef} style={{ marginTop:'1rem' }} height={ramaPlotDimensions} width={ramaPlotDimensions} />
        </div>
    </Fragment>

}
