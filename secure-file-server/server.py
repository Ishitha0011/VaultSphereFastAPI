from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from typing import Optional, Dict, Any
import hmac
import os
import json
import mimetypes
from logging.handlers import RotatingFileHandler
import datetime
from uuid import uuid4
from werkzeug.utils import secure_filename
import logging
import bma
import config
import version
from pydantic import BaseModel

# Keep the same allowed extensions and MIME type mappings
ALLOWED_EXTENSIONS = {'txt', 'csv', 'xls', 'xlsx', 'pdf', 'iso', 'ISO', 'zip', 'ZIP', 'tar', 'TAR', 'gz', 'GZ'}

MIME_TYPE_MAP = {
    'application/pdf': 'PDF',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'text/plain': 'TXT',
    'application/zip': 'ZIP',
    'application/x-tar': 'TAR',
    'application/gzip': 'GZ',
    'application/octet-stream': 'ISO',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'application/json': 'JSON',
    'text/csv': 'CSV',
}


class User:
    def __init__(self, userId: int, username: str, password: str):
        self.id = userId
        self.username = username
        self.password = password

    def __str__(self):
        return f"User(id='{self.id}')"


# Keep the same user data
users = [
    User(1, 'admin', 'admin'),
    User(2, 'govind', 'Welcome#123'),
]

username_table = {u.username: u for u in users}
userid_table = {u.id: u for u in users}


def get_readable_file_type(mime_type: str) -> str:
    """Converts a MIME type into a human-readable file type."""
    return MIME_TYPE_MAP.get(mime_type, 'Unknown File Type')


