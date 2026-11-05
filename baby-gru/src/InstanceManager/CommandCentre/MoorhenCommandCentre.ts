import { v4 as uuidv4 } from "uuid";
import { webGL } from "../../types/mgWebGL";
import { moorhen } from "../../types/moorhen";
import { History } from "../../utils/MoorhenHistory";
import { CootCommandError, commandName, throwIfCootFailed } from "./CootCommandError";

export type WorkerResponse<T = any> = {
    data: WorkerResult<T>;
};

export type WorkerResult<T = any> = {
    result: {
        status: string;
        result: T;
        [key: string]: any;
    };
    command: string;
    messageId: string;
    myTimeStamp: string;
    message: string;
    consoleMessage: string;
};

export interface cootCommandKwargs {
    message?: string;
    data?: unknown;
    returnType?: string;
    command?: string;
    commandArgs?: any[];
    changesMolecules?: number[];
    [key: string]: any;
}

/** Commands that need the rotamer tables, which are fetched the first time one of them runs. */
const ROTAMER_COMMANDS = [
    "rotate_around_bond",
    "change_to_next_rotamer",
    "change_to_previous_rotamer",
    "change_to_first_rotamer",
    "get_rotamer_dodecs",
    "get_rotamer_dodecs_instanced",
    "auto_fit_rotamer",
    "rotamer_analysis",
    "get_validation",
];

export type WorkerMessage = {
    consoleMessage?: string;
    messageId: string;
    handler: (reply: WorkerResponse) => void;
    /** Rejects the command's promise with a CootCommandError when no reply can arrive. */
    reject?: (reason?: unknown) => void;
    kwargs: cootCommandKwargs;
};

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
export class CommandCentre {
    urlPrefix: string;
    cootWorker: Worker;
    activeMessages: WorkerMessage[];
    history: History;
    isClosed: boolean;
    onCootInitialized: null | (() => void);
    onConsoleChanged: null | ((msg: string) => void);
    onCommandStart: null | ((kwargs: any) => void);
    onCommandExit: null | ((kwargs: any) => void);
    onActiveMessagesChanged: null | ((activeMessages: WorkerMessage[]) => void);
    onMoleculeChanged: null | ((molNo: number) => void);
    loadedRotamerTables: boolean;
    loadedRotaRamaTables: boolean;
    loadedPrivateerData: boolean;
    /** Archives being fetched and unpacked on first use, so that concurrent commands share one load. */
    private extraDataLoads: Map<string, Promise<void>>;

    constructor(urlPrefix: string, timeCapsule: React.RefObject<moorhen.TimeCapsule>, props: { [x: string]: any }) {
        this.loadedRotamerTables = false
        this.loadedRotaRamaTables = false
        this.loadedPrivateerData = false
        this.extraDataLoads = new Map();
        this.activeMessages = [];
        this.urlPrefix = urlPrefix;
        this.isClosed = false;
        this.history = new History(timeCapsule);
        //this.history.setCommandCentre(this);

        this.onConsoleChanged = null;
        this.onCommandStart = null;
        this.onCommandExit = null;
        this.onActiveMessagesChanged = null;
        this.onMoleculeChanged = null;
        Object.keys(props).forEach(key => (this[key] = props[key]));
    }

