```java
package com.alx.eventmanagement.category.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryDTO {
    private Long id;
    private String name;
    private String description;
}
```