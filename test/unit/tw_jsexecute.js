const {test} = require('tap');
const jsexecute = require('../../src/compiler/jsexecute');
const Cast = require('../../src/util/cast');
const {stringify} = require('@turbowarp/json');

const evaluateRuntimeFunction = functionName => jsexecute.scopedEval(functionName);

test('runtimeFunctions are valid', t => {
    for (const functionName of Object.keys(jsexecute.runtimeFunctions)) {
        const fn = evaluateRuntimeFunction(functionName);
        t.type(fn, 'function', `${functionName} is function`);
    }
    t.end();
});

test('all runtimeFunctions can be used together', t => {
    const script = Object.keys(jsexecute.runtimeFunctions).join(';');
    jsexecute.scopedEval(script);
    t.end();
});

test('comparison functions are equivalent to Cast.compare', t => {
    const VALUES = [
        0,
        -0,
        1,
        '0',
        '',
        '.',
        true,
        false,
        'true',
        'false',
        'true ',
        'apple',
        'Apple',
        'Apple ',
        ' 123',
        ' 123.0',
        '+123.5',
        123,
        0.23,
        '0.23',
        '.23',
        '-.23',
        '0.0',
        NaN,
        'NaN',
        Infinity,
        -Infinity,
        'Infinity',
        '-Infinity',
        '\t',
        '\r\n\u00a0'
    ];
    const compareEqual = evaluateRuntimeFunction('compareEqual');
    const compareGreaterThan = evaluateRuntimeFunction('compareGreaterThan');
    const compareLessThan = evaluateRuntimeFunction('compareLessThan');
    for (const a of VALUES) {
        for (const b of VALUES) {
            // Because there are so many tests, calling t.ok() each time is actually quite slow,
            // so only call into tap when something failed.
            const cast = Cast.compare(a, b);
            if (compareEqual(a, b) !== (cast === 0)) {
                t.fail(`${stringify(a)} should be === ${stringify(b)}`);
            }
            if (compareGreaterThan(a, b) !== (cast > 0)) {
                t.fail(`${stringify(a)} should be > ${stringify(b)}`);
            }
            if (compareLessThan(a, b) !== (cast < 0)) {
                t.fail(`${stringify(a)} should be < ${stringify(b)}`);
            }
        }
    }
    t.end();
});
