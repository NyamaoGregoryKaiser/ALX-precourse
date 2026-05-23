import { AppDataSource } from './data-source';
import { User } from '../modules/auth/entities/User';
import { Dataset } from '../modules/datasets/entities/Dataset';
import { MLModel } from '../modules/models/entities/MLModel';
import { ExperimentRun } from '../modules/experiments/entities/ExperimentRun';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

async function seed() {
  await AppDataSource.initialize();
  logger.info('Data Source initialized for seeding.');

  try {
    const userRepository = AppDataSource.getRepository(User);
    const datasetRepository = AppDataSource.getRepository(Dataset);
    const modelRepository = AppDataSource.getRepository(MLModel);
    const experimentRepository = AppDataSource.getRepository(ExperimentRun);

    // Clear existing data (optional, useful for clean re-seeding)
    await experimentRepository.clear();
    await modelRepository.clear();
    await datasetRepository.clear();
    await userRepository.clear();
    logger.info('Cleared existing data.');

    // Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminUser = userRepository.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    });
    const regularUser = userRepository.create({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
    });
    await userRepository.save([adminUser, regularUser]);
    logger.info('Users created.');

    // Create Datasets
    const dataset1 = datasetRepository.create({
      name: 'Customer Churn Data',
      description: 'Dataset for predicting customer churn.',
      version: '1.0.0',
      schemaJson: {
        columns: [
          { name: 'age', type: 'number' },
          { name: 'gender', type: 'string' },
          { name: 'churn', type: 'boolean' },
        ],
      },
      fileUrl: '/uploads/customer_churn_v1.csv',
      createdBy: adminUser,
    });
    const dataset2 = datasetRepository.create({
      name: 'Housing Prices',
      description: 'Dataset for housing price prediction in California.',
      version: '2.1.0',
      schemaJson: {
        columns: [
          { name: 'area', type: 'number' },
          { name: 'bedrooms', type: 'number' },
          { name: 'price', type: 'number' },
        ],
      },
      fileUrl: '/uploads/housing_prices_v2.csv',
      createdBy: regularUser,
    });
    await datasetRepository.save([dataset1, dataset2]);
    logger.info('Datasets created.');

    // Create Models
    const model1 = modelRepository.create({
      name: 'Churn Predictor v1',
      version: '1.0.0',
      framework: 'Scikit-learn',
      type: 'Classification',
      description: 'Logistic Regression model to predict customer churn.',
      dataset: dataset1,
      metricsJson: { accuracy: 0.85, f1_score: 0.82 },
      hyperparametersJson: { solver: 'liblinear', C: 1.0 },
      createdBy: adminUser,
    });
    const model2 = modelRepository.create({
      name: 'Price Predictor XGBoost',
      version: '1.1.0',
      framework: 'XGBoost',
      type: 'Regression',
      description: 'Gradient Boosting model for housing prices.',
      dataset: dataset2,
      metricsJson: { rmse: 50000, r2_score: 0.89 },
      hyperparametersJson: { n_estimators: 100, learning_rate: 0.1 },
      createdBy: regularUser,
    });
    await modelRepository.save([model1, model2]);
    logger.info('Models created.');

    // Create Experiment Runs
    const experiment1 = experimentRepository.create({
      name: 'Churn LR Baseline',
      description: 'First experiment with Logistic Regression for churn.',
      model: model1,
      dataset: dataset1,
      parametersJson: { feature_set: ['age', 'gender'], scaling: 'StandardScaler' },
      metricsJson: { accuracy: 0.84, precision: 0.78 },
      artifactsUrl: 's3://ml-artifacts/churn-lr-baseline-artifacts/',
      createdBy: adminUser,
    });
    const experiment2 = experimentRepository.create({
      name: 'Housing XGBoost Tuned',
      description: 'Tuned XGBoost model for housing prices.',
      model: model2,
      dataset: dataset2,
      parametersJson: { feature_set: ['area', 'bedrooms'], hyperparameter_tuning: 'GridSearchCV' },
      metricsJson: { rmse: 48000, mae: 35000 },
      artifactsUrl: 's3://ml-artifacts/housing-xgb-tuned-artifacts/',
      createdBy: regularUser,
    });
    await experimentRepository.save([experiment1, experiment2]);
    logger.info('Experiment runs created.');

    logger.info('Database seeding complete!');
  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    logger.info('Data Source destroyed.');
  }
}

seed();
```