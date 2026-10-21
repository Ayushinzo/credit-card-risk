from fastapi import FastAPI, Request
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import joblib
import pandas as pd
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from flask import render_template
from fastapi.templating import Jinja2Templates

# Load environment variables from .env file
load_dotenv()

ml_model = {}

class ValidateData(BaseModel):
    person_age: int
    person_income: float | int
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float | int
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model['model'] = joblib.load('credit_risk_model.pkl')
    yield
    ml_model.clear()

app = FastAPI(lifespan=lifespan)
templates = Jinja2Templates(directory="templates")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )

@app.post('/predict')
def predict(data: ValidateData):
    try:
        input_df = pd.DataFrame([data.dict()])
        probability = ml_model['model'].predict_proba(input_df).tolist()
        prediction = ml_model['model'].predict(input_df).tolist()
        return {
                "prediction": prediction[0],
                "probability": probability[0]
            }
    
    except Exception as e:
        return {"error": str(e)}