FROM python:3.11-slim

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/tasks/app ./app

USER app
EXPOSE 8105
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8105"]
