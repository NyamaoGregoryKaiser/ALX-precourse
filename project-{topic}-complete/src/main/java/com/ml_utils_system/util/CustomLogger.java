```java
package com.ml_utils_system.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Utility class to provide a consistent way of getting SLF4J loggers.
 * This ensures that logger names always correspond to the class where they are used,
 * which is good practice for structured logging and easier debugging.
 */
public class CustomLogger {

    private CustomLogger() {
        // Private constructor to prevent instantiation
    }

    /**
     * Returns an SLF4J Logger for the calling class.
     *
     * @param clazz The class for which the logger is requested.
     * @return A Logger instance.
     */
    public static Logger getLogger(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }

    /**
     * Returns an SLF4J Logger for the calling class, inferring the class automatically.
     * This method is less explicit and might have minor performance implications due to stack trace analysis.
     * It's generally preferred to pass `MyClass.class` explicitly.
     *
     * @return A Logger instance for the class that invoked this method.
     */
    public static Logger getLogger() {
        // Get the stack trace element for the calling class (index 2: 0=Thread, 1=CustomLogger, 2=Caller)
        String callerClassName = new Throwable().getStackTrace()[2].getClassName();
        return LoggerFactory.getLogger(callerClassName);
    }
}
```