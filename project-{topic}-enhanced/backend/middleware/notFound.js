```javascript
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `The requested URL ${req.originalUrl} was not found on this server.`,
    });
};

module.exports = notFound;
```