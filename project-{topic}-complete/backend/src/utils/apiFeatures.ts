```typescript
import { SelectQueryBuilder } from 'typeorm';

/**
 * Utility class to apply common API query features (filtering, sorting, pagination, field limiting)
 * to TypeORM queries.
 * @template T The entity type.
 */
export class APIFeatures<T> {
  private queryBuilder: SelectQueryBuilder<T>;
  private queryString: { [key: string]: any };
  private alias: string; // The alias used for the main entity in the query builder

  constructor(queryBuilder: SelectQueryBuilder<T>, queryString: { [key: string]: any }, alias: string) {
    this.queryBuilder = queryBuilder;
    this.queryString = queryString;
    this.alias = alias;
  }

  /**
   * Applies filtering based on query parameters.
   * Supports basic equality, greater/less than, and regular expressions.
   * Example: ?price[gte]=100&ratings[lte]=4.5&name[regex]=product
   */
  filter(): this {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    let whereClause = '';
    const params: { [key: string]: any } = {};
    let firstCondition = true;

    for (const key in queryObj) {
      if (Object.prototype.hasOwnProperty.call(queryObj, key)) {
        const value = queryObj[key];
        let condition = '';
        const paramName = `${key.replace('.', '_')}_param`; // Replace dots for nested fields if any

        if (typeof value === 'object' && value !== null) {
          // Handle gt, gte, lt, lte, regex
          for (const operator in value) {
            if (Object.prototype.hasOwnProperty.call(value, operator)) {
              const opValue = value[operator];
              if (!firstCondition) whereClause += ' AND ';

              switch (operator) {
                case 'gte':
                  condition = `${this.alias}.${key} >= :${paramName}`;
                  params[paramName] = opValue;
                  break;
                case 'gt':
                  condition = `${this.alias}.${key} > :${paramName}`;
                  params[paramName] = opValue;
                  break;
                case 'lte':
                  condition = `${this.alias}.${key} <= :${paramName}`;
                  params[paramName] = opValue;
                  break;
                case 'lt':
                  condition = `${this.alias}.${key} < :${paramName}`;
                  params[paramName] = opValue;
                  break;
                case 'regex': // For pattern matching (e.g., LIKE in SQL)
                  condition = `${this.alias}.${key} ILIKE :${paramName}`; // ILIKE for case-insensitive
                  params[paramName] = `%${opValue}%`;
                  break;
                // Add more operators if needed
                default:
                  logger.warn(`Unsupported operator for filtering: ${operator}`);
                  continue; // Skip unsupported operator
              }
              whereClause += condition;
              firstCondition = false;
            }
          }
        } else {
          // Basic equality
          if (!firstCondition) whereClause += ' AND ';
          condition = `${this.alias}.${key} = :${paramName}`;
          params[paramName] = value;
          whereClause += condition;
          firstCondition = false;
        }
      }
    }

    if (whereClause) {
      this.queryBuilder.andWhere(whereClause, params);
    }

    return this;
  }

  /**
   * Applies sorting based on query parameter.
   * Example: ?sort=price,-ratingsAverage (sort by price ascending, then ratings descending)
   */
  sort(): this {
    if (this.queryString.sort) {
      const sortBy = (this.queryString.sort as string).split(',').map((field) => {
        const order = field.startsWith('-') ? 'DESC' : 'ASC';
        const prop = field.replace('-', '');
        return { prop: prop, order: order as 'ASC' | 'DESC' };
      });

      sortBy.forEach((sortItem, index) => {
        if (index === 0) {
          this.queryBuilder.orderBy(`${this.alias}.${sortItem.prop}`, sortItem.order);
        } else {
          this.queryBuilder.addOrderBy(`${this.alias}.${sortItem.prop}`, sortItem.order);
        }
      });
    } else {
      // Default sort (e.g., by creation date)
      this.queryBuilder.orderBy(`${this.alias}.createdAt`, 'DESC');
    }
    return this;
  }

  /**
   * Limits the fields returned in the query.
   * Example: ?fields=name,price,description
   */
  limitFields(): this {
    if (this.queryString.fields) {
      const fields = (this.queryString.fields as string).split(',').map((field) => `${this.alias}.${field.trim()}`);
      this.queryBuilder.select(fields);
    }
    return this;
  }

  /**
   * Applies pagination to the query.
   * Example: ?page=1&limit=10
   */
  paginate(): this {
    const page = parseInt(this.queryString.page || '1', 10);
    const limit = parseInt(this.queryString.limit || '100', 10);
    const skip = (page - 1) * limit;

    this.queryBuilder.skip(skip).take(limit);
    return this;
  }

  /**
   * Returns the modified TypeORM SelectQueryBuilder.
   */
  getQueryBuilder(): SelectQueryBuilder<T> {
    return this.queryBuilder;
  }
}
```