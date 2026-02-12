#!/bin/bash
# Free port 8081 (Metro) - run if you get EADDRINUSE
PORT=8081
PID=$(lsof -ti :$PORT)
if [ -n "$PID" ]; then
  echo "Killing process $PID on port $PORT..."
  kill $PID
  sleep 2
  echo "Port $PORT should be free. Run: npx react-native start --reset-cache"
else
  echo "Port $PORT is already free."
fi
