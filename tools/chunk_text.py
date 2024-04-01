from semantic_text_splitter import TextSplitter

def chunk_text(text, max_characters=2000):
    splitter = TextSplitter()
    # return splitter.chunks(text, chunk_capacity=(3500, max_characters)) # range
    return splitter.chunks(text, max_characters)