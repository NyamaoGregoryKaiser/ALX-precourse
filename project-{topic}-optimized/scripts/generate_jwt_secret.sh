```bash
#!/bin/bash
# Generates a random base64 string suitable for a JWT secret key

echo "Generating a strong JWT secret (32 bytes base64 encoded):"
openssl rand -base64 32
echo ""
echo "Please copy this key and set it as JWT_SECRET in your .env file."
echo "For production, ensure it is set as an environment variable."
```