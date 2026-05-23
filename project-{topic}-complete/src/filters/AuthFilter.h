```cpp
#pragma once

#include <drogon/HttpFilter.h>
#include "services/AuthService.h"

namespace CMS::Filters {

class AuthFilter : public drogon::HttpFilter<AuthFilter> {
public:
    AuthFilter();
    virtual void doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&& fc,
                          drogon::FilterChainCallback&& fcc) override;

private:
    CMS::Services::AuthService authService_;
};

} // namespace CMS::Filters
```