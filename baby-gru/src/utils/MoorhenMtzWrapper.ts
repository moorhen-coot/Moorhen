import { v4 as uuidv4 } from "uuid";

export class MoorhenMtzWrapper {
    reflectionData: null | Uint8Array;
    columns: { [colType: string]: string };

    constructor() {
        this.reflectionData = null;
        this.columns = {};
    }

    async loadHeaderFromFile(file: File | ArrayBuffer | Uint8Array): Promise<{ [colType: string]: string }> {
        let arrayBuffer: ArrayBuffer;
        if (file instanceof File) {
            arrayBuffer = await file.arrayBuffer();
        } else if (file instanceof Uint8Array) {
            arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
        } else {
            arrayBuffer = file;
        }
        const fileName = `File_${uuidv4()}`;
        const byteArray = new Uint8Array(arrayBuffer);
        window.CCP4Module.FS_createDataFile(".", fileName, byteArray, true, true);
        const header_info = window.CCP4Module.get_mtz_columns(fileName);
        window.CCP4Module.FS_unlink(`./${fileName}`);
        const newColumns: { [colType: string]: string } = {};
        for (let ih = 0; ih < header_info.size(); ih += 2) {
            newColumns[header_info.get(ih + 1)] = header_info.get(ih);
        }
        this.columns = newColumns;
        this.reflectionData = byteArray;
        return newColumns;
    }
}
