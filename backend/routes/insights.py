# from __future__ import annotations

# from typing import Dict, List, Optional, Tuple
# from typing import Iterable

# import math
# import re
# import numpy as np
# import pandas as pd
# from flask import Blueprint, current_app, jsonify, request

# insights_bp = Blueprint("insights", __name__)

# # -------------------------------------------------------------------
# # Storage helpers
# # -------------------------------------------------------------------

# def _get_doc(workspace_id: str) -> Optional[dict]:
#     return current_app.db.workspaces.find_one({"file_id": workspace_id})


# def _load_df(workspace_id: str) -> Tuple[Optional[pd.DataFrame], Optional[Tuple[str, int]]]:
#     doc = _get_doc(workspace_id)
#     if not doc:
#         return None, ("workspace not found", 404)
#     try:
#         df = pd.read_csv(doc["path"], low_memory=False)
#         return df, None
#     except Exception as e:
#         return None, (f"failed to read CSV: {e}", 500)

# # -------------------------------------------------------------------
# # Type inference / coercion
# # -------------------------------------------------------------------

# _NUM_RX = re.compile(r"""
#     ^\s*
#     (?P<sign>[-+])?
#     (?:
#         # Parentheses for accounting negatives: (1,234.56)
#         \((?P<p1>[^)]+)\) |
#         (?P<n1>
#           (?:[0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)
#           (?:\.[0-9]+)?
#           (?:[eE][-+]?[0-9]+)?
#         )
#     )
#     \s*%?\s*$
# """, re.X)

# def _parse_numeric_like(x: object) -> Optional[float]:
#     """Parse strings like '1,234', '$12.3', '(1,234)', '45%', '1.2e3' to floats; return None on failure."""
#     if x is None or (isinstance(x, float) and math.isnan(x)):
#         return None
#     if isinstance(x, (int, float, np.integer, np.floating)):
#         return float(x)
#     s = str(x).strip()
#     if s == "":
#         return None
#     s = s.replace("$", "").replace("£", "").replace("€", "")
#     m = _NUM_RX.match(s)
#     if not m:
#         # Try percent like "45%"
#         if s.endswith("%"):
#             try:
#                 return float(s[:-1].replace(",", "")) / 100.0
#             except Exception:
#                 return None
#         return None
#     if m.group("p1"):
#         # (1234.5) -> -1234.5 (and may include commas)
#         try:
#             val = float(m.group("p1").replace(",", ""))
#             return -val
#         except Exception:
#             return None
#     try:
#         return float(m.group("n1").replace(",", ""))
#     except Exception:
#         return None

# def _coerce_numeric_strings(df: pd.DataFrame) -> pd.DataFrame:
#     """Coerce object columns that are mostly numeric-like strings into real numbers."""
#     out = df.copy()
#     for c in out.columns:
#         if out[c].dtype == "object":
#             parsed = out[c].map(_parse_numeric_like)
#             # adopt if we got a decent success ratio
#             mask = pd.notna(parsed)
#             if mask.mean() > 0.6:
#                 out[c] = parsed.astype(float)
#     return out

# def _coerce_datetimes(df: pd.DataFrame) -> pd.DataFrame:
#     """Convert year-like numerics to dates and parse object→datetime when success ratio >60%."""
#     out = df.copy()
#     for c in out.columns:
#         s = out[c]
#         # numeric year -> date
#         if pd.api.types.is_integer_dtype(s) or pd.api.types.is_float_dtype(s):
#             years = pd.to_numeric(s, errors="coerce").astype("Int64")
#             if years.notna().any():
#                 plausible = years.between(1000, 2999)
#                 if plausible.mean() > 0.8:
#                     try:
#                         out[c] = pd.to_datetime(years.astype(str) + "-01-01", errors="coerce")
#                         continue
#                     except Exception:
#                         pass
#         # object -> datetime
#         if out[c].dtype == "object":
#             parsed = pd.to_datetime(out[c], errors="coerce", utc=False)
#             if parsed.notna().mean() > 0.6:
#                 out[c] = parsed
#     return out

# def _datetime_columns(df: pd.DataFrame) -> List[str]:
#     return df.select_dtypes(include=[np.datetime64, "datetime", "datetimetz"]).columns.tolist()

# def _numeric_columns(df: pd.DataFrame) -> List[str]:
#     return df.select_dtypes(include="number").columns.tolist()

# def _meta(df: pd.DataFrame) -> Dict[str, List[str]]:
#     df1 = _coerce_numeric_strings(df)
#     df2 = _coerce_datetimes(df1)
#     numeric = _numeric_columns(df2)
#     dt_cols = _datetime_columns(df2)
#     categorical = [c for c in df2.columns if c not in set(numeric) | set(dt_cols)]
#     return {"numeric": numeric, "datetime": dt_cols, "categorical": categorical}

# def _map_freq(freq: str) -> str:
#     f = (freq or "M").lower()
#     if f in ("d", "day", "daily"): return "D"
#     if f in ("w", "week", "weekly"): return "W"
#     if f in ("q", "quarter", "quarterly"): return "Q"
#     if f in ("y", "year", "yearly", "a", "annual", "annually"): return "Y"
#     return "M"

# # -------------------------------------------------------------------
# # Profile & Summary
# # -------------------------------------------------------------------

# @insights_bp.get("/profile")
# def profile_get():
#     wid = request.args.get("workspace_id", "")
#     if not wid:
#         return jsonify(error="workspace_id required"), 400
#     df, err = _load_df(wid)
#     if err:
#         return jsonify(error=err[0]), err[1]

#     meta = _meta(df)
#     null_pct_pairs = []
#     for c in df.columns[:6]:
#         pct = float(pd.isna(df[c]).mean() * 100.0)
#         null_pct_pairs.append((c, round(pct, 1)))

#     return jsonify(
#         rows=int(df.shape[0]),
#         cols=int(df.shape[1]),
#         **meta,
#         null_pct=dict(null_pct_pairs),
#     )

# @insights_bp.post("/summary")
# def summary():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id", "")
#     if not wid:
#         return jsonify(error="workspace_id required"), 400
#     df, err = _load_df(wid)
#     if err:
#         return jsonify(error=err[0]), err[1]

