const {test} = require('tap');
const ExtensionManager = require('../../src/extension-support/extension-manager');
const VM = require('../fixtures/make-test-vm');

test('isBuiltinExtension', t => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    t.equal(manager.isBuiltinExtension('pen'), true);
    t.equal(manager.isBuiltinExtension('lksdfjlskdf'), false);
    t.end();
});

test('_isValidExtensionURL', t => {
    const fakeRuntime = {};
    const manager = new ExtensionManager(fakeRuntime);
    t.equal(manager._isValidExtensionURL('fetch'), false);
    t.equal(manager._isValidExtensionURL(''), false);
    t.equal(manager._isValidExtensionURL('extensions.turbowarp.org/fetch.js'), false);
    t.equal(manager._isValidExtensionURL('https://extensions.turbowarp.org/fetch.js'), true);
    t.equal(manager._isValidExtensionURL('http://extensions.turbowarp.org/fetch.js'), true);
    t.equal(manager._isValidExtensionURL('http://localhost:8000'), true);
    t.equal(manager._isValidExtensionURL('data:application/javascript;base64,YWxlcnQoMSk='), true);
    t.equal(manager._isValidExtensionURL('file:///home/test/extension.js'), true);
    t.end();
});

test('loadExtensionURL, getExtensionURLs, deduplication', async t => {
    const vm = new VM();

    let loadedExtensions = 0;
    vm.extensionManager.securityManager.getSandboxMode = () => 'unsandboxed';
    global.document = {
        createElement: () => {
            loadedExtensions++;
            const element = {
                addEventListener () {},
                removeEventListener () {}
            };
            setTimeout(() => {
                global.Scratch.extensions.register({
                    getInfo: () => ({
                        id: `extension${loadedExtensions}`
                    })
                });
            });
            return element;
        },
        getElementById: () => null,
        body: {
            append: () => {},
            appendChild: () => {},
            removeChild: () => {}
        }
    };
    global.addEventListener = () => {};
    global.removeEventListener = () => {};

    const url1 = 'https://turbowarp.org/1.js';
    t.equal(vm.extensionManager.isExtensionURLLoaded(url1), false);
    t.same(vm.extensionManager.getExtensionURLs(), {});
    await vm.extensionManager.loadExtensionURL(url1);
    t.equal(vm.extensionManager.isExtensionURLLoaded(url1), true);
    t.equal(loadedExtensions, 1);
    t.same(vm.extensionManager.getExtensionURLs(), {
        extension1: url1
    });
    // Loading the extension again should do nothing.
    await vm.extensionManager.loadExtensionURL(url1);
    t.equal(vm.extensionManager.isExtensionURLLoaded(url1), true);
    t.equal(loadedExtensions, 1);
    t.same(vm.extensionManager.getExtensionURLs(), {
        extension1: url1
    });

    // Loading another extension should work
    const url2 = 'https://turbowarp.org/2.js';
    t.equal(vm.extensionManager.isExtensionURLLoaded(url2), false);
    await vm.extensionManager.loadExtensionURL(url2);
    t.equal(vm.extensionManager.isExtensionURLLoaded(url2), true);
    t.same(vm.extensionManager.getExtensionURLs(), {
        extension1: url1,
        extension2: url2
    });

    t.end();
});
