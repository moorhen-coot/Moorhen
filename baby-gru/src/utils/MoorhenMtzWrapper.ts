import { v4 as uuidv4 } from "uuid";

export class MoorhenMtzWrapper {
    reflectionData: null | Uint8Array;
    columns: { [colType: string]: string };

    constructor() {
        this.reflectionData = null;
        this.columns = {};
    }

    loadHeaderFromFile = async ( file: File): Promise<{ [colType: string]: string }> => {

        const gemmi = (window as any).gemmiModule
        const arrayBuffer = await file.arrayBuffer()

        const fileName = `File_${uuidv4()}`;
        const byteArray = new Uint8Array(arrayBuffer);
        gemmi.FS_createDataFile(".", fileName, byteArray, true, true);

        const mtz = gemmi.read_mtz_file(fileName)

        const result: { [colType: string]: string } = {}

        for (let i = 0; i < mtz.columns.size(); i++) {
            const col = mtz.columns.get(i)

            const label = col.label
            const type = String.fromCharCode(col.type)
            result[label] = type

        }

        if (mtz.delete) mtz.delete()
        gemmi.FS_unlink(`./${fileName}`);

        this.columns = result;
        this.reflectionData = byteArray;

        return result
    }

}
