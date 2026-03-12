const dataSourceService = require('../services/dataSource.service');
const dataProcessorService = require('../services/dataProcessor.service');
const { AppError } = require('../utils/errorHandler');
const logger = require('../middleware/logger');

// Create a new data source
const createDataSource = async (req, res, next) => {
    try {
        const { name, type, config, schema, data } = req.body; // 'data' for CSV/JSON upload type
        if (!name || !type || !config || !schema) {
            throw new AppError('Name, type, config, and schema are required.', 400);
        }

        const userId = req.user.id;
        const dataSource = await dataSourceService.createDataSource(userId, name, type, config, schema, data);
        res.status(201).json(dataSource);
    } catch (error) {
        logger.error(`Error creating data source: ${error.message}`);
        next(error);
    }
};

// Get all data sources for the authenticated user
const getAllDataSources = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const dataSources = await dataSourceService.getDataSourcesByUserId(userId);
        res.status(200).json(dataSources);
    } catch (error) {
        logger.error(`Error getting data sources for user ${req.user.id}: ${error.message}`);
        next(error);
    }
};

// Get a single data source by ID
const getDataSourceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const dataSource = await dataSourceService.getDataSourceById(id);

        if (!dataSource || dataSource.userId !== userId) {
            throw new AppError('Data source not found or unauthorized', 404);
        }

        res.status(200).json(dataSource);
    } catch (error) {
        logger.error(`Error getting data source ${req.params.id}: ${error.message}`);
        next(error);
    }
};

// Update a data source
const updateDataSource = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        const updatedDataSource = await dataSourceService.updateDataSource(id, userId, updates);
        res.status(200).json(updatedDataSource);
    } catch (error) {
        logger.error(`Error updating data source ${req.params.id}: ${error.message}`);
        next(error);
    }
};

// Delete a data source
const deleteDataSource = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await dataSourceService.deleteDataSource(id, userId);
        res.status(204).send(); // No content on successful deletion
    } catch (error) {
        logger.error(`Error deleting data source ${req.params.id}: ${error.message}`);
        next(error);
    }
};

// Get processed data for a data source (e.g., for preview)
const getProcessedDataSourceData = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const visualizationConfig = req.body; // Can pass filters/aggregations for preview

        const dataSource = await dataSourceService.getDataSourceById(id);
        if (!dataSource || dataSource.userId !== userId) {
            throw new AppError('Data source not found or unauthorized', 404);
        }

        // For simplicity, directly using data stored with the data source.
        // In a real app, this would involve connecting to external DBs, parsing files etc.
        if (!dataSource.data) {
             throw new AppError('No data available for this source or type not supported for direct fetch.', 400);
        }

        const processedData = dataProcessorService.processVisualizationData(dataSource.data, {
            schema: dataSource.schema,
            ...visualizationConfig // Allow overriding filters/aggregates for preview
        });

        res.status(200).json(processedData);
    } catch (error) {
        logger.error(`Error getting processed data for data source ${req.params.id}: ${error.message}`);
        next(error);
    }
}


module.exports = {
    createDataSource,
    getAllDataSources,
    getDataSourceById,
    updateDataSource,
    deleteDataSource,
    getProcessedDataSourceData
};