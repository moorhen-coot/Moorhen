/**
 * Atoms that coot builds in memory must still carry an mmCIF atom name.
 *
 * mmdb keeps two atom-name fields: `name` (PDB, column-aligned) and
 * `label_atom_id` (mmCIF). Both mmCIF output routes read `label_atom_id`,
 * while PDB output reads `name`, so an atom with only `name` set writes a
 * blank atom name to mmCIF and a correct one to PDB.
 */
jest.setTimeout(120000)

const fs = require('fs')
const path = require('path')
const { ungzip } = require('node-gzip')
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

const AMINO_ACIDS = new Set(
    'ALA ARG ASN ASP CYS GLN GLU GLY HIS ILE LEU LYS MET PHE PRO SER THR TRP TYR VAL MSE'.split(' ')
)
const TEST_FILES = ['1cxq.cif', '1cxq_phases.mtz']

let cootModule = null
let molecules_container = null

/** Split an mmCIF _atom_site loop into records, keyed by the loop's own tags. */
const parseAtomSite = (mmcif) => {
    const lines = mmcif.split('\n')
    const tags = lines.map(l => l.trim()).filter(l => l.startsWith('_atom_site.')).map(l => l.trim().slice('_atom_site.'.length))
    const col = name => tags.findIndex(t => t.toLowerCase() === name.toLowerCase())
    const iLabel = col('label_atom_id')
    const iComp = col('label_comp_id')
    const iSeq = col('auth_seq_id')
    const iType = col('type_symbol')
    return lines
        .filter(l => /^\s*(ATOM|HETATM)\b/.test(l))
        .map(l => l.trim().split(/\s+/))
        .map(f => ({ label: f[iLabel], comp: f[iComp], seq: Number(f[iSeq]), type: f[iType] }))
}

/** mmCIF writes an absent value as '.' or '?'; gemmi quotes an empty string. */
const isBlankName = (label) => ['.', '?', "''", '""', '', undefined].includes(label)

beforeAll(async () => {
    cootModule = await createCootModule({ print: () => {}, printErr: () => {} })
    TEST_FILES.forEach(fileName => {
        const data = fs.readFileSync(path.join(__dirname, '..', 'test_data', fileName), {
            encoding: fileName.endsWith('.mtz') ? null : 'utf8', flag: 'r'
        })
        cootModule.FS_createDataFile('.', fileName, data, true, true)
    })
    cootModule.FS.mkdir('COOT_BACKUP')
    const zipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'MoorhenAssets', 'data.tar.gz'), { encoding: null, flag: 'r' })
    const cootData = await ungzip(zipped)
    cootModule.FS.mkdir('data_tmp')
    cootModule.FS_createDataFile('data_tmp', 'data.tar', cootData, true, true)
    cootModule.unpackCootDataFile('data_tmp/data.tar', false, '', '')
    cootModule.FS_unlink('data_tmp/data.tar')
})

afterAll(() => {
    molecules_container?.delete?.()
    molecules_container = null
    TEST_FILES.forEach(f => cootModule.FS_unlink(f))
    cootModule = null
})

describe('atom names on residues built by Add Residue', () => {
    let imol
    let addedResNo

    beforeAll(() => {
        molecules_container = new cootModule.molecules_container_js(false)
        imol = molecules_container.read_pdb('1cxq.cif')

        // add_terminal_residue searches density, so it needs a refinement map.
        const maps = molecules_container.auto_read_mtz('1cxq_phases.mtz')
        let imap = -1
        for (let i = 0; i < maps.size(); i++) {
            const info = maps.get(i)
            if (imap < 0) imap = info.idx
            if (info.F?.toUpperCase().includes('FWT')) imap = info.idx
        }
        molecules_container.set_imol_refinement_map(imap)

        // Delete the chain's last amino acid, then add it back: the "delete a
        // residue and Add Residue" sequence. The new residue is built as ALA.
        const protein = parseAtomSite(molecules_container.molecule_to_mmCIF_string(imol)).filter(a => AMINO_ACIDS.has(a.comp))
        addedResNo = Math.max(...protein.map(a => a.seq))
        molecules_container.delete_using_cid(imol, `//A/${addedResNo}`, 'RESIDUE')
        const status = molecules_container.add_terminal_residue_directly_using_cid(imol, `//A/${addedResNo - 1}`)
        expect(status).toBe(1)
    })

    test.each([
        ['molecule_to_mmCIF_string', imol => molecules_container.molecule_to_mmCIF_string(imol)],
        ['molecule_to_mmCIF_string_with_gemmi', imol => molecules_container.molecule_to_mmCIF_string_with_gemmi(imol)],
    ])('%s gives every added atom a label_atom_id', (_name, toMmcif) => {
        const added = parseAtomSite(toMmcif(imol)).filter(a => a.seq === addedResNo && a.comp === 'ALA')

        expect(added.length).toBeGreaterThan(0)
        // The carbonyl O is the atom Add Residue keeps from the phi/psi-built
        // residue rather than replacing from the standard residue, so it is the
        // one that regresses; assert on the whole residue regardless.
        expect(added.filter(a => isBlankName(a.label)).map(a => a.type)).toEqual([])
        expect(added.map(a => a.label).sort()).toEqual(['C', 'CA', 'CB', 'N', 'O'])
    })

    test('PDB output is unaffected (it writes mmdb `name`, not `label_atom_id`)', () => {
        const pdb = molecules_container.molecule_to_PDB_string(imol)
        const atoms = pdb.split('\n').filter(l => l.startsWith('ATOM') && l.includes('ALA A') && l.includes(` ${addedResNo} `))
        expect(atoms.map(l => l.slice(12, 16).trim()).sort()).toEqual(['C', 'CA', 'CB', 'N', 'O'])
    })
})
