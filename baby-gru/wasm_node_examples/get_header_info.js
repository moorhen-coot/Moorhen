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
    
            const fn = process.argv[2]
            const fileContents = fs.readFileSync(fn).toString()

            const res = cootModule.get_coord_header_info(fileContents,fn)
    
            console.log(res.title)
            console.log(res.author)
            console.log(res.journal)
            console.log(res.software)
            console.log(res.compound)
    })

})
