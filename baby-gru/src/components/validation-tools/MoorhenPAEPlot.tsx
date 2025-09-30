import { useEffect, useRef, useState, useCallback } from "react"
import { Col, Row, Form, Button, InputGroup } from 'react-bootstrap'
import { useSelector } from "react-redux"
import { useSnackbar } from "notistack";
import { moorhen } from "../../types/moorhen"
import { convertRemToPx, paeToImageData, resizeImageData } from "../../utils/utils"
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'

interface MoorhenPAEProps {
    resizeTrigger?: boolean
    size?: { width: number; height: number; }
}

const getOffsetRect = (elem: HTMLCanvasElement) => {
    const box = elem.getBoundingClientRect()
    const body = document.body
    const docElem = document.documentElement

    const scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop
    const scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft
    const clientTop = docElem.clientTop || body.clientTop || 0
    const clientLeft = docElem.clientLeft || body.clientLeft || 0
    const top  = box.top +  scrollTop - clientTop
    const left = box.left + scrollLeft - clientLeft

    return { top: Math.round(top), left: Math.round(left) }
}

export const MoorhenPAEPlot = (props: MoorhenPAEProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasLegendRef = useRef<HTMLCanvasElement>(null)
    const moleculeSelectRef = useRef<HTMLSelectElement>(null);

    const [selectedModel, setSelectedModel] = useState<null | number>(null)

    const [plotData, setPlotData] = useState<null | ImageData>(null)
    const [maxPAE, setMaxPAE] = useState<number>(100)

    const [clickX, setClickX] = useState<number>(-1)
    const [clickY, setClickY] = useState<number>(-1)
    const [moveX, setMoveX] = useState<number>(-1)
    const [moveY, setMoveY] = useState<number>(-1)
    const [releaseX, setReleaseX] = useState<number>(-1)
    const [releaseY, setReleaseY] = useState<number>(-1)

    const [queryText, setQueryText] = useState<string>("Q12XU1")

    const [mouseHeldDown, setMouseHeldDown] = useState<boolean>(false)

    const [paeModeButtonState, setPaeModeButtonState] = useState<string>("uniprot")

    const inputFile = useRef(null);

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114

    const { enqueueSnackbar } = useSnackbar();

    const axesSpace = 75

    const upLoadPaeFile = async (fn: File) => {
        const text = await fn.text()
        if(!text) return
        try {
            const pae = JSON.parse(text)
            if(pae){
                const imgData = await paeToImageData(pae[0])
                if(pae[0].max_predicted_aligned_error) setMaxPAE(pae[0].max_predicted_aligned_error)
                setPlotData(imgData)
            }
        } catch(e) {
            console.log(e)
            enqueueSnackbar("Failed to parse file "+fn.name+" as PAE", { variant: "error" });
        }
    }

    const fetchDataFromEBI = async (uniprotID: string) => {

        const paeUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotID}-F1-predicted_aligned_error_v4.json`
        const paeResponse = await fetch(paeUrl)
        if(paeResponse.ok) {
            const data = await paeResponse.json()
            const imgData = await paeToImageData(data[0])
            if(data[0].max_predicted_aligned_error) setMaxPAE(data[0].max_predicted_aligned_error)
            setPlotData(imgData)
        } else {
            console.log(paeResponse)
            enqueueSnackbar("Failed to fetch PAE file for name: "+uniprotID, { variant: "error" });
        }
    }

    const fetchDataForLoadedMolecule = async () => {
        if(selectedModel!==null&&selectedModel>-1&&molecules.length>0){
            const uniprotID = molecules[selectedModel].name
            fetchDataFromEBI(uniprotID)
        }
    }

    const fetchData = async () => {
        const uniprotID = queryText
        fetchDataFromEBI(uniprotID)
    }

    const getXY = (evt) => {
        if(!canvasRef||!canvasRef.current) return

        const canvas = canvasRef.current
        const offset = getOffsetRect(canvas)
        let x: number
        let y: number

        if (evt.pageX || evt.pageY) {
            x = evt.pageX
            y = evt.pageY
        } else {
            x = evt.clientX
            y = evt.clientY
        }
        x -= offset.left
        y -= offset.top

        return [x,y]
    }

    const handleModeChange = ((event,type) => {
        setPaeModeButtonState(type)
    })


    const handleMouseMove = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return
        const canvas = canvasRef.current

        const [x,y] = getXY(evt)

        if(x>axesSpace&&y<canvas.height-axesSpace){
           const resizedSize = Math.min(canvas.width,canvas.height-axesSpace)
           const xFrac = (x-axesSpace)/resizedSize
           const yFrac = y/resizedSize
           setMoveX(xFrac)
           setMoveY(yFrac)
        }

    },[plotData])

    const handleMouseUp = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return
        const canvas = canvasRef.current

        const [x,y] = getXY(evt)
        setMouseHeldDown(false)

        if(x>axesSpace&&y<canvas.height-axesSpace){
           const resizedSize = Math.min(canvas.width,canvas.height-axesSpace)
           const xFrac = (x-axesSpace)/resizedSize
           const yFrac = y/resizedSize
           setReleaseX(xFrac)
           setReleaseY(yFrac)
           if(Math.abs((clickX-xFrac)*plotData.width)>1&&Math.abs((clickY-yFrac)*plotData.height)){
               console.log(Math.round(clickX*plotData.width),Math.round(clickY*plotData.height))
               console.log(Math.round(xFrac*plotData.width),Math.round(yFrac*plotData.height))
           }
        }

    },[plotData,clickX,clickY,props.size,plotData])

    const handleMouseDown = useCallback((evt) => {

        if(!canvasRef||!canvasRef.current) return
        const canvas = canvasRef.current

        const [x,y] = getXY(evt)

        if(x>axesSpace&&y<canvas.height-axesSpace){
           const resizedSize = Math.min(canvas.width,canvas.height-axesSpace)
           const xFrac = (x-axesSpace)/resizedSize
           const yFrac = y/resizedSize
           setClickX(xFrac)
           setClickY(yFrac)
           setMouseHeldDown(true)
        }

    },[plotData])

    useEffect(() => {

        canvasRef.current.addEventListener("mousemove", handleMouseMove , false)
        canvasRef.current.addEventListener("mousedown", handleMouseDown , false)
        canvasRef.current.addEventListener("mouseup", handleMouseUp , false)

        return () => {
            if (canvasRef.current !== null) {
                canvasRef.current.removeEventListener("mousemove", handleMouseMove)
                canvasRef.current.removeEventListener("mousedown", handleMouseDown)
                canvasRef.current.removeEventListener("mouseup", handleMouseUp)
            }
        }

    }, [canvasRef, handleMouseMove,handleMouseUp,handleMouseDown])

    useEffect(() => {
        const plotTheLegend = async () => {
           if(!canvasLegendRef||!canvasLegendRef.current)
               return
            const canvas = canvasLegendRef.current
            const ctx = canvas.getContext("2d")
            if(!ctx||!plotData) return

            ctx.save()
            ctx.clearRect(0,0,canvas.width,canvas.height)
            const grad=ctx.createLinearGradient(axesSpace,0, canvas.width,0)
            grad.addColorStop(0, "#006900")
            grad.addColorStop(0.5, "#80b480")
            grad.addColorStop(1, "white")

            if(bright_y>0.5){
                ctx.strokeStyle = "black"
                ctx.fillStyle = grad
            } else {
                ctx.strokeStyle = "white"
                ctx.fillStyle = grad
            }

            const tm = ctx.measureText("30")
            const tHeight = tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent

            ctx.beginPath()
            ctx.moveTo(axesSpace,0)
            ctx.lineTo(axesSpace,canvas.height-2.5*tHeight)
            ctx.lineTo(canvas.width,canvas.height-2.5*tHeight)
            ctx.lineTo(canvas.width,0)
            ctx.lineTo(axesSpace,0)
            ctx.fill()
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(axesSpace,0)
            ctx.lineTo(axesSpace,canvas.height-2.5*tHeight)
            ctx.lineTo(canvas.width,canvas.height-2.5*tHeight)
            ctx.lineTo(canvas.width,0)
            ctx.lineTo(axesSpace,0)
            ctx.stroke()

            if(bright_y>0.5){
                ctx.fillStyle = "black"
            } else {
                ctx.fillStyle = "white"
            }

            ctx.font = "16px arial"
            for(let ival=0;ival<maxPAE;ival+=5){
                const tm = ctx.measureText(""+Math.floor(ival).toFixed(0))
                const tWidth = tm.width
                const frac = ival / maxPAE
                const yval = frac*(canvas.width-axesSpace) + axesSpace - tWidth/2
                ctx.fillText(""+Math.floor(ival).toFixed(0),yval,canvas.height)
            }

            ctx.restore()
        }
        plotTheLegend()
     }, [plotData, backgroundColor, isDark, height, width, props.size ])

    useEffect(() => {
        const plotTheData = async () => {
           if(!canvasRef||!canvasRef.current)
               return
            const canvas = canvasRef.current
            const ctx = canvas.getContext("2d")
            if(!ctx||!plotData) return

            const resizeImgData = await resizeImageData(plotData,Math.min(canvas.width,canvas.height-axesSpace),Math.min(canvas.width,canvas.height-axesSpace))
            ctx.save()
            ctx.lineWidth = 2
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if(bright_y>0.5){
                ctx.strokeStyle = "black"
                ctx.fillStyle = "black"
            } else {
                ctx.strokeStyle = "white"
                ctx.fillStyle = "white"
            }
            ctx.putImageData(resizeImgData, axesSpace, 0)
            ctx.beginPath()
            ctx.moveTo(axesSpace,0)
            ctx.lineTo(axesSpace,canvas.height-axesSpace)
            ctx.lineTo(canvas.width,canvas.height-axesSpace)
            ctx.lineTo(canvas.width,0)
            ctx.lineTo(axesSpace,0)
            ctx.stroke()

            if(mouseHeldDown) {
               ctx.beginPath()
               ctx.moveTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,moveY*resizeImgData.height)
               ctx.lineTo(axesSpace+moveX*resizeImgData.width,moveY*resizeImgData.height)
               ctx.lineTo(axesSpace+moveX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.stroke()
               ctx.save()
               ctx.fillStyle = "#ffffff77"
               ctx.moveTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,moveY*resizeImgData.height)
               ctx.lineTo(axesSpace+moveX*resizeImgData.width,moveY*resizeImgData.height)
               ctx.lineTo(axesSpace+moveX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.fill()
               ctx.restore()
            }
            if(!mouseHeldDown&&Math.abs((releaseX-clickX)*resizeImgData.width)>1&&Math.abs((releaseY-clickY)*resizeImgData.height)>1) {
               ctx.beginPath()
               ctx.moveTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,releaseY*resizeImgData.height)
               ctx.lineTo(axesSpace+releaseX*resizeImgData.width,releaseY*resizeImgData.height)
               ctx.lineTo(axesSpace+releaseX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.stroke()
               ctx.save()
               ctx.fillStyle = "#ffffff77"
               ctx.beginPath()
               ctx.moveTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,releaseY*resizeImgData.height)
               ctx.lineTo(axesSpace+releaseX*resizeImgData.width,releaseY*resizeImgData.height)
               ctx.lineTo(axesSpace+releaseX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.lineTo(axesSpace+clickX*resizeImgData.width,clickY*resizeImgData.height)
               ctx.fill()
               ctx.restore()
            }

            ctx.font = "16px arial"
            for(let ires=0;ires<plotData.height;ires+=100){
                const tm = ctx.measureText("  "+ires)
                const tWidth = tm.width
                ctx.fillText(""+ires,axesSpace-tWidth,ires/plotData.height*resizeImgData.height+tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent)
            }
            for(let ires=0;ires<plotData.width;ires+=100){
                const tm = ctx.measureText(""+ires)
                const tWidth = tm.width
                const tHeight = tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent
                ctx.fillText(""+ires,axesSpace+tWidth+ires/plotData.height*resizeImgData.height-tWidth/2,resizeImgData.height+2*tHeight)
            }
            const tm = ctx.measureText("Scored residue")
            const tWidth = tm.width
            const tHeight = tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent
            ctx.fillText("Scored residue",resizeImgData.width/2+axesSpace-tWidth/2,canvas.height-tHeight)
            ctx.restore()
            ctx.save()
            ctx.font = "16px arial"
            const tmVert = ctx.measureText("Aligned residue")
            const tWidthVert = tmVert.width
            const tHeightVert = tmVert.actualBoundingBoxDescent+tm.actualBoundingBoxAscent
            if(bright_y>0.5){
                ctx.strokeStyle = "black"
                ctx.fillStyle = "black"
            } else {
                ctx.strokeStyle = "white"
                ctx.fillStyle = "white"
            }
            ctx.translate(axesSpace/2, resizeImgData.height/2)
            ctx.rotate(-Math.PI/2)
            ctx.fillText("Aligned residue",-tWidthVert/2,-tHeightVert)
            ctx.restore()
        }
        plotTheData()
     }, [plotData, backgroundColor, isDark, height, width, props.size, clickX, clickY, moveX, moveY, releaseX, releaseY ])

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
        }

    }, [molecules.length])

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const plotHeight = (props.size.height) - convertRemToPx(15)
    const plotWidth = (props.size.width) - convertRemToPx(3)
    const plotSize = Math.min(plotWidth,plotHeight)

    return  <>
                <Row style={{textAlign:'left'}}>
                    <Col sm={3}>
                    Data source
                    </Col>
                    <InputGroup as={Col} className='mb-3'>
                    <Form.Check
                      inline
                      label="Alphafold EBI search"
                      name="paetypegroup"
                      type="radio"
                      checked={paeModeButtonState==="uniprot"}
                      onChange={(e) => {handleModeChange(e,"uniprot")}}
                    />
                    <Form.Check
                      inline
                      label="PAE File"
                      name="paetypegroup"
                      type="radio"
                      checked={paeModeButtonState==="paefile"}
                      onChange={(e) => {handleModeChange(e,"paefile")}}
                    />
                    <Form.Check
                      inline
                      label="Loaded molecule"
                      name="paetypegroup"
                      type="radio"
                      checked={paeModeButtonState==="molecule"}
                      onChange={(e) => {handleModeChange(e,"molecule")}}
                    />
                    </InputGroup>
                </Row>

                {paeModeButtonState==="uniprot" &&
                <Row style={{textAlign:'left', marginBottom:"1.5rem" }}>
                    <Col sm={2}>UniProt</Col>
                    <Form.Group as={Col} className="mb-3" >
                        <Form.Control
                             type="text"
                             value={queryText}
                             onChange={evt => {
                                 setQueryText(evt.target.value);
                             }}
                         />
                    </Form.Group>
                    <Col sm={6}>
                        <Button variant="secondary" size='lg' onClick={fetchData} >
                            Fetch data and plot
                        </Button>
                    </Col>
                </Row>
                }
                {paeModeButtonState==="paefile" &&
                <Row>
                        <input
                            type="file"
                            id="file"
                            ref={inputFile}
                            accept=".json,.JSON,.pae,.PAE"
                            onChange={e => {
                                upLoadPaeFile(e.target.files[0]);
                            }}
                        />
                </Row>
                }
                {paeModeButtonState==="molecule" &&
                <Row>
                    <Col sm={6}>
                    <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef}/>
                    </Col>
                    <Col sm={6}>
                        <Button variant="secondary" size='lg' onClick={fetchDataForLoadedMolecule} >
                            Fetch data and plot
                        </Button>
                    </Col>
                </Row>
                }
                <Row>
                <Col>
                <div>
                <canvas height={plotSize} width={plotSize} ref={canvasRef}></canvas>
                </div>
                </Col>
                </Row>
                <Row>
                <Col>
                <div>
                <canvas height={50} width={plotSize} ref={canvasLegendRef}></canvas>
                </div>
                </Col>
                </Row>
            </>

}
