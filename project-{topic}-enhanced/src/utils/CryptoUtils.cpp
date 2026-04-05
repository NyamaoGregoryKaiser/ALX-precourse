```cpp
#include "CryptoUtils.hpp"
#include "../logger/Logger.hpp"

#include <openssl/sha.h>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <random>
#include <sstream>
#include <iomanip> // For std::hex, std::setw, std::setfill
#include <stdexcept>
#include <vector>
#include <algorithm> // For std::transform

// Base64 encoding table
static const std::string base64_chars =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789+/";

// Helper function to encode binary data to hex string
std::string hexEncode(const unsigned char* data, size_t len) {
    std::stringstream ss;
    ss << std::hex << std::setfill('0');
    for (size_t i = 0; i < len; ++i) {
        ss << std::setw(2) << static_cast<int>(data[i]);
    }
    return ss.str();
}

// Helper function to decode hex string to binary data
std::vector<unsigned char> hexDecode(const std::string& hex) {
    if (hex.length() % 2 != 0) {
        throw std::runtime_error("Hex string has odd length.");
    }
    std::vector<unsigned char> bytes;
    for (size_t i = 0; i < hex.length(); i += 2) {
        std::string byteString = hex.substr(i, 2);
        bytes.push_back(static_cast<unsigned char>(std::stoul(byteString, nullptr, 16)));
    }
    return bytes;
}

// Generates a random salt string.
std::string CryptoUtils::generateSalt(size_t length) {
    static std::random_device rd;
    static std::mt19937 generator(rd());
    static std::uniform_int_distribution<int> distribution(0, 255);

    std::string salt_bytes(length, '\0');
    for (size_t i = 0; i < length; ++i) {
        salt_bytes[i] = static_cast<char>(distribution(generator));
    }
    return base64Encode(salt_bytes); // Base64 encode the binary salt
}

// Hashes a password using SHA256 with a random salt.
// Returns the salt and hash concatenated, separated by a delimiter (e.g., "$").
// Format: "salt$hash"
std::string CryptoUtils::hashPassword(const std::string& password) {
    // Generate a new salt for each password
    std::string salt = generateSalt(16); // 16 bytes of random salt, then base64 encoded
    
    // Concatenate password and salt
    std::string passwordWithSalt = password + salt;

    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, passwordWithSalt.c_str(), passwordWithSalt.length());
    SHA256_Final(hash, &sha256);

    std::string hashedPassword = hexEncode(hash, SHA256_DIGEST_LENGTH);
    Logger::debug("CryptoUtils: Password hashed successfully.");
    return salt + "$" + hashedPassword;
}

// Verifies a password against a stored hash (which includes the salt).
bool CryptoUtils::verifyPassword(const std::string& password, const std::string& storedHash) {
    size_t delimiterPos = storedHash.find('$');
    if (delimiterPos == std::string::npos) {
        Logger::warn("CryptoUtils: Stored hash format invalid (missing delimiter).");
        return false; // Invalid stored hash format
    }

    std::string salt = storedHash.substr(0, delimiterPos);
    std::string actualHash = storedHash.substr(delimiterPos + 1);

    // Rehash the provided password with the extracted salt
    std::string passwordWithSalt = password + salt;

    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, passwordWithSalt.c_str(), passwordWithSalt.length());
    SHA256_Final(hash, &sha256);

    std::string rehashedPassword = hexEncode(hash, SHA256_DIGEST_LENGTH);

    // Compare the rehashed password with the stored hash
    bool match = (rehashedPassword == actualHash);
    if (!match) {
        Logger::warn("CryptoUtils: Password verification failed.");
    } else {
        Logger::debug("CryptoUtils: Password verified successfully.");
    }
    return match;
}

// Computes HMAC-SHA256 hash.
std::string CryptoUtils::hmacSha256(const std::string& data, const std::string& key) {
    unsigned char* digest;
    digest = HMAC(EVP_sha256(), key.c_str(), key.length(),
                  reinterpret_cast<const unsigned char*>(data.c_str()), data.length(), nullptr, nullptr);
    if (digest == nullptr) {
        Logger::error("CryptoUtils: HMAC-SHA256 calculation failed.");
        throw std::runtime_error("HMAC-SHA256 calculation failed.");
    }
    return std::string(reinterpret_cast<char*>(digest), SHA256_DIGEST_LENGTH); // Return raw bytes
}

// Base64 encode binary data.
std::string CryptoUtils::base64Encode(const std::string& data) {
    std::string encoded;
    int val = 0, valb = -6;
    for (unsigned char c : data) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            encoded.push_back(base64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) {
        encoded.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    }
    while (encoded.size() % 4) {
        encoded.push_back('=');
    }
    return encoded;
}

// Base64 decode string.
std::string CryptoUtils::base64Decode(const std::string& encoded_string) {
    int in_len = encoded_string.size();
    int i = 0;
    int j = 0;
    int in_ = 0;
    unsigned char char_array_4[4], char_array_3[3];
    std::string ret;

    std::string filtered_encoded_string;
    for (char c : encoded_string) {
        if (isalnum(c) || (c == '+') || (c == '/')) {
            filtered_encoded_string.push_back(c);
        }
    }

    for (char c : filtered_encoded_string) {
        char_array_4[i++] = c;
        if (i == 4) {
            for (i = 0; i < 4; i++) {
                char_array_4[i] = base64_chars.find(char_array_4[i]);
            }

            char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
            char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
            char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

            for (i = 0; (i < 3); i++) {
                ret += char_array_3[i];
            }
            i = 0;
        }
    }

    if (i) {
        for (j = i; j < 4; j++) {
            char_array_4[j] = 0;
        }
        for (j = 0; j < 4; j++) {
            char_array_4[j] = base64_chars.find(char_array_4[j]);
        }

        char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
        char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
        char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

        for (j = 0; (j < i - 1); j++) {
            ret += char_array_3[j];
        }
    }

    return ret;
}
```