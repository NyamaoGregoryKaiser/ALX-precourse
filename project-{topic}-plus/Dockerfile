FROM g++:latest

WORKDIR /app

COPY src/* .
COPY database/* .

RUN g++ src/main.cpp src/task_manager.cpp -o task_manager -lsqlite3

EXPOSE 8080  // Placeholder port - Adjust based on your application

CMD ["./task_manager"]