import chromadb
import logging

# Create a logger
logging.basicConfig(filename='app.log', filemode='w',
                    format='%(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

def peek_count_index(collection_name):
    # Get the Chroma Client
    chroma_client = chromadb.PersistentClient(path="./.chroma_db")

    # Delete the collection
    try:
        collection = chroma_client.get_collection(name=collection_name)
        # print(collection.peek())
        print(collection.count())
        print(collection.peek())
        logger.info(f'Index count is {collection.count()}')
        return f'Index count is {collection.count()}'
    except Exception as e:
        logger.info(f'Error occurred while checking the collection: {str(e)}')
        return f'Error occurred while checking the collection: {str(e)}'