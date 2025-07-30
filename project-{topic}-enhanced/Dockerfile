```dockerfile
FROM ubuntu:latest

# Install dependencies (replace with your actual dependencies)
RUN apt-get update && apt-get install -y build-essential cmake g++

WORKDIR /app

COPY CMakeLists.txt .
COPY main.cpp .

RUN cmake .
RUN make

CMD ["./cms"]
```