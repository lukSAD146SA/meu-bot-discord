const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN              = process.env.TOKEN;
const GUILD_ID            = "1508302017980924064";
const MAX_WARNS           = 3;
const MUTE_MS             = 5 * 60 * 1000;
const CANAL_SUGESTOES_ID  = "<#1511518813701804062>";

const warns    = {};
const economia = {}; // { userId: { saldo, ultimoDiario, ultimoTrabalho } }

const CARGOS_ISENTOS = ["1509304131263926292", "1508405150572871720"];

// ============================================================
// CONFIG DA LOJA — edita aqui os itens disponíveis
// ============================================================
const LOJA = [
  {
    id: "vip",
    nome: "🌟 Cargo VIP",
    preco: 500,
    roleId: "<@&1521544208073228528>", // troca pelo ID do cargo que você criar
  },
  // Pode adicionar mais itens aqui, copiando o formato acima
];

// ============================================================
// FUNÇÕES AUXILIARES DE ECONOMIA
// ============================================================
function getPerfil(userId) {
  if (!economia[userId]) {
    economia[userId] = { saldo: 0, ultimoDiario: 0, ultimoTrabalho: 0 };
  }
  return economia[userId];
}

function formatarTempo(ms) {
  const horas   = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  return `${horas}h ${minutos}m`;
}

// ============================================================
// PALAVRÕES
// ============================================================
const PALAVROES = [
  "foda", "fodas", "fodasse", "fodase", "fudeu", "fudendo", "fudido",
  "foder", "fodam", "fodao", "fodão", "foda se", "foda-se",
  "vai se foder", "vai foder", "vai tomar no",
  "merda", "merd", "merdinha", "merdao", "merdão", "vai a merda",
  "puta", "puto", "putinha", "putão", "putaria", "putas",
  "fdp", "filhadaputa", "filhodaputa", "filha da puta", "filho da puta",
  "filha de puta", "filho de puta",
  "caralho", "carai", "crl", "caralhin", "caralhao", "caralhão",
  "porra", "porr", "porrinha", "porrada",
  "cu", "cú", "cuzao", "cuzão", "cuzinho", "cuzona", "no cu",
  "tomar no cu", "vtc", "vai tomar no cu",
  "buceta", "bct", "bucetinha", "bucetao", "bucetão", "busseta",
  "viado", "viad", "viadinho", "viadao", "viadão", "viadagem",
  "corno", "corna", "corninho", "cornao", "cornão",
  "arrombado", "arrombada", "arrombao", "arrombão", "arromba",
  "imbecil", "imbecis", "idiota", "idiotas",
  "otario", "otária", "otário", "otaria", "otarinho",
  "babaca", "babak", "babaquice", "babacas",
  "safado", "safada", "safadao", "safadão", "safadinha", "safadeza",
  "vagabundo", "vagabunda", "vagabundao", "vagabundão", "vagabundice",
  "bosta", "bost", "bostinha", "bostao", "bostão",
  "cagando", "cagar", "cagou", "cagao", "cagão", "caguei", "cagada",
  "piranha", "piranhas", "piranhao", "piranhão",
  "piroca", "pirok", "pirocao", "pirocão", "rola", "rolinha", "rolao", "rolão",
  "cacete", "cacet", "cacetinho", "cacetao", "cacetão",
  "punheta", "punhet", "punhetao", "punhetão", "punheteiro",
  "broxa", "broxou", "broxar", "broxada", "broxando",
  "desgraça", "desgraçado", "desgracado", "desgraçada", "desgracada",
  "escroto", "escrota", "escrotao", "escrotão",
  "retardado", "retardada", "retard", "retardadao", "retardadão",
  "cretino", "cretina", "cretinos", "cretinagem",
  "lixo humano", "seu lixo", "sua merda", "lixo",
  "pqp", "vsf", "tmnc", "tnc", "kct", "vtc", "vtmc", "fds", "qpd",
  "cnl", "pnt", "mlk do inferno",
  "sua mae", "sua mãe", "sua vó", "sua vo", "sua familia", "sua família",
  "seu pai",
  "macaco", "macaca", "macaquinho",
  "hitler", "nazista", "nazi", "nazismo",
  "racista", "racismo", "raciais",
  "fascista", "fascismo",
  "terrorista",
  "xota", "xoxota", "xotinha",
  "pinto", "pintinho", "pintao", "pintão",
  "lazarento", "lazaro",
  "maldito", "maldita",
  "sua prostituta", "prostituta",
  "vai se ferrar", "vai se danar",
  "inutil", "inútil",
  "burro", "burra", "burrão", "burrao",
  "anta", "antas",
  "lixo", "escoria", "escória",
  "nojento", "nojenta", "nojentos",
  "repugnante", "repugnantes",
  "sua puta", "seu viado", "seu arrombado",
  "vai tomar", "toma no",
];

