import { OverlayTrigger } from "react-bootstrap";
import { Tooltip } from "@mui/material";
import { v4 as uuidv4 } from 'uuid';
import { hexToRgb } from "@mui/material";

export function guid(){
    var d = Date.now();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c==='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

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
    'X': 'UNKOWN',
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
        xtot += atom.x
        ytot += atom.y
        ztot += atom.z
    }
    
    return [-xtot/atomCount, -ytot/atomCount, -ztot/atomCount]
}

export const getBufferAtoms = (gemmiStructure, exclude_ligands_and_waters=false) => {
        if (exclude_ligands_and_waters) {
            window.CCP4Module.remove_ligands_and_waters_structure(gemmiStructure)
        }
   
        let atomList = []

        try {
            const models = gemmiStructure.models
            for (let modelIndex = 0; modelIndex < models.size(); modelIndex++) {
                const model = models.get(modelIndex)
                const modelName = model.name
                const chains  = model.chains
                const chainsSize = chains.size()
                for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                    const chain = chains.get(chainIndex)
                    const chainName = chain.name
                    const residues = chain.residues
                    const residuesSize = residues.size()
                    for (let residueIndex = 0; residueIndex < residuesSize; residueIndex++) {
                        const residue = residues.get(residueIndex)
                        const residueName = residue.name
                        const residueSeqId = residue.seqid
                        const resNum = residueSeqId.str()
                        const atoms = residue.atoms
                        const atomsSize = atoms.size()
                        for (let atomIndex = 0; atomIndex < atomsSize; atomIndex++) {
                            const atom = atoms.get(atomIndex)
                            const atomPos = atom.pos
                            const atomPosX = atomPos.x
                            const atomPosY = atomPos.y
                            const atomPosZ = atomPos.z
                            const atomElement = atom.element
                            const atomElementString = window.CCP4Module.getElementNameAsString(atomElement)
                            const atomCharge = atom.charge
                            const atomTemp = atom.b_iso
                            const atomName = atom.name
                            const atomAltLoc = atom.altloc
                            const atomHasAltLoc = atom.has_altloc()
                            atomList.push({
                                pos: [atomPosX, atomPosY, atomPosZ],
                                x: atomPosX,
                                y: atomPosY,
                                z: atomPosZ,
                                tempFactor: atomTemp,
                                charge: atomCharge,
                                symbol: atomElementString,
                                label: `/${modelName}/${chainName}/${resNum}(${residueName})/${atomName}${atomHasAltLoc ? ':' + String.fromCharCode(atomAltLoc) : ''}`
                            })
                            atom.delete()
                            atomPos.delete()
                            atomElement.delete()
                        }
                        residue.delete()
                        residueSeqId.delete()
                        atoms.delete()
                    }
                    chain.delete()
                    residues.delete()
                }
                model.delete()
                chains.delete()
            }
            models.delete()
        } finally {
            if (gemmiStructure && !gemmiStructure.isDeleted()) {
                gemmiStructure.delete()
            }
        }

        return atomList
}

export const cidToSpec = (cid) => {
    //molNo, chain_id, res_no, ins_code, alt_conf
    const cidTokens = cid.split('/')
    const chain_id = cidTokens[2]
    const res_no = parseInt(cidTokens[3])
    const atom_name = cidTokens[4].split(":")[0]
    const ins_code = cidTokens[3].split(".").length > 1 ? cidTokens[3].split(".")[1] : ""
    const alt_conf = cidTokens[4].split(":").length > 1 ? cidTokens[4].split(":")[1] : ""
    return { chain_id, res_no, atom_name, ins_code, alt_conf, cid }
}

export const getResidueInfo = (molecules, selectedMolNo, selectedChain, selectedResidueIndex) => {
    const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo)
    if (selectedMolecule) {
        const sequence = selectedMolecule.sequences.find(sequence => sequence.chain === selectedChain)
        if (sequence) {
            const sequenceData = sequence.sequence
            const {resNum, resCode} = sequenceData[selectedResidueIndex];
            if(resNum && resNum > -1){
                return {
                    modelIndex: 0,
                    molName: selectedMolecule.name, 
                    chain: selectedChain,
                    seqNum: resNum,
                    resCode: resCode
                }
            }        
        }
    }
}

