// Example using 'loadtest' (npm i -g loadtest)
// Run with: loadtest -n 1000 -c 100 http://localhost:3000/api/v1/predictions/MODEL_ID -m POST -H "Authorization: Bearer YOUR_TOKEN" --body '{"inputData": {"feature1": 10, "feature2": 20}}'

// Or using Artillery (npm i -g artillery)
// artillery run performance/predictions_scenario.yml
```

### `performance/predictions_scenario.yml` (Artillery Scenario)

```yaml