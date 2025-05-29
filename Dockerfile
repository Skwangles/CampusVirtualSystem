# Stage 1: Build Stage for Backend and Frontend

# Use official Node.js image as a base for both backend and frontend build
FROM node:23-alpine3.20 AS build

# Set working directory for the whole project
WORKDIR /app

COPY ./package*.json ./
COPY ./ui/package*.json ./ui/
COPY ./authoring/package*.json ./authoring/

WORKDIR /app
RUN npm ci

WORKDIR /app/ui
RUN npm ci

WORKDIR /app/authoring
RUN npm ci

# Copy the rest of the files
WORKDIR /app
COPY ./ ./

# Build using the backend's recursive build
WORKDIR /app
RUN npm install
RUN npm run build

# Stage 2: Production Stage (Final Image)

# Use official Node.js image for running the backend
FROM node:23-alpine3.20 AS production

# Set the working directory for the final image
WORKDIR /app

# Install production dependencies for the backend
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev

# Copy the backend build files from the previous stage
COPY --from=build /app/build ./build

# Copy the frontend build from the previous stage (React app build output)
COPY --from=build /app/authoring/dist ./authoring/dist
COPY --from=build /app/ui/dist ./ui/dist

# Expose backend API port (adjust if necessary)
EXPOSE 3001

# Start the backend server (adjust entry point if needed)
CMD ["node", "build/main.js"]
