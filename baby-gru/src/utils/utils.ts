import { hexToRgb } from "@mui/material";
import localforage from 'localforage';
import * as vec3 from 'gl-matrix/vec3';
import * as mat3 from 'gl-matrix/mat3';
import { moorhen } from "../types/moorhen";
import { gemmi } from "../types/gemmi";
import { webGL } from "../types/mgWebGL";
import { libcootApi } from "../types/libcoot";
import store from '../store/MoorhenReduxStore'

export const parseAtomInfoLabel = (atomInfo: moorhen.AtomInfo) => {
    return `/${atomInfo.mol_name}/${atomInfo.chain_id}/${atomInfo.res_no}(${atomInfo.res_name})/${atomInfo.name}${atomInfo.has_altloc ? `:${atomInfo.alt_loc}` : ""}`
}

export const getCentreAtom = async (molecules: moorhen.Molecule[], commandCentre: React.RefObject<moorhen.CommandCentre>, glRef: React.RefObject<webGL.MGWebGL>): Promise<[moorhen.Molecule, string]> => {
    const visibleMolecules: moorhen.Molecule[] = molecules.filter((molecule: moorhen.Molecule) => molecule.isVisible())
    const originState = store.getState().glRef.origin
    if (visibleMolecules.length === 0) {
        return [null, null]
    }
    const response = await commandCentre.current.cootCommand({
        returnType: "int_string_pair",
        command: "get_active_atom",
        commandArgs: [...originState.map(coord => coord * -1), visibleMolecules.map(molecule => molecule.molNo).join(':')]
    }, false) as moorhen.WorkerResponse<libcootApi.PairType<number, string>>
    const moleculeMolNo: number = response.data.result.result.first
    const residueCid: string = response.data.result.result.second
    const selectedMolecule = visibleMolecules.find((molecule: moorhen.Molecule) => molecule.molNo === moleculeMolNo)
    return [selectedMolecule, residueCid]
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const formatLigandSVG = (svg: string, edit_VB: boolean): string => {
    
    const parser = new DOMParser()
    let theText = svg
    const doc = parser.parseFromString(theText, "image/svg+xml")
    let xmin = 999
    let ymin = 999
    let xmax = -999
    let ymax = -999
    
    const lines = doc.getElementsByTagName("line")
    for (const l of lines) {
        const x1 = parseFloat(l.getAttribute("x1"))
        const y1 = parseFloat(l.getAttribute("y1"))
        const x2 = parseFloat(l.getAttribute("x2"))
        const y2 = parseFloat(l.getAttribute("y2"))
        if(x1>xmax) xmax = x1
        if(x1<xmin) xmin = x1
        if(y1>ymax) ymax = y1
        if(y1<ymin) ymin = y1
        if(x2>xmax) xmax = x2
        if(x2<xmin) xmin = x2
        if(y2>ymax) ymax = y2
        if(y2<ymin) ymin = y2
    }
    
    const texts = doc.getElementsByTagName("text");
    for (const t of texts) {
        const x = parseFloat(t.getAttribute("x"))
        const y = parseFloat(t.getAttribute("y"))
        if(x>xmax) xmax = x
        if(x<xmin) xmin = x
        if(y>ymax) ymax = y
        if(y<ymin) ymin = y
    }
    
    const polygons = doc.getElementsByTagName("polygon");
    for (const poly of polygons) {
        const points = poly.getAttribute("points").trim().split(" ")
        for (const point of points) {
            const xy = point.split(",")
            const x = parseFloat(xy[0])
            const y = parseFloat(xy[1])
            if(x>xmax) xmax = x
            if(x<xmin) xmin = x
            if(y>ymax) ymax = y
            if(y<ymin) ymin = y
        }
    }

    xmin -= 20
    ymin -= 20
    xmax += 30
    ymax -= ymin - 10
    const svgs = doc.getElementsByTagName("svg")
    const viewBoxStr = xmin+" "+ymin+" "+xmax+" "+ymax
    for (const item of svgs) {
        if(edit_VB) item.setAttribute("viewBox" , viewBoxStr)
        item.setAttribute("width" , "100%")
        item.setAttribute("height" , "100%")
        theText = item.outerHTML
    }
    
    return theText 
}

export const rgbToHsv = (r: number, g:number, b:number): [number, number, number] => {
    const cMax = Math.max(r, g, b)
    const cMin = Math.min(r, g, b)
    const delta = cMax - cMin

    let hue: number
    if (delta === 0) {
        hue = 0
    } else if (r === cMax) {
        hue = 60 * (((g - b) / delta) % 6)
    } else if (g === cMax) {
        hue = 60 * (((b - r) / delta) + 2)
    } else {
        hue = 60 * (((r - g) / delta) + 4)
    }

    let saturation: number
    if (cMax === 0) {
        saturation = 0
    } else {
        saturation = delta / cMax
    }

    return [hue, saturation, cMax]
}

export const hsvToRgb = (hue: number, saturation: number, value: number): [number, number, number] => {
    const c = value * saturation
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1))
    const m = value - c
    let rgb: [number, number, number]

    if (0 <= hue && hue < 60) {
        rgb = [c, x, 0]
    } else if (60 <= hue && hue < 120) {
        rgb = [x, c, 0]
    } else if (120 <= hue && hue < 180) {
        rgb = [0, c, x]
    } else if (180 <= hue && hue < 240) {
        rgb = [0, x, c]
    } else if (240 <= hue && hue < 300) {
        rgb = [x, 0, c]
    } else if (300 <= hue && hue < 360) {
        rgb = [c, 0, x]
    }

    return rgb.map(component => component + m) as [number, number, number]
}

