# Use specific Node.js version for consistency
FROM node:22.12.0-alpine3.20

# Set the working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Set environment variable defaults
ENV PORT=8000

# Start the application
CMD ["npm", "start"]
