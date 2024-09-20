const test = require('tap').test;
const Music = require('../../src/extensions/scratch3_music/index.js');
const Runtime = require('../../src/engine/runtime.js');

test('_isConcurrencyLimited', t => {
    const rt = new Runtime();

    // sanity check so that the setRuntimeOptions() call below actually does something
    t.equal(rt.runtimeOptions.miscLimits, true, 'misc limits enabled by default');

    const blocks = new Music(rt);
    t.equal(blocks._isConcurrencyLimited(), false, 'not limited initially');

    // logic here is slightly weird but this matches Scratch
    blocks._concurrencyCounter = Music.CONCURRENCY_LIMIT;
    t.equal(blocks._isConcurrencyLimited(), false, 'not limited at limit');

    blocks._concurrencyCounter = Music.CONCURRENCY_LIMIT + 1;
    t.equal(blocks._isConcurrencyLimited(), true, 'limited above limit');

    rt.setRuntimeOptions({
        miscLimits: false
    });
    t.equal(blocks._isConcurrencyLimited(), false, 'not limited when miscLimits: false');

    t.end();
});
