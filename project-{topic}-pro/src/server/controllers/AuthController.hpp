```cpp
#ifndef PAYMENT_PROCESSOR_AUTH_CONTROLLER_HPP
#define PAYMENT_PROCESSOR_AUTH_CONTROLLER_HPP

#include <Pistache/Http.h>
#include <Pistache/Router.h>
#include <nlohmann/json.hpp>
#include "services/AuthService.hpp"
#include "util/Logger.hpp"

class AuthController {
public:
    explicit AuthController(AuthService& authService);

    void registerUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    void loginUser(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);

    // Helper to get authenticated user details from a request (re-verifies token, for simplicity in absence of shared context)
    static std::optional<JwtTokenDetails> getAuthenticatedUserDetails(const Pistache::Rest::Request& request);

private:
    AuthService& authService;
};

#endif // PAYMENT_PROCESSOR_AUTH_CONTROLLER_HPP
```