    async init() {
        this.isClosed = false;
        this.cootWorker = new Worker(`${this.urlPrefix}/wasm/CootWorker.js`);
        this.cootWorker.onmessage = this.handleMessage.bind(this);
        // The worker replies to every message itself, including with an Exception status
        // when a command throws, so an error event does not mean a reply was lost: the
        // worker keeps processing its queue. Only fail pending commands if the worker
        // errors before it has initialised (e.g. the script failed to load), since then
        // no reply will ever come.
        let workerInitialised = false;
        this.cootWorker.onerror = event => {
            console.error("Error in coot worker", event);
            if (!workerInitialised) {
                this.failActiveMessages(this.activeMessages, "The coot worker failed to start");
            }
        };
        // A reply that cannot be deserialised carries no messageId. The worker handles
        // messages one at a time and replies in order, so the lost reply belongs to the
        // oldest pending message; fail only that one; later replies still arrive.
        this.cootWorker.onmessageerror = event => {
            console.error("Could not deserialise a reply from the coot worker", event);
            this.failActiveMessages(this.activeMessages.slice(0, 1), "A reply from the coot worker could not be deserialised");
        };
        // Start the worker loading libcoot now, so that the WASM download and compile run alongside
        // the fetch of data.tar.gz below instead of waiting for it. Not awaited: the worker replies
        // as soon as loading has begun, and if loading fails, CootInitialize fails too and that is
        // where the failure is reported.
        this.postMessage({ message: "CootLoadModule" }).catch(() => {});
        const fileResponse = await fetch(`${this.urlPrefix}/data.tar.gz`);
        const fileData = await fileResponse.arrayBuffer();
        const initKwargs = { message: "CootInitialize", data: { cootData: new Uint8Array(fileData) } };
        const initReply = await this.postMessage(initKwargs);
        workerInitialised = true;
        throwIfCootFailed(initReply, initKwargs);
        if (this.onCootInitialized) {
            this.onCootInitialized();
        }
    }

    async close() {
        if (!this.isClosed) {
            this.isClosed = true;
            await this.postMessage({ message: "close", data: {} });
            this.cootWorker.removeEventListener("message", this.handleMessage);
            this.cootWorker.terminate();
        } else {
            console.warn("Command centre already closed, doing nothing...");
        }
    }

    handleMessage(reply: WorkerResponse) {
        this.activeMessages
            .filter(message => message.messageId && message.messageId === reply.data.messageId)
            .forEach(message => {
                message.handler(reply);
            });
        this.activeMessages = this.activeMessages.filter(message => message.messageId !== reply.data.messageId);
        if (this.onActiveMessagesChanged) {
            this.onActiveMessagesChanged(this.activeMessages);
        }
    }

    makeHandler(resolve) {
        return reply => {
            resolve(reply);
        };
    }

    /**
     * Reject the given in-flight commands and drop them from activeMessages, for when
     * their reply can never arrive. Without this they stay pending for ever, which keeps
     * the global busy state (and its spinner) switched on permanently.
     */
    failActiveMessages(messages: WorkerMessage[], reason: string) {
        if (messages.length === 0) {
            return;
        }
        this.activeMessages = this.activeMessages.filter(message => !messages.includes(message));
        messages.forEach(message => {
            message.reject?.(new CootCommandError(commandName(message.kwargs), reason));
        });
        if (this.onActiveMessagesChanged) {
            this.onActiveMessagesChanged(this.activeMessages);
        }
    }

