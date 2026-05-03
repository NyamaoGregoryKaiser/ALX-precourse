package com.alx.scrapingtools;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching // Enable Spring's caching mechanism
@EnableScheduling // Enable Spring's scheduled tasks
public class ScrapingToolsApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScrapingToolsApplication.class, args);
    }

}