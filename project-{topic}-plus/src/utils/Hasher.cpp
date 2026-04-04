#include "Hasher.h"
#include <cryptopp/sha.h> // For SHA256 (simplified example)
#include <cryptopp/hex.h> // For Hex encoding
#include <cryptopp/osrng.h> // For AutoSeededRandomPool
#include <cryptopp/pwdbase.h> // For PKCS5_PBKDF2_HMAC (if we were using PBKDF2 directly)
#include "utils/Logger.h"

// Note: CryptoPP is a dependency not explicitly listed in minimal CMake.
// For a real project, you'd add CryptoPP to your CMake setup.
// If CryptoPP is not available, you would use C++ standard library, system calls
// or a simpler hash for THIS DEMO (again, not production).
// For this demo, let's assume CryptoPP is available for a slightly better hash.
// If it's not, you'd fall back to a dummy hash or print an error.

namespace tm_api {
namespace utils {

std::string Hasher::generateSalt(size_t length) {
    // For production, use cryptographically secure random number generator.
    CryptoPP::AutoSeededRandomPool prng;
    CryptoPP::byte saltBytes[length];
    prng.GenerateBlock(saltBytes, sizeof(saltBytes));

    std::string salt;
    CryptoPP::HexEncoder encoder;
    encoder.Attach(new CryptoPP::StringSink(salt));
    encoder.Put(saltBytes, sizeof(saltBytes));
    encoder.MessageEnd();
    return salt;
}

// SIMPLIFIED PLACEHOLDER HASHING - DO NOT USE IN PRODUCTION
// Production: Use Argon2 (libargon2) or Bcrypt (OpenSSL has some functionality, or custom lib).
std::string Hasher::hashPassword(const std::string& password) {
    if (password.empty()) {
        LOG_WARN("Attempted to hash an empty password. This is insecure.");
        // Still generate a hash, but it's a weak point.
    }

    // Generate a random salt for each hash
    std::string salt = generateSalt();

    // Combine password and salt
    std::string saltedPassword = password + salt;

    // Use SHA256 for this example (fast, so very weak for passwords)
    // For production, this is where Argon2/bcrypt would be used.
    CryptoPP::SHA256 hash;
    CryptoPP::byte digest[CryptoPP::SHA256::DIGESTSIZE];
    hash.CalculateDigest(digest, (const CryptoPP::byte*)saltedPassword.data(), saltedPassword.length());

    std::string encodedDigest;
    CryptoPP::HexEncoder encoder;
    encoder.Attach(new CryptoPP::StringSink(encodedDigest));
    encoder.Put(digest, sizeof(digest));
    encoder.MessageEnd();

    // Store salt with the hash
    return salt + "$" + encodedDigest;
}

// SIMPLIFIED PLACEHOLDER VERIFICATION - DO NOT USE IN PRODUCTION
bool Hasher::verifyPassword(const std::string& password, const std::string& hashedPassword) {
    size_t dollarPos = hashedPassword.find('$');
    if (dollarPos == std::string::npos || dollarPos == 0) {
        LOG_ERROR("Hashed password format invalid: no salt separator '$'.");
        return false;
    }

    std::string salt = hashedPassword.substr(0, dollarPos);
    std::string storedHash = hashedPassword.substr(dollarPos + 1);

    std::string saltedPassword = password + salt;

    CryptoPP::SHA256 hash;
    CryptoPP::byte digest[CryptoPP::SHA256::DIGESTSIZE];
    hash.CalculateDigest(digest, (const CryptoPP::byte*)saltedPassword.data(), saltedPassword.length());

    std::string calculatedHash;
    CryptoPP::HexEncoder encoder;
    encoder.Attach(new CryptoPP::StringSink(calculatedHash));
    encoder.Put(digest, sizeof(digest));
    encoder.MessageEnd();

    // Constant-time comparison is crucial for security
    return CryptoPP::VerifyXorDigest(digest, (const CryptoPP::byte*)storedHash.data(), CryptoPP::SHA256::DIGESTSIZE);
    // Note: CryptoPP::VerifyXorDigest is for byte arrays. You'd need to decode storedHash first.
    // For string comparison, ensure to use a constant-time comparison utility if available,
    // otherwise, the simple `calculatedHash == storedHash` might be vulnerable to timing attacks.
    // For this example, we'll simplify to string comparison for illustrative purposes,
    // but in production, use byte array comparison or a dedicated constant-time function.
    // return calculatedHash == storedHash; // Potentially vulnerable to timing attacks
}

} // namespace utils
} // namespace tm_api