const tap = require('tap');
const UnsandboxedExtensionRunner = require('../../src/extension-support/tw-unsandboxed-extension-runner');
const VirtualMachine = require('../../src/virtual-machine');

// Mock enough of the document API for the extension runner to think it works.
// To more accurately test this, we want to make sure that the URLs we pass in are just strings.
// We use a bit of hacky state here to make our document mock know what function to run
// when a script with a given URL "loads"
const scriptCallbacks = new Map();
const setScript = (src, callback) => {
    scriptCallbacks.set(src, callback);
};

const append = element => {
    if (element.tagName === 'SCRIPT') {
        setTimeout(() => {
            const callback = scriptCallbacks.get(element.src.split('?')[0]);
            if (callback) {
                callback();
                element.onload();
            } else {
                element.onerror();
            }
        }, 50);
    }
};
global.document = {
    createElement: tagName => {
        if (tagName.toLowerCase() !== 'script') {
            throw new Error(`Unknown element: ${tagName}`);
        }
        return {
            tagName: 'SCRIPT',
            src: '',
            onload: () => {},
            onerror: () => {}
        };
    },
    getElementById: () => null,
    body: {
        appendChild: append,
        append,
        removeChild: () => {}
    }
};

global.addEventListener = () => {};
global.removeEventListener = () => {};

// Mock various DOM APIs for fetching, window opening, redirecting, etc.
global.Request = class {
    constructor (url) {
        this.url = url;
    }
};
global.fetch = (url, options = {}) => (
    Promise.resolve(`[Response ${url instanceof Request ? url.url : url} options=${JSON.stringify(options)}]`)
);
global.window = {
    open: (url, target, features) => `[Window ${url} target=${target || ''} features=${features || ''}]`
};

// Remove navigator object from Node 21 and later
delete global.navigator;

tap.beforeEach(() => {
    scriptCallbacks.clear();
    global.location = {
        href: 'https://example.com/'
    };
});

const {test} = tap;

