-- Example ws_test.lua for wrk
-- This is a very basic example; real-world scripts would handle authentication, subscriptions, etc.
local ws = require("ws")

request = function()
   return wrk.format("GET", "/ws", {
      ["Upgrade"] = "websocket",
      ["Connection"] = "Upgrade",
      ["Sec-WebSocket-Key"] = "dGhlIHNhbXBsZSBub25jZQ==",
      ["Sec-WebSocket-Version"] = "13"
   })
end

response = function(status, headers, body)
   if status == 101 then
      -- WebSocket handshake successful
      ws.send(wrk.connect(headers))
   end
end