#ifndef BCRYPT_WRAPPER_H
#define BCRYPT_WRAPPER_H

#include <string>

namespace BcryptWrapper {
    std::string hashPassword(const std::string& password);
    bool checkPassword(const std::string& password, const std::string& hash);
} // namespace BcryptWrapper

#endif // BCRYPT_WRAPPER_H