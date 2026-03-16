```java
package com.alx.scrapineer.api.dto.scraping;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingTargetDto {
    private Long id;

    private Long userId;

    @NotBlank(message = "Target name cannot be empty")
    private String name;

    @NotBlank(message = "URL cannot be empty")
    @Pattern(regexp = "^(http|https)://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/\\S*)?$",
             message = "URL must be a valid HTTP or HTTPS address")
    private String url;

    private String description;

    private boolean active;

    @NotEmpty(message = "At least one CSS selector must be provided")
    @Valid // Enable validation on elements of the list
    private List<CssSelectorDto> selectors;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```