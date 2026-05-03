```cmake
cmake_minimum_required(VERSION 3.10)
project(MLToolkit_Server VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- Compiler flags ---
if (CMAKE_BUILD_TYPE MATCHES "Debug")
    add_compile_options(-Wall -Wextra -Wpedantic -g -O0)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -O3 -DNDEBUG)
endif()

# --- External Dependencies ---

# nlohmann/json (vendored for simplicity)
add_subdirectory(vendor/nlohmann_json)

# spdlog (vendored for simplicity)
add_subdirectory(vendor/spdlog)

# Crow (vendored for simplicity)
add_subdirectory(vendor/Crow)

# Eigen (download if not found)
find_package(Eigen3 CONFIG)
if (NOT Eigen3_FOUND)
    message(STATUS "Eigen3 not found, downloading...")
    include(FetchContent)
    FetchContent_Declare(
        eigen
        GIT_REPOSITORY https://gitlab.com/libeigen/eigen.git
        GIT_TAG 3.4.0 # Or specific version
    )
    FetchContent_MakeAvailable(eigen)
    set(Eigen3_INCLUDE_DIR ${eigen_SOURCE_DIR})
    set(Eigen3_FOUND TRUE)
endif()
if (Eigen3_FOUND)
    include_directories(${Eigen3_INCLUDE_DIR})
    message(STATUS "Using Eigen from: ${Eigen3_INCLUDE_DIR}")
else()
    message(FATAL_ERROR "Eigen3 not found or downloadable. Please install or ensure access.")
endif()

# pqxx (PostgreSQL C++ client)
find_package(libpqxx CONFIG REQUIRED) # Requires libpqxx to be installed on the system
message(STATUS "Found libpqxx: ${libpqxx_LIBRARIES}")

# --- MLToolkit Source Files ---
# Common
set(MLTOOLKIT_COMMON_SOURCES
    src/common/Logger.cpp
    src/common/Exceptions.cpp
)
set(MLTOOLKIT_COMMON_HEADERS
    src/common/Logger.hpp
    src/common/Exceptions.hpp
)

# Config
set(MLTOOLKIT_CONFIG_SOURCES
    src/config/Config.cpp
)
set(MLTOOLKIT_CONFIG_HEADERS
    src/config/Config.hpp
)

# Database Models
set(MLTOOLKIT_DB_MODELS_HEADERS
    src/database/models/Dataset.hpp
    src/database/models/Model.hpp
    src/database/models/Pipeline.hpp
)

# Database Manager
set(MLTOOLKIT_DB_SOURCES
    src/database/DBManager.cpp
)
set(MLTOOLKIT_DB_HEADERS
    src/database/DBManager.hpp
)

# ML Utilities - Core
set(MLTOOLKIT_ML_CORE_SOURCES
    src/ml_utils/core/MatrixUtils.cpp # Basic matrix operations, mainly using Eigen
)
set(MLTOOLKIT_ML_CORE_HEADERS
    src/ml_utils/core/MatrixUtils.hpp
)

# ML Utilities - Preprocessing
set(MLTOOLKIT_ML_PREPROCESSING_SOURCES
    src/ml_utils/preprocessing/Scaler.cpp
    src/ml_utils/preprocessing/Imputer.cpp
)
set(MLTOOLKIT_ML_PREPROCESSING_HEADERS
    src/ml_utils/preprocessing/Scaler.hpp
    src/ml_utils/preprocessing/Imputer.hpp
)

# ML Utilities - Features
set(MLTOOLKIT_ML_FEATURES_SOURCES
    src/ml_utils/features/FeatureExtractor.cpp
)
set(MLTOOLKIT_ML_FEATURES_HEADERS
    src/ml_utils/features/FeatureExtractor.hpp
)

# ML Utilities - Evaluation
set(MLTOOLKIT_ML_EVALUATION_SOURCES
    src/ml_utils/evaluation/Metrics.cpp
)
set(MLTOOLKIT_ML_EVALUATION_HEADERS
    src/ml_utils/evaluation/Metrics.hpp
)

# ML Processor
set(MLTOOLKIT_ML_PROCESSOR_SOURCES
    src/ml_utils/MLProcessor.cpp
)
set(MLTOOLKIT_ML_PROCESSOR_HEADERS
    src/ml_utils/MLProcessor.hpp
)

# Middleware
set(MLTOOLKIT_MIDDLEWARE_SOURCES
    src/middleware/AuthMiddleware.cpp
    src/middleware/LoggingMiddleware.cpp
    src/middleware/ErrorHandler.cpp
    src/middleware/Cache.cpp
    src/middleware/RateLimiter.cpp
)
set(MLTOOLKIT_MIDDLEWARE_HEADERS
    src/middleware/AuthMiddleware.hpp
    src/middleware/LoggingMiddleware.hpp
    src/middleware/ErrorHandler.hpp
    src/middleware/Cache.hpp
    src/middleware/RateLimiter.hpp
)

# API Handlers
set(MLTOOLKIT_API_HANDLERS_SOURCES
    src/api/handlers/AuthHandler.cpp
    src/api/handlers/DatasetHandler.cpp
    src/api/handlers/ModelHandler.cpp
    src/api/handlers/PipelineHandler.cpp
)
set(MLTOOLKIT_API_HANDLERS_HEADERS
    src/api/handlers/AuthHandler.hpp
    src/api/handlers/DatasetHandler.hpp
    src/api/handlers/ModelHandler.hpp
    src/api/handlers/PipelineHandler.hpp
)

# API Server
set(MLTOOLKIT_API_SERVER_SOURCES
    src/api/APIServer.cpp
)
set(MLTOOLKIT_API_SERVER_HEADERS
    src/api/APIServer.hpp
)

# Main executable
set(MLTOOLKIT_MAIN_SOURCE src/main.cpp)

# Combine all sources and headers
set(MLTOOLKIT_SERVER_SOURCES
    ${MLTOOLKIT_COMMON_SOURCES}
    ${MLTOOLKIT_CONFIG_SOURCES}
    ${MLTOOLKIT_DB_SOURCES}
    ${MLTOOLKIT_ML_CORE_SOURCES}
    ${MLTOOLKIT_ML_PREPROCESSING_SOURCES}
    ${MLTOOLKIT_ML_FEATURES_SOURCES}
    ${MLTOOLKIT_ML_EVALUATION_SOURCES}
    ${MLTOOLKIT_ML_PROCESSOR_SOURCES}
    ${MLTOOLKIT_MIDDLEWARE_SOURCES}
    ${MLTOOLKIT_API_HANDLERS_SOURCES}
    ${MLTOOLKIT_API_SERVER_SOURCES}
    ${MLTOOLKIT_MAIN_SOURCE}
)

set(MLTOOLKIT_SERVER_HEADERS
    ${MLTOOLKIT_COMMON_HEADERS}
    ${MLTOOLKIT_CONFIG_HEADERS}
    ${MLTOOLKIT_DB_MODELS_HEADERS}
    ${MLTOOLKIT_DB_HEADERS}
    ${MLTOOLKIT_ML_CORE_HEADERS}
    ${MLTOOLKIT_ML_PREPROCESSING_HEADERS}
    ${MLTOOLKIT_ML_FEATURES_HEADERS}
    ${MLTOOLKIT_ML_EVALUATION_HEADERS}
    ${MLTOOLKIT_ML_PROCESSOR_HEADERS}
    ${MLTOOLKIT_MIDDLEWARE_HEADERS}
    ${MLTOOLKIT_API_HANDLERS_HEADERS}
    ${MLTOOLKIT_API_SERVER_HEADERS}
)

# Create the executable
add_executable(${PROJECT_NAME} ${MLTOOLKIT_SERVER_SOURCES})

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${PROJECT_SOURCE_DIR}/src
    ${Crow_INCLUDE_DIRS}
    ${NLOHMANN_JSON_INCLUDE_DIRS}
    ${SPDLOG_INCLUDE_DIRS}
    ${Eigen3_INCLUDE_DIR}
    ${libpqxx_INCLUDE_DIRS}
)

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    Crow::Crow
    nlohmann_json
    spdlog::spdlog_header_only # spdlog is header-only with this usage
    ${Eigen3_LIBRARIES}
    ${libpqxx_LIBRARIES}
)

# --- Unit Tests ---
enable_testing()
add_subdirectory(tests)
```