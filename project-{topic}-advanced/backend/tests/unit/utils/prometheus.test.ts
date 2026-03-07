```typescript
import { httpRequestDurationSeconds, httpRequestsTotal, databaseQueryDurationSeconds, cacheOperationsTotal, register } from '../../../src/utils/prometheus';
import client from 'prom-client';

describe('Prometheus Metrics', () => {
  // Clear metrics registry before each test to ensure isolation
  beforeEach(() => {
    register.clear();
  });

  it('should correctly increment http_requests_total', async () => {
    httpRequestsTotal.labels('GET', '/test', '200').inc();
    const metrics = await register.metrics();
    expect(metrics).toContain('http_requests_total{method="GET",route="/test",code="200"} 1');
  });

  it('should correctly observe http_request_duration_seconds', async () => {
    const timer = httpRequestDurationSeconds.labels('POST', '/data', '201').startTimer();
    timer(); // Stop the timer immediately
    const metrics = await register.metrics();
    // Verify that the histogram metrics are present (sum and count)
    expect(metrics).toContain('http_request_duration_seconds_count{method="POST",route="/data",code="201"} 1');
    expect(metrics).toMatch(/http_request_duration_seconds_sum\{method="POST",route="\/data",code="201"\} \d+\.\d+/);
  });

  it('should correctly observe database_query_duration_seconds', async () => {
    const timer = databaseQueryDurationSeconds.labels('SELECT', 'User').startTimer();
    timer();
    const metrics = await register.metrics();
    expect(metrics).toContain('database_query_duration_seconds_count{query_type="SELECT",entity="User"} 1');
  });

  it('should correctly increment cache_operations_total', async () => {
    cacheOperationsTotal.labels('get', 'hit').inc();
    cacheOperationsTotal.labels('set', 'success').inc();
    const metrics = await register.metrics();
    expect(metrics).toContain('cache_operations_total{operation="get",status="hit"} 1');
    expect(metrics).toContain('cache_operations_total{operation="set",status="success"} 1');
  });

  it('should collect default metrics', async () => {
    const metrics = await register.metrics();
    expect(metrics).toContain('node_app_process_cpu_seconds_total');
    expect(metrics).toContain('node_app_process_virtual_memory_bytes');
    expect(metrics).toContain('node_app_nodejs_heap_size_total_bytes');
  });
});
```