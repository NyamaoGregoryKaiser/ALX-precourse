package com.alx.scraper.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Slf4j
public class ProxyService {

    // In a real application, this would be loaded from a database, file, or external service
    // and would include health checks, rotation logic, etc.
    private final List<Proxy> proxies = List.of(
            // Example proxies (replace with real ones or remove if not using)
            // new Proxy(Proxy.Type.HTTP, new InetSocketAddress("proxy.example.com", 8080)),
            // new Proxy(Proxy.Type.HTTP, new InetSocketAddress("another.proxy.net", 3128))
            // For simplicity, we'll return a direct connection by default.
            // A "real" proxy will fail if not available, so this demo assumes direct connection primarily.
    );

    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final Random random = new Random();

    /**
     * Returns a proxy from the pool, or a direct connection if no proxies are configured.
     * Implements a round-robin rotation.
     *
     * @return A java.net.Proxy object.
     */
    public Proxy getNextProxy() {
        if (proxies.isEmpty()) {
            log.debug("No proxies configured. Returning direct connection.");
            return Proxy.NO_PROXY;
        }

        // Round-robin
        int index = currentIndex.getAndIncrement();
        if (index >= proxies.size()) {
            currentIndex.set(0); // Reset if we've gone through all
            index = 0;
        }

        // Or random for more robust rotation:
        // int index = random.nextInt(proxies.size());

        Proxy selectedProxy = proxies.get(index);
        log.debug("Using proxy: {}", selectedProxy.address());
        return selectedProxy;
    }

    /**
     * Reports a proxy as bad, potentially removing it or marking it for cooldown.
     * (Placeholder for more advanced proxy management)
     * @param proxy The proxy that failed.
     */
    public void reportBadProxy(Proxy proxy) {
        log.warn("Proxy reported as bad: {}. A real implementation would remove or cool down this proxy.", proxy.address());
        // Implement logic to remove or disable this proxy from the active pool
    }
}