

import { v4 as uuidv4 } from 'uuid';

export function sequenceIsValid(sequence) {
    // If no sequence is present
    if (!sequence || sequence.length === 0) {
        return false
    }
    // If any residue doesn't have rigth attributes
    if (sequence.some(residue => !Object.keys(residue).includes('resNum') || !Object.keys(residue).includes('resCode'))) {
        return false
    }
    // If any of the residues has undefined or Nan as the residue code or residue number
    if (sequence.some(residue => residue.resNum === null || typeof residue.resNum === 'undefined' || residue.resCode === null || typeof residue.resCode === 'undefined')) {
        return false
    }
    return true
}

export function convertRemToPx(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function convertViewtoPx(input, height) {
    return height * (input / 100)
}

export const residueCodesOneToThree = {
    'C': 'CYS',
    'D': 'ASP',
    'S': 'SER',
    'Q': 'GLN',
    'K': 'LYS',
    'I': 'ILE',
    'P': 'PRO',
    'T': 'THR',
    'F': 'PHE',
    'N': 'ASN',
    'G': 'GLY',
    'H': 'HIS',
    'L': 'LEU',
    'R': 'ARG',
    'W': 'TRP',
    'A': 'ALA',
    'V': 'VAL',
    'E': 'GLU',
    'Y': 'TYR',
    'M': 'MET',
    'UNK': 'UNKOWN',
    '-': 'MISSING'
}

export const residueCodesThreeToOne = {
        "ALA":'A',
        "ARG":'R',
        "ASN":'N',
        "ASP":'D',
        "CYS":'C',
        "GLN":'Q',
        "GLU":'E',
        "GLY":'G',
        "HIS":'H',
        "ILE":'I',
        "LEU":'L',
        "LYS":'K',
        "MET":'M',
        "PHE":'F',
        "PRO":'P',
        "SER":'S',
        "THR":'T',
        "TRP":'W',
        "TYR":'Y',
        "VAL":'V',
        "UNK":'X',
}

export const nucleotideCodesOneToThree = {
    "A": "A",
    "T": "T",
    "G": "G",
    "C": "C",
    "U": "U",
    "N": "N",
    "I": "I",
    "X": "UNKOWN",
    'UNK': 'UNKOWN',
    '-': 'MISSING'
}

export const nucleotideCodesThreeToOne = {
    "A": "A",
    "T": "T",
    "G": "G",
    "C": "C",
    "U": "U",
    "N": "N",
    "I": "I",
    "DT": "T",
    "DG": "G",
    "DC": "C",
    "DA": "A",
    "DU": "U",
    "ADE": "A",
    "THY": "T",
    "GUA": "G",
    "CYT": "C",
    "URA": "U",
    "PSU": "U",
    "UNKOWN": "X",
    'UNK': 'X',
    'MISSING': '-'
}

export const postCootMessage = (cootWorker, kwargs) => {
    const messageId = uuidv4()
    return new Promise((resolve, reject) => {
        const messageListener = cootWorker.current.addEventListener('message', (reply) => {
            if (reply.data.messageId === messageId) {
                //I'm now 90% certain that this does not in fact remove the eventListener...
                cootWorker.current.removeEventListener('message', messageListener)
                console.log(`Completed in `, Date.now() - reply.data.myTimeStamp)
                resolve(reply)
            }
        })
        const messageEvent = new CustomEvent('coot_message_dispatch', { detail: { messageId: messageId } })
        document.dispatchEvent(messageEvent)
        cootWorker.current.postMessage({
            messageId, myTimeStamp: Date.now(), ...kwargs
        })
    })
}

export const cootCommand = (cootWorker, commandSpec) => {
    const message = "coot_command"
    const returnType = commandSpec.returnType
    return postCootMessage(cootWorker, { message, returnType, ...commandSpec })
}

export const readTextFile = (source) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const loadListener = reader.addEventListener("load", () => {
            reader.removeEventListener("load", loadListener)
            resolve(reader.result)
        })
        reader.readAsText(source);
    })
}

export const readDataFile = (source) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const loadListener = reader.addEventListener("load", () => {
            reader.removeEventListener("load", loadListener)
            resolve(reader.result)
        })
        reader.readAsArrayBuffer(source)
    })
}

export const doDownload = (data, targetName) => {
    const url = window.URL.createObjectURL(
        new Blob(data),
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
        'download',
        targetName,
    );

    // Append to html link element page
    document.body.appendChild(link);

    // Start download
    link.click();

    // Clean up and remove the link
    link.parentNode.removeChild(link);
}

export const doDownloadText = (text, filename) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export const readGemmiStructure = (pdbData, molName) => {
    const structure = window.CCP4Module.read_structure_from_string(pdbData, molName)
    return structure
}

