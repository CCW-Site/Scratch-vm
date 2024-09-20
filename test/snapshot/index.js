const Snapshot = require('./lib.js');

/**
 * @fileoverview
 * CLI for testing and generating snapshot tests.
 */

/* eslint-disable no-console */

const RESET = `\u001b[0m`;
const BOLD = '\u001b[1m';
const RED = '\u001b[31m';
const YELLOW = `\u001b[33m`;
const BLUE = `\u001b[34m`;
const GREEN = '\u001b[32m';

const isUpdatingSnapshots = process.argv.includes('--update');

const runSnapshotTest = async testCase => {
    const prefix = `### ${testCase.id}: `;

    try {
        const actualSnapshot = await Snapshot.generateActualSnapshot(testCase);
        const expectedSnapshot = Snapshot.getExpectedSnapshot(testCase);
        const result = Snapshot.compareSnapshots(expectedSnapshot, actualSnapshot);

        if (isUpdatingSnapshots) {
            if (result === 'VALID') {
                console.log(`${BOLD}${GREEN}${prefix}already matches${RESET}`);
                return 'VALID';
            }
            console.log(`${BOLD}${BLUE}${prefix}updating${RESET}`);
            Snapshot.saveSnapshot(testCase, actualSnapshot);
            return 'UPDATED';
        }

        if (result === 'VALID') {
            console.log(`${BOLD}${GREEN}${prefix}matches${RESET}`);
            return 'VALID';
        }

        if (result === 'MISSING_SNAPSHOT') {
            console.log(`${BOLD}${YELLOW}${prefix}missing snapshot${RESET}`);
            return 'MISSING_SNAPSHOT';
        }

        if (result === 'INPUT_MODIFIED') {
            console.log(`${BOLD}${YELLOW}${prefix}INPUT WAS MODIFIED${RESET}`);
            return 'INPUT_MODIFIED';
        }

        console.log(`${BOLD}${RED}${prefix}DOES NOT MATCH${RESET}`);
        console.log(`${RED}EXPECTED:\n${expectedSnapshot}${RESET}`);
        console.log(`${BLUE}GOT:\n${actualSnapshot}${RESET}`);
    } catch (e) {
        console.log(`${BOLD}${RED}${prefix}ERROR${RESET}`);
        console.log(`${RED}${e}${RESET}`);
    }

    console.log('');
    return 'INVALID';
};

const run = async () => {
    console.log(`Running ${Snapshot.tests.length} snapshot tests.`);

    const fileToResult = {};
    for (const testCase of Snapshot.tests) {
        fileToResult[testCase.id] = await runSnapshotTest(testCase);
    }

    const getTestsByResult = r => Object.entries(fileToResult)
        .filter(i => i[1] === r)
        .map(i => i[0]);

    const passed = getTestsByResult('VALID');
    const failed = getTestsByResult('INVALID');
    const missing = getTestsByResult('MISSING_SNAPSHOT');
    const updated = getTestsByResult('UPDATED');
    const modified = getTestsByResult('INPUT_MODIFIED');

    console.log('');
    console.log(`${BOLD}=== SUMMARY ===${RESET}`);
    if (passed.length) {
        // Listing which ones were passed is unnecessary noise
        console.log(`${BOLD}${GREEN}PASSED ${passed.length}${RESET}`);
    }
    if (failed.length) {
        console.log(`${BOLD}${RED}FAILED ${failed.length} ${RESET}${failed.join(', ')}`);
    }
    if (missing.length) {
        console.log(`${BOLD}${YELLOW}MISSING ${missing.length} ${RESET}${missing.join(', ')}`);
    }
    if (modified.length) {
        console.log(`${BOLD}${YELLOW}MODIFIED ${modified.length} ${RESET}${modified.join(', ')}`);
    }
    if (updated.length) {
        console.log(`${BOLD}${BLUE}UPDATED ${updated.length} ${RESET}${updated.join(', ')}`);
    }

    if (failed.length || missing.length || modified.length) {
        console.log('');
        if (modified.length) {
            console.log(`${missing.length} of the test projects have been modified, so this error is expected.`);
        }
        if (missing.length) {
            console.log(`${missing.length} of the test projects are missing snapshot, so this error is expected.`);
        }
        if (failed.length) {
            console.log(`If the compiler's behavior has changed, this failure is expected.`);
        }
        console.log(`Update snapshots with: ${BOLD}node test/snapshot --update${RESET}`);
        console.log(`Review the diff in version control, then commit the updated snapshot files.`);
    }

    if (updated.length) {
        console.log('');
        console.log('Some snapshots have been updated. Please review the diff before committing.');
    }

    return passed.length + updated.length === Snapshot.tests.length;
};

run()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
