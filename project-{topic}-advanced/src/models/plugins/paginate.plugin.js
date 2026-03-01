```javascript
// src/models/plugins/paginate.plugin.js
/**
 * @typedef {Object} QueryResult
 * @property {Array<Object>} results - Array of objects
 * @property {number} page - Current page number
 * @property {number} limit - Maximum number of results per page
 * @property {number} totalPages - Total number of pages
 * @property {number} totalResults - Total number of documents
 */
/**
 * Plugin to add paginate method to Sequelize models
 * @param {Object} schema - The Sequelize model schema
 */
const paginate = async function (filter, options) {
    // ALX Principle: Algorithm Design for Pagination
    // Implement standard pagination logic with sorting and limiting.
    const sort = options.sortBy ? options.sortBy.split(',').map((sortOption) => {
        const parts = sortOption.split(':');
        return [parts[0], parts[1] === 'desc' ? 'DESC' : 'ASC'];
    }) : [['createdAt', 'ASC']];

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const offset = (page - 1) * limit;

    const query = {
        where: filter,
        order: sort,
        limit: limit,
        offset: offset,
        distinct: true, // Important for counts with includes
        col: 'id', // Column to count distinct values on for performance
    };

    // If there are includes, add them to the query
    if (options.populate) {
        query.include = options.populate.map(path => {
            return {
                model: this.sequelize.models[path], // Assumes model name matches path
                as: path, // Assumes alias matches path
                attributes: options.select ? options.select.split(',').filter(field => field !== path) : undefined,
            };
        });
    }

    const { count, rows } = await this.findAndCountAll(query);

    const totalPages = Math.ceil(count / limit);
    const results = rows;

    return {
        results,
        page,
        limit,
        totalPages,
        totalResults: count,
    };
};

module.exports = paginate;
```