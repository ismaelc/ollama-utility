import os
import re
import mimetypes
import logging
from tqdm import tqdm
import chromadb

from tools.read_pdf_file import read_pdf_file
from tools.read_text_file import read_text_file
from tools.chunk_text import chunk_text
from tools.get_collection_name import get_collection_name

# Create a logger
logging.basicConfig(filename='app.log', filemode='w',
                    format='%(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)


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

    folder_path = folder_path.replace('%20', ' ')
    collection_name = get_collection_name(folder_path)

    # Check if collection already exists
    try:
        collection = chroma_client.get_collection(name=collection_name)
        if collection.count() > 0:
            logger.info(
                f'Index {collection_name} already exists. Skipping indexing process.')
            return f'Index {collection_name} already exists.'
        else:
            logger.info(
                f'Index {collection_name} exists but is empty. Proceeding with indexing process.')
    except:
        collection = chroma_client.create_collection(name=collection_name)
        logger.info(
            f'Index {collection_name} has been created successfully.')

    files = get_files_in_folder(folder_path)
    chunks = []
    metadatas = []
    ids = []

    for file in tqdm(files, desc="Indexing files"):
        file['chunks'] = chunk_text(file['content'])
        chunks.extend(file['chunks'])

        metadatas.extend([{'name': file['name'], 'path': file['path']}
                        for _ in file['chunks']])
        ids.extend([f"{file['name']}_{i}" for i in range(len(file['chunks']))])

        # print('[CHUNKS]', file['chunks'])
        # print('[METADATAS]', metadatas)
        # print('[IDS]', ids)
        # raise Exception('Stop here')

    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )

    logger.info(f'Folder {folder_path} has been indexed successfully.')

    # Write the index name to a file
    with open('current_index.txt', 'w') as f:
        f.write(collection_name)
        logger.info(f'Index {collection_name} has been created successfully.')

    # return collection name
    logger.info(f'Folder {folder_path} has been indexed successfully.')
    return f'Folder {folder_path} has been indexed successfully.'
