# EventCollect

A comprehensive appointment scheduling and lead management system integrating with LEAP CRM.

## Architecture Overview

EventCollect is a full-stack application designed to handle appointment scheduling, lead management, and CRM integration for field service businesses.

### Tech Stack

- **Frontend**: Vue.js 3 + Quasar Framework (TypeScript)
- **Backend**: Node.js + Express.js (TypeScript)
- **Database**: MongoDB with Mongoose ODM
- **CRM Integration**: LEAP CRM API
- **Deployment**: Railway (Backend) + MongoDB Atlas (Database)

### Project Structure

```
EventCollect/
├── client/          # Frontend (Quasar/Vue.js)
├── server/          # Backend API (Node.js/Express)
├── shared/          # Shared types and utilities
├── *.md            # Documentation files
└── package.json    # Root workspace configuration
```

## Features

### 🗓️ Appointment Management
- Intelligent scheduling with availability checking
- LEAP CRM integration for appointment data
- Local MongoDB storage for performance
- Conflict detection and resolution

### 📋 Lead Management
- Lead capture and processing
- CRM synchronization
- Status tracking and updates
- Custom field handling

### 👥 Staff Management
- Sales rep and call center rep management
- Calendar integration
- Availability management
- Performance tracking

### 🔄 CRM Integration
- Real-time LEAP CRM synchronization
- Bi-directional data flow
- Error handling and retry logic
- Data validation and cleaning

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- LEAP CRM API credentials

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd EventCollect
   yarn install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp server/.env.example server/.env
   
   # Edit with your configuration
   nano server/.env
   ```

3. **Database Setup**
   - Follow `MONGODB_ATLAS_SETUP.md` for MongoDB Atlas configuration
   - Run database initialization:
     ```bash
     cd server
     npm run setup-prod
     ```

4. **Development**
   ```bash
   # Terminal 1: Start backend
   cd server
   npm run dev
   
   # Terminal 2: Start frontend
   cd client
   npm run dev
   ```

## Environment Variables

### Server Configuration
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventcollect

# LEAP CRM
LEAP_BASE_URL=https://api.leapcrm.com
LEAP_API_KEY=your_leap_api_key
LEAP_COMPANY_ID=your_company_id

# Server
PORT=3000
NODE_ENV=development
```

## API Documentation

### Appointment Endpoints
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Lead Endpoints
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get lead details
- `PUT /api/leads/:id` - Update lead

### CRM Sync Endpoints
- `POST /api/leap-sync/sync` - Manual sync with LEAP
- `GET /api/leap-sync/status` - Sync status
- `GET /api/leap-sync/data/:type` - Get LEAP data

## Deployment

### Railway Deployment
Follow the comprehensive guide in `RAILWAY_DEPLOYMENT.md` for step-by-step deployment instructions.

### MongoDB Atlas Setup
See `MONGODB_ATLAS_SETUP.md` for database configuration.

### Pre-Deployment Checklist
Use `DEPLOYMENT_CHECKLIST.md` to ensure all requirements are met.

## Development

### Code Structure

#### Client (`/client`)
- **Components**: Reusable Vue components
- **Pages**: Route-based page components
- **Services**: API communication layer
- **Stores**: Pinia state management
- **Composables**: Reusable composition functions

#### Server (`/server`)
- **Routes**: Express route handlers
- **Services**: Business logic layer
- **Models**: MongoDB schemas
- **Middleware**: Request/response processing
- **Utils**: Helper functions

#### Shared (`/shared`)
- **Types**: TypeScript type definitions
- **Constants**: Application constants
- **Utilities**: Shared helper functions

### Database Schema

#### Appointments Collection
```javascript
{
  _id: ObjectId,
  leapJobId: String,
  customerId: ObjectId,
  serviceId: ObjectId,
  scheduledDateTime: Date,
  duration: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Leads Collection
```javascript
{
  _id: ObjectId,
  leapCustomerId: String,
  name: String,
  phone: String,
  email: String,
  address: Object,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Security

### Environment Variables
- All sensitive data stored in environment variables
- `.env` files excluded from version control
- `.env.example` provides template for required variables

### API Security
- Input validation on all endpoints
- Error handling without data exposure
- Rate limiting on API endpoints
- CORS configuration for frontend access

## Monitoring and Logging

### Application Logs
- Winston logger for structured logging
- Error tracking and reporting
- Performance monitoring

### Database Monitoring
- MongoDB Atlas built-in monitoring
- Query performance tracking
- Index optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check existing documentation
2. Review deployment guides
3. Check application logs
4. Contact development team

## License

This project is proprietary software developed for internal use.

---

**Note**: This application requires MongoDB Atlas for production deployment as Railway does not provide managed MongoDB services.
