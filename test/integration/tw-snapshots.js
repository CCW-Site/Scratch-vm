const {test} = require('tap');
const Snapshots = require('../snapshot/lib');

global.prompt == 'function' || (function (window) {
    window.prompt = function prompt (title) {
        // title element
        // create input with default text
        // overlay
        // dialog
        // OK white on blue
        // Cancel black on white
        // return value of OK (value of input) or Cancel (null)
    };
}(global));

for (const testCase of Snapshots.tests) {
    // if (!testCase.id.endsWith('tw-procedure-prototype-exists-but-not-definition-549160843.sb3')) {
    //     continue;
    // }
    // eslint-disable-next-line no-loop-func
    test(testCase.id, async t => {
        const expected = Snapshots.getExpectedSnapshot(testCase);
        const actual = await Snapshots.generateActualSnapshot(testCase);
        const result = Snapshots.compareSnapshots(expected, actual);
        if (result === 'VALID') {
            t.pass('matches');
        } else if (result === 'INPUT_MODIFIED') {
            t.fail('input project changed; run: node test/snapshot --update');
        } else if (result === 'MISSING_SNAPSHOT') {
            t.fail('snapshot is missing; run: node test/snapshot --update');
        } else {
            // This assertion will always fail, but tap will print out the snapshots
            // for easier comparison.
            t.equal(expected, actual, `${testCase.id} did not match; you may have to run: node test/snapshot --update`);
        }
        t.end();
    });
}
