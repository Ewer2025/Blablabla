import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
# Certifique-se de que 'modelo' está acessível no seu PYTHONPATH
# e que as funções ask_llm_with_rag e ingest_data_into_chroma estão definidas nele.
from modelo import ask_llm_with_rag, ingest_data_into_chroma

# Caminho absoluto para a pasta templates e static
# '..' sobe um nível do diretório onde app.py está, para a raiz do projeto.
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATES_DIR)
CORS(app) # Habilita CORS para permitir requisições do frontend

# ID fixo para demonstração (você pode querer mudar isso para um sistema de autenticação real)
USER_ID = "meu_usuario_demonstracao"
COLLECTION_NAME = "MaterialOriginal" # Nome da coleção no ChromaDB

@app.route("/api/perguntar", methods=["POST"])
def perguntar():
    """
    Endpoint para o Feroz (LLM) responder a perguntas.
    Recebe uma pergunta do frontend e retorna uma resposta do modelo de linguagem.
    """
    try:
        data = request.get_json()
        pergunta = data.get("pergunta")

        if not pergunta:
            return jsonify({"erro": "Pergunta não fornecida"}), 400

        # No frontend, o JS está enviando user_id e chat_history.
        # Se ask_llm_with_rag precisar desses dados para contexto/histórico,
        # você deve extraí-los aqui e passá-los para a função.
        # Exemplo: user_id_from_frontend = data.get("user_id", USER_ID)
        # chat_history_from_frontend = data.get("chat_history", [])

        resposta = ask_llm_with_rag(query=pergunta, user_id=USER_ID, material_collection_name=COLLECTION_NAME)
        return jsonify({"resposta": resposta})

    except Exception as e:
        # Loga o erro para depuração
        print(f"Erro no endpoint /api/perguntar: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route("/api/ingestao", methods=["POST"])
def ingestao():
    """
    Endpoint para ingestão de documentos no ChromaDB.
    Recebe uma coleção e documentos, e os ingere no banco de dados vetorial.
    """
    try:
        data = request.get_json()
        collection = data.get("colecao")
        documentos = data.get("documentos") # Espera uma lista de strings ou JSONs de documentos

        if not documentos or not collection:
            return jsonify({"erro": "Dados inválidos."}), 400

        ingest_data_into_chroma(documentos, collection, USER_ID)
        return jsonify({"mensagem": "Dados ingeridos com sucesso"})

    except Exception as e:
        # Loga o erro para depuração
        print(f"Erro no endpoint /api/ingestao: {e}")
        return jsonify({"erro": str(e)}), 500

@app.route("/")
def index():
    """
    Rota principal que renderiza o arquivo HTML da aplicação.
    """
    return render_template("index.html")

if __name__ == "__main__":
    # Roda a aplicação Flask em modo debug na porta 5000
    # O modo debug é útil para desenvolvimento, mas deve ser desativado em produção.
    app.run(debug=True, port=5000)