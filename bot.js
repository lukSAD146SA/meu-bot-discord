const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN = process.env.TOKEN;
const GUILD_ID  = "1508302017980924064";
const MAX_WARNS = 3;
const MUTE_MS   = 5 * 60 * 1000;
const warns     = {};

const CARGOS_ISENTOS = ["1509304131263926292", "1508405150572871720"];

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
  "idiota", "imbecil", "imbecis", "idiotas",
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
// BOT PRONTO
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
// MENSAGENS — automod + comandos de texto
// ============================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

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

  // Automod
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
    const imagem = interaction.options.getString("imagem"); // imagem manual (prioridade)

    // Se não tiver imagem manual, tenta pegar a thumbnail do YouTube automaticamente
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
});

client.login(TOKEN);
