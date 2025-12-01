document.addEventListener("DOMContentLoaded", () => {
  // Configuração do Firebase
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

  // Initialize Firebase
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

  // Elementos principais
  const sections = {
    apresentacao: document.getElementById("section-apresentacao"),
    verificacao: document.getElementById("section-verificacao"),
    calendario: document.getElementById("section-calendario"),
    selecaoAulas: document.getElementById("section-selecaoAulas"),
    calendarioConfirmacao: document.getElementById("section-calendario-confirmacao"),
    confirmacaoEquipe: document.getElementById("section-confirmacaoEquipe"),
    selecaoAulasConfirmacao: document.getElementById("section-selecaoAulasConfirmacao"),
    termos: document.getElementById("section-termos"),
    fim: document.getElementById("section-fim")
  };

  // Elementos do modal
  const modal = document.getElementById("modal-repeticao");
  const modalTitulo = document.getElementById("modal-titulo");
  const modalMensagem = document.getElementById("modal-mensagem");
  const modalFechar = document.getElementById("modal-fechar");
  const modalAplicar = document.getElementById("modal-aplicar");

  // Estado global
  const state = {
    cpf: "",
    selectedDays: [],
    currentMonth: new Date(),
    aulas: [],
    // Variáveis para professores - serão importadas do banco de dados futuramente
    professoresDB: [
      { nome: "José Welligton", materia: "Matemática" },
      { nome: "Eden Pereira", materia: "Física" },
      { nome: "Lucas Gabriel", materia: "Química" },
      { nome: "Noemi de Castro", materia: "Biologia" },
      { nome: "Thuane Barbosa", materia: "História" },
      { nome: "Carlos Silva", materia: "Geografia" },
      { nome: "Ana Paula", materia: "Língua Portuguesa" },
      { nome: "Roberto Alves", materia: "Língua Inglesa" },
      { nome: "Mariana Costa", materia: "Filosofia" },
      { nome: "Pedro Santos", materia: "Sociologia" },
      { nome: "Fernanda Lima", materia: "Ciências" },
      { nome: "Ricardo Oliveira", materia: "Pedagogia" }
    ],
    materias: [
      "Biologia", "Ciências", "Filosofia", "Física", "Geografia",
      "História", "Língua Portuguesa", "Língua Inglesa", "Matemática", 
      "Química", "Sociologia", "Pedagogia"
    ].sort(),
    tipoAgendamento: null, // 'padrao' ou 'variadas'
    manterProfessores: false,
    nomeCliente: "", // Adicionado para armazenar o nome do cliente
    codigoContratacao: "" // Adicionado para armazenar o código
  };

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

  // Configuração do calendário
  function initCalendar() {
    const monthYear = document.getElementById("month-year");
    const calendarDays = document.getElementById("calendar-days");
    const prevBtn = document.getElementById("prev-month");
    const nextBtn = document.getElementById("next-month");

    function renderCalendar() {
      const year = state.currentMonth.getFullYear();
      const month = state.currentMonth.getMonth();
      
      monthYear.textContent = state.currentMonth.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
      }).replace(/^\w/, c => c.toUpperCase());

      calendarDays.innerHTML = '';

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Dias vazios no início
      for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDays.appendChild(document.createElement('div'));
      }

      // Dias do mês
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement('div');
        dayElement.textContent = day;

        // Verificar se é passado
        if (date < today) {
          dayElement.classList.add('past');
        } else {
          // Verificar se está selecionado
          const isSelected = state.selectedDays.some(selected => 
            selected.toDateString() === date.toDateString()
          );
          
          if (isSelected) dayElement.classList.add('selected');
          
          // Adicionar evento de clique
          dayElement.addEventListener('click', () => toggleDaySelection(date, dayElement));
        }

        // Marcar dia atual
        if (date.toDateString() === today.toDateString()) {
          dayElement.classList.add('today');
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
        element.classList.add('selected');
      } else {
        state.selectedDays.splice(index, 1);
        element.classList.remove('selected');
      }
    }

    prevBtn.addEventListener('click', () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
      renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
      state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
      renderCalendar();
    });

    renderCalendar();
  }

  // Formatação de data
  function formatDate(date) {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const ano = date.getFullYear();
    const diaSemana = diasSemana[date.getDay()];
    
    return `${diaSemana} - ${dia}/${mes}/${ano}`;
  }

  // Configurar seção de seleção de aulas
  function setupSelecaoAulas() {
    const btnAulasPadrao = document.getElementById("button-AulasPadrao");
    const btnAulasVariadas = document.getElementById("button-AulasVariadas");
    const contentPadrao = document.getElementById("aulas-padrao-content");
    const contentVariadas = document.getElementById("aulas-variadas-content");
    const btnAvancar = document.getElementById("selecao-avancar");
    const botoesRepeticao = document.getElementById("botoes-repeticao");
    
    // Popular matéria padrão
    const selectMateriaPadrao = document.getElementById("select-materia-padrao");
    selectMateriaPadrao.innerHTML = '<option value="">Selecione a matéria que iremos estudar</option>';
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
      
      state.tipoAgendamento = 'padrao';
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
      
      state.tipoAgendamento = 'variadas';
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
    document.getElementById("btn-repetir-horario").addEventListener("click", () => mostrarModal('horario'));
    document.getElementById("btn-repetir-disciplinas").addEventListener("click", () => mostrarModal('disciplinas'));
    document.getElementById("btn-repetir-duracao").addEventListener("click", () => mostrarModal('duracao'));
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
        case 'horario': repetirHorario(); break;
        case 'disciplinas': repetirDisciplinas(); break;
        case 'duracao': repetirDuracao(); break;
      }
      modal.classList.add("hidden");
    };
  }

  // Fechar modal
  modalFechar.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  function verificarCamposPreenchidos() {
    const btnAvancar = document.getElementById("selecao-avancar");
    
    if (state.tipoAgendamento === 'padrao') {
      const materia = document.getElementById("select-materia-padrao").value;
      const horario = document.getElementById("input-horario-padrao").value;
      const duracao = document.getElementById("select-duracao-padrao").value;
      
      btnAvancar.disabled = !(materia && horario && duracao);
    } else if (state.tipoAgendamento === 'variadas') {
      const todosPreenchidos = Array.from(document.querySelectorAll('.select-materia, .input-horario, .select-duracao'))
        .every(campo => campo.value !== '');
      
      btnAvancar.disabled = !todosPreenchidos;
    } else {
      btnAvancar.disabled = true;
    }
  }

  function renderAulasVariadas() {
    const container = document.getElementById("aulas-variadas-container");
    container.innerHTML = "";

    state.selectedDays.sort((a, b) => a - b).forEach((day, index) => {
      const card = document.createElement("div");
      card.className = "bg-white rounded-lg shadow p-4";
      card.innerHTML = `
        <h4 class="font-semibold mb-2">${formatDate(day)}</h4>
        <select class="select-materia w-full rounded-lg border px-3 py-2 text-comfortaa mb-2" data-index="${index}">
          <option value="">Selecione a matéria</option>
        </select>
        <input type="time" class="input-horario w-full rounded-lg border px-3 py-2 text-comfortaa mb-2" data-index="${index}">
        <select class="select-duracao w-full rounded-lg border px-3 py-2 text-comfortaa" data-index="${index}">
          <option value="">Selecione a duração</option>
          <option value="1h">1h</option>
          <option value="1h30">1h30</option>
          <option value="2h">2h</option>
          <option value="2h30">2h30</option>
          <option value="3h">3h</option>
        </select>
      `;
      
      // Popular matérias
      const selectMateria = card.querySelector(".select-materia");
      state.materias.forEach(materia => {
        const option = document.createElement("option");
        option.value = materia;
        option.textContent = materia;
        selectMateria.appendChild(option);
      });

      // Adicionar eventos para verificar preenchimento
      selectMateria.addEventListener("change", verificarCamposPreenchidos);
      card.querySelector(".input-horario").addEventListener("change", verificarCamposPreenchidos);
      card.querySelector(".select-duracao").addEventListener("change", verificarCamposPreenchidos);

      container.appendChild(card);
    });
    
    verificarCamposPreenchidos();
    
    // Scroll automático para o último card no container das aulas variadas
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 300);
  }

  function repetirHorario() {
    const horarios = document.querySelectorAll(".input-horario");
    if (horarios.length > 0) {
      const primeiroHorario = horarios[0].value;
      horarios.forEach(input => input.value = primeiroHorario);
    }
    verificarCamposPreenchidos();
  }

  function repetirDisciplinas() {
    const materias = document.querySelectorAll(".select-materia");
    if (materias.length > 0) {
      const primeiraMateria = materias[0].value;
      materias.forEach(select => select.value = primeiraMateria);
    }
    verificarCamposPreenchidos();
  }

  function repetirDuracao() {
    const duracoes = document.querySelectorAll(".select-duracao");
    if (duracoes.length > 0) {
      const primeiraDuracao = duracoes[0].value;
      duracoes.forEach(select => select.value = primeiraDuracao);
    }
    verificarCamposPreenchidos();
  }

  // Processar dados das aulas
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
          // Encontrar professor correspondente à matéria
          const professor = state.manterProfessores ? 
            (state.professoresDB.find(p => p.materia === materia)?.nome || "A definir") : 
            "A definir";
            
          state.aulas.push({
            data: day,
            materia: materia,
            horario: horario,
            duracao: duracao,
            professor: professor
          });
        });
      }
    } else {
      // Aulas Variadas
      state.selectedDays.sort((a, b) => a - b).forEach((day, index) => {
        const materiaElement = document.querySelector(`.select-materia[data-index="${index}"]`);
        const horarioElement = document.querySelector(`.input-horario[data-index="${index}"]`);
        const duracaoElement = document.querySelector(`.select-duracao[data-index="${index}"]`);
        
        const materia = materiaElement ? materiaElement.value : '';
        const horario = horarioElement ? horarioElement.value : '';
        const duracao = duracaoElement ? duracaoElement.value : '';
        
        if (materia && horario && duracao) {
          // Encontrar professor correspondente à matéria
          const professor = state.manterProfessores ? 
            (state.professoresDB.find(p => p.materia === materia)?.nome || "A definir") : 
            "A definir";
          
          state.aulas.push({
            data: day,
            materia: materia,
            horario: horario,
            duracao: duracao,
            professor: professor
          });
        }
      });
    }
  }

  // Preencher tabela de confirmação
  function fillConfirmationTable() {
    const tbody = document.getElementById("tabela-corpo");
    tbody.innerHTML = '';

    state.aulas.forEach(aula => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || '--'}</td>
        <td class="p-2">${aula.duracao || '--'}</td>
        <td class="p-2">${aula.materia || '--'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Preencher tabela de confirmação de aulas com professores
  function fillAulasConfirmacaoTable() {
    const tbody = document.getElementById("tabela-corpo-aulas");
    tbody.innerHTML = '';

    state.aulas.forEach(aula => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2">${formatDate(aula.data)}</td>
        <td class="p-2">${aula.horario || '--'}</td>
        <td class="p-2">${aula.duracao || '--'}</td>
        <td class="p-2">${aula.materia || '--'}</td>
        <td class="p-2">${aula.professor || '--'}</td>
      `;
      tbody.appendChild(tr);
    });
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

  // Configurar professores
  async function setupProfessores() {
    const btnSemPref = document.getElementById("sem-preferencia");
    const btnManter = document.getElementById("manter-professores");
    const lista = document.getElementById("professores-lista");
    const info = document.getElementById("professores-info");
    const btnAvancar = document.getElementById("equipe-avancar");
    
    // Resetar estado
    btnSemPref.classList.remove("bg-orange-500", "text-white");
    btnManter.classList.remove("bg-orange-500", "text-white");
    lista.classList.remove("expanded");
    info.classList.remove("expanded");
    btnAvancar.disabled = true;
    state.manterProfessores = false;

    btnSemPref.addEventListener('click', () => {
      btnSemPref.classList.add('bg-orange-500', 'text-white');
      btnManter.classList.remove('bg-orange-500', 'text-white');
      lista.classList.remove("expanded");
      info.classList.remove("expanded");
      state.manterProfessores = false;
      btnAvancar.disabled = false;
      
      // Definir todos os professores como "A definir"
      state.aulas.forEach(aula => {
        aula.professor = "A definir";
      });
    });

    btnManter.addEventListener('click', async () => {
      btnManter.classList.add('bg-orange-500', 'text-white');
      btnSemPref.classList.remove('bg-orange-500', 'text-white');
      
      try {
        // Buscar aulas anteriores do cliente
        const querySnapshot = await db.collection("BancoDeAulas")
          .where("cpf", "==", state.cpf)
          .orderBy("timestamp", "desc")
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const ultimaContratacao = querySnapshot.docs[0].data();
          const professoresUnicos = {};
          
          // Extrair matérias e professores únicos
          ultimaContratacao.aulas.forEach(aula => {
            if (aula.materia && aula.professor && aula.professor !== "A definir") {
              professoresUnicos[aula.materia] = aula.professor;
            }
          });

          if (Object.keys(professoresUnicos).length > 0) {
            // Atualizar state.professoresDB com os professores encontrados
            state.professoresDB = Object.entries(professoresUnicos).map(([materia, nome]) => ({ materia, nome }));
            
            lista.classList.add("expanded");
            info.classList.add("expanded");
            state.manterProfessores = true;
            renderProfessores();
            
            // Atualizar aulas com os professores correspondentes
            state.aulas.forEach(aula => {
              if (professoresUnicos[aula.materia]) {
                aula.professor = professoresUnicos[aula.materia];
              } else {
                aula.professor = "A definir";
              }
            });
          } else {
            showProfessoresNaoEncontrados();
          }
        } else {
          showProfessoresNaoEncontrados();
        }
      } catch (error) {
        console.error("Erro ao buscar professores:", error);
        showProfessoresNaoEncontrados();
      }
      
      btnAvancar.disabled = false;
    });
  }

  // Função para mostrar mensagem quando professores não forem encontrados
  function showProfessoresNaoEncontrados() {
    const lista = document.getElementById("professores-lista");
    const info = document.getElementById("professores-info");
    
    lista.classList.remove("expanded");
    info.classList.remove("expanded");
    
    // Mostrar mensagem informativa
    alert("Ops! não encontramos os últimos professores do seu atendimento, mas não se preocupe, vamos contatar a central Master de aulas e em breve manteremos os professores do nosso último ciclo de aulas, por enquanto, vamos por como 'A definir'.");
    
    // Definir todos os professores como "A definir"
    state.aulas.forEach(aula => {
      aula.professor = "A definir";
    });
    state.manterProfessores = false;
  }

  function renderProfessores() {
    const container = document.getElementById("professores-columns");
    container.innerHTML = '';
    
    // Obter lista de matérias únicas selecionadas
    const materiasSelecionadas = [...new Set(state.aulas.map(aula => aula.materia))];
    
    // Filtrar professores apenas pelas matérias selecionadas
    const professoresFiltrados = state.professoresDB.filter(prof => 
      materiasSelecionadas.includes(prof.materia)
    );
    
    professoresFiltrados.forEach(prof => {
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center border-b border-gray-200 pb-1';
      div.innerHTML = `
        <span>${prof.materia} - ${prof.nome}</span>
        <button class="text-red-500 remover-professor">×</button>
      `;
      
      div.querySelector('.remover-professor').addEventListener('click', () => {
        div.remove();
        // Atualizar state.professoresDB removendo o professor
        state.professoresDB = state.professoresDB.filter(p => 
          !(p.materia === prof.materia && p.nome === prof.nome)
        );
      });
      
      container.appendChild(div);
    });
  }

  // Função para gerar código de contratação sequencial
  async function gerarCodigoContratacao() {
    try {
      // Buscar o último código usado
      const querySnapshot = await db.collection("BancoDeAulas")
        .orderBy("codigoContratacao", "desc")
        .limit(1)
        .get();

      let proximoCodigo = "AAA";
      
      if (!querySnapshot.empty) {
        const ultimoCodigo = querySnapshot.docs[0].data().codigoContratacao;
        proximoCodigo = gerarProximoCodigo(ultimoCodigo);
      }
      
      return proximoCodigo;
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      return "AAA";
    }
  }

  function gerarProximoCodigo(codigoAtual) {
    let chars = codigoAtual.split('');
    
    for (let i = chars.length - 1; i >= 0; i--) {
      if (chars[i] !== 'Z') {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        break;
      } else {
        chars[i] = 'A';
        if (i === 0) {
          chars.unshift('A');
        }
      }
    }
    
    return chars.join('');
  }

  // Configurar termos
  function setupTermos() {
    const termoUso = document.getElementById("termo-uso");
    const termoPriv = document.getElementById("termo-privacidade");
    const avancarBtn = document.getElementById("termos-avancar");

    function updateButtonState() {
      avancarBtn.disabled = !(termoUso.checked && termoPriv.checked);
    }

    termoUso.addEventListener('change', updateButtonState);
    termoPriv.addEventListener('change', updateButtonState);
  }

  // Event Listeners
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
    
    // Formatar CPF para exibição (opcional)
    if (value.length > 3 && value.length <= 6) {
      e.target.value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    } else if (value.length > 6 && value.length <= 9) {
      e.target.value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 9) {
      e.target.value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    }
    
    if (value.length === 11) {
      state.cpf = value;
      
      // Mostrar loading
      showLoading();
      
      // Verificar se CPF existe no banco
      try {
        console.log("🔍 Buscando CPF:", value);
        
        // OPÇÃO 1: Buscar por campo "cpf" (mais comum)
        const querySnapshot = await db.collection("cadastroClientes")
          .where("cpf", "==", value)
          .get();
        
        hideLoading();
        
        // Para OPÇÃO 1:
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const userData = doc.data();
          console.log("✅ Usuário encontrado:", userData);
          
          state.nomeCliente = userData.nome || userData.name || "Cliente";
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
        if (error.code === 'permission-denied') {
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
    showSection(sections.calendario);
    initCalendar(); // Re-renderizar calendário para limpar seleções
  });

  document.getElementById("selecao-avancar").addEventListener("click", () => {
    processarAulas();
    
    // Verificar se todas as aulas foram processadas corretamente
    if (state.aulas.length === state.selectedDays.length) {
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

  document.getElementById("equipe-avancar").addEventListener("click", () => {
    // Atualizar as aulas com os professores selecionados
    state.aulas.forEach(aula => {
      const professorSelecionado = state.professoresDB.find(p => p.materia === aula.materia);
      if (professorSelecionado) {
        aula.professor = professorSelecionado.nome;
      }
    });
    
    fillAulasConfirmacaoTable();
    showSection(sections.selecaoAulasConfirmacao);
  });

  document.getElementById("confirmacao-aulas-voltar").addEventListener("click", () => {
    showSection(sections.confirmacaoEquipe);
  });

  document.getElementById("confirmacao-aulas-avancar").addEventListener("click", async () => {
    // Gerar código de contratação
    state.codigoContratacao = await gerarCodigoContratacao();
    
    // Data atual formatada
    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;
    
    // Tipo de equipe selecionada
    const tipoEquipe = state.manterProfessores ? "Manter Equipe" : "Sem preferência de Equipe";
    
    // Log no console
    console.log("=== DADOS DA CONTRATAÇÃO ===");
    console.log("CPF Contratação:", state.cpf);
    console.log("Nome Contratante:", state.nomeCliente);
    console.log("Data contratação:", dataFormatada);
    console.log("Equipe:", tipoEquipe);
    console.log("Código da Contratação:", state.codigoContratacao);
    console.log("=== DETALHES DAS AULAS ===");
    state.aulas.forEach(aula => {
      console.log(`Data: ${formatDate(aula.data)}, Hora: ${aula.horario}, Duração: ${aula.duracao}, Matéria: ${aula.materia}, Professor: ${aula.professor}`);
    });
    
    showSection(sections.termos);
    setupTermos();
  });

  document.getElementById("termos-voltar").addEventListener("click", () => {
    showSection(sections.selecaoAulasConfirmacao);
  });

  document.getElementById("termos-avancar").addEventListener("click", async () => {
    try {
      // Data atual
      const dataAtual = new Date();
      const dataFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;
      
      // Tipo de equipe selecionada
      const tipoEquipe = state.manterProfessores ? "Manter Equipe" : "Sem preferência de Equipe";
      
      // Preparar dados para salvar
      const dadosContratacao = {
        cpf: state.cpf,
        nome: state.nomeCliente,
        dataContratacao: dataFormatada,
        equipe: tipoEquipe,
        codigoContratacao: state.codigoContratacao,
        aulas: state.aulas.map(aula => ({
          data: formatDate(aula.data),
          horario: aula.horario,
          duracao: aula.duracao,
          materia: aula.materia,
          professor: aula.professor
        })),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Salvar no Firebase
      await db.collection("BancoDeAulas").add(dadosContratacao);
      
      console.log("✅ Dados salvos com sucesso no Firebase!");
      
      showSection(sections.fim);
      
      // Redirecionar para WhatsApp após 4 segundos (COMENTADO POR ENQUANTO)
      /*
      setTimeout(() => {
        window.location.href = "https://wa.me/82988862575?text=Olá Masters! Acabei de realizar a contratação dos dias de aula!";
      }, 4000);
      */
      
    } catch (error) {
      console.error("❌ Erro ao salvar dados no Firebase:", error);
      alert("Erro ao salvar os dados. Por favor, tente novamente.");
    }
  });

  // Inicialização
  showSection(sections.apresentacao);
});