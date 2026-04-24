import requests
import json

# URL da API
url = 'https://api.sieg.com/BaixarXml?xmlType=1&api_key=V9qh9u%2BRmI7VINT4ynER7A%3D%3D'

# Headers
headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

# Body da requisição
data = '27230120616431000194550010000051431482043662'

# Fazer a requisição POST
try:
    response = requests.post(url, headers=headers, data=data)
    
    # Exibir informações da resposta
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"\nResposta:")
    
    # Tentar exibir como JSON se possível, senão exibir como texto
    try:
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    except:
        print(response.text)
    
    # Salvar resposta em arquivo se necessário
    if response.status_code == 200:
        with open('resposta_api.xml', 'wb') as f:
            f.write(response.content)
        print("\nResposta salva em 'resposta_api.xml'")
    
except requests.exceptions.RequestException as e:
    print(f"Erro na requisição: {e}")



