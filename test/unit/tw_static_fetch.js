const test = require('tap').skip;
const staticFetch = require('../../src/util/tw-static-fetch');

test('fetch simple base64', t => {
    const res = staticFetch('data:text/plain;base64,VGVzdGluZyB0ZXN0aW5nIDEyMw==');
    res.text().then(text => {
        t.equal(text, 'Testing testing 123');
        t.equal(res.status, 200);
        t.equal(res.ok, true);
        t.equal(res.headers.get('content-type'), 'text/plain');
        t.equal(res.headers.get('content-length'), '19');
        t.end();
    });
});

test('fetch base64 with all possible bytes', t => {
    // eslint-disable-next-line max-len
    const res = staticFetch('Data:Application/Octet-Stream;BASE64,AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==');
    res.arrayBuffer().then(buffer => {
        t.same(Array.from(new Uint8Array(buffer)), Array(256)
            .fill()
            .map((_, index) => index)
        );
        t.equal(res.headers.get('content-type'), 'application/octet-stream');
        t.equal(res.headers.get('content-length'), '256');
        t.end();
    });
});

test('fetch not data:', t => {
    t.equal(staticFetch('blob:https://turbowarp.org/54346944-16cf-4ce9-aed4-e1df8ad0d779'), null);
    t.equal(staticFetch('https://example.com/'), null);
    t.equal(staticFetch('http://example.com/'), null);
    t.equal(staticFetch('file:///etc/hosts'), null);
    t.equal(staticFetch('oegirjdf'), null);
    t.equal(staticFetch(''), null);
    t.end();
});
