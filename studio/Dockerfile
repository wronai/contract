FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY contract_validator.py .
COPY prompts/ prompts/

# Create directories
RUN mkdir -p projects examples

EXPOSE 7860 8080

CMD ["python", "app.py"]
