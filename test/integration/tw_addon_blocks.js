const tap = require('tap');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');
const Thread = require('../../src/engine/thread');

const fixtureData = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-addon-blocks.sb3'));

const runExecutionTests = compilerEnabled => test => {
    const load = async () => {
        const vm = new VirtualMachine();
        vm.setCompilerOptions({
            enabled: compilerEnabled
        });
        vm.on('COMPILE_ERROR', (target, error) => {
            test.fail(`Compile error in ${target.getName()}: ${error}`);
        });
        await vm.loadProject(fixtureData);
        return vm;
    };

    const getVar = (vm, variableName) => {
        const variable = vm.runtime.getTargetForStage().lookupVariableByNameAndType(variableName, '');
        return variable.value;
    };

    test.test('baseline - no addon blocks', t => {
        load().then(vm => {
            t.equal(getVar(vm, 'block 1'), 'initial');
            t.equal(getVar(vm, 'block 2'), 'initial');
            t.equal(getVar(vm, 'block 3'), 'initial');
            t.equal(getVar(vm, 'block 4'), 'initial');
            t.equal(getVar(vm, 'block 4 output'), 'initial');

            vm.greenFlag();
            vm.runtime._step();

            t.equal(getVar(vm, 'block 1'), 'block 1 ran');
            t.equal(getVar(vm, 'block 2'), 'block 2: banana');
            t.equal(getVar(vm, 'block 3'), 'block 3 ran');
            t.equal(getVar(vm, 'block 4'), 'block 4 ran');
            t.equal(getVar(vm, 'block 4 output'), 'block 4: apple');

            t.end();
        });
    });

    test.test('simple statement blocks', t => {
        load().then(vm => {
            t.plan(9);

            let calledBlock1 = false;
            let calledBlock2 = false;

            vm.addAddonBlock({
                procedureCode: 'block 1',
                callback: (args, util) => {
                    calledBlock1 = true;
                    t.same(args, {});
                    t.ok(util.thread instanceof Thread);
                    // may have to update when project changes
                    t.equal(util.thread.peekStack(), 'd');
                }
            });

            vm.addAddonBlock({
                procedureCode: 'block 2 %s',
                arguments: ['number or text'],
                callback: (args, util) => {
                    calledBlock2 = true;
                    t.same(args, {
                        'number or text': 'banana'
                    });
                    // may have to update when project changes
                    t.equal(util.thread.peekStack(), 'c');
                }
            });

            vm.greenFlag();
            vm.runtime._step();

            t.ok(calledBlock1);
            t.ok(calledBlock2);

            // Overridden blocks should not run
            t.equal(getVar(vm, 'block 1'), 'false');
            t.equal(getVar(vm, 'block 2'), 'false');

            t.end();
        });
    });

    test.test('yield with thread.status = STATUS_PROMISE_WAIT', t => {
        load().then(vm => {
            t.plan(7);

            let threadToResume;
            let ranBlock3 = false;
            vm.addAddonBlock({
                procedureCode: 'block 3',
                callback: (args, util) => {
                    ranBlock3 = true;
                    util.thread.status = Thread.STATUS_PROMISE_WAIT;
                    threadToResume = util.thread;
                },
                arguments: []
            });

            vm.greenFlag();
            vm.runtime._step();

            // Make sure we paused it
            t.ok(ranBlock3);
            t.equal(threadToResume.status, Thread.STATUS_PROMISE_WAIT);

            // Should've stopped after block 2
            t.equal(getVar(vm, 'block 2'), 'block 2: banana');
            t.equal(getVar(vm, 'block 3'), 'false');
            t.equal(getVar(vm, 'block 4'), 'false');

            threadToResume.status = Thread.STATUS_RUNNING;
            vm.runtime._step();

            // Should've finished running
            t.equal(getVar(vm, 'block 3'), 'false'); // overridden, should not run
            t.equal(getVar(vm, 'block 4'), 'block 4 ran');

            t.end();
        });
    });

    test.test('yield with util.yield()', t => {
        load().then(vm => {
            t.plan(10);

            let shouldYield = true;
            let calledBlock1 = 0;

            vm.addAddonBlock({
                procedureCode: 'block 1',
                callback: (args, util) => {
                    calledBlock1++;

                    if (shouldYield) {
                        util.runtime.requestRedraw();
                        util.yield();
                    }
                },
                arguments: []
            });

            vm.greenFlag();
            for (let i = 0; i < 10; i++) {
                vm.runtime._step();
            }

            t.equal(calledBlock1, 10);
            t.equal(getVar(vm, 'block 1'), 'false');
            t.equal(getVar(vm, 'block 2'), 'false');
            t.equal(getVar(vm, 'block 3'), 'false');
            t.equal(getVar(vm, 'block 4'), 'false');

            shouldYield = false;
            vm.runtime._step();

            t.equal(calledBlock1, 11);
            t.equal(getVar(vm, 'block 1'), 'false'); // overrridden, should not run
            t.equal(getVar(vm, 'block 2'), 'block 2: banana');
            t.equal(getVar(vm, 'block 3'), 'block 3 ran');
            t.equal(getVar(vm, 'block 4'), 'block 4 ran');

            t.end();
        });
    });

    test.test('yield with resolved Promise', t => {
        load().then(vm => {
            let resolveCallback;
            vm.addAddonBlock({
                procedureCode: 'block 2 %s',
                arguments: ['number or text'],
                callback: () => new Promise(resolve => {
                    resolveCallback = resolve;
                })
            });

            vm.greenFlag();
            for (let i = 0; i < 5; i++) {
                vm.runtime._step();
            }

            t.type(resolveCallback, 'function');
            t.equal(getVar(vm, 'block 1'), 'block 1 ran');
            t.equal(getVar(vm, 'block 2'), 'false');
            t.equal(getVar(vm, 'block 3'), 'false');
            t.equal(getVar(vm, 'block 4'), 'false');

            resolveCallback();
            Promise.resolve().then(() => {
                vm.runtime._step();
                t.equal(getVar(vm, 'block 2'), 'false'); // overridden, should not run
                t.equal(getVar(vm, 'block 3'), 'block 3 ran');
                t.equal(getVar(vm, 'block 4'), 'block 4 ran');

                t.end();
            });
        });
    });

    /*
    // Doesn't work right now -- not clear whether it should or not
    test.skip('yield with rejected Promise', t => {
        load().then(vm => {
            let rejectCallback;
            vm.addAddonBlock({
                procedureCode: 'block 2 %s',
                arguments: ['number or text'],
                callback: () => new Promise((resolve, reject) => {
                    rejectCallback = reject;
                })
            });

            vm.greenFlag();
            for (let i = 0; i < 5; i++) {
                vm.runtime._step();
            }

            t.type(rejectCallback, 'function');
            t.equal(getVar(vm, 'block 1'), 'block 1 ran');
            t.equal(getVar(vm, 'block 2'), 'false');
            t.equal(getVar(vm, 'block 3'), 'false');
            t.equal(getVar(vm, 'block 4'), 'false');

            rejectCallback(new Error('Intentional error for testing'));
            Promise.resolve().then(() => {
                vm.runtime._step();
                t.equal(getVar(vm, 'block 2'), 'false'); // overridden, should not run
                t.equal(getVar(vm, 'block 3'), 'block 3 ran');
                t.equal(getVar(vm, 'block 4'), 'block 4 ran');

                t.end();
            });
        });
    });
    */

    test.test('returning values', t => {
        load().then(vm => {
            vm.addAddonBlock({
                procedureCode: 'block 4 %s',
                callback: args => {
                    t.same(args, {
                        'number or text': 'apple'
                    });
                    return `value from addon block: ${args['number or text']}`;
                },
                arguments: ['number or text']
            });

            vm.greenFlag();
            vm.runtime._step();

            t.equal(getVar(vm, 'block 1'), 'block 1 ran');
            t.equal(getVar(vm, 'block 2'), 'block 2: banana');
            t.equal(getVar(vm, 'block 3'), 'block 3 ran');
            t.equal(getVar(vm, 'block 4'), 'false'); // block 4 itself should not have run, we overrode it
            t.equal(getVar(vm, 'block 4 output'), 'value from addon block: apple');

            t.end();
        });
    });

    test.end();
};

