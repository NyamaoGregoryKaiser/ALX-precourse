```java
package com.alx.devops.productmanagement.controller;

import com.alx.devops.productmanagement.dto.CategoryDTO;
import com.alx.devops.productmanagement.dto.ProductDTO;
import com.alx.devops.productmanagement.dto.UserDTO;
import com.alx.devops.productmanagement.service.CategoryService;
import com.alx.devops.productmanagement.service.ProductService;
import com.alx.devops.productmanagement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

/**
 * This controller provides server-side rendered HTML pages using Thymeleaf.
 * It's a simple demonstration for a basic frontend integrated with the backend.
 * In a real-world scenario, a separate SPA (React, Angular, Vue) would consume the REST APIs.
 */
@Controller
@RequiredArgsConstructor
public class ThymeleafController {

    private final ProductService productService;
    private final CategoryService categoryService;
    private final UserService userService;

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("message", "Welcome to ALX Product Management System!");
        return "index"; // Renders src/main/resources/templates/index.html
    }

    @GetMapping("/login")
    public String login() {
        return "login"; // Renders src/main/resources/templates/login.html
    }

    @GetMapping("/products")
    public String viewProducts(Model model) {
        List<ProductDTO> products = productService.findAllProducts();
        model.addAttribute("products", products);
        return "products"; // Renders src/main/resources/templates/products.html
    }

    @GetMapping("/categories")
    public String viewCategories(Model model) {
        List<CategoryDTO> categories = categoryService.findAllCategories();
        model.addAttribute("categories", categories);
        return "categories"; // Renders src/main/resources/templates/categories.html
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/users")
    public String viewUsers(Model model) {
        List<UserDTO> users = userService.findAllUsers();
        model.addAttribute("users", users);
        return "users"; // Renders src/main/resources/templates/users.html
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/dashboard")
    public String adminDashboard(Model model) {
        model.addAttribute("adminMessage", "Welcome to the Admin Dashboard!");
        return "admin-dashboard"; // Renders src/main/resources/templates/admin-dashboard.html
    }
}
```