import { doCootCommand, setModules } from "../../public/baby-gru/CootWorker"

export class MockMoorhenCommandCentre {
    constructor(molecules_container, cootModule) {
        this.messageHistory = []
        this.commandHistory = []
        setModules(molecules_container, cootModule)
    }
    
    async cootCommand(kwargs, doJournal = true) {
        this.commandHistory.push(kwargs)
        const returnResult = doCootCommand(kwargs)
        return {data: returnResult}
    }
}
