import { v4 as uuidv4 } from 'uuid';
import { MoorhenHistory } from "./MoorhenHistory"
import { moorhen } from "../types/moorhen"
import { webGL } from '../types/mgWebGL';

/**
 * A command centre used to communicate between Moorhen and a web worker running an instance of the 
 * headless libcoot API
 * @property {Worker} cootWorker - A web worker holding a headless libcoot instance
 * @constructor
 * @param {string} urlPrefix - The root url used to find the /CootWorker.js worker file
 * @param {function} onConsoleChanged - Callback executed whenever the worker prints a message to the console
 * @param {function} onCommandStart - Callback executed whenever a new command is issued to the web worker
 * @param {function} onCommandExit - Callback executed whenever a new command is completed by the web worker
 * @param {function} onActiveMessagesChanged  - Callback executed whenever a new message is received from the worker
 * @param {function} onCootInitialized - Callback executed once after coot is initialised in the web worker
 * @property {function} cootCommand - Runs a coot command
 * @property {moorhen.History} history - An object that contains the command history
 * @example
 * import { MoorhenCommandCentre } from "moorhen";
 * 
 * commandCentre = new MoorhenCommandCentre({
 *  onActiveMessagesChanged: (newActiveMessages) => {
 *      setBusy(newActiveMessages.length !== 0)
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
    activeMessages: moorhen.WorkerMessage[];
    history: moorhen.History;
    isClosed: boolean;
    onCootInitialized: null | ( () => void );
    onConsoleChanged: null | ( (msg: string) => void );
    onCommandStart : null | ( (kwargs: any) => void );
    onCommandExit : null | ( (kwargs: any) => void );
    onActiveMessagesChanged: null | ( (activeMessages: moorhen.WorkerMessage[]) => void );

    constructor(urlPrefix: string, glRef: React.RefObject<webGL.MGWebGL>, timeCapsule: React.RefObject<moorhen.TimeCapsule>, props: {[x: string]: any}) {
        this.activeMessages = []
        this.urlPrefix = urlPrefix
        this.isClosed = false
        this.history = new MoorhenHistory(glRef, timeCapsule)
        this.history.setCommandCentre(this)
        
        this.onConsoleChanged = null
        this.onCommandStart = null
        this.onCommandExit = null
        this.onActiveMessagesChanged = null

        Object.keys(props).forEach(key => this[key] = props[key])
    }
    
    async init() {
        this.isClosed = false
        this.cootWorker = new Worker(`${this.urlPrefix}/CootWorker.js`)
        this.cootWorker.onmessage = this.handleMessage.bind(this)
        await this.postMessage({ message: 'CootInitialize', data: {} })
        if (this.onCootInitialized) {
            this.onCootInitialized()
        }
    }
    
    async close() {
        if (!this.isClosed) {
            this.isClosed = true
            await this.postMessage({ message: 'close', data: { } })
            this.cootWorker.removeEventListener("message", this.handleMessage)
            this.cootWorker.terminate()    
        } else {
            console.warn('Command centre already closed, doing nothing...')
        }
    }

    handleMessage(reply: moorhen.WorkerResponse) {
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
    
    makeHandler(resolve) {
        return (reply) => {
            resolve(reply)
        }
    }
    
    async cootCommand(kwargs: moorhen.cootCommandKwargs, doJournal: boolean = true): Promise<moorhen.WorkerResponse> {
        const message = "coot_command"
        console.log('In cootCommand', kwargs.command)
        if (this.onCommandStart) {
            this.onCommandStart({...kwargs, doJournal})
        }
        const result = await this.postMessage({ message, ...kwargs })
        if (doJournal) {
            await this.history.addEntry(kwargs)
        }
        if (this.onCommandExit) {
            this.onCommandExit({...kwargs, doJournal})
        }
        return result
    }
    
    async cootCommandList(commandList: moorhen.cootCommandKwargs[], doJournal: boolean = true): Promise<moorhen.WorkerResponse> {
        const message = "coot_command_list"
        console.log('In cootCommandList', commandList)
        if (this.onCommandStart) {
            commandList.forEach(commandKwargs => this.onCommandStart(commandKwargs))
        }
        if (doJournal) {
            await Promise.all(commandList.map(commandKwargs => this.history.addEntry(commandKwargs)))
        }
        const result = await this.postMessage({ message, commandList })
        if (this.onCommandExit) {
            commandList.forEach(commandKwargs => this.onCommandExit(commandKwargs))
        }
        return result
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
