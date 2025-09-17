```java
package com.example.authsystem.model;

import jakarta.persistence.*;

@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String password; // In production, use a more secure way to store passwords (e.g., bcrypt)

    // Getters and setters
    // ...
}
```