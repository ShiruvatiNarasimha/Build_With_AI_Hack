
### Frontend
- **Next.js** - React framework for production
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint** - Code linting

### Backend
- **Express.js** - Web application framework
- **Node.js** - JavaScript runtime
- **CORS** - Cross-origin resource sharing
- **Dotenv** - Environment variable management

### Tech Stack Diagram
![alt text](/frontend/public/image.pngimage.png)

## Features

- Responsive landing page with animated hero section
- Navigation to Blogs, Case Studies, Careers, Team, and Pricing
- Dynamic word rotation in hero section (work, convert, scale, trend)
- Health check API endpoint
- Modern UI with Tailwind CSS styling
- TypeScript for type safety

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the backend directory and add necessary environment variables (e.g., PORT).
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:5000` (or as configured).

## Usage

1. Start both backend and frontend servers as described in Installation.
2. Open your browser and navigate to the frontend URL.
3. Explore the landing page features and navigation.

### API Endpoints
- `GET /` - Welcome message
- `GET /api/health` - Health check

## Wireframe Diagram
*[Insert Wireframe Diagram Here]*

## Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.