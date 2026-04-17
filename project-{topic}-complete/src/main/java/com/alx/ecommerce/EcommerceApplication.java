package com.alx.ecommerce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableCaching // Enable Spring's caching abstraction
@EnableAsync // Enable asynchronous method execution (for potential async tasks like email notifications)
@EnableAspectJAutoProxy(proxyTargetClass = true) // Enable AspectJ proxying for AOP, e.g., for logging or custom annotations
public class EcommerceApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcommerceApplication.class, args);
    }

}