# ⚓ Batalha Naval

Um jogo de Batalha Naval multiplayer em tempo real com estética futurista, radar tático e combate sincronizado via WebSockets.

## 🚀 Sobre o Projeto

Este projeto foi desenvolvido para oferecer uma experiência imersiva de combate naval diretamente no navegador. O diferencial reside na interface "Glassmorphism" e no sistema de comunicação via **Ably Realtime**, permitindo que jogadores se enfrentem globalmente com baixa latência.

### 🛠️ Tecnologias Utilizadas

*   **HTML5 & CSS3**: Estrutura e estilização avançada com animações de ondas e balanço de navios.
*   **JavaScript (ES6+)**: Lógica de jogo, posicionamento aleatório de frotas e manipulação do DOM.
*   **Ably Realtime**: Infraestrutura de Pub/Sub para comunicação multiplayer e presença global.
*   **FontAwesome**: Ícones táticos para navios, explosões e radares.

## 🌊 Funcionalidades Principais

*   **Radar Tático Realista**: Sistema de sonar que detecta blips de frotas aliadas (azul) e inimigas (vermelho).
*   **Mira Customizada**: Cursor tático em estilo de alvo militar que reage ao turno do jogador.
*   **Multiplayer em Tempo Real**: Sincronização de ataques e resultados através de canais dedicados.
*   **Design Responsivo**: Interface adaptável para diferentes tamanhos de tela, mantendo a experiência do sonar.
*   **Feedback Visual de Combate**: Animações de explosão (`hit`) e sinalização de tiros na água (`miss`).

## 🎮 Como Jogar

1.  Acesse o link do projeto.
2.  Insira seu nome de Almirante na tela de login.
3.  Seu tabuleiro será gerado automaticamente com navios posicionados.
4.  Aguarde o sinal de "SUA VEZ" no painel central.
5.  Utilize a mira vermelha para selecionar uma coordenada no grid inimigo.
6.  Afunde a frota adversária para vencer a batalha!

## 🔧 Configuração Local

Se desejar rodar o projeto localmente para desenvolvimento:

1. Clone o repositório:
   ```bash
   git clone [https://github.com/seu-usuario/batalha-naval.git](https://github.com/seu-usuario/batalha-naval.git)
