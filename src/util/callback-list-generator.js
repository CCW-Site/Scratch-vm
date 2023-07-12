/* eslint-disable func-style */
/**
 * A generator function that generates a callback list for each;
 * @param {Array} list callback list
 */
async function* CallbackListGenerator (list) {
    for (let i = 0; i < list.length; i++) {
        yield await list[i]();
    }
}

module.exports = CallbackListGenerator;
