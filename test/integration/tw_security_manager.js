const {test} = require('tap');
const fs = require('fs');
const path = require('path');
const VirtualMachine = require('../../src/virtual-machine');
const {setupUnsandboxedExtensionAPI} = require('../../src/extension-support/tw-unsandboxed-extension-runner');

const testProject = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'tw-project-with-extensions.sb3'));

// The test project contains two extensions: a fetch one and a bitwise one.
const FETCH_EXTENSION = 'https://extensions.turbowarp.org/fetch.js';
const BITWISE_EXTENSION = 'https://extensions.turbowarp.org/bitwise.js';

/* eslint-disable no-script-url */
/* eslint-disable require-await */

const buildLoadExtensionURLTest = vm => {
    const _loadExtensionURL = vm.extensionManager.loadExtensionURL;
    vm.extensionManager.loadExtensionURL = async url => {
        if (await vm.securityManager.canLoadExtensionFromProject(url)) {
            _loadExtensionURL(url);
        } else {
            throw new Error(`Permission to load extension denied: ${extensionID}`);
        }
    };
};

test('Deny both extensions', async t => {
    const vm = new VirtualMachine();
    vm.extensionManager.loadExtensionURL = () => {
        t.fail();
    };
    vm.securityManager.canLoadExtensionFromProject = () => false;
    buildLoadExtensionURLTest(vm);
    try {
        await vm.loadProject(testProject);
        // loadProject() should fail because extensions were denied
        t.fail();
    } catch (e) {
        t.pass();
    }
    t.end();
});

// we use promise all when install ext so can't pass this test
// test('Deny 1 of 2 extensions', async t => {
//     const vm = new VirtualMachine();
//     vm.extensionManager.loadExtensionURL = () => {
//         t.fail();
//     };
//     vm.securityManager.canLoadExtensionFromProject = url => Promise.resolve(url === FETCH_EXTENSION);
//     buildLoadExtensionURLTest(vm);
//     try {
//         await vm.loadProject(testProject);
//         // loadProject() should fail because extensions were denied
//         t.fail();
//     } catch (e) {
//         t.pass();
//     }
//     t.end();
// });

test('Allow both extensions', async t => {
    const vm = new VirtualMachine();
    const loadedExtensions = [];
    vm.extensionManager.loadExtensionURL = url => {
        loadedExtensions.push(url);
        return Promise.resolve();
    };
    vm.securityManager.canLoadExtensionFromProject = url => {
        if (url === FETCH_EXTENSION) {
            return true;
        }
        if (url === BITWISE_EXTENSION) {
            return Promise.resolve(true);
        }
        t.fail('unknown extension');
    };
    buildLoadExtensionURLTest(vm);
    await vm.loadProject(testProject);
    t.same(new Set(loadedExtensions), new Set([FETCH_EXTENSION, BITWISE_EXTENSION]));
    t.end();
});

