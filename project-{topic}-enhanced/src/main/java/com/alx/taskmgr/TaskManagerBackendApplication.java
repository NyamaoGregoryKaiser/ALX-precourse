```java
package com.alx.taskmgr;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching // Enable Spring's caching abstraction
public class TaskManagerBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskManagerBackendApplication.class, args);
    }

}
```