import asyncio
import os
import json
from datetime import datetime

from app.core.config import settings
from app.core.database import async_session, engine
from app.crud.user import crud_user
from app.crud.dataset import crud_dataset
from app.crud.model import crud_ml_model
from app.crud.experiment import crud_experiment
from app.schemas.user import UserCreate
from app.schemas.dataset import DatasetCreate
from app.schemas.model import MLModelCreate
from app.schemas.experiment import ExperimentCreate
from app.models.user import User as DBUser # Import ORM model for direct creation

async def seed_data():
    """
    Seeds the database with initial data for testing and demonstration.
    """
    print("Starting database seeding...")

    async with async_session() as db:
        async with db.begin(): # Use a transaction for seeding
            # --- Create Superuser ---
            admin_user = await crud_user.get_by_email(db, email=settings.FIRST_SUPERUSER_EMAIL)
            if not admin_user:
                admin_user_in = UserCreate(
                    email=settings.FIRST_SUPERUSER_EMAIL,
                    password=settings.FIRST_SUPERUSER_PASSWORD,
                    full_name="System Administrator",
                )
                admin_user = await crud_user.create(db, obj_in=admin_user_in)
                admin_user.is_superuser = True # Manually set superuser flag after creation
                db.add(admin_user)
                await db.flush() # Flush to get ID, but don't commit yet
                print(f"Created superuser: {admin_user.email}")
            else:
                print(f"Superuser '{admin_user.email}' already exists.")

            # --- Create Regular User ---
            regular_user_email = "user@example.com"
            regular_user = await crud_user.get_by_email(db, email=regular_user_email)
            if not regular_user:
                regular_user_in = UserCreate(
                    email=regular_user_email,
                    password="userpassword",
                    full_name="Regular User",
                )
                regular_user = await crud_user.create(db, obj_in=regular_user_in)
                await db.flush()
                print(f"Created regular user: {regular_user.email}")
            else:
                print(f"Regular user '{regular_user.email}' already exists.")

            # --- Create Datasets ---
            dataset1_name = "Iris Flower Dataset"
            dataset1 = await crud_dataset.get_by_name(db, name=dataset1_name)
            if not dataset1:
                dataset1_in = DatasetCreate(
                    name=dataset1_name,
                    description="Classic Iris flower dataset for classification.",
                    file_path="s3://ml-datasets/iris.csv",
                    file_size_bytes=10000,
                    file_type="csv",
                    rows_count=150,
                    columns_count=5,
                )
                dataset1 = await crud_dataset.create_with_owner(db, obj_in=dataset1_in, owner_id=admin_user.id)
                print(f"Created dataset: {dataset1.name}")
            else:
                print(f"Dataset '{dataset1.name}' already exists.")

            dataset2_name = "California Housing Dataset"
            dataset2 = await crud_dataset.get_by_name(db, name=dataset2_name)
            if not dataset2:
                dataset2_in = DatasetCreate(
                    name=dataset2_name,
                    description="Dataset for predicting California housing prices.",
                    file_path="s3://ml-datasets/cal_housing.parquet",
                    file_size_bytes=500000,
                    file_type="parquet",
                    rows_count=20640,
                    columns_count=9,
                )
                dataset2 = await crud_dataset.create_with_owner(db, obj_in=dataset2_in, owner_id=regular_user.id)
                print(f"Created dataset: {dataset2.name}")
            else:
                print(f"Dataset '{dataset2.name}' already exists.")


            # --- Create ML Models ---
            model1_name = "Iris Classifier"
            model1_version = "1.0"
            model1 = await crud_ml_model.get_by_name_and_version(db, name=model1_name, version=model1_version)
            if not model1:
                model1_in = MLModelCreate(
                    name=model1_name,
                    version=model1_version,
                    description="Logistic Regression model trained on Iris dataset.",
                    model_path="s3://ml-models/iris_lr_v1.pkl",
                    framework="scikit-learn",
                    task_type="classification",
                    hyperparameters={"solver": "lbfgs", "C": 1.0},
                    metrics={"accuracy": 0.97, "precision": 0.96, "recall": 0.97},
                )
                model1 = await crud_ml_model.create_with_owner(db, obj_in=model1_in, owner_id=admin_user.id)
                print(f"Created model: {model1.name} (v{model1.version})")
            else:
                print(f"Model '{model1.name}' (v{model1.version}) already exists.")

            model2_name = "Housing Price Predictor"
            model2_version = "alpha"
            model2 = await crud_ml_model.get_by_name_and_version(db, name=model2_name, version=model2_version)
            if not model2:
                model2_in = MLModelCreate(
                    name=model2_name,
                    version=model2_version,
                    description="XGBoost model for California housing price prediction.",
                    model_path="s3://ml-models/cal_housing_xgb_alpha.joblib",
                    framework="xgboost",
                    task_type="regression",
                    hyperparameters={"n_estimators": 100, "learning_rate": 0.1},
                    metrics={"rmse": 0.5, "mae": 0.35},
                )
                model2 = await crud_ml_model.create_with_owner(db, obj_in=model2_in, owner_id=regular_user.id)
                print(f"Created model: {model2.name} (v{model2.version})")
            else:
                print(f"Model '{model2.name}' (v{model2.version}) already exists.")

            # --- Create Experiments ---
            experiment1_name = "Iris LR tuning run 1"
            experiment1_run_id = "iris-lr-run-001"
            experiment1 = await crud_experiment.get_by_run_id(db, run_id=experiment1_run_id)
            if not experiment1:
                experiment1_in = ExperimentCreate(
                    name=experiment1_name,
                    description="First tuning run for Iris Logistic Regression.",
                    run_id=experiment1_run_id,
                    parameters={"C": 0.5, "penalty": "l2"},
                    metrics={"accuracy": 0.95, "f1_score": 0.94},
                    artifacts_uri="s3://ml-artifacts/iris-lr-run-001/",
                    status="completed",
                    model_id=model1.id,
                    dataset_id=dataset1.id,
                )
                experiment1 = await crud_experiment.create_with_owner(db, obj_in=experiment1_in, owner_id=admin_user.id)
                print(f"Created experiment: {experiment1.name} ({experiment1.run_id})")
            else:
                print(f"Experiment '{experiment1.name}' ({experiment1.run_id}) already exists.")

            experiment2_name = "Housing XGBoost quick run"
            experiment2_run_id = "housing-xgb-run-001"
            experiment2 = await crud_experiment.get_by_run_id(db, run_id=experiment2_run_id)
            if not experiment2:
                experiment2_in = ExperimentCreate(
                    name=experiment2_name,
                    description="Initial quick run for California Housing XGBoost.",
                    run_id=experiment2_run_id,
                    parameters={"n_estimators": 50, "max_depth": 5},
                    metrics={"rmse": 0.6, "r2_score": 0.75},
                    artifacts_uri="s3://ml-artifacts/housing-xgb-run-001/",
                    status="completed",
                    model_id=model2.id,
                    dataset_id=dataset2.id,
                )
                experiment2 = await crud_experiment.create_with_owner(db, obj_in=experiment2_in, owner_id=regular_user.id)
                print(f"Created experiment: {experiment2.name} ({experiment2.run_id})")
            else:
                print(f"Experiment '{experiment2.name}' ({experiment2.run_id}) already exists.")

        await db.commit() # Commit all changes at the end of the transaction
    print("Database seeding completed.")

if __name__ == "__main__":
    # Set the environment variable if not already set, for consistent settings loading
    os.environ["SECRET_KEY"] = "supersecretkeythatisverylongandrandomforproductionuse"
    os.environ["POSTGRES_SERVER"] = os.getenv("POSTGRES_SERVER", "localhost") # Use localhost if running outside docker-compose
    os.environ["REDIS_HOST"] = os.getenv("REDIS_HOST", "localhost")

    print(f"Attempting to connect to DB at: {settings.DATABASE_URL}")
    print(f"Attempting to connect to Redis at: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
    asyncio.run(seed_data())