// From: https://stackoverflow.com/a/44134328
export const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export const getRandomPastelColour = () => {
    const randomHue = Math.floor(Math.random() * 360);
    return hslToHex(randomHue, 80, 70)
}

export const getRandomMoleculeColour = (min: number = 127, max: number = 160) => {
    const randomComponent_A = Math.floor(Math.random() * (max - min + 1)) + min
    const randomComponent_B = max
    const randomComponent_C = min
    let result = [randomComponent_A, randomComponent_B, randomComponent_C]
    result = result.sort((a, b) => 0.5 - Math.random());
    return rgbToHex(...result as [number, number, number])
}

export function guid(): string {
    let d = Date.now();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

export function sequenceIsValid(sequence: moorhen.ResidueInfo[]): boolean {
    // If no sequence is present
    if (!sequence || sequence.length === 0) {
        return false
    }
    // If any residue doesn't have rigth attributes
    if (sequence.some(residue => !Object.keys(residue).includes('resNum') || !Object.keys(residue).includes('resCode'))) {
        return false
    }
    // If any of the residues has undefined or Nan as the residue code or residue number
    if (sequence.some(residue => residue.resNum === null || isNaN(residue.resNum) || typeof residue.resNum === 'undefined' || residue.resCode === null || typeof residue.resCode === 'undefined')) {
        return false
    }
    return true
}

export function convertRemToPx(rem: number): number {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function convertPxToRem(px: number): number {
    return +(px / parseFloat(getComputedStyle(document.documentElement).fontSize)).toPrecision(2);
}

export function convertViewtoPx(input: number, height: number): number {
    return height * (input / 100)
}

export const readTextFile = (source: File): Promise<ArrayBuffer | string> => {
    const resolveReader = (reader: FileReader, resolveCallback) => {
        reader.removeEventListener("load", resolveCallback)
        resolveCallback(reader.result)
    }

    return new Promise((resolve, reject) => {
        const reader: FileReader = new FileReader();
        reader.addEventListener("load", () => resolveReader(reader, resolve))
        reader.readAsText(source);
    })
}

export const readDataFile = (source: File): Promise<ArrayBuffer> => {
    const resolveReader = (reader: FileReader, resolveCallback) => {
        reader.removeEventListener("load", resolveCallback)
        if (typeof reader.result === 'string') {
            resolveCallback(JSON.parse(reader.result));
        } else {
            resolveCallback(reader.result)
        }
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolveReader(reader, resolve))
        reader.readAsArrayBuffer(source)
    })
}

