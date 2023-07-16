module.exports = {
    extends: ['scratch', 'scratch/node', 'scratch/es6'],
    globals: {
        process: true
    },
    rules: {
        'max-len': ["error", { "code": 200 }]
      }
};
