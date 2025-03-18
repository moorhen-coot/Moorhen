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
            console.log(res.software)
            console.log(res.compound)
            const journalMapKeys = res.journal.keys();
            const authorMapKeys = res.author.keys();
            for(let i=0;i<authorMapKeys.size();i++){
                const key = authorMapKeys.get(i)
                if(key){
                    const journal = res.journal.get(key)
                    const authors = res.author.get(key)
                    if(journal&&authors){
                        console.log("########################################")
                        for(let i=0;i<authors.size();i++){
                            console.log(authors.get(i))
                        }
                        for(let i=0;i<journal.size();i++){
                            console.log(journal.get(i))
                        }
                    }
                }
            }
    })

})
