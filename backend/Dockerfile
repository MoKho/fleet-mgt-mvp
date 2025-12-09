FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run sets the PORT environment variable.
# We use a shell script to run seed.py then start the server.
CMD sh -c "python seed.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"
