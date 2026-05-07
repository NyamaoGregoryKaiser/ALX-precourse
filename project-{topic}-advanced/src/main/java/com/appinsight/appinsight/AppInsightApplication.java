package com.appinsight.appinsight;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching // Enable Spring's caching mechanism
public class AppInsightApplication {

	public static void main(String[] args) {
		SpringApplication.run(AppInsightApplication.class, args);
	}

}