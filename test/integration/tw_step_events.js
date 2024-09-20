const Runtime = require('../../src/engine/runtime');
const {test} = require('tap');

test('step events', t => {
    const events = [];
    const rt = new Runtime();
    rt.sequencer.stepThreads = () => {
        events.push('sequencer.stepThreads()');
        return [];
    };
    rt.on('BEFORE_EXECUTE', () => {
        events.push('BEFORE_EXECUTE');
    });
    rt.on('AFTER_EXECUTE', () => {
        events.push('AFTER_EXECUTE');
    });
    rt._step();
    t.same(events, [
        'BEFORE_EXECUTE',
        'sequencer.stepThreads()',
        'AFTER_EXECUTE'
    ]);
    t.end();
});
