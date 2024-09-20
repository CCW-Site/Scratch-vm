const ScratchXUtilities = require('../../src/extension-support/tw-scratchx-utilities');
const createScratchX = require('../../src/extension-support/tw-scratchx-compatibility-layer');
const {test} = require('tap');

test('argument index to id', t => {
    t.equal(ScratchXUtilities.argumentIndexToId(0), '0');
    t.equal(ScratchXUtilities.argumentIndexToId(1), '1');
    t.equal(ScratchXUtilities.argumentIndexToId(2), '2');
    t.equal(ScratchXUtilities.argumentIndexToId(3), '3');
    t.equal(ScratchXUtilities.argumentIndexToId(39), '39');
    t.equal(ScratchXUtilities.argumentIndexToId(1000000000), '1000000000');
    t.end();
});

test('generate extension id', t => {
    t.equal(ScratchXUtilities.generateExtensionId('Spotify'), 'sbxspotify');
    t.equal(ScratchXUtilities.generateExtensionId('Spo _t ify'), 'sbxspotify');
    t.equal(ScratchXUtilities.generateExtensionId('Spo _t $#@! 3ify😮'), 'sbxspot3ify');
    t.end();
});

const mockScratchExtensions = () => {
    const mockScratch = {};
    return createScratchX(mockScratch);
};

const convert = (...args) => {
    let registered = null;
    const mockScratch = {
        extensions: {
            register: extensionObject => {
                if (registered) {
                    // In tests we don't want this
                    throw new Error('register() called twice');
                }
                registered = extensionObject;
            }
        }
    };
    const ScratchExtensions = createScratchX(mockScratch);
    ScratchExtensions.register(...args);
    if (!registered) {
        throw new Error('Did not register()');
    }
    return registered;
};

test('register', t => {
    const ScratchExtensions = mockScratchExtensions();
    t.type(ScratchExtensions.register, 'function');
    t.end();
});

test('complex extension', async t => {
    let stepsMoved = 0;
    const moveSteps = n => {
        stepsMoved += n;
    };

    let doNothingCalled = false;
    const doNothing = () => {
        doNothingCalled = true;
    };

    const fetch = (url, callback) => {
        callback(`Fetched: ${url}`);
        return 'This value should be ignored.';
    };

    const multiplyAndAppend = (a, b, c) => `${a * b}${c}`;

    const repeat = (string, count, callback) => {
        callback(string.repeat(count));
        return 'This value should be ignored.';
    };

    const touching = (sprite, bool) => sprite === 'Sprite9' && bool === true;

    const converted = convert(
        'My Extension',
        {
            blocks: [
                ['', 'move %n steps', 'moveSteps', 50],
                [' ', 'do nothing', 'doNothing', 100, 200],
                ['w', 'fetch %m:urls1', 'fetch'],
                [' '],
                ['r', 'multiply %n by %n and append %s', 'multiplyAndAppend'],
                ['R', 'repeat %m.myMenu %n', 'repeat', ''],
                ['-'],
                ['b', 'touching %s %b', 'touching', 'Sprite1', 'ignored']
            ],
            menus: {
                myMenu: ['abc', 'def', 123, true, false],
                urls1: ['https://example.com/', 'https://example.org/']
            },
            url: 'https://turbowarp.org/myextensiondocs.html'
        },
        {
            unusedGarbage: 10,
            moveSteps,
            doNothing,
            fetch,
            multiplyAndAppend,
            repeat,
            touching
        }
    );

    const info = converted.getInfo();
    t.equal(info.id, 'sbxmyextension');
    t.equal(info.docsURI, 'https://turbowarp.org/myextensiondocs.html');

    t.same(info.blocks, [
        {
            opcode: 'moveSteps',
            text: 'move [0] steps',
            blockType: 'command',
            arguments: [
                {
                    type: 'number',
                    defaultValue: 50
                }
            ]
        },
        {
            opcode: 'doNothing',
            text: 'do nothing',
            blockType: 'command',
            arguments: []
        },
        {
            opcode: 'fetch',
            text: 'fetch [0]',
            blockType: 'command',
            arguments: [
                {
                    type: 'string',
                    menu: 'urls1'
                }
            ]
        },
        '---',
        {
            opcode: 'multiplyAndAppend',
            text: 'multiply [0] by [1] and append [2]',
            blockType: 'reporter',
            arguments: [
                {
                    type: 'number',
                    defaultValue: 0
                },
                {
                    type: 'number',
                    defaultValue: 0
                },
                {
                    type: 'string',
                    defaultValue: ''
                }
            ]
        },
        {
            opcode: 'repeat',
            text: 'repeat [0] [1]',
            blockType: 'reporter',
            arguments: [
                {
                    type: 'string',
                    menu: 'myMenu',
                    defaultValue: ''
                },
                {
                    type: 'number',
                    defaultValue: 0
                }
            ]
        },
        '---',
        {
            opcode: 'touching',
            text: 'touching [0] [1]',
            blockType: 'Boolean',
            arguments: [
                {
                    type: 'string',
                    defaultValue: 'Sprite1'
                },
                {
                    type: 'Boolean'
                }
            ]
        }
    ]);

    t.same(info.menus, {
        myMenu: {
            items: ['abc', 'def', 123, true, false]
        },
        urls1: {
            items: ['https://example.com/', 'https://example.org/']
        }
    });

    // Now let's make sure that the converter has properly wrapped our functions.
    t.equal(stepsMoved, 0);
    t.equal(converted.moveSteps({
        0: 30
    }), undefined);
    t.equal(stepsMoved, 30);

    t.equal(doNothingCalled, false);
    t.equal(converted.doNothing({}), undefined);
    t.equal(doNothingCalled, true);

    t.type(converted.fetch({
        0: 'https://example.com/'
    }).then, 'function');
    t.equal(await converted.fetch({
        0: 'https://example.com/'
    }), 'Fetched: https://example.com/');

    t.equal(converted.multiplyAndAppend({
        0: 31,
        1: 7,
        2: 'Cat'
    }), '217Cat');

    t.type(converted.repeat({
        0: '',
        1: 0
    }).then, 'function');
    t.equal(await converted.repeat({
        0: 'scratchx',
        1: 3
    }), 'scratchxscratchxscratchx');

    t.equal(converted.touching({
        0: 'Sprite1',
        1: true
    }), false);
    t.equal(converted.touching({
        0: 'Sprite9',
        1: true
    }), true);
    t.equal(converted.touching({
        0: 'Sprite9',
        1: false
    }), false);

    t.end();
});

test('display name', t => {
    const converted = convert(
        'Internal Name',
        {
            blocks: [],
            displayName: 'Display Name'
        },
        {

        }
    );
    t.equal(converted.getInfo().name, 'Display Name');
    t.end();
});

test('_getStatus', t => {
    const _getStatus = () => ({
        status: 2,
        msg: 'Ready'
    });
    const converted = convert(
        'Name',
        {
            blocks: []
        },
        {
            _getStatus: _getStatus,
            unusedProperty: 10
        }
    );
    t.equal(converted._getStatus, _getStatus);
    t.equal('unusedProperty' in converted, false);
    t.end();
});
