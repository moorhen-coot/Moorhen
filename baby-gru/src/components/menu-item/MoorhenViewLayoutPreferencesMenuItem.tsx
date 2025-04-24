import { useRef,useEffect,useState } from "react";
import { Form, FormSelect, Row, Col, InputGroup } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useSelector, useDispatch } from "react-redux";
import { moorhen } from "../../types/moorhen";

export const MoorhenViewLayoutPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    popoverPlacement?: "left" | "right";
}) => {
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const dispatch = useDispatch()
    const canvasRef = useRef(null)

    //FIXME - These need to be "global"
    const [multiViewRows, setMultiViewRows] = useState<number>(1);
    const [multiViewColumns, setMultiViewColumns] = useState<number>(1);
    const [specifyMultiViewRowsColumns, setSpecifyMultiViewRowsColumns] = useState<boolean>(false);

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const onCompleted = () => {}

    const draw = (ctx,w,h) => {
        ctx.clearRect(0, 0, w, h);
        if(isDark)
            ctx.strokeStyle = '#ffffff'
        else
            ctx.strokeStyle = '#000000'
        ctx.beginPath()
        ctx.moveTo(10,10)
        ctx.lineTo(w-10,10)
        ctx.lineTo(w-10,h-10)
        ctx.lineTo(10,h-10)
        ctx.lineTo(10,10)
        ctx.stroke()
        const drawHeight = h-20
        const drawWidth = w-20
        for(let i=1;i<multiViewRows;i++){
            ctx.beginPath()
            ctx.moveTo(10,i*drawHeight/multiViewRows+10)
            ctx.lineTo(w-10,i*drawHeight/multiViewRows+10)
            ctx.stroke()
        }
        for(let i=1;i<multiViewColumns;i++){
            ctx.beginPath()
            ctx.moveTo(i*drawWidth/multiViewColumns+10,10)
            ctx.lineTo(i*drawWidth/multiViewColumns+10,h-10)
            ctx.stroke()
        }
    }

    useEffect(() => {
    
        const canvas = canvasRef.current
        if(canvas){
            const w = canvas.width
            const h = canvas.height
            const context = canvas.getContext('2d')
            draw(context,w,h)
        }
    }, [draw,multiViewRows,multiViewColumns])

        const get_grid = (n,method="NEARSQUARE") => {
            const f = Math.floor(Math.sqrt(n))
            const c = Math.ceil(Math.sqrt(n))

            if(method==="NEARSQUARE"){
                if(f*c >= n)
                    return [f,c]
                else
                    return [c,c]
            }

            let shapes = []

            for(let i=1;i<=n;i++){
                for(let j=1;j<=n;j++){
                    if(i*j >= n && i*j <= c*c && Math.abs(i-j)<=f){
                        if(i*j - n < n){
                            let rem = i*j - n
                            if(rem != i && rem != j){
                                shapes.push([i,j,rem])
                                break
                            }
                        }
                    }
                }
            }

            if(shapes.length===0){
                if(f*c >= n)
                    return [f,c]
                else
                    return [c,c]
            }

            let the_shape = shapes[0]
            let minrem = n+1

            shapes.forEach( (s) => {
                if(s[2] < minrem){
                    the_shape = s
                    minrem = s[2]
                } else if(s[2] == minrem && Math.abs(s[0]-s[1]) < Math.abs(the_shape[0]-the_shape[1])){
                    the_shape = s
                }
            })

            return [the_shape[0],the_shape[1]]
        }


    const handleChange = ((event,type) => {
        if(type==="specify"){
            setSpecifyMultiViewRowsColumns(true)
        } else {
            setSpecifyMultiViewRowsColumns(false)
            const wh = get_grid(molecules.length)
            setMultiViewRows(wh[0])
            setMultiViewColumns(wh[1])
        }
    })

    const panelContent =
        <>
            <InputGroup className='moorhen-input-group-check'>
                <Form.Check
                    type="radio"
                    name="multiviewoptions"
                    defaultChecked={!specifyMultiViewRowsColumns}
                    onChange={(e) => {handleChange(e,"auto")}}
                    label="Automatic"/>
            </InputGroup>
            <InputGroup className='moorhen-input-group-check'>
                <Form.Check
                    type="radio"
                    name="multiviewoptions"
                    defaultChecked={specifyMultiViewRowsColumns}
                    onChange={(e) => {handleChange(e,"specify")}}
                    label="Specify"/>
            </InputGroup>
            <Form>
            <fieldset disabled={!specifyMultiViewRowsColumns}>
            <Form.Group as={Row} className="mb-3" controlId="MoorhenLayoutColsPref">
            <Col width="3">
            <Form.Label>Columns</Form.Label>
            </Col>
            <Col width="12">
            <Form.Control min="1" step="1" type="number" value={multiViewColumns} onChange={(e) => setMultiViewColumns(parseInt(e.target.value))}/>
            </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3" controlId="MoorhenLayoutRowsPref">
            <Col width="3">
            <Form.Label>Rows</Form.Label>
            </Col>
            <Col width="12">
            <Form.Control min="1" step="1" type="number" value={multiViewRows} onChange={(e) => setMultiViewRows(parseInt(e.target.value))}/>
            </Col>
            </Form.Group>
            </fieldset>
            {molecules.length === 1 && 
            <Form.Label>There is 1 molecule loaded
            </Form.Label>
            }
            { (molecules.length !== 1 && multiViewRows*multiViewColumns>=molecules.length) && 
            <Form.Label>There are {molecules.length} molecules loaded</Form.Label>
            }
            { (molecules.length !== 1 && multiViewRows*multiViewColumns<molecules.length) && 
            <Form.Label>There are {molecules.length} molecules loaded (specified grid is too small)</Form.Label>
            }
            </Form>
            <canvas ref={canvasRef}/>
        </>

    return <MoorhenBaseMenuItem
        popoverPlacement={props.popoverPlacement ?? "right"}
        popoverContent={panelContent}
        menuItemText={"Multi-view layout options..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={onCompleted}
    />
}
