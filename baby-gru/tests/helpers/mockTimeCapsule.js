
export class MockTimeCapsule {
    constructor() {

    }

    async getSortedKeys() {
        const result = await new Promise((resolve, reject) => {
            resolve([
                { label: 'key-1' },
                { label: 'key-2' },
                { label: 'key-3' },
            ])
        })
        return result
    }
}
