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

  // Teste de conexão
  console.log("Testando conexão com Firestore...");
  db.collection("cadastroClientes").limit(1).get()
    .then(snapshot => {
      console.log("✅ Conexão Firestore OK. Documentos:", snapshot.size);
    })
    .catch(error => {
      console.error("❌ Erro Firestore:", error);
    });

  // ==================== ELEMENTOS PRINCIPAIS ====================
  const sections = {
    apresentacao: document.getElementById("section-apresentacao"),
    verificacao: document.getElementById("section-verificacao"),
    calendario: document.getElementById("section-calendario"),
    selecaoAulas: document.getElementById("section-selecaoAulas"),
    calendarioConfirmacao: document.getElementById("section-calendario-confirmacao"),
    confirmacaoEquipe: document.getElementById("section-confirmacaoEquipe"),
    confirmacaoAulas: document.getElementById("section-confirmacaoAulas"),
    termos: document.getElementById("section-termos"),
    confirmacaoPagamento: document.getElementById("section-confirmacaoPagamento"),
    fim: document.getElementById("section-fim")
  };

  // Modais
  const modal = document.getElementById("modal-repeticao");
  const modalTitulo = document.getElementById("modal-titulo");
  const modalMensagem = document.getElementById("modal-mensagem");
  const modalFechar = document.getElementById("modal-fechar");
  const modalAplicar = document.getElementById("modal-aplicar");
  const modalProfessoresNaoEncontrados = document.getElementById("modal-professores-nao-encontrados");
  const modalProfessoresOk = document.getElementById("modal-professores-ok");
  const modalDuplicarAula = document.getElementById("modal-duplicar-aula");
  const modalDuplicarNao = document.getElementById("modal-duplicar-nao");
  const modalDuplicarSim = document.getElementById("modal-duplicar-sim");
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
    cardsAulasVariadas: [],
    cardParaDuplicar: null,
    professoresDB: [],
    professoresAnteriores: {},
    professoresAnterioresLista: [],
    materias: [
      "Biologia", "Ciências", "Filosofia", "Física", "Geografia",
      "História", "Língua Portuguesa", "Língua Inglesa", "Matemática", 
      "Química", "Sociologia", "Pedagogia"
    ].sort(),
    tipoAgendamento: null,
    manterProfessores: false,
    nomeCliente: "",
    nomeAluno: "",
    estudantes: [],
    codigoContratacao: "",
    modoPagamento: "",
    statusPagamento: "A pagar",
    statusAula: "Aguardando aula",
    ultimoCodigoContratacao: null,
    // NOVAS VARIÁVEIS
    SomatorioDuracaoAulas: 0,
    AulaEmergencial: "Não",
    ValorEquipe: 0,
    ValorPacote: 0,
    lucroMaster: 0,
    ObservacaoContratacao: ""
  };

  // ==================== FUNÇÕES AUXILIARES ====================
  function formatarNomesEstudantes(estudantes) {
    if (!estudantes || estudantes.length === 0) return "o aluno";
    const nomes = estudantes.map(est => est.nome).filter(nome => nome && nome.trim() !== "");
    if (nomes.length === 0) return "o aluno";
    if (nomes.length === 1) return nomes[0];
    if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
    const todosMenosUltimo = nomes.slice(0, -1);
    const ultimo = nomes[nomes.length - 1];
    return `${todosMenosUltimo.join(", ")} e ${ultimo}`;
  }

  function duracaoParaHoras(duracao) {
    if (!duracao) return 0;
    duracao = duracao.trim().toLowerCase();
    if (duracao === "1h") return 1;
    if (duracao === "1h30") return 1.5;
    if (duracao === "2h") return 2;
    if (duracao === "2h30") return 2.5;
    if (duracao === "3h") return 3;
    return parseFloat(duracao.replace("h", "")) || 0;
  }

  function showLoading() {
    document.getElementById("loading-cpf").classList.remove("hidden");
    document.getElementById("input-cpf").disabled = true;
  }

  function hideLoading() {
    document.getElementById("loading-cpf").classList.add("hidden");
    document.getElementById("input-cpf").disabled = false;
  }

  function showSection(section) {
    Object.values(sections).forEach(sec => sec.classList.add("hidden"));
    section.classList.remove("hidden");
    window.scrollTo(0, 0);
    
    const botoesFixos = document.getElementById("botoes-fixos");
    if (section.id === "section-selecaoAulas") {
      botoesFixos.classList.remove("hidden");
    } else {
      botoesFixos.classList.add("hidden");
    }
  }

  function formatDate(date) {
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dia = date.getDate().toString().padStart(2, "0");
    const mes = (date.getMonth() + 1).toString().padStart(2, "0");
    const ano = date.getFullYear();
    const diaSemana = diasSemana[date.getDay()];
    return `${diaSemana} - ${dia}/${mes}/${ano}`;
  }

  function mostrarModal(tipo) {
    const mensagens = {
      horario: { titulo: "Repetir Horário", mensagem: "Esta ação irá replicar o mesmo horário para todas as aulas selecionadas." },
      disciplinas: { titulo: "Repetir Disciplinas", mensagem: "Esta ação irá aplicar a mesma disciplina para todas as aulas selecionadas." },
      duracao: { titulo: "Repetir Duração", mensagem: "Esta ação irá definir a mesma duração para todas as aulas selecionadas." }
    };
    
    modalTitulo.textContent = mensagens[tipo].titulo;
    modalMensagem.textContent = mensagens[tipo].mensagem;
    modal.classList.remove("hidden");
    
    modalAplicar.onclick = () => {
      switch(tipo) {
        case "horario": repetirHorario(); break;
        case "disciplinas": repetirDisciplinas(); break;
        case "duracao": repetirDuracao(); break;
      }
      modal.classList.add("hidden");
    };
  }

  function showCpfError(mensagemPersonalizada = null) {
    document.getElementById("cpf-error")?.remove();
    const errorSpan = document.createElement("span");
    errorSpan.id = "cpf-error";
    errorSpan.className = "text-red-500 text-sm mt-2 block text-center";
    errorSpan.textContent = mensagemPersonalizada || 
      "Ops! Não foi encontrado seu CPF! Verifique se escreveu corretamente ou faça seu cadastro.";
    document.getElementById("cpf-area").appendChild(errorSpan);
  }

  function showModalProfessoresNaoEncontrados() {
    modalProfessoresNaoEncontrados.classList.remove("hidden");
  }

  // ==================== CALENDÁRIO ====================
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

      for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDays.appendChild(document.createElement("div"));
      }

      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement("div");
        dayElement.textContent = day;

        if (date < today) {
          dayElement.classList.add("past");
        } else {
          const isSelected = state.selectedDays.some(selected => 
            selected.toDateString() === date.toDateString()
          );
          if (isSelected) dayElement.classList.add("selected");
          
          dayElement.addEventListener("click", () => toggleDaySelection(date, dayElement));
        }

        if (date.toDateString() === today.toDateString()) {
          dayElement.classList.add("today");
        }

        calendarDays.appendChild(dayElement);
      }
    }

    function toggleDaySelection(date, element) {
      const index = state.selectedDays.findIndex(d => d.toDateString() === date.toDateString());
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

  // ==================== SEÇÃO 4: SELEÇÃO DE AULAS ====================
  function setupSelecaoAulas() {
    const btnAulasPadrao = document.getElementById("button-AulasPadrao");
    const btnAulasVariadas = document.getElementById("button-AulasVariadas");
    const contentPadrao = document.getElementById("aulas-padrao-content");
    const contentVariadas = document.getElementById("aulas-variadas-content");
    const btnAvancar = document.getElementById("selecao-avancar");
    const botoesRepeticao = document.getElementById("botoes-repeticao");
    
    aplicarTamanhoReduzido();
    
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
      botoesRepeticao.classList.remove("show");
      botoesRepeticao.classList.add("hide");
      setTimeout(() => botoesRepeticao.classList.add("hidden"), 300);
      state.tipoAgendamento = "padrao";
      verificarCamposPreenchidos();
      setTimeout(() => ajustarAlturaSelecaoAulas(), 500);
    });

    btnAulasVariadas.addEventListener("click", () => {
      btnAulasVariadas.classList.add("bg-orange-500", "text-white");
      btnAulasPadrao.classList.remove("bg-orange-500", "text-white");
      contentVariadas.classList.add("expanded");
      contentPadrao.classList.remove("expanded");
      botoesRepeticao.classList.remove("hide", "hidden");
      botoesRepeticao.classList.add("show");
      state.tipoAgendamento = "variadas";
      renderAulasVariadas();
      setTimeout(() => ajustarAlturaSelecaoAulas(), 500);
    });

    document.getElementById("select-materia-padrao").addEventListener("change", verificarCamposPreenchidos);
    document.getElementById("input-horario-padrao").addEventListener("change", verificarCamposPreenchidos);
    document.getElementById("select-duracao-padrao").addEventListener("change", verificarCamposPreenchidos);

    document.getElementById("btn-repetir-horario").addEventListener("click", () => mostrarModal("horario"));
    document.getElementById("btn-repetir-disciplinas").addEventListener("click", () => mostrarModal("disciplinas"));
    document.getElementById("btn-repetir-duracao").addEventListener("click", () => mostrarModal("duracao"));

    modalDuplicarNao.addEventListener("click", () => {
      modalDuplicarAula.classList.add("hidden");
      state.cardParaDuplicar = null;
    });

    modalDuplicarSim.addEventListener("click", () => {
      if (state.cardParaDuplicar) {
        const cardOriginal = state.cardsAulasVariadas.find(c => c.id === state.cardParaDuplicar);
        if (cardOriginal) {
          const novoCard = {
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            day: cardOriginal.day,
            materia: cardOriginal.materia,
            horario: cardOriginal.horario,
            duracao: cardOriginal.duracao
          };
          const indexOriginal = state.cardsAulasVariadas.findIndex(c => c.id === state.cardParaDuplicar);
          state.cardsAulasVariadas.splice(indexOriginal + 1, 0, novoCard);
          renderAulasVariadas();
        }
      }
      modalDuplicarAula.classList.add("hidden");
      state.cardParaDuplicar = null;
    });
  }

  function aplicarTamanhoReduzido() {
    const section = document.getElementById("section-selecaoAulas");
    const titulo = section.querySelector(".title-lexend");
    if (titulo) titulo.style.fontSize = "1.2rem";
    
    const botoesPrincipais = section.querySelectorAll("#button-AulasPadrao, #button-AulasVariadas");
    botoesPrincipais.forEach(botao => {
      botao.style.padding = "8px 16px";
      botao.style.fontSize = "0.9rem";
    });
    
    const inputs = section.querySelectorAll("select, input");
    inputs.forEach(input => {
      input.style.padding = "8px 12px";
      input.style.fontSize = "0.9rem";
    });
    
    const textos = section.querySelectorAll(".text-comfortaa");
    textos.forEach(texto => texto.style.fontSize = "0.9rem");
    
    const botoesRepeticao = section.querySelectorAll("#botoes-repeticao button");
    botoesRepeticao.forEach(botao => {
      botao.style.padding = "6px 12px";
      botao.style.fontSize = "0.8rem";
    });
    
    const botoesNavegacao = section.querySelectorAll("#botoes-fixos button");
    botoesNavegacao.forEach(botao => {
      botao.style.padding = "8px 16px";
      botao.style.fontSize = "0.9rem";
    });
  }

  function ajustarAlturaSelecaoAulas() {
    const cardInner = document.querySelector("#section-selecaoAulas .card-inner");
    const contentHeight = cardInner.scrollHeight;
    if (contentHeight > 400) {
      cardInner.style.minHeight = "auto";
      cardInner.style.height = "auto";
    }
  }

  function verificarCamposPreenchidos() {
    const btnAvancar = document.getElementById("selecao-avancar");
    if (state.tipoAgendamento === "padrao") {
      const materia = document.getElementById("select-materia-padrao").value;
      const horario = document.getElementById("input-horario-padrao").value;
      const duracao = document.getElementById("select-duracao-padrao").value;
      btnAvancar.disabled = !(materia && horario && duracao);
    } else if (state.tipoAgendamento === "variadas") {
      const todosPreenchidos = state.cardsAulasVariadas.every(card => 
        card.materia && card.horario && card.duracao
      );
      btnAvancar.disabled = !todosPreenchidos || state.cardsAulasVariadas.length === 0;
    } else {
      btnAvancar.disabled = true;
    }
  }

  function renderAulasVariadas() {
    const container = document.getElementById("aulas-variadas-container");
    if (state.cardsAulasVariadas.length === 0 && state.selectedDays.length > 0) {
      state.cardsAulasVariadas = state.selectedDays.sort((a, b) => a - b).map((day, index) => ({
        id: `card-${Date.now()}-${index}`,
        day: day,
        materia: "",
        horario: "",
        duracao: ""
      }));
    }
    
    container.innerHTML = "";
    state.cardsAulasVariadas.forEach((card, index) => {
      const cardElement = createCardElement(card, index);
      container.appendChild(cardElement);
    });
    
    verificarCamposPreenchidos();
    setTimeout(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }, 300);
  }

  function createCardElement(card, index) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "aula-card";
    cardDiv.dataset.cardId = card.id;

    const title = document.createElement("h4");
    title.className = "font-semibold mb-2 text-gray-800";
    title.style.fontSize = "0.95rem";
    title.textContent = formatDate(card.day);
    cardDiv.appendChild(title);

    const selectMateria = document.createElement("select");
    selectMateria.className = "select-materia w-full rounded-lg border px-3 py-2 text-comfortaa mb-2";
    selectMateria.style.padding = "8px 12px";
    selectMateria.style.fontSize = "0.9rem";
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
      if (cardIndex !== -1) state.cardsAulasVariadas[cardIndex].materia = e.target.value;
      verificarCamposPreenchidos();
    });
    cardDiv.appendChild(selectMateria);

    const inputHorario = document.createElement("input");
    inputHorario.type = "time";
    inputHorario.className = "input-horario w-full rounded-lg border px-3 py-2 text-comfortaa mb-2";
    inputHorario.style.padding = "8px 12px";
    inputHorario.style.fontSize = "0.9rem";
    inputHorario.dataset.cardId = card.id;
    inputHorario.value = card.horario;
    inputHorario.addEventListener("change", (e) => {
      const cardId = e.target.dataset.cardId;
      const cardIndex = state.cardsAulasVariadas.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) state.cardsAulasVariadas[cardIndex].horario = e.target.value;
      verificarCamposPreenchidos();
    });
    cardDiv.appendChild(inputHorario);

    const selectDuracao = document.createElement("select");
    selectDuracao.className = "select-duracao w-full rounded-lg border px-3 py-2 text-comfortaa";
    selectDuracao.style.padding = "8px 12px";
    selectDuracao.style.fontSize = "0.9rem";
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
      if (cardIndex !== -1) state.cardsAulasVariadas[cardIndex].duracao = e.target.value;
      verificarCamposPreenchidos();
    });
    cardDiv.appendChild(selectDuracao);

    const btnDuplicar = document.createElement("button");
    btnDuplicar.className = "botao-duplicar";
    btnDuplicar.style.width = "28px";
    btnDuplicar.style.height = "28px";
    btnDuplicar.style.fontSize = "18px";
    btnDuplicar.innerHTML = "+";
    btnDuplicar.title = "Adicionar outra aula neste mesmo dia";
    btnDuplicar.addEventListener("click", () => {
      state.cardParaDuplicar = card.id;
      modalDuplicarAula.classList.remove("hidden");
    });
    cardDiv.appendChild(btnDuplicar);

    return cardDiv;
  }

  function repetirHorario() {
    if (state.cardsAulasVariadas.length > 0) {
      const primeiroHorario = state.cardsAulasVariadas[0].horario;
      state.cardsAulasVariadas.forEach(card => card.horario = primeiroHorario);
      renderAulasVariadas();
    }
  }

  function repetirDisciplinas() {
    if (state.cardsAulasVariadas.length > 0) {
      const primeiraMateria = state.cardsAulasVariadas[0].materia;
      state.cardsAulasVariadas.forEach(card => card.materia = primeiraMateria);
      renderAulasVariadas();
    }
  }

  function repetirDuracao() {
    if (state.cardsAulasVariadas.length > 0) {
      const primeiraDuracao = state.cardsAulasVariadas[0].duracao;
      state.cardsAulasVariadas.forEach(card => card.duracao = primeiraDuracao);
      renderAulasVariadas();
    }
  }

  // ==================== PROCESSAR DADOS DAS AULAS ====================
  function processarAulas() {
    state.aulas = [];
    const aulasPadraoContent = document.getElementById("aulas-padrao-content");
    
    if (aulasPadraoContent.classList.contains("expanded")) {
      const materia = document.getElementById("select-materia-padrao").value;
      const horario = document.getElementById("input-horario-padrao").value;
      const duracao = document.getElementById("select-duracao-padrao").value;
      
      if (materia && horario && duracao) {
        state.selectedDays.sort((a, b) => a - b).forEach(day => {
          const horas = duracaoParaHoras(duracao);
          state.aulas.push({
            data: day,
            materia: materia,
            horario: horario,
            duracao: duracao,
            professor: "A definir",
            estudante: null,
            "id-Aula": null,
            StatusAula: "",
            ObservacoesAula: "",
            RelatorioAula: "",
            ConfirmacaoProfessorAula: "",
            idProfessor: "",
            ValorAula: horas * 35,
            disponibilizarRrelatório: "nao"
          });
        });
      }
    } else {
      state.cardsAulasVariadas.forEach(card => {
        if (card.materia && card.horario && card.duracao) {
          const horas = duracaoParaHoras(card.duracao);
          state.aulas.push({
            data: card.day,
            materia: card.materia,
            horario: card.horario,
            duracao: card.duracao,
            professor: "A definir",
            estudante: null,
            "id-Aula": null,
            StatusAula: "",
            ObservacoesAula: "",
            RelatorioAula: "",
            ConfirmacaoProfessorAula: "",
            idProfessor: "",
            ValorAula: horas * 35,
            disponibilizarRrelatório: "nao"
          });
        }
      });
    }
    
    console.log("Aulas processadas:", state.aulas);
    calcularVariaveisAula();
  }

  function calcularVariaveisAula() {
    // I. SomatorioDuracaoAulas
    let somatorio = 0;
    state.aulas.forEach(aula => somatorio += duracaoParaHoras(aula.duracao));
    state.SomatorioDuracaoAulas = somatorio;

    // II. AulaEmergencial
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const temAulaEmergencial = state.aulas.some(aula => {
      const dataAula = new Date(aula.data);
      dataAula.setHours(0, 0, 0, 0);
      return dataAula.getTime() === hoje.getTime() || dataAula.getTime() === amanha.getTime();
    });
    state.AulaEmergencial = temAulaEmergencial ? "Sim" : "Não";

    // III. ValorEquipe
    state.ValorEquipe = state.SomatorioDuracaoAulas * 35;

    // IV. ValorPacote
    let ValorHoraAulaPacote = 0;
    const horas = state.SomatorioDuracaoAulas;
    if (horas <= 4) ValorHoraAulaPacote = 65.00;
    else if (horas >= 5 && horas <= 9) ValorHoraAulaPacote = 63.50;
    else if (horas >= 10 && horas <= 14) ValorHoraAulaPacote = 62.00;
    else if (horas >= 15 && horas <= 19) ValorHoraAulaPacote = 61.50;
    else if (horas >= 20) ValorHoraAulaPacote = 60.50;
    state.ValorPacote = ValorHoraAulaPacote * horas;

    // V. lucroMaster
    state.lucroMaster = state.ValorPacote - state.ValorEquipe;

    console.log("Variáveis calculadas:", {
      SomatorioDuracaoAulas: state.SomatorioDuracaoAulas,
      AulaEmergencial: state.AulaEmergencial,
      ValorEquipe: state.ValorEquipe,
      ValorPacote: state.ValorPacote,
      lucroMaster: state.lucroMaster
    });
  }

  // ==================== SEÇÃO 5: CONFIRMAÇÃO DO CRONOGRAMA ====================
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
    
    btnSemPref.classList.remove("bg-orange-500", "text-white");
    btnManter.classList.remove("bg-orange-500", "text-white");
    professoresTableContainer.classList.add("hidden");
    btnAvancar.disabled = true;
    state.manterProfessores = false;

    btnSemPref.addEventListener("click", () => {
      btnSemPref.classList.add("bg-orange-500", "text-white");
      btnManter.classList.remove("bg-orange-500", "text-white");
      professoresTableContainer.classList.add("hidden");
      state.aulas.forEach(aula => aula.professor = "A definir");
      state.manterProfessores = false;
      btnAvancar.disabled = false;
    });

    btnManter.addEventListener("click", async () => {
      btnManter.classList.add("bg-orange-500", "text-white");
      btnSemPref.classList.remove("bg-orange-500", "text-white");
      loadingProfessores.classList.remove("hidden");
      professoresTableContainer.classList.add("hidden");
      const professoresAnteriores = await buscarProfessoresAnteriores();
      loadingProfessores.classList.add("hidden");
      if (professoresAnteriores && professoresAnteriores.length > 0) {
        state.professoresAnterioresLista = professoresAnteriores;
        professoresTableContainer.classList.remove("hidden");
        fillProfessoresTable();
        state.manterProfessores = true;
        btnAvancar.disabled = false;
      } else {
        showModalProfessoresNaoEncontrados();
        state.aulas.forEach(aula => aula.professor = "A definir");
        state.manterProfessores = false;
        btnAvancar.disabled = false;
      }
    });
  }

  async function buscarProfessoresAnteriores() {
    try {
      console.log(`Buscando professores anteriores para CPF: ${state.cpf}`);
      const querySnapshot = await db.collection("BancoDeAulas").get();
      const documentosDoCliente = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.cpf === state.cpf) documentosDoCliente.push(data);
      });
      
      if (documentosDoCliente.length === 0) {
        console.log("Nenhum documento encontrado para este CPF");
        return null;
      }
      
      const todosProfessores = [];
      documentosDoCliente.forEach(doc => {
        if (doc.aulas && Array.isArray(doc.aulas)) {
          doc.aulas.forEach(aula => {
            if (aula.professor) todosProfessores.push(aula.professor);
          });
        }
      });
      
      const professoresFiltrados = todosProfessores
        .filter(prof => prof !== "A definir" && prof !== "")
        .filter((prof, index, self) => self.indexOf(prof) === index)
        .slice(0, 20);
      
      console.log("Professores encontrados (máx 20):", professoresFiltrados);
      return professoresFiltrados.length > 0 ? professoresFiltrados : null;
      
    } catch (error) {
      console.error("Erro ao buscar professores:", error);
      return null;
    }
  }

  function fillProfessoresTable() {
    const tbody = document.getElementById("tabela-professores-corpo");
    tbody.innerHTML = "";
    state.aulas.forEach((aula, index) => {
      const tr = document.createElement("tr");
      let optionsHTML = `<option value="">Selecione um professor</option>
                         <option value="A definir" ${aula.professor === "A definir" ? "selected" : ""}>A definir</option>`;
      state.professoresAnterioresLista.forEach(professor => {
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

    document.querySelectorAll(".select-professor-editavel").forEach(select => {
      select.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        state.aulas[index].professor = e.target.value;
      });
    });
  }

  // ==================== SEÇÃO 7: CONFIRMAÇÃO DAS AULAS ====================
  async function setupEstudantes() {
    const loadingEstudantes = document.getElementById("loading-estudantes");
    const btnAvancar = document.getElementById("confirmacao-aulas-avancar");
    loadingEstudantes.classList.remove("hidden");
    btnAvancar.disabled = true;
    
    try {
      const querySnapshot = await db.collection("cadastroClientes")
        .where("cpf", "==", state.cpf)
        .get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        state.estudantes = doc.data().estudantes || [];
      }
      loadingEstudantes.classList.add("hidden");
      fillAulasConfirmacaoTable();
      verificarEstudantesAtribuidos();
    } catch (error) {
      console.error("Erro ao buscar estudantes:", error);
      loadingEstudantes.classList.add("hidden");
      state.estudantes = [];
      fillAulasConfirmacaoTable();
    }
  }

  function fillAulasConfirmacaoTable() {
    const tbody = document.getElementById("tabela-corpo-aulas");
    tbody.innerHTML = "";
    const temEstudantes = state.estudantes && state.estudantes.length > 0;
    const listaProfessores = state.professoresAnterioresLista && state.professoresAnterioresLista.length > 0 
      ? state.professoresAnterioresLista 
      : ["A definir"];
    
    state.aulas.forEach((aula, index) => {
      if (state.estudantes.length === 1 && aula.estudante === null) {
        aula.estudante = state.estudantes[0].nome;
      }
      if (!aula.professor) aula.professor = "A definir";
      
      let optionsHTMLestudantes = `<option value="">Escolha um estudante</option>`;
      state.estudantes.forEach(estudante => {
        const selected = aula.estudante === estudante.nome ? "selected" : "";
        optionsHTMLestudantes += `<option value="${estudante.nome}" ${selected}>${estudante.nome}</option>`;
      });
      
      let optionsHTMLprofessores = `<option value="">Selecione um professor</option>`;
      listaProfessores.forEach(professor => {
        const selected = aula.professor === professor ? "selected" : "";
        optionsHTMLprofessores += `<option value="${professor}" ${selected}>${professor}</option>`;
      });
      
      const estudanteCellHTML = temEstudantes 
        ? `<select class="select-estudante w-full rounded border px-2 py-1" data-index="${index}">${optionsHTMLestudantes}</select>`
        : `<span class="text-gray-500">Nenhum estudante cadastrado</span>`;
      
      const professorCellHTML = `<select class="select-professor w-full rounded border px-2 py-1" data-index="${index}">${optionsHTMLprofessores}</select>`;
      
      const estudanteClass = aula.estudante && aula.estudante !== "Escolha um estudante" ? "" : "celula-estudante-vazio";
      const professorClass = aula.professor && aula.professor !== "" ? "" : "celula-professor-vazio";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || "--"}</td>
        <td class="p-2">${aula.duracao || "--"}</td>
        <td class="p-2">${aula.materia || "--"}</td>
        <td class="p-2 ${professorClass}" id="professor-cell-${index}">${professorCellHTML}</td>
        <td class="p-2 ${estudanteClass}" id="estudante-cell-${index}">${estudanteCellHTML}</td>
      `;
      tbody.appendChild(tr);
    });

    if (temEstudantes) {
      document.querySelectorAll(".select-estudante").forEach(select => {
        select.addEventListener("change", (e) => {
          const index = parseInt(e.target.dataset.index);
          const estudanteSelecionado = e.target.value;
          state.aulas[index].estudante = estudanteSelecionado;
          const estudanteCell = document.getElementById(`estudante-cell-${index}`);
          if (estudanteSelecionado && estudanteSelecionado !== "") {
            estudanteCell.classList.remove("celula-estudante-vazio");
          } else {
            estudanteCell.classList.add("celula-estudante-vazio");
          }
          verificarEstudantesAtribuidos();
        });
      });
    }

    document.querySelectorAll(".select-professor").forEach(select => {
      select.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        const professorSelecionado = e.target.value;
        state.aulas[index].professor = professorSelecionado;
        const professorCell = document.getElementById(`professor-cell-${index}`);
        if (professorSelecionado && professorSelecionado !== "") {
          professorCell.classList.remove("celula-professor-vazio");
        } else {
          professorCell.classList.add("celula-professor-vazio");
        }
      });
    });
  }

  function verificarEstudantesAtribuidos() {
    const btnAvancar = document.getElementById("confirmacao-aulas-avancar");
    if (state.estudantes.length <= 1) {
      btnAvancar.disabled = false;
      return;
    }
    const todosAtribuidos = state.aulas.every(aula => 
      aula.estudante && aula.estudante !== "Escolha um estudante" && aula.estudante !== ""
    );
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
    botaoTermoServico.addEventListener("click", () => modalTermoServico.classList.remove("hidden"));
    botaoTermoPrivacidade.addEventListener("click", () => modalTermoPrivacidade.classList.remove("hidden"));
    modalTermoServicoFechar.addEventListener("click", () => modalTermoServico.classList.add("hidden"));
    modalTermoPrivacidadeFechar.addEventListener("click", () => modalTermoPrivacidade.classList.add("hidden"));
  }

  // ==================== SEÇÃO 9: CONFIRMAÇÃO DE PAGAMENTO ====================
  function setupPagamento() {
    fillPagamentoTable();
    calcularValorTotal();
    
    document.getElementById("pagamento-cartao").addEventListener("click", async () => {
      state.modoPagamento = "Cartão de crédito";
      const sucesso = await salvarContratacao();
      if (sucesso) {
        showSection(sections.fim);
        setTimeout(() => {
          window.location.href = "https://wa.me/5582988862575?text=Olá! Gostaria de uma simulação no cartão de crédito";
        }, 4000);
      }
    });
    
    document.getElementById("pagamento-pix").addEventListener("click", async () => {
      state.modoPagamento = "Pagamento PIX";
      const sucesso = await salvarContratacao();
      if (sucesso) {
        showSection(sections.fim);
        setTimeout(() => {
          window.location.href = "https://wa.me/5582988862575?text=Olá! Acabei de contratar um novo pacote de aulas! Gostaria de assinar o contrato para efetuarmos o pagamento";
        }, 4000);
      }
    });
  }

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

  function calcularValorTotal() {
    const loadingCalculo = document.getElementById("loading-calculo-valor");
    const valorTotalSpan = document.getElementById("valor-total");
    const valorParcelaSpan = document.getElementById("valor-parcela");
    loadingCalculo.classList.remove("hidden");
    
    setTimeout(() => {
      let totalHoras = 0;
      state.aulas.forEach(aula => {
        const horasMap = { "1h": 1, "1h30": 1.5, "2h": 2, "2h30": 2.5, "3h": 3 };
        totalHoras += horasMap[aula.duracao] || 0;
      });
      const valorTotal = totalHoras * 65;
      const valorComJuros = valorTotal * 1.4;
      const valorParcela = valorComJuros / 3;
      valorTotalSpan.textContent = valorTotal.toFixed(2).replace(".", ",");
      valorParcelaSpan.textContent = valorParcela.toFixed(2).replace(".", ",");
      loadingCalculo.classList.add("hidden");
    }, 1000);
  }

  // ==================== FUNÇÕES DE BANCO DE DADOS ====================
  async function gerarCodigoContratacao() {
    try {
      const querySnapshot = await db.collection("BancoDeAulas")
        .orderBy("codigoContratacao", "desc")
        .limit(1)
        .get();
      let proximoCodigo = "0001";
      if (!querySnapshot.empty) {
        const ultimoCodigo = querySnapshot.docs[0].data().codigoContratacao;
        let numero = parseInt(ultimoCodigo);
        numero++;
        if (numero > 9999) numero = 1;
        proximoCodigo = numero.toString().padStart(4, "0");
      }
      return proximoCodigo;
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      return "0001";
    }
  }

  function gerarIdsAulas(codigoContratacao, quantidadeAulas) {
    const ids = [];
    let letra1 = "A".charCodeAt(0);
    let letra2 = "A".charCodeAt(0);
    for (let i = 0; i < quantidadeAulas; i++) {
      const id = codigoContratacao + String.fromCharCode(letra1) + String.fromCharCode(letra2);
      ids.push(id);
      letra2++;
      if (letra2 > "Z".charCodeAt(0)) {
        letra2 = "A".charCodeAt(0);
        letra1++;
        if (letra1 > "Z".charCodeAt(0)) letra1 = "A".charCodeAt(0);
      }
    }
    return ids;
  }

  async function salvarContratacao() {
    try {
      state.codigoContratacao = await gerarCodigoContratacao();
      const idsAulas = gerarIdsAulas(state.codigoContratacao, state.aulas.length);
      const dataAtual = new Date();
      const dataFormatada = `${dataAtual.getDate().toString().padStart(2, "0")}/${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}/${dataAtual.getFullYear()}`;
      
      const dadosContratacao = {
        cpf: state.cpf,
        nomeCliente: state.nomeCliente,
        nomeAluno: state.nomeAluno,
        ObservacaoContratacao: state.ObservacaoContratacao,
        dataContratacao: dataFormatada,
        equipe: state.manterProfessores ? "Manter Equipe" : "Sem preferência de Equipe",
        codigoContratacao: state.codigoContratacao,
        modoPagamento: state.modoPagamento,
        statusPagamento: state.statusPagamento,
        statusAula: state.statusAula,
        SomatorioDuracaoAulas: state.SomatorioDuracaoAulas,
        AulaEmergencial: state.AulaEmergencial,
        ValorEquipe: state.ValorEquipe,
        ValorPacote: state.ValorPacote,
        lucroMaster: state.lucroMaster,
        aulas: state.aulas.map((aula, index) => ({
          "id-Aula": idsAulas[index],
          data: formatDate(aula.data),
          horario: aula.horario,
          duracao: aula.duracao,
          materia: aula.materia,
          professor: aula.professor,
          estudante: aula.estudante,
          StatusAula: aula.StatusAula,
          ObservacoesAula: aula.ObservacoesAula,
          RelatorioAula: aula.RelatorioAula,
          ConfirmacaoProfessorAula: aula.ConfirmacaoProfessorAula,
          idProfessor: aula.idProfessor,
          ValorAula: aula.ValorAula,
          disponibilizarRrelatório: aula.disponibilizarRrelatório || "nao"
        })),

        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection("BancoDeAulas").add(dadosContratacao);
      console.log("✅ Dados salvos com sucesso!");
      console.log("Código:", state.codigoContratacao);
      console.log("Modo de pagamento:", state.modoPagamento);
      console.log("Novas variáveis salvas:", {
        SomatorioDuracaoAulas: state.SomatorioDuracaoAulas,
        AulaEmergencial: state.AulaEmergencial,
        ValorEquipe: state.ValorEquipe,
        ValorPacote: state.ValorPacote,
        lucroMaster: state.lucroMaster,
        ObservacaoContratacao: state.ObservacaoContratacao
      });
      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar dados:", error);
      alert("Erro ao salvar os dados. Por favor, tente novamente.");
      return false;
    }
  }

  // ==================== EVENT LISTENERS PRINCIPAIS ====================
  document.getElementById("apresentacao-avancar").addEventListener("click", () => showSection(sections.verificacao));
  document.getElementById("button-redirecionamento").addEventListener("click", () => window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSejoEoyJBb6DhHDvzZO_8e3bMAPDU2g_pmIdY35Dm6ZAvnBFg/viewform");
  document.getElementById("button-continuarContratacao").addEventListener("click", () => document.getElementById("cpf-area").classList.add("expanded"));

  document.getElementById("input-cpf").addEventListener("input", async (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 3 && value.length <= 6) e.target.value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    else if (value.length > 6 && value.length <= 9) e.target.value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    else if (value.length > 9) e.target.value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    
    if (value.length === 11) {
      state.cpf = value;
      showLoading();
      try {
        const querySnapshot = await db.collection("cadastroClientes").where("cpf", "==", value).get();
        hideLoading();
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const userData = doc.data();
          state.nomeCliente = userData.nome || userData.name || "Cliente";
          const estudantes = userData.estudantes || [];
          state.nomeAluno = formatarNomesEstudantes(estudantes);
          document.getElementById("nome-aluno-calendario").textContent = state.nomeAluno;
          document.getElementById("nome-cliente-calendario").textContent = state.nomeCliente;
          document.getElementById("cpf-error")?.remove();
          showSection(sections.calendario);
          initCalendar();
        } else {
          showCpfError();
        }
      } catch (error) {
        hideLoading();
        console.error("Erro ao verificar CPF:", error);
        showCpfError(error.code === 'permission-denied' ? "Erro de permissão no banco de dados. Contate o suporte." : null);
      }
    }
  });

  document.getElementById("calendario-voltar").addEventListener("click", () => showSection(sections.verificacao));
  document.getElementById("calendario-avancar").addEventListener("click", () => {
    if (state.selectedDays.length === 0) {
      alert("Selecione pelo menos um dia de aula");
      return;
    }
    showSection(sections.selecaoAulas);
    setupSelecaoAulas();
  });

  document.getElementById("selecao-voltar").addEventListener("click", () => {
    state.selectedDays = [];
    state.cardsAulasVariadas = [];
    showSection(sections.calendario);
    initCalendar();
  });

  document.getElementById("selecao-avancar").addEventListener("click", () => {
    processarAulas();
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

  document.getElementById("equipe-voltar").addEventListener("click", () => showSection(sections.calendarioConfirmacao));
  document.getElementById("equipe-avancar").addEventListener("click", async () => {
    showSection(sections.confirmacaoAulas);
    await setupEstudantes();
  });

  document.getElementById("confirmacao-aulas-voltar").addEventListener("click", () => showSection(sections.confirmacaoEquipe));
  document.getElementById("confirmacao-aulas-avancar").addEventListener("click", async () => {
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

  document.getElementById("termos-voltar").addEventListener("click", () => showSection(sections.confirmacaoAulas));
  document.getElementById("termos-avancar").addEventListener("click", async () => {
    showSection(sections.confirmacaoPagamento);
    setupPagamento();
  });

  document.getElementById("pagamento-voltar").addEventListener("click", () => showSection(sections.termos));

  modalFechar.addEventListener("click", () => modal.classList.add("hidden"));
  modalProfessoresOk.addEventListener("click", () => modalProfessoresNaoEncontrados.classList.add("hidden"));

  // Inicialização
  showSection(sections.apresentacao);
});