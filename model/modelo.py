import os
import json
import requests
import time
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
import chromadb

CHROMA_PERSIST_DIRECTORY = "chroma_db_simples"
os.makedirs(CHROMA_PERSIST_DIRECTORY, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)

GROQ_API_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROK_API_KEY", "")

try:
    embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    USE_LOCAL_EMBEDDING = True
except Exception:
    USE_LOCAL_EMBEDDING = False

def generate_embedding(text: str) -> List[float]:
    if USE_LOCAL_EMBEDDING:
        return embedding_model.encode(text).tolist()
    else:
        return [hash(text) % 1000 / 1000.0] * 384

def create_text_from_row(row_data: Dict[str, Any]) -> str:
    text_parts = []
    for key, value in row_data.items():
        if key not in ["ID", "id"] and value is not None:
            text_parts.append(f"{key}: {value}")
    return ". ".join(text_parts) + "."

def call_grok_llm(messages: List[Dict[str, str]]) -> Optional[str]:
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {GROQ_API_KEY}'
        }
        
        payload = {
            "messages": messages,
            "model": "llama3-8b-8192",
            "max_tokens": 1024,
            "temperature": 0.7
        }

        response = requests.post(GROQ_API_BASE_URL, headers=headers, data=json.dumps(payload))
        response.raise_for_status()

        result = response.json()
        
        if result.get("choices") and result["choices"][0].get("message") and result["choices"][0]["message"].get("content"):
            return result["choices"][0]["message"]["content"]
        
        return "Nenhuma resposta válida do LLM Grok."
    except requests.exceptions.RequestException as e:
        return f"Erro de conexão ou resposta da API do Grok: {e}"
    except Exception as e:
        return f"Erro inesperado ao chamar LLM Grok: {e}"

def ingest_data_into_chroma(data: List[Dict[str, Any]], collection_name: str, user_id: str, id_field: str = "ID"):
    collection = chroma_client.get_or_create_collection(name=collection_name)

    documents_to_add = []
    embeddings_to_add = []
    metadatas_to_add = []
    ids_to_add = []

    for i, row in enumerate(data):
        text_representation = create_text_from_row(row)
        embedding = generate_embedding(text_representation)

        if embedding:
            row_id_val = row.get(id_field)
            if row_id_val is None:
                row_id_val = row.get("id")
            if row_id_val is None:
                row_id_val = f"row_{i}"

            doc_id = f"{user_id}_{collection_name}_{row_id_val}" 
            
            metadata = {
                "source_type": collection_name.lower(),
                "table_name": collection_name,
                "user_id": user_id,
                "original_row_json": json.dumps(row)
            }
            for k, v in row.items(): 
                if isinstance(v, (str, int, float, bool)):
                    metadata[k] = v

            documents_to_add.append(text_representation)
            embeddings_to_add.append(embedding)
            metadatas_to_add.append(metadata)
            ids_to_add.append(doc_id)
        else:
            print(f"Aviso: Não foi possível gerar embedding para a linha {row_id_val}. Ignorando.")

    if documents_to_add:
        collection.add(
            embeddings=embeddings_to_add,
            documents=documents_to_add,
            metadatas=metadatas_to_add,
            ids=ids_to_add
        )
        print(f"Adicionados {len(documents_to_add)} documentos à coleção '{collection_name}'.")
    else:
        print(f"Nenhum documento para adicionar à coleção '{collection_name}'.")

def save_chat_message(user_id: str, message_text: str, role: str, collection_name: str = "HistoricoConversaIA"):
    collection = chroma_client.get_or_create_collection(name=collection_name)
    
    timestamp = int(time.time() * 1000)
    message_id = f"{user_id}_{timestamp}_{role}" 

    embedding = generate_embedding(message_text)

    if embedding:
        metadata = {
            "user_id": user_id,
            "role": role,
            "timestamp": timestamp,
            "message_text": message_text
        }
        collection.add(
            embeddings=[embedding],
            documents=[message_text],
            metadatas=[metadata],
            ids=[message_id]
        )
        print(f"Mensagem de chat ('{role}') salva para o usuário {user_id} com ID: {message_id}")
    else:
        print(f"Erro: Não foi possível gerar embedding para a mensagem de chat. Mensagem não salva.")

