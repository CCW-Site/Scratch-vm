const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const platform = require('../../src/engine/tw-platform');
const Clone = require('../../src/util/clone');

test('the internal object', t => {
    // the idea with this test is to make it harder for forks to screw up modifying the file
    t.type(platform.name, 'string');
    t.type(platform.url, 'string');
    t.end();
});

test('vm property', t => {
    const vm = new VM();
    t.same(vm.runtime.platform, platform, 'copy of tw-platform.js');
    t.not(vm.runtime.platform, platform, 'not the same object as tw-platform.js');
    t.end();
});

test('sanitize', t => {
    const vm = new VM();
    vm.runtime.platform.name += ' - test';
    const json = JSON.parse(vm.toJSON());
    t.same(json.meta.platform, vm.runtime.platform, 'copy of runtime.platform');
    t.not(json.meta.platform, vm.runtime.platform, 'not the same object as runtime.platform');
    t.end();
});

const vanillaProject = {
    targets: [
        {
            isStage: true,
            name: 'Stage',
            variables: {},
            lists: {},
            broadcasts: {},
            blocks: {},
            comments: {},
            currentCostume: 0,
            costumes: [
                {
                    name: 'backdrop1',
                    dataFormat: 'svg',
                    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                    rotationCenterX: 240,
                    rotationCenterY: 180
                }
            ],
            sounds: [],
            volume: 100,
            layerOrder: 0,
            tempo: 60,
            videoTransparency: 50,
            videoState: 'on',
            textToSpeechLanguage: null
        }
    ],
    monitors: [],
    extensions: [],
    meta: {
        semver: '3.0.0',
        vm: '0.2.0',
        agent: ''
    }
};

test('deserialize no platform', t => {
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', () => {
        t.fail('Called PLATFORM_MISMATCH');
    });
    vm.loadProject(vanillaProject).then(() => {
        t.end();
    });
});

test('deserialize matching platform', t => {
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', () => {
        t.fail('Called PLATFORM_MISMATCH');
    });
    const project = Clone.simple(vanillaProject);
    project.meta.platform = Object.assign({}, platform);
    vm.loadProject(project).then(() => {
        t.end();
    });
});

test('deserialize mismatching platform with no listener', t => {
    const vm = new VM();
    const project = Clone.simple(vanillaProject);
    project.meta.platform = {
        name: '3tw4ergo980uitegr5hoijuk;'
    };
    vm.loadProject(project).then(() => {
        t.end();
    });
});

test('deserialize mismatching platform with 1 listener', t => {
    t.plan(2);
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', (pl, callback) => {
        t.same(pl, {
            name: 'aa',
            url: '...'
        });
        t.ok('called PLATFORM_MISMATCH');
        callback();
    });
    const project = Clone.simple(vanillaProject);
    project.meta.platform = {
        name: 'aa',
        url: '...'
    };
    vm.loadProject(project).then(() => {
        t.end();
    });
});

test('deserialize mismatching platform with 3 listeners', t => {
    t.plan(2);

    const calls = [];
    let expectedToLoad = false;
    const vm = new VM();
    vm.runtime.on('PLATFORM_MISMATCH', (_, callback) => {
        calls.push([1, callback]);
    });
    vm.runtime.on('PLATFORM_MISMATCH', (_, callback) => {
        calls.push([2, callback]);
    });
    vm.runtime.on('PLATFORM_MISMATCH', (_, callback) => {
        calls.push([3, callback]);
    });

    const project = Clone.simple(vanillaProject);
    project.meta.platform = {
        name: ''
    };
    vm.loadProject(project).then(() => {
        t.ok(expectedToLoad);
        t.end();
    });

    // loadProject is async, may need to wait a bit
    setTimeout(async () => {
        t.same(calls.map(i => i[0]), [1, 2, 3], 'listeners called in correct order');

        // loadProject should not finish until we call all of the listeners' callbacks
        calls[0][1]();
        await new Promise(resolve => setTimeout(resolve, 100));

        calls[1][1]();
        await new Promise(resolve => setTimeout(resolve, 100));

        expectedToLoad = true;
        calls[2][1]();
    }, 0);
});
