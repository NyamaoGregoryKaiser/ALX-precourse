```bash
#!/usr/bin/env bash
# wait-for-it.sh: wait for a host and port to be available

set -e

cmd="$@"
host="localhost"
port=""
timeout=15
strict=0

print_usage() {
  cat << USAGE
Usage:
  wait-for-it.sh host:port [-t timeout] [-- command args]
  wait-for-it.sh host -- [-t timeout] [-- command args]
  wait-for-it.sh -h | --help
  wait-for-it.sh --version
Arguments:
  host                        Host or IP address to wait for.
  port                        Port to wait for.
  command [args]              Optional command to execute after the host:port is available.
Options:
  -h, --help                  Show this help message
  -t SECONDS, --timeout=SECONDS
                              Timeout in seconds, default is 15.
  --strict                    Only execute command if the host:port is available.
  --version                   Show version
USAGE
}

print_version() {
  echo "0.2.8"
}

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      *:*)
        host=$(printf "%s\n" "$1" | cut -d : -f 1)
        port=$(printf "%s\n" "$1" | cut -d : -f 2)
        shift 1
        ;;
      -h | --help)
        print_usage
        exit 0
        ;;
      -t | --timeout)
        timeout="$2"
        if ! [[ "$timeout" =~ ^[0-9]+$ ]]; then
          echo "Error: Timeout must be a number."
          exit 1
        fi
        shift 2
        ;;
      --timeout=*)
        timeout="${1#*=}"
        if ! [[ "$timeout" =~ ^[0-9]+$ ]]; then
          echo "Error: Timeout must be a number."
          exit 1
        fi
        shift 1
        ;;
      --strict)
        strict=1
        shift 1
        ;;
      --version)
        print_version
        exit 0
        ;;
      --)
        shift 1
        cmd="$@"
        break
        ;;
      -*)
        echo "Unknown option: $1"
        print_usage
        exit 1
        ;;
      *)
        host="$1"
        shift 1
        ;;
    esac
  done
}

parse_arguments "$@"

if [ -z "$host" ]; then
  echo "Error: Host is required."
  print_usage
  exit 1
fi

if [ -z "$port" ]; then
  echo "Error: Port is required."
  print_usage
  exit 1
fi

echo "Waiting for $host:$port to be available..."

start_ts=$(date +%s)
while :; do
  if [ -s "$host" ]; then
    (echo > /dev/tcp/"$host"/"$port") >/dev/null 2>&1
    result=$?
  else
    nc -z "$host" "$port" >/dev/null 2>&1
    result=$?
  fi

  if [ $result -eq 0 ]; then
    echo "$host:$port is available after $(( $(date +%s) - start_ts )) seconds."
    break
  fi

  current_ts=$(date +%s)
  if [ $(( current_ts - start_ts )) -ge "$timeout" ]; then
    echo "Timeout occurred after $timeout seconds waiting for $host:$port."
    if [ $strict -eq 1 ]; then
      exit 1
    else
      echo "Continuing anyway."
      exit 0 # Allow pipeline to continue, useful for optional services
    fi
  fi

  sleep 1
done

if [ -n "$cmd" ]; then
  exec $cmd
fi
```