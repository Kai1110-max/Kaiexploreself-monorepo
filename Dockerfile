FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build frontend and backend
RUN npx nx build frontend-web
RUN npx nx build backend

# Set environment variables (Can be overridden by the hosting platform)
ENV NODE_ENV=production
ENV BACKEND_PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/apps/backend/main.js"]
