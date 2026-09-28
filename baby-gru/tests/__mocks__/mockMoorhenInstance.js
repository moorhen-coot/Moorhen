import { _MoorhenReduxStore as MoorhenReduxStore } from "../../src/store/MoorhenReduxStore"
import { MockMoorhenCommandCentre } from "./mockMoorhenCommandCentre"

export class MockMoorhenInstance {
    constructor(commandCentre = null, store = null) {
        this.store = store ?? MoorhenReduxStore
        this.commandCentre = commandCentre ?? new MockMoorhenCommandCentre(null, null)
    }
}
