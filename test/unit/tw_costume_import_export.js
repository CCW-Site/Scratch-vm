const {
    parseVectorMetadata,
    exportCostume
} = require('../../src/serialization/tw-costume-import-export');
const {test} = require('tap');

test('parseVectorMetadata', t => {
    /* eslint-disable max-len */
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:0:0-->'),
        [0, 0]
    );
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:-0.0:-0.0-->'),
        [0, 0]
    );
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:-1:3-->'),
        [-1, 3]
    );
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:106.62300344745225:-11.822572945859918-->'),
        [106.62300344745225, -11.822572945859918]
    );
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:a:b-->'),
        null
    );
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg><!--rotationCenter:-1:-->'),
        null
    );
    t.same(
        parseVectorMetadata('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>'),
        null
    );
    /* eslint-enable max-len */

    t.end();
});

test('exportCostume', t => {
    // PNG and JPG costumes are exported as-is
    t.same(exportCostume({
        dataFormat: 'png',
        asset: {
            data: new Uint8Array([10, 20, 30])
        }
    }), new Uint8Array([10, 20, 30]));
    t.same(exportCostume({
        dataFormat: 'jpg',
        asset: {
            data: new Uint8Array([40, 50, 60])
        }
    }), new Uint8Array([40, 50, 60]));

    t.same(exportCostume({
        dataFormat: 'svg',
        asset: {
            data: new TextEncoder().encode('<svg></svg>')
        },
        rotationCenterX: 89.339393,
        rotationCenterY: -3.7373
    }), new TextEncoder().encode('<svg></svg><!--rotationCenter:89.339393:-3.7373-->'));

    t.same(exportCostume({
        dataFormat: 'svg',
        asset: {
            data: new TextEncoder().encode('<svg></svg><!--rotationCenter:78.23:-9-->')
        },
        rotationCenterX: 89.339393,
        rotationCenterY: -3.7373
    }), new TextEncoder().encode('<svg></svg><!--rotationCenter:89.339393:-3.7373-->'));

    t.end();
});