const downloadFile = (file: File, fileName: string) => {
    const url = window.URL.createObjectURL(file);
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;

    document.body.appendChild(link);

    link.click();

    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export const doDownload = (data: BlobPart[], fileName: string) => {
    const file = new File(data, fileName, { type: 'application/octet-stream' });
    downloadFile(file, fileName)
}

export const doDownloadText = (text: string, fileName: string) => {
    const file = new File([text], fileName, { type: 'text/plain' });
    downloadFile(file, fileName)
}

export const readGemmiStructure = (coordData: ArrayBuffer | string, molName: string): gemmi.Structure => {
    const structure: gemmi.Structure = window.CCP4Module.read_structure_from_string(coordData, molName)
    return structure
}

export const readGemmiCifDocument = (coordData: string): gemmi.cifDocument => {
    const doc: gemmi.cifDocument = window.CCP4Module.read_string(coordData)
    return doc
}

export const centreOnGemmiAtoms = (atoms: moorhen.AtomInfo[]): [number, number, number] => {
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

    return [-xtot / atomCount, -ytot / atomCount, -ztot / atomCount]
}

export const atomInfoToResSpec = (atom: moorhen.AtomInfo) => {
    return { 
        mol_no: atom.mol_name,
        chain_id: atom.chain_id,
        res_no: parseInt(atom.res_no), 
        res_name: atom.res_name,
        atom_name: atom.name,
        // FIXME: Atom info does not contain a ins_code field ?? Or is it atom.serial ?
        ins_code: "",
        alt_conf: atom.alt_loc,
        cid: parseAtomInfoLabel(atom),
        // FIXME: Atom info does not contain a model name. This is probably not a problem...
        mol_name: "",
    }
}

export const cidToSpec = (cid: string): moorhen.ResidueSpec => {
    //molNo, chain_id, res_no, ins_code, alt_conf
    const ResNameRegExp = /\(([^)]+)\)/;
    const cidTokens = cid.split('/')
    const mol_name = cidTokens[0]
    const mol_no = cidTokens[1]
    const chain_id = cidTokens[2]
    const res_no = parseInt(cidTokens[3])
    const res_name = ResNameRegExp.exec(cidTokens[3])?.length > 0 ? ResNameRegExp.exec(cidTokens[3])[0].replace('(', '').replace(')', '') : null
    const ins_code = (cidTokens.length > 3 && cidTokens[3].split(".").length > 1) ? cidTokens[3].split(".")[1] : ""
    const atom_name = cidTokens.length > 4 ? cidTokens[4].split(":")[0] : ""
    const alt_conf = atom_name && cidTokens[4].split(":").length > 1 ? cidTokens[4].split(":")[1] : ""
    return { mol_name, mol_no, chain_id, res_no, res_name, atom_name, ins_code, alt_conf, cid }
}


export const cidToAtomInfo = (cid: string): moorhen.AtomInfo => {
    const resSpec = cidToSpec(cid)
    return {
        x: null,
        y: null,
        z: null,
        charge: null,
        element: null,
        tempFactor: null,
        serial: null,
        occupancy: null,
        name: resSpec.atom_name,
        has_altloc: resSpec.alt_conf !== "",
        alt_loc: resSpec.alt_conf,
        mol_name: resSpec.mol_no,
        chain_id: resSpec.chain_id,
        res_no: resSpec.res_no.toString(),
        res_name: resSpec.res_name,
    }
}

type ResidueInfoType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
    resCode: string;
}

