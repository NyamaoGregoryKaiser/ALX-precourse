```java
package com.alx.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching // Enable Spring's caching abstraction
public class RealtimeChatBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(RealtimeChatBackendApplication.class, args);
    }

}
```