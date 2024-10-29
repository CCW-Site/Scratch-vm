// TODO: unsupported exposed stack frame yet
const test = require('tap').skip;
const fs = require('fs');
const path = require('path');
const VM = require('../../src/virtual-machine');
const Timer = require('../../src/util/timer');
test('compatibility stack frame is exposed on thread', t => {
    const vm = new VM();
    vm.loadProject(fs.readFileSync(path.join(__dirname, '../fixtures/tw-glide.sb3'))).then(() => {
        vm.greenFlag();
        vm.runtime._step();
        t.ok(vm.runtime.threads[0].compatibilityStackFrame.timer instanceof Timer);
        t.end();
    });
});
