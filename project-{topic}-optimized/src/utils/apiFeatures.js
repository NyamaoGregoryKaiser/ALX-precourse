class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // Prisma client query object (e.g., prisma.task.findMany())
    this.queryString = queryString; // req.query from Express
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Example for 'status: { in: ["TODO", "IN_PROGRESS"] }'
    // This is a basic implementation. For complex filtering (e.g., nested objects, multiple `in` conditions),
    // you might need a more sophisticated parser or separate methods.
    const filter = JSON.parse(queryStr);
    for (const key in filter) {
      if (typeof filter[key] === 'string' && filter[key].includes(',')) {
        filter[key] = { in: filter[key].split(',') };
      }
    }

    this.query = { ...this.query, where: { ...this.query.where, ...filter } };

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').map((field) => {
        const order = field.startsWith('-') ? 'desc' : 'asc';
        const key = field.replace(/^-/, '');
        return { [key]: order };
      });
      this.query = { ...this.query, orderBy: sortBy };
    } else {
      this.query = { ...this.query, orderBy: { createdAt: 'desc' } };
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').reduce((acc, field) => {
        acc[field.trim()] = true;
        return acc;
      }, {});
      this.query = { ...this.query, select: fields };
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = { ...this.query, skip, take: limit };
    return this;
  }

  // Method to get the final Prisma query object
  build() {
    return this.query;
  }
}

export default APIFeatures;
```

```javascript