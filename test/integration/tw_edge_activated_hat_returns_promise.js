const VM = require('../../src/virtual-machine');
const {test} = require('tap');
const fs = require('fs');
const path = require('path');

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

compilerAndInterpreter('edge activated hats returning promises work properly', async (t, co) => {
    const vm = new VM();
    vm.setCompilerOptions(co);

    // Modify event_whengreaterthan to return a Promise (like a custom extension would) and allow us
    // to replace the value. This is a bit of a hack.
    let hatValue = false;
    vm.runtime._primitives.event_whengreaterthan = () => Promise.resolve(hatValue);

    // Track how many times the script was executed.
    let sayCounter = 0;
    vm.runtime.on('SAY', () => {
        sayCounter++;
    });

    const projectPath = path.join(__dirname, '..', 'fixtures', 'tw-edge-activated-hat-returns-promise.sb3');
    await vm.loadProject(fs.readFileSync(projectPath));

    const step = async (count = 1) => {
        for (let i = 0; i < count; i++) {
            vm.runtime._step();
            // Give promises returned by blocks a chance to resolve.
            await Promise.resolve();
        }
    };

    hatValue = false;
    await step(10);
    t.equal(sayCounter, 0);

    hatValue = true;
    await step();
    // promise can't resolve in this tick, so block shouldn't run yet
    t.equal(sayCounter, 0);
    await step();
    t.equal(sayCounter, 1);
    await step(10);
    t.equal(sayCounter, 1);

    hatValue = false;
    await step(10);
    t.equal(sayCounter, 1);

    hatValue = true;
    await step();
    t.equal(sayCounter, 1);
    await step();
    t.equal(sayCounter, 2);
    await step(10);
    t.equal(sayCounter, 2);

    t.end();
});
