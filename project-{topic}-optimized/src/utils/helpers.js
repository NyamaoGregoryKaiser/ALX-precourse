exports.generateUniqueId = (prefix = 'id') => {
    const timestamp = Date.now().toString(36);
    const randomChars = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}${randomChars}`;
};

exports.catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};