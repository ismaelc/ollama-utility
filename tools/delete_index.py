import chromadb
import logging

from tools.get_collection_name import get_collection_name

# Create a logger
logging.basicConfig(filename='app.log', filemode='w',
                    format='%(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

def delete_index(collection_name):
    # Get the Chroma Client
    chroma_client = chromadb.PersistentClient(path="./.chroma_db")

    collection_name = get_collection_name(collection_name)

    # Delete the collection
    try:
        chroma_client.delete_collection(name=collection_name)
        logger.info(f'Index {collection_name} has been deleted successfully.')
        return f'Index {collection_name} has been deleted successfully.'
    except Exception as e:
        logger.info(f'Error occurred while deleting the collection: {str(e)}')
        return f'Error occurred while deleting the collection: {str(e)}'