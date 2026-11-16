/**
 * Merged molecules and the contacts between two selections (wasm_src/selection-contacts.h).
 * 5a3h's BGC (//B/2) sits in the active site.
 */
jest.setTimeout(120000)

const fs = require('fs')
const path = require('path')
const { ungzip } = require('node-gzip')
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

const TEST_FILES = ['5a3h.pdb', '5a3h_no_ligand.pdb', 'BGC.cif']
const MONOMER_LIBRARY = 'data/ccp4_lib/data/monomers'
const LIGAND_CID = '//B/2'

let cootModule = null
let molecules_container = null

beforeAll(async () => {
    cootModule = await createCootModule({ print: () => {}, printErr: () => {} })
    TEST_FILES.forEach(fileName => {
        const data = fs.readFileSync(path.join(__dirname, '..', 'test_data', fileName), { encoding: 'utf8', flag: 'r' })
        cootModule.FS_createDataFile('.', fileName, data, true, true)
    })
    cootModule.FS.mkdir('COOT_BACKUP')
    const zipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'MoorhenAssets', 'data.tar.gz'), { encoding: null, flag: 'r' })
    const cootData = await ungzip(zipped)
    cootModule.FS.mkdir('data_tmp')
    cootModule.FS_createDataFile('data_tmp', 'data.tar', cootData, true, true)
    cootModule.unpackCootDataFile('data_tmp/data.tar', false, '', '')
    cootModule.FS_unlink('data_tmp/data.tar')
    // XPID adds hydrogens only when every residue type has a dictionary in its library
    try { cootModule.FS.mkdir(`${MONOMER_LIBRARY}/b`) } catch (_err) { /* exists */ }
    cootModule.FS_createDataFile(`${MONOMER_LIBRARY}/b`, 'BGC.cif', fs.readFileSync(path.join(__dirname, '..', 'test_data', 'BGC.cif'), 'utf8'), true, true)
})

afterAll(() => {
    molecules_container?.delete?.()
})

describe('merged molecules and selection contacts', () => {
    let imolFull, imolProtein, imolLigand

    beforeAll(() => {
        molecules_container = new cootModule.molecules_container_js(false)
        molecules_container.set_use_gemmi(false)
        imolFull = molecules_container.read_pdb('./5a3h.pdb')
        imolProtein = molecules_container.read_pdb('./5a3h_no_ligand.pdb')
        molecules_container.import_cif_dictionary('./BGC.cif', -999999)
        imolLigand = molecules_container.copy_fragment_using_cid(imolFull, LIGAND_CID)
    })

    const json = text => JSON.parse(text)
    const hBonds = (imol, cid1, cid2) => json(molecules_container.get_h_bonds_between_json(imol, cid1, cid2, false))
    const key = bond => `${bond.donor?.cid}|${bond.acceptor.cid}`

    test('a ligand-only molecule merged with its protein', () => {
        const merged = json(molecules_container.make_merged_molecule_json(imolProtein, '/*', imolLigand, LIGAND_CID))
        expect(merged.error).toBeUndefined()
        const ligandChains = merged.chains.filter(chain => chain.imol === imolLigand)
        expect(ligandChains).toEqual([{ chainId: 'B', imol: imolLigand, sourceChainId: 'B' }])

        const bonds = hBonds(merged.imol, '//B', '/*')
        expect(bonds.length).toBeGreaterThan(0)
        bonds.forEach(bond => {
            const ligandAtom = bond.donorSelection === 1 ? bond.donor : bond.acceptor
            expect(ligandAtom.cid.startsWith(`${LIGAND_CID}/`)).toBe(true)
            expect(bond.distance).toBeLessThan(3.95)
        })
        console.log(bonds.map(bond => `${bond.donor.cid} -> ${bond.acceptor.cid} ${bond.distance.toFixed(2)}`).join('\n'))

        // The same contacts as with the ligand inside its own molecule (but for G2F, which only 5a3h has)
        const inside = hBonds(imolFull, LIGAND_CID, '/*').filter(bond => bond.donor.resName !== 'G2F' && bond.acceptor.resName !== 'G2F')
        expect(bonds.map(key).sort()).toEqual(inside.map(key).sort())

        // FLEV runs on the merged molecule like on any other (it cannot draw this BGC, which lacks O1)
        expect(typeof molecules_container.get_svg_for_2d_ligand_environment_view(merged.imol, LIGAND_CID, false)).toBe('string')

        // Deleting it frees its index for the next one
        molecules_container.delete_merged_molecule(merged.imol)
        const again = json(molecules_container.make_merged_molecule_json(imolProtein, '/*', imolLigand, LIGAND_CID))
        expect(again.imol).toBe(merged.imol)
        molecules_container.delete_merged_molecule(again.imol)
    })

    test('a chain id already used by the first selection is renamed', () => {
        const merged = json(molecules_container.make_merged_molecule_json(imolProtein, '//A', imolFull, '//A/35-40'))
        const second = merged.chains.filter(chain => chain.imol === imolFull)
        expect(second).toHaveLength(1)
        expect(second[0].sourceChainId).toBe('A')
        expect(second[0].chainId).not.toBe('A')
        molecules_container.delete_merged_molecule(merged.imol)
    })

    test('salt bridges between two parts of a protein', () => {
        const bridges = json(molecules_container.get_salt_bridges_json(imolProtein, '//A/4-150', '//A/151-303', 4.0))
        expect(bridges.length).toBeGreaterThan(0)
        bridges.forEach(bridge => {
            expect(bridge.atom1.resNo).toBeLessThanOrEqual(150)
            expect(bridge.atom2.resNo).toBeGreaterThan(150)
            expect(bridge.distance).toBeLessThanOrEqual(4.0)
        })
        console.log(bridges.map(b => `${b.atom1.resName} ${b.atom1.cid} (${b.charge1}) - ${b.atom2.resName} ${b.atom2.cid} ${b.distance.toFixed(2)}`).join('\n'))
    })

    test('errors are JSON, not crashes', () => {
        expect(json(molecules_container.make_merged_molecule_json(imolProtein, '/*', imolLigand, '//Z/99')).error).toBeDefined()
        expect(json(molecules_container.get_h_bonds_between_json(9999, '/*', '/*', false)).error).toBeDefined()
    })
})
