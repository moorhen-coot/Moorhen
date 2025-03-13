
jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const {gzip, ungzip} = require('node-gzip');

const createCootModule = require('../../public/moorhen')

let cootModule;
let cleanUpVariables = []

beforeAll(() => {
    return createCootModule({
        print(t) { () => console.log(["output", t]) },
        printErr(t) { () => console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        return setupFunctions.copyTestDataToFauxFS()
    })
})

afterAll(() => {
    setupFunctions.removeTestDataFromFauxFS()
})

describe("Testing gemmi", () => {

    afterEach(() => {
        cleanUpVariables.forEach(item => {
            if (typeof item.delete === 'function' && !item.isDeleted()) {
                item.delete()
            }
        })
        cleanUpVariables = []
    })

    test("Test small molecule to mmcif", async () => {
        const response = await fetch("https://www.crystallography.net/cod/1100231.cif")
        expect(response.ok).toBeTruthy()
        const fileContents = await response.text()
        const result = cootModule.SmallMoleculeCifToMMCif(fileContents)
        const st = cootModule.read_structure_from_string(result.first, "1100231")
        cootModule.gemmi_setup_entities(st)

        const model = st.first_model()
        const chains = model.chains
        const chain = chains.get(0)
        expect(chains.size()).toBe(1)

        const residues = chain.residues
        const residue = residues.get(0)
        const residue_seqId = residue.seqid
        expect(chains.size()).toBe(1)
        expect(chain.name).toBe('A')
        expect(residues.size()).toBe(1)
        expect(residue_seqId.str()).toBe('1')
        const atoms = residue.atoms
        expect(atoms.size()).toBe(143)

        cleanUpVariables.push(st, model, chains, chain, residues, residue_seqId, residue, atoms)

    })

    test("Test parse_mon_lib_list_cif", async () => {
        const response = await fetch("https://raw.githubusercontent.com/MonomerLibrary/monomers/master/list/mon_lib_list.cif")
        expect(response.ok).toBeTruthy()
        const fileContents = await response.text()
        const table = cootModule.parse_mon_lib_list_cif(fileContents)
        expect(table.size()).toBeGreaterThan(35000)
        cleanUpVariables.push(table)
    })

    test("Test get_coord_header_info with gemmi 3j2w.pdb", () => {
        const filePath = './3j2w.pdb'
        const st = cootModule.read_structure_file(filePath, cootModule.CoorFormat.Pdb)
        const docData = fs.readFileSync(path.join(__dirname, '..', 'test_data',filePath), 'utf8');
        const data = st.as_string()
        const header_info = cootModule.get_coord_header_info(data, docData, filePath)
        expect(header_info.title).toBe('ELECTRON CRYO-MICROSCOPY OF CHIKUNGUNYA VIRUS')
        expect(header_info.software).toBe('')
        expect(header_info.compound).toBe('')
        const author = header_info.author
        const journal = header_info.journal
        expect(author.size()).toBe(3)
        const author_1 = author.get(0)
        const author_2 = author.get(1)
        const author_3 = author.get(2)
        expect(journal.size()).toBe(0)
        expect(author_1).toBe('SUN, S.')
        expect(author_2).toBe('XIANG, Y.')
        expect(author_3).toBe('ROSSMANN, M.G.')
        cleanUpVariables.push(author,author_1,author_2,author_3,journal,header_info)
    })

    test("Test get_coord_header_info with gemmi 5a3h.mmcif", () => {
        const filePath = './5a3h.mmcif'
        const st = cootModule.read_structure_file(filePath, cootModule.CoorFormat.Mmcif)
        const docData = fs.readFileSync(path.join(__dirname, '..', 'test_data',filePath), 'utf8');
        const data = st.as_string()
        const header_info = cootModule.get_coord_header_info(data, docData, filePath)
        expect(header_info.title).toBe('2-DEOXY-2-FLURO-B-D-CELLOBIOSYL/ENZYME INTERMEDIATE COMPLEX OF THE ENDOGLUCANASE CEL5A FROM BACILLUS AGARADHEARANS AT 1.8 ANGSTROMS RESOLUTION')
        expect(header_info.software).toBe('CCP4, REFMAC, DENZO, SCALEPACK, CCP4')
        expect(header_info.compound).toBe('')
        const author = header_info.author
        expect(author.size()).toBe(13)
        const author_1 = author.get(0)
        const author_2 = author.get(1)
        const author_3 = author.get(2)
        expect(author_1).toBe('Davies, G.J.')
        expect(author_2).toBe('Mackenzie, L.')
        expect(author_3).toBe('Varrot, A.')
        const journal = header_info.journal
        expect(journal.size()).toBe(13)
        const journal_1 = journal.get(0)
        const journal_3 = journal.get(2)
        const journal_4 = journal.get(3)
        const journal_9 = journal.get(8)
        expect(journal_1).toBe('id:                            primary')
        expect(journal_3).toBe(`journal_abbrev:                Biochemistry`)
        expect(journal_4).toBe('journal_volume:                37')
        expect(journal_9).toBe('country:                       US')
        cleanUpVariables.push(author,author_1,author_2,author_3,journal_1,journal_3,journal_4,journal_9,journal,header_info)
    })

    test("Test get_coord_header_info with gemmi 8zuv_updated.cif", () => {
        const filePath = './8zuv_updated.cif'
        const st = cootModule.read_structure_file(filePath, cootModule.CoorFormat.Mmcif)
        const docData = fs.readFileSync(path.join(__dirname, '..', 'test_data',filePath), 'utf8');
        const data = st.as_string()
        const header_info = cootModule.get_coord_header_info(data, docData, filePath)
        expect(header_info.title).toBe('Crystal structure of mouse Galectin-3 in complex with small molecule inhibitor')
        expect(header_info.software).toBe('BUSTER (5.8.0232), Aimless, XDS, PHASER')
        expect(header_info.compound).toBe('')
        const author = header_info.author
        const journal = header_info.journal
        expect(author.size()).toBe(19)
        const author_1 = author.get(0)
        const author_2 = author.get(1)
        const author_3 = author.get(2)
        expect(journal.size()).toBe(13)
        expect(author_1).toBe('Yoon, D.S.')
        expect(author_2).toBe('Liu, C.')
        expect(author_3).toBe('Jalagam, P.R.')
        const journal_1 = journal.get(0)
        const journal_2 = journal.get(1)
        const journal_3 = journal.get(2)
        const journal_7 = journal.get(6)
        expect(journal_1).toBe('country:                       US')
        expect(journal_2).toBe('id:                            primary')
        expect(journal_3).toBe(`journal_abbrev:                'J. Med. Chem.'`)
        expect(journal_7).toBe('journal_volume:                67')
        cleanUpVariables.push(author,author_1,author_2,author_3,journal_1,journal_2,journal_3,journal_7,journal,header_info)
    })

    test("Test get_coord_header_info with gemmi 6owe.cif", () => {
        const filePath = './6owe.cif'
        const st = cootModule.read_structure_file(filePath, cootModule.CoorFormat.Mmcif)
        const docData = fs.readFileSync(path.join(__dirname, '..', 'test_data',filePath), 'utf8');
        const data = st.as_string()
        const header_info = cootModule.get_coord_header_info(data, docData, filePath)
        expect(header_info.title).toBe('Enoyl-CoA carboxylases/reductases in complex with ethylmalonyl CoA')
        expect(header_info.software).toBe('PHENIX ((1.15.2_3472)), XDS, XSCALE, PHASER')
        expect(header_info.compound).toBe('')
        const author = header_info.author
        const journal = header_info.journal
        expect(author.size()).toBe(10)
        const author_1 = author.get(0)
        const author_2 = author.get(1)
        const author_3 = author.get(2)
        expect(journal.size()).toBe(13)
        expect(author_1).toBe('Stoffel, G.M.M.')
        expect(author_2).toBe('Saez, D.A.')
        expect(author_3).toBe('DeMirci, H.')
        const journal_1 = journal.get(0)
        const journal_2 = journal.get(1)
        const journal_3 = journal.get(2)
        const journal_7 = journal.get(6)
        expect(journal_1).toBe('country:                       US')
        expect(journal_2).toBe('id:                            primary')
        expect(journal_3).toBe(`journal_abbrev:                Proc.Natl.Acad.Sci.USA`)
        expect(journal_7).toBe('journal_volume:                116')
        cleanUpVariables.push(author,author_1,author_2,author_3,journal_1,journal_2,journal_3,journal_7,journal,header_info)
    })

    test("Test assembly 3j2w.pdb", () => {
        const st = cootModule.read_structure_file('./3j2w.pdb', cootModule.CoorFormat.Pdb)
        const assemblies = st.assemblies
        const n_assembly = assemblies.size()
        expect(n_assembly).toBe(1)
        const i = 0
        const assembly = assemblies.get(i)
        const generators = assembly.generators
        const n_gen = generators.size()
        expect(n_gen).toBe(1)
        const j = 0
        const gen = generators.get(j)
        const chains = gen.chains
        const subchains = gen.subchains
        const operators = gen.operators
        const n_ch = chains.size()
        const n_sub_ch = subchains.size()
        const n_op = operators.size()
        expect(n_ch).toBe(20)
        expect(n_sub_ch).toBe(0)
        expect(n_op).toBe(60)
        const ch_A = chains.get(0)
        cleanUpVariables.push(ch_A)
        const ch_M = chains.get(1)
        cleanUpVariables.push(ch_M)
        const ch_B = chains.get(2)
        cleanUpVariables.push(ch_B)
        const ch_N = chains.get(3)
        cleanUpVariables.push(ch_N)
        expect(ch_A).toBe("A")
        expect(ch_B).toBe("B")
        expect(ch_N).toBe("N")
        expect(ch_M).toBe("M")

        const op = operators.get(59)
        const transform = op.transform
        const vec = transform.vec
        const mat = transform.mat
        const mat_array = mat.as_array()
        expect(vec.x).toBeCloseTo(0.0,3)
        expect(vec.y).toBeCloseTo(0.0,3)
        expect(vec.z).toBeCloseTo(0.0,3)
        expect(mat_array[0]).toBeCloseTo( 0.809017,5)
        expect(mat_array[1]).toBeCloseTo(-0.309017,5)
        expect(mat_array[2]).toBeCloseTo(-0.5,5)
        expect(mat_array[3]).toBeCloseTo( 0.309017,5)
        expect(mat_array[4]).toBeCloseTo(-0.5,5)
        expect(mat_array[5]).toBeCloseTo( 0.809017,5)
        expect(mat_array[6]).toBeCloseTo(-0.5,5)
        expect(mat_array[7]).toBeCloseTo(-0.809017,5)
        expect(mat_array[8]).toBeCloseTo(-0.309017,5)
        cleanUpVariables.push(op,transform,vec,mat)

        cleanUpVariables.push(gen,chains,subchains,operators)
        cleanUpVariables.push(assembly,generators)
        cleanUpVariables.push(assemblies,st)
    })

    test("Test assembly 3j2w_updated.cif", () => {
        const st = cootModule.read_structure_file('./3j2w_updated.cif', cootModule.CoorFormat.Mmcif)
        const assemblies = st.assemblies
        const n_assembly = assemblies.size()
        expect(n_assembly).toBe(1)
        const i = 0
        const assembly = assemblies.get(i)
        const generators = assembly.generators
        const n_gen = generators.size()
        expect(n_gen).toBe(1)
        const j = 0
        const gen = generators.get(j)
        const chains = gen.chains
        const subchains = gen.subchains
        const operators = gen.operators
        const n_ch = chains.size()
        const n_sub_ch = subchains.size()
        const n_op = operators.size()
        expect(n_ch).toBe(0)
        expect(n_sub_ch).toBe(20)
        expect(n_op).toBe(60)
        const ch_A = subchains.get(0)
        cleanUpVariables.push(ch_A)
        const ch_B = subchains.get(1)
        cleanUpVariables.push(ch_B)
        const ch_C = subchains.get(2)
        cleanUpVariables.push(ch_C)
        const ch_D = subchains.get(3)
        cleanUpVariables.push(ch_D)
        expect(ch_A).toBe("A")
        expect(ch_B).toBe("B")
        expect(ch_C).toBe("C")
        expect(ch_D).toBe("D")

        const op = operators.get(59)
        const transform = op.transform
        const vec = transform.vec
        const mat = transform.mat
        const mat_array = mat.as_array()
        expect(vec.x).toBeCloseTo(0.0,3)
        expect(vec.y).toBeCloseTo(0.0,3)
        expect(vec.z).toBeCloseTo(0.0,3)
        expect(mat_array[0]).toBeCloseTo( 0.809017,5)
        expect(mat_array[1]).toBeCloseTo(-0.309017,5)
        expect(mat_array[2]).toBeCloseTo(-0.5,5)
        expect(mat_array[3]).toBeCloseTo( 0.309017,5)
        expect(mat_array[4]).toBeCloseTo(-0.5,5)
        expect(mat_array[5]).toBeCloseTo( 0.809017,5)
        expect(mat_array[6]).toBeCloseTo(-0.5,5)
        expect(mat_array[7]).toBeCloseTo(-0.809017,5)
        expect(mat_array[8]).toBeCloseTo(-0.309017,5)
        cleanUpVariables.push(op,transform,vec,mat)

        cleanUpVariables.push(gen,chains,subchains,operators)
        cleanUpVariables.push(assembly,generators)
        cleanUpVariables.push(assemblies,st)
    })

    test("Test read structure file", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        const models = st.models
        expect(st.has_origx).toBeTruthy()
        expect(st.spacegroup_hm).toBe('P 21 21 21')
        expect(models.size()).toBe(1)

        const model = st.first_model()
        const modelMass = cootModule.calculate_mass_model(model)
        expect(modelMass).toBeCloseTo(37224.72, 1)

        const chains = model.chains
        expect(chains.size()).toBe(3)

        const chain = chains.get(0)
        expect(cootModule.calculate_mass_chain(chain)).toBeCloseTo(31365.81, 1)
        expect(chain.name).toBe('A')

        const residues = chain.residues
        expect(residues.size()).toBe(300)

        const residue = residues.get(0)
        expect(residue.name).toBe('SER')

        const atoms = residue.atoms
        expect(atoms.size()).toBe(6)

        const atom = atoms.get(0)
        expect(atom.name).toBe('N')
        expect(cootModule.getElementNameAsString(atom.element)).toBe('N')
        cleanUpVariables.push(st, model, models, chain, chains, residue, residues, atom, atoms)
    })

    test("Test ligands", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st)
        const model = st.first_model()
        const chains = model.chains

        const chain = chains.get(1)
        expect(chain.name).toBe('B')

        const ligands = chain.get_ligands_const()
        expect(ligands.size()).toBe(2)

        const ligand = ligands.at(0)
        expect(ligand.name).toBe('G2F')

        cleanUpVariables.push(st, model, chain, chains, ligand, ligands)
    })

    test("Test waters", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st)
        const model = st.first_model()
        const chains = model.chains

        const chain = chains.get(2)
        expect(chain.name).toBe('A')

        const waters = chain.get_waters_const()
        expect(waters.size()).toBe(348)

        const water = waters.at(0)
        expect(water.name).toBe('HOH')
        const waterSeqId = water.seqid
        expect(waterSeqId.str()).toBe('901')

        cleanUpVariables.push(st, model, chain, chains, water, waters, waterSeqId)

    })

    test("Test remove waters and ligands", () => {
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st)
        cootModule.remove_ligands_and_waters_structure(st)
        st.remove_empty_chains()
        const model = st.first_model()
        const chains = model.chains
        expect(chains.size()).toBe(1)
        cleanUpVariables.push(st, model, chains)
    })

    test("Test spacegroups", () => {
        const sgp1 = cootModule.get_spacegroup_by_name('P1')
        expect(cootModule.getSpaceGroupHMAsString(sgp1)).toBe('P 1')
        expect(sgp1.hm()).toBe('P 1')
        expect(cootModule.getSpaceGroupHallAsString(sgp1)).toBe('P 1')
        expect(cootModule.getSpaceGroupHallAsString(sgp1)).toBe('P 1')
        cleanUpVariables.push(sgp1)
    })

    test("Test count_residues_in_selection", () => {
        const selection = new cootModule.Selection('//A/31-33/*')
        const st = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        const residue_count = cootModule.count_residues_in_selection(st, selection)
        expect(residue_count).toBe(3)
        cleanUpVariables.push(st)
    })

    test("Test remove_non_selected_residues", () => {
        const selection = new cootModule.Selection('//A/31-33/*')
        const st_1 = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st_1)
        const st_2 = cootModule.remove_non_selected_atoms(st_1, selection)

        const model_1 = st_1.first_model()
        const chains_1 = model_1.chains
        // Expect the original structure to be unchanged
        expect(chains_1.size()).toBe(3)

        const model_2 = st_2.first_model()
        const chains_2 = model_2.chains
        const chain_2 = chains_2.get(0)
        const residues_2 = chain_2.residues
        const residue_2 = residues_2.get(0)
        const residue_2_seqId = residue_2.seqid
        expect(chains_2.size()).toBe(1)
        expect(chain_2.name).toBe('A')
        expect(residues_2.size()).toBe(3)
        expect(residue_2_seqId.str()).toBe('31')

        cleanUpVariables.push(st_1, st_2, model_1, chains_1, model_2, chains_2, chain_2, residues_2, residue_2_seqId, residue_2)
    })

    test("Test structure_is_ligand", () => {
        const st_1 = cootModule.read_structure_file('./5a3h.pdb', cootModule.CoorFormat.Pdb)
        cootModule.gemmi_setup_entities(st_1)

        const is_ligand_1 = cootModule.structure_is_ligand(st_1)
        expect(is_ligand_1).toBeFalsy()

        const selection = new cootModule.Selection('//B')
        const st_2 = cootModule.remove_non_selected_atoms(st_1, selection)
        const is_ligand_2 = cootModule.structure_is_ligand(st_2)
        expect(is_ligand_2).toBeTruthy()
    })
})

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h.mmcif', '5a3h_no_ligand.pdb', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb', '3j2w.pdb', '3j2w_updated.cif', '8zuv_updated.cif', '6owe.cif']

