# HTTP URL Shortener Microservice

A robust HTTP URL Shortener Microservice built for Affordmed that provides core URL shortening functionality along with basic analytical capabilities for shortened links.

## Features

- ✅ **Mandatory Logging Integration** - Custom logging middleware for all operations
- ✅ **Microservice Architecture** - Single microservice handling all API endpoints
- ✅ **Authentication** - Pre-authorized users (no registration/login required)
- ✅ **Short Link Uniqueness** - Globally unique shortcodes
- ✅ **Default Validity** - 30-minute default expiry with customizable duration
- ✅ **Custom Shortcodes** - Optional custom shortcodes with validation
- ✅ **Redirection** - Automatic redirection to original URLs
- ✅ **Error Handling** - Robust error handling with appropriate HTTP status codes
- ✅ **Analytics** - Detailed click statistics with geographical data
- ✅ **Security** - Rate limiting, CORS, and security headers

## API Endpoints

### 1. Create Short URL
**POST** `/shorturls`

Creates a new shortened URL.

**Request Body:**
```json
{
  "url": "https://very-very-very-long-and-descriptive-subdomain-that-goes-on-and-on.somedomain.com/additional/directory/levels/for/more/length/really-log-sub-domain/a-really-log-page",
  "validity": 30,
  "shortcode": "abcd1"
}
```

**Parameters:**
- `url` (string, required): The original long URL to be shortened
- `validity` (integer, optional): Duration in minutes (defaults to 30)
- `shortcode` (string, optional): Custom shortcode (3-20 alphanumeric characters)

**Response (201):**
```json
{
  "shortLink": "http://localhost:3000/abcd1",
  "expiry": "2025-01-01T00:30:00Z"
}
```

### 2. Retrieve Short URL Statistics
**GET** `/shorturls/:shortcode`

Retrieves usage statistics for a specific shortened URL.

**Response (200):**
```json
{
  "shortcode": "abcd1",
  "originalUrl": "https://example.com/very-long-url",
  "shortLink": "http://localhost:3000/abcd1",
  "createdAt": "2025-01-01T00:00:00Z",
  "expiry": "2025-01-01T00:30:00Z",
  "isActive": true,
  "totalClicks": 5,
  "clicks": [
    {
      "timestamp": "2025-01-01T00:05:00Z",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "browser": "Chrome",
      "os": "Windows",
      "device": "desktop",
      "referer": "https://google.com",
      "location": {
        "country": "US",
        "region": "CA",
        "city": "San Francisco"
      }
    }
  ]
}
```

### 3. Redirect to Original URL
**GET** `/:shortcode`

Redirects users to the original long URL and records click statistics.

**Response:** HTTP 302 redirect to the original URL

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd url-shortener-microservice
npm install
```

### 2. Environment Configuration
Create a `.env` file (optional):
```env
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## Usage Examples

### Using cURL

**Create a short URL:**
```bash
curl -X POST http://localhost:3000/shorturls \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.google.com/search?q=very+long+search+query+with+many+parameters",
    "validity": 60,
    "shortcode": "mycustom"
  }'
```

**Get statistics:**
```bash
curl http://localhost:3000/shorturls/mycustom
```

**Access short URL (redirects):**
```bash
curl -L http://localhost:3000/mycustom
```

### Using JavaScript/Fetch

```javascript
// Create short URL
const response = await fetch('http://localhost:3000/shorturls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/very-long-url',
    validity: 30,
    shortcode: 'custom123'
  })
});

const result = await response.json();
console.log(result.shortLink); // http://localhost:3000/custom123
```

## Logging

The service uses a custom logging middleware that logs all requests and responses to:
- Console (for development)
- Daily log files in the `logs/` directory

Log files are automatically created with the format: `app-YYYY-MM-DD.log`

## Error Handling

The service returns appropriate HTTP status codes:

- `200` - Success
- `201` - Resource created
- `400` - Bad request (invalid input)
- `404` - Resource not found
- `409` - Conflict (shortcode already exists)
- `410` - Gone (URL expired)
- `429` - Too many requests (rate limited)
- `500` - Internal server error

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Comprehensive request validation
- **Trust Proxy**: Accurate IP address detection

## Development

### Running Tests
```bash
npm test
```

### Project Structure
```
├── middleware/
│   └── logging.js          # Custom logging middleware
├── routes/
│   └── urlRoutes.js        # API route handlers
├── services/
│   └── urlService.js       # Business logic
├── utils/
│   └── shortcodeGenerator.js # Utility functions
├── logs/                   # Log files (auto-generated)
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## Production Considerations

For production deployment, consider:

1. **Database**: Replace in-memory storage with a persistent database (MongoDB, PostgreSQL, etc.)
2. **Caching**: Implement Redis for better performance
3. **Load Balancing**: Use multiple instances behind a load balancer
4. **Monitoring**: Add application monitoring and alerting
5. **SSL/TLS**: Use HTTPS in production
6. **Environment Variables**: Configure all environment-specific settings

## License

MIT License

## Support

For support and questions, contact:
- **Company**: Afford Medical Technologies Private Limited
- **Address**: B 230 2nd Main Road, Sainikpuri, Hyderabad-500094, Telangana, INDIA
- **Phone**: 91-40-27117068/27116133
- **Web**: www.affordmed.com
- **Email**: contact@affordmed.com
