const fs = require('fs')

module.exports = () => {
    fs.unlink("baby-gru", (err) => { if(err) console.log(err) })
}
