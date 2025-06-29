# Khelo Tech Project Management System

A comprehensive project management system designed specifically for Khelo Tech's sports department. This full-stack application provides an intuitive interface for managing sports-related projects with modern web technologies.

## 🏗️ Architecture

- **Frontend**: React 19 + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Containerization**: Docker + Docker Compose
- **Testing**: Jest for both frontend and backend
- **API Documentation**: OpenAPI/Swagger specification

## ✨ Features

### ✅ Currently Implemented
- **Project Listing**: View all projects in a clean, organized list
- **Project Details**: Comprehensive project information display including:
  - Project name, description, and scope
  - Start and end dates
  - Objectives and deliverables
  - Project ID and metadata
- **Modern UI**: Material-UI based responsive interface
- **RESTful API**: Complete CRUD operations (GET, POST, PUT, DELETE)
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Smooth loading indicators
- **Navigation**: Intuitive routing between pages
- **Testing**: Comprehensive test coverage for both frontend and backend

### 🚧 Planned Features
- **Project Creation**: Add new projects through a user-friendly form
- **Project Editing**: Modify existing project details
- **Project Deletion**: Remove projects with confirmation
- **User Authentication**: Secure login and user management
- **Database Integration**: PostgreSQL for persistent data storage
- **Project Status Management**: Track project progress (Planning, Active, On Hold, Completed, Cancelled)
- **User Management**: Role-based access control
- **Search & Filtering**: Find projects quickly
- **File Attachments**: Upload and manage project documents
- **Project Comments**: Team collaboration features
- **Email Notifications**: Automated project updates
- **Reporting**: Project analytics and insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Project_Management_System
   ```

2. **Start the Backend Server**
   ```bash
   cd project-management-system/server
   npm install
   npm run dev
   ```
   Server will run on http://localhost:3001

3. **Start the Frontend Client**
   ```bash
   cd project-management-system/client
   npm install
   npm start
   ```
   Client will run on http://localhost:3000

4. **Set Environment Variables**
   Create `.env` file in the client directory:
   ```
   REACT_APP_API_BASE_URL=http://localhost:3001/api
   ```

### Docker Deployment

```bash
cd project-management-system
docker-compose up --build
```

## 📁 Project Structure

```
project-management-system/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main application component
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   └── index.ts       # Server entry point
│   ├── Dockerfile         # Container configuration
│   └── package.json
├── docker-compose.yml     # Multi-container setup
└── README.md
```

## 🧪 Testing

### Backend Tests
```bash
cd project-management-system/server
npm test
```

### Frontend Tests
```bash
cd project-management-system/client
npm test
```

## 📚 API Documentation

The API is documented using OpenAPI/Swagger specification. Available endpoints:

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## 🔧 Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests with coverage

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Team

- **Author**: Jules V2
- **Organization**: Khelo Tech
- **Contact**: support@khelotech.com

## 🆘 Support

For support and questions, please contact:
- Email: support@khelotech.com
- Project Issues: [GitHub Issues](link-to-issues)

---

**Built with ❤️ for Khelo Tech's Sports Department**