#     meta = _meta(df)
#     rows, cols = df.shape
#     parts = [
#         f"Dataset has {rows:,} rows × {cols} columns.",
#         f"Numeric: {len(meta['numeric'])}; Categorical: {len(meta['categorical'])}; Datetime: {len(meta['datetime'])}.",
#     ]
#     for c in meta["numeric"][:3]:
#         s = pd.to_numeric(df[c], errors="coerce").dropna()
#         if not s.empty:
#             parts.append(f"• {c}: mean={s.mean():.2f}, std={s.std():.2f}, min={s.min():.2f}, max={s.max():.2f}")
#     return jsonify(summary="\n".join(parts), **meta)

# @insights_bp.post("/meta")
# def meta():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id", "")
#     if not wid:
#         return jsonify(error="workspace_id required"), 400
#     df, err = _load_df(wid)
#     if err:
#         return jsonify(error=err[0]), err[1]
#     return jsonify(**_meta(df))

# # -------------------------------------------------------------------
# # Aggregate (bar) and Timeseries (line)
# # -------------------------------------------------------------------

# @insights_bp.post("/aggregate")
# def aggregate():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id"); x = p.get("x"); y = p.get("y")
#     op = (p.get("op") or "sum").lower(); op = "avg" if op == "mean" else op
#     limit = int(p.get("limit", 12))
#     if not wid or not x:
#         return jsonify(error="workspace_id and x required"), 400

#     df, err = _load_df(wid)
#     if err: return jsonify(error=err[0]), err[1]
#     df = _coerce_numeric_strings(df)

#     if x not in df.columns: return jsonify(error=f"x '{x}' not found"), 400
#     if op == "count" or not y:
#         g = df.groupby(x, dropna=False).size().rename("value")
#     else:
#         if y not in df.columns: return jsonify(error=f"y '{y}' not found"), 400
#         if op == "sum":
#             g = pd.to_numeric(df[y], errors="coerce").groupby(df[x], dropna=False).sum().rename("value")
#         elif op == "avg":
#             g = pd.to_numeric(df[y], errors="coerce").groupby(df[x], dropna=False).mean().rename("value")
#         else:
#             return jsonify(error="op must be sum|avg|count"), 400

#     out = g.reset_index().sort_values("value", ascending=False).head(max(1, limit))
#     out[x] = out[x].astype(str).fillna("NA")
#     data = [{x: str(r[x]), "value": float(r["value"])} for _, r in out.iterrows()]
#     return jsonify(data=data, x=x)

# @insights_bp.post("/timeseries")
# def timeseries():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id"); dcol = p.get("date_col"); y = p.get("y")
#     op = (p.get("op") or "sum").lower(); op = "avg" if op == "mean" else op
#     freq = _map_freq(p.get("freq", "M"))
#     if not wid or not dcol: return jsonify(error="workspace_id and date_col required"), 400

#     df, err = _load_df(wid)
#     if err: return jsonify(error=err[0]), err[1]
#     df = _coerce_datetimes(_coerce_numeric_strings(df))
#     if dcol not in df.columns: return jsonify(error=f"date_col '{dcol}' not found"), 400
#     if not np.issubdtype(df[dcol].dtype, np.datetime64):
#         return jsonify(error="date_col is not parseable as dates"), 400

#     df2 = df.set_index(dcol).sort_index()
#     if op == "count" or not y or y not in df2.columns:
#         agg = df2.resample(freq).size()
#     else:
#         series = pd.to_numeric(df2[y], errors="coerce")
#         agg = series.resample(freq).sum() if op == "sum" else series.resample(freq).mean()
#     out = [{"date": idx.strftime("%Y-%m-%d"), "value": 0.0 if pd.isna(v) else float(v)} for idx, v in agg.items()]
#     return jsonify(data=out)

# # -------------------------------------------------------------------
# # Forecast (optional)
# # -------------------------------------------------------------------

# @insights_bp.post("/forecast")
# def forecast():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id"); dcol = p.get("date_col"); y = p.get("y")
#     periods = int(p.get("periods", 12)); freq = _map_freq(p.get("freq", "M"))
#     if not wid or not dcol or not y: return jsonify(error="workspace_id, date_col, y required"), 400

#     try:
#         from prophet import Prophet  # type: ignore
#     except Exception:
#         return jsonify(error="prophet not available on server"), 501

#     df, err = _load_df(wid)
#     if err: return jsonify(error=err[0]), err[1]
#     df = _coerce_datetimes(_coerce_numeric_strings(df))
#     if dcol not in df.columns: return jsonify(error=f"date_col '{dcol}' not found"), 400
#     if y not in df.columns: return jsonify(error=f"y '{y}' not found"), 400
#     if not np.issubdtype(df[dcol].dtype, np.datetime64):
#         return jsonify(error="date_col not parseable"), 400

#     hist = pd.DataFrame({"ds": df[dcol], "y": pd.to_numeric(df[y], errors="coerce")}).dropna()
#     if hist.empty: return jsonify(error="no numeric data after cleaning"), 400

#     m = Prophet()
#     m.fit(hist)
#     future = m.make_future_dataframe(periods=periods, freq=freq)
#     fc = m.predict(future)

#     past = [{"date": r["ds"].strftime("%Y-%m-%d"), "value": float(r["y"])} for _, r in hist.iterrows()]
#     pred = [{"date": r["ds"].strftime("%Y-%m-%d"), "value": float(r["yhat"])} for _, r in fc.iterrows()]
#     return jsonify(data=past, forecast=pred)

# # -------------------------------------------------------------------
# # Correlation map (robust to numeric-like strings)
# # -------------------------------------------------------------------

# @insights_bp.post("/correlation")
# def corrmap():
#     """
#     JSON: { workspace_id, method?: 'pearson'|'spearman'|'kendall', sample?: int }
#     Heuristics:
#       - start with numeric dtypes
#       - also try coercing 'object' columns to numeric; keep if >=70% rows convert
#       - drop constant columns (nunique <= 1)
#       - optional row sampling for speed (default up to 10k)
#     Returns 200 with {columns, matrix} or 400 with {error}.
#     """
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id")
#     method = (p.get("method") or "pearson").lower()
#     sample_n = int(p.get("sample", 10000))

