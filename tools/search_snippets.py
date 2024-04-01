import os
import logging
import chromadb

# Create a logger
logging.basicConfig(filename='app.log', filemode='w',
                    format='%(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

def search_snippets(query):

    # Get the Chroma Client
    chroma_client = chromadb.PersistentClient(path="./.chroma_db")

    # Read collection name from file
    try:
        with open('current_index.txt', 'r') as file:
            collection_name = file.read().strip()
    except FileNotFoundError:
        logging.info("The folder needs to be indexed first.")
        return "The folder needs to be indexed first."

    # Get the collection if it exists
    chroma_collections = chroma_client.list_collections()
    for chroma_collection_name in chroma_collections:
        if collection_name in chroma_collection_name.name:
            collection = chroma_client.get_collection(name=collection_name)
            logging.info(f"Index {collection_name} exists.")
            break
    else:
        logging.info("Index does not exist. Please index the folder first.")
        return "Index does not exist. Please index the folder first."

    query = query.replace('%20', '_')

    # Search the collection
    results = collection.query(
        query_texts=[query],
        n_results=5
    )

    return results