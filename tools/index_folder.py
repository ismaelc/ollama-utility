import os
import json
import mimetypes
from tqdm import tqdm
import chromadb

from read_pdf_file import read_pdf_file
from read_text_file import read_text_file
from chunk_text import chunk_text


def index_folder(folder_path):

    def get_file_content(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            return "The file type is not supported"
        elif mime_type == 'application/pdf':
            return read_pdf_file(file_path)
        elif mime_type == 'text/plain':
            return read_text_file(file_path)
        else:
            return "The file type is not supported"

    def get_files_in_folder(folder_path):
        files = []
        for file in tqdm(os.listdir(folder_path), desc="Indexing folder"):
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path):
                file_info = {
                    'name': file,
                    'path': file_path,
                    'content': get_file_content(file_path)
                }
                files.append(file_info)
        return files

    # Get the Chroma Client
    chroma_client = chromadb.PersistentClient(path="./.chroma_db")

    # Create a collection if it doesn't exist
    collection_name = folder_path.replace('/', '_').replace(' ', '_').strip('/').strip('_')
    if collection_name in chroma_client.list_collections():
        chroma_client.delete_collection(name=collection_name)
    collection = chroma_client.create_collection(name=collection_name)

    files = get_files_in_folder(folder_path)
    for file in tqdm(files, desc="Indexing files"):
        file['chunks'] = chunk_text(file['content'])

        metadatas = [{'name': file['name'], 'path': file['path']}
                     for _ in file['chunks']]
        ids = [f"{file['name']}_{i}" for i in range(len(file['chunks']))]

        collection.add(
            documents=file['chunks'],
            metadatas=metadatas,
            ids=ids
        )

    # return collection name
    return f'Folder {folder_path} has been indexed successfully.'