export const getResidueInfo = (molecules: moorhen.Molecule[], selectedMolNo: number, selectedChain: string, selectedResidueIndex: number): ResidueInfoType => {
    const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo)
    if (selectedMolecule) {
        const sequence = selectedMolecule.sequences.find(sequence => sequence.chain === selectedChain)
        if (sequence) {
            const sequenceData = sequence.sequence
            const { resNum, resCode } = sequenceData[selectedResidueIndex];
            if (resNum && resNum > -1) {
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

export const getTooltipShortcutLabel = (shortCut: moorhen.Shortcut): string => {
    const modifiers = []
    if (shortCut.modifiers.includes('shiftKey')) modifiers.push("Shift")
    if (shortCut.modifiers.includes('ctrlKey')) modifiers.push("<Ctrl>")
    if (shortCut.modifiers.includes('metaKey')) modifiers.push("<Meta>")
    if (shortCut.modifiers.includes('altKey')) modifiers.push("<Alt>")
    if (shortCut.keyPress === " ") modifiers.push("<Space>")
    return modifiers.length > 0 ? `<${modifiers.join(" ")} ${shortCut.keyPress.toUpperCase()}>` : `<${shortCut.keyPress.toUpperCase()}>`
}

export function componentToHex(c: number): string {
    const hex = c.toString(16)
    return hex.length === 1 ? "0" + hex : hex
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

const getChainColourRamp = (residueCids: string[]) => {
    const delta = 240 / residueCids.length
    const colours = residueCids.map((cid, index) => {
        const rgb = hsvToRgb(240 - Math.round(delta * index), 1, 1)
        const hex = rgbToHex(...rgb.map(i => Math.round(i * 255)) as [number, number, number])
        return `${cid}^${hex}`
    })
    return colours.join('|')
}

const getBfactorColourRules = (bFactors: { cid: string; bFactor: number; normalised_bFactor: number }[], normaliseBFactors: boolean = true): string => {
    const getColour = (bFactor: number): string => {
        let r: number, g: number, b: number
        if (bFactor <= 25) {
            r = 0
            g = Math.round(10.2 * bFactor)
            b = 255
        } else if (bFactor <= 50) {
            r = 0
            g = 255
            b = Math.round(510 - 10.2 * bFactor)
        } else if (bFactor <= 75) {
            r = Math.round(10.2 * (bFactor - 50))
            g = 255
            b = 0
        } else {
            r = 255
            g = Math.round(510 - 10.2 * (bFactor - 50))
            b = 0
        }
        return rgbToHex(r, g, b)
    }
    
    const bFactorAttr = normaliseBFactors ? 'normalised_bFactor' : 'bFactor'
    return bFactors.map(item => `${item.cid}^${getColour(item[bFactorAttr])}`).join('|')
}

const getPlddtColourRules = (plddtList: { cid: string; bFactor: number; }[]): string => {
    const getColour = (plddt: number) => {
        let r: number, g: number, b: number
        if (plddt <= 50) {
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

const getNcsColourRules = (ncsRelatedChains: string[][]): string => {
    const result: string[]  = []
    ncsRelatedChains.forEach(chains => {
        const randColour = getRandomMoleculeColour()
        chains.forEach(chain => {
            result.push(`//${chain}^${randColour}`)
        })
    })
    return result.join('|')
}

const getSecondaryStructureColourRules = (secondaryStructureInfo: libcootApi.ResidueSpecJS[]): string => {
    const result: string[] = []
    const chainSS2Info: { [chainId: string]: { [ss2: number]: number[] } } = {}

    const alphaHelix = '#d13d62'
    const betaStrand = '#4b57bd'
    const turn = '#d1c03d'
    
    secondaryStructureInfo.forEach(residue => {
        if (!(residue.chainId in chainSS2Info)) {
            chainSS2Info[residue.chainId] = { 1: [], 2: [], 3: [] }
        }
        const ss2Type = residue.intUserData === 6 ? 1 : [1, 2].includes(residue.intUserData) ? 2 : 3
        chainSS2Info[residue.chainId][ss2Type].push(residue.resNum)
    })
    
    for (const chainId in chainSS2Info) {
        for (const ss2Info in chainSS2Info[chainId]) {
            if (chainSS2Info[chainId][ss2Info].length > 0) {
                const residueRanges = findConsecutiveRanges(chainSS2Info[chainId][ss2Info])
                residueRanges.forEach(residueRange => {
                    result.push(`//${chainId}/${residueRange[0]}-${residueRange[1]}^${ss2Info === '1' ? alphaHelix : ss2Info === '2' ? betaStrand : turn}`)
                })
            }
        }
    }

    return result.join('|')
}

export const getMultiColourRuleArgs = async (molecule: moorhen.Molecule, ruleType: string): Promise<string> => {

    let multiRulesArgs: string
    switch (ruleType) {
        case 'secondary-structure':
            const secondaryStructureInfo = await molecule.getSecondaryStructInfo()
            multiRulesArgs = getSecondaryStructureColourRules(secondaryStructureInfo)
            break;
        case 'jones-rainbow':
            const chainResidueInfo = molecule.sequences.map(sequence => sequence.sequence.map(residue => {
                return residue.cid
            }))
            multiRulesArgs = chainResidueInfo.map(chainInfo => getChainColourRamp(chainInfo)).join("|")
            break;
        case 'b-factor':
        case 'b-factor-norm':
            const bFactors = molecule.getResidueBFactors()
            multiRulesArgs = getBfactorColourRules(bFactors, ruleType === 'b-factor-norm')
            break;
        case 'af2-plddt':
            const plddt = molecule.getResidueBFactors()
            multiRulesArgs = getPlddtColourRules(plddt)
            break;
        case 'mol-symm':
            const ncsRelatedChains = await molecule.getNcsRelatedChains()
            multiRulesArgs = getNcsColourRules(ncsRelatedChains)
            break;
        default:
            console.log('Unrecognised colour rule...')
            break;
    }

    return multiRulesArgs
}

export const hexToHsl = (hex: string): [number, number, number] => {
    let [r, g, b]: number[] = hexToRgb(hex).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number, s: number, l: number = (max + min) / 2;

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

    return [h, s, l];
}

export const hexToRGB = (hex: string): [number, number, number] => {
    const hexWithoutHash = hex.replace('#', '');
    const r = parseInt(hexWithoutHash.slice(0, 2), 16);
    const g = parseInt(hexWithoutHash.slice(2, 4), 16);
    const b = parseInt(hexWithoutHash.slice(4, 6), 16);
    return [r, g, b];
}

export const createLocalStorageInstance = (name: string, empty: boolean = false): moorhen.LocalStorageInstance => {
    const instance = localforage.createInstance({
        driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
        name: name,
        storeName: name
    })
    if (empty) {
        instance.clear()
    }
    return instance
}

export const getDashedCylinder = (nsteps: number, cylinder_accu: number): [number[], number[], number[]] => {
    const thisPos = []
    const thisNorm = []
    const thisIdxs = []

    let ipos = 0
    let maxIdx = 0

    const dash_step = 1.0 / nsteps

    for (let i = 0; i < nsteps / 2; i++, ipos += 2) {
        const z = ipos * dash_step;
        const zp1 = (ipos + 1) * dash_step;
        for (let j = 0; j < 360; j += 360 / cylinder_accu) {
            const theta1 = j * Math.PI / 180.0;
            const theta2 = (j + 360 / cylinder_accu) * Math.PI / 180.0;
            const x1 = Math.sin(theta1);
            const y1 = Math.cos(theta1);
            const x2 = Math.sin(theta2);
            const y2 = Math.cos(theta2);
            thisNorm.push(...[x1, y1, 0.0])
            thisNorm.push(...[x1, y1, 0.0])
            thisNorm.push(...[x2, y2, 0.0])
            thisNorm.push(...[x2, y2, 0.0])
            thisPos.push(...[x1, y1, z])
            thisPos.push(...[x1, y1, zp1])
            thisPos.push(...[x2, y2, z])
            thisPos.push(...[x2, y2, zp1])
            thisIdxs.push(...[0 + maxIdx, 1 + maxIdx, 2 + maxIdx])
            thisIdxs.push(...[1 + maxIdx, 3 + maxIdx, 2 + maxIdx])
            maxIdx += 4
            thisPos.push(...[x1, y1, z])
            thisPos.push(...[x2, y2, z])
            thisPos.push(...[0.0, 0.0, z])
            thisNorm.push(...[0.0, 0.0, 1.0])
            thisNorm.push(...[0.0, 0.0, 1.0])
            thisNorm.push(...[0.0, 0.0, 1.0])
            thisIdxs.push(...[0 + maxIdx, 2 + maxIdx, 1 + maxIdx])
            maxIdx += 3
            thisPos.push(...[x1, y1, zp1])
            thisPos.push(...[x2, y2, zp1])
            thisPos.push(...[0.0, 0.0, zp1])
            thisNorm.push(...[0.0, 0.0, -1.0])
            thisNorm.push(...[0.0, 0.0, -1.0])
            thisNorm.push(...[0.0, 0.0, -1.0])
            thisIdxs.push(...[0 + maxIdx, 1 + maxIdx, 2 + maxIdx])
            maxIdx += 3
        }
    }

    return [thisPos, thisNorm, thisIdxs]
}

export const gemmiAtomPairsToCylindersInfo = (
    atoms: [{ x: number, y: number, z: number, serial: (number | string) }, { x: number, y: number, z: number, serial: (number | string) }][],
    size: number,
    colourScheme: { [x: string]: number[]; },
    labelled: boolean = false,
    minDist: number = 1.9,
    maxDist: number = 4.0,
    dashed: boolean = true
) => {

    const atomPairs = atoms;

    const totIdxs = []
    const totPos = []
    const totNorm = []
    const totInstance_sizes = []
    const totInstance_colours = []
    const totInstance_origins = []
    const totInstance_orientations = []
    const totInstanceUseColours = []
    const totInstancePrimTypes = []

    const [thisPos, thisNorm, thisIdxs] = getDashedCylinder(dashed ? 15 : 1, 16);

    const thisInstance_sizes = []
    const thisInstance_colours = []
    const thisInstance_origins = []
    const thisInstance_orientations = []

    const totTextPrimTypes = []
    const totTextIdxs = []
    const totTextPrimPos = []
    const totTextPrimNorm = []
    const totTextPrimCol = []
    const totTextLabels = []


    for (let iat = 0; iat < atomPairs.length; iat++) {
        const at0 = atomPairs[iat][0];
        const at1 = atomPairs[iat][1];
        const ab = vec3.create()
        const midpoint = vec3.create()

        vec3.set(ab, at0.x - at1.x, at0.y - at1.y, at0.z - at1.z)
        vec3.set(midpoint, 0.5 * (at0.x + at1.x), 0.5 * (at0.y + at1.y), 0.5 * (at0.z + at1.z))
        const l = vec3.length(ab)

        totTextLabels.push(l.toFixed(2))
        totTextIdxs.push(iat) // Meaningless, I think
        totTextPrimNorm.push(...[0, 0, 1]) // Also meaningless, I think
        totTextPrimPos.push(...[midpoint[0], midpoint[1], midpoint[2]])

        if (l > maxDist || l < minDist) continue;

        for (let ip = 0; ip < colourScheme[`${at0.serial}`].length; ip++) {
            thisInstance_colours.push(colourScheme[`${at0.serial}`][ip])
            totTextPrimCol.push(colourScheme[`${at0.serial}`][ip])
        }
        thisInstance_origins.push(at0.x, at0.y, at0.z)
        thisInstance_sizes.push(...[size, size, l])
        const v = vec3.create()
        const au = vec3.create()
        const a = vec3.create()
        const b = vec3.create()
        const aup = [
            at0.x - at1.x,
            at0.y - at1.y,
            at0.z - at1.z
        ]
        vec3.set(au, ...aup)
        vec3.normalize(a, au)
        vec3.set(b, 0.0, 0.0, -1.0)
        vec3.cross(v, a, b)
        const c = vec3.dot(a, b)
        if (Math.abs(c + 1.0) < 1e-4) {
            thisInstance_orientations.push(...[
                -1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, -1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ])
        } else {
            const s = vec3.length(v)
            const k = mat3.create()
            k.set([
                0.0, -v[2], v[1],
                v[2], 0.0, -v[0],
                -v[1], v[0], 0.0,
            ])
            const kk = mat3.create()
            mat3.multiply(kk, k, k)
            const sk = mat3.create()
            mat3.multiplyScalar(sk, k, 1.0)
            const omckk = mat3.create()
            mat3.multiplyScalar(omckk, kk, 1.0 / (1.0 + c))
            const r = mat3.create()
            r.set([
                1.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 0.0, 1.0,
            ])
            mat3.add(r, r, sk)
            mat3.add(r, r, omckk)
            thisInstance_orientations.push(...[
                r[0], r[1], r[2], 1.0,
                r[3], r[4], r[5], 1.0,
                r[6], r[7], r[8], 1.0,
                0.0, 0.0, 0.0, 1.0,
            ])
        }
    }

    totNorm.push(thisNorm)
    totPos.push(thisPos)
    totIdxs.push(thisIdxs)
    totInstance_sizes.push(thisInstance_sizes)
    totInstance_origins.push(thisInstance_origins)
    totInstance_orientations.push(thisInstance_orientations)
    totInstance_colours.push(thisInstance_colours)
    totInstanceUseColours.push(true)
    totInstancePrimTypes.push("TRIANGLES")
    if (labelled)
        totTextPrimTypes.push("TEXTLABELS")

    if (labelled)
        return {
            prim_types: [totInstancePrimTypes, totTextPrimTypes],
            idx_tri: [totIdxs, totTextIdxs],
            vert_tri: [totPos, totTextPrimPos],
            norm_tri: [totNorm, totTextPrimNorm],
            col_tri: [totInstance_colours, totTextPrimCol],
            label_tri: [[], totTextLabels],
            instance_use_colors: [totInstanceUseColours, [false]],
            instance_sizes: [totInstance_sizes, []],
            instance_origins: [totInstance_origins, []],
            instance_orientations: [totInstance_orientations, []]
        }
    else
        return {
            prim_types: [totInstancePrimTypes],
            idx_tri: [totIdxs],
            vert_tri: [totPos],
            norm_tri: [totNorm],
            col_tri: [totInstance_colours],
            instance_use_colors: [totInstanceUseColours],
            instance_sizes: [totInstance_sizes],
            instance_origins: [totInstance_origins],
            instance_orientations: [totInstance_orientations]
        }

}

export const gemmiAtomsToCirclesSpheresInfo = (atoms: moorhen.AtomInfo[], size: number, primType: string, colourScheme: { [x: string]: any[]; }) => {

    const sphere_sizes = [];
    const sphere_col_tri = [];
    const sphere_vert_tri = [];
    const sphere_idx_tri = [];
    const sphere_atoms = [];

    const totInstanceUseColours = []
    const totInstance_orientations = []

    for (let iat = 0; iat < atoms.length; iat++) {
        sphere_idx_tri.push(iat);
        sphere_vert_tri.push(atoms[iat].x);
        sphere_vert_tri.push(atoms[iat].y);
        sphere_vert_tri.push(atoms[iat].z);
        for (let ip = 0; ip < colourScheme[`${atoms[iat].serial}`].length; ip++) {
            sphere_col_tri.push(colourScheme[`${atoms[iat].serial}`][ip])
        }
        sphere_sizes.push(size);
        sphere_atoms.push(atoms[iat]);
        if (primType === "PERFECT_SPHERES") {
            totInstanceUseColours.push(true);
            totInstance_orientations.push(...[
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ])
            sphere_sizes.push(size);
            sphere_sizes.push(size);
        }
    }

    if (primType === "PERFECT_SPHERES") {
        return {
            atoms: [[sphere_atoms]],
            instance_sizes: [[sphere_sizes]],
            instance_origins: [[sphere_vert_tri]],
            instance_use_colors: [[totInstanceUseColours]],
            instance_orientations: [[totInstance_orientations]],
            col_tri: [[sphere_col_tri]],
            norm_tri: [[[sphere_vert_tri]]],
            vert_tri: [[sphere_vert_tri]],
            idx_tri: [[sphere_idx_tri]],
            prim_types: [[primType]]
        }
    } else {
        return {
            atoms: [[sphere_atoms]],
            sizes: [[sphere_sizes]],
            col_tri: [[sphere_col_tri]],
            norm_tri: [[[]]],
            vert_tri: [[sphere_vert_tri]],
            idx_tri: [[sphere_idx_tri]],
            prim_types: [[primType]]
        }
    }
}

export const findConsecutiveRanges = (numbers: number[]): [number, number][] => {
    numbers.sort((a, b) => a - b);
    const ranges: [number, number][] = [];

    let start = numbers[0];
    let end = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === end + 1) {
            end = numbers[i];
        } else {
            ranges.push([start, end]);
            start = numbers[i];
            end = numbers[i];
        }
    }

    ranges.push([start, end]);
    return ranges;
}

export function getCubeLines(unitCell: gemmi.UnitCell): [{ x: number, y: number, z: number, serial: string }, { x: number, y: number, z: number, serial: string }][] {

    const orthogonalize = (x: number, y: number, z: number) => {
        const fractPosition = new window.CCP4Module.Fractional(x, y, z)
        const orthPosition = unitCell.orthogonalize(fractPosition)
        const result = [orthPosition.x, orthPosition.y, orthPosition.z] as [number, number, number]
        fractPosition.delete()
        orthPosition.delete()
        return result
    }

    const vertices: [number, number, number][] = [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1]
    ];

    const edges: [number, number][] = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7]
    ];

    const lines: [{ x: number, y: number, z: number, serial: string }, { x: number, y: number, z: number, serial: string }][] = [];
    edges.forEach(edge => {
        const [v1Index, v2Index] = edge
        
        const [v1_x, v1_y, v1_z] = orthogonalize(...vertices[v1Index])
        const v1 = {
            x: v1_x,
            y: v1_y,
            z: v1_z,
            serial: 'unit_cell'
        };
        
        const [v2_x, v2_y, v2_z] = orthogonalize(...vertices[v2Index])
        const v2 = {
            x: v2_x,
            y: v2_y,
            z: v2_z,
            serial: 'unit_cell'
        };
        lines.push([v1, v2]);
    })

    return lines;
}

export const countResiduesInSelection = (gemmiStructure: gemmi.Structure, cidSelection?: string) => {
    const selection = new window.CCP4Module.Selection(cidSelection ? cidSelection : '/*/*/*')
    const count = window.CCP4Module.count_residues_in_selection(gemmiStructure, selection)
    selection.delete()
    return count    
}

export const copyStructureSelection = (gemmiStructure: gemmi.Structure, cidSelection?: string) => {
    const selection = new window.CCP4Module.Selection(cidSelection ? cidSelection : '/*/*/*')
    const newStruct = window.CCP4Module.remove_non_selected_atoms(gemmiStructure, selection)
    selection.delete()
    return newStruct
}

export const get_grid = (n,method="NEARSQUARE") => {
    const f = Math.floor(Math.sqrt(n))
    const c = Math.ceil(Math.sqrt(n))

    if(method==="NEARSQUARE"){
        if(f*c >= n)
            return [f,c]
        else
            return [c,c]
    }

    const shapes = []

    for(let i=1;i<=n;i++){
        for(let j=1;j<=n;j++){
            if(i*j >= n && i*j <= c*c && Math.abs(i-j)<=f){
                if(i*j - n < n){
                    const rem = i*j - n
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
