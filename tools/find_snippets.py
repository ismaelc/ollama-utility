import os
import chromadb

def find_snippets(folder_path, query):

    # Get the Chroma Client
    chroma_client = chromadb.PersistentClient(path="./.chroma_db")

    # Create a collection if it doesn't exist
    collection_name = folder_path.replace('/', '_').replace(' ', '_').strip('/').strip('_')
    chroma_collections = chroma_client.list_collections()
    for chroma_collection_name in chroma_collections:
        if collection_name in chroma_collection_name.name:
            collection = chroma_client.get_collection(name=collection_name)
            break
    else:
        return "Collection does not exist. Please index the folder first."

    # Search the collection
    results = collection.query(
        query_texts=[query],
        n_results=5
    )

    return results