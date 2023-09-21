
export class MockWebGL {
    constructor() {
        this.renderHistory = []
    }

    async cootCommand(...args) {
        this.commandHistory.push(args)
    }
}
