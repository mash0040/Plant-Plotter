# CST8268Project
The goal of this project is to develop PlantPlotter, an intelligent online garden planning tool that optimizes plot layouts for efficient spacing, plowing, and weeding while tracking crop data year over year to improve yields. Students will transform product requirements into a functional prototype, ensuring usability and real-world applicability

# Initial Setting
## Database Setup
1. MySQL Setup
```
- login to your MySQL server
- run the plantPlotterSchema.sql
- run the data_instance.sql
```
2. Check the database connection with garden_plotter Database

## Github Repository Setup
1. Clone the repository
```
https://github.com/cheu0095/CST8268Project.git
```
2. Under the project folder, download the environment
```
npm run install:all
```
3. Start the project
```
npm run dev
```

## Envirnoment Setup
1. Backend
In the folder plantPlotter_backend, create the file .env. Add the following lines:
```
# ── general ───────────────────────────────
PORT=5001
JWT_SECRET=plantplotter_secret_key

# ── MySQL connection ──────────────────────
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root          
DB_NAME=garden_plotter
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```
2. Frontend
In the folder plantPlotter, create the file .env.local. Add the following lines:
```
# 1. Frontend .env.local file (Next.js)
# Create .env.local in your Next.js root directory:

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_APP_NAME=PlantPlotter
NEXT_PUBLIC_APP_VERSION=1.0.0

# Environment
NODE_ENV=development
```
***Please note that frontend is using the port 3000 and backend is using the port 5001***

## Sample User
1. Demo User
```
login: demo@plantplotter.com
password: demo123
```
2. Admin User
```
login: admin@plantplotter.com
password: admin123
```
3. Default User
```
login: user@plantplotter.com
password: user123
```
