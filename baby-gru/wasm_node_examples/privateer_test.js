const createCootModule = require('../public/moorhen')
const fs = require('fs')
const path = require('path')
const mat4 = require('gl-matrix/mat4')
const {gzip, ungzip} = require('node-gzip');

createCootModule({
    //print(t) { () => console.log(["output", t]) },
    //printErr(t) { () => console.log(["output", t]); }
}).then(cootModule => {

    const cootDataZipped = fs.readFileSync(path.join('../public', 'baby-gru', 'data.tar.gz' ), { encoding: null, flag: 'r' })

    ungzip(cootDataZipped).then((cootData) => {
            cootModule.FS.mkdir("data_tmp")
            cootModule.FS_createDataFile("data_tmp", "data.tar", cootData, true, true);
            cootModule.unpackCootDataFile("data_tmp/data.tar",false,"","")
            cootModule.FS_unlink("data_tmp/data.tar")
    
            const  molecules_container = new cootModule.molecules_container_js(false)
            molecules_container.set_use_gemmi(false)
    
            const fn = process.argv[2]
            const fileContents = fs.readFileSync(fn).toString()
            cootModule.FS_createDataFile(".", fn, fileContents, true, true);
    
            const coordMolNo = molecules_container.read_pdb(fn)
            console.log(coordMolNo)
            const results = molecules_container.privateer_validate(coordMolNo)
            console.log(results.size())
            console.log(cootModule)
            console.log(cootModule.gemmi)
    })

})