test('basic API', async t => {
    t.plan(9);
    const vm = new VirtualMachine();
    class MyExtension {}
    setScript('https://turbowarp.org/1.js', () => {
        t.equal(global.Scratch.vm, vm);
        t.equal(global.Scratch.renderer, vm.runtime.renderer);
        t.equal(global.Scratch.extensions.unsandboxed, true);

        // These APIs are tested elsewhere, just make sure they're getting exported
        t.equal(global.Scratch.ArgumentType.NUMBER, 'number');
        t.equal(global.Scratch.BlockType.REPORTER, 'reporter');
        t.equal(global.Scratch.TargetType.SPRITE, 'sprite');
        t.equal(global.Scratch.Cast.toNumber('3.14'), 3.14);

        global.Scratch.extensions.register(new MyExtension());
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/1.js', vm);
    t.equal(extensions.length, 1);
    t.ok(extensions[0] instanceof MyExtension);
    t.end();
});

test('multiple VMs loading extensions', async t => {
    const vm1 = new VirtualMachine();
    const vm2 = new VirtualMachine();

    class Extension1 {}
    class Extension2 {}

    let api1 = null;
    setScript('https://turbowarp.org/1.js', async () => {
        // Even if this extension takes a while to register, we should still have our own
        // global.Scratch.
        await new Promise(resolve => setTimeout(resolve, 100));

        if (api1) throw new Error('already ran 1');
        api1 = global.Scratch;
        global.Scratch.extensions.register(new Extension1());
    });

    let api2 = null;
    setScript('https://turbowarp.org/2.js', () => {
        if (api2) throw new Error('already ran 2');
        api2 = global.Scratch;
        global.Scratch.extensions.register(new Extension2());
    });

    const extensions = await Promise.all([
        UnsandboxedExtensionRunner.load('https://turbowarp.org/1.js', vm1),
        UnsandboxedExtensionRunner.load('https://turbowarp.org/2.js', vm2)
    ]);

    t.not(api1, api2);
    t.type(api1.extensions.register, 'function');
    t.type(api2.extensions.register, 'function');
    t.equal(api1.vm, vm1);
    t.equal(api2.vm, vm2);

    t.equal(extensions.length, 2);
    t.equal(extensions[0].length, 1);
    t.equal(extensions[1].length, 1);
    t.ok(extensions[0][0] instanceof Extension1);
    t.ok(extensions[1][0] instanceof Extension2);

    t.end();
});

test('register multiple extensions in one script', async t => {
    const vm = new VirtualMachine();
    class Extension1 {}
    class Extension2 {}
    setScript('https://turbowarp.org/multiple.js', () => {
        global.Scratch.extensions.register(new Extension1());
        global.Scratch.extensions.register(new Extension2());
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/multiple.js', vm);
    t.equal(extensions.length, 2);
    t.ok(extensions[0] instanceof Extension1);
    t.ok(extensions[1] instanceof Extension2);
    t.end();
});

test('extension error results in rejection', async t => {
    const vm = new VirtualMachine();
    try {
        await UnsandboxedExtensionRunner.load('https://turbowarp.org/404.js', vm);
        // Above should throw an error as the script will not load successfully
        t.fail();
    } catch (e) {
        t.pass();
    }
    t.end();
});

test('ScratchX', async t => {
    const vm = new VirtualMachine();
    setScript('https://turbowarp.org/scratchx.js', () => {
        const ext = {
            test: () => 2
        };
        const descriptor = {
            blocks: [
                ['r', 'test', 'test']
            ]
        };
        global.ScratchExtensions.register('Test', descriptor, ext);
    });
    const extensions = await UnsandboxedExtensionRunner.load('https://turbowarp.org/scratchx.js', vm);
    t.equal(extensions.length, 1);
    t.equal(extensions[0].test(), 2);
    t.end();
});

test('canFetch', async t => {
    // see tw_security_manager.js
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    const result = global.Scratch.canFetch('https://example.com/');
    t.type(result, Promise);
    t.equal(await result, true);
    t.end();
});

test('fetch', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    global.Scratch.canFetch = url => url === 'https://example.com/2';
    await t.rejects(global.Scratch.fetch('https://example.com/1'), /Permission to fetch https:\/\/example.com\/1 rejected/);
    await t.rejects(global.Scratch.fetch(new Request('https://example.com/1')), /Permission to fetch https:\/\/example.com\/1 rejected/);
    t.equal(await global.Scratch.fetch('https://example.com/2'), '[Response https://example.com/2 options={}]');
    t.equal(await global.Scratch.fetch(new Request('https://example.com/2')), '[Response https://example.com/2 options={}]');
    t.equal(await global.Scratch.fetch('https://example.com/2', {
        redirect: 'follow',
        method: 'POST',
        body: 'abc'
    }), '[Response https://example.com/2 options={"redirect":"follow","method":"POST","body":"abc"}]');
    t.end();
});

test('canOpenWindow', async t => {
    // see tw_security_manager.js
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    const result = global.Scratch.canOpenWindow('https://example.com/');
    t.type(result, Promise);
    t.equal(await result, true);
    t.end();
});

test('openWindow', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    global.Scratch.canOpenWindow = url => url === 'https://example.com/2';
    await t.rejects(global.Scratch.openWindow('https://example.com/1'), /Permission to open tab https:\/\/example.com\/1 rejected/);
    t.equal(await global.Scratch.openWindow('https://example.com/2'), '[Window https://example.com/2 target=_blank features=noreferrer]');
    t.equal(await global.Scratch.openWindow('https://example.com/2', 'popup=1'), '[Window https://example.com/2 target=_blank features=noreferrer,popup=1]');
    t.end();
});

test('canRedirect', async t => {
    // see tw_security_manager.js
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    const result = global.Scratch.canRedirect('https://example.com/');
    t.type(result, Promise);
    t.equal(await result, true);
    t.end();
});

test('redirect', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    global.Scratch.canRedirect = url => url === 'https://example.com/2';
    await t.rejects(global.Scratch.redirect('https://example.com/1'), /Permission to redirect to https:\/\/example.com\/1 rejected/);
    t.equal(global.location.href, 'https://example.com/');
    await global.Scratch.redirect('https://example.com/2');
    t.equal(global.location.href, 'https://example.com/2');
    t.end();
});

test('translate', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    t.equal(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'Message 1: test');
    t.equal(global.Scratch.translate('test1 {var}', {
        var: 'ok'
    }), 'test1 ok');
    t.equal(global.Scratch.translate.language, 'en');

    global.Scratch.translate.setup({
        en: {
            test1: 'EN Message 1: {var}'
        },
        es: {
            test1: 'ES Message 1: {var}'
        }
    });
    t.equal(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'EN Message 1: test');
    t.equal(global.Scratch.translate('test1 {var}', {
        var: 'ok'
    }), 'test1 ok');
    t.equal(global.Scratch.translate.language, 'en');

    await vm.setLocale('es');
    // do not call setup() again; real extensions will not do that.
    // need to make sure that the translatiosn are saved after calling setLocale.
    t.equal(global.Scratch.translate({
        id: 'test1',
        default: 'Message 1: {var}',
        description: 'Description'
    }, {
        var: 'test'
    }), 'ES Message 1: test');
    t.equal(global.Scratch.translate.language, 'es');

    t.end();
});