function buildPattern(word) {
  return word.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "+").join("");
}

const PADROES = PALAVROES.map((p) => new RegExp(buildPattern(p), "gi"));

function contemPalavrão(texto) {
  return PADROES.some((regex) => { regex.lastIndex = 0; return regex.test(texto); });
}

// ============================================================
// BOT PRONTO — registro de comandos
// ============================================================
client.once("clientReady", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("say")
      .setDescription("Faz o bot enviar uma mensagem")
      .addStringOption((opt) =>
        opt.setName("mensagem").setDescription("O que o bot vai dizer").setRequired(true)
      )
      .addChannelOption((opt) =>
        opt.setName("canal").setDescription("Canal de destino (padrão: atual)").setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("avatar")
      .setDescription("Mostra a foto de perfil de alguém em tamanho grande")
      .addUserOption((opt) =>
        opt.setName("usuario").setDescription("De quem ver o avatar").setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("video")
      .setDescription("Anuncia um vídeo novo do YouTube")
      .addStringOption((opt) =>
        opt.setName("link").setDescription("Link do vídeo do YouTube").setRequired(true)
      )
      .addChannelOption((opt) =>
        opt.setName("canal").setDescription("Canal onde anunciar").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("titulo").setDescription("Título personalizado (opcional)").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("imagem").setDescription("Link direto de imagem personalizada (opcional)").setRequired(false)
      ),

    // ---- ECONOMIA ----
    new SlashCommandBuilder()
      .setName("diario")
      .setDescription("Resgata sua recompensa diária de ZéCoins"),

    new SlashCommandBuilder()
      .setName("trabalhar")
      .setDescription("Trabalhe para ganhar ZéCoins (a cada 1 hora)"),

    new SlashCommandBuilder()
      .setName("carteira")
      .setDescription("Veja seu saldo de ZéCoins")
      .addUserOption((opt) =>
        opt.setName("usuario").setDescription("Ver saldo de outra pessoa").setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("loja")
      .setDescription("Veja os itens disponíveis na loja"),

    new SlashCommandBuilder()
      .setName("comprar")
      .setDescription("Compra um item da loja")
      .addStringOption((opt) =>
        opt.setName("item").setDescription("ID do item (veja em /loja)").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("rank")
      .setDescription("Veja o ranking dos membros mais ricos"),

    new SlashCommandBuilder()
      .setName("dar-moedas")
      .setDescription("[ADMIN] Dá ZéCoins para alguém")
      .addUserOption((opt) =>
        opt.setName("usuario").setDescription("Quem vai receber").setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt.setName("quantidade").setDescription("Quantas moedas dar").setRequired(true)
      ),
  ].map((cmd) => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error("[ERRO COMANDOS]", err.message);
  }
});

// ============================================================
// MENSAGENS — automod + comandos de texto + auto-check sugestões
// ============================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // ---- AUTO-CHECK NO CANAL DE SUGESTÕES ----
  if (message.channel.id === CANAL_SUGESTOES_ID) {
    try {
      await message.react("✅");
      await message.reply("Certo, iremos ver se conseguimos o mais rápido possível!");
    } catch (err) {
      console.error("[ERRO AUTO-CHECK]", err.message);
    }
    return; // não passa pelo automod no canal de sugestões
  }

  // ---- COMANDOS DE TEXTO ----
  if (message.content.startsWith("!warns")) {
    if (!message.member.permissions.has("ManageMessages")) return;
    const member = message.mentions.members.first();
    if (!member) return message.reply("Menciona um usuário.");
    return message.reply(`⚠️ ${member} tem **${warns[member.id] || 0}/${MAX_WARNS}** warns.`);
  }

  if (message.content.startsWith("!clearwarns")) {
    if (!message.member.permissions.has("ManageGuild")) return;
    const member = message.mentions.members.first();
    if (!member) return message.reply("Menciona um usuário.");
    warns[member.id] = 0;
    return message.reply(`✅ Warns de ${member} zerados.`);
  }

  // ---- AUTOMOD ----
  if (!contemPalavrão(message.content)) return;

  const temCargoIsento = message.member.roles.cache.some((role) =>
    CARGOS_ISENTOS.includes(role.id)
  );
  if (temCargoIsento) return;

  const userId = message.author.id;
  try { await message.delete(); } catch {}

  warns[userId] = (warns[userId] || 0) + 1;
  const warnAtual = warns[userId];

  console.log(`[WARN] ${message.author.tag} → ${warnAtual}/${MAX_WARNS}`);

  try {
    await message.member.timeout(MUTE_MS, "Automod: linguagem inapropriada");
    console.log(`[MUTE] ${message.author.tag} mutado por 5 minutos.`);
  } catch (err) {
    console.error(`[ERRO MUTE] ${err.message}`);
  }

  await message.channel.send(
    `⚠️ ${message.author}, linguagem inapropriada! Você foi mutado por 5 minutos. \`[Warn ${warnAtual}/${MAX_WARNS}]\``
  );

  if (warnAtual >= MAX_WARNS) {
    try {
      await message.member.kick("Automod: limite de warns atingido");
      warns[userId] = 0;
      await message.channel.send(`🔨 ${message.author} foi kickado por atingir ${MAX_WARNS} warns.`);
      console.log(`[KICK] ${message.author.tag} kickado.`);
    } catch (err) {
      console.error(`[ERRO KICK] ${err.message}`);
    }
  }
});

