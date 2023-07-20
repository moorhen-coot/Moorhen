import { v4 as uuidv4 } from 'uuid';
import { moorhen } from "../types/moorhen"

/**
 * A command centre used to communicate between Moorhen and a web worker running an instance of the 
 * headless libcoot API
 * @property {Worker} cootWorker - A web worker holding a headless libcoot instance
 * @method cootCommand - Runs a coot command
 * @param {moorhen.cootCommandKwargs} kwargs - An object describing the command that will be executed and its arguments
 * @constructor
 * @param {string} urlPrefix - The root url used to find the baby-gru/CootWorker.js worker file
 * @param {function} onConsoleChanged - Callback executed whenever the worker prints a message to the console
 * @param {function} onNewCommand - Callback executed whenever a new command is issued to the web worker
 * @param {function} onActiveMessagesChanged  - Callback executed whenever a new message is received from the worker
 * @param {function} onCootInitialized - Callback executed once after coot is initialised in the web worker
 * @example
 * import { MoorhenCommandCentre } from "moorhen";
 * 
 * commandCentre = new MoorhenCommandCentre({
 *  onConsoleChanged: (newMessage) => {
 *      setConsoleMessage(newMessage)
 *  },
 *  onActiveMessagesChanged: (newActiveMessages) => {
 *      setBusy(newActiveMessages.length !== 0)
 *  },
 *  onNewCommand: (newCommand) => {
 *      dispatchHistoryReducer({ action: "Add", item: newCommand })
 *  },
 *  onCootInitialized: () => {
 *      setCootInitialized(true)
 *  },
 *      urlPrefix: urlPrefix
 * })
 * 
 * await props.commandCentre.current.cootCommand({
 *  returnType: 'status',
 *  command: 'flipPeptide_cid',
 *  commandArgs: [0, "//A/150"],
 * })
 * 
 */
export class MoorhenCommandCentre implements moorhen.CommandCentre {
    urlPrefix: string;
    cootWorker: Worker;
    consoleMessage: string;
    activeMessages: moorhen.WorkerMessage[];
    onCootInitialized: null | ( () => void );
    onConsoleChanged: null | ( (msg: string) => void );
    onNewCommand : null | ( (kwargs: any) => void );
    onActiveMessagesChanged: null | ( (activeMessages: moorhen.WorkerMessage[]) => void );

    constructor(props: { [x: string]: any; }) {
        this.consoleMessage = ""
        this.activeMessages = []
        this.onConsoleChanged = null
        this.onNewCommand = null
        this.onActiveMessagesChanged = null

        Object.keys(props).forEach(key => this[key] = props[key])
        
        this.cootWorker = new Worker(`${this.urlPrefix}/baby-gru/CootWorker.js`)
        this.cootWorker.onmessage = this.handleMessage.bind(this)
        this.postMessage({ message: 'CootInitialize', data: {} })
            .then(() => this.onCootInitialized && this.onCootInitialized() )
    }
    
    handleMessage(reply: moorhen.WorkerResponse) {
        if (this.onConsoleChanged && reply.data.consoleMessage) {
            let newMessage: string
            if (reply.data.consoleMessage.length > 160) {
                newMessage = `TRUNCATED TO [${reply.data.consoleMessage.substring(0, 160)}]`
            }
            else {
                newMessage = reply.data.consoleMessage
            }
            this.extendConsoleMessage(newMessage)
        }
        this.activeMessages.filter(
            message => message.messageId && (message.messageId === reply.data.messageId)
        ).forEach(message => {
            message.handler(reply)
        })
        this.activeMessages = this.activeMessages.filter(
            message => message.messageId !== reply.data.messageId
        )
        if (this.onActiveMessagesChanged) {
            this.onActiveMessagesChanged(this.activeMessages)
        }
    }
    
    extendConsoleMessage(newMessage: string) {
        this.consoleMessage = this.consoleMessage.concat(">" + newMessage + "\n")
        this.onConsoleChanged && this.onConsoleChanged(this.consoleMessage)
    }
    
    makeHandler(resolve) {
        return (reply) => {
            resolve(reply)
        }
    }
    
    unhook() {
        this.cootWorker.removeEventListener("message", this.handleMessage)
        this.cootWorker.terminate()
    }
    
    async cootCommand(kwargs: moorhen.cootCommandKwargs, doJournal: boolean = false): Promise<moorhen.WorkerResponse> {
        const message = "coot_command"
        if (this.onNewCommand && doJournal) {
            console.log('In cootCommand', kwargs.command)
            this.onNewCommand(kwargs)
        }
        return this.postMessage({ message, ...kwargs })
    }
    
    postMessage(kwargs: moorhen.cootCommandKwargs): Promise<moorhen.WorkerResponse> {
        const $this = this
        const messageId = uuidv4()
        return new Promise((resolve, reject) => {
            const handler = $this.makeHandler(resolve)
            this.activeMessages.push({ messageId, handler, kwargs })
            if (this.onActiveMessagesChanged) {
                this.onActiveMessagesChanged(this.activeMessages)
            }
            this.cootWorker.postMessage({
                messageId, myTimeStamp: Date.now(), ...kwargs
            })
        })
    }
}
