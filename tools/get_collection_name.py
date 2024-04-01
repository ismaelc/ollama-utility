import re

def get_collection_name(folder_path):
    collection_name = folder_path.replace(
        '/', '_').replace(' ', '_').replace('\\', '').replace('%20', '_')
    
    # Remove any non-alphanumeric characters, except for underscores and hyphens
    collection_name = re.sub('[^A-Za-z0-9_-]', '', collection_name)

    # Ensure the collection name starts and ends with an alphanumeric character
    collection_name = re.sub('^[^A-Za-z0-9]*|[^A-Za-z0-9]*$', '', collection_name)

    # Ensure the collection name does not contain two consecutive periods
    collection_name = collection_name.replace('..', '.')

    # Ensure the collection name is not a valid IPv4 address
    if re.match('^([0-9]{1,3}\.){3}[0-9]{1,3}$', collection_name):
        raise ValueError('Index name cannot be a valid IPv4 address')
    
    return collection_name