def get_recent_chat_history(user_id: str, n_messages: int = 5, collection_name: str = "HistoricoConversaIA") -> List[Dict[str, str]]:
    try:
        collection = chroma_client.get_collection(name=collection_name)
        
        results = collection.get(
            where={"user_id": user_id},
            include=['documents', 'metadatas']
        )
        
        if not results or not results.get('ids'):
            return []

        all_messages = []
        for i in range(len(results['ids'])):
            all_messages.append({
                "id": results['ids'][i],
                "document": results['documents'][i],
                "metadata": results['metadatas'][i]
            })

        all_messages.sort(key=lambda x: x['metadata'].get('timestamp', 0), reverse=False)

        recent_history_formatted = []
        for msg_data in all_messages[-n_messages:]:
            recent_history_formatted.append({
                "role": msg_data['metadata']['role'],
                "content": msg_data['metadata']['message_text']
            })
        
        return recent_history_formatted

    except Exception as e:
        print(f"Erro ao recuperar histórico de chat: {e}")
        return []

def ask_llm_with_rag(query: str, user_id: str, material_collection_name: str, chat_history_collection_name: str = "HistoricoConversaIA", n_material_results: int = 3, n_chat_history_messages: int = 5) -> str:
    try:
        recent_chat_messages = get_recent_chat_history(user_id, n_chat_history_messages, chat_history_collection_name)
        
        material_collection = chroma_client.get_collection(name=material_collection_name)
        if material_collection.count() == 0:
            return f"Coleção '{material_collection_name}' vazia. Nenhuma informação para buscar no material didático."

        query_embedding = generate_embedding(query)
        if not query_embedding:
            return "Desculpe, não consegui processar sua pergunta para busca de material."

        material_results = material_collection.query(
            query_embeddings=[query_embedding],
            n_results=n_material_results,
            where={"user_id": user_id},
            include=['documents', 'metadatas']
        )
        
        relevant_material_docs = material_results['documents'][0] if material_results and material_results.get('documents') else []
        relevant_material_metadatas = material_results['metadatas'][0] if material_results and material_results.get('metadatas') else []

        context_parts = []
        if relevant_material_docs:
            for i, doc_text in enumerate(relevant_material_docs):
                metadata = relevant_material_metadatas[i]
                if metadata.get('original_row_json'):
                    try:
                        original_row = json.loads(metadata['original_row_json'])
                        context_parts.append(f"--- Contexto de Material '{metadata.get('table_name', 'N/A')}' (Linha Original):\n{json.dumps(original_row, indent=2)}")
                    except json.JSONDecodeError:
                        context_parts.append(f"--- Contexto de Material ({metadata.get('table_name', 'N/A')}): {doc_text}")
                else:
                    context_parts.append(f"--- Contexto Documento ({metadata.get('source_type', 'N/A')}): {doc_text}")
        else:
            context_parts.append("Nenhum contexto relevante encontrado no material didático.")
        
        material_context_string = "\n\n".join(context_parts)

        messages_for_grok = []
        messages_for_grok.append({"role": "system", "content": "Você é um assistente de IA. Use o contexto fornecido e o histórico de chat para responder à pergunta do usuário. Se a resposta não puder ser encontrada no contexto fornecido ou no histórico, diga 'Não tenho informações suficientes nos dados fornecidos para responder a esta pergunta.' Não use seu conhecimento prévio além do contexto."})
        
        for msg in recent_chat_messages:
            messages_for_grok.append({"role": msg['role'], "content": msg['content']})

        messages_for_grok.append({"role": "user", "content": f"Contexto do Material: {material_context_string}\n\nPergunta do Usuário: {query}"})

        grok_response = call_grok_llm(messages_for_grok)

        save_chat_message(user_id, query, "user", chat_history_collection_name)
        if grok_response:
            save_chat_message(user_id, grok_response, "assistant", chat_history_collection_name)

        return grok_response

    except Exception as e:
        return f"Ocorreu um erro no RAG: {e}"


