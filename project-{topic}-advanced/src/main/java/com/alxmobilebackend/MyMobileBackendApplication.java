```java
package com.alxmobilebackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableCaching // Enables Spring's caching abstraction
@EnableAsync   // Enables Spring's async method execution
@EnableAspectJAutoProxy(proxyTargetClass = true) // Needed for AOP features like caching, transactions, etc.
public class MyMobileBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(MyMobileBackendApplication.class, args);
    }

}
```