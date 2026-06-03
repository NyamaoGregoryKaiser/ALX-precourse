```bash
#!/usr/bin/env bash
# Use this script to wait for a service to be available

set -e

cmd="$@"
host="localhost"
port="5432"
timeout=15

echo "Waiting for service at $host:$port to be available..."

for i in $(seq $timeout); do
  nc -z "$host" "$port" >/dev/null 2>&1 && break
  echo "Service at $host:$port is not available yet, waiting... ($i/$timeout)"
  sleep 1
done

if [ $i -eq $timeout ]; then
  echo "Service at $host:$port did not become available within $timeout seconds. Exiting."
  exit 1
else
  echo "Service at $host:$port is available. Executing command."
fi

exec $cmd
```