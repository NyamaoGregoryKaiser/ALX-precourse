const { normalizeData, filterData, aggregateData, processVisualizationData } = require('../../src/services/dataProcessor.service');
const { AppError } = require('../../src/utils/errorHandler');

describe('Data Processor Service - normalizeData', () => {
    it('should correctly normalize string and number types', () => {
        const rawData = [{ id: '1', value: '100', name: 'Test' }];
        const schema = [{ name: 'id', type: 'string' }, { name: 'value', type: 'number' }, { name: 'name', type: 'string' }];
        const normalized = normalizeData(rawData, schema);
        expect(normalized).toEqual([{ id: '1', value: 100, name: 'Test' }]);
    });

    it('should handle invalid number conversions gracefully', () => {
        const rawData = [{ value: 'abc' }];
        const schema = [{ name: 'value', type: 'number' }];
        const normalized = normalizeData(rawData, schema);
        expect(normalized).toEqual([{ value: null }]);
    });

    it('should handle boolean conversions', () => {
        const rawData = [{ active: 'TRUE' }, { active: 'false' }, { active: '1' }, { active: '0' }, { active: 'other' }];
        const schema = [{ name: 'active', type: 'boolean' }];
        const normalized = normalizeData(rawData, schema);
        expect(normalized).toEqual([{ active: true }, { active: false }, { active: true }, { active: false }, { active: false }]);
    });

    it('should handle date conversions', () => {
        const rawData = [{ date: '2023-01-01' }, { date: 'invalid-date' }];
        const schema = [{ name: 'date', type: 'date' }];
        const normalized = normalizeData(rawData, schema);
        expect(normalized[0].date).toEqual(new Date('2023-01-01'));
        expect(normalized[1].date).toBeNull();
    });

    it('should return empty array for empty raw data', () => {
        const normalized = normalizeData([], []);
        expect(normalized).toEqual([]);
    });
});

describe('Data Processor Service - filterData', () => {
    const data = [
        { id: 1, category: 'A', value: 100 },
        { id: 2, category: 'B', value: 200 },
        { id: 3, category: 'A', value: 150 },
        { id: 4, category: 'C', value: 50, status: null }
    ];

    it('should filter by equality (eq)', () => {
        const filters = [{ field: 'category', operator: 'eq', value: 'A' }];
        const filtered = filterData(data, filters);
        expect(filtered).toEqual([
            { id: 1, category: 'A', value: 100 },
            { id: 3, category: 'A', value: 150 }
        ]);
    });

    it('should filter by greater than (gt)', () => {
        const filters = [{ field: 'value', operator: 'gt', value: 100 }];
        const filtered = filterData(data, filters);
        expect(filtered).toEqual([
            { id: 2, category: 'B', value: 200 },
            { id: 3, category: 'A', value: 150 }
        ]);
    });

    it('should filter by null values (eq)', () => {
        const filters = [{ field: 'status', operator: 'eq', value: null }];
        const filtered = filterData(data, filters);
        expect(filtered).toEqual([
            { id: 4, category: 'C', value: 50, status: null }
        ]);
    });

    it('should combine multiple filters', () => {
        const filters = [
            { field: 'category', operator: 'eq', value: 'A' },
            { field: 'value', operator: 'gt', value: 120 }
        ];
        const filtered = filterData(data, filters);
        expect(filtered).toEqual([
            { id: 3, category: 'A', value: 150 }
        ]);
    });

    it('should handle no filters gracefully', () => {
        const filtered = filterData(data, []);
        expect(filtered).toEqual(data);
    });
});

describe('Data Processor Service - aggregateData', () => {
    const data = [
        { region: 'East', sales: 100, units: 10 },
        { region: 'West', sales: 200, units: 20 },
        { region: 'East', sales: 150, units: 15 },
        { region: 'West', sales: 50, units: 5 },
        { region: 'North', sales: 300, units: 30 },
        { region: 'East', sales: null, units: 5 }, // Test null values
    ];

    it('should correctly sum sales and count units by region', () => {
        const groupByField = 'region';
        const aggregates = [
            { field: 'sales', operation: 'sum' },
            { field: 'units', operation: 'count' },
            { field: 'units', operation: 'avg' }
        ];
        const aggregated = aggregateData(data, groupByField, aggregates);

        expect(aggregated).toEqual(expect.arrayContaining([
            { region: 'East', sales_sum: 250, units_count: 3, units_avg: 10 }, // 100+150, 10+15+5/3
            { region: 'West', sales_sum: 250, units_count: 2, units_avg: 12.5 },
            { region: 'North', sales_sum: 300, units_count: 1, units_avg: 30 }
        ]));
        expect(aggregated.length).toBe(3);
    });

    it('should handle min and max operations', () => {
        const groupByField = 'region';
        const aggregates = [
            { field: 'sales', operation: 'min' },
            { field: 'sales', operation: 'max' },
        ];
        const aggregated = aggregateData(data, groupByField, aggregates);
        expect(aggregated).toEqual(expect.arrayContaining([
            { region: 'East', sales_min: 100, sales_max: 150 },
            { region: 'West', sales_min: 50, sales_max: 200 },
            { region: 'North', sales_min: 300, sales_max: 300 }
        ]));
    });

    it('should return original data if no group-by or aggregates are provided', () => {
        expect(aggregateData(data, null, [])).toEqual(data);
        expect(aggregateData(data, 'region', [])).toEqual(data);
    });

    it('should return empty array for empty data', () => {
        expect(aggregateData([], 'region', [{ field: 'sales', operation: 'sum' }])).toEqual([]);
    });
});

describe('Data Processor Service - processVisualizationData', () => {
    const rawData = [
        { id: '1', product: 'A', sales: '100', category: 'Elec', date: '2023-01-01' },
        { id: '2', product: 'B', sales: '200', category: 'Food', date: '2023-01-02' },
        { id: '3', product: 'A', sales: '150', category: 'Elec', date: '2023-01-01' },
        { id: '4', product: 'C', sales: '50', category: 'Food', date: '2023-01-03' },
    ];
    const schema = [
        { name: 'id', type: 'string' },
        { name: 'product', type: 'string' },
        { name: 'sales', type: 'number' },
        { name: 'category', type: 'string' },
        { name: 'date', type: 'date' },
    ];

    it('should process data with normalization, filtering, and aggregation', () => {
        const config = {
            schema,
            filters: [{ field: 'sales', operator: 'gte', value: 100 }],
            groupBy: 'category',
            aggregates: [{ field: 'sales', operation: 'sum', alias: 'total_sales' }],
        };

        const processed = processVisualizationData(rawData, config);
        expect(processed).toEqual(expect.arrayContaining([
            { category: 'Elec', sales_sum: 250 }, // 100 + 150
            { category: 'Food', sales_sum: 200 } // only 200, 50 is filtered out
        ]));
        expect(processed.length).toBe(2);
    });

    it('should only normalize if no filters or aggregates provided', () => {
        const config = { schema };
        const processed = processVisualizationData(rawData, config);
        expect(processed.length).toBe(rawData.length);
        expect(processed[0].sales).toBe(100); // Check for number conversion
    });

    it('should throw AppError on major processing failure', () => {
        const invalidSchema = [{ name: 'sales', type: 'unknown_type' }];
        const config = { schema: invalidSchema };
        expect(() => processVisualizationData(rawData, config)).toThrow(AppError);
    });
});