#     if method not in ("pearson", "spearman", "kendall"):
#         return jsonify(error="method must be pearson|spearman|kendall"), 400
#     if not wid:
#         return jsonify(error="workspace_id required"), 400

#     df, err = _load_df(wid)
#     if err:
#         return jsonify(error=err[0]), err[1]

#     # Optional sampling for big files (keeps determinism by head()).
#     if sample_n and len(df) > sample_n:
#         df = df.head(sample_n)

#     # 1) numeric dtypes out of the box
#     numeric_cols: list[str] = df.select_dtypes(include="number").columns.tolist()

#     # 2) try to coerce objects that are *mostly* numeric
#     obj_cols: Iterable[str] = df.select_dtypes(include=["object"]).columns.tolist()
#     for c in obj_cols:
#         s = pd.to_numeric(df[c].astype(str).str.replace(r"[,$%]", "", regex=True), errors="coerce")
#         ok_ratio = s.notna().mean()
#         if ok_ratio >= 0.70:  # keep if at least 70% look numeric
#             df[c] = s
#             numeric_cols.append(c)

#     # de-dup and preserve order
#     seen = set()
#     numeric_cols = [c for c in numeric_cols if not (c in seen or seen.add(c))]

#     if len(numeric_cols) < 2:
#         return jsonify(error="need at least 2 numeric columns", columns=[], matrix=None), 400

#     num_df = df[numeric_cols].copy()

#     # Drop columns with no variance (constant), which break corr for Kendall/Spearman.
#     nunique = num_df.nunique(dropna=True)
#     keep = [c for c in numeric_cols if nunique.get(c, 0) > 1]
#     if len(keep) < 2:
#         return jsonify(error="after cleaning, fewer than 2 usable numeric columns", columns=[], matrix=None), 400

#     num_df = num_df[keep]

#     # Compute correlation (require at least a few overlapping points)
#     corr = num_df.corr(method=method, min_periods=3)

#     # Convert to plain Python lists, map NaN to None for JSON
#     cols = list(corr.columns)
#     mtx = corr.values.tolist()
#     matrix = [[None if (pd.isna(v) or np.isinf(v)) else float(v) for v in row] for row in mtx]

#     return jsonify(columns=cols, matrix=matrix, method=method)


# # -------------------------------------------------------------------
# # Narrative (lightweight rules-based text)
# # -------------------------------------------------------------------

# @insights_bp.post("/narrative")
# def narrative():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id"); target = p.get("target"); date_col = p.get("date_col"); group_by = p.get("group_by")
#     if not wid: return jsonify(error="workspace_id required"), 400

#     df, err = _load_df(wid)
#     if err: return jsonify(error=err[0]), err[1]
#     df2 = _coerce_datetimes(_coerce_numeric_strings(df))
#     rows, cols = df2.shape
#     miss = float(pd.isna(df2).mean().mean()*100.0)
#     insights = [f"Dataset has {rows:,} rows × {cols} columns; overall missingness ~{miss:.1f}%."]
#     # top categories for a selected grouping
#     if group_by and group_by in df2.columns:
#         vc = df2[group_by].astype(str).value_counts(dropna=True).head(3)
#         parts = ", ".join([f"{k} ({v})" for k, v in vc.items()])
#         insights.append(f"Most common {group_by}: {parts}.")
#     # trend on target if possible
#     if target and target in df2.columns and date_col and date_col in df2.columns and np.issubdtype(df2[date_col].dtype, np.datetime64):
#         ts = pd.to_numeric(df2[target], errors="coerce")
#         gb = ts.groupby(df2[date_col].dt.to_period("M")).mean().dropna()
#         if len(gb) >= 3:
#             change = gb.iloc[-1] - gb.iloc[0]
#             pct = (change / (abs(gb.iloc[0]) + 1e-9)) * 100.0
#             insights.append(f"Average {target} changed by {change:.2f} ({pct:.1f}%) from first to last month.")
#     return jsonify(insights=insights, method="rules", used={"target": target, "date_col": date_col, "group_by": group_by})

# # -------------------------------------------------------------------
# # Anomalies (IsolationForest with z-score fallback)
# # -------------------------------------------------------------------

# @insights_bp.post("/anomalies")
# def anomalies():
#     p = request.get_json(silent=True) or {}
#     wid = p.get("workspace_id")
#     method = (p.get("method") or "iforest").lower()
#     contamination = float(p.get("contamination", 0.01))
#     max_rows = int(p.get("max_rows", 50))
#     if not wid: return jsonify(error="workspace_id required"), 400

#     df, err = _load_df(wid)
#     if err: return jsonify(error=err[0]), err[1]
#     df2 = _coerce_datetimes(_coerce_numeric_strings(df))

#     # build feature matrix
#     numerics = _numeric_columns(df2)
#     X = None
#     if len(numerics) >= 1:
#         X = df2[numerics].copy()
#     else:
#         X = pd.DataFrame(index=df2.index)

#     # add one-hot from small categoricals to have at least some features
#     cats = [c for c in df2.columns if c not in numerics and c not in _datetime_columns(df2)]
#     keep = []
#     for c in cats:
#         nunique = df2[c].nunique(dropna=True)
#         if 2 <= nunique <= 6:
#             keep.append(c)
#     if keep:
#         oh = pd.get_dummies(df2[keep], dummy_na=False)
#         X = pd.concat([X, oh], axis=1)

#     if X.shape[1] < 2:
#         return jsonify(error="need at least 2 usable features after cleaning/encoding"), 400

#     # fill NaN
#     X = X.apply(pd.to_numeric, errors="coerce")
#     X = X.fillna(X.median(numeric_only=True))

#     rows_out: List[Dict] = []
#     used_method = method

