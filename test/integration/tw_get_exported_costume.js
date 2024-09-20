const VM = require('../../src/virtual-machine');
const {test} = require('tap');

// The actual logic of the costume exporting and importing is tested elsewhere.
// This is just to make sure that the VM's shims are going to the right place.

test('getExportedCostume', t => {
    const vm = new VM();
    t.same(
        vm.getExportedCostume({
            asset: {
                data: new Uint8Array([97, 98, 99])
            },
            dataFormat: 'png'
        }),
        new Uint8Array([97, 98, 99])
    );
    t.end();
});

test('getExportedCostumeBase64', t => {
    // We'll just make sure that the output is being base64 encoded.
    const vm = new VM();
    t.same(
        vm.getExportedCostumeBase64({
            asset: {
                data: new Uint8Array([97, 98, 99])
            },
            dataFormat: 'png'
        }),
        // btoa("abc")
        'YWJj'
    );
    t.end();
});
