```java
package com.ml.utilities.system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching // Enable Spring's caching abstraction
public class MlUtilitiesSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(MlUtilitiesSystemApplication.class, args);
    }

}
```