#     if method == "iforest":
#         try:
#             from sklearn.ensemble import IsolationForest  # type: ignore
#             iso = IsolationForest(
#                 n_estimators=200,
#                 contamination=min(max(contamination, 0.001), 0.2),
#                 random_state=42,
#             )
#             iso.fit(X)
#             scores = -iso.score_samples(X)  # higher -> more anomalous
#             order = np.argsort(scores)[::-1][:max_rows]
#             # simple reason: z-scores of original numerics
#             reasons = {}
#             if numerics:
#                 Z = ((X[numerics] - X[numerics].mean()) / (X[numerics].std(ddof=0) + 1e-9)).abs()
#                 reasons = {int(i): dict(Z.iloc[i].nlargest(3).to_dict()) for i in order}
#             rows_out = [{"index": int(i), "score": float(scores[i]), "reasons": reasons.get(int(i), {})} for i in order]
#         except Exception:
#             used_method = "zscore"  # fallback to z-score

#     if used_method == "zscore":
#         # mean absolute z-score across features
#         Z = ((X - X.mean()) / (X.std(ddof=0) + 1e-9)).abs()
#         scores = Z.mean(axis=1)
#         order = np.argsort(scores.values)[::-1][:max_rows]
#         rows_out = [{"index": int(X.index[i]), "score": float(scores.iloc[i]), "reasons": dict(Z.iloc[i].nlargest(3).to_dict())} for i in order]

#     return jsonify(method=used_method, columns=list(X.columns), rows=rows_out)

# # //zoom
# # insights.py  (add below your existing code)
# from datetime import datetime
# import pandas as pd
# from flask import Blueprint, jsonify, request

# insights_bp = Blueprint("insights", __name__)

# def _get_df_or_err(workspace_id: str):
#     df, err = _load_df(workspace_id)
#     if err: return None, err
#     return df, None

# def _coerce_datetime(df: pd.DataFrame, date_col: str):
#     if date_col in df.columns:
#         if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
#             df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
#     return df

# def _apply_filters(df: pd.DataFrame, filters: dict):
#     # filters = {"Industry":"Level 1,Level 3", "Region":"North"}
#     for col, val in (filters or {}).items():
#         if col not in df.columns: 
#             continue
#         choices = [v.strip() for v in str(val).split(",") if v.strip() != ""]
#         if choices:
#             df = df[df[col].astype(str).isin(choices)]
#     return df

# def _apply_date_window(df: pd.DataFrame, date_col: str, start: str, end: str):
#     if not date_col or date_col not in df.columns:
#         return df
#     df = _coerce_datetime(df, date_col)
#     if start:
#         df = df[df[date_col] >= pd.to_datetime(start, errors="coerce")]
#     if end:
#         df = df[df[date_col] <= pd.to_datetime(end, errors="coerce")]
#     return df

# @insights_bp.route("/api/<workspace_id>/schema", methods=["GET"])
# def api_schema(workspace_id):
#     df, err = _get_df_or_err(workspace_id)
#     if err: return err
#     dtypes = df.dtypes.astype(str).to_dict()
#     numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
#     categorical = [c for c in df.columns
#                    if not pd.api.types.is_numeric_dtype(df[c])]
#     datetime_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]
#     # Heuristic: treat columns containing 'date' or 'year' as datetime candidates
#     for c in df.columns:
#         if c in datetime_cols: continue
#         if any(k in c.lower() for k in ["date", "time", "year", "month"]):
#             datetime_cols.append(c)
#     return jsonify({"columns": list(df.columns),
#                     "dtypes": dtypes,
#                     "numeric": numeric,
#                     "categorical": categorical,
#                     "datetime": list(dict.fromkeys(datetime_cols))})

# @insights_bp.route("/api/<workspace_id>/distinct", methods=["GET"])
# def api_distinct(workspace_id):
#     col = request.args.get("col")
#     limit = int(request.args.get("limit", 200))
#     df, err = _get_df_or_err(workspace_id)
#     if err: return err
#     if col not in df.columns: 
#         return jsonify({"values": []})
#     vals = (df[col].dropna().astype(str).unique().tolist())[:limit]
#     vals.sort()
#     return jsonify({"values": vals})

# @insights_bp.route("/api/<workspace_id>/series", methods=["POST"])
# def api_series(workspace_id):
#     """
#     body: {
#       "date_col": "Date",
#       "value_col": "Value",
#       "freq": "M" | "D" | "W" | "Q" | "Y",
#       "agg": "sum" | "mean" | "count" | "max" | "min",
#       "start": "2020-01-01", "end": "2024-12-31",
#       "filters": {"Industry_name":"Manufacturing,Mining"}
#     }
#     """
#     payload = request.get_json(force=True) or {}
#     date_col = payload.get("date_col")
#     value_col = payload.get("value_col")
#     freq = payload.get("freq", "M")
#     agg = payload.get("agg", "sum")
#     filters = payload.get("filters", {})
#     start = payload.get("start")
#     end = payload.get("end")

#     df, err = _get_df_or_err(workspace_id)
#     if err: return err
#     if date_col not in df.columns or value_col not in df.columns:
#         return jsonify({"points": []})

#     df = _apply_filters(df, filters)
#     df = _apply_date_window(df, date_col, start, end)
#     df = _coerce_datetime(df, date_col)

#     # group by frequency
#     grp = df.set_index(date_col).sort_index()
#     if agg == "count":
#         ser = grp[value_col].resample(freq).count()
#     else:
#         ser = getattr(grp[value_col].resample(freq), agg)()

#     out = [{"t": d.isoformat(), "y": float(v) if pd.notna(v) else None}
#            for d, v in ser.items()]
#     return jsonify({"points": out})

# @insights_bp.route("/api/<workspace_id>/rows", methods=["POST"])
# def api_rows(workspace_id):
#     """
#     body: { "date_col": "...", "start": "...", "end": "...",
#             "filters": {...}, "page": 1, "page_size": 50, "sort": ["-Value","Year"] }
#     """
#     p = request.get_json(force=True) or {}
#     page = max(1, int(p.get("page", 1)))
#     page_size = max(1, min(200, int(p.get("page_size", 50))))
#     date_col = p.get("date_col")
#     start, end = p.get("start"), p.get("end")
#     filters = p.get("filters", {})
#     sort = p.get("sort") or []

#     df, err = _get_df_or_err(workspace_id)
#     if err: return err

