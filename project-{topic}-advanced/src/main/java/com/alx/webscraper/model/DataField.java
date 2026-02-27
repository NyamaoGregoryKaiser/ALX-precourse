```java
package com.alx.webscraper.model;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single data field to be extracted from a web page.
 * It's an embeddable object, meaning it's stored as part of the ScrapingTask entity.
 */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataField {
    private String fieldName;   // Logical name for the extracted data (e.g., "productName", "price")
    private String cssSelector; // CSS selector to locate the element on the page
    private String attribute;   // Optional attribute to extract (e.g., "href", "src", "text" if null)
}
```