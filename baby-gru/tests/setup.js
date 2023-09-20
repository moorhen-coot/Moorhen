const fs = require('fs')
const path = require('path')

module.exports = () => {
    fs.symlink(path.join(__dirname, '..', 'public', 'baby-gru', 'wasm', 'moorhen.data'), 'moorhen.data', 'file', (err) => {
        if (err) {
            console.log(err);
        }
    })    
}