if __name__ == "__main__":
    current_user_id = "meu_usuario_demonstracao"

    collection_name_material = "MaterialOriginal"
    collection_name_historico = "HistoricoConversaIA"
    collection_name_peca_conteudo = "PecaConteudo"
    collection_name_disciplina = "Disciplina"
    collection_name_progresso = "ProgressoAlunoCurso"
    collection_name_aluno = "Aluno"

    for col_name in [
        collection_name_material,
        collection_name_historico,
        collection_name_peca_conteudo,
        collection_name_disciplina,
        collection_name_progresso,
        collection_name_aluno
    ]:
        try:
            chroma_client.delete_collection(name=col_name)
            print(f"Coleção '{col_name}' limpa (se existia).")
        except Exception:
            pass

    material_original_data = [
        {
            "ID": "MAT001",
            "uri_brightspace": "https://brightspace.com/cursos/eng_software/bd",
            "data_upload_brightspace": "2024-06-28",
            "id_disciplina": "DISC001",
            "nome_arquivo": "Introducao_Bancos_Dados.pdf",
            "tipo_arquivo": "pdf",
            "status_processamento": "processado",
            "hash_conteudo": "abcdef1234567890",
            "tamanho_bytes": 10240,
            "conteudo_texto": "Está com dificuldade para encontrar a matéria? Qual matéria você procura? Fechando este chat, na aba (CURSO), você encontra a lista de (matérias) lá você encontra a matéria 'x' que procura. Está com dúvida sobre como checar suas próximas matérias? Na aba Mentor clique em Meu Curso. Após isso clique em Matriz Curricular. Assim você pode verificar as matérias que você aprenderá e que já aprendeu baixando um relatório. Basta cliclar no canto superior direito em 'Executar Relatório'"
            
        },
        {
            "ID": "MAT002",
            "uri_brightspace": "https://brightspace.com/cursos/eng_software/nosql",
            "data_upload_brightspace": "2024-07-01",
            "id_disciplina": "DISC001",
            "nome_arquivo": "Bancos_NoSQL_e_Distributed.pdf",
            "tipo_arquivo": "pdf",
            "status_processamento": "processado",
            "hash_conteudo": "fedcba9876543210",
            "tamanho_bytes": 8192,
            "conteudo_texto": "Quer saber sobre suas notas? Vamos lá! Primeiro vá clique na aba Mentor acima, após isso clique em (Meu Curso) e Por ultimo cli que em atividades realizadas!"
        }
    ]

    peca_conteudo_data = [
        {"id_pedaco": "PC001", "id_disciplina": "DISC001", "titulo": "Capítulo 1: Introdução", "tipo": "Texto", "conteudo_sumarizado": "Visão geral sobre bancos de dados."},
        {"id_pedaco": "PC002", "id_disciplina": "DISC001", "titulo": "Seção 2.1: Modelagem de Dados", "tipo": "Vídeo", "conteudo_sumarizado": "Explica o processo de modelagem de dados para bancos relacionais."}
    ]

    disciplina_data = [
        {"id_disciplina": "DISC001", "nome_disciplina": "Banco de Dados I", "ementa": "Introdução a conceitos de bancos de dados, modelagem relacional, SQL.", "carga_horaria": 80},
        {"id_disciplina": "DISC002", "nome_disciplina": "Programação Web", "ementa": "Desenvolvimento de aplicações web, front-end e back-end.", "carga_horaria": 120}
    ]

    progresso_aluno_data = [
        {"id_progresso": "PRG001", "id_aluno": "ALN001", "id_disciplina": "DISC001", "percentual_concluido": 75, "data_ultima_atividade": "2024-06-25"},
        {"id_progresso": "PRG002", "id_aluno": "ALN002", "id_disciplina": "DISC001", "percentual_concluido": 30, "data_ultima_atividade": "2024-06-20"}
    ]

    aluno_data = [
        {"id_aluno": "ALN001", "nome_aluno": "Carlos Silva", "email": "carlos.s@email.com", "curso": "ADS"},
        {"id_aluno": "ALN002", "nome_aluno": "Juliana Lima", "email": "juliana.l@email.com", "curso": "ADS"}
    ]

    print(f"\n--- Ingerindo MaterialOriginal na coleção '{collection_name_material}' ---")
    ingest_data_into_chroma(material_original_data, collection_name_material, current_user_id)
    print("Ingestão do material didático concluída.")

    chroma_client.get_or_create_collection(name=collection_name_historico)
    print(f"Coleção '{collection_name_historico}' inicializada para histórico de chat.")
    
    print(f"\n--- Ingerindo PeçaConteudo na coleção '{collection_name_peca_conteudo}' ---")
    ingest_data_into_chroma(peca_conteudo_data, collection_name_peca_conteudo, current_user_id, id_field="id_pedaco")

    print(f"\n--- Ingerindo Disciplina na coleção '{collection_name_disciplina}' ---")
    ingest_data_into_chroma(disciplina_data, collection_name_disciplina, current_user_id, id_field="id_disciplina")

    print(f"\n--- Ingerindo ProgressoAlunoCurso na coleção '{collection_name_progresso}' ---")
    ingest_data_into_chroma(progresso_aluno_data, collection_name_progresso, current_user_id, id_field="id_progresso")

    print(f"\n--- Ingerindo Aluno na coleção '{collection_name_aluno}' ---")
    ingest_data_into_chroma(aluno_data, collection_name_aluno, current_user_id, id_field="id_aluno")

    print("\n" + "="*50 + "\n")
    print("--- INÍCIO DA CONVERSA DEMONSTRATIVA ---")

    print("\n--- Verificando o histórico completo salvo no ChromaDB para 'meu_usuario_demonstracao' ---")
    all_history_for_user = get_recent_chat_history(current_user_id, n_messages=100) 
    for i, msg in enumerate(all_history_for_user):
        print(f"[{i+1}] {msg['role'].capitalize()}: {msg['content']}")

