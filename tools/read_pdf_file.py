import importlib
import requests
import io
# import pdfminer.high_level as pdfminer
pdfminer_highlevel = importlib.import_module("pdfminer.high_level")

def read_pdf_file(file_path):
    if file_path.startswith('http'):
        response = requests.get(file_path)
        file = io.BytesIO(response.content)
    else:
        file = file_path
    text = pdfminer_highlevel.extract_text(file)
    return text