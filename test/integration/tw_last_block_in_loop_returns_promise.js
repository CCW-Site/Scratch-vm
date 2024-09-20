const fs = require('fs');
const path = require('path');
const {test} = require('tap');
const VM = require('../../src/virtual-machine');

const compilerAndInterpreter = (name, callback) => {
    test(`${name} - interpreted`, t => {
        callback(t, {
            enabled: false
        });
    });
    test(`${name} - compiled`, t => {
        callback(t, {
            enabled: true
        });
    });
};

global.document = {
    hidden: true
};

compilerAndInterpreter('last block in loop returns Promise', (t, co) => {
    t.plan(1);

    const vm = new VM();
    vm.setCompilerOptions(co);

    const fixturePath = path.join(__dirname, '../fixtures/tw-last-block-in-loop-returns-promise.sb3');
    vm.loadProject(fs.readFileSync(fixturePath)).then(async () => {
        // This is a stand-in for a block like "move 10 steps"
        // This is just easier than attaching a real mock renderer and everything that ends up requiring
        vm.addAddonBlock({
            procedureCode: 'something to simulate a redraw request',
            callback: () => {
                vm.runtime.requestRedraw();
            },
            arguments: []
        });

        vm.greenFlag();

        let iterations = 0;
        while (vm.runtime.threads.length > 0) {
            iterations++;
            vm.runtime._step();
            // Give Promises a chance to resolve
            await Promise.resolve();
        }

        t.equal(iterations, 16);
        t.end();
    });
});
