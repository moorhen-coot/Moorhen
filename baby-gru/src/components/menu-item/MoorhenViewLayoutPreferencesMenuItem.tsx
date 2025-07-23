import { useRef, useEffect, useState } from "react"
import { Form, Row, Col, InputGroup, Tab, Tabs } from "react-bootstrap"
import { useSelector, useDispatch } from "react-redux"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
    SortableContext,
    useSortable,
    sortableKeyboardCoordinates,
    arraySwap,
    rectSwappingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { get_grid } from "../../utils/utils"
import { moorhen } from "../../types/moorhen"
import {
    setMultiViewRows,
    setMultiViewColumns,
    setSpecifyMultiViewRowsColumns,
    setThreeWayViewOrder,
} from "../../store/sceneSettingsSlice"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

function SortableItem(props: { id: string, urlPrefix: string }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const urlPrefix = useSelector((state: moorhen.State) => state.coreRefs.paths.urlPrefix)

    let bgcolor
    if (isDark) bgcolor = "#5C5C5C"
    else bgcolor = "#ECECEC"

    let style

    if (props.id === " ")
        style = {
            transform: CSS.Transform.toString(transform),
            transition,
        }
    else
        style = {
            transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(3deg)` : `rotate(0deg)`,
            borderRadius: 8,
            background: bgcolor,
        }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {props.id === "Z" && !isDark && (
                <img draggable="false" width="75" src={`${urlPrefix}/pixmaps/axes_xyz.svg`} alt="xyz Axes"></img>
            )}
            {props.id === "Y" && !isDark && (
                <img draggable="false" width="75" src={`${urlPrefix}/pixmaps/axes_zxy.svg`} alt="zxy Axes"></img>
            )}
            {props.id === "X" && !isDark && (
                <img draggable="false" width="75" src={`${urlPrefix}/pixmaps/axes_yzx.svg`} alt="yzx Axes"></img>
            )}
            {props.id === "Z" && isDark && (
                <img
                    draggable="false"
                    width="75"
                    src={`${urlPrefix}/pixmaps/axes_xyz_dark.svg`}
                    alt="xyz Axes Dark"
                ></img>
            )}
            {props.id === "Y" && isDark && (
                <img
                    draggable="false"
                    width="75"
                    src={`${urlPrefix}/pixmaps/axes_zxy_dark.svg`}
                    alt="zxy Axes Dark"
                ></img>
            )}
            {props.id === "X" && isDark && (
                <img
                    draggable="false"
                    width="75"
                    src={`${urlPrefix}/pixmaps/axes_yzx_dark.svg`}
                    alt="yzx Axes Dark"
                ></img>
            )}
        </div>
    )
}

export function Grid({ children, columns }: { children: React.ReactNode; columns: number }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gridAutoRows: `90px`,
                gridGap: 10,
                padding: 10,
                gridAutoFlow: "row dense",
            }}
        >
            {children}
        </div>
    )
}

export const MoorhenViewLayoutPreferencesMenuItem = (props: { popoverPlacement?: "left" | "right" }) => {
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const imageRefMolDimer = useRef<null | HTMLImageElement>(null)

    const dispatch = useDispatch()
    const canvasRef = useRef(null)

    const multiViewRows = useSelector((state: moorhen.State) => state.sceneSettings.multiViewRows)
    const multiViewColumns = useSelector((state: moorhen.State) => state.sceneSettings.multiViewColumns)
    const threeWayViewOrder = useSelector((state: moorhen.State) => state.sceneSettings.threeWayViewOrder)
    const specifyMultiViewRowsColumns = useSelector(
        (state: moorhen.State) => state.sceneSettings.specifyMultiViewRowsColumns
    )
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const urlPrefix = useSelector((state: moorhen.State) => state.coreRefs.paths.urlPrefix)

    let theTiles = ["Z", "X", "Y", " "]
    if (threeWayViewOrder && threeWayViewOrder.length === 4) theTiles = threeWayViewOrder.split("")
    const [items, setItems] = useState(theTiles)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        const imgMolDimer = new window.Image()
        imgMolDimer.src = `${urlPrefix}/pixmaps/molecule_dimer.svg`
        imgMolDimer.crossOrigin = "Anonymous"
        imageRefMolDimer.current = imgMolDimer
    }, [])

    const onCompleted = () => {}

    function handleDragEnd(event) {
        const { active, over } = event

        if (active.id !== over.id) {
            const oldIndex = items.indexOf(active.id)
            const newIndex = items.indexOf(over.id)
            const newItems = arraySwap(items, oldIndex, newIndex)
            setItems(newItems)
            const initialValue = ""
            const newThreeWayViewOrder = newItems.reduce(
                (accumulator, currentValue) => accumulator + currentValue,
                initialValue
            )
            dispatch(setThreeWayViewOrder(newThreeWayViewOrder))
        }
    }

    const draw = (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h)
        if (isDark) ctx.strokeStyle = "#ffffff"
        else ctx.strokeStyle = "#000000"
        ctx.beginPath()
        ctx.moveTo(10, 10)
        ctx.lineTo(w - 10, 10)
        ctx.lineTo(w - 10, h - 10)
        ctx.lineTo(10, h - 10)
        ctx.lineTo(10, 10)
        ctx.stroke()
        const drawHeight = h - 20
        const drawWidth = w - 20
        for (let i = 1; i < multiViewRows; i++) {
            ctx.beginPath()
            ctx.moveTo(10, (i * drawHeight) / multiViewRows + 10)
            ctx.lineTo(w - 10, (i * drawHeight) / multiViewRows + 10)
            ctx.stroke()
        }
        for (let i = 1; i < multiViewColumns; i++) {
            ctx.beginPath()
            ctx.moveTo((i * drawWidth) / multiViewColumns + 10, 10)
            ctx.lineTo((i * drawWidth) / multiViewColumns + 10, h - 10)
            ctx.stroke()
        }
        if (imageRefMolDimer.current) {
            const cellWidth = drawWidth / multiViewColumns
            const cellHeight = drawHeight / multiViewRows
            const imgSize = Math.min(cellWidth, cellHeight)
            let imol = 0
            for (let i = 0; i < multiViewColumns; i++) {
                for (let j = 0; j < multiViewRows; j++) {
                    const x = i * cellWidth + 10 + (cellWidth - imgSize) / 2
                    const y = (multiViewRows - j - 1) * cellHeight + 10 + (cellHeight - imgSize) / 2
                    if (imol < molecules.length)
                        ctx.drawImage(imageRefMolDimer.current, x + 2, y + 2, imgSize - 4, imgSize - 4)
                    imol++
                }
            }
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (canvas) {
            const w = canvas.width
            const h = canvas.height
            const context = canvas.getContext("2d")
            draw(context, w, h)
        }
    }, [draw, multiViewRows, multiViewColumns])

    useEffect(() => {
        if (!specifyMultiViewRowsColumns) {
            const wh = get_grid(molecules.length)
            dispatch(setMultiViewRows(wh[0]))
            dispatch(setMultiViewColumns(wh[1]))
        }
    }, [molecules])

    const handleChange = (event, type) => {
        if (type === "specify") {
            dispatch(setSpecifyMultiViewRowsColumns(true))
        } else {
            dispatch(setSpecifyMultiViewRowsColumns(false))
            const wh = get_grid(molecules.length)
            dispatch(setMultiViewRows(wh[0]))
            dispatch(setMultiViewColumns(wh[1]))
        }
    }

    const panelContent = (
        <>
            <Tabs defaultActiveKey="onepermol">
                <Tab eventKey="onepermol" title="One view per molecule">
                    <InputGroup className="moorhen-input-group-check">
                        <Form.Check
                            type="radio"
                            name="multiviewoptions"
                            defaultChecked={!specifyMultiViewRowsColumns}
                            onChange={(e) => {
                                handleChange(e, "auto")
                            }}
                            label="Automatic"
                        />
                    </InputGroup>
                    <InputGroup className="moorhen-input-group-check">
                        <Form.Check
                            type="radio"
                            name="multiviewoptions"
                            defaultChecked={specifyMultiViewRowsColumns}
                            onChange={(e) => {
                                handleChange(e, "specify")
                            }}
                            label="Specify"
                        />
                    </InputGroup>
                    <Form>
                        <fieldset disabled={!specifyMultiViewRowsColumns}>
                            <Form.Group as={Row} className="mb-3" controlId="MoorhenLayoutColsPref">
                                <Col width="3">
                                    <Form.Label>Columns</Form.Label>
                                </Col>
                                <Col width="12">
                                    <Form.Control
                                        min="1"
                                        step="1"
                                        type="number"
                                        value={multiViewColumns}
                                        onChange={(e) => dispatch(setMultiViewColumns(parseInt(e.target.value)))}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} className="mb-3" controlId="MoorhenLayoutRowsPref">
                                <Col width="3">
                                    <Form.Label>Rows</Form.Label>
                                </Col>
                                <Col width="12">
                                    <Form.Control
                                        min="1"
                                        step="1"
                                        type="number"
                                        value={multiViewRows}
                                        onChange={(e) => dispatch(setMultiViewRows(parseInt(e.target.value)))}
                                    />
                                </Col>
                            </Form.Group>
                        </fieldset>
                        {molecules.length === 1 && <Form.Label>There is 1 molecule loaded</Form.Label>}
                        {molecules.length !== 1 && multiViewRows * multiViewColumns >= molecules.length && (
                            <Form.Label>There are {molecules.length} molecules loaded</Form.Label>
                        )}
                        {molecules.length !== 1 && multiViewRows * multiViewColumns < molecules.length && (
                            <Form.Label>
                                There are {molecules.length} molecules loaded (specified grid is too small)
                            </Form.Label>
                        )}
                    </Form>
                    <canvas ref={canvasRef} />
                </Tab>
                <Tab eventKey="threeway" title="Three-way view">
                    <div>Drag the axes pictures around to rearrange the 3-way view</div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={items} strategy={rectSwappingStrategy}>
                            <Grid columns={2}>
                                {items.map((id) => (
                                    <SortableItem urlPrefix={urlPrefix} key={id} id={id} />
                                ))}
                            </Grid>
                        </SortableContext>
                    </DndContext>
                </Tab>
            </Tabs>
        </>
    )

    return (
        <MoorhenBaseMenuItem
            popoverPlacement={props.popoverPlacement ?? "right"}
            popoverContent={panelContent}
            menuItemText={"Multi-view layout options..."}
            onCompleted={onCompleted}
        />
    )
}
