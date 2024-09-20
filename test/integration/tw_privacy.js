const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');
const VM = require('../../src/virtual-machine');
const makeTestVM = require('../fixtures/make-test-vm');
const mockRenderer = () => ({
    setLayerGroupOrdering: () => {
        // not relevant to this test
    },

    privateSkinAccess: true,
    setPrivateSkinAccess (enabled) {
        this.privateSkinAccess = enabled;
    }
});

test('baseline: no external communication methods', t => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    t.equal(rt.renderer.privateSkinAccess, true);
    t.end();
});

test('throws errors for unknown method', t => {
    t.plan(1);
    const rt = new Runtime();
    try {
        rt.setExternalCommunicationMethod('something fake', true);
    } catch (e) {
        t.equal(e.message, 'Unknown method: something fake');
    }
    t.end();
});

test('communication method enabled after attaching renderer', t => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    rt.setExternalCommunicationMethod('cloudVariables', true);
    t.equal(rt.renderer.privateSkinAccess, false);
    t.end();
});

test('communication method enabled before attaching renderer', t => {
    const rt = new Runtime();
    rt.setExternalCommunicationMethod('cloudVariables', true);
    rt.attachRenderer(mockRenderer());
    t.equal(rt.renderer.privateSkinAccess, false);
    t.end();
});

test('disable enforcement', t => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    rt.setEnforcePrivacy(false);
    rt.setExternalCommunicationMethod('cloudVariables', true);
    t.equal(rt.renderer.privateSkinAccess, true);
    t.end();
});

test('multiple features toggled', t => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());
    rt.setExternalCommunicationMethod('cloudVariables', true);
    t.equal(rt.renderer.privateSkinAccess, false);
    rt.setExternalCommunicationMethod('customExtensions', true);
    t.equal(rt.renderer.privateSkinAccess, false);
    rt.setExternalCommunicationMethod('cloudVariables', false);
    t.equal(rt.renderer.privateSkinAccess, false);
    rt.setExternalCommunicationMethod('customExtensions', false);
    t.equal(rt.renderer.privateSkinAccess, true);
    t.end();
});

test('cloud variables', t => {
    const rt = new Runtime();
    rt.attachRenderer(mockRenderer());

    rt.addCloudVariable();
    t.equal(rt.renderer.privateSkinAccess, false);

    rt.addCloudVariable();
    t.equal(rt.renderer.privateSkinAccess, false);

    rt.removeCloudVariable();
    t.equal(rt.renderer.privateSkinAccess, false);

    rt.removeCloudVariable();
    t.equal(rt.renderer.privateSkinAccess, true);

    t.end();
});
return;
// privateSkinAccess unsupported yet
test('custom extensions', async t => {
    const vm = makeTestVM();
    vm.attachRenderer(mockRenderer());
    vm.extensionManager.securityManager.getSandboxMode = () => 'unsandboxed';
    global.document = {
        createElement: () => {
            const element = {};
            setTimeout(() => {
                global.Scratch.extensions.register({
                    getInfo: () => ({
                        id: 'example',
                        name: 'example'
                    })
                });
                element.successCallBack[0]();
            });
            return element;
        },
        getElementById: () => null,
        body: {
            appendChild: () => {},
            append: () => {},
            appendChild: () => {},
            removeChild: () => {}
        }
    };
    global.addEventListener = () => {};
    global.removeEventListener = () => {};

    t.equal(vm.renderer.privateSkinAccess, true);
    await vm.extensionManager.loadExtensionURL('http://localhost/example');
    t.equal(vm.renderer.privateSkinAccess, false);
    t.end();
});
