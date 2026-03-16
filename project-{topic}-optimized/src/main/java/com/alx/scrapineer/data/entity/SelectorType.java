```java
package com.alx.scrapineer.data.entity;

/**
 * Defines the type of data to extract using a CSS selector.
 */
public enum SelectorType {
    TEXT,       // Extract the text content of the element
    ATTRIBUTE,  // Extract a specific attribute's value (e.g., href, src)
    HTML        // Extract the inner HTML of the element
}
```