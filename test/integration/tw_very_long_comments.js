const {test} = require('tap');
const fs = require('fs');
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const sb3 = require('../../src/serialization/sb3');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const path = require('path');

test('serializes very long comments', t => {
    const rt = new Runtime();
    const sprite = new Sprite();
    const target = new RenderedTarget(sprite, rt);
    rt.addTarget(target);

    target.createComment('id_short', null, 'short comment', 0, 0, 20, 20, false);
    target.createComment('id_max_length', null, `start${'0'.repeat(8000 - 5)}`, 0, 0, 20, 20, false);
    target.createComment('id_max_length_plus_1', null, `start${'0'.repeat(8000 - 5)}a`, 0, 0, 20, 20, false);
    target.createComment(
        'id_way_too_long',
        null,
        `start${'0'.repeat(8000 - 5 - 3)}endthis should be the truncated part${'0'.repeat(25000)}`,
        0,
        0,
        20,
        20,
        false
    );

    const serialized = sb3.serialize(rt, target.id);
    const common = {
        // same for every block, already tested elsewhere, not interesting for here
        blockId: null,
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        minimized: false
    };
    t.same(serialized.comments, {
        id_short: {
            ...common,
            text: 'short comment'
        },
        id_max_length: {
            ...common,
            text: `start${'0'.repeat(8000 - 5)}`
        },
        id_max_length_plus_1: {
            ...common,
            text: `start${'0'.repeat(8000 - 5)}`,
            extraText: 'a'
        },
        id_way_too_long: {
            ...common,
            text: `start${'0'.repeat(8000 - 5 - 3)}end`,
            extraText: `this should be the truncated part${'0'.repeat(25000)}`
        }
    });

    t.end();
});

test('deserializes very long comments', t => {
    const vm = new VirtualMachine();
    const fixture = fs.readFileSync(path.resolve(__dirname, '../fixtures/tw-very-long-comments.sb3'));
    vm.loadProject(fixture).then(() => {
        const comments = vm.runtime.targets[0].comments;

        // note that comment IDs may change each time the test project is saved
        t.equal(comments.b.text, '');
        t.equal(comments.a.text, 'short');
        t.equal(comments.c.text, `exactly length limit${'0'.repeat(8000 - 'exactly length limit'.length)}`);
        t.equal(comments.d.text, `length limit + 1${':'.repeat(8000 - 'length limit + 1'.length)}1`);
        t.equal(
            comments.e.text,
            `unreasonably long${'!'.repeat(8000 - 'unreasonably long'.length)}${'123456789'.repeat(2000)}`
        );

        t.end();
    });
});
