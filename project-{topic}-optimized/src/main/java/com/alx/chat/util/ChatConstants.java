```java
package com.alx.chat.util;

public class ChatConstants {
    public static final String DEFAULT_ROLE = "ROLE_USER";
    public static final String ADMIN_ROLE = "ROLE_ADMIN";

    // WebSocket Message Types (if you want to categorize messages)
    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE
    }
}
```