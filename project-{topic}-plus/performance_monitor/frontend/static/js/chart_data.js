```javascript
// Function to render charts using Chart.js
function renderCharts(data) {
    // Parse time_bucket strings to Date objects
    const labels = data.labels.map(isoString => new Date(isoString));

    // Response Time Chart
    const rtCtx = document.getElementById('responseTimeChart');
    if (rtCtx) {
        new Chart(rtCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Avg Response Time (ms)',
                    data: data.avg_response_times,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'MMM D, h:mm A',
                            displayFormats: {
                                minute: 'h:mm A',
                                hour: 'hA',
                                day: 'MMM D'
                            }
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Time'
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Response Time (ms)'
                        }
                    }]
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }

    // Health Percentage Chart
    const healthCtx = document.getElementById('healthChart');
    if (healthCtx) {
        new Chart(healthCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Health Percentage',
                    data: data.health_percentages,
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'MMM D, h:mm A',
                            displayFormats: {
                                minute: 'h:mm A',
                                hour: 'hA',
                                day: 'MMM D'
                            }
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Time'
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            max: 100,
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Health (%)'
                        }
                    }]
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }
}

```

**2. Database Layer**