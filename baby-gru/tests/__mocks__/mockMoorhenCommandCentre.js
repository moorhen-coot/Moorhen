import { doCootCommand, setModules } from "../../public/CootWorker"

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
        const returnResult = doCootCommand(kwargs)
        return {data: returnResult}
    }
}
