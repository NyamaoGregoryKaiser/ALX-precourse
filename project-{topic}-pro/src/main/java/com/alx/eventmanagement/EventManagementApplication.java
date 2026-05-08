```java
package com.alx.eventmanagement;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableCaching // Enable Spring's caching abstraction
@EnableJpaAuditing // Enable JPA Auditing for automatic created/updated timestamps
@EnableAspectJAutoProxy(proxyTargetClass = true) // Enable AspectJ proxying for AOP features like logging
public class EventManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(EventManagementApplication.class, args);
    }

}
```