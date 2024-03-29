from duckduckgo_search import ddg
from newspaper import Article
# import json

def search_web(query):
    results = ddg(query, max_results=3)
    for result in results:
        if result['href']:
            try:
                article = Article(result['href'])
                article.download()
                article.parse()
                if article.summary:
                    result['summary'] = article.summary
                if article.text:
                    result['text'] = article.text
            except Exception as e:
                result['error'] = str(e)
            finally:
                result['text'] = result.get('text', result.get('body', ''))
                if 'body' in result:
                    del result['body']
    # print(json.dumps(results, indent=2))
    return results