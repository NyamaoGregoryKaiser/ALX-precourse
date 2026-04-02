```java
package com.alx.cms.frontend.controller;

import com.alx.cms.content.service.ContentService;
import com.alx.cms.user.model.User;
import com.alx.cms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class HomeController {

    private final ContentService contentService;
    private final UserRepository userRepository; // To display user info

    @GetMapping("/")
    public String index(Model model) {
        // Example of accessing authenticated user info
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            String username = authentication.getName();
            Optional<User> currentUser = userRepository.findByUsername(username);
            currentUser.ifPresent(user -> model.addAttribute("user", user));
        }

        // Fetch some recent content (e.g., first 5 published contents)
        // This is a simplified example, usually would fetch only published content for public view
        model.addAttribute("contents", contentService.getAllContents(PageRequest.of(0, 5, Sort.by("publishedAt").descending())).getContent());
        return "index"; // Corresponds to src/main/resources/templates/index.html
    }

    @GetMapping("/login")
    public String login() {
        return "login"; // Basic login page
    }

    @GetMapping("/admin/dashboard")
    public String adminDashboard(Model model) {
        // This page would be secured via Spring Security config
        model.addAttribute("message", "Welcome to the Admin Dashboard!");
        return "admin-dashboard";
    }
}
```