const setupFunctions = {
    removeTestDataFromFauxFS: () => {
        testDataFiles.forEach(fileName => {
            cootModule.FS_unlink(fileName)
        })
    },
    copyTestDataToFauxFS: () => {
        testDataFiles.forEach(fileName => {
            let dirName
            if (fileName === 'rnasa-1.8-all_refmac1.mtz') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'data')
            } else if (fileName === 'tm-A.pdb') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'api')
            } else {
                dirName = path.join(__dirname, '..', 'test_data')
            }
            const coordData = fs.readFileSync(path.join(dirName, fileName), { encoding: fileName.includes('mtz') ? null : 'utf8', flag: 'r' })
            cootModule.FS_createDataFile(".", fileName, coordData, true, true);
        })
        cootModule.FS.mkdir("COOT_BACKUP");
        const cootDataZipped = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'baby-gru', 'data.tar.gz' ), { encoding: null, flag: 'r' })
        return ungzip(cootDataZipped).then((cootData) => {
            cootModule.FS.mkdir("data_tmp")
            cootModule.FS_createDataFile("data_tmp", "data.tar", cootData, true, true);
            cootModule.unpackCootDataFile("data_tmp/data.tar",false,"","")
            cootModule.FS_unlink("data_tmp/data.tar")
        })
    }
}
