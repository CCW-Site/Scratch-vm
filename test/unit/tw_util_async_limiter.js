const AsyncLimiter = require('../../src/util/async-limiter');
const {test} = require('tap');

test('Runs callback', async t => {
    /* eslint-disable-next-line require-await */
    const callback = async (a, b) => a + b;

    const limiter = new AsyncLimiter(callback, 2);

    t.same(await Promise.all([
        limiter.do(1, 2),
        limiter.do(3, 4),
        limiter.do(5, 6),
        limiter.do(7, 8),
        limiter.do(9, 10)
    ]), [
        3,
        7,
        11,
        15,
        19
    ]);
    t.end();
});

test('Errors', async t => {
    t.plan(1);
    const errorObject = new Error('Testing testing 123'); // want to get the same *exact* object back
    const callback = () => Promise.reject(errorObject);
    const limiter = new AsyncLimiter(callback, 10);
    try {
        await limiter.do();
    } catch (e) {
        t.equal(e, errorObject);
    }
    t.end();
});

test('Limit and queue', async t => {
    const calls = [];
    const callback = () => new Promise(resolve => {
        calls.push({
            resolve
        });
    });

    const limiter = new AsyncLimiter(callback, 5);

    for (let i = 0; i < 12; i++) {
        limiter.do();
    }

    t.equal(calls.length, 5);

    calls.forEach(i => i.resolve());
    await Promise.resolve();
    t.equal(calls.length, 10);

    calls.forEach(i => i.resolve());
    await Promise.resolve();
    t.equal(calls.length, 12);

    t.end();
});
