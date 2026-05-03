```cpp
#ifndef MLTOOLKIT_MATRIX_UTILS_HPP
#define MLTOOLKIT_MATRIX_UTILS_HPP

#include <Eigen/Dense>
#include <vector>
#include <string>
#include <stdexcept>
#include <numeric> // For std::iota
#include "../../common/Exceptions.hpp"
#include "../../common/Logger.hpp"

namespace MLToolkit {
namespace MLUtils {
namespace Core {

// Type aliases for convenience
using MatrixXd = Eigen::MatrixXd;
using VectorXd = Eigen::VectorXd;

// Function to convert std::vector<std::vector<double>> to Eigen::MatrixXd
inline MatrixXd vector_to_eigen_matrix(const std::vector<std::vector<double>>& data) {
    if (data.empty() || data[0].empty()) {
        throw Common::InvalidArgumentException("Input data cannot be empty for matrix conversion.");
    }

    long rows = data.size();
    long cols = data[0].size();
    MatrixXd matrix(rows, cols);

    for (long i = 0; i < rows; ++i) {
        if (data[i].size() != cols) {
            throw Common::InvalidArgumentException("All rows in the input data must have the same number of columns.");
        }
        for (long j = 0; j < cols; ++j) {
            matrix(i, j) = data[i][j];
        }
    }
    return matrix;
}

// Function to convert Eigen::MatrixXd to std::vector<std::vector<double>>
inline std::vector<std::vector<double>> eigen_matrix_to_vector(const MatrixXd& matrix) {
    std::vector<std::vector<double>> data(matrix.rows(), std::vector<double>(matrix.cols()));
    for (long i = 0; i < matrix.rows(); ++i) {
        for (long j = 0; j < matrix.cols(); ++j) {
            data[i][j] = matrix(i, j);
        }
    }
    return data;
}

// Function to load CSV data into an Eigen::MatrixXd (simplified, real impl needs CSV parsing)
// For now, this is a placeholder. A real implementation would involve a robust CSV parser.
inline MatrixXd load_csv_to_matrix(const std::string& filepath, bool has_header = true) {
    LOG_WARN("`load_csv_to_matrix` is a placeholder. A real implementation needs a robust CSV parser.");
    // In a production system, you'd use a dedicated CSV parsing library.
    // For demonstration, we assume a simple scenario or pre-parsed data.
    // Example: dummy data for now
    MatrixXd dummy_data(5, 3);
    dummy_data << 1.0, 2.0, 3.0,
                  4.0, 5.0, 6.0,
                  7.0, 8.0, 9.0,
                  10.0, 11.0, 12.0,
                  13.0, 14.0, 15.0;
    return dummy_data;
}

// Function to save Eigen::MatrixXd to a CSV file (simplified)
inline void save_matrix_to_csv(const std::string& filepath, const MatrixXd& matrix, const std::vector<std::string>& header = {}) {
    LOG_WARN("`save_matrix_to_csv` is a placeholder. A real implementation needs proper CSV formatting.");
    std::ofstream file(filepath);
    if (!file.is_open()) {
        throw Common::MLUtilityException("Failed to open file for writing: " + filepath);
    }

    if (!header.empty() && header.size() == matrix.cols()) {
        for (size_t i = 0; i < header.size(); ++i) {
            file << header[i] << (i == header.size() - 1 ? "" : ",");
        }
        file << "\n";
    }

    Eigen::IOFormat CommaInitFmt(Eigen::StreamPrecision, Eigen::DontAlignCols, ", ", "\n");
    file << matrix.format(CommaInitFmt);
    file.close();
}

} // namespace Core
} // namespace MLUtils
} // namespace MLToolkit

#endif // MLTOOLKIT_MATRIX_UTILS_HPP
```