```java
package com.example.performancemonitor.model;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
public class SystemMetrics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double cpuUsage;
    private long memoryUsage;
    private LocalDateTime timestamp;

    // Getters and setters
    // ...
}
```