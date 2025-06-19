```javascript
exports.seed = function(knex) {
  return knex('metrics').insert([
    { metric_name: 'cpu_usage', value: 25.5 },
    { metric_name: 'memory_usage', value: 50.2 }
  ]);
};
```