import { doPrivateerValidate, doCootCommand, setModules } from "../../public/MoorhenAssets/wasm/CootWorker"

export class MockMoorhenCommandCentre {
    constructor(molecules_container, cootModule) {
        this.messageHistory = []
        this.commandHistory = []
        this.activeMessages = []
        this.isClosed = false
        this.history = {}
        setModules(molecules_container, cootModule)
    }

    async postMessage() {
        // pass
    }
    
    async cootCommand(kwargs, doJournal = true) {
        this.commandHistory.push(kwargs)

        if (kwargs.message === 'privateer_validate') {
            const returnResult = doPrivateerValidate(kwargs)
            return {data: returnResult}
        }
        const returnResult = doCootCommand(kwargs)
        return {data: returnResult}
    }
}
