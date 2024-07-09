const fs = require('fs')
const path = require('path')

module.exports = () => {
    fs.stat('moorhen.data', function(err, stat) { 
        if (err == null) {
            // file exists
        } else if (err.code === 'ENOENT') {
            fs.symlink(path.join(__dirname, '..', 'public', 'moorhen.data'), 'moorhen.data', 'file', (err) => {
                if (err) {
                    console.log(err);
                }
            })
        }
    })
}
