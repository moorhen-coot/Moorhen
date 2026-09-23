module.exports = () => {
    // Mock FileList for Node.js/Jest environment
    global.FileList = class FileList {
        constructor(files = []) {
            this.files = files;
            this.length = files.length;
            files.forEach((file, index) => {
                this[index] = file;
            });
        }

        item(index) {
            return this.files[index] || null;
        }

        [Symbol.iterator]() {
            return this.files[Symbol.iterator]();
        }
    };
}