    async cootCommand(kwargs: cootCommandKwargs, doJournal: boolean = true): Promise<WorkerResponse> {
        if (kwargs.command && ROTAMER_COMMANDS.includes(kwargs.command) && !this.loadedRotamerTables) {
            await this.loadExtraDataOnce("rotamers", async () => {
                console.log("A rotamer command, let's load the rotamers");
                const [rotaOther, rotaArgLys] = await Promise.all([
                    this.fetchDataArchive("rota_other-data.tar.gz"),
                    this.fetchDataArchive("rota_arg_lys-data.tar.gz"),
                ]);
                await this.postMessage({ message: "loadExtraData", data: { cootData: rotaOther } });
                await this.postMessage({ message: "loadExtraData", data: { cootData: rotaArgLys } });
                await this.postMessage({ message: "loadRotamerTables", data: {} });
                this.loadedRotamerTables = true;
            });
        }
        if (kwargs.command === "get_validation" && !this.loadedRotaRamaTables) {
            await this.loadExtraDataOnce("rotarama", async () => {
                console.log("A rotarama command, let's load the rotamers");
                const rotarama = await this.fetchDataArchive("rotarama-data.tar.gz");
                await this.postMessage({ message: "loadExtraData", data: { cootData: rotarama } });
                this.loadedRotaRamaTables = true;
            });
        }
        if (kwargs.command === "privateer_validate" && !this.loadedPrivateerData) {
            await this.loadExtraDataOnce("privateer", async () => {
                console.log("A Privateer validation, let's load the torsion database");
                const privateer = await this.fetchDataArchive("privateer-data.tar.gz");
                await this.postMessage({ message: "loadExtraData", data: { cootData: privateer } });
                this.loadedPrivateerData = true;
            });
        }

        const message = "coot_command";
        console.log("In cootCommand", kwargs.command);
        if (this.onCommandStart) {
            this.onCommandStart({ ...kwargs, doJournal });
        }
        const result = await this.postMessage({ message, ...kwargs });
        if (doJournal) {
            await this.history.addEntry(kwargs);
        }
        if (this.onCommandExit) {
            this.onCommandExit({ ...kwargs, doJournal });
        }
        if (kwargs.changesMolecules && this.onMoleculeChanged) {
            kwargs.changesMolecules.forEach(molNo => this.onMoleculeChanged(molNo));
        }
        return result;
    }

    async cootCommandList(commandList: cootCommandKwargs[], doJournal: boolean = true): Promise<WorkerResponse> {
        const message = "coot_command_list";
        console.log("In cootCommandList", commandList);
        if (this.onCommandStart) {
            commandList.forEach(commandKwargs => this.onCommandStart(commandKwargs));
        }
        if (doJournal) {
            await Promise.all(commandList.map(commandKwargs => this.history.addEntry(commandKwargs)));
        }
        const result = await this.postMessage({ message, commandList });
        if (this.onCommandExit) {
            commandList.forEach(commandKwargs => this.onCommandExit(commandKwargs));
        }
        if (commandList.some(commandKwargs => commandKwargs.changesMolecules) && this.onMoleculeChanged) {
            commandList.forEach(commandKwargs => {
                if (commandKwargs.changesMolecules) {
                    commandKwargs.changesMolecules.forEach(molNo => this.onMoleculeChanged(molNo));
                }
            });
        }
        return result;
    }

    /**
     * Fetch one of the data archives that are loaded on first use rather than at start-up.
     */
    private async fetchDataArchive(fileName: string): Promise<Uint8Array> {
        const response = await fetch(`${this.urlPrefix}/${fileName}`);
        if (!response.ok) {
            throw new Error(`Could not fetch ${this.urlPrefix}/${fileName}: ${response.status} ${response.statusText}`);
        }
        return new Uint8Array(await response.arrayBuffer());
    }

    /**
     * Run an on-demand data load once. Commands that arrive while it is in progress wait for the
     * same load instead of starting another download. If the load fails it is forgotten, so the
     * next command that needs the data tries again.
     */
    private loadExtraDataOnce(key: string, load: () => Promise<void>): Promise<void> {
        let pending = this.extraDataLoads.get(key);
        if (!pending) {
            pending = load().catch(err => {
                this.extraDataLoads.delete(key);
                throw err;
            });
            this.extraDataLoads.set(key, pending);
        }
        return pending;
    }

    postMessage(kwargs: cootCommandKwargs): Promise<WorkerResponse> {
        const $this = this;
        const messageId = uuidv4();
        return new Promise((resolve, reject) => {
            const handler = $this.makeHandler(resolve);
            // Keep the reject alongside the handler so failActiveMessages() can settle
            // this promise if the reply never comes.
            this.activeMessages.push({ messageId, handler, reject, kwargs });
            if (this.onActiveMessagesChanged) {
                this.onActiveMessagesChanged(this.activeMessages);
            }
            this.cootWorker.postMessage({
                messageId,
                myTimeStamp: Date.now(),
                ...kwargs,
            });
        });
    }
}
