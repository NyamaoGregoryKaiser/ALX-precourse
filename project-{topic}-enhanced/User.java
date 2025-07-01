```java
package com.example.authsystem.model;

import jakarta.persistence.*;

@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    private String password; // In production, hash this!

    // Getters and setters
    // ...
}
```