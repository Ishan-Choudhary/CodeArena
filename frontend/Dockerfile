FROM node:26-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose Vite port
EXPOSE 5173

# Run the dev server
CMD ["npm", "run", "dev"]