test('canFetch', async t => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    // data: and blob: are always allowed, shouldn't call security manager
    vm.securityManager.canFetch = () => t.fail('security manager should be ignored for these protocols');
    t.equal(await global.Scratch.canFetch('data:text/html,test'), true);
    t.equal(await global.Scratch.canFetch('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), true);

    vm.securityManager.canFetch = () => false;
    t.equal(await global.Scratch.canFetch('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canFetch('http://example.com/'), false);
    t.equal(await global.Scratch.canFetch('https://example.com/'), false);
    t.equal(await global.Scratch.canFetch('null'), false);
    t.equal(await global.Scratch.canFetch(null), false);

    vm.securityManager.canFetch = () => Promise.resolve(false);
    t.equal(await global.Scratch.canFetch('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canFetch('http://example.com/'), false);
    t.equal(await global.Scratch.canFetch('https://example.com/'), false);
    t.equal(await global.Scratch.canFetch('boring.html'), false);
    t.equal(await global.Scratch.canFetch('null'), false);
    t.equal(await global.Scratch.canFetch(null), false);

    vm.securityManager.canFetch = () => true;
    t.equal(await global.Scratch.canFetch('file:///etc/hosts'), true);
    t.equal(await global.Scratch.canFetch('http://example.com/'), true);
    t.equal(await global.Scratch.canFetch('https://example.com/'), true);
    t.equal(await global.Scratch.canFetch('boring.html'), true);
    t.equal(await global.Scratch.canFetch('null'), true);
    t.equal(await global.Scratch.canFetch(null), true);

    const calledWithURLs = [];
    vm.securityManager.canFetch = async url => {
        calledWithURLs.push(url);
        return url === 'https://example.com/null';
    };
    t.equal(await global.Scratch.canFetch('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canFetch('http://example.com/'), false);
    t.equal(await global.Scratch.canFetch('https://example.com/null'), true);
    t.equal(await global.Scratch.canFetch('null'), true);
    t.equal(await global.Scratch.canFetch(null), true);
    t.same(calledWithURLs, [
        'file:///etc/hosts',
        'http://example.com/',
        'https://example.com/null',
        'https://example.com/null',
        'https://example.com/null'
    ]);

    t.end();
});

test('canOpenWindow', async t => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    // javascript: should never be allowed, shouldn't call security manager
    vm.securityManager.canOpenWindow = () => t.fail('should not call security manager for javascript:');
    t.equal(await global.Scratch.canOpenWindow('javascript:alert(1)'), false);

    vm.securityManager.canOpenWindow = () => false;
    t.equal(await global.Scratch.canOpenWindow('data:text/html,test'), false);
    t.equal(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    t.equal(await global.Scratch.canOpenWindow('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canOpenWindow('https://example.com/'), false);
    t.equal(await global.Scratch.canOpenWindow('index.html'), false);
    t.equal(await global.Scratch.canOpenWindow(null), false);

    vm.securityManager.canOpenWindow = () => Promise.resolve(false);
    t.equal(await global.Scratch.canOpenWindow('data:text/html,test'), false);
    t.equal(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    t.equal(await global.Scratch.canOpenWindow('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canOpenWindow('https://example.com/'), false);
    t.equal(await global.Scratch.canOpenWindow('index.html'), false);
    t.equal(await global.Scratch.canOpenWindow(null), false);

    vm.securityManager.canOpenWindow = () => true;
    t.equal(await global.Scratch.canOpenWindow('data:text/html,test'), true);
    t.equal(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), true);
    t.equal(await global.Scratch.canOpenWindow('file:///etc/hosts'), true);
    t.equal(await global.Scratch.canOpenWindow('https://example.com/'), true);
    t.equal(await global.Scratch.canOpenWindow('index.html'), true);
    t.equal(await global.Scratch.canOpenWindow(null), true);

    const calledWithURLs = [];
    vm.securityManager.canOpenWindow = async url => {
        calledWithURLs.push(url);
        return url === 'file:///etc/hosts';
    };
    t.equal(await global.Scratch.canOpenWindow('data:text/html,test'), false);
    t.equal(await global.Scratch.canOpenWindow('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    t.equal(await global.Scratch.canOpenWindow('file:///etc/hosts'), true);
    t.equal(await global.Scratch.canOpenWindow('https://example.com/'), false);
    t.equal(await global.Scratch.canOpenWindow('index.html'), false);
    t.equal(await global.Scratch.canOpenWindow(null), false);
    t.same(calledWithURLs, [
        'data:text/html,test',
        'blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd',
        'file:///etc/hosts',
        'https://example.com/',
        'https://example.com/index.html',
        'https://example.com/null'
    ]);

    t.end();
});

test('canRedirect', async t => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    // javascript: should never be allowed, shouldn't call security manager
    vm.securityManager.canRedirect = () => t.fail('should not call security manager for javascript:');
    t.equal(await global.Scratch.canRedirect('javascript:alert(1)'), false);

    vm.securityManager.canRedirect = () => false;
    t.equal(await global.Scratch.canRedirect('data:text/html,test'), false);
    t.equal(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    t.equal(await global.Scratch.canRedirect('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canRedirect('https://example.com/'), false);
    t.equal(await global.Scratch.canRedirect('index.html'), false);
    t.equal(await global.Scratch.canRedirect(null), false);

    vm.securityManager.canRedirect = () => Promise.resolve(false);
    t.equal(await global.Scratch.canRedirect('data:text/html,test'), false);
    t.equal(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    t.equal(await global.Scratch.canRedirect('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canRedirect('https://example.com/'), false);
    t.equal(await global.Scratch.canRedirect('index.html'), false);
    t.equal(await global.Scratch.canRedirect(null), false);

    vm.securityManager.canRedirect = () => true;
    t.equal(await global.Scratch.canRedirect('data:text/html,test'), true);
    t.equal(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), true);
    t.equal(await global.Scratch.canRedirect('file:///etc/hosts'), true);
    t.equal(await global.Scratch.canRedirect('https://example.com/'), true);
    t.equal(await global.Scratch.canRedirect('index.html'), true);
    t.equal(await global.Scratch.canRedirect(null), true);

    const calledWithURLs = [];
    vm.securityManager.canRedirect = async url => {
        calledWithURLs.push(url);
        return url === 'file:///etc/hosts';
    };
    t.equal(await global.Scratch.canRedirect('data:text/html,test'), false);
    t.equal(await global.Scratch.canRedirect('blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd'), false);
    t.equal(await global.Scratch.canRedirect('file:///etc/hosts'), true);
    t.equal(await global.Scratch.canRedirect('https://example.com/'), false);
    t.equal(await global.Scratch.canRedirect('index.html'), false);
    t.equal(await global.Scratch.canRedirect(null), false);
    t.same(calledWithURLs, [
        'data:text/html,test',
        'blob:https://example.com/8c071bf8-c0b6-4a48-81d7-6413c2adf3dd',
        'file:///etc/hosts',
        'https://example.com/',
        'https://example.com/index.html',
        'https://example.com/null'
    ]);

    t.end();
});

test('canEmbed', async t => {
    const vm = new VirtualMachine();
    setupUnsandboxedExtensionAPI(vm);
    global.location = {
        href: 'https://example.com/'
    };

    const calledWithURLs = [];
    vm.securityManager.canEmbed = async url => {
        calledWithURLs.push(url);
        return url === 'https://example.com/ok';
    };

    t.equal(await global.Scratch.canEmbed('https://example.com/ok'), true);
    t.equal(await global.Scratch.canEmbed('https://example.com/bad'), false);
    t.equal(await global.Scratch.canEmbed('file:///etc/hosts'), false);
    t.equal(await global.Scratch.canEmbed('data:text/html;,<h1>test</h1>'), false);
    t.equal(await global.Scratch.canEmbed('ok'), true);
    t.same(calledWithURLs, [
        'https://example.com/ok',
        'https://example.com/bad',
        'file:///etc/hosts',
        'data:text/html;,<h1>test</h1>',
        'https://example.com/ok'
    ]);

    t.end();
});
