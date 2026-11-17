/**
 * Merged molecules and the contacts between two selections (wasm_src/selection-contacts.h).
 * 5a3h's BGC (//B/2) sits in the active site.
 */
jest.setTimeout(120000)

const fs = require('fs')
const path = require('path')
const { ungzip } = require('node-gzip')
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

const TEST_FILES = ['5a3h.pdb', '5a3h_no_ligand.pdb', '5a3h-nitrobenzene.pdb', 'BGC.cif']
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

    test('a merged molecule uses each source molecule\'s own dictionary, not a stale one at its index', () => {
        // Two ligand molecules with the same residue type, each with its own dictionary read for it only
        // (as .mol / SMILES ligands are): ligand 1 as the global BGC, ligand 2 a fluorinated variant (G2F
        // renamed). Merged in turn, the second merge reuses the first one's index.
        const fluorinated = fs.readFileSync(path.join(__dirname, '..', 'test_data', 'G2F.cif'), 'utf8').replaceAll('G2F', 'BGC')
        const plain = fs.readFileSync(path.join(__dirname, '..', 'test_data', 'BGC.cif'), 'utf8')
        const ligand1 = molecules_container.copy_fragment_using_cid(imolFull, LIGAND_CID)
        const ligand2 = molecules_container.copy_fragment_using_cid(imolFull, LIGAND_CID)
        molecules_container.read_dictionary_string(plain, ligand1)
        molecules_container.read_dictionary_string(fluorinated, ligand2)

        // Whether the BGC dictionary filed for this molecule has a fluorine (builds a monomer from it, then removes it)
        const hasFluorine = imol => {
            const monomer = molecules_container.get_monomer_from_dictionary('BGC', imol, false)
            const pdb = molecules_container.molecule_to_PDB_string(monomer)
            molecules_container.pop_back()
            return pdb.split('\n').some(line => line.startsWith('HETATM') && line.slice(76, 78).trim() === 'F')
        }
        expect(hasFluorine(ligand2)).toBe(true)

        const first = json(molecules_container.make_merged_molecule_json(imolProtein, '/*', ligand1, LIGAND_CID))
        expect(hasFluorine(first.imol)).toBe(false)
        molecules_container.delete_merged_molecule(first.imol)

        const second = json(molecules_container.make_merged_molecule_json(imolProtein, '/*', ligand2, LIGAND_CID))
        expect(second.imol).toBe(first.imol)
        // Ligand 2's own dictionary: not the global BGC (the protein side would find that one), nor
        // what the first merged molecule left at this index
        expect(hasFluorine(second.imol)).toBe(true)
        molecules_container.delete_merged_molecule(second.imol)
        // Nothing left filed under the index: back to the global BGC
        const third = json(molecules_container.make_merged_molecule_json(imolProtein, '/*', imolLigand, LIGAND_CID))
        expect(hasFluorine(third.imol)).toBe(false)
        molecules_container.delete_merged_molecule(third.imol)
    })

    test('deleting a merged molecule does not free the index of a molecule the user deleted', () => {
        const deleted = molecules_container.copy_fragment_using_cid(imolFull, LIGAND_CID)
        molecules_container.close_molecule(deleted)
        const merged = json(molecules_container.make_merged_molecule_json(imolProtein, '/*', imolLigand, LIGAND_CID))
        expect(merged.imol).toBe(deleted + 1)
        molecules_container.delete_merged_molecule(merged.imol)
        // The merged molecule's slot is gone, the deleted molecule's stays: its number is not reused
        expect(molecules_container.get_number_of_molecules()).toBe(deleted + 1)
    })

    test('a nitro group is not a salt bridge partner', () => {
        // Its dictionary gives N +1 and O -1: a charge-separated but neutral group, neither cation nor anion
        const imolNitro = molecules_container.read_pdb('./5a3h-nitrobenzene.pdb')
        const dictionary = fs.readFileSync(path.join(__dirname, '..', 'test_data', 'nitrobenzene.cif'), 'utf8')
        molecules_container.read_dictionary_string(dictionary, imolNitro)
        // Far enough to reach charged residues of the pocket, which a charged nitro would pair with
        const bridges = json(molecules_container.get_salt_bridges_json(imolNitro, '//A/301', '/*', 8.0))
        expect(bridges.filter(bridge => bridge.atom1.resName === 'LIG' || bridge.atom2.resName === 'LIG')).toEqual([])
        molecules_container.close_molecule(imolNitro)
    })

    test('errors are JSON, not crashes', () => {
        expect(json(molecules_container.make_merged_molecule_json(imolProtein, '/*', imolLigand, '//Z/99')).error).toBeDefined()
        expect(json(molecules_container.get_h_bonds_between_json(9999, '/*', '/*', false)).error).toBeDefined()
    })
})
