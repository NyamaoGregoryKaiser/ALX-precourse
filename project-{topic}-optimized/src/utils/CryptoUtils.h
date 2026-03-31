#pragma once

#include <string>

namespace CryptoUtils {
    // In a real production system, use a robust library like Argon2, bcrypt, or scrypt.
    // For this example, we'll use a simple SHA256 simulation and a basic salt.
    // WARNING: This is NOT cryptographically secure for passwords.
    // This is purely for demonstration of the pattern.
    
    // Generates a simple SHA256-like hash (simulated)
    std::string generateHash(const std::string& input, const std::string& salt);
    
    // Generates a random salt (for demonstration)
    std::string generateSalt(size_t length = 16);
    
    // Verifies a hash (simulated)
    bool verifyHash(const std::string& input, const std::string& salt, const std::string& storedHash);
}