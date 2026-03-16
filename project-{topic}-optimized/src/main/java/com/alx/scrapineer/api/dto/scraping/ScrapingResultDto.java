```java
package com.alx.scrapineer.api.dto.scraping;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingResultDto {
    private Long id;
    private Long jobId;
    private Long targetId;
    private Map<String, String> extractedData;
    private boolean successful;
    private String errorMessage;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;
}
```