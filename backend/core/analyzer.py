import pandas as pd

def summarize(df: pd.DataFrame) -> str:
    rows, cols = df.shape
    parts = [f"Dataset has {rows:,} rows × {cols} columns."]

    num_cols = df.select_dtypes(include='number').columns.tolist()
    dt_cols  = df.select_dtypes(include='datetime').columns.tolist()
    cat_cols = [c for c in df.columns if c not in num_cols + dt_cols]
    parts.append(f"Numeric: {len(num_cols)}; Categorical: {len(cat_cols)}; Datetime: {len(dt_cols)}.")

    for c in num_cols[:3]:
        s = df[c].dropna()
        parts.append(f"• {c}: mean={s.mean():.2f}, std={s.std():.2f}, min={s.min():.2f}, max={s.max():.2f}")

    return "\n".join(parts)
