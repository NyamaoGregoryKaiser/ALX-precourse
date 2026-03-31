```java
package com.ml_utils_system.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * Configuration for Flyway database migrations.
 * Ensures the database schema is up-to-date before the application starts.
 */
@Configuration
public class FlywayConfig {

    @Value("${spring.flyway.enabled:true}")
    private boolean flywayEnabled;

    /**
     * Configures and starts Flyway to apply database migrations.
     *
     * @param dataSource The application's DataSource.
     * @return A Flyway bean, ensuring migrations run on startup.
     */
    @Bean(initMethod = "migrate")
    public Flyway flyway(DataSource dataSource) {
        if (!flywayEnabled) {
            // Return a no-op Flyway instance if disabled
            return new Flyway(new Flyway.Configuration());
        }
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration") // Location of migration scripts
                .load();
    }
}
```