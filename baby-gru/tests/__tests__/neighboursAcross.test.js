/**
 * cidToNeighboursCidAcross: the residues of one structure near a selection of another (a protein's
 * pocket around a ligand that is a molecule of its own). It must find what cidToNeighboursCid finds when
 * the ligand is inside the protein's structure, the ligand's own residue aside.
 */
jest.setTimeout(60000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/MoorhenAssets/wasm/moorhen')

let cootModule

beforeAll(async () => {
    cootModule = await createCootModule({ print: () => {}, printErr: () => {} })
})

const read = (text, name) => cootModule.read_structure_from_string(text, name)
const testData = fileName => fs.readFileSync(path.join(__dirname, '..', 'test_data', fileName), 'utf8')
const residues = cids => cids.split('||').filter(Boolean).sort()

test('the residues near a ligand in another structure are those near it in the same one', () => {
    const full = testData('5a3h.pdb')
    // 5a3h's glucose (BGC B/2) on its own, as a docked pose would be
    const ligandOnly = full.split('\n').filter(line => /^HETATM.{11}BGC B   2/.test(line)).join('\n') + '\nEND\n'
    const withLigand = read(full, 'full')
    const protein = read(testData('5a3h_no_ligand.pdb'), 'protein')
    const ligand = read(ligandOnly, 'ligand')

    const inside = residues(cootModule.cidToNeighboursCid(withLigand, '/*/*/*', '//B/2', 5.0, false))
        // The ligand itself, and G2F B/1 (in 5a3h, not in the ligand-free model)
        .filter(residue => !residue.startsWith('B/'))
    const across = residues(cootModule.cidToNeighboursCidAcross(protein, '/*/*/*', ligand, '/*/*/*', 5.0, false))
        .filter(residue => !residue.startsWith('B/'))

    expect(across.length).toBeGreaterThan(5)
    expect(across).toEqual(inside)
    // Closer means fewer, never more
    const closer = residues(cootModule.cidToNeighboursCidAcross(protein, '/*/*/*', ligand, '/*/*/*', 3.0, false))
    expect(closer.length).toBeLessThan(across.length)
    expect(closer.every(residue => across.includes(residue))).toBe(true)

    ;[withLigand, protein, ligand].forEach(structure => structure.delete())
})
