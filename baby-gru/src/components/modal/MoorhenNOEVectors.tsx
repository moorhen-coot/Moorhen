import { addVector } from "../../store/vectorsSlice"
import { v4 as uuidv4 } from "uuid"
import type { MoorhenVector, VectorsArrowMode, VectorsCoordMode, VectorsDrawMode, VectorsLabelMode } from "../../store/vectorsSlice";


export const addAtomVector = (
  dispatch,
  molNo: number,
  cidFrom: string,
  cidTo: string
) => {

  const vector: MoorhenVector = {
    coordsMode: "atoms",
    labelMode: "none",
    labelText: "",
    drawMode: "cylinder",
    arrowMode: "none",

    xFrom: 0, yFrom: 0, zFrom: 0,
    xTo: 0, yTo: 0, zTo: 0,

    cidFrom,
    cidTo,
    molNoFrom: molNo,
    molNoTo: molNo,

    uniqueId: uuidv4(),

    vectorColour: { r: 0, g: 255, b: 0 },
    textColour: { r: 0, g: 0, b: 0 }
  }

  dispatch(addVector(vector))
}

