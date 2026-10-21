# Credit Card Risk Prediction

A small web application for estimating the likelihood that a loan applicant will
default. It pairs a browser-based application form with a FastAPI service that
loads a pre-trained scikit-learn/XGBoost model and returns a class prediction
and class probabilities.

> **Scope:** Despite the folder name, this project models loan repayment risk.
> It is not a credit-card transaction fraud detector, and it should not be used
> as the sole basis for a real lending decision.

## Features

- Applicant and loan application form with basic browser-side input validation.
- Automatic calculation of loan amount as a share of annual income (editable).
- Risk gauge, repayment likelihood, and model verdict in the frontend.
- Light/dark theme toggle and an example application.
- FastAPI prediction endpoint backed by a serialized model pipeline.
- Jupyter notebook for data exploration, preprocessing, model evaluation, and
  model export.

## Project layout

```text
.
├── README.md
├── backend/
│   ├── credit card risk.ipynb    # Data exploration and model training
│   ├── credit_risk_dataset.csv   # Loan applicant training data
│   ├── credit_risk_model.pkl     # Serialized prediction pipeline
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # API and notebook Python dependencies
│   ├── requirments.txt          # Legacy misspelled dependency file
│   └── templates/
│       └── index.html           # Separate page served at the API root
└── frontend/
    ├── index.html               # Main prediction interface
    ├── script.js                # Form behavior and API request
    └── styles.css               # UI styles
```

The primary user interface is `frontend/index.html`. The backend also serves a
separate template from `backend/templates/index.html` at `GET /`; it is not the
same page as the prediction interface.

## Requirements

- Python 3.10 or newer.
- A browser with JavaScript enabled.
- Python packages for the API, serialized model, and notebook, listed in
  `backend/requirements.txt`.

The model was serialized with Joblib. Loading it may require compatible
scikit-learn, XGBoost, and related package versions to those used when it was
created; the repository does not pin those versions.

## Run locally on Windows

### 1. Install backend dependencies

Open PowerShell in the project directory and create/activate a virtual
environment:

```powershell
cd "E:\credit card\backend"
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, you can run the virtual environment's Python
directly instead, for example:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 2. Configure the frontend origin

The API's CORS configuration reads `FRONTEND_URL` from the environment (or a
`.env` file in the backend working directory). Set it to the exact origin from
which you will serve the frontend. For the example below, create
`backend/.env` containing:

```dotenv
FRONTEND_URL=http://localhost:5500
```

Do not include a path or trailing slash in the origin. If you use a different
host or port for the frontend, update this value to match.

### 3. Start the API

Keep the working directory set to `backend`. This matters because the
application loads both `credit_risk_model.pkl` and the `templates` directory
using paths relative to the current working directory.

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at `http://127.0.0.1:8000`. Interactive API
documentation is available at `http://127.0.0.1:8000/docs`.

### 4. Serve the frontend

In a second PowerShell window, go to the project directory and serve the
frontend on the origin configured above:

```powershell
cd "E:\credit card"
py -3 -m http.server 5500 --directory frontend
```

Open `http://localhost:5500` in a browser. The frontend sends requests to
`http://127.0.0.1:8000/predict`, as configured near the top of
`frontend/script.js`. If the API runs elsewhere, update `API_URL` there and
ensure `FRONTEND_URL` matches the page's origin. The page loads Material Web
components, fonts, and icons from external CDNs, so those assets require an
internet connection.

## Prediction API

### `POST /predict`

Send a JSON object with applicant and loan details:

```json
{
  "person_age": 28,
  "person_income": 55000,
  "person_home_ownership": "RENT",
  "person_emp_length": 4,
  "loan_intent": "PERSONAL",
  "loan_grade": "B",
  "loan_amnt": 10000,
  "loan_int_rate": 11.5,
  "loan_percent_income": 0.18,
  "cb_person_default_on_file": "N"
}
```

The request fields currently declared by the API are:

| Field | Type | Example / accepted values |
| --- | --- | --- |
| `person_age` | integer | `28` |
| `person_income` | number | `55000` |
| `person_home_ownership` | string | `RENT`, `MORTGAGE`, `OWN`, `OTHER` |
| `person_emp_length` | number | `4` (years) |
| `loan_intent` | string | `EDUCATION`, `MEDICAL`, `VENTURE`, `PERSONAL`, `HOMEIMPROVEMENT`, `DEBTCONSOLIDATION` |
| `loan_grade` | string | `A` through `G` |
| `loan_amnt` | number | `10000` |
| `loan_int_rate` | number | `11.5` (percent) |
| `loan_percent_income` | number | `0.18` (ratio, not percent points) |
| `cb_person_default_on_file` | string | `Y` or `N` |

The frontend displays `prediction` as class `0` (lower predicted risk) or class
`1` (higher predicted risk). The returned `probability` array follows the
model's class order; in the current frontend, index `0` is displayed as
repayment likelihood and index `1` as default risk. A successful response has
this shape:

```json
{
  "prediction": 0,
  "probability": [0.92, 0.08]
}
```

The numbers above are an illustrative example, not a performance guarantee.
The API currently returns prediction exceptions as an `error` field in a JSON
response rather than using an HTTP error status.

## Important model/API limitation

The training notebook builds features from all dataset columns other than
`loan_status`. This includes `cb_person_cred_hist_length` (credit history
length). The current API request model and frontend do not collect or send that
feature. As a result, the saved pipeline may reject prediction requests for
missing input data. This mismatch should be resolved before relying on the
application's predictions: either collect and pass the feature at inference
time or retrain/export a model that does not require it.

The notebook also fits its sigmoid-calibrated model using `X_test` and `y_test`.
That uses the held-out test set during calibration, so the test set is not an
independent final evaluation of the calibrated model.

## Model and data

The notebook `backend/credit card risk.ipynb` explores the loan dataset and
develops the model. The supplied CSV contains 32,581 rows and 12 columns,
including the `loan_status` target. The notebook's preprocessing includes
median imputation for numeric values and constant imputation plus one-hot
encoding for categorical values. The exported artifact is a sigmoid-calibrated
XGBoost pipeline saved as `backend/credit_risk_model.pkl`.

To open the notebook, install Jupyter and the analysis libraries used in its
cells (including NumPy, pandas, Matplotlib, Seaborn, scikit-learn, XGBoost, and
SHAP), then launch Jupyter from the `backend` directory. Re-running notebook
cells will retrain the model; the final save cell writes
`credit_risk_model.pkl` in the current directory.

## Troubleshooting

- **Model file not found:** Start Uvicorn with `backend` as the working
  directory; the model path is relative.
- **Template not found at `/`:** Start Uvicorn from `backend`, where the
  `templates` directory is located.
- **CORS error in the browser:** Set `FRONTEND_URL` to the exact frontend
  origin, then restart the API.
- **Could not reach the API:** Confirm Uvicorn is running at the URL configured
  in `frontend/script.js`.
- **Missing module while starting the API:** Install the missing runtime or
  model dependency in the active virtual environment. The supplied dependency
  file does not list all dependencies required by the current app.
- **Prediction error about missing columns/features:** See the model/API
  feature mismatch above, especially `cb_person_cred_hist_length`.

## Responsible use

This is an educational/demo project, not a validated lending or compliance
system. Model scores can be inaccurate or reflect biases in the training data.
Assess data quality, fairness, privacy, security, and applicable legal
requirements before any real-world use. The project files do not establish
regulatory certification or production readiness.