// ============================================================
// SLASH COMMANDS
// ============================================================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ---- /say ----
  if (interaction.commandName === "say") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
    }
    const texto = interaction.options.getString("mensagem");
    const canal = interaction.options.getChannel("canal") || interaction.channel;
    await canal.send(texto);
    await interaction.reply({ content: "✅ Mensagem enviada!", ephemeral: true });
  }

  // ---- /avatar ----
  if (interaction.commandName === "avatar") {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 1024, extension: "png" });

    const embed = new EmbedBuilder()
      .setTitle(`Avatar de ${user.username}`)
      .setImage(avatarUrl)
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  }

  // ---- /video ----
  if (interaction.commandName === "video") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
    }

    const link   = interaction.options.getString("link");
    const canal  = interaction.options.getChannel("canal");
    const titulo = interaction.options.getString("titulo");
    const imagem = interaction.options.getString("imagem");

    const videoIdMatch = link.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
    const thumbnailUrl = imagem || (videoIdMatch
      ? `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`
      : null);

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${titulo || "VÍDEO NOVO"}`)
      .setDescription(`📌 **Assista agora:**\n[CLIQUE AQUI PARA VER O VÍDEO](${link})`)
      .setColor("Red")
      .setFooter({ text: `${interaction.guild.name} • Notificação Automática` })
      .setTimestamp();

    if (thumbnailUrl) embed.setImage(thumbnailUrl);

    await canal.send({ content: "🔔 **Fala galera, vídeo novo no canal!**", embeds: [embed] });
    await interaction.reply({ content: "✅ Anúncio enviado!", ephemeral: true });
  }

  // ---- /diario ----
  if (interaction.commandName === "diario") {
    const perfil = getPerfil(interaction.user.id);
    const agora  = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 horas

    if (agora - perfil.ultimoDiario < cooldown) {
      const restante = cooldown - (agora - perfil.ultimoDiario);
      return interaction.reply({
        content: `⏳ Você já resgatou hoje! Volte em **${formatarTempo(restante)}**.`,
        ephemeral: true,
      });
    }

    const recompensa = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // 50-100
    perfil.saldo += recompensa;
    perfil.ultimoDiario = agora;

    await interaction.reply(
      `💰 ${interaction.user} resgatou **${recompensa} ZéCoins**! Saldo atual: **${perfil.saldo} ZéCoins**`
    );
  }

  // ---- /trabalhar ----
  if (interaction.commandName === "trabalhar") {
    const perfil = getPerfil(interaction.user.id);
    const agora  = Date.now();
    const cooldown = 60 * 60 * 1000; // 1 hora

    if (agora - perfil.ultimoTrabalho < cooldown) {
      const restante = cooldown - (agora - perfil.ultimoTrabalho);
      return interaction.reply({
        content: `⏳ Você está cansado! Volte a trabalhar em **${formatarTempo(restante)}**.`,
        ephemeral: true,
      });
    }

    const trabalhos = [
      "entregou pizza e ganhou",
      "consertou um computador e faturou",
      "vendeu um script raro e lucrou",
      "ajudou um streamer e recebeu",
      "fez um frila de design e cobrou",
    ];
    const trabalhoEscolhido = trabalhos[Math.floor(Math.random() * trabalhos.length)];
    const ganho = Math.floor(Math.random() * (40 - 15 + 1)) + 15; // 15-40

    perfil.saldo += ganho;
    perfil.ultimoTrabalho = agora;

    await interaction.reply(
      `💼 ${interaction.user} ${trabalhoEscolhido} **${ganho} ZéCoins**! Saldo atual: **${perfil.saldo} ZéCoins**`
    );
  }

  // ---- /carteira ----
  if (interaction.commandName === "carteira") {
    const user   = interaction.options.getUser("usuario") || interaction.user;
    const perfil = getPerfil(user.id);

    const embed = new EmbedBuilder()
      .setTitle(`💰 Carteira de ${user.username}`)
      .setDescription(`Saldo: **${perfil.saldo} ZéCoins**`)
      .setColor("Gold")
      .setThumbnail(user.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  }

  // ---- /loja ----
  if (interaction.commandName === "loja") {
    const embed = new EmbedBuilder()
      .setTitle("🛒 Loja ZéCoins")
      .setColor("Purple")
      .setDescription(
        LOJA.map((item) => `**${item.nome}** — \`${item.preco} ZéCoins\`\nID: \`${item.id}\``).join("\n\n")
      )
      .setFooter({ text: "Use /comprar item:ID para comprar" });

    await interaction.reply({ embeds: [embed] });
  }

  // ---- /comprar ----
  if (interaction.commandName === "comprar") {
    const itemId = interaction.options.getString("item");
    const item   = LOJA.find((i) => i.id === itemId);

    if (!item) {
      return interaction.reply({ content: "❌ Item não encontrado. Use `/loja` pra ver os IDs.", ephemeral: true });
    }

    const perfil = getPerfil(interaction.user.id);

    if (perfil.saldo < item.preco) {
      return interaction.reply({
        content: `❌ Saldo insuficiente! Você tem **${perfil.saldo}** e precisa de **${item.preco} ZéCoins**.`,
        ephemeral: true,
      });
    }

    perfil.saldo -= item.preco;

    try {
      await interaction.member.roles.add(item.roleId);
      await interaction.reply(`✅ Você comprou **${item.nome}**! Cargo adicionado.`);
    } catch (err) {
      perfil.saldo += item.preco; // devolve o saldo se der erro
      console.error("[ERRO COMPRA]", err.message);
      await interaction.reply({ content: "❌ Erro ao adicionar o cargo. Avisa um admin!", ephemeral: true });
    }
  }

  // ---- /rank ----
  if (interaction.commandName === "rank") {
    const ranking = Object.entries(economia)
      .sort(([, a], [, b]) => b.saldo - a.saldo)
      .slice(0, 10);

    if (ranking.length === 0) {
      return interaction.reply("Ninguém tem ZéCoins ainda!");
    }

    const linhas = await Promise.all(
      ranking.map(async ([userId, dados], index) => {
        const user = await client.users.fetch(userId).catch(() => null);
        const nome = user ? user.username : "Desconhecido";
        const medalha = ["🥇", "🥈", "🥉"][index] || `${index + 1}º`;
        return `${medalha} **${nome}** — ${dados.saldo} ZéCoins`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle("🏆 Ranking ZéCoins")
      .setDescription(linhas.join("\n"))
      .setColor("Gold");

    await interaction.reply({ embeds: [embed] });
  }

  // ---- /dar-moedas (admin) ----
  if (interaction.commandName === "dar-moedas") {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
    }

    const user = interaction.options.getUser("usuario");
    const qtd  = interaction.options.getInteger("quantidade");

    const perfil = getPerfil(user.id);
    perfil.saldo += qtd;

    await interaction.reply(`✅ ${user} recebeu **${qtd} ZéCoins**! Saldo atual: **${perfil.saldo}**`);
  }
});

client.login(TOKEN);
