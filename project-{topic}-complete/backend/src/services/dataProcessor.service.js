const { AppError } = require('../utils/errorHandler');
const logger = require('../middleware/logger');

/**
 * Validates and normalizes raw data from a data source.
 * Assumes CSV or similar tabular data format.
 * @param {Array<Object>} rawData - Array of objects, each object is a row.
 * @param {Array<Object>} schema - Expected schema from the data source definition.
 * @returns {Array<Object>} Normalized data.
 */
const normalizeData = (rawData, schema) => {
    if (!Array.isArray(rawData) || rawData.length === 0) {
        logger.warn('normalizeData received empty or invalid rawData.');
        return [];
    }

    const normalized = rawData.map(row => {
        const newRow = {};
        for (const field of schema) {
            let value = row[field.name];
            // Basic type conversion based on schema
            switch (field.type) {
                case 'number':
                    value = parseFloat(value);
                    if (isNaN(value)) {
                        logger.warn(`Value "${row[field.name]}" for field "${field.name}" is not a number.`);
                        value = null; // Or throw error, depending on strictness
                    }
                    break;
                case 'boolean':
                    value = String(value).toLowerCase() === 'true' || String(value) === '1';
                    break;
                case 'date':
                    try {
                        value = new Date(value);
                        if (isNaN(value.getTime())) {
                            throw new Error('Invalid Date');
                        }
                    } catch (e) {
                        logger.warn(`Value "${row[field.name]}" for field "${field.name}" is not a valid date.`);
                        value = null;
                    }
                    break;
                case 'string':
                default:
                    value = value != null ? String(value) : null;
                    break;
            }
            newRow[field.name] = value;
        }
        return newRow;
    });
    return normalized;
};

/**
 * Filters data based on conditions.
 * @param {Array<Object>} data - Data to filter.
 * @param {Array<Object>} filters - Array of filter objects { field, operator, value }.
 *   Example: [{ field: 'category', operator: 'eq', value: 'A' }, { field: 'sales', operator: 'gt', value: 100 }]
 *   Operators: eq, ne, gt, lt, gte, lte, contains, startsWith, endsWith
 * @returns {Array<Object>} Filtered data.
 */
const filterData = (data, filters = []) => {
    if (!Array.isArray(data) || data.length === 0 || filters.length === 0) {
        return data;
    }

    return data.filter(row => {
        return filters.every(filter => {
            const rowValue = row[filter.field];
            const filterValue = filter.value;

            // Handle null/undefined values consistently
            if (rowValue === null || rowValue === undefined) {
                return (filter.operator === 'eq' && (filterValue === null || filterValue === undefined)) ||
                       (filter.operator === 'ne' && !(filterValue === null || filterValue === undefined));
            }

            switch (filter.operator) {
                case 'eq': return rowValue === filterValue;
                case 'ne': return rowValue !== filterValue;
                case 'gt': return rowValue > filterValue;
                case 'lt': return rowValue < filterValue;
                case 'gte': return rowValue >= filterValue;
                case 'lte': return rowValue <= filterValue;
                case 'contains': return typeof rowValue === 'string' && rowValue.includes(filterValue);
                case 'startsWith': return typeof rowValue === 'string' && rowValue.startsWith(filterValue);
                case 'endsWith': return typeof rowValue === 'string' && rowValue.endsWith(filterValue);
                default:
                    logger.warn(`Unsupported filter operator: ${filter.operator}`);
                    return true; // If operator is unknown, don't filter it out.
            }
        });
    });
};

/**
 * Aggregates data based on a group-by field and aggregation measures.
 * @param {Array<Object>} data - Data to aggregate.
 * @param {string} groupByField - Field to group by.
 * @param {Array<Object>} aggregates - Array of aggregate objects { field, operation }.
 *   Example: [{ field: 'sales', operation: 'sum' }, { field: 'units', operation: 'avg' }]
 *   Operations: sum, count, avg, min, max
 * @returns {Array<Object>} Aggregated data.
 */
const aggregateData = (data, groupByField, aggregates = []) => {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }
    if (!groupByField || !aggregates.length) {
        return data; // No aggregation needed
    }

    const groupedData = data.reduce((acc, row) => {
        const key = row[groupByField];
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(row);
        return acc;
    }, {});

    const result = Object.keys(groupedData).map(key => {
        const group = groupedData[key];
        const aggregatedRow = { [groupByField]: key };

        aggregates.forEach(agg => {
            const values = group.map(row => row[agg.field]).filter(v => typeof v === 'number' && !isNaN(v));
            let aggregatedValue;

            switch (agg.operation) {
                case 'sum': aggregatedValue = values.reduce((sum, v) => sum + v, 0); break;
                case 'count': aggregatedValue = values.length; break;
                case 'avg': aggregatedValue = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0; break;
                case 'min': aggregatedValue = values.length > 0 ? Math.min(...values) : null; break;
                case 'max': aggregatedValue = values.length > 0 ? Math.max(...values) : null; break;
                default:
                    logger.warn(`Unsupported aggregation operation: ${agg.operation}`);
                    aggregatedValue = null;
            }
            aggregatedRow[`${agg.field}_${agg.operation}`] = aggregatedValue;
        });
        return aggregatedRow;
    });

    return result;
};

/**
 * Main data processing pipeline for visualization.
 * @param {Array<Object>} rawData - Raw data from a data source.
 * @param {Object} visualizationConfig - Configuration for the visualization (schema, filters, aggregations).
 * @returns {Array<Object>} Processed data ready for charting.
 */
const processVisualizationData = (rawData, visualizationConfig) => {
    try {
        const { schema, filters, groupBy, aggregates } = visualizationConfig;

        // 1. Normalize data
        let processedData = normalizeData(rawData, schema);
        logger.debug(`Data normalized. Rows: ${processedData.length}`);

        // 2. Filter data
        if (filters && filters.length > 0) {
            processedData = filterData(processedData, filters);
            logger.debug(`Data filtered. Rows: ${processedData.length}`);
        }

        // 3. Aggregate data
        if (groupBy && aggregates && aggregates.length > 0) {
            processedData = aggregateData(processedData, groupBy, aggregates);
            logger.debug(`Data aggregated. Rows: ${processedData.length}`);
        }

        return processedData;
    } catch (error) {
        logger.error(`Error in data processing pipeline: ${error.message}`);
        throw new AppError('Failed to process visualization data', 500);
    }
};


module.exports = {
    normalizeData,
    filterData,
    aggregateData,
    processVisualizationData
};