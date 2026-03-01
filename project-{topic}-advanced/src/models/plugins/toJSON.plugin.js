```javascript
// src/models/plugins/toJSON.plugin.js
/**
 * A plugin that adds the 'toJSON' method to a Sequelize model instance.
 * This method filters out private fields (marked with `private: true` in model definition)
 * and can be used to control what data is sent in API responses.
 *
 * @param {Object} model - The Sequelize model.
 */
const toJSON = (model) => {
    // ALX Principle: Data Filtering and Security
    // Prevent sensitive information (passwords, API keys) from being exposed in API responses.
    model.prototype.toJSON = function () {
        const values = Object.assign({}, this.get());

        // Iterate over model attributes to find and delete private fields
        for (const key in model.rawAttributes) {
            if (model.rawAttributes[key] && model.rawAttributes[key].private) {
                delete values[key];
            }
        }
        return values;
    };
};

module.exports = toJSON;
```