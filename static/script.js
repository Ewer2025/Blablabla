document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do Chat ---
    const ferozImage = document.getElementById('ferozImage');
    const chatOverlay = document.getElementById('chatOverlay');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const messageForm = document.getElementById('messageForm');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const messageContainer = document.getElementById('messageContainer');

    // --- Elementos do Modal de Grupos ---
    const openGroupsModalBtn = document.getElementById('openGroupsModalBtn');
    const groupsModalOverlay = document.getElementById('groupsModalOverlay');
    const closeGroupsModalBtn = document.getElementById('closeGroupsModalBtn');
    const groupSearchInput = document.getElementById('groupSearchInput');
    const groupSearchResults = document.getElementById('groupSearchResults');

    // --- Elementos de Acessibilidade ---
    const increaseFontBtn = document.getElementById('increaseFontBtn');
    const decreaseFontBtn = document.getElementById('decreaseFontBtn');
    const toggleContrastBtn = document.getElementById('toggleContrastBtn');
    const toggleGrayscaleBtn = document.getElementById('toggleGrayscaleBtn');
    const toggleAudioDescriptionBtn = document.getElementById('toggleAudioDescriptionBtn');
    const audioDescriptionPlayer = document.getElementById('audioDescriptionPlayer'); // Elemento de áudio, mantido mas não usado diretamente aqui

    // --- Elementos de Upload de Vídeo no Chat ---
    const videoUploadInput = document.getElementById('videoUploadInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileUploadPreview = document.getElementById('fileUploadPreview');
    const cancelUploadBtn = document.getElementById('cancelUploadBtn');

    // --- Variáveis Globais de Estado do Jogo (Gamificação) ---
    let currentXP = 0; // XP atual do jogador
    let level = 1;     // Nível atual do jogador
    let xpToNextLevel = 100; // XP necessário para o próximo nível
    let currentHearts = 3;   // Corações atuais do jogador
    const maxHearts = 3;     // Máximo de corações que o jogador pode ter
    let isGameOver = false;  // Indica se o jogo acabou

    // --- Elementos do DOM da Gamificação ---
    const levelDisplay = document.getElementById('levelDisplay');
    const xpDisplay = document.getElementById('xpDisplay');
    const xpToNextLevelDisplay = document.getElementById('xpToNextLevelDisplay');
    const xpProgressBar = document.getElementById('xpProgressBar');
    const heartsDisplay = document.getElementById('heartsDisplay');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const gainXpButton = document.getElementById('gainXpButton');
    const loseHeartButton = document.getElementById('loseHeartButton');
    const resetButton = document.getElementById('resetButton');

    // --- Variáveis de Acessibilidade/Chat ---
    let chatHistory = [];
    let currentFontSize = 16; // Base font size in pixels (corresponds to 1rem)
    const FONT_SIZE_STEP = 2; // Step for font size adjustment
    let audioDescriptionEnabled = false;
    let selectedFile = null; // To store the file object for upload

    // --- Funções Auxiliares de Acessibilidade ---
    function speak(text) {
        if (!audioDescriptionEnabled) return;
        stopSpeaking(); // Stop any current speech before starting new one
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR'; // Ensure Portuguese voice is preferred
        window.speechSynthesis.speak(utterance);
    }

    function stopSpeaking() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    }

    // --- Funções do Chat ---
    function addMessageToUI(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        speak(`${sender === 'user' ? 'Você disse' : 'Feroz disse'}: ${text}`);
    }

    // Mensagens iniciais
    const initialMessages = [
        { role: "ai", content: "Olá! Sou o Feroz, seu Tutor Inteligente. No que posso ajudar hoje?" },
        { role: "ai", content: "Você pode me enviar perguntas, ou até mesmo um vídeo para eu analisar sua apresentação!" }
    ];
    initialMessages.forEach(m => {
        addMessageToUI(m.content, m.role);
        chatHistory.push(m);
    });

    // Efeito de Abertura do Feroz (animação complexa)
    ferozImage.addEventListener('click', () => {
        ferozImage.classList.add('feroz-animation');
        speak("Feroz, o tutor inteligente, está abrindo o chat para você. Preparando a análise de apresentações!");

        setTimeout(() => {
            ferozImage.classList.remove('feroz-animation');
            chatOverlay.classList.add('visible');
            userInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000); // Duration of the Feroz animation
    });

    closeChatBtn.addEventListener('click', () => {
        chatOverlay.classList.remove('visible');
        speak("Chat fechado.");
    });

    chatOverlay.addEventListener('click', (e) => {
        if (e.target === chatOverlay) {
            chatOverlay.classList.remove('visible');
            speak("Chat fechado.");
        }
    });

    function showMessage(msg, type = 'success') {
        messageContainer.textContent = msg;
        messageContainer.style.backgroundColor = type === 'error' ? 'var(--color-error)' : 'var(--color-accent-green)';
        messageContainer.style.display = 'block';
        speak(msg); // Reads the status message
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 3000);
    }

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (selectedFile) {
            // Handle video analysis
            const videoFileName = selectedFile.name;
            addMessageToUI(`Estou enviando meu vídeo "${videoFileName}" para análise!`, 'user');
            chatHistory.push({ role: "user", content: `Vídeo para análise: ${videoFileName}` });
            resetFileUpload(); // Clear selected file after "sending"

            sendMessageBtn.disabled = true;
            loadingIndicator.style.display = 'inline-block';
            speak(`Feroz está analisando o vídeo ${videoFileName}. Por favor, aguarde.`);

            // Simulate AI analysis and response
            setTimeout(() => {
                const analysisResponse = `Olá! Analisei seu vídeo "${videoFileName}". Percebi que sua introdução foi muito cativante! Para aprimorar, talvez tente variar o tom de voz em pontos chave para manter o público ainda mais engajado. No geral, um ótimo trabalho!`;
                addMessageToUI(analysisResponse, 'ai');
                chatHistory.push({ role: "ai", content: analysisResponse });
                sendMessageBtn.disabled = false;
                loadingIndicator.style.display = 'none';
                speak("Análise do vídeo concluída.");
                // Simular ganho de XP após a análise do vídeo (exemplo)
                gainXP(50);
            }, 3000); // Simulate 3 seconds of analysis
        } else {
            // Handle regular text message
            const userMessage = userInput.value.trim();
            if (userMessage === '') return;

            addMessageToUI(userMessage, 'user');
            chatHistory.push({ role: "user", content: userMessage });
            userInput.value = '';

            sendMessageBtn.disabled = true;
            loadingIndicator.style.display = 'inline-block';
            speak("Enviando mensagem...");

            try {
                const backendResponse = await fetch("/api/perguntar", { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        pergunta: userMessage, 
                        user_id: "meu_usuario_demonstracao", 
                        chat_history: chatHistory 
                    }),
                });

                if (!backendResponse.ok) {
                    const errorData = await backendResponse.json();
                    throw new Error(errorData.erro || 'Erro na resposta do backend');
                }

                const data = await backendResponse.json();
                const aiResponse = data.resposta;

                addMessageToUI(aiResponse, 'ai');
                chatHistory.push({ role: "ai", content: aiResponse });

            } catch (error) {
                console.error("Erro ao enviar mensagem ou obter resposta da IA:", error);
                addMessageToUI("Desculpe, houve um erro ao processar sua solicitação. Tente novamente mais tarde.", "ai");
                showMessage("Erro: " + error.message, "error");
                chatHistory.push({ role: "ai", content: "Desculpe, houve um erro ao processar sua solicitação. Tente novamente mais tarde." });
            } finally {
                sendMessageBtn.disabled = false;
                loadingIndicator.style.display = 'none';
                speak("Mensagem enviada.");
                // Simular ganho de XP após uma interação de chat (exemplo)
                gainXP(10);
            }
        }
    });

    // --- Funções do Modal de Grupos ---
    openGroupsModalBtn.addEventListener('click', () => {
        groupsModalOverlay.classList.add('visible');
        groupSearchInput.focus();
        speak("Modal de grupos aberto. Digite para pesquisar grupos de estudo.");
    });

    closeGroupsModalBtn.addEventListener('click', () => {
        groupsModalOverlay.classList.remove('visible');
        speak("Modal de grupos fechado.");
    });

    groupsModalOverlay.addEventListener('click', (e) => {
        if (e.target === groupsModalOverlay) {
            groupsModalOverlay.classList.remove('visible');
            speak("Modal de grupos fechado.");
        }
    });

    // Simple frontend group search logic
    const allGroupsElements = Array.from(groupSearchResults.children);
    const allGroupsData = allGroupsElements.map(item => ({
        element: item,
        name: item.dataset.groupName.toLowerCase()
    }));

    groupSearchInput.addEventListener('keyup', () => {
        const searchTerm = groupSearchInput.value.toLowerCase();
        let anyGroupVisible = false;
        
        allGroupsData.forEach(group => {
            if (group.name.includes(searchTerm)) {
                group.element.style.display = 'flex';
                anyGroupVisible = true;
            } else {
                group.element.style.display = 'none';
            }
        });

        const existingNoResults = document.querySelector('.group-item.no-results');
        if (!anyGroupVisible && searchTerm !== '') {
            if (!existingNoResults) {
                const noResults = document.createElement('div');
                noResults.classList.add('group-item', 'no-results');
                noResults.textContent = 'Nenhum grupo encontrado com este nome.';
                groupSearchResults.appendChild(noResults);
                speak("Nenhum grupo encontrado.");
            }
        } else if (existingNoResults) {
            existingNoResults.remove();
        }
    });

    // --- Animação das Barras de Progresso (Efeito de Preenchimento com XP) ---
    // Esta seção é para as barras de progresso ESTÁTICAS na interface principal.
    // O XP e os corações são um sistema de gamificação SEPARADO e dinâmico.
    const progressBarElements = document.querySelectorAll('.progress-bar');
    progressBarElements.forEach(bar => {
        const progress = bar.dataset.progress; 
        const xpGain = bar.dataset.xp;
        const xpPopup = bar.nextElementSibling; // The xp-gain-popup element

        if (progress && xpGain && xpPopup) {
            bar.style.width = '0%';
            bar.textContent = '0%';
            xpPopup.style.opacity = '0';
            xpPopup.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                bar.style.width = `${progress}%`;
                
                let currentTextProgress = 0;
                const textInterval = setInterval(() => {
                    if (currentTextProgress < progress) {
                        currentTextProgress++;
                        bar.textContent = `${currentTextProgress}%`;
                    } else {
                        clearInterval(textInterval);
                        xpPopup.textContent = `+${xpGain} XP!`;
                        xpPopup.style.opacity = '1';
                        xpPopup.style.transform = 'translateY(0) scale(1.1)';
                        xpPopup.classList.add('xp-animation');
                        
                        setTimeout(() => {
                            xpPopup.classList.remove('xp-animation');
                            xpPopup.style.opacity = '0';
                            xpPopup.style.transform = 'translateY(-20px)';
                        }, 1500);
                    }
                }, 1000 / progress); 
            }, 300);
        }
    });

    // Level circle animation
    const levelCircle = document.querySelector('.level-circle');
    if (levelCircle) { // Verifica se o elemento existe
        levelCircle.style.transform = 'scale(0.8)';
        levelCircle.style.opacity = '0';
        setTimeout(() => {
            levelCircle.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.5s ease-out';
            levelCircle.style.transform = 'scale(1)';
            levelCircle.style.opacity = '1';
            speak(`Seu nível atual é ${levelCircle.textContent}.`);
        }, 300);
    }

    // Group join button effect (example)
    const joinGroupButtons = document.querySelectorAll('.join-group-btn');
    joinGroupButtons.forEach(button => {
        button.addEventListener('click', () => {
            const groupName = button.getAttribute('aria-label').replace('Entrar no grupo: ', '');
            showMessage(`Você tentou entrar no grupo: ${groupName}!`, 'info');
            speak(`Solicitação para entrar no grupo ${groupName} enviada.`);
        });
    });

    const createGroupButton = document.querySelector('.create-group-btn');
    if (createGroupButton) {
        createGroupButton.addEventListener('click', () => {
            showMessage('Criar novo grupo! (Funcionalidade a ser implementada no backend)', 'info');
            speak("Você clicou em criar novo grupo.");
        });
    }

    // --- Funções de Acessibilidade ---
    increaseFontBtn.addEventListener('click', () => {
        currentFontSize = Math.min(currentFontSize + FONT_SIZE_STEP, 24); // Max font size
        document.documentElement.style.fontSize = `${currentFontSize}px`;
        showMessage(`Tamanho da fonte: ${currentFontSize}px`, 'info');
        speak(`Tamanho da fonte alterado para ${currentFontSize} pixels.`);
    });

    decreaseFontBtn.addEventListener('click', () => {
        currentFontSize = Math.max(currentFontSize - FONT_SIZE_STEP, 12); // Min font size
        document.documentElement.style.fontSize = `${currentFontSize}px`;
        showMessage(`Tamanho da fonte: ${currentFontSize}px`, 'info');
        speak(`Tamanho da fonte alterado para ${currentFontSize} pixels.`);
    });

    toggleContrastBtn.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        if (document.body.classList.contains('high-contrast')) {
            showMessage('Modo de Alto Contraste ATIVADO', 'info');
            if (document.body.classList.contains('grayscale-mode')) {
                document.body.classList.remove('grayscale-mode');
            }
            speak("Modo de alto contraste ativado.");
        } else {
            showMessage('Modo de Alto Contraste DESATIVADO', 'info');
            speak("Modo de alto contraste desativado.");
        }
    });

    toggleGrayscaleBtn.addEventListener('click', () => {
        document.body.classList.toggle('grayscale-mode');
        if (document.body.classList.contains('grayscale-mode')) {
            showMessage('Modo Escala de Cinza ATIVADO', 'info');
            if (document.body.classList.contains('high-contrast')) {
                document.body.classList.remove('high-contrast');
            }
            speak("Modo escala de cinza ativado.");
        } else {
            showMessage('Modo Escala de Cinza DESATIVADO', 'info');
            speak("Modo escala de cinza desativado.");
        }
    });

    toggleAudioDescriptionBtn.addEventListener('click', () => {
        audioDescriptionEnabled = !audioDescriptionEnabled;
        if (audioDescriptionEnabled) {
            showMessage('Áudio Descrição ATIVADA', 'success');
            speak("Áudio descrição ativada. Agora o sistema falará as descrições.");
        } else {
            stopSpeaking(); // Stops any ongoing speech
            showMessage('Áudio Descrição DESATIVADA', 'info');
            speak("Áudio descrição desativada.");
        }
    });

    // --- Funções de Upload de Vídeo no Chat ---
    videoUploadInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileNameDisplay.textContent = selectedFile.name;
            fileUploadPreview.style.display = 'flex'; // Show the preview area
            cancelUploadBtn.style.display = 'inline-block';
            userInput.placeholder = `Envie "${selectedFile.name}" para análise...`;
            userInput.disabled = true; // Disable text input when file is selected
            sendMessageBtn.textContent = 'Analisar';
            speak(`Vídeo selecionado: ${selectedFile.name}. Clique em Analisar para iniciar.`);
        } else {
            resetFileUpload();
        }
    });

    cancelUploadBtn.addEventListener('click', () => {
        resetFileUpload();
        speak("Upload de vídeo cancelado.");
    });

    function resetFileUpload() {
        selectedFile = null;
        videoUploadInput.value = ''; // Clear the file input
        fileNameDisplay.textContent = '';
        fileUploadPreview.style.display = 'none';
        cancelUploadBtn.style.display = 'none';
        userInput.placeholder = "Digite sua mensagem...";
        userInput.disabled = false; // Re-enable text input
        sendMessageBtn.textContent = 'Enviar';
    }

    // --- Funções do Sistema de Gamificação (XP e Corações) ---

    /**
     * Atualiza a exibição de XP, nível e barra de progresso.
     * Deve ser chamada sempre que `currentXP`, `level` ou `xpToNextLevel` mudarem.
     */
    function updateXPDisplay() {
        // Verifica se os elementos existem antes de tentar acessá-los
        if (levelDisplay && xpDisplay && xpToNextLevelDisplay && xpProgressBar) {
            levelDisplay.textContent = level;
            xpDisplay.textContent = currentXP;
            xpToNextLevelDisplay.textContent = xpToNextLevel;

            const progressPercentage = (currentXP / xpToNextLevel) * 100;
            xpProgressBar.style.width = `${progressPercentage}%`;
        }
    }

    /**
     * Atualiza a exibição dos corações.
     * Renderiza ícones de coração cheios e vazios.
     * Deve ser chamada sempre que `currentHearts` mudar.
     */
    function updateHeartsDisplay() {
        if (heartsDisplay) { // Verifica se o elemento existe
            heartsDisplay.innerHTML = ''; // Limpa a exibição atual
            for (let i = 0; i < maxHearts; i++) {
                const heartIcon = document.createElement('i');
                if (i < currentHearts) {
                    heartIcon.classList.add('fas', 'fa-heart', 'text-red-500'); // Coração sólido
                } else {
                    heartIcon.classList.add('far', 'fa-heart', 'text-gray-300'); // Coração vazio
                }
                heartsDisplay.appendChild(heartIcon);
            }
        }
    }

    /**
     * Adiciona XP ao jogador.
     * Verifica se o jogador subiu de nível.
     * @param {number} amount - A quantidade de XP a ser adicionada.
     */
    function gainXP(amount) {
        if (isGameOver) {
            speak("Jogo encerrado. Reinicie para ganhar mais XP.");
            return;
        }

        currentXP += amount;
        speak(`Ganhou ${amount} pontos de experiência!`);

        while (currentXP >= xpToNextLevel) {
            currentXP -= xpToNextLevel;
            level++;
            // Aumenta a quantidade de XP necessária para o próximo nível
            xpToNextLevel = Math.floor(xpToNextLevel * 1.2); // Cada nível requer 20% a mais
            showMessage(`Parabéns! Você alcançou o Nível ${level}!`, 'success');
            speak(`Parabéns! Você alcançou o Nível ${level}!`);
        }
        updateXPDisplay();
    }

    /**
     * Remove um coração do jogador.
     * Verifica se o jogo acabou.
     */
    function loseHeart() {
        if (isGameOver) {
            speak("Jogo encerrado. Não é possível perder mais corações.");
            return;
        }

        currentHearts--;
        speak("Você perdeu um coração!");
        updateHeartsDisplay();

        if (currentHearts <= 0) {
            isGameOver = true;
            if (gameOverMessage) { // Verifica se o elemento existe
                gameOverMessage.classList.remove('hidden');
                speak("Game Over! Seus corações acabaram. Reinicie o jogo.");
            }
            // Desativa botões de ação
            if (gainXpButton) gainXpButton.disabled = true;
            if (loseHeartButton) loseHeartButton.disabled = true;
            showMessage('Game Over! Seus corações acabaram.', 'error');
        }
    }

    /**
     * Reinicia o jogo para os valores iniciais.
     */
    function resetGame() {
        currentXP = 0;
        level = 1;
        xpToNextLevel = 100;
        currentHearts = maxHearts;
        isGameOver = false;

        updateXPDisplay();
        updateHeartsDisplay();
        if (gameOverMessage) {
            gameOverMessage.classList.add('hidden');
        }
        // Reativa botões de ação
        if (gainXpButton) gainXpButton.disabled = false;
        if (loseHeartButton) loseHeartButton.disabled = false;
        showMessage('Jogo Reiniciado!', 'info');
        speak("O jogo foi reiniciado.");
    }

    // --- Event Listeners para os Botões de Gamificação ---
    if (gainXpButton) {
        gainXpButton.addEventListener('click', () => gainXP(25)); // Ganha 25 XP por clique
        addAudioDescriptionHover('gainXpButton', 'Botão para ganhar experiência. Clique para simular a conclusão de uma tarefa.');
    }
    if (loseHeartButton) {
        loseHeartButton.addEventListener('click', loseHeart);
        addAudioDescriptionHover('loseHeartButton', 'Botão para perder um coração. Clique para simular um erro ou desafio não superado.');
    }
    if (resetButton) {
        resetButton.addEventListener('click', resetGame);
        addAudioDescriptionHover('resetButton', 'Botão para reiniciar o jogo de gamificação.');
    }


    // --- Audio Descriptions on Mouseover (Example - Remove or add more as needed) ---
    const addAudioDescriptionHover = (elementId, text) => {
        const element = document.getElementById(elementId);
        if (element) {
            let isSpeaking = false;
            element.addEventListener('mouseenter', () => {
                if (audioDescriptionEnabled && !isSpeaking) {
                    speak(text);
                    isSpeaking = true;
                }
            });
            element.addEventListener('mouseleave', () => {
                stopSpeaking();
                isSpeaking = false;
            });
        }
    };

    // Examples of Audio Description on hover
    addAudioDescriptionHover('ferozImage', 'Foto do Feroz, o tutor inteligente.');
    addAudioDescriptionHover('openGroupsModalBtn', 'Botão para abrir grupos de estudo.');
    addAudioDescriptionHover('increaseFontBtn', 'Aumentar tamanho da fonte.');
    addAudioDescriptionHover('decreaseFontBtn', 'Diminuir tamanho da fonte.');
    addAudioDescriptionHover('toggleContrastBtn', 'Alternar modo de alto contraste.');
    addAudioDescriptionHover('toggleGrayscaleBtn', 'Alternar modo escala de cinza.');
    addAudioDescriptionHover('toggleAudioDescriptionBtn', 'Alternar descrição em áudio.');
    addAudioDescriptionHover('videoUploadInput', 'Botão para selecionar arquivo de vídeo para upload.');
    addAudioDescriptionHover('sendMessageBtn', 'Botão para enviar mensagem ou analisar vídeo.');
    addAudioDescriptionHover('cancelUploadBtn', 'Botão para cancelar o upload do vídeo.');

    // Add audio description for section titles on hover
    document.querySelectorAll('.section-title').forEach(title => {
        addAudioDescriptionHover(title.id || title.closest('.card').id || `section-title-${title.textContent.replace(/\s+/g, '-')}`, `Seção ${title.textContent}.`);
    });

    // --- Inicialização do Jogo ---
    // Chama as funções de atualização para garantir que a UI reflita o estado inicial
    // Ou o estado salvo, se você implementar localStorage mais tarde
    updateXPDisplay();
    updateHeartsDisplay();
});
