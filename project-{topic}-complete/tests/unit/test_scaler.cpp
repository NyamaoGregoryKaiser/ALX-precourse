```cpp
#include "gtest/gtest.h"
#include "../../src/ml_utils/preprocessing/Scaler.hpp"
#include "../../src/ml_utils/core/MatrixUtils.hpp"
#include "../../src/common/Exceptions.hpp"
#include "../../src/common/Logger.hpp" // Ensure logger is initialized

using namespace MLToolkit::MLUtils::Preprocessing;
using namespace MLToolkit::MLUtils::Core;
using namespace MLToolkit::Common;

// Global logger initialization is done in test_config.cpp's GlobalTestEnvironment.

TEST(MinMaxScalerTest, InitializesCorrectly) {
    MinMaxScaler scaler(0.0, 1.0);
    SUCCEED(); // If constructor doesn't throw, it's good
}

TEST(MinMaxScalerTest, ThrowsOnInvalidRange) {
    ASSERT_THROW(MinMaxScaler scaler(1.0, 0.0), InvalidArgumentException);
    ASSERT_THROW(MinMaxScaler scaler(0.0, 0.0), InvalidArgumentException);
}

TEST(MinMaxScalerTest, FitTransformData) {
    MatrixXd X(3, 2);
    X << 1.0, 10.0,
         5.0, 20.0,
         9.0, 30.0;

    MinMaxScaler scaler(0.0, 1.0);
    MatrixXd X_scaled = scaler.fit_transform(X);

    MatrixXd expected_scaled(3, 2);
    expected_scaled << 0.0, 0.0,
                       0.5, 0.5,
                       1.0, 1.0;

    ASSERT_TRUE(X_scaled.isApprox(expected_scaled));
}

TEST(MinMaxScalerTest, InverseTransformData) {
    MatrixXd X(3, 2);
    X << 1.0, 10.0,
         5.0, 20.0,
         9.0, 30.0;

    MinMaxScaler scaler(0.0, 1.0);
    MatrixXd X_scaled = scaler.fit_transform(X);
    MatrixXd X_original = scaler.inverse_transform(X_scaled);

    ASSERT_TRUE(X_original.isApprox(X));
}

TEST(MinMaxScalerTest, HandlesZeroRangeColumn) {
    MatrixXd X(3, 2);
    X << 1.0, 10.0,
         1.0, 20.0,
         1.0, 30.0; // First column is constant

    MinMaxScaler scaler(0.0, 1.0);
    MatrixXd X_scaled = scaler.fit_transform(X);

    MatrixXd expected_scaled(3, 2);
    expected_scaled << 0.0, 0.0, // Constant column becomes min_feature
                       0.0, 0.5,
                       0.0, 1.0;
    
    ASSERT_TRUE(X_scaled.isApprox(expected_scaled));
}

TEST(MinMaxScalerTest, ThrowsIfTransformBeforeFit) {
    MinMaxScaler scaler;
    MatrixXd X(1,1); X << 1.0;
    ASSERT_THROW(scaler.transform(X), MLUtilityException);
    ASSERT_THROW(scaler.inverse_transform(X), MLUtilityException);
}

TEST(MinMaxScalerTest, SerializesToJsonAndBack) {
    MatrixXd X(2, 2);
    X << 10.0, 1.0,
         20.0, 5.0;

    MinMaxScaler original_scaler(0.0, 10.0);
    original_scaler.fit(X);
    
    nlohmann::json j = original_scaler.to_json();

    MinMaxScaler deserialized_scaler; // Default constructor
    deserialized_scaler.from_json(j);

    MatrixXd X_scaled_orig = original_scaler.transform(X);
    MatrixXd X_scaled_deserialized = deserialized_scaler.transform(X);

    ASSERT_TRUE(X_scaled_deserialized.isApprox(X_scaled_orig));
    ASSERT_TRUE(deserialized_scaler.inverse_transform(X_scaled_deserialized).isApprox(X));
}

// --- StandardScaler Tests ---
TEST(StandardScalerTest, InitializesCorrectly) {
    StandardScaler scaler;
    SUCCEED();
}

TEST(StandardScalerTest, FitTransformData) {
    MatrixXd X(3, 2);
    X << 1.0, 10.0,
         2.0, 20.0,
         3.0, 30.0;

    StandardScaler scaler;
    MatrixXd X_scaled = scaler.fit_transform(X);

    // Expected values for X:
    // Mean: [2.0, 20.0]
    // StdDev (sample, N-1): [1.0, 10.0]
    // (1-2)/1 = -1, (10-20)/10 = -1
    // (2-2)/1 = 0, (20-20)/10 = 0
    // (3-2)/1 = 1, (30-20)/10 = 1
    MatrixXd expected_scaled(3, 2);
    expected_scaled << -1.0, -1.0,
                        0.0,  0.0,
                        1.0,  1.0;

    ASSERT_TRUE(X_scaled.isApprox(expected_scaled));
}

TEST(StandardScalerTest, InverseTransformData) {
    MatrixXd X(3, 2);
    X << 1.0, 10.0,
         2.0, 20.0,
         3.0, 30.0;

    StandardScaler scaler;
    MatrixXd X_scaled = scaler.fit_transform(X);
    MatrixXd X_original = scaler.inverse_transform(X_scaled);

    ASSERT_TRUE(X_original.isApprox(X));
}

TEST(StandardScalerTest, HandlesZeroStdDevColumn) {
    MatrixXd X(3, 2);
    X << 5.0, 10.0,
         5.0, 20.0,
         5.0, 30.0; // First column is constant

    StandardScaler scaler;
    MatrixXd X_scaled = scaler.fit_transform(X);

    MatrixXd expected_scaled(3, 2);
    expected_scaled << 0.0, -1.0, // Constant column becomes 0
                       0.0,  0.0,
                       0.0,  1.0;

    ASSERT_TRUE(X_scaled.isApprox(expected_scaled));
}

TEST(StandardScalerTest, ThrowsIfTransformBeforeFit) {
    StandardScaler scaler;
    MatrixXd X(1,1); X << 1.0;
    ASSERT_THROW(scaler.transform(X), MLUtilityException);
    ASSERT_THROW(scaler.inverse_transform(X), MLUtilityException);
}

TEST(StandardScalerTest, SerializesToJsonAndBack) {
    MatrixXd X(2, 2);
    X << 10.0, 1.0,
         20.0, 5.0;

    StandardScaler original_scaler;
    original_scaler.fit(X);
    
    nlohmann::json j = original_scaler.to_json();

    StandardScaler deserialized_scaler;
    deserialized_scaler.from_json(j);

    MatrixXd X_scaled_orig = original_scaler.transform(X);
    MatrixXd X_scaled_deserialized = deserialized_scaler.transform(X);

    ASSERT_TRUE(X_scaled_deserialized.isApprox(X_scaled_orig));
    ASSERT_TRUE(deserialized_scaler.inverse_transform(X_scaled_deserialized).isApprox(X));
}

```