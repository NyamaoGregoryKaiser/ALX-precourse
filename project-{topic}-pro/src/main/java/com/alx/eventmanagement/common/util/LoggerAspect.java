```java
package com.alx.eventmanagement.common.util;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Slf4j
public class LoggerAspect {

    // Pointcut for all methods in service layer
    @Pointcut("within(com.alx.eventmanagement..service.*)")
    public void serviceMethods() {}

    // Pointcut for all methods in controller layer
    @Pointcut("within(com.alx.eventmanagement..controller.*)")
    public void controllerMethods() {}

    @Around("serviceMethods() || controllerMethods()")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        String methodName = joinPoint.getSignature().toShortString();
        String className = joinPoint.getSignature().getDeclaringTypeName();

        log.debug("Entering method: {}.{}() with args: {}", className, methodName, joinPoint.getArgs());

        Object result = joinPoint.proceed(); // Execute the method

        long endTime = System.currentTimeMillis();
        long executionTime = endTime - startTime;

        log.debug("Exiting method: {}.{}() executed in {}ms. Result: {}", className, methodName, executionTime, result);

        return result;
    }
}
```