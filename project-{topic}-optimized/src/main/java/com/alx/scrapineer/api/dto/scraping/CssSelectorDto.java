```java
package com.alx.scrapineer.api.dto.scraping;

import com.alx.scrapineer.data.entity.SelectorType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CssSelectorDto {
    private Long id;

    @NotBlank(message = "Selector name cannot be empty")
    private String name;

    @NotBlank(message = "Selector value cannot be empty")
    private String selectorValue;

    @NotNull(message = "Selector type cannot be null")
    private SelectorType type;

    private String attributeName; // Required if type is ATTRIBUTE
}
```