#     df = _apply_filters(df, filters)
#     df = _apply_date_window(df, date_col, start, end)

#     # sorting
#     for key in reversed(sort):
#         asc = True
#         col = key
#         if key.startswith("-"):
#             asc = False
#             col = key[1:]
#         if col in df.columns:
#             df = df.sort_values(col, ascending=asc)

#     total = len(df)
#     start_i = (page - 1) * page_size
#     end_i = start_i + page_size
#     page_df = df.iloc[start_i:end_i].reset_index(drop=True)

#     return jsonify({
#         "total": int(total),
#         "page": page,
#         "page_size": page_size,
#         "columns": list(page_df.columns),
#         "rows": page_df.astype(object).where(pd.notna(page_df), None).to_dict(orient="records")
#     })


from __future__ import annotations

from typing import Dict, List, Optional, Tuple, Iterable

import math
import re
import numpy as np
import pandas as pd
from flask import Blueprint, current_app, jsonify, request

# Single blueprint declaration
insights_bp = Blueprint("insights", __name__)

# -------------------------------------------------------------------
# Storage helpers
# -------------------------------------------------------------------

def _get_doc(workspace_id: str) -> Optional[dict]:
    return current_app.db.workspaces.find_one({"file_id": workspace_id})


def _load_df(workspace_id: str) -> Tuple[Optional[pd.DataFrame], Optional[Tuple[str, int]]]:
    doc = _get_doc(workspace_id)
    if not doc:
        return None, ("workspace not found", 404)
    try:
        df = pd.read_csv(doc["path"], low_memory=False)
        return df, None
    except Exception as e:
        return None, (f"failed to read CSV: {e}", 500)

# -------------------------------------------------------------------
# Type inference / coercion
# -------------------------------------------------------------------

_NUM_RX = re.compile(
    r"""
    ^\s*
    (?P<sign>[-+])?
    (?:
        \((?P<p1>[^)]+)\) |
        (?P<n1>
          (?:[0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)
          (?:\.[0-9]+)?
          (?:[eE][-+]?[0-9]+)?
        )
    )
    \s*%?\s*$
""",
    re.X,
)

def _parse_numeric_like(x: object) -> Optional[float]:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    if isinstance(x, (int, float, np.integer, np.floating)):
        return float(x)
    s = str(x).strip()
    if s == "":
        return None
    s = s.replace("$", "").replace("£", "").replace("€", "")
    m = _NUM_RX.match(s)
    if not m:
        if s.endswith("%"):
            try:
                return float(s[:-1].replace(",", "")) / 100.0
            except Exception:
                return None
        return None
    if m.group("p1"):
        try:
            val = float(m.group("p1").replace(",", ""))
            return -val
        except Exception:
            return None
    try:
        return float(m.group("n1").replace(",", ""))
    except Exception:
        return None

