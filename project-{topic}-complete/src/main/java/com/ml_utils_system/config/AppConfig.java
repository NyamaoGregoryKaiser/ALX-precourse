```java
package com.ml_utils_system.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestTemplate;

/**
 * General application configuration for beans not directly related to web or security.
 */
@Configuration
public class AppConfig {

    /**
     * Provides a BCryptPasswordEncoder bean for password hashing.
     *
     * @return A BCryptPasswordEncoder instance.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Provides a RestTemplate bean for making HTTP requests to external services.
     * Useful if the prediction service needed to call an actual external ML model endpoint.
     *
     * @return A RestTemplate instance.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```