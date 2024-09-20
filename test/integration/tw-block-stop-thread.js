const {test} = require('tap');
const fs = require('fs');
const path = require('path');
const VM = require('../../src/virtual-machine');
const Thread = require('../../src/engine/thread');
const Clone = require('../../src/util/clone');

const fixturePath = path.join(__dirname, '../fixtures/tw-block-stop-thread.sb3');
const fixtureData = fs.readFileSync(fixturePath);

const stopByRetireThread = thread => {
    thread.target.runtime.sequencer.retireThread(thread);
};

const stopBySetStatus = thread => {
    thread.status = Thread.STATUS_DONE;
};

test('constants', t => {
    t.equal(Thread.STATUS_DONE, 4);
    t.end();
});

for (const [enableCompiler, stopFunction] of [
    [true, stopByRetireThread],
    [true, stopBySetStatus],
    [false, stopByRetireThread],
    [false, stopBySetStatus]
]) {
    const subtestName = `${enableCompiler ? 'compiler' : 'interpreter'} - ${stopFunction.name}`;

    test(`${subtestName} - stop in command block`, t => {
        const vm = new VM();
        vm.setCompilerOptions({enabled: enableCompiler});
        t.equal(vm.runtime.compilerOptions.enabled, enableCompiler);

        const callOrder = [];
        vm.addAddonBlock({
            procedureCode: 'first block %s',
            arguments: ['number or text'],
            callback: (args, util) => {
                callOrder.push(['first block', Clone.simple(args)]);
                stopFunction(util.thread);
            }
        });
        vm.addAddonBlock({
            procedureCode: 'inner block',
            return: 1,
            callback: args => {
                callOrder.push(['input block', Clone.simple(args)]);
                return callOrder.length;
            }
        });
        vm.addAddonBlock({
            procedureCode: 'second block',
            callback: args => {
                callOrder.push(['second block', Clone.simple(args)]);
            }
        });

        vm.loadProject(fixtureData).then(() => {
            vm.greenFlag();
            vm.runtime._step();
            t.same(callOrder, [
                ['input block', {}],
                ['first block', {'number or text': 1}]
            ]);
            t.end();
        });
    });

    test(`${subtestName} - stop in command block after yielding once`, t => {
        const vm = new VM();
        vm.setCompilerOptions({enabled: enableCompiler});
        t.equal(vm.runtime.compilerOptions.enabled, enableCompiler);

        const callOrder = [];
        vm.addAddonBlock({
            procedureCode: 'first block %s',
            arguments: ['number or text'],
            callback: (args, util) => {
                callOrder.push(['first block', Clone.simple(args)]);
                if (callOrder.length === 1) {
                    util.yield();
                } else {
                    stopFunction(util.thread);
                }
            }
        });
        vm.addAddonBlock({
            procedureCode: 'inner block',
            return: 1,
            // Ignore calls because interpreter will re-evaluate on yield but compiler won't
            callback: () => 5
        });
        vm.addAddonBlock({
            procedureCode: 'second block',
            callback: args => {
                callOrder.push(['second block', Clone.simple(args)]);
            }
        });

        vm.loadProject(fixtureData).then(() => {
            vm.greenFlag();
            vm.runtime._step();
            t.same(callOrder, [
                ['first block', {'number or text': 5}],
                ['first block', {'number or text': 5}]
            ]);
            t.end();
        });
    });

    test(`${subtestName} - stop in reporter block`, t => {
        const vm = new VM();
        vm.setCompilerOptions({enabled: enableCompiler});
        t.equal(vm.runtime.compilerOptions.enabled, enableCompiler);

        const callOrder = [];
        vm.addAddonBlock({
            procedureCode: 'first block %s',
            arguments: ['number or text'],
            callback: args => {
                callOrder.push(['first block', Clone.simple(args)]);
            }
        });
        vm.addAddonBlock({
            procedureCode: 'inner block',
            return: 1,
            callback: (args, util) => {
                callOrder.push(['input block', Clone.simple(args)]);
                stopFunction(util.thread);
                return callOrder.length;
            }
        });
        vm.addAddonBlock({
            procedureCode: 'second block',
            callback: args => {
                callOrder.push(['second block', Clone.simple(args)]);
            }
        });

        vm.loadProject(fixtureData).then(() => {
            vm.greenFlag();
            vm.runtime._step();
            t.same(callOrder, [
                ['input block', {}]
            ]);
            t.end();
        });
    });

    test(`${subtestName} - stop in reporter block after yielding once`, t => {
        const vm = new VM();
        vm.setCompilerOptions({enabled: enableCompiler});
        t.equal(vm.runtime.compilerOptions.enabled, enableCompiler);

        const callOrder = [];
        vm.addAddonBlock({
            procedureCode: 'first block %s',
            arguments: ['number or text'],
            callback: args => {
                callOrder.push(['first block', Clone.simple(args)]);
            }
        });
        vm.addAddonBlock({
            procedureCode: 'inner block',
            return: 1,
            callback: (args, util) => {
                callOrder.push(['input block', Clone.simple(args)]);
                if (callOrder.length === 1) {
                    util.yield();
                    // TODO: interpreter bug, should not need to do this...
                    util.thread.peekStackFrame().waitingReporter = true;
                } else {
                    stopFunction(util.thread);
                }
                return callOrder.length;
            }
        });
        vm.addAddonBlock({
            procedureCode: 'second block',
            callback: args => {
                callOrder.push(['second block', Clone.simple(args)]);
            }
        });

        vm.loadProject(fixtureData).then(() => {
            vm.greenFlag();
            vm.runtime._step();
            t.same(callOrder, [
                ['input block', {}],
                ['input block', {}]
            ]);
            t.end();
        });
    });
}