def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def create_app():
    app = FastAPI(title="BMA Service", version="1.0.0")

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Configure logging
    logFile = os.path.join('fileserver.log')
    logging_format = '%(asctime)s %(process)d-%(thread)d %(levelname)s [%(filename)s:%(lineno)d] %(message)s'

    fh = RotatingFileHandler(logFile, maxBytes=10 * 1024 * 1024, backupCount=2)
    logging.basicConfig(
        level=config.SETTINGS['LOG_LEVEL'],
        format=logging_format,
        handlers=[fh, logging.StreamHandler()]
    )

    # Initialize BMA
    try:
        ipaddr = config.SETTINGS['PORT']
        bma.init(ipaddr)
    except Exception as err:
        logging.exception(err)

    # Routes
    @app.get("/rest/version")
    async def get_version():
        logging.debug("getVersion")
        return {"version": version.getVersion()}

    @app.get("/rest/sessions")
    @app.post("/rest/sessions")
    async def sessions():
        try:
            logging.debug("Sessions.............")
            return {"isAuthenticated": True}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/sessions/{token}")
    async def get_session(token: str):
        response = {
            'user': "default_user",
            'userName': "Govind",
            'token': token,
            'isAuthenticated': True
        }
        return response

    @app.delete("/rest/sessions/{token}")
    async def delete_session(token: str):
        try:
            logging.debug(f"Logout session with token: {token}")
            logging.debug("Logout Successful!")
            return {"result": "success"}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/settings")
    async def get_settings():
        try:
            response = bma.getSettings()
            return {"result": response, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": {"msg": str(err)}}

    @app.post("/rest/settings")
    async def set_settings(settings: Dict[str, Any]):
        try:
            response = bma.setSettings(settings)
            return {"result": response, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": {"msg": str(err)}}

    @app.get("/rest/supportdump")
    async def get_support_dump():
        try:
            return {"result": {}, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/dashboard")
    async def get_dashboard_data():
        try:
            dashboard_data = bma.getDashboardData()
            return {"result": dashboard_data, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/images/list")
    async def get_os_packages(ostype: str = "", purpose: str = ""):
        try:
            logging.debug(f"Filters osType: {ostype}, purpose: {purpose}")
            ospackages = bma.getOSPackages({'osType': ostype, 'purpose': purpose})
            return {"result": ospackages, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.post("/rest/images/sync")
    async def sync_image(data: Dict[str, Any]):
        try:
            ret = bma.syncImage(data)
            return {"result": ret, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/images/{id}")
    async def get_os_package(id: str):
        try:
            ospackage = bma.getOSPackageById(id)
            return {"result": ospackage, "error": {}}
        except Exception as err:
            logging.error(f'route error: {err}')
            return {"result": "Fail", "error": str(err)}

    @app.delete("/rest/images/{id}")
    async def delete_os_package(id: str):
        try:
            rc = bma.deleteOSPackageById(id)
            return {"result": rc, "error": {}}
        except Exception as err:
            logging.error(f'route error: {err}')
            return {"result": "Fail", "error": str(err)}

    @app.get("/rest/ostype/list")
    async def get_supported_os_list():
        try:
            supported_os_list = bma.getSupportedOSList()
            return {"result": supported_os_list, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/files/{category}")
    async def get_files(category: str):
        try:
            items = bma.get_files()
            result = {"category": category, "data": items["data"]}
            return {"result": result, "error": {}}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.post("/rest/upload")
    async def upload(file: UploadFile = File(...), data: str = None):
        try:
            if not file:
                return {"result": {}, "error": "No file part found in POST request"}

            if file.filename == '':
                return {"result": {}, "error": "No input file found"}

            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(config.SETTINGS['UPLOAD_FOLDER'], filename)

                file_data = await file.read()
                with open(filepath, "wb") as f:
                    f.write(file_data)

                if data:
                    data = json.loads(data)
                    logging.debug(f"upload: data: {data}")

                return {"result": "success", "error": ""}

            return HTMLResponse(content="""
                <!doctype html>
                <title>Upload new File</title>
                <h1>Upload new File</h1>
                <form method=post enctype=multipart/form-data>
                <input type=file name=file>
                <input type=submit value=Upload>
                </form>
            """)
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.post("/rest/uploadchunks")
    async def upload_chunks(request: Request):
        try:
            headers = request.headers
            data = json.loads(headers.get('data'))
            progress = json.loads(headers.get('progress'))

            filename = secure_filename(data['file'])
            filetype = data['type']

            readable_file_type = get_readable_file_type(filetype)
            logging.info(f"Uploading {filename} with file type: {readable_file_type}")

            if filename and allowed_file(filename):
                raw_data = await request.body()
                filepath = os.path.join(config.SETTINGS['UPLOAD_FOLDER'], filename)

                os.makedirs(config.SETTINGS['UPLOAD_FOLDER'], exist_ok=True)

                if progress['start'] == 0:
                    with open(filepath, 'wb') as f:
                        f.write(raw_data)

                    if progress['end'] == progress['size']:
                        bma.add_file(filename, readable_file_type, filepath)

                elif progress['end'] == progress['size']:
                    with open(filepath, 'ab') as f:
                        f.write(raw_data)
                    bma.add_file(filename, readable_file_type, filepath)

                else:
                    with open(filepath, 'ab') as f:
                        f.write(raw_data)

                return {"result": {'data': progress}, "error": {}}

            return HTMLResponse(content="""
                <!doctype html>
                <title>Upload new File</title>
                <h1>Upload new File</h1>
                <form method=post enctype=multipart/form-data>
                <input type=file name=file>
                <input type=submit value=Upload>
                </form>
            """)
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/scripts/list")
    async def get_scripts(ostype: str = ""):
        try:
            kickstarts = bma.getScripts(ostype)
            return {"result": kickstarts, "error": ""}
        except Exception as err:
            logging.exception(err)
            return {"result": {}, "error": str(err)}

    @app.get("/rest/scripts/file/{osType}")
    async def download_script(osType: str, file: str = "", type: str = ""):
        try:
            logging.debug(f"script_file: {file} script_type: {type} osType: {osType}")
            file_path = bma.downloadKickstartFile(osType, type, file)
            return FileResponse(file_path, media_type="text/plain")
        except Exception as err:
            logging.exception(err)
            raise HTTPException(status_code=404, detail="File not found")

    return app


if __name__ == "__main__":
    import uvicorn

    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=3041)