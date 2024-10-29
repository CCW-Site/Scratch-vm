const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');

test('Loading project uses default extension URLs', t => {
    t.plan(1);

    const vm = new VirtualMachine();
    const events = [];
    // we don't use securityManager for now
    vm.securityManager.canLoadExtensionFromProject = url =>
        // events.push(`canLoadExtensionFromProject ${url}`);
        true
    ;
    vm.extensionManager.loadExtensionURL = url => {
        events.push(`loadExtensionURL ${url}`);
        return Promise.resolve();
    };

    vm.loadProject({
        targets: [
            {
                isStage: true,
                name: 'Stage',
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: {
                    a: {
                        opcode: 'text_clearText',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 203,
                        y: 250
                    },
                    b: {
                        opcode: 'pen_clear',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 203,
                        y: 250
                    },
                    c: {
                        opcode: 'griffpatch_doTick',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: {},
                        shadow: false,
                        topLevel: true,
                        x: 203,
                        y: 250
                    }
                },
                comments: {},
                currentCostume: 0,
                costumes: [
                    {
                        assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
                        dataFormat: 'svg',
                        md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
                        name: 'backdrop1',
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
        extensions: [
            // this list intentionally wrong to make sure we don't rely on its contents
        ],
        extensionURLs: {
            griffpatch: 'https://example.com/box2d.js'
        },
        gandi: {
            wildExtension: {
                griffpatch: {id: 'griffpatch', url: 'https://example.com/box2d.js'}
            }
        },
        meta: {
            semver: '3.0.0',
            vm: '0.2.0',
            agent: ''
        }
    }).then(() => {
        t.same(events, [
            'loadExtensionURL text',
            'loadExtensionURL pen',
            'loadExtensionURL https://example.com/box2d.js'
        ]);

        t.end();
    });
});