tap.test('with compiler disabled', runExecutionTests(false));
tap.test('with compiler enabled', runExecutionTests(true));

tap.test('block info', t => {
    const vm = new VirtualMachine();

    const BLOCK_INFO_ID = 'a-b';

    vm.addAddonBlock({
        procedureCode: 'hidden %s',
        arguments: ['number or text'],
        callback: () => {},
        hidden: true
    });

    let blockInfo = vm.runtime._blockInfo.find(i => i.id === BLOCK_INFO_ID);
    t.equal(blockInfo, undefined);

    vm.addAddonBlock({
        procedureCode: 'statement %s',
        arguments: ['number or text'],
        callback: () => {}
    });
    vm.addAddonBlock({
        procedureCode: 'input %s',
        arguments: ['an argument'],
        callback: () => {},
        return: 1
    });

    blockInfo = vm.runtime._blockInfo.find(i => i.id === BLOCK_INFO_ID);
    t.type(blockInfo.id, 'string');
    t.type(blockInfo.name, 'string');
    t.type(blockInfo.color1, 'string');
    t.type(blockInfo.color2, 'string');
    t.type(blockInfo.color3, 'string');
    t.same(blockInfo.blocks, [
        {
            info: {},
            // eslint-disable-next-line max-len
            xml: '<block type="procedures_call" gap="16"><mutation generateshadows="true" warp="false" proccode="statement %s" argumentnames="[&quot;number or text&quot;]" argumentids="[&quot;arg0&quot;]" argumentdefaults="[&quot;&quot;]"></mutation></block>'
        },
        {
            info: {},
            // eslint-disable-next-line max-len
            xml: '<block type="procedures_call" gap="16"><mutation generateshadows="true" warp="false" proccode="input %s" argumentnames="[&quot;an argument&quot;]" argumentids="[&quot;arg0&quot;]" argumentdefaults="[&quot;&quot;]" return="1"></mutation></block>'
        }
    ]);

    t.end();
});
