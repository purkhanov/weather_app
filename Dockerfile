FROM python:3.12

WORKDIR /app

COPY . .

RUN python3 -m pip install --upgrade pip

RUN python3 -m pip install -r requirements.txt

CMD ["uvicorn", "src.main:app", "--host=0.0.0.0", "--port=8000"]