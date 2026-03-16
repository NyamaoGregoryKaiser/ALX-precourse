```java
package com.alx.scrapineer.api.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * A simple home controller to serve a basic Thymeleaf page.
 * This is primarily for demonstrating a minimal UI and is not a full-fledged frontend.
 */
@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "home"; // Refers to src/main/resources/templates/home.html
    }
}
```