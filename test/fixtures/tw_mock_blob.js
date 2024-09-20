class MockBlob {
    constructor (objects = [], options = {}) {
        this.size = objects.reduce((a, i) => a + i.byteLength, 0);
        this.type = options || options.type;

        this._objects = objects;
    }

    _readAsBuffer () {
        const result = Buffer.alloc(this.size);
        let i = 0;
        for (const object of this._objects) {
            const view = new Uint8Array(object);
            result.set(view, i);
            i += object.byteLength;
        }
        return result;
    }
}

global.Blob = MockBlob;
