const Cast = require('../../src/util/cast');
const {test} = require('tap');

test('Cast.compare with assorted whitespace characters', t => {
    t.equal(Cast.compare('', ''), 0);

    t.equal(Cast.compare('  ', ''), 1);
    t.equal(Cast.compare('', '  '), -1);

    t.equal(Cast.compare(' ', '  '), -1);
    t.equal(Cast.compare('  ', ' '), 1);

    t.equal(Cast.compare('   \u00a0   ', '\r\n'), 1);
    t.equal(Cast.compare('\r\n', '   \u00a0   '), -1);

    t.equal(Cast.compare(' 0', 0), 0);
    t.equal(Cast.compare(0, ' 0'), 0);

    t.equal(Cast.compare(' 0 ', ' \r\n\u00a0  0 \n\n\n\n'), 0);
    t.equal(Cast.compare(' \r\n\u00a0  0 \n\n\n\n', ' 0 '), 0);

    t.equal(Cast.compare(' 0 ', ' \r\n\u00a0  0 \n\n\n\b'), 1);
    t.equal(Cast.compare(' \r\n\u00a0  0 \n\n\n\b', ' 0 '), -1);

    t.equal(Cast.compare(' 0', '0'), 0);
    t.equal(Cast.compare('0', ' 0'), 0);

    t.equal(Cast.compare('', 0), -1);
    t.equal(Cast.compare(0, ''), 1);

    t.equal(Cast.compare(' ', 0), -1);
    t.equal(Cast.compare(0, ' '), 1);

    t.equal(Cast.compare('0', '  '), 1);
    t.equal(Cast.compare('  ', '0'), -1);

    t.equal(Cast.compare('\n0', '\n-1'), 1);
    t.equal(Cast.compare('\n-1', '\n0'), -1);

    t.equal(Cast.compare('', 'false'), -1);
    t.equal(Cast.compare('false', ''), 1);

    t.equal(Cast.compare('', ' false'), -1);
    t.equal(Cast.compare(' false', ''), 1);

    t.equal(Cast.compare('\n', ' false'), -1);
    t.equal(Cast.compare('false', '\n'), 1);

    t.equal(Cast.compare(false, ''), 1);
    t.equal(Cast.compare('', false), -1);

    t.equal(Cast.compare(false, ' '), 1);
    t.equal(Cast.compare(' ', false), -1);

    t.equal(Cast.compare('\t', '0'), 0);
    t.equal(Cast.compare('0', '\t'), 0);

    t.equal(Cast.compare('\t', 0), 0);
    t.equal(Cast.compare(0, '\t'), 0);

    t.equal(Cast.compare('\t', ''), 1);
    t.equal(Cast.compare('', '\t'), -1);

    t.equal(Cast.compare('  \t    ', '0'), 0);
    t.equal(Cast.compare('0', '  \t    '), 0);

    t.equal(Cast.compare('\r\n \t\u00a0', 0), 0);
    t.equal(Cast.compare(0, '\r\n \t\u00a0'), 0);

    t.equal(Cast.compare('\t', false), 0);
    t.equal(Cast.compare(false, '\t'), 0);

    t.equal(Cast.compare('\t', 'false'), -1);
    t.equal(Cast.compare('false', '\t'), 1);

    t.equal(Cast.compare('\t', '1'), -1);
    t.equal(Cast.compare('1', '\t'), 1);

    t.equal(Cast.compare('\t', 1), -1);
    t.equal(Cast.compare(1, '\t'), 1);

    t.end();
});