export const getTooltipShortcutLabel = (shortCut) => {
    let modifiers = []
    if (shortCut.modifiers.includes('shiftKey')) modifiers.push("Shift")
    if (shortCut.modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
    if (shortCut.modifiers.includes('metaKey')) modifiers.push("<Meta>")
    if (shortCut.modifiers.includes('altKey')) modifiers.push("<Alt>")
    if (shortCut.keyPress === " ") modifiers.push("<Space>")
    return modifiers.length > 0 ? `<${modifiers.join(" ")} ${shortCut.keyPress.toUpperCase()}>` : `<${shortCut.keyPress.toUpperCase()}>`
}

const getMoleculeBfactors = (gemmiStructure) => {
    let bFactors = []
    try {
        const models = gemmiStructure.models
        for (let modelIndex = 0; modelIndex < models.size(); modelIndex++) {
            const model = models.get(modelIndex)
            const modelName = model.name
            const chains  = model.chains
            const chainsSize = chains.size()
            for (let chainIndex = 0; chainIndex < chainsSize; chainIndex++) {
                const chain = chains.get(chainIndex)
                const chainName = chain.name
                const residues = chain.residues
                const residuesSize = residues.size()
                for (let residueIndex = 0; residueIndex < residuesSize; residueIndex++) {
                    let residueTemp = 0
                    const residue = residues.get(residueIndex)
                    const residueSeqId = residue.seqid
                    const resNum = residueSeqId.str()
                    const atoms = residue.atoms
                    const atomsSize = atoms.size()
                    for (let atomIndex = 0; atomIndex < atomsSize; atomIndex++) {
                        const atom = atoms.get(atomIndex)
                        const atomTemp = atom.b_iso
                        residueTemp += atomTemp
                        atom.delete()
                    }
                    bFactors.push({
                        cid: `/${modelName}/${chainName}/${resNum}/*`,
                        bFactor: residueTemp / atomsSize
                    })
                    residue.delete()
                    residueSeqId.delete()
                    atoms.delete()
                }
                chain.delete()
                residues.delete()
            }
            model.delete()
            chains.delete()
        }
        models.delete()
    } finally {
        if (gemmiStructure && !gemmiStructure.isDeleted()) {
            gemmiStructure.delete()
        }
    }
    return bFactors
}

export function componentToHex(c) {
    const hex = c.toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }
  
export  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

const getBfactorColourRules = (bFactors) => {
    const bFactorList = bFactors.map(item => item.bFactor)
    const min = Math.min(...bFactorList)
    const max = Math.max(...bFactorList)

    const getColour = (bFactor) => {
        let r, g, b
        const normalisedFactor = Math.round(100 * ( (bFactor - min) / (max - min) ))
        if(normalisedFactor <= 25) {
            r = 0
            g = Math.round(10.2 * normalisedFactor)
            b = 255
        } else if (normalisedFactor <= 50) {
            r = 0
            g = 255
            b = Math.round(510 - 10.2 * normalisedFactor)
        } else if (normalisedFactor <= 75) {
            r = Math.round(10.2 * (normalisedFactor - 50))
            g = 255
            b = 0
        } else {
            r = 255
            g = Math.round(510 - 10.2 * (normalisedFactor - 50))
            b = 0
        }
        return rgbToHex(r, g, b)
    }

    return bFactors.map(item => `${item.cid}^${getColour(item.bFactor)}`).join('|')
}

const getPlddtColourRules = (plddtList) => {
    const getColour = (plddt) => {
        let r, g, b
        if(plddt <= 50) {
            r = 230
            g = 113
            b = 62
        } else if (plddt <= 70) {
            r = 230
            g = 197
            b = 17
        } else if (plddt < 90) {
            r = 91
            g = 183
            b = 219
        } else {
            r = 0
            g = 75
            b = 193
        }
        return rgbToHex(r, g, b)
    }

    return plddtList.map(item => `${item.cid}^${getColour(item.bFactor)}`).join('|')
}

export const getMultiColourRuleArgs = (molecule, ruleType) => {

    let multiRulesArgs

    switch (ruleType) {
        case 'b-factor':
            const bFactors = getMoleculeBfactors(molecule.gemmiStructure.clone())
            multiRulesArgs = [molecule.molNo, getBfactorColourRules(bFactors)]
            break;
        case 'af2-plddt':
            const plddt = getMoleculeBfactors(molecule.gemmiStructure.clone())
            multiRulesArgs = [molecule.molNo, getPlddtColourRules(plddt)]
            break;
        default:
            console.log('Unrecognised colour rule...')
            break;
    }

    return multiRulesArgs
}

export const getNameLabel = (item) => {
    if (item.name.length > 9) {
        return <OverlayTrigger
                key={item.molNo}
                id="name-label-trigger"
                placement="top"
                overlay={
                    <Tooltip id="name-label-tooltip" 
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: '2px 10px',
                        color: 'white',
                        borderRadius: 3,
                    }}>
                        <div>
                            {item.name}
                        </div>
                    </Tooltip>
                }
                >
                <div>
                    {`#${item.molNo} Mol. ${item.name.slice(0,5)}...`}
                </div>
                </OverlayTrigger>
    }
    return `#${item.molNo} Mol. ${item.name}`
}

export const hexToHsl = (hex) => {
    let [r, g, b] = hexToRgb(hex).replace('rgb(', '').replace(')', '').split(', ')
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
  
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: break;
      }
  
      h /= 6;
    }
  
    return [ h, s, l ];
  }