export const MoorhenCommandCentre = class {
    banana = 12
    consoleMessage = ""
    activeMessages = []

    onConsoleChanged = null
    onNewCommand = null
    onActiveMessagesChanged = null

    constructor(props) {
        Object.keys(props).forEach(key => this[key] = props[key])
        this.cootWorker = new Worker(`${this.urlPrefix}/baby-gru/CootWorker.js`)
        this.cootWorker.onmessage = this.handleMessage.bind(this)
        this.postMessage({ message: 'CootInitialize', data: {} })
            .then(reply => {
                if (this.onCootInitialized) this.onCootInitialized()
            })
    }
    handleMessage(reply) {
        if (this.onConsoleChanged && reply.data.consoleMessage) {
            let newMessage
            if (reply.data.consoleMessage.length > 160) {
                newMessage = `TRUNCATED TO [${reply.data.consoleMessage.substring(0, 160)}]`
            }
            else {
                newMessage = reply.data.consoleMessage
            }
            this.extendConsoleMessage(newMessage)
        }
        this.activeMessages.filter(
            message => message.messageId && (message.messageId === reply.data.messageId)
        ).forEach(message => {
            message.handler(reply)
        })
        this.activeMessages = this.activeMessages.filter(
            message => message.messageId !== reply.data.messageId
        )
        if (this.onActiveMessagesChanged) {
            this.onActiveMessagesChanged(this.activeMessages)
        }
    }
    extendConsoleMessage(newMessage) {
        this.consoleMessage = this.consoleMessage.concat(">" + newMessage + "\n")
        this.onConsoleChanged(this.consoleMessage)
    }
    makeHandler(resolve) {
        return (reply) => {
            resolve(reply)
        }
    }
    unhook() {
        this.cootWorker.removeEventListener("message", this.handleMessage)
        this.cootWorker.terminate()
    }
    async cootCommand(kwargs, doJournal) {
        //doJournal defaults to true
        if (typeof doJournal === 'undefined') {
            doJournal = false
        }
        const message = "coot_command"
        const returnType = kwargs.returnType
        if (this.onNewCommand && doJournal) {
            console.log('In cootCommand', kwargs.command)
            this.onNewCommand(kwargs)
        }
        return this.postMessage({ message, returnType, ...kwargs })
    }
    postMessage(kwargs) {
        const $this = this
        const messageId = uuidv4()
        return new Promise((resolve, reject) => {
            const handler = $this.makeHandler(resolve)
            this.activeMessages.push({ messageId, handler, kwargs })
            if (this.onActiveMessagesChanged) {
                this.onActiveMessagesChanged(this.activeMessages)
            }
            this.cootWorker.postMessage({
                messageId, myTimeStamp: Date.now(), ...kwargs
            })
        })
    }
}

export const MoorhenMtzWrapper = class {
    constructor() {

    }
    loadHeaderFromFile(file) {
        return new Promise((resolve, reject) => {
            readDataFile(file)
                .then(arrayBuffer => {
                    const fileName = `File_${uuidv4()}`
                    const byteArray = new Uint8Array(arrayBuffer)
                    window.CCP4Module.FS_createDataFile(".", fileName, byteArray, true, true);
                    const header_info = window.CCP4Module.get_mtz_columns(fileName);
                    window.CCP4Module.FS_unlink(`./${fileName}`)
                    let newColumns = {}
                    for (let ih = 0; ih < header_info.size(); ih += 2) {
                        newColumns[header_info.get(ih + 1)] = header_info.get(ih)
                    }
                    console.log(newColumns)
                    resolve(newColumns)
                })
        })
    }
    loadFromData(data) {

    }
}

export const centreOnGemmiAtoms = (atoms) => {
    const atomCount = atoms.length
    if (atomCount === 0) {
        return [0, 0, 0]
    }

    let xtot = 0.0
    let ytot = 0.0
    let ztot = 0.0
    
    for (const atom of atoms) {
        xtot += atom.pos.x
        ytot += atom.pos.y
        ztot += atom.pos.z
    }
    
    return [-xtot/atomCount, -ytot/atomCount, -ztot/atomCount]
    
}

export const cidToSpec = (cid) => {
    //molNo, chain_id, res_no, ins_code, alt_conf
    const cidTokens = cid.split('/')
    const chain_id = cidTokens[2]
    const res_no = parseInt(cidTokens[3])
    const atom_name = cidTokens[4].split(":")[0]
    const ins_code = cidTokens[3].split(".").length > 1 ? cidTokens[3].split(".")[1] : ""
    const alt_conf = cidTokens[4].split(":").length > 1 ? cidTokens[4].split(":")[1] : ""
    return { chain_id, res_no, atom_name, ins_code, alt_conf }
}
