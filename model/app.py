import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from modelo import ask_llm_with_rag, ingest_data_into_chroma

# Caminho absoluto para a pasta templates (um nível acima do site.py)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, static_folder=STATIC_DIR, template_folder=TEMPLATES_DIR)
CORS(app)

# ID fixo para demonstração
USER_ID = "meu_usuario_demonstracao"
COLLECTION_NAME = "MaterialOriginal"

@app.route("/api/perguntar", methods=["POST"])
def perguntar():
    try:
        data = request.get_json()
        pergunta = data.get("pergunta")

        if not pergunta:
            return jsonify({"erro": "Pergunta não fornecida"}), 400

        resposta = ask_llm_with_rag(query=pergunta, user_id=USER_ID, material_collection_name=COLLECTION_NAME)
        return jsonify({"resposta": resposta})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route("/api/ingestao", methods=["POST"])
def ingestao():
    try:
        data = request.get_json()
        collection = data.get("colecao")
        documentos = data.get("documentos")
        if not documentos or not collection:
            return jsonify({"erro": "Dados inválidos."}), 400

        ingest_data_into_chroma(documentos, collection, USER_ID)
        return jsonify({"mensagem": "Dados ingeridos com sucesso"})

    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route("/")
def index():
    return render_template("index.html")  # Arquivo está na pasta templates

if __name__ == "__main__":
    app.run(debug=True, port=5000)
