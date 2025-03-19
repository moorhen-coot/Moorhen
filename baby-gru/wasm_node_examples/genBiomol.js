const createCootModule = require('./public/moorhen')
const fs = require('fs')
const mat4 = require('gl-matrix/mat4')

createCootModule({
    print(t) { () => console.log(["output", t]) },
    printErr(t) { () => console.log(["output", t]); }
}).then(cootModule => {
    const fn = process.argv[2]
    const fileContents = fs.readFileSync(fn).toString()
    const structure = cootModule.read_structure_from_string(fileContents, fn.replace(/\.[^/.]+$/, ""))
    cootModule.gemmi_setup_entities(structure)
    cootModule.gemmi_add_entity_types(structure, true)
    for(let i=0;i<structure.assemblies.size();i++){
        const assembly = structure.assemblies.get(i)
        const generators = assembly.generators
        const n_gen = generators.size()
        let n_tot_op = 0
        for (let i_gen=0; i_gen < n_gen; i_gen++) { 
            const gen = generators.get(i_gen)
            const operators = gen.operators
            const n_op = operators.size()
            n_tot_op += n_op
            gen.delete()
            operators.delete()
        }
        console.log("n_tot_op",n_tot_op)
        assembly.delete()
        generators.delete()
        /*
        assembly = cootModule.copy_to_assembly_to_new_structure(structure,structure.assemblies.get(i).name)
        console.log(assembly)
        console.log(cootModule.get_pdb_string_from_gemmi_struct(assembly))
        console.log(cootModule.get_mmcif_string_from_gemmi_struct(assembly))
        */
    }

    /*
    const json_text = '{"query":{"type":"terminal","service":"full_text","parameters":{"value":"viral capsid"}},"request_options":{"paginate": {"start":0,"rows":100}},"return_type":"entry"}'
    const json_encoded = encodeURIComponent(json_text)
    console.log(json_encoded)
    */
    
})
