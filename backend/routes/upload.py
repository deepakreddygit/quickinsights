from flask import Blueprint, request, jsonify, current_app
import os, uuid, pandas as pd
from utils.schema_detect import profile_dataframe

upload_bp = Blueprint('upload', __name__)

@upload_bp.post('/')
def upload_csv():
    if 'file' not in request.files:
        return jsonify(error='no file provided'), 400

    f = request.files['file']
    if not f.filename.lower().endswith('.csv'):
        return jsonify(error='only .csv files are supported'), 400

    file_id = str(uuid.uuid4())
    path = os.path.join(current_app.storage_path, f'{file_id}.csv')
    f.save(path)

    try:
        df = pd.read_csv(path)
    except Exception as e:
        # cleanup if unreadable
        try: os.remove(path)
        except: pass
        return jsonify(error=f'could not read CSV: {e}'), 400

    profile = profile_dataframe(df)

    ws_doc = {
        "file_id": file_id,
        "filename": f.filename,
        "path": path,
        "profile": profile
    }
    current_app.db.workspaces.insert_one(ws_doc)

    return jsonify(workspace_id=file_id, profile=profile)
