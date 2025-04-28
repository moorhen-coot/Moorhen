import { useRef,useEffect,useState } from "react";
import { Form, FormSelect, Row, Col, InputGroup, Tab, Tabs } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { useSelector, useDispatch } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { setMultiViewRows, setMultiViewColumns, setSpecifyMultiViewRowsColumns, setThreeWayViewOrder } from "../../store/sceneSettingsSlice"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  arraySwap,
  rectSwappingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

function SortableItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: props.id});

  const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

  let bgcolor
  if(isDark) bgcolor = "#5C5C5C"
  else bgcolor = "#ECECEC"

  let style

  if(props.id===" ")
  style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  else
  style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background:bgcolor
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
          {(props.id === "Z" && !isDark) && <img draggable="false" width="75" src={`${props.urlPrefix}/pixmaps/axes_xyz.svg`}></img>}
          {(props.id === "Y" && !isDark) && <img draggable="false" width="75" src={`${props.urlPrefix}/pixmaps/axes_zxy.svg`}></img>}
          {(props.id === "X" && !isDark) && <img draggable="false" width="75" src={`${props.urlPrefix}/pixmaps/axes_yzx.svg`}></img>}
          {(props.id === "Z" && isDark) && <img draggable="false" width="75" src={`${props.urlPrefix}/pixmaps/axes_xyz_dark.svg`}></img>}
          {(props.id === "Y" && isDark) && <img draggable="false" width="75" src={`${props.urlPrefix}/pixmaps/axes_zxy_dark.svg`}></img>}
          {(props.id === "X" && isDark) && <img draggable="false" width="75" src={`${props.urlPrefix}/pixmaps/axes_yzx_dark.svg`}></img>}
    </div>
  );
}

export function Grid({ children, columns }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: `90px`,
        gridGap: 10,
        padding: 10,
        gridAutoFlow: "row dense"
      }}
    >
      {children}
    </div>
  );
}


export const MoorhenViewLayoutPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    popoverPlacement?: "left" | "right";
    urlPrefix: string;
}) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const imageRefMolDimer = useRef<null | HTMLImageElement>(null);

    const dispatch = useDispatch()
    const canvasRef = useRef(null)

    const multiViewRows = useSelector((state: moorhen.State) => state.sceneSettings.multiViewRows)
    const multiViewColumns = useSelector((state: moorhen.State) => state.sceneSettings.multiViewColumns)
    const threeWayViewOrder = useSelector((state: moorhen.State) => state.sceneSettings.threeWayViewOrder)
    const specifyMultiViewRowsColumns = useSelector((state: moorhen.State) => state.sceneSettings.specifyMultiViewRowsColumns)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    let theTiles = ["Z","X","Y"," "]
    if(threeWayViewOrder&&threeWayViewOrder.length===4)
        theTiles = threeWayViewOrder.split("")
    const [items, setItems] = useState(theTiles);
    const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }))

    const imgMolDimer = new window.Image();
    imgMolDimer.src = `${props.urlPrefix}/pixmaps/molecule_dimer.svg`;
    imgMolDimer.crossOrigin = "Anonymous";
    imageRefMolDimer.current = imgMolDimer;

    const onCompleted = () => {}

    function handleDragEnd(event) {
      const {active, over} = event;

      if (active.id !== over.id) {
          const oldIndex = items.indexOf(active.id);
          const newIndex = items.indexOf(over.id);
          const newItems =  arraySwap(items, oldIndex, newIndex);
          setItems(newItems);
          const initialValue = "";
          const newThreeWayViewOrder = newItems.reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            initialValue,
          );
          dispatch(setThreeWayViewOrder(newThreeWayViewOrder))
      }
    }

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
        if(imageRefMolDimer.current){
            const cellWidth = drawWidth / multiViewColumns
            const cellHeight = drawHeight / multiViewRows
            const imgSize = Math.min(cellWidth,cellHeight)
            let imol = 0
            for(let i=0;i<multiViewColumns;i++){
                for(let j=0;j<multiViewRows;j++){
                    const x = i*cellWidth + 10 + (cellWidth-imgSize)/2
                    const y = (multiViewRows-j-1)*cellHeight + 10  + (cellHeight-imgSize)/2
                    if(imol<molecules.length)
                        ctx.drawImage(imageRefMolDimer.current, x+2, y+2, imgSize-4,imgSize-4)
                    imol++
                }
            }
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

    useEffect(() => {
        if(!specifyMultiViewRowsColumns){
            const wh = get_grid(molecules.length)
            dispatch(setMultiViewRows(wh[0]))
            dispatch(setMultiViewColumns(wh[1]))
        }
    }, [molecules])

    const handleChange = ((event,type) => {
        if(type==="specify"){
            dispatch(setSpecifyMultiViewRowsColumns(true))
        } else {
            dispatch(setSpecifyMultiViewRowsColumns(false))
            const wh = get_grid(molecules.length)
            dispatch(setMultiViewRows(wh[0]))
            dispatch(setMultiViewColumns(wh[1]))
        }
    })

    const panelContent =
        <>
        <Tabs defaultActiveKey="onepermol">
          <Tab eventKey="onepermol" title="One view per molecule">
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
            <Form.Control min="1" step="1" type="number" value={multiViewColumns} onChange={(e) => dispatch(setMultiViewColumns(parseInt(e.target.value)))}/>
            </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3" controlId="MoorhenLayoutRowsPref">
            <Col width="3">
            <Form.Label>Rows</Form.Label>
            </Col>
            <Col width="12">
            <Form.Control min="1" step="1" type="number" value={multiViewRows} onChange={(e) => dispatch(setMultiViewRows(parseInt(e.target.value)))}/>
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
          </Tab>
          <Tab eventKey="threeway" title="Three-way view">
          <div>Drag the axes picture around to rearrange the 3-way view</div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={items}
              strategy={rectSwappingStrategy}
            >
            <Grid columns={2}>
              {items.map(id => <SortableItem urlPrefix={props.urlPrefix} key={id} id={id} />)}
              </Grid>
            </SortableContext>
          </DndContext>
          </Tab>
        </Tabs>
        </>

    return <MoorhenBaseMenuItem
        popoverPlacement={props.popoverPlacement ?? "right"}
        popoverContent={panelContent}
        menuItemText={"Multi-view layout options..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={onCompleted}
    />
}
