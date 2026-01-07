FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Hugging Face Spaces uses port 7860
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
