(function () {
    let globals;
    if (typeof self !== 'undefined') {
        globals = self;
    } else if (typeof window !== 'undefined') {
        globals = window;
    } else if (typeof global !== 'undefined') {
        globals = global;
    } else {
        throw new Error('unable to locate global object');
    }
    globals.globalThis = globals;
}());
