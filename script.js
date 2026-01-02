document.addEventListener("DOMContentLoaded", () => {
  // ==================== CONFIGURAÇÃO DO FIREBASE ====================
  const firebaseConfig = {
    apiKey: "AIzaSyDPPbSA8SB-L_giAhWIqGbPGSMRBDTPi40",
    authDomain: "master-ecossistemaprofessor.firebaseapp.com",
    databaseURL: "https://master-ecossistemaprofessor-default-rtdb.firebaseio.com",
    projectId: "master-ecossistemaprofessor",
    storageBucket: "master-ecossistemaprofessor.firebasestorage.app",
    messagingSenderId: "532224860209",
    appId: "1:532224860209:web:686657b6fae13b937cf510",
    measurementId: "G-B0KMX4E67D"
  };

  // Inicializar Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // Teste de conexão com Firestore
  console.log("Iniciando teste de conexão com Firestore...");
  db.collection("cadastroClientes").limit(1).get()
    .then(snapshot => {
      console.log("✅ Conexão com Firestore OK. Total de documentos:", snapshot.size);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log("📄 Exemplo de documento:", doc.id, doc.data());
      }
    })
    .catch(error => {
      console.error("❌ Erro na conexão com Firestore:", error);
    });

  // ==================== ELEMENTOS PRINCIPAIS ====================
  const sections = {
    apresentacao: document.getElementById("section-apresentacao"),
    verificacao: document.getElementById("section-verificacao"),
    calendario: document.getElementById("section-calendario"),
    selecaoAulas: document.getElementById("section-selecaoAulas"),
    calendarioConfirmacao: document.getElementById("section-calendario-confirmacao"),
    confirmacaoEquipe: document.getElementById("section-confirmacaoEquipe"),
    confirmacaoAulas: document.getElementById("section-confirmacaoAulas"), // Alterado para nova seção
    termos: document.getElementById("section-termos"),
    confirmacaoPagamento: document.getElementById("section-confirmacaoPagamento"), // Nova seção
    fim: document.getElementById("section-fim")
  };

  // Elementos do modal
  const modal = document.getElementById("modal-repeticao");
  const modalTitulo = document.getElementById("modal-titulo");
  const modalMensagem = document.getElementById("modal-mensagem");
  const modalFechar = document.getElementById("modal-fechar");
  const modalAplicar = document.getElementById("modal-aplicar");

  // Modal para professores não encontrados
  const modalProfessoresNaoEncontrados = document.getElementById("modal-professores-nao-encontrados");
  const modalProfessoresOk = document.getElementById("modal-professores-ok");

  // Modal para duplicar aula
  const modalDuplicarAula = document.getElementById("modal-duplicar-aula");
  const modalDuplicarNao = document.getElementById("modal-duplicar-nao");
  const modalDuplicarSim = document.getElementById("modal-duplicar-sim");

  // Modais para termos
  const modalTermoServico = document.getElementById("modal-termo-servico");
  const modalTermoPrivacidade = document.getElementById("modal-termo-privacidade");
  const modalTermoServicoFechar = document.getElementById("modal-termo-servico-fechar");
  const modalTermoPrivacidadeFechar = document.getElementById("modal-termo-privacidade-fechar");
  const botaoTermoServico = document.getElementById("botao-termo-servico");
  const botaoTermoPrivacidade = document.getElementById("botao-termo-privacidade");

  // ==================== ESTADO GLOBAL ====================
  const state = {
    cpf: "",
    selectedDays: [],
    currentMonth: new Date(),
    aulas: [],
    // Variáveis para aulas variadas com suporte a múltiplos cards por dia
    cardsAulasVariadas: [], // Array de objetos {id, day, materia, horario, duracao}
    cardParaDuplicar: null, // ID do card que será duplicado
    // Lista de professores do banco de dados
    professoresDB: [],
    // Lista de professores anteriores do cliente
    professoresAnteriores: {}, // {materia: [professores]}
    materias: [
      "Biologia", "Ciências", "Filosofia", "Física", "Geografia",
      "História", "Língua Portuguesa", "Língua Inglesa", "Matemática", 
      "Química", "Sociologia", "Pedagogia"
    ].sort(),
    tipoAgendamento: null, // 'padrao' ou 'variadas'
    manterProfessores: false,
    nomeCliente: "",
    nomeAluno: "",
    estudantes: [], // Array de estudantes vinculados ao cliente
    codigoContratacao: "",
    modoPagamento: "", // "Cartão de crédito" ou "Pagamento PIX"
    statusPagamento: "A pagar", // Valor padrão
    statusAula: "Aguardando aula" // Valor padrão
  };

  // ==================== FUNÇÕES AUXILIARES ====================
  
  // Função para formatar lista de nomes de estudantes
  function formatarNomesEstudantes(estudantes) {
    if (!estudantes || estudantes.length === 0) {
      return "o aluno";
    }
    
    // Extrair apenas os nomes
    const nomes = estudantes.map(est => est.nome).filter(nome => nome && nome.trim() !== "");
    
    if (nomes.length === 0) {
      return "o aluno";
    }
    
    if (nomes.length === 1) {
      return nomes[0];
    }
    
    if (nomes.length === 2) {
      return `${nomes[0]} e ${nomes[1]}`;
    }
    
    // Para 3 ou mais estudantes
    const todosMenosUltimo = nomes.slice(0, -1);
    const ultimo = nomes[nomes.length - 1];
    
    return `${todosMenosUltimo.join(", ")} e ${ultimo}`;
  }

  // Funções para mostrar/ocultar loading
  function showLoading() {
    document.getElementById("loading-cpf").classList.remove("hidden");
    document.getElementById("input-cpf").disabled = true;
  }

  function hideLoading() {
    document.getElementById("loading-cpf").classList.add("hidden");
    document.getElementById("input-cpf").disabled = false;
  }

  // Navegação entre seções
  function showSection(section) {
    Object.values(sections).forEach(sec => sec.classList.add("hidden"));
    section.classList.remove("hidden");
    window.scrollTo(0, 0);
    
    // Esconder botões fixos se não for a seção de seleção de aulas
    const botoesFixos = document.getElementById("botoes-fixos");
    if (section.id === "section-selecaoAulas") {
      botoesFixos.classList.remove("hidden");
    } else {
      botoesFixos.classList.add("hidden");
    }
  }

  // ==================== CONFIGURAÇÃO DO CALENDÁRIO ====================
  function initCalendar() {
    const monthYear = document.getElementById("month-year");
    const calendarDays = document.getElementById("calendar-days");
    const prevBtn = document.getElementById("prev-month");
    const nextBtn = document.getElementById("next-month");

    function renderCalendar() {
      const year = state.currentMonth.getFullYear();
      const month = state.currentMonth.getMonth();
      
      monthYear.textContent = state.currentMonth.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      }).replace(/^\w/, c => c.toUpperCase());

      calendarDays.innerHTML = "";

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Dias vazios no início
      for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDays.appendChild(document.createElement("div"));
      }

      // Dias do mês
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement("div");
        dayElement.textContent = day;

        // Verificar se é passado
        if (date < today) {
          dayElement.classList.add("past");
        } else {
          // Verificar se está selecionado
          const isSelected = state.selectedDays.some(selected => 
            selected.toDateString() === date.toDateString()
          );
          
          if (isSelected) dayElement.classList.add("selected");
          
          // Adicionar evento de clique
          dayElement.addEventListener("click", () => toggleDaySelection(date, dayElement));
        }

        // Marcar dia atual
        if (date.toDateString() === today.toDateString()) {
          dayElement.classList.add("today");
        }

        calendarDays.appendChild(dayElement);
      }
    }

    function toggleDaySelection(date, element) {
      const index = state.selectedDays.findIndex(
        d => d.toDateString() === date.toDateString()
      );

      if (index === -1) {
        state.selectedDays.push(date);
        element.classList.add("selected");
      } else {
        state.selectedDays.splice(index, 1);
        element.classList.remove("selected");
      }
    }

    prevBtn.addEventListener("click", () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
      renderCalendar();
    });

    nextBtn.addEventListener("click", () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
      renderCalendar();
    });

    renderCalendar();
  }

  // Formatação de data
  function formatDate(date) {
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dia = date.getDate().toString().padStart(2, "0");
    const mes = (date.getMonth() + 1).toString().padStart(2, "0");
    const ano = date.getFullYear();
    const diaSemana = diasSemana[date.getDay()];
    
    return `${diaSemana} - ${dia}/${mes}/${ano}`;
  }

  // ==================== SEÇÃO 4: SELEÇÃO DE AULAS ====================
  function setupSelecaoAulas() {
    const btnAulasPadrao = document.getElementById("button-AulasPadrao");
    const btnAulasVariadas = document.getElementById("button-AulasVariadas");
    const contentPadrao = document.getElementById("aulas-padrao-content");
    const contentVariadas = document.getElementById("aulas-variadas-content");
    const btnAvancar = document.getElementById("selecao-avancar");
    const botoesRepeticao = document.getElementById("botoes-repeticao");
    
    // Popular matéria padrão
    const selectMateriaPadrao = document.getElementById("select-materia-padrao");
    selectMateriaPadrao.innerHTML = "<option value=''>Selecione a matéria que iremos estudar</option>";
    state.materias.forEach(materia => {
      const option = document.createElement("option");
      option.value = materia;
      option.textContent = materia;
      selectMateriaPadrao.appendChild(option);
    });

    // Resetar estado
    btnAulasPadrao.classList.remove("bg-orange-500", "text-white");
    btnAulasVariadas.classList.remove("bg-orange-500", "text-white");
    contentPadrao.classList.remove("expanded");
    contentVariadas.classList.remove("expanded");
    botoesRepeticao.classList.add("hidden");
    btnAvancar.disabled = true;
    state.tipoAgendamento = null;
    state.cardsAulasVariadas = [];
    state.cardParaDuplicar = null;

    btnAulasPadrao.addEventListener("click", () => {
      btnAulasPadrao.classList.add("bg-orange-500", "text-white");
      btnAulasVariadas.classList.remove("bg-orange-500", "text-white");
      contentPadrao.classList.add("expanded");
      contentVariadas.classList.remove("expanded");
      
      // Ocultar botões de repetição com animação
      botoesRepeticao.classList.remove("show");
      botoesRepeticao.classList.add("hide");
      setTimeout(() => {
        botoesRepeticao.classList.add("hidden");
      }, 300);
      
      state.tipoAgendamento = "padrao";
      verificarCamposPreenchidos();
      
      // Ajustar altura da seção
      setTimeout(() => {
        ajustarAlturaSelecaoAulas();
      }, 500);
    });

    btnAulasVariadas.addEventListener("click", () => {
      btnAulasVariadas.classList.add("bg-orange-500", "text-white");
      btnAulasPadrao.classList.remove("bg-orange-500", "text-white");
      contentVariadas.classList.add("expanded");
      contentPadrao.classList.remove("expanded");
      
      // Mostrar botões de repetição com animação
      botoesRepeticao.classList.remove("hide", "hidden");
      botoesRepeticao.classList.add("show");
      
      state.tipoAgendamento = "variadas";
      renderAulasVariadas();
      
      // Ajustar altura da seção
      setTimeout(() => {
        ajustarAlturaSelecaoAulas();
      }, 500);
    });

    // Adicionar eventos para verificar campos
    document.getElementById("select-materia-padrao").addEventListener("change", verificarCamposPreenchidos);
    document.getElementById("input-horario-padrao").addEventListener("change", verificarCamposPreenchidos);
    document.getElementById("select-duracao-padrao").addEventListener("change", verificarCamposPreenchidos);

    // Botões de repetição com modal
    document.getElementById("btn-repetir-horario").addEventListener("click", () => mostrarModal("horario"));
    document.getElementById("btn-repetir-disciplinas").addEventListener("click", () => mostrarModal("disciplinas"));
    document.getElementById("btn-repetir-duracao").addEventListener("click", () => mostrarModal("duracao"));

    // Configurar eventos do modal de duplicação
    modalDuplicarNao.addEventListener("click", () => {
      modalDuplicarAula.classList.add("hidden");
      state.cardParaDuplicar = null;
    });

    modalDuplicarSim.addEventListener("click", () => {
      if (state.cardParaDuplicar) {
        // Encontrar o card original
        const cardOriginal = state.cardsAulasVariadas.find(c => c.id === state.cardParaDuplicar);
        if (cardOriginal) {
          // Criar novo card com os mesmos dados
          const novoCard = {
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            day: cardOriginal.day,
            materia: cardOriginal.materia,
            horario: cardOriginal.horario,
            duracao: cardOriginal.duracao
          };
          
          // Adicionar após o card original
          const indexOriginal = state.cardsAulasVariadas.findIndex(c => c.id === state.cardParaDuplicar);
          state.cardsAulasVariadas.splice(indexOriginal + 1, 0, novoCard);
          
          // Re-renderizar
          renderAulasVariadas();
        }
      }
      modalDuplicarAula.classList.add("hidden");
      state.cardParaDuplicar = null;
    });
  }

  // Ajustar altura da seção de seleção de aulas
  function ajustarAlturaSelecaoAulas() {
    const cardInner = document.querySelector("#section-selecaoAulas .card-inner");
    const contentHeight = cardInner.scrollHeight;
    
    // Definir altura mínima baseada no conteúdo
    if (contentHeight > 400) {
      cardInner.style.minHeight = "auto";
      cardInner.style.height = "auto";
    }
  }

  // Mostrar modal de repetição
  function mostrarModal(tipo) {
    const mensagens = {
      horario: { titulo: "Repetir Horário", mensagem: "Esta ação irá replicar o mesmo horário para todas as aulas selecionadas." },
      disciplinas: { titulo: "Repetir Disciplinas", mensagem: "Esta ação irá aplicar a mesma disciplina para todas as aulas selecionadas." },
      duracao: { titulo: "Repetir Duração", mensagem: "Esta ação irá definir a mesma duração para todas as aulas selecionadas." }
    };
    
    modalTitulo.textContent = mensagens[tipo].titulo;
    modalMensagem.textContent = mensagens[tipo].mensagem;
    modal.classList.remove("hidden");
    
    // Configurar ação do botão aplicar
    modalAplicar.onclick = () => {
      switch(tipo) {
        case "horario": repetirHorario(); break;
        case "disciplinas": repetirDisciplinas(); break;
        case "duracao": repetirDuracao(); break;
      }
      modal.classList.add("hidden");
    };
  }

  // Fechar modal
  modalFechar.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Configurar evento para modal de professores não encontrados
  modalProfessoresOk.addEventListener("click", () => {
    modalProfessoresNaoEncontrados.classList.add("hidden");
  });

  // Verificar campos preenchidos
  function verificarCamposPreenchidos() {
    const btnAvancar = document.getElementById("selecao-avancar");
    
    if (state.tipoAgendamento === "padrao") {
      const materia = document.getElementById("select-materia-padrao").value;
      const horario = document.getElementById("input-horario-padrao").value;
      const duracao = document.getElementById("select-duracao-padrao").value;
      
      btnAvancar.disabled = !(materia && horario && duracao);
    } else if (state.tipoAgendamento === "variadas") {
      // Verificar se todos os cards têm todos os campos preenchidos
      const todosPreenchidos = state.cardsAulasVariadas.every(card => 
        card.materia && card.horario && card.duracao
      );
      
      btnAvancar.disabled = !todosPreenchidos || state.cardsAulasVariadas.length === 0;
    } else {
      btnAvancar.disabled = true;
    }
  }

  // Renderizar cards de aulas variadas
  function renderAulasVariadas() {
    const container = document.getElementById("aulas-variadas-container");
    
    // Se não houver cards criados ainda, criar um para cada dia selecionado
    if (state.cardsAulasVariadas.length === 0 && state.selectedDays.length > 0) {
      state.cardsAulasVariadas = state.selectedDays.sort((a, b) => a - b).map((day, index) => {
        return {
          id: `card-${Date.now()}-${index}`,
          day: day,
          materia: "",
          horario: "",
          duracao: ""
        };
      });
    }
    
    container.innerHTML = "";
    
    state.cardsAulasVariadas.forEach((card, index) => {
      const cardElement = createCardElement(card, index);
      container.appendChild(cardElement);
    });
    
    verificarCamposPreenchidos();
    
    // Scroll automático para o último card no container das aulas variadas
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }, 300);
  }

  // Criar elemento de card para aula variada
  function createCardElement(card, index) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "aula-card";
    cardDiv.dataset.cardId = card.id;

    // Título com a data
    const title = document.createElement("h4");
    title.className = "font-semibold mb-2 text-gray-800";
    title.textContent = formatDate(card.day);
    cardDiv.appendChild(title);

    // Select de matéria
    const selectMateria = document.createElement("select");
    selectMateria.className = "select-materia w-full rounded-lg border px-3 py-2 text-comfortaa mb-2";
    selectMateria.dataset.cardId = card.id;
    
    const optionDefault = document.createElement("option");
    optionDefault.value = "";
    optionDefault.textContent = "Selecione a matéria";
    selectMateria.appendChild(optionDefault);
    
    state.materias.forEach(materia => {
      const option = document.createElement("option");
      option.value = materia;
      option.textContent = materia;
      if (card.materia === materia) option.selected = true;
      selectMateria.appendChild(option);
    });
    
    selectMateria.addEventListener("change", (e) => {
      const cardId = e.target.dataset.cardId;
      const cardIndex = state.cardsAulasVariadas.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        state.cardsAulasVariadas[cardIndex].materia = e.target.value;
      }
      verificarCamposPreenchidos();
    });
    cardDiv.appendChild(selectMateria);

    // Input de horário
    const inputHorario = document.createElement("input");
    inputHorario.type = "time";
    inputHorario.className = "input-horario w-full rounded-lg border px-3 py-2 text-comfortaa mb-2";
    inputHorario.dataset.cardId = card.id;
    inputHorario.value = card.horario;
    inputHorario.addEventListener("change", (e) => {
      const cardId = e.target.dataset.cardId;
      const cardIndex = state.cardsAulasVariadas.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        state.cardsAulasVariadas[cardIndex].horario = e.target.value;
      }
      verificarCamposPreenchidos();
    });
    cardDiv.appendChild(inputHorario);

    // Select de duração
    const selectDuracao = document.createElement("select");
    selectDuracao.className = "select-duracao w-full rounded-lg border px-3 py-2 text-comfortaa";
    selectDuracao.dataset.cardId = card.id;
    
    const optionDuracaoDefault = document.createElement("option");
    optionDuracaoDefault.value = "";
    optionDuracaoDefault.textContent = "Selecione a duração";
    selectDuracao.appendChild(optionDuracaoDefault);
    
    const duracoes = ["1h", "1h30", "2h", "2h30", "3h"];
    duracoes.forEach(duracao => {
      const option = document.createElement("option");
      option.value = duracao;
      option.textContent = duracao;
      if (card.duracao === duracao) option.selected = true;
      selectDuracao.appendChild(option);
    });
    
    selectDuracao.addEventListener("change", (e) => {
      const cardId = e.target.dataset.cardId;
      const cardIndex = state.cardsAulasVariadas.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        state.cardsAulasVariadas[cardIndex].duracao = e.target.value;
      }
      verificarCamposPreenchidos();
    });
    cardDiv.appendChild(selectDuracao);

    // Botão de duplicar (círculo laranja com +)
    const btnDuplicar = document.createElement("button");
    btnDuplicar.className = "botao-duplicar";
    btnDuplicar.innerHTML = "+";
    btnDuplicar.title = "Adicionar outra aula neste mesmo dia";
    btnDuplicar.addEventListener("click", () => {
      // Abrir modal de confirmação
      state.cardParaDuplicar = card.id;
      modalDuplicarAula.classList.remove("hidden");
    });
    cardDiv.appendChild(btnDuplicar);

    return cardDiv;
  }

  // Funções de repetição para aulas variadas
  function repetirHorario() {
    if (state.cardsAulasVariadas.length > 0) {
      const primeiroHorario = state.cardsAulasVariadas[0].horario;
      state.cardsAulasVariadas.forEach(card => {
        card.horario = primeiroHorario;
      });
      renderAulasVariadas();
    }
  }

  function repetirDisciplinas() {
    if (state.cardsAulasVariadas.length > 0) {
      const primeiraMateria = state.cardsAulasVariadas[0].materia;
      state.cardsAulasVariadas.forEach(card => {
        card.materia = primeiraMateria;
      });
      renderAulasVariadas();
    }
  }

  function repetirDuracao() {
    if (state.cardsAulasVariadas.length > 0) {
      const primeiraDuracao = state.cardsAulasVariadas[0].duracao;
      state.cardsAulasVariadas.forEach(card => {
        card.duracao = primeiraDuracao;
      });
      renderAulasVariadas();
    }
  }

  // ==================== PROCESSAR DADOS DAS AULAS ====================
  function processarAulas() {
    state.aulas = [];
    
    const aulasPadraoContent = document.getElementById("aulas-padrao-content");
    
    if (aulasPadraoContent.classList.contains("expanded")) {
      // Aulas Padrão
      const materia = document.getElementById("select-materia-padrao").value;
      const horario = document.getElementById("input-horario-padrao").value;
      const duracao = document.getElementById("select-duracao-padrao").value;
      
      if (materia && horario && duracao) {
        state.selectedDays.sort((a, b) => a - b).forEach(day => {
          state.aulas.push({
            data: day,
            materia: materia,
            horario: horario,
            duracao: duracao,
            professor: "A definir",
            estudante: null
          });
        });
      }
    } else {
      // Aulas Variadas
      state.cardsAulasVariadas.forEach(card => {
        if (card.materia && card.horario && card.duracao) {
          state.aulas.push({
            data: card.day,
            materia: card.materia,
            horario: card.horario,
            duracao: card.duracao,
            professor: "A definir",
            estudante: null
          });
        }
      });
    }
    
    console.log("Aulas processadas:", state.aulas);
  }

  // ==================== SEÇÃO 5: PREENCHER TABELA DE CONFIRMAÇÃO ====================
  function fillConfirmationTable() {
    const tbody = document.getElementById("tabela-corpo");
    tbody.innerHTML = "";

    state.aulas.forEach(aula => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || "--"}</td>
        <td class="p-2">${aula.duracao || "--"}</td>
        <td class="p-2">${aula.materia || "--"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==================== SEÇÃO 6: CONFIRMAÇÃO DA EQUIPE ====================
  async function setupProfessores() {
    const btnSemPref = document.getElementById("sem-preferencia");
    const btnManter = document.getElementById("manter-professores");
    const loadingProfessores = document.getElementById("loading-professores");
    const professoresTableContainer = document.getElementById("professores-table-container");
    const btnAvancar = document.getElementById("equipe-avancar");
    
    // Resetar estado
    btnSemPref.classList.remove("bg-orange-500", "text-white");
    btnManter.classList.remove("bg-orange-500", "text-white");
    professoresTableContainer.classList.add("hidden");
    btnAvancar.disabled = true;
    state.manterProfessores = false;

    // Evento para "Não tenho preferência"
    btnSemPref.addEventListener("click", () => {
      console.log("Clicou em: Não tenho preferência");
      
      btnSemPref.classList.add("bg-orange-500", "text-white");
      btnManter.classList.remove("bg-orange-500", "text-white");
      professoresTableContainer.classList.add("hidden");
      
      // Definir todos os professores como "A definir"
      state.aulas.forEach(aula => {
        aula.professor = "A definir";
      });
      
      state.manterProfessores = false;
      btnAvancar.disabled = false;
      
      console.log("Professores atualizados para 'A definir':", state.aulas);
    });

    // Evento para "Manter professores"
    btnManter.addEventListener("click", async () => {
      console.log("Clicou em: Manter professores");
      
      btnManter.classList.add("bg-orange-500", "text-white");
      btnSemPref.classList.remove("bg-orange-500", "text-white");
      
      // Mostrar loading
      loadingProfessores.classList.remove("hidden");
      professoresTableContainer.classList.add("hidden");
      
      try {
        // Buscar aulas anteriores do cliente
        const querySnapshot = await db.collection("BancoDeAulas")
          .where("cpf", "==", state.cpf)
          .orderBy("timestamp", "desc")
          .limit(5) // Buscar últimas 5 contratações
          .get();

        if (!querySnapshot.empty) {
          // Processar professores de todas as contratações
          const professoresPorMateria = {};
          
          querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.aulas) {
              data.aulas.forEach(aula => {
                if (aula.materia && aula.professor && aula.professor !== "A definir") {
                  if (!professoresPorMateria[aula.materia]) {
                    professoresPorMateria[aula.materia] = new Set();
                  }
                  professoresPorMateria[aula.materia].add(aula.professor);
                }
              });
            }
          });

          // Converter Set para Array
          for (let materia in professoresPorMateria) {
            professoresPorMateria[materia] = Array.from(professoresPorMateria[materia]);
          }

          state.professoresAnteriores = professoresPorMateria;
          
          // Esconder loading e mostrar tabela
          loadingProfessores.classList.add("hidden");
          professoresTableContainer.classList.remove("hidden");
          
          // Preencher tabela de professores editável
          fillProfessoresTable();
          
          state.manterProfessores = true;
          btnAvancar.disabled = false;
          
        } else {
          console.log("Nenhuma contratação anterior encontrada");
          loadingProfessores.classList.add("hidden");
          showModalProfessoresNaoEncontrados();
          
          // Definir todos os professores como "A definir"
          state.aulas.forEach(aula => {
            aula.professor = "A definir";
          });
          
          state.manterProfessores = false;
          btnAvancar.disabled = false;
        }
      } catch (error) {
        console.error("Erro ao buscar professores:", error);
        loadingProfessores.classList.add("hidden");
        showModalProfessoresNaoEncontrados();
        
        // Definir todos os professores como "A definir"
        state.aulas.forEach(aula => {
          aula.professor = "A definir";
        });
        
        state.manterProfessores = false;
        btnAvancar.disabled = false;
      }
    });
  }

  // Preencher tabela de professores editável
  function fillProfessoresTable() {
    const tbody = document.getElementById("tabela-professores-corpo");
    tbody.innerHTML = "";

    state.aulas.forEach((aula, index) => {
      const tr = document.createElement("tr");
      
      // Obter lista de professores para esta matéria
      const professoresParaMateria = state.professoresAnteriores[aula.materia] || ["A definir"];
      
      // Criar options para o select
      let optionsHTML = `<option value="">Selecione um professor</option>`;
      professoresParaMateria.forEach(professor => {
        const selected = aula.professor === professor ? "selected" : "";
        optionsHTML += `<option value="${professor}" ${selected}>${professor}</option>`;
      });
      
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || "--"}</td>
        <td class="p-2">${aula.duracao || "--"}</td>
        <td class="p-2">${aula.materia || "--"}</td>
        <td class="p-2">
          <select class="select-professor-editavel w-full rounded border px-2 py-1" data-index="${index}">
            ${optionsHTML}
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Adicionar eventos aos selects
    document.querySelectorAll(".select-professor-editavel").forEach(select => {
      select.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        state.aulas[index].professor = e.target.value;
        console.log(`Professor atualizado para aula ${index}: ${e.target.value}`);
      });
    });
  }

  // ==================== SEÇÃO 7: CONFIRMAÇÃO DAS AULAS (COM ESTUDANTES) ====================
  async function setupEstudantes() {
    const loadingEstudantes = document.getElementById("loading-estudantes");
    const btnAvancar = document.getElementById("confirmacao-aulas-avancar");
    
    // Mostrar loading
    loadingEstudantes.classList.remove("hidden");
    btnAvancar.disabled = true;
    
    try {
      // Buscar estudantes do cliente
      const querySnapshot = await db.collection("cadastroClientes")
        .where("cpf", "==", state.cpf)
        .get();
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const userData = doc.data();
        
        // Capturar estudantes
        state.estudantes = userData.estudantes || [];
        console.log("Estudantes encontrados:", state.estudantes);
        
        // Esconder loading
        loadingEstudantes.classList.add("hidden");
        
        // Preencher tabela com estudantes
        fillAulasConfirmacaoTable();
        
        // Verificar se todos os estudantes foram atribuídos
        verificarEstudantesAtribuidos();
      } else {
        console.log("Cliente não encontrado");
        loadingEstudantes.classList.add("hidden");
        // Criar array vazio de estudantes
        state.estudantes = [];
        fillAulasConfirmacaoTable();
      }
    } catch (error) {
      console.error("Erro ao buscar estudantes:", error);
      loadingEstudantes.classList.add("hidden");
      state.estudantes = [];
      fillAulasConfirmacaoTable();
    }
  }

  // Preencher tabela de confirmação de aulas com professores e estudantes
  function fillAulasConfirmacaoTable() {
    const tbody = document.getElementById("tabela-corpo-aulas");
    tbody.innerHTML = "";

    // Verificar se há estudantes
    const temEstudantes = state.estudantes && state.estudantes.length > 0;
    
    state.aulas.forEach((aula, index) => {
      const tr = document.createElement("tr");
      
      // Se não houver estudantes ou apenas um, usar valor padrão
      let estudanteAtual = "Escolha um estudante";
      let estudanteClass = "celula-estudante-vazio";
      
      if (state.estudantes.length === 1 && aula.estudante === null) {
        // Se houver apenas um estudante, atribuir automaticamente
        estudanteAtual = state.estudantes[0].nome;
        estudanteClass = "";
        aula.estudante = state.estudantes[0].nome;
      } else if (aula.estudante) {
        estudanteAtual = aula.estudante;
        estudanteClass = "";
      }
      
      // Criar options para o select de estudantes
      let optionsHTML = `<option value="">Escolha um estudante</option>`;
      state.estudantes.forEach(estudante => {
        const selected = aula.estudante === estudante.nome ? "selected" : "";
        optionsHTML += `<option value="${estudante.nome}" ${selected}>${estudante.nome}</option>`;
      });
      
      // Se não houver estudantes, mostrar mensagem
      const estudanteCellHTML = temEstudantes 
        ? `<select class="select-estudante w-full rounded border px-2 py-1" data-index="${index}">
             ${optionsHTML}
           </select>`
        : `<span class="text-gray-500">Nenhum estudante cadastrado</span>`;
      
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || "--"}</td>
        <td class="p-2">${aula.duracao || "--"}</td>
        <td class="p-2">${aula.materia || "--"}</td>
        <td class="p-2">${aula.professor || "A definir"}</td>
        <td class="p-2 ${estudanteClass}" id="estudante-cell-${index}">
          ${estudanteCellHTML}
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Adicionar eventos aos selects de estudantes
    if (temEstudantes) {
      document.querySelectorAll(".select-estudante").forEach(select => {
        select.addEventListener("change", (e) => {
          const index = parseInt(e.target.dataset.index);
          const estudanteSelecionado = e.target.value;
          
          // Atualizar estado
          state.aulas[index].estudante = estudanteSelecionado;
          
          // Atualizar aparência da célula
          const estudanteCell = document.getElementById(`estudante-cell-${index}`);
          if (estudanteSelecionado) {
            estudanteCell.classList.remove("celula-estudante-vazio");
          } else {
            estudanteCell.classList.add("celula-estudante-vazio");
          }
          
          // Verificar se todos os estudantes foram atribuídos
          verificarEstudantesAtribuidos();
        });
      });
    }
  }

  // Verificar se todos os estudantes foram atribuídos
  function verificarEstudantesAtribuidos() {
    const btnAvancar = document.getElementById("confirmacao-aulas-avancar");
    
    // Se não houver estudantes ou apenas um, habilitar o botão
    if (state.estudantes.length <= 1) {
      btnAvancar.disabled = false;
      return;
    }
    
    // Verificar se todas as aulas têm um estudante atribuído
    const todosAtribuidos = state.aulas.every(aula => aula.estudante && aula.estudante !== "Escolha um estudante");
    
    btnAvancar.disabled = !todosAtribuidos;
  }

  // ==================== SEÇÃO 8: TERMOS ====================
  function setupTermos() {
    const termoAceite = document.getElementById("termo-aceite");
    const avancarBtn = document.getElementById("termos-avancar");

    function updateButtonState() {
      avancarBtn.disabled = !termoAceite.checked;
    }

    termoAceite.addEventListener("change", updateButtonState);
    
    // Configurar eventos dos botões de termos
    botaoTermoServico.addEventListener("click", () => {
      modalTermoServico.classList.remove("hidden");
    });
    
    botaoTermoPrivacidade.addEventListener("click", () => {
      modalTermoPrivacidade.classList.remove("hidden");
    });
    
    modalTermoServicoFechar.addEventListener("click", () => {
      modalTermoServico.classList.add("hidden");
    });
    
    modalTermoPrivacidadeFechar.addEventListener("click", () => {
      modalTermoPrivacidade.classList.add("hidden");
    });
  }

  // ==================== SEÇÃO 9: CONFIRMAÇÃO DE PAGAMENTO ====================
  function setupPagamento() {
    // Preencher tabela de pagamento
    fillPagamentoTable();
    
    // Calcular valor total
    calcularValorTotal();
    
    // Configurar eventos dos botões
    document.getElementById("pagamento-cartao").addEventListener("click", async () => {
      state.modoPagamento = "Cartão de crédito";
      await salvarContratacao();
      showSection(sections.fim);
      
      // Redirecionar para WhatsApp após 4 segundos
      setTimeout(() => {
        window.location.href = "https://wa.me/5582988862575?text=Olá! Gostaria de uma simulação no cartão de crédito";
      }, 4000);
    });
    
    document.getElementById("pagamento-pix").addEventListener("click", async () => {
      state.modoPagamento = "Pagamento PIX";
      await salvarContratacao();
      showSection(sections.fim);
      
      // Redirecionar para WhatsApp após 4 segundos
      setTimeout(() => {
        window.location.href = "https://wa.me/5582988862575?text=Olá! Acabei de contratar um novo pacote de aulas! Gostaria de assinar o contrato para efetuarmos o pagamento";
      }, 4000);
    });
  }

  // Preencher tabela de pagamento
  function fillPagamentoTable() {
    const tbody = document.getElementById("tabela-corpo-pagamento");
    tbody.innerHTML = "";

    state.aulas.forEach(aula => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || "--"}</td>
        <td class="p-2">${aula.duracao || "--"}</td>
        <td class="p-2">${aula.materia || "--"}</td>
        <td class="p-2">${aula.professor || "A definir"}</td>
        <td class="p-2">${aula.estudante || "Não atribuído"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Calcular valor total das aulas
  function calcularValorTotal() {
    const loadingCalculo = document.getElementById("loading-calculo-valor");
    const valorTotalSpan = document.getElementById("valor-total");
    const valorParcelaSpan = document.getElementById("valor-parcela");
    
    // Mostrar loading
    loadingCalculo.classList.remove("hidden");
    
    setTimeout(() => {
      let totalHoras = 0;
      
      // Converter duração para horas
      state.aulas.forEach(aula => {
        if (aula.duracao) {
          if (aula.duracao === "1h") totalHoras += 1;
          else if (aula.duracao === "1h30") totalHoras += 1.5;
          else if (aula.duracao === "2h") totalHoras += 2;
          else if (aula.duracao === "2h30") totalHoras += 2.5;
          else if (aula.duracao === "3h") totalHoras += 3;
        }
      });
      
      // Calcular valor total (horas * 65)
      const valorTotal = totalHoras * 65;
      
      // Calcular valor da parcela (com juros de 40%)
      const valorComJuros = valorTotal * 1.4;
      const valorParcela = valorComJuros / 3;
      
      // Atualizar elementos
      valorTotalSpan.textContent = valorTotal.toFixed(2).replace(".", ",");
      valorParcelaSpan.textContent = valorParcela.toFixed(2).replace(".", ",");
      
      // Esconder loading
      loadingCalculo.classList.add("hidden");
    }, 1000);
  }

  // ==================== FUNÇÕES DE BANCO DE DADOS ====================
  
  // Função para gerar código de contratação sequencial (4 números)
  async function gerarCodigoContratacao() {
    try {
      // Buscar o último código usado
      const querySnapshot = await db.collection("BancoDeAulas")
        .orderBy("codigoContratacao", "desc")
        .limit(1)
        .get();

      let proximoCodigo = "0001";
      
      if (!querySnapshot.empty) {
        const ultimoCodigo = querySnapshot.docs[0].data().codigoContratacao;
        
        // Converter para número, incrementar e formatar com 4 dígitos
        let numero = parseInt(ultimoCodigo);
        numero++;
        
        // Garantir que não passe de 9999
        if (numero > 9999) {
          numero = 1; // Reiniciar se passar de 9999
        }
        
        proximoCodigo = numero.toString().padStart(4, "0");
      }
      
      return proximoCodigo;
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      return "0001";
    }
  }

  // Função para gerar ID único para cada aula (código + duas letras)
  function gerarIdsAulas(codigoContratacao, quantidadeAulas) {
    const ids = [];
    let letra1 = "A".charCodeAt(0);
    let letra2 = "A".charCodeAt(0);
    
    for (let i = 0; i < quantidadeAulas; i++) {
      // Gerar ID no formato: 0027AA, 0027AB, etc.
      const id = codigoContratacao + String.fromCharCode(letra1) + String.fromCharCode(letra2);
      ids.push(id);
      
      // Incrementar as letras
      letra2++;
      if (letra2 > "Z".charCodeAt(0)) {
        letra2 = "A".charCodeAt(0);
        letra1++;
        
        // Se passar de ZZ, reiniciar (não deve acontecer com até 9999 aulas)
        if (letra1 > "Z".charCodeAt(0)) {
          letra1 = "A".charCodeAt(0);
        }
      }
    }
    
    return ids;
  }

  // Função para salvar a contratação no Firebase
  async function salvarContratacao() {
    try {
      // Gerar código de contratação
      state.codigoContratacao = await gerarCodigoContratacao();
      
      // Gerar IDs para cada aula
      const idsAulas = gerarIdsAulas(state.codigoContratacao, state.aulas.length);
      
      // Data atual formatada
      const dataAtual = new Date();
      const dataFormatada = `${dataAtual.getDate().toString().padStart(2, "0")}/${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}/${dataAtual.getFullYear()}`;
      
      // Preparar dados para salvar
      const dadosContratacao = {
        cpf: state.cpf,
        nomeCliente: state.nomeCliente,
        nomeAluno: state.nomeAluno,
        dataContratacao: dataFormatada,
        equipe: state.manterProfessores ? "Manter Equipe" : "Sem preferência de Equipe",
        codigoContratacao: state.codigoContratacao,
        modoPagamento: state.modoPagamento,
        statusPagamento: state.statusPagamento,
        statusAula: state.statusAula,
        aulas: state.aulas.map((aula, index) => ({
          id: idsAulas[index],
          data: formatDate(aula.data),
          horario: aula.horario,
          duracao: aula.duracao,
          materia: aula.materia,
          professor: aula.professor,
          estudante: aula.estudante
        })),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Salvar no Firebase
      await db.collection("BancoDeAulas").add(dadosContratacao);
      
      console.log("✅ Dados salvos com sucesso no Firebase!");
      console.log("Código da contratação:", state.codigoContratacao);
      console.log("Modo de pagamento:", state.modoPagamento);
      
      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar dados no Firebase:", error);
      alert("Erro ao salvar os dados. Por favor, tente novamente.");
      return false;
    }
  }

  // Função para mostrar erro de CPF
  function showCpfError(mensagemPersonalizada = null) {
    // Remove mensagem anterior se existir
    document.getElementById("cpf-error")?.remove();
    
    const errorSpan = document.createElement("span");
    errorSpan.id = "cpf-error";
    errorSpan.className = "text-red-500 text-sm mt-2 block text-center";
    errorSpan.textContent = mensagemPersonalizada || 
      "Ops! Não foi encontrado seu CPF! Verifique se escreveu corretamente ou faça seu cadastro.";
    
    const cpfArea = document.getElementById("cpf-area");
    cpfArea.appendChild(errorSpan);
  }

  // Função para mostrar modal de professores não encontrados
  function showModalProfessoresNaoEncontrados() {
    modalProfessoresNaoEncontrados.classList.remove("hidden");
  }

  // ==================== EVENT LISTENERS PRINCIPAIS ====================
  
  // Navegação entre seções
  document.getElementById("apresentacao-avancar").addEventListener("click", () => {
    showSection(sections.verificacao);
  });

  document.getElementById("button-redirecionamento").addEventListener("click", () => {
    window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSejoEoyJBb6DhHDvzZO_8e3bMAPDU2g_pmIdY35Dm6ZAvnBFg/viewform";
  });

  document.getElementById("button-continuarContratacao").addEventListener("click", () => {
    const cpfArea = document.getElementById("cpf-area");
    cpfArea.classList.add("expanded");
  });

  document.getElementById("input-cpf").addEventListener("input", async (e) => {
    let value = e.target.value.replace(/\D/g, "");
    
    // Formatar CPF para exibição
    if (value.length > 3 && value.length <= 6) {
      e.target.value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    } else if (value.length > 6 && value.length <= 9) {
      e.target.value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (value.length > 9) {
      e.target.value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    }
    
    if (value.length === 11) {
      state.cpf = value;
      
      // Mostrar loading
      showLoading();
      
      // Verificar se CPF existe no banco
      try {
        console.log("🔍 Buscando CPF:", value);
        
        // Buscar por campo "cpf"
        const querySnapshot = await db.collection("cadastroClientes")
          .where("cpf", "==", value)
          .get();
        
        hideLoading();
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const userData = doc.data();
          console.log("✅ Usuário encontrado:", userData);
          
          // Capturar nome do cliente
          state.nomeCliente = userData.nome || userData.name || "Cliente";
          
          // Capturar estudantes (assumindo que o campo é "estudantes" como array de objetos)
          const estudantes = userData.estudantes || [];
          console.log("📚 Estudantes encontrados:", estudantes);
          
          // Formatar nomes dos estudantes
          state.nomeAluno = formatarNomesEstudantes(estudantes);
          
          // Atualizar elementos HTML com nomes dos estudantes
          document.getElementById("nome-aluno-calendario").textContent = state.nomeAluno;
          
          // Atualizar nome do cliente
          document.getElementById("nome-cliente-calendario").textContent = state.nomeCliente;
          
          document.getElementById("cpf-error")?.remove();
          showSection(sections.calendario);
          initCalendar();
        } else {
          console.log("❌ CPF não encontrado na coleção cadastroClientes");
          showCpfError();
        }
      } catch (error) {
        hideLoading();
        console.error("❌ Erro detalhado ao verificar CPF:", error);
        
        // Mostrar erro específico
        if (error.code === "permission-denied") {
          showCpfError("Erro de permissão no banco de dados. Contate o suporte.");
        } else {
          showCpfError();
        }
      }
    }
  });

  document.getElementById("calendario-voltar").addEventListener("click", () => {
    showSection(sections.verificacao);
  });

  document.getElementById("calendario-avancar").addEventListener("click", () => {
    if (state.selectedDays.length === 0) {
      alert("Selecione pelo menos um dia de aula");
      return;
    }
    showSection(sections.selecaoAulas);
    setupSelecaoAulas();
  });

  document.getElementById("selecao-voltar").addEventListener("click", () => {
    // Limpar dias selecionados e voltar
    state.selectedDays = [];
    state.cardsAulasVariadas = [];
    showSection(sections.calendario);
    initCalendar(); // Re-renderizar calendário para limpar seleções
  });

  document.getElementById("selecao-avancar").addEventListener("click", () => {
    processarAulas();
    
    // Verificar se todas as aulas foram processadas corretamente
    if (state.aulas.length > 0) {
      fillConfirmationTable();
      showSection(sections.calendarioConfirmacao);
    } else {
      alert("Por favor, preencha todos os campos de aula corretamente.");
    }
  });

  document.getElementById("confirmacao-voltar").addEventListener("click", () => {
    showSection(sections.selecaoAulas);
    setupSelecaoAulas();
  });

  document.getElementById("confirmacao-avancar").addEventListener("click", () => {
    showSection(sections.confirmacaoEquipe);
    setupProfessores();
  });

  document.getElementById("equipe-voltar").addEventListener("click", () => {
    showSection(sections.calendarioConfirmacao);
  });

  document.getElementById("equipe-avancar").addEventListener("click", async () => {
    // Garantir que os professores estejam atualizados antes de avançar
    console.log("Avançando da seção de equipe. Aulas atuais:", state.aulas);
    
    showSection(sections.confirmacaoAulas);
    await setupEstudantes();
  });

  document.getElementById("confirmacao-aulas-voltar").addEventListener("click", () => {
    showSection(sections.confirmacaoEquipe);
  });

  document.getElementById("confirmacao-aulas-avancar").addEventListener("click", async () => {
    // Verificar se todos os estudantes foram atribuídos (se houver mais de um)
    if (state.estudantes.length > 1) {
      const todosAtribuidos = state.aulas.every(aula => aula.estudante && aula.estudante !== "Escolha um estudante");
      if (!todosAtribuidos) {
        alert("Por favor, atribua um estudante para cada aula antes de continuar.");
        return;
      }
    }
    
    showSection(sections.termos);
    setupTermos();
  });

  document.getElementById("termos-voltar").addEventListener("click", () => {
    showSection(sections.confirmacaoAulas);
  });

  document.getElementById("termos-avancar").addEventListener("click", async () => {
    showSection(sections.confirmacaoPagamento);
    setupPagamento();
  });

  document.getElementById("pagamento-voltar").addEventListener("click", () => {
    showSection(sections.termos);
  });

  // Inicialização
  showSection(sections.apresentacao);
});