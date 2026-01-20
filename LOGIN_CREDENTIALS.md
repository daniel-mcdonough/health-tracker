# Health Tracker Authentication Setup

## Configuration Required

The application uses environment-based authentication for security.

### Setup Steps:

1. **Generate password hash:**
   ```bash
   cd server
   npm run generate-password
   ```

2. **Configure environment:**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env and set AUTH_PASSWORD_HASH
   ```

### Environment Variables:

- `AUTH_USERNAME` - Login username (default: "user")
- `AUTH_PASSWORD_HASH` - Bcrypt hash of your password  
- `AUTH_EMAIL` - User email (optional)
- `AUTH_DISPLAY_NAME` - Display name (optional)

### Security Notes:

- Never commit your `.env` file
- Use a strong password for production
- Keep your password hash secure