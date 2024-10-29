const getXGAccessCode = () => {
    let accessCode = 'default-access-code';
    if (typeof localStorage !== 'undefined') {
        const thirdPartApiKey = 'xg-access-code';
        accessCode = localStorage.getItem(thirdPartApiKey);
        if (!accessCode || accessCode.length !== 16) {
            accessCode = `${Math.random()}${Math.random()}`
                .replace(/\./g, '')
                .substr(1, 16);
            localStorage.setItem(thirdPartApiKey, accessCode);
        }
    }
    return accessCode;
};

module.exports = getXGAccessCode;
