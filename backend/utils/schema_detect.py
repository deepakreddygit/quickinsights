import pandas as pd
import numpy as np
import re

def _coerce_numeric(s: pd.Series) -> pd.Series:
    if s.dtype == 'object':
        # remove commas, currency, percent signs, spaces
        cleaned = s.astype(str).str.replace(r'[,\s%$€£₹]', '', regex=True)
        return pd.to_numeric(cleaned, errors='coerce')
    return s

def _maybe_datetime(s: pd.Series) -> pd.Series:
    if s.dtype == 'object':
        try:
            parsed = pd.to_datetime(s, errors='raise', infer_datetime_format=True)
            # Only accept if enough values parsed
            ok_ratio = parsed.notna().mean()
            if ok_ratio >= 0.7:
                return parsed
        except Exception:
            pass
    return s

def profile_dataframe(df: pd.DataFrame) -> dict:
    df = df.copy()

    # Try datetime first (to avoid numeric parsing of yyyymm strings, we check both)
    for c in df.columns:
        df[c] = _maybe_datetime(df[c])

    # Then try to coerce numeric on the rest
    for c in df.columns:
        if not pd.api.types.is_datetime64_any_dtype(df[c]):
            df[c] = _coerce_numeric(df[c])

    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    dt_cols  = df.select_dtypes(include=['datetime']).columns.tolist()
    cat_cols = [c for c in df.columns if c not in num_cols + dt_cols]

    profile = {
        "shape": [int(df.shape[0]), int(df.shape[1])],
        "columns": list(df.columns),
        "numeric": num_cols,
        "datetime": dt_cols,
        "categorical": cat_cols,
        "null_pct": {c: float(df[c].isna().mean() * 100.0) for c in df.columns},
    }
    return profile
