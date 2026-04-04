```javascript
/**
 * A utility class to build query features for Prisma queries.
 * Supports filtering, sorting, limiting fields, and pagination.
 */
class APIFeatures {
  /**
   * Initializes the APIFeatures with the Prisma model and query string.
   * @param {object} model - The Prisma model (e.g., prisma.task).
   * @param {object} queryString - The query parameters from the request (req.query).
   */
  constructor(model, queryString) {
    this.model = model;
    this.queryString = queryString;
    this.queryOptions = {};
    this.findManyArgs = { where: {}, orderBy: {}, select: {}, skip: 0, take: 20 }; // Default values
  }

  /**
   * Applies filtering based on query parameters.
   * Supports basic equality and comparison operators (gt, gte, lt, lte).
   * Example: ?status=PENDING&priority[gte]=MEDIUM
   * @returns {APIFeatures} - The current instance for chaining.
   */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering: { status: 'PENDING', priority: { gte: 'MEDIUM' } }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Parse back to object, ensuring correct Prisma syntax (e.g., `status: 'PENDING'`)
    // Special handling for enums which should not be wrapped in `{ equals: value }`
    const parsedQuery = JSON.parse(queryStr, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // For operators like { $gte: "value" }, transform to Prisma { gte: "value" }
        const prismaOperators = {};
        for (const opKey in value) {
          if (opKey.startsWith('$')) {
            prismaOperators[opKey.substring(1)] = value[opKey];
          } else {
            prismaOperators[opKey] = value[opKey]; // Keep other object properties as is
          }
        }
        return prismaOperators;
      }
      return value;
    });

    this.findManyArgs.where = parsedQuery;
    return this;
  }

  /**
   * Applies sorting based on query parameters.
   * Example: ?sort=-createdAt,priority (descending createdAt, then ascending priority)
   * @returns {APIFeatures} - The current instance for chaining.
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').map((field) => {
        if (field.startsWith('-')) {
          return { [field.substring(1)]: 'desc' };
        }
        return { [field]: 'asc' };
      });
      this.findManyArgs.orderBy = sortBy;
    } else {
      this.findManyArgs.orderBy = { createdAt: 'desc' }; // Default sort
    }
    return this;
  }

  /**
   * Limits the fields returned in the query.
   * Example: ?fields=title,description,dueDate
   * @returns {APIFeatures} - The current instance for chaining.
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',');
      const selectFields = {};
      fields.forEach((field) => {
        selectFields[field] = true;
      });
      this.findManyArgs.select = selectFields;
    }
    return this;
  }

  /**
   * Applies pagination based on query parameters.
   * Example: ?page=2&limit=10
   * @returns {APIFeatures} - The current instance for chaining.
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 20;
    const skip = (page - 1) * limit;

    this.findManyArgs.skip = skip;
    this.findManyArgs.take = limit;
    return this;
  }

  /**
   * Executes the query against the Prisma model.
   * @param {object} [include] - Optional Prisma 'include' object for relations.
   * @returns {Promise<Array<object>>} - The query results.
   */
  async execute(include = {}) {
    if (Object.keys(include).length > 0) {
      this.findManyArgs.include = include;
    }
    this.queryOptions = { ...this.findManyArgs }; // Save the constructed options

    const results = await this.model.findMany(this.queryOptions);
    return results;
  }

  /**
   * Executes a count query with the current filters.
   * Useful for pagination to know the total number of items.
   * @returns {Promise<number>} - The total count of items matching the filter.
   */
  async count() {
    // Only use the 'where' clause for counting
    const countOptions = { where: this.findManyArgs.where };
    const totalCount = await this.model.count(countOptions);
    return totalCount;
  }
}

module.exports = APIFeatures;
```