def _coerce_numeric_strings(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for c in out.columns:
        if out[c].dtype == "object":
            parsed = out[c].map(_parse_numeric_like)
            mask = pd.notna(parsed)
            if mask.mean() > 0.6:
                out[c] = parsed.astype(float)
    return out

def _coerce_datetimes(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for c in out.columns:
        s = out[c]
        # numeric year -> date
        if pd.api.types.is_integer_dtype(s) or pd.api.types.is_float_dtype(s):
            years = pd.to_numeric(s, errors="coerce").astype("Int64")
            if years.notna().any():
                plausible = years.between(1000, 2999)
                if plausible.mean() > 0.8:
                    try:
                        out[c] = pd.to_datetime(years.astype(str) + "-01-01", errors="coerce")
                        continue
                    except Exception:
                        pass
        # object -> datetime
        if out[c].dtype == "object":
            parsed = pd.to_datetime(out[c], errors="coerce", utc=False)
            if parsed.notna().mean() > 0.6:
                out[c] = parsed
    return out

def _datetime_columns(df: pd.DataFrame) -> List[str]:
    return df.select_dtypes(include=[np.datetime64, "datetime", "datetimetz"]).columns.tolist()

def _numeric_columns(df: pd.DataFrame) -> List[str]:
    return df.select_dtypes(include="number").columns.tolist()

def _meta(df: pd.DataFrame) -> Dict[str, List[str]]:
    df1 = _coerce_numeric_strings(df)
    df2 = _coerce_datetimes(df1)
    numeric = _numeric_columns(df2)
    dt_cols = _datetime_columns(df2)
    categorical = [c for c in df2.columns if c not in set(numeric) | set(dt_cols)]
    return {"numeric": numeric, "datetime": dt_cols, "categorical": categorical}

def _map_freq(freq: str) -> str:
    f = (freq or "M").lower()
    if f in ("d", "day", "daily"): return "D"
    if f in ("w", "week", "weekly"): return "W"
    if f in ("q", "quarter", "quarterly"): return "Q"
    if f in ("y", "year", "yearly", "a", "annual", "annually"): return "Y"
    return "M"

def _resample_rule(freq: str) -> str:
    """Resample rules aligned to period starts (nice monthly/quarterly ticks)."""
    f = _map_freq(freq)
    return {"D": "D", "W": "W-MON", "M": "MS", "Q": "QS", "Y": "YS"}[f]

# -------------------------------------------------------------------
# Profile & Summary
# -------------------------------------------------------------------

@insights_bp.get("/profile")
def profile_get():
    wid = request.args.get("workspace_id", "")
    if not wid:
        return jsonify(error="workspace_id required"), 400
    df, err = _load_df(wid)
    if err:
        return jsonify(error=err[0]), err[1]

    meta = _meta(df)
    null_pct_pairs = []
    for c in df.columns[:6]:
        pct = float(pd.isna(df[c]).mean() * 100.0)
        null_pct_pairs.append((c, round(pct, 1)))

    return jsonify(
        rows=int(df.shape[0]),
        cols=int(df.shape[1]),
        **meta,
        null_pct=dict(null_pct_pairs),
    )

@insights_bp.post("/summary")
def summary():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id", "")
    if not wid:
        return jsonify(error="workspace_id required"), 400
    df, err = _load_df(wid)
    if err:
        return jsonify(error=err[0]), err[1]

    meta = _meta(df)
    rows, cols = df.shape
    parts = [
        f"Dataset has {rows:,} rows × {cols} columns.",
        f"Numeric: {len(meta['numeric'])}; Categorical: {len(meta['categorical'])}; Datetime: {len(meta['datetime'])}.",
    ]
    for c in meta["numeric"][:3]:
        s = pd.to_numeric(df[c], errors="coerce").dropna()
        if not s.empty:
            parts.append(f"• {c}: mean={s.mean():.2f}, std={s.std():.2f}, min={s.min():.2f}, max={s.max():.2f}")
    return jsonify(summary="\n".join(parts), **meta)

@insights_bp.post("/meta")
def meta():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id", "")
    if not wid:
        return jsonify(error="workspace_id required"), 400
    df, err = _load_df(wid)
    if err:
        return jsonify(error=err[0]), err[1]
    return jsonify(**_meta(df))

# -------------------------------------------------------------------
# Aggregate (bar) and Timeseries (line)
# -------------------------------------------------------------------

@insights_bp.post("/aggregate")
def aggregate():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id"); x = p.get("x"); y = p.get("y")
    op = (p.get("op") or "sum").lower(); op = "avg" if op == "mean" else op
    limit = int(p.get("limit", 12))
    if not wid or not x:
        return jsonify(error="workspace_id and x required"), 400

    df, err = _load_df(wid)
    if err: return jsonify(error=err[0]), err[1]
    df = _coerce_numeric_strings(df)

    if x not in df.columns: return jsonify(error=f"x '{x}' not found"), 400
    if op == "count" or not y:
        g = df.groupby(x, dropna=False).size().rename("value")
    else:
        if y not in df.columns: return jsonify(error=f"y '{y}' not found"), 400
        if op == "sum":
            g = pd.to_numeric(df[y], errors="coerce").groupby(df[x], dropna=False).sum().rename("value")
        elif op == "avg":
            g = pd.to_numeric(df[y], errors="coerce").groupby(df[x], dropna=False).mean().rename("value")
        else:
            return jsonify(error="op must be sum|avg|count"), 400

    out = g.reset_index().sort_values("value", ascending=False).head(max(1, limit))
    out[x] = out[x].astype(str).fillna("NA")
    data = [{x: str(r[x]), "value": float(r["value"])} for _, r in out.iterrows()]
    return jsonify(data=data, x=x)

@insights_bp.post("/timeseries")
def timeseries():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id"); dcol = p.get("date_col"); y = p.get("y")
    op = (p.get("op") or "sum").lower(); op = "avg" if op == "mean" else op
    freq = _map_freq(p.get("freq", "M"))
    if not wid or not dcol: return jsonify(error="workspace_id and date_col required"), 400

    df, err = _load_df(wid)
    if err: return jsonify(error=err[0]), err[1]
    df = _coerce_datetimes(_coerce_numeric_strings(df))
    if dcol not in df.columns: return jsonify(error=f"date_col '{dcol}' not found"), 400
    if not np.issubdtype(df[dcol].dtype, np.datetime64):
        return jsonify(error="date_col is not parseable as dates"), 400

    df2 = df.set_index(dcol).sort_index()
    if op == "count" or not y or y not in df2.columns:
        agg = df2.resample(freq).size()
    else:
        series = pd.to_numeric(df2[y], errors="coerce")
        agg = series.resample(freq).sum() if op == "sum" else series.resample(freq).mean()
    out = [{"date": idx.strftime("%Y-%m-%d"), "value": 0.0 if pd.isna(v) else float(v)} for idx, v in agg.items()]
    return jsonify(data=out)

# -------------------------------------------------------------------
# Forecast (optional)
# -------------------------------------------------------------------

@insights_bp.post("/forecast")
def forecast():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id"); dcol = p.get("date_col"); y = p.get("y")
    periods = int(p.get("periods", 12)); freq = _map_freq(p.get("freq", "M"))
    if not wid or not dcol or not y: return jsonify(error="workspace_id, date_col, y required"), 400

    try:
        from prophet import Prophet  # type: ignore
    except Exception:
        return jsonify(error="prophet not available on server"), 501

    df, err = _load_df(wid)
    if err: return jsonify(error=err[0]), err[1]
    df = _coerce_datetimes(_coerce_numeric_strings(df))
    if dcol not in df.columns: return jsonify(error=f"date_col '{dcol}' not found"), 400
    if y not in df.columns: return jsonify(error=f"y '{y}' not found"), 400
    if not np.issubdtype(df[dcol].dtype, np.datetime64):
        return jsonify(error="date_col not parseable"), 400

    hist = pd.DataFrame({"ds": df[dcol], "y": pd.to_numeric(df[y], errors="coerce")}).dropna()
    if hist.empty: return jsonify(error="no numeric data after cleaning"), 400

    m = Prophet()
    m.fit(hist)
    future = m.make_future_dataframe(periods=periods, freq=freq)
    fc = m.predict(future)

    past = [{"date": r["ds"].strftime("%Y-%m-%d"), "value": float(r["y"])} for _, r in hist.iterrows()]
    pred = [{"date": r["ds"].strftime("%Y-%m-%d"), "value": float(r["yhat"])} for _, r in fc.iterrows()]
    return jsonify(data=past, forecast=pred)

# -------------------------------------------------------------------
# Correlation map (robust to numeric-like strings)
# -------------------------------------------------------------------

@insights_bp.post("/correlation")
def corrmap():
    """
    JSON: { workspace_id, method?: 'pearson'|'spearman'|'kendall', sample?: int }
    """
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id")
    method = (p.get("method") or "pearson").lower()
    sample_n = int(p.get("sample", 10000))

    if method not in ("pearson", "spearman", "kendall"):
        return jsonify(error="method must be pearson|spearman|kendall"), 400
    if not wid:
        return jsonify(error="workspace_id required"), 400

    df, err = _load_df(wid)
    if err:
        return jsonify(error=err[0]), err[1]

    if sample_n and len(df) > sample_n:
        df = df.head(sample_n)

    numeric_cols: list[str] = df.select_dtypes(include="number").columns.tolist()
    obj_cols: Iterable[str] = df.select_dtypes(include=["object"]).columns.tolist()
    for c in obj_cols:
        s = pd.to_numeric(df[c].astype(str).str.replace(r"[,$%]", "", regex=True), errors="coerce")
        if s.notna().mean() >= 0.70:
            df[c] = s
            numeric_cols.append(c)

    seen = set()
    numeric_cols = [c for c in numeric_cols if not (c in seen or seen.add(c))]

    if len(numeric_cols) < 2:
        return jsonify(error="need at least 2 numeric columns", columns=[], matrix=None), 400

    num_df = df[numeric_cols].copy()

    nunique = num_df.nunique(dropna=True)
    keep = [c for c in numeric_cols if nunique.get(c, 0) > 1]
    if len(keep) < 2:
        return jsonify(error="after cleaning, fewer than 2 usable numeric columns", columns=[], matrix=None), 400

    num_df = num_df[keep]
    corr = num_df.corr(method=method, min_periods=3)

    cols = list(corr.columns)
    mtx = corr.values.tolist()
    matrix = [[None if (pd.isna(v) or np.isinf(v)) else float(v) for v in row] for row in mtx]

    return jsonify(columns=cols, matrix=matrix, method=method)

# -------------------------------------------------------------------
# Narrative (lightweight rules-based text)
# -------------------------------------------------------------------

@insights_bp.post("/narrative")
def narrative():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id"); target = p.get("target"); date_col = p.get("date_col"); group_by = p.get("group_by")
    if not wid: return jsonify(error="workspace_id required"), 400

    df, err = _load_df(wid)
    if err: return jsonify(error=err[0]), err[1]
    df2 = _coerce_datetimes(_coerce_numeric_strings(df))
    rows, cols = df2.shape
    miss = float(pd.isna(df2).mean().mean()*100.0)
    insights = [f"Dataset has {rows:,} rows × {cols} columns; overall missingness ~{miss:.1f}%."]
    if group_by and group_by in df2.columns:
        vc = df2[group_by].astype(str).value_counts(dropna=True).head(3)
        parts = ", ".join([f"{k} ({v})" for k, v in vc.items()])
        insights.append(f"Most common {group_by}: {parts}.")
    if target and target in df2.columns and date_col and date_col in df2.columns and np.issubdtype(df2[date_col].dtype, np.datetime64):
        ts = pd.to_numeric(df2[target], errors="coerce")
        gb = ts.groupby(df2[date_col].dt.to_period("M")).mean().dropna()
        if len(gb) >= 3:
            change = gb.iloc[-1] - gb.iloc[0]
            pct = (change / (abs(gb.iloc[0]) + 1e-9)) * 100.0
            insights.append(f"Average {target} changed by {change:.2f} ({pct:.1f}%) from first to last month.")
    return jsonify(insights=insights, method="rules", used={"target": target, "date_col": date_col, "group_by": group_by})

# -------------------------------------------------------------------
# Anomalies (IsolationForest with z-score fallback)
# -------------------------------------------------------------------

@insights_bp.post("/anomalies")
def anomalies():
    p = request.get_json(silent=True) or {}
    wid = p.get("workspace_id")
    method = (p.get("method") or "iforest").lower()
    contamination = float(p.get("contamination", 0.01))
    max_rows = int(p.get("max_rows", 50))
    if not wid: return jsonify(error="workspace_id required"), 400

    df, err = _load_df(wid)
    if err: return jsonify(error=err[0]), err[1]
    df2 = _coerce_datetimes(_coerce_numeric_strings(df))

    numerics = _numeric_columns(df2)
    X = df2[numerics].copy() if len(numerics) >= 1 else pd.DataFrame(index=df2.index)

    cats = [c for c in df2.columns if c not in numerics and c not in _datetime_columns(df2)]
    keep = []
    for c in cats:
        nunique = df2[c].nunique(dropna=True)
        if 2 <= nunique <= 6:
            keep.append(c)
    if keep:
        oh = pd.get_dummies(df2[keep], dummy_na=False)
        X = pd.concat([X, oh], axis=1)

    if X.shape[1] < 2:
        return jsonify(error="need at least 2 usable features after cleaning/encoding"), 400

    X = X.apply(pd.to_numeric, errors="coerce")
    X = X.fillna(X.median(numeric_only=True))

    rows_out: List[Dict] = []
    used_method = method

    if method == "iforest":
        try:
            from sklearn.ensemble import IsolationForest  # type: ignore
            iso = IsolationForest(
                n_estimators=200,
                contamination=min(max(contamination, 0.001), 0.2),
                random_state=42,
            )
            iso.fit(X)
            scores = -iso.score_samples(X)  # higher -> more anomalous
            order = np.argsort(scores)[::-1][:max_rows]
            reasons = {}
            if numerics:
                Z = ((X[numerics] - X[numerics].mean()) / (X[numerics].std(ddof=0) + 1e-9)).abs()
                reasons = {int(i): dict(Z.iloc[i].nlargest(3).to_dict()) for i in order}
            rows_out = [{"index": int(i), "score": float(scores[i]), "reasons": reasons.get(int(i), {})} for i in order]
        except Exception:
            used_method = "zscore"

    if used_method == "zscore":
        Z = ((X - X.mean()) / (X.std(ddof=0) + 1e-9)).abs()
        scores = Z.mean(axis=1)
        order = np.argsort(scores.values)[::-1][:max_rows]
        rows_out = [{"index": int(X.index[i]), "score": float(scores.iloc[i]), "reasons": dict(Z.iloc[i].nlargest(3).to_dict())} for i in order]

    return jsonify(method=used_method, columns=list(X.columns), rows=rows_out)

# -------------------------------------------------------------------
# NEW: Zoom/Brush + Filters + Data Preview APIs
# -------------------------------------------------------------------

def _get_df_or_err(workspace_id: str):
    df, err = _load_df(workspace_id)
    if err:
        return None, err
    return df, None

def _ensure_datetime_col(df: pd.DataFrame, date_col: str) -> pd.DataFrame:
    """Coerce a specific column to datetime if not already."""
    if date_col and date_col in df.columns and not pd.api.types.is_datetime64_any_dtype(df[date_col]):
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    return df

def _apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    """Apply multi-select categorical filters: {'Col':'A,B,C'}."""
    for col, val in (filters or {}).items():
        if col not in df.columns:
            continue
        choices = [v.strip() for v in str(val).split(",") if v.strip() != ""]
        if choices:
            df = df[df[col].astype(str).isin(choices)]
    return df

def _apply_date_window(df: pd.DataFrame, date_col: str, start: str, end: str) -> pd.DataFrame:
    if not date_col or date_col not in df.columns:
        return df
    df = _ensure_datetime_col(df, date_col)
    if start:
        df = df[df[date_col] >= pd.to_datetime(start, errors="coerce")]
    if end:
        df = df[df[date_col] <= pd.to_datetime(end, errors="coerce")]
    return df

@insights_bp.get("/api/<workspace_id>/schema")
def api_schema(workspace_id):
    df, err = _get_df_or_err(workspace_id)
    if err:
        return err
    dtypes = df.dtypes.astype(str).to_dict()
    numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    categorical = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
    datetime_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]
    # heuristics for date-like names
    for c in df.columns:
        if c in datetime_cols:
            continue
        if any(k in c.lower() for k in ["date", "time", "year", "month"]):
            datetime_cols.append(c)
    return jsonify(
        {"columns": list(df.columns),
         "dtypes": dtypes,
         "numeric": numeric,
         "categorical": categorical,
         "datetime": list(dict.fromkeys(datetime_cols))}
    )

@insights_bp.get("/api/<workspace_id>/distinct")
def api_distinct(workspace_id):
    col = request.args.get("col")
    limit = int(request.args.get("limit", 200))
    df, err = _get_df_or_err(workspace_id)
    if err:
        return err
    if not col or col not in df.columns:
        return jsonify({"values": []})
    vals = (df[col].dropna().astype(str).unique().tolist())[:limit]
    vals.sort()
    return jsonify({"values": vals})

@insights_bp.post("/api/<workspace_id>/series")
def api_series(workspace_id):
    """
    body: {
      "date_col": "Date",
      "value_col": "Value",  # optional if agg=='count'
      "freq": "M" | "D" | "W" | "Q" | "Y",
      "agg": "sum" | "mean" | "count" | "max" | "min",
      "start": "2020-01-01", "end": "2024-12-31",
      "filters": {"Industry_name":"Manufacturing,Mining"}
    }
    """
    try:
        p = request.get_json(silent=True) or {}
        date_col  = p.get("date_col")
        value_col = p.get("value_col")
        freq      = p.get("freq", "M")
        agg       = (p.get("agg") or "sum").lower()
        filters   = p.get("filters") or {}
        start     = p.get("start")
        end       = p.get("end")

        if not date_col:
            return jsonify(error="date_col is required"), 400
        if agg != "count" and not value_col:
            return jsonify(error="value_col is required unless agg=='count'"), 400
        if agg not in {"sum","mean","count","max","min"}:
            return jsonify(error="agg must be one of sum|mean|count|max|min"), 400

        df, err = _get_df_or_err(workspace_id)
        if err:
            return err
        if date_col not in df.columns:
            return jsonify(error=f"date_col '{date_col}' not found"), 400
        if agg != "count" and value_col not in df.columns:
            return jsonify(error=f"value_col '{value_col}' not found"), 400

        # filters + window + coercions
        df = _apply_filters(df, filters)
        df = _apply_date_window(df, date_col, start, end)
        df = _ensure_datetime_col(df, date_col)

        if df.empty:
            return jsonify(points=[])

        df = df.sort_values(date_col).set_index(date_col)

        if agg == "count":
            y = pd.Series(1.0, index=df.index)
        else:
            y = pd.to_numeric(df[value_col], errors="coerce")
            if agg in {"sum", "count"}:
                y = y.fillna(0)

        rule = _resample_rule(freq)
        if agg == "sum":
            ser = y.resample(rule).sum()
        elif agg == "mean":
            ser = y.resample(rule).mean()
        elif agg == "count":
            ser = y.resample(rule).count()
        elif agg == "max":
            ser = y.resample(rule).max()
        else:
            ser = y.resample(rule).min()

        ser = ser.replace([np.inf, -np.inf], np.nan)
        points = [{"t": idx.strftime("%Y-%m-%d"), "y": (None if pd.isna(v) else float(v))}
                  for idx, v in ser.items()]

        return jsonify(points=points)
    except Exception as e:
        # Return actionable dev-time message instead of generic 500
        return jsonify(error=f"series failed: {type(e).__name__}: {e}"), 400

@insights_bp.post("/api/<workspace_id>/rows")
def api_rows(workspace_id):
    """
    body: { "date_col": "...", "start": "...", "end": "...",
            "filters": {...}, "page": 1, "page_size": 50, "sort": ["-Value","Year"] }
    """
    p = request.get_json(force=True) or {}
    page = max(1, int(p.get("page", 1)))
    page_size = max(1, min(200, int(p.get("page_size", 50))))
    date_col = p.get("date_col")
    start, end = p.get("start"), p.get("end")
    filters = p.get("filters", {})
    sort = p.get("sort") or []

    df, err = _get_df_or_err(workspace_id)
    if err:
        return err

    df = _apply_filters(df, filters)
    df = _apply_date_window(df, date_col, start, end)
    df = _ensure_datetime_col(df, date_col)

    # sorting
    for key in reversed(sort):
        asc = True
        col = key
        if key.startswith("-"):
            asc = False
            col = key[1:]
        if col in df.columns:
            df = df.sort_values(col, ascending=asc)

    total = len(df)
    start_i = (page - 1) * page_size
    end_i = start_i + page_size
    page_df = df.iloc[start_i:end_i].reset_index(drop=True)

    return jsonify(
        {
            "total": int(total),
            "page": page,
            "page_size": page_size,
            "columns": list(page_df.columns),
            "rows": page_df.astype(object).where(pd.notna(page_df), None).to_dict(orient="records"),
        }
    )