test('canRecordAudio', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canRecordAudio = () => false;
    t.equal(await global.Scratch.canRecordAudio(), false);

    vm.securityManager.canRecordAudio = () => true;
    t.equal(await global.Scratch.canRecordAudio(), true);

    t.end();
});

test('canRecordVideo', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canRecordVideo = () => false;
    t.equal(await global.Scratch.canRecordVideo(), false);

    vm.securityManager.canRecordVideo = () => true;
    t.equal(await global.Scratch.canRecordVideo(), true);

    t.end();
});

test('canReadClipboard', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canReadClipboard = () => false;
    t.equal(await global.Scratch.canReadClipboard(), false);

    vm.securityManager.canReadClipboard = () => true;
    t.equal(await global.Scratch.canReadClipboard(), true);

    t.end();
});

test('canNotify', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canNotify = () => false;
    t.equal(await global.Scratch.canNotify(), false);

    vm.securityManager.canNotify = () => true;
    t.equal(await global.Scratch.canNotify(), true);

    t.end();
});

test('canGeolocate', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canGeolocate = () => false;
    t.equal(await global.Scratch.canGeolocate(), false);

    vm.securityManager.canGeolocate = () => true;
    t.equal(await global.Scratch.canGeolocate(), true);

    t.end();
});

test('rewrite Extension URL', async t => {
    const vm = new VirtualMachine();
    const makeTestStorage = require('../fixtures/make-test-storage');
    vm.attachStorage(makeTestStorage());
    let createdRewrittenExtension = false;
    class RewrittenExtension {
        getInfo () {
            createdRewrittenExtension = true;
            return {
                id: 'extensionid',
                blocks: []
            };
        }
    }
    setScript('https://turbowarp.org/rewritten.js', () => {
        global.Scratch.extensions.register(new RewrittenExtension());
    });

    class OriginalExtension {
        getInfo () {
            t.fail('Should not create original extension');
            return {
                id: 'extensionid',
                blocks: []
            };
        }
    }
    setScript('https://turbowarp.org/original.js', () => {
        global.Scratch.extensions.register(new OriginalExtension());
    });

    vm.securityManager.getSandboxMode = () => 'unsandboxed';
    vm.securityManager.rewriteExtensionURL = url => {
        if (url === 'https://turbowarp.org/original.js') {
            return 'https://turbowarp.org/rewritten.js';
        }
        return url;
    };

    await vm.extensionManager.loadExtensionURL('https://turbowarp.org/original.js');

    t.ok(createdRewrittenExtension, 'used rewritten extension');
    t.ok(vm.extensionManager.isExtensionURLLoaded('https://turbowarp.org/original.js'), 'marks original URL as loaded');
    t.notOk(vm.extensionManager.isExtensionURLLoaded('https://turbowarp.org/rewritten.js'), 'does not mark new URL as loaded');
    t.end();
});

test('canEmbed', async t => {
    const vm = new VirtualMachine();
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);

    vm.securityManager.canEmbed = url => url === 'https://example.com/safe';
    t.ok(await global.Scratch.canEmbed('https://example.com/safe'));
    t.notOk(await global.Scratch.canEmbed('https://example.com/unsafe'));

    t.end();
});

test('CREATE_UNSANDBOXED_EXTENSION_API', t => {
    const vm = new VirtualMachine();
    vm.on('CREATE_UNSANDBOXED_EXTENSION_API', api => {
        api.extraStuff = 'aaaa';
    });
    UnsandboxedExtensionRunner.setupUnsandboxedExtensionAPI(vm);
    t.equal(global.Scratch.extraStuff, 'aaaa');
    t.end();
});
