```java
package com.ml.utilities;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching // Enable caching for the application
public class MlUtilitiesSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(MlUtilitiesSystemApplication.